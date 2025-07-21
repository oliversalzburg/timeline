#!/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, userInfo } from "node:os";
import { basename } from "node:path";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { analyze } from "../lib/analyzer.js";
import { load } from "../lib/loader.js";
import { map, sort, uniquify } from "../lib/operator.js";
import { render } from "../lib/renderer.js";

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
	process.stderr.write("No files provided.\n");
	process.exit(1);
}

const outputPath = typeof args.output === "string" ? args.output : undefined;
if (outputPath === undefined) {
	process.stderr.write("No --output filename provided.\n");
	process.exit(1);
}
if (!outputPath.endsWith(".gv")) {
	process.stderr.write(
		`Invalid output document. File name is expected to end in '.gv'.\nProvided: ${outputPath}\n`,
	);
	process.exit(1);
}

process.stderr.write(`Processing:\n${files.map((_) => `  ${_}\n`).join("")}`);

const rawData = new Map(files.map((_) => [_, readFileSync(_, "utf-8")]));

// Parse raw data with appropriate parser.
const plainData = new Map(
	rawData.entries().map(([filename, data]) => [filename, parse(data)]),
);

// Load raw data to normalized model.
const data = new Map(
	plainData
		.entries()
		.map(([filename, data]) => [filename, load(data, filename)]),
);

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

// Generate New Year's Eve events.
/*
const yearEarliest = new Date(globalEarliest).getFullYear();
data.set("timelines/.decoration.nye", {
	meta: {
		color: TRANSPARENT,
		id: "nye",
		prefix: "🎆",
	},
	records: [
		...recurringYearly(
			new Date(yearEarliest, 0, 1, 0, 0, 0, 0),
			index => `New Year ${yearEarliest + index}`,
			Math.floor((globalLatest - globalEarliest) / MILLISECONDS.ONE_YEAR),
		),
	],
});
*/

// Adjust the titles in the data set.
data.set(
	"timelines/mediacontrol-top1-singles.yml",
	map(
		mustExist(data.get("timelines/mediacontrol-top1-singles.yml")),
		(/** @type {[number, { title: string; }]} */ record) => [
			record[0],
			{ title: record[1].title.split(" - ").reverse().join("\n") },
		],
	),
);

// Inject the "universe" graph.
process.stderr.write("Rendering universe...\n");
const finalTimelines = [
	...data
		.entries()
		.filter(([filename]) => !basename(filename).startsWith("_"))
		.map(([_, timeline]) => uniquify(sort(timeline))),
];
const finalEntryCount = finalTimelines.reduce(
	(previous, timeline) => previous + timeline.records.length,
	0,
);

// Write GraphViz graph to stdout.
process.stderr.write(`Generating GraphViz graph for universe...\n`);

const renderOptions = {
	dateRenderer: (/** @type {number} */ date) => {
		const _ = new Date(date);
		return `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][_.getDay()]}, ${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
	},
	now: NOW,
	origin:
		typeof args.origin === "number" || typeof args.origin === "string"
			? new Date(args.origin).valueOf()
			: undefined,
	condensed: true,
	skipBefore:
		typeof args["skip-before"] === "string"
			? new Date(args["skip-before"]).valueOf()
			: undefined,
	skipAfter:
		typeof args["skip-after"] === "string"
			? new Date(args["skip-after"]).valueOf()
			: undefined,
};
const dotGraph = render(finalTimelines, renderOptions);

const buildDate = new Date(NOW);
const offset = buildDate.getTimezoneOffset();
const dBuild = buildDate.toUTCString();
const dIso = buildDate.toISOString();
const dStart = new Date(globalEarliest).toUTCString();
const dEnd = new Date(globalLatest).toUTCString();
const dFrom = renderOptions.skipBefore
	? new Date(renderOptions.skipBefore).toUTCString()
	: "infinity";
const dTo = renderOptions.skipAfter
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

// Dump palette for debugging purposes.
process.stderr.write("Generated palette for universe:\n");
const paletteMeta = dotGraph.palette;
const colors = paletteMeta.lookup;
const ranks = new Map(
	[...dotGraph.ranks.entries()].map(([timeline, rank]) => [
		timeline.meta.id,
		rank,
	]),
);
const styles = dotGraph.styles;
const describeStyle = (
	/** @type {import("../lib/styles.js").Style | undefined} */ style,
) => {
	if (style === undefined) {
		return "";
	}

	const dashedOrSolid = style.style?.filter((_) =>
		["dashed", "solid"].includes(_),
	) ?? ["solid"];
	const parts = [
		style.fill ? "filled" : "translucent",
		style.link ? "linked" : "unlinked",
		style.outline ? `${style.penwidth}pt ${dashedOrSolid[0]} outline` : "flat",
	];
	return parts.join(", ");
};
for (const [color, timelines] of [...paletteMeta.assignments.entries()].sort(
	([a], [b]) => a.localeCompare(b),
)) {
	const timelinePalette = mustExist(colors.get(timelines[0]));
	process.stderr.write(
		`- ${color} -> Pen: ${timelinePalette.pen} Fill: ${timelinePalette.fill} Font: ${timelinePalette.font}\n`,
	);
	for (const id of timelines.sort(
		(/** @type {string} */ a, /** @type {string} */ b) => a.localeCompare(b),
	)) {
		process.stderr.write(
			`  ${id} (ranked ${ranks.get(id)}: ${describeStyle(styles.get(mustExist(ranks.get(id))))})\n`,
		);
	}
	process.stderr.write("\n");
}

const rankCount = new Set(ranks.values()).size;
process.stderr.write(`Style sheet generated for ${rankCount} ranks.\n`);
process.stderr.write(`Writing graph...\n`);
writeFileSync(outputPath, dotGraph.graph);
process.stderr.write(`Writing graph info...\n`);
writeFileSync(outputPath.replace(/\.gv$/, ".info"), `${info.join("\n")}\n`);
process.stderr.write("GraphViz graph for universe written successfully.\n");
