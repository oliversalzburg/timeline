#!/bin/env node

import { createWriteStream, readFileSync } from "node:fs";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { Graph } from "../lib/genealogy.js";
import { load } from "../lib/loader.js";
import { anonymize, sort, uniquify } from "../lib/operator.js";
import { renderReport, renderSimple } from "../lib/renderer-identity.js";
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

if (typeof args.origin !== "string") {
	process.stderr.write("Missing --origin.\n");
	process.exit(1);
}

const targetPath = typeof args.target === "string" ? args.target : undefined;

const rawData = readFileSync(args.origin, "utf-8").split("\n---\n");
const originId = parse(rawData[0]).id;
const format =
	args.format === "simple"
		? "simple"
		: args.format === "report"
			? "report"
			: undefined;

if (format === undefined) {
	process.stderr.write("Expected --format=report or --format=simple.\n");
	process.exit(1);
}

// Parse raw data with appropriate parser.
/** @type {Map<string,import("source/types.js").TimelineDocument>} */
const plainData = new Map(
	rawData.map((data) => {
		const timeline = parse(data);
		return [timeline.id, timeline];
	}),
);

// Load raw data to normalized model.
/** @type {Map<string,import("source/types.js").TimelineAncestryRenderer>} */
const data = new Map(
	plainData.entries().map(([id, data]) => [id, load(data, id)]),
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

const originIdentityId = mustExist(
	data.get(originId)?.meta.identity?.id,
	`Empty or invalid identity for origin ID '${originId}'`,
);
const graph = new Graph(finalTimelines, originIdentityId);

// Generate stylesheet for entire universe.
/** @type {import("source/types.js").RenderMode} */
const theme = args.theme === "light" ? "light" : "dark";
const styleSheet = new Styling(finalTimelines, theme).styles(graph);

// Write GraphViz graph.
/** @type {RendererOptions} */
const renderOptions = {
	debug: Boolean(args.debug),
	dateRenderer: (/** @type {number} */ date) => {
		const _ = new Date(date);
		return `${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
	},
	now: NOW,
	origin: originIdentityId,
	rendererAnalytics: args.analytics === true ? "enabled" : "disabled",
	rendererAnonymization: args.anonymize === true ? "enabled" : "disabled",
	styleSheet,
	theme,
};

const targetStream =
	targetPath !== undefined
		? createWriteStream(targetPath, { encoding: "utf8" })
		: process.stdout;

targetStream.on("error", () => {
	process.stderr.write(
		`Output stream error. Maybe not fully consumed. Exiting with failure.\n`,
	);
	process.exitCode = 1;
});

if (format === "simple") {
	const dotGraph = renderSimple(finalTimelines, renderOptions);
	targetStream.write(dotGraph);
}

if (format === "report") {
	const markdown = renderReport(finalTimelines, {
		...renderOptions,
		pedigreeChartPath: originId.replace(
			/\.yml$/,
			`${args.anonymize === true ? "-demo" : ""}-pedigree-light.svg`,
		),
	});
	targetStream.write(markdown[0].content);
}
