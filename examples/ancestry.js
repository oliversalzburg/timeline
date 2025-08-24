#!/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";
import { Graph } from "../lib/genealogy.js";
import { load } from "../lib/loader.js";
import { anonymize, sort, uniquify } from "../lib/operator.js";
import { render, renderMarkdown } from "../lib/renderer-ancestry.js";
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
/** @type {Map<string,import("source/types.js").TimelineAncestryRenderer>} */
const data = new Map(
	plainData
		.entries()
		.map(([filename, data]) => [filename, load(data, filename)]),
);

const seed = [...crypto.getRandomValues(new Uint32Array(10))]
	.map((_) => _.toString(16))
	.join("");

/** @type {Array<import("source/types.js").TimelineAncestryRenderer>} */
const finalTimelines = [
	...data
		.entries()
		.filter(
			([, timeline]) =>
				timeline.meta.private &&
				"identity" in timeline.meta &&
				"id" in timeline.meta.identity &&
				"born" in timeline.meta.identity,
		)
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

if (!finalTimelines.some((_) => _.meta.identity.id === origin)) {
	process.stdout.write(
		"The provided --origin identity doesn't match any of the provided timelines.\n",
	);
	process.exit(1);
}

const graph = new Graph(finalTimelines, origin);
const _hops = graph.calculateHopsFrom(origin, {
	allowChildHop: true,
	allowMarriageHop: false,
	allowParentHop: true,
});

process.stdout.write(`Chart contains ${finalTimelines.length} identities.\n`);

// Generate stylesheet for entire universe.
/** @type {import("source/types.js").RenderMode} */
const theme = args.theme === "light" ? "light" : "dark";
const ss = new Styling(finalTimelines, theme).styles(graph);

// Write GraphViz graph.
process.stdout.write(`Generating GraphViz graph for ancestry chart...\n`);

const renderOptions = {
	debug: Boolean(args.debug),
	dateRenderer: (/** @type {number} */ date) => {
		const _ = new Date(date);
		return `${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
	},
	now: NOW,
	origin,
	styleSheet: ss,
	theme,
};
const dotGraph = render(finalTimelines, renderOptions);
const markdown = renderMarkdown(finalTimelines, renderOptions);

process.stdout.write(`Writing graph...\n`);
writeFileSync(outputPath, dotGraph);
writeFileSync(`${outputPath}.md`, markdown[0].content);

process.stdout.write(
	"GraphViz graph for ancestry chart written successfully.\n",
);
