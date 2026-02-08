#!/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { hostname, userInfo } from "node:os";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import {
	analyze,
	load,
	render,
	renderDateDDMMYYYY_de_DE,
	Styling,
	trimUniverse,
	uncertainEventToDateDeterministic,
} from "../lib/index.js";

/** @import {RendererOptions} from "../lib/renderer.js" */
/** @import {UniverseResultMetadata, TimelineAncestryRenderer, TimelineReferenceRenderer, RenderMode } from "../lib/types.js" */

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

if (typeof args.origin !== "string") {
	process.stderr.write("Missing --origin.\n");
	process.exit(1);
}
const targetPath = typeof args.target === "string" ? args.target : undefined;
if (targetPath === undefined) {
	process.stdout.write("No --target filename provided.\n");
	process.exit(1);
}
if (args.segment === undefined && !targetPath.endsWith(".gv")) {
	process.stdout.write(
		`Invalid output document. File name is expected to end in '.gv'.\nProvided: ${targetPath}\n`,
	);
	process.exit(1);
}
if (args.segment === true && !targetPath.endsWith(".gvus")) {
	process.stdout.write(
		`Invalid output document. File name is expected to end in '.gvus'.\nProvided: ${targetPath}\n`,
	);
	process.exit(1);
}

const maxHops =
	typeof args["max-identity-distance"] === "string"
		? Number(args["max-identity-distance"])
		: Number.POSITIVE_INFINITY;
const minIdentityBorn =
	typeof args["min-identity-born"] === "string"
		? new Date(args["min-identity-born"]).valueOf()
		: undefined;
const skipBefore =
	typeof args["skip-before"] === "string"
		? new Date(args["skip-before"]).valueOf()
		: undefined;
const skipAfter =
	typeof args["skip-after"] === "string"
		? new Date(args["skip-after"]).valueOf()
		: undefined;
const segment =
	typeof args.segment === "string"
		? Number(args.segment) !== 0
			? Number(args.segment)
			: undefined
		: undefined;

// Load timeline data.
const rawData = readFileSync(args.origin, "utf-8").split("\n---\n");
const originTimelineId = parse(rawData[0]).id;
if (typeof originTimelineId !== "string") {
	process.stdout.write(
		`Unable to parse id of origin document '${args.origin}'.\n`,
	);
	process.exit(1);
}

/** @type {Map<string, TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const data = new Map(
	rawData.map((data) => {
		const timeline = parse(data);
		return [timeline.id, load(timeline, timeline.id)];
	}),
);

/** @type {Array<TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const timelines = [...data.entries().map(([_, timeline]) => timeline)];

const trim = trimUniverse(
	timelines,
	mustExist(timelines.find((_) => _.meta.id === originTimelineId)),
	maxHops,
	minIdentityBorn,
);

process.stdout.write(
	`Universe consists of ${timelines.length} timelines. The universe is trimmed to ${trim.timelines.length} total timelines. ${trim.personsRetainedCount} out of ${trim.personsCount} persons have been retained.\n`,
);

// Generate stylesheet.
/** @type {RenderMode} */
const theme = args.theme === "light" ? "light" : "dark";
const styleSheet = new Styling(trim.timelines, theme).styles(
	trim.graph,
	trim.hops,
	maxHops,
);

// Generate GraphViz graph.
/** @type {RendererOptions} */
const renderOptions = {
	debug: Boolean(args.debug),
	dateRenderer: renderDateDDMMYYYY_de_DE,
	now: NOW,
	origin: originTimelineId,
	rendererAnalytics: args.analytics === true ? "enabled" : "disabled",
	rendererAnonymization: args.anonymize === true ? "enabled" : "disabled",
	segment,
	skipBefore,
	skipAfter,
	styleSheet,
	theme,
};
const dotGraph = render(trim.timelines, renderOptions, trim.hops);

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
const finalEntryCount = trim.timelines.reduce(
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
		: dStart;
const dTo =
	renderOptions.skipAfter !== undefined
		? new Date(renderOptions.skipAfter).toUTCString()
		: dEnd;
const info = [
	`Universe was generated on a device indicating a local point in time of:`,
	`${dBuild} offset ${offset} minutes from UTC`,
	`${dIso} universal coordinated time (${NOW})`,
	`Device self-identified as "${hostname()}" being operated by "${userInfo().username}".`,
	`Universe has ${finalEntryCount} individual entries from ${data.size} timeline documents.`,
	`The document window contains entries from ${trim.timelines.length} timeline documents.`,
	`Universe Horizon`,
	`${dStart} - ${dEnd}`,
	`Exported Document Window`,
	`${dFrom} - ${dTo}`,
];
const infoDebug = ["intentionally left blank"];

const resolvedIdentitiy = trim.graph.resolveIdentity();
const originBirthDate =
	uncertainEventToDateDeterministic(
		resolvedIdentitiy?.born ?? resolvedIdentitiy?.established,
	) ?? new Date();
const metadata = /** @type {UniverseResultMetadata} */ ([
	[
		...dotGraph.events.entries().flatMap(([timestamp, eventTitles]) =>
			eventTitles.values().map(
				(_) =>
					/** @type {[Number, string,string,Array<string>]} */ ([
						timestamp,
						_[0],
						_[1],
						[
							...mustExist(dotGraph.contributors.get(_[1]))
								.values()
								.map(
									(timeline) => mustExist(dotGraph.timelines.get(timeline))[0],
								),
						],
					]),
			),
		),
	],
	[...dotGraph.timelines.entries().map(([_timeline, metadata]) => metadata)],
	[
		mustExist(trim.graph.resolveIdentity()).name ??
			mustExist(trim.graph.resolveIdentity()).id,
		`Z${originBirthDate.getFullYear().toFixed().padStart(4, "0")}-${(originBirthDate.getMonth() + 1).toFixed().padStart(2, "0")}-${originBirthDate.getDate().toFixed().padStart(2, "0")}-0`,
		dotGraph.origin[0],
	],
]);

process.stdout.write("Writing graph...");
if (dotGraph.graph.length === 1) {
	writeFileSync(targetPath, dotGraph.graph[0].graph);
} else {
	for (let graphIndex = 0; graphIndex < dotGraph.graph.length; ++graphIndex) {
		const segment = dotGraph.graph[graphIndex];
		const index = graphIndex
			.toFixed()
			.padStart(dotGraph.graph.length.toFixed().length, "0");
		const uniqueGraph = segment.graph.replace(
			/digraph timeline \{/,
			`digraph segment_${index} { id="segment_${index}";`,
		);
		const segmentFilename = targetPath.replace(/\.gvus$/, `${index}.gvus`);
		process.stdout.write(".");
		writeFileSync(segmentFilename, uniqueGraph);
	}
}
//process.stdout.write("\n");
//process.stdout.write(infoDebug.join("\n"));
process.stdout.write("\n");

writeFileSync(
	targetPath.replace(/\.gv(?:us)?$/, ".info"),
	`${info.join("\n")}\n`,
);
writeFileSync(
	targetPath.replace(/\.gv(?:us)?$/, ".debug"),
	`${infoDebug.join("\n")}\n`,
);
writeFileSync(
	targetPath.replace(/\.gv(?:us)?$/, ".meta"),
	`${JSON.stringify(metadata)}\n`,
);
