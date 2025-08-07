#!/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parse } from "yaml";
import { load } from "../lib/loader.js";
import { anonymize, sort, uniquify } from "../lib/operator.js";
import { render } from "../lib/renderer-ancestry.js";

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

process.stdout.write(`Processing:\n${files.map((_) => `  ${_}\n`).join("")}`);

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

// Generate the "universe" graph.
process.stdout.write("Rendering ancestry chart...\n");
/** @type {Array<import("source/types.js").TimelineAncestryRenderer>} */
const finalTimelines = [
	...data
		.entries()
		.filter(
			([filename, timeline]) =>
				!basename(filename).startsWith("_") &&
				"identity" in timeline.meta &&
				"id" in timeline.meta.identity,
		)
		.map(([_, timeline]) =>
			uniquify(
				sort(
					timeline.meta.private && args.private !== true
						? anonymize(
								timeline,
								[...crypto.getRandomValues(new Uint32Array(10))]
									.map((_) => _.toString(16))
									.join(""),
							)
						: timeline,
				),
			),
		),
];
process.stdout.write(`Chart contains ${finalTimelines.length} identities.\n`);
// Write GraphViz graph to stdout.
process.stdout.write(`Generating GraphViz graph for ancestry chart...\n`);

const renderOptions = {
	debug: Boolean(args.debug),
	dateRenderer: (/** @type {number} */ date) => {
		const _ = new Date(date);
		return `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][_.getDay()]}, ${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
	},
	now: NOW,
	origin: typeof args.origin === "string" ? args.origin : undefined,
};
const dotGraph = render(finalTimelines, renderOptions);

process.stdout.write(`Writing graph...\n`);
writeFileSync(outputPath, dotGraph);

process.stdout.write(
	"GraphViz graph for ancestry chart written successfully.\n",
);
