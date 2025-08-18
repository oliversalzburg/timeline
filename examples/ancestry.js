#!/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";
import { identityGraph } from "../lib/genealogy.js";
import { load } from "../lib/loader.js";
import { anonymize, sort, uniquify } from "../lib/operator.js";
import { palette } from "../lib/palette.js";
import { rank } from "../lib/renderer.js";
import { render } from "../lib/renderer-ancestry.js";
import { styles } from "../lib/styles.js";

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

// Generate palette for universe.
/** @type {import("source/types.js").RenderMode} */
const theme = args.debug || args.theme === "light" ? "light" : "dark";
const p = palette(theme);
for (const timeline of data.values()) {
	p.add(timeline.meta.id, timeline.meta.color);
}
const paletteMeta = p.toPalette();

/** @type {Array<import("source/types.js").TimelineAncestryRenderer>} */
const finalTimelines = [
	...data
		.entries()
		.filter(
			([_filename, timeline]) =>
				timeline.meta.private &&
				"identity" in timeline.meta &&
				"id" in timeline.meta.identity &&
				"born" in timeline.meta.identity,
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
const ancestryGraph = identityGraph(finalTimelines);
if (typeof args.origin === "string") {
	ancestryGraph.distance(args.origin);
}

// Determine ranks of universe.
const ranks = new Map(
	data.values().map((_) => [_.meta.id, rank(_, ancestryGraph)]),
);
// Genreate stylesheet.
const rankValues = [...ranks.values()];
const styleSheet = styles(rankValues).toStyleSheet();
process.stdout.write(
	`Generated style sheet has ${styleSheet.size} entries for ${new Set(rankValues).size} unique ranks.\n`,
);

// Write GraphViz graph
process.stdout.write(`Generating GraphViz graph for ancestry chart...\n`);

const renderOptions = {
	debug: Boolean(args.debug),
	dateRenderer: (/** @type {number} */ date) => {
		const _ = new Date(date);
		return `${_.getDate().toFixed(0)}.${(_.getMonth() + 1).toFixed(0)}.${_.getFullYear()}`;
	},
	now: NOW,
	origin: typeof args.origin === "string" ? args.origin : undefined,
	palette: paletteMeta,
	ranks,
	styleSheet,
	theme,
};
const dotGraph = render(finalTimelines, renderOptions);

process.stdout.write(`Writing graph...\n`);
writeFileSync(outputPath, dotGraph);

process.stdout.write(
	"GraphViz graph for ancestry chart written successfully.\n",
);
