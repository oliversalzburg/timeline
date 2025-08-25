#!/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, userInfo } from "node:os";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { analyze } from "../lib/analyzer.js";
import { Graph } from "../lib/genealogy.js";
import { load } from "../lib/loader.js";
import { anonymize, sort, uniquify } from "../lib/operator.js";
import { render } from "../lib/renderer.js";
import { Styling } from "../lib/style.js";

/** @import {RendererOptions} from "../lib/renderer.js" */

const NOW = Date.now();

// Parse command line arguments.
const args = process.argv
	.slice(2)
	.filter((_) => _.startsWith("--"))
	.reduce(
		(args, _) => {
			const argument = _.substring(2);
			const parts = argument.match(/^(?<name>[^=]+)=?(?<value>.*)$/);
			if (parts === null || parts.groups === undefined) {
				return args;
			}

			args[parts.groups.name ?? parts.groups.value] =
				typeof parts.groups.value === "string" && parts.groups.value !== ""
					? parts.groups.value
					: true;

			return args;
		},
		/** @type {Record<string, boolean | string>} */ ({}),
	);

// Read raw data from input files.
const files =
	2 < process.argv.length
		? process.argv.slice(2).filter((_) => !_.startsWith("--"))
		: readdirSync("timelines/")
				.filter((_) => _.endsWith(".yml"))
				.map((_) => `timelines/${_}`);

if (files.length === 0) {
	process.stdout.write("No files provided.\n");
	process.exit(1);
}

const outputPath = typeof args.output === "string" ? args.output : undefined;
if (outputPath === undefined) {
	process.stdout.write("No --output filename provided.\n");
	process.exit(1);
}
if (!outputPath.endsWith(".gv")) {
	process.stdout.write(
		`Invalid output document. File name is expected to end in '.gv'.\nProvided: ${outputPath}\n`,
	);
	process.exit(1);
}

const origin = typeof args.origin === "string" ? args.origin : undefined;
if (origin === undefined) {
	process.stdout.write("No --origin provided.\n");
	process.exit(1);
}

const rawData = new Map(files.map((_) => [_, readFileSync(_, "utf-8")]));

// Parse raw data with appropriate parser.
const plainData = new Map(
	rawData.entries().map(([filename, data]) => [filename, parse(data)]),
);

// Load raw data to normalized model.
const data = new Map(
	/** @type {Array<[string, import("../source/types.js").TimelineReferenceRenderer | import("../source/types.js").TimelineAncestryRenderer]>} */ ([
		...plainData
			.entries()
			.map(([filename, data]) => [filename, load(data, filename)]),
	]),
);

// Calculate universe metrics.
const metrics = new Map(
	data
		.entries()
		.map(([filename, timeline]) => [filename, analyze(timeline.records)]),
);
const globalEarliest = metrics
	.values()
	.reduce(
		(previous, current) =>
			current.timeEarliest < previous ? current.timeEarliest : previous,
		Number.POSITIVE_INFINITY,
	);
const globalLatest = metrics
	.values()
	.reduce(
		(previous, current) =>
			previous < current.timeLatest ? current.timeLatest : previous,
		0,
	);

const seed = [...crypto.getRandomValues(new Uint32Array(10))]
	.map((_) => _.toString(16))
	.join("");

/** @type {Array<import("source/types.js").TimelineReferenceRenderer | import("source/types.js").TimelineAncestryRenderer>} */
const finalTimelines = [
	...data
		.entries()
		.map(([_, timeline]) =>
			uniquify(
				sort(
					timeline.meta.private && args.private !== true
						? anonymize(timeline, seed)
						: timeline,
				),
			),
		),
];

if (
	!finalTimelines.some(
		(_) => "identity" in _.meta && _.meta.identity.id === origin,
	)
) {
	process.stdout.write(
		"The provided --origin identity doesn't match any of the provided timelines.\n",
	);
	process.exit(1);
}

const identityTimelines =
	/** @type {Array<import("../source/types.js").TimelineAncestryRenderer>} */ (
		finalTimelines.filter((timeline) => "identity" in timeline.meta)
	);
const graph = new Graph(identityTimelines, origin);
const hops = graph.calculateHopsFrom(origin, {
	allowChildHop: true,
	allowMarriageHop: false,
	allowParentHop: true,
});
const trimmedTimelines = finalTimelines.filter(
	(_) =>
		!identityTimelines.includes(
			/** @type {import("../source/types.js").TimelineAncestryRenderer} */ (_),
		) ||
		mustExist(
			hops.get(
				/** @type {import("../source/types.js").TimelineAncestryRenderer} */ (_)
					.meta.identity.id,
			),
		) < 4,
);

process.stdout.write(
	`Universe contains ${identityTimelines.length} identities, trimmed to ${trimmedTimelines.length} timelines.\n`,
);

// Generate stylesheet for entire universe.
/** @type {import("source/types.js").RenderMode} */
const theme = args.theme === "light" ? "light" : "dark";
const ss = new Styling(finalTimelines, theme).styles(graph);

// Write GraphViz graph.
process.stdout.write("Rendering universe...\n");

/** @type {RendererOptions} */
const renderOptions = {
	debug: Boolean(args.debug),
	dateRenderer: (/** @type {number} */ date) => {
		const _ = new Date(date);
		return `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][_.getDay()]}, ${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
	},
	now: NOW,
	origin,
	renderAnonymization: "enabled",
	segment: typeof args.segment === "string" ? Number(args.segment) : undefined,
	skipBefore:
		typeof args["skip-before"] === "string"
			? new Date(args["skip-before"]).valueOf()
			: undefined,
	skipAfter:
		typeof args["skip-after"] === "string"
			? new Date(args["skip-after"]).valueOf()
			: undefined,
	styleSheet: ss,
	theme,
};
const dotGraph = render(trimmedTimelines, renderOptions, graph, hops);

const finalEntryCount = trimmedTimelines.reduce(
	(previous, timeline) => previous + timeline.records.length,
	0,
);
const buildDate = new Date(NOW);
const offset = buildDate.getTimezoneOffset();
const dBuild = buildDate.toUTCString();
const dIso = buildDate.toISOString();
const dStart = new Date(globalEarliest).toUTCString();
const dEnd = new Date(globalLatest).toUTCString();
const dFrom =
	renderOptions.skipBefore !== undefined
		? new Date(renderOptions.skipBefore).toUTCString()
		: "infinity";
const dTo =
	renderOptions.skipAfter !== undefined
		? new Date(renderOptions.skipAfter).toUTCString()
		: "infinity";
const info = [
	`Universe was generated on a device indicating a local point in time of:`,
	`${dBuild} offset ${offset} minutes from UTC`,
	`${dIso} universal coordinated time (${NOW})`,
	`Device self-identified as "${hostname()}" being operated by "${userInfo().username}".`,
	`Universe has ${finalEntryCount} individual entries from ${data.size} timeline documents.`,
	`Universe Horizon`,
	`${dStart} - ${dEnd}`,
	`Exported Document Window`,
	`${dFrom} - ${dTo}`,
];

process.stdout.write(`Writing graph...\n`);
if (dotGraph.graph.length === 1) {
	writeFileSync(outputPath, dotGraph.graph[0]);
} else {
	for (let graphIndex = 0; graphIndex < dotGraph.graph.length; ++graphIndex) {
		const graph = dotGraph.graph[graphIndex];
		const index = graphIndex
			.toFixed()
			.padStart(dotGraph.graph.length.toFixed().length, "0");
		const uniqueGraph = graph.replace(
			/digraph timeline \{/,
			`digraph segment_${index} { id="segment_${index}";`,
		);
		const segmentFilename = outputPath.replace(/\.gv$/, `-segment${index}.gv`);
		process.stdout.write(`  - Written segment ${segmentFilename}.\n`);
		writeFileSync(segmentFilename, uniqueGraph);
	}
}

writeFileSync(outputPath.replace(/\.gv$/, ".info"), `${info.join("\n")}\n`);
process.stdout.write("GraphViz graph for universe written successfully.\n");
