#!/bin/env node

import { createWriteStream, readFileSync } from "node:fs";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import {
	hopsToWeights,
	load,
	report,
	Styling,
	trimUniverse,
	weightedFrames,
} from "../lib/index.js";

/** @import { TimelineAncestryRenderer, TimelineReferenceRenderer, RenderMode } from "../lib/types.js" */

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

			const slot = parts.groups.name ?? parts.groups.value;
			const value =
				typeof parts.groups.value === "string" && parts.groups.value !== ""
					? parts.groups.value
					: true;
			args[slot] = Array.isArray(args[slot])
				? [...args[slot], value]
				: typeof args[slot] === "undefined"
					? value
					: [args[slot], value];

			return args;
		},
		/** @type {Record<string, boolean | string | Array<boolean | string>>} */ ({}),
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

const maxHops =
	typeof args["max-identity-distance"] === "string"
		? Number(args["max-identity-distance"])
		: Number.POSITIVE_INFINITY;
const minIdentityBorn =
	typeof args["min-identity-born"] === "string"
		? new Date(args["min-identity-born"]).valueOf()
		: undefined;
const probes =
	typeof args.probe === "string"
		? [new Date(args.probe).valueOf()]
		: Array.isArray(args.probe)
			? args.probe.map((_) =>
					typeof _ === "string" ? new Date(_).valueOf() : 0,
				)
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

process.stderr.write(`report: Reading universe...\n`);
/** @type {Map<string, TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const data = new Map(
	rawData.map((data) => {
		const timeline = parse(data);
		return [timeline.id, load(timeline, timeline.id)];
	}),
);
/** @type {Array<TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const timelines = [...data.entries().map(([_, timeline]) => timeline)];

process.stderr.write(`report: Performing trim...\n`);
const trim = trimUniverse(
	timelines,
	mustExist(timelines.find((_) => _.meta.id === originTimelineId)),
	maxHops,
	minIdentityBorn,
);

process.stderr.write(
	`report: Fast-forwarding universe with ${timelines.length} weights, and scanning for ${probes?.length ?? 0} probes...\n`,
);
const frameWeights = [];
let lastFrameWeights;
const needles = new Set(probes);
const generator = weightedFrames(
	timelines,
	hopsToWeights(timelines, trim.hops),
	mustExist(timelines.find((_) => _.meta.id === originTimelineId)),
);
for (const frame of generator) {
	if (0 < needles.size && needles.has(frame.timestamp)) {
		frameWeights.push([frame.timestamp, frame.weights]);
		needles.delete(frame.timestamp);
		process.stderr.write(
			`report: Successful probe for ${frame.timestamp}. ${needles.size} probes remaining.\n`,
		);
		if (needles.size === 0) {
			process.stderr.write(`report: Scanning for end...\n`);
		}
	}

	lastFrameWeights = frame.weights;
}

process.stderr.write(`report: Calculating baseline weights...\n`);
const baseline = hopsToWeights(trim.solidsRetained, trim.hops);

// Generate stylesheet.
/** @type {RenderMode} */
const theme = args.theme === "light" ? "light" : "dark";
const style = new Styling(trim.timelinesRetained, theme);
const styleSheet = style.styles(trim.graph, trim.hops, maxHops);

process.stderr.write(`report: Generating report...\n`);
const reportString = report(
	trim.solidsRetained,
	trim.nonSolidsRetained,
	trim.timelinesTrimmed,
	trim.hops,
	baseline,
	mustExist(lastFrameWeights),
	// @ts-expect-error YUNO tuple
	frameWeights,
	trim.graph,
	styleSheet,
	style.palette(),
);
const output = createWriteStream(targetPath);
output.write(`${reportString}\n`);
