#!/bin/env node

import { createWriteStream, readFileSync } from "node:fs";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { calculateWeights, load, trimUniverse } from "../lib/index.js";

/** @import { TimelineAncestryRenderer, TimelineReferenceRenderer } from "../lib/types.js" */

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

const rawData = readFileSync(args.origin, "utf-8").split("\n---\n");
const originTimelineId = parse(rawData[0]).id;
if (typeof originTimelineId !== "string") {
	process.stdout.write(
		`Unable to parse id of origin document '${args.origin}'.\n`,
	);
	process.exit(1);
}

// Load timeline data.
/** @type {Map<string, TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const data = new Map(
	rawData.map((data) => {
		const timeline = parse(data);
		return [timeline.id, load(timeline, timeline.id)];
	}),
);

/** @type {Array<TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const finalTimelines = [...data.entries().map(([_, timeline]) => timeline)];

const maxHops =
	typeof args["max-identity-distance"] === "string"
		? Number(args["max-identity-distance"])
		: Number.POSITIVE_INFINITY;
const minIdentityBorn =
	typeof args["min-identity-born"] === "string"
		? new Date(args["min-identity-born"]).valueOf()
		: undefined;

const trim = trimUniverse(
	finalTimelines,
	mustExist(finalTimelines.find((_) => _.meta.id === originTimelineId)),
	maxHops,
	minIdentityBorn,
);
const weights = calculateWeights(
	trim.solids,
	mustExist(finalTimelines.find((_) => _.meta.id === originTimelineId)),
);
process.stderr.write(
	`weigh: Generated ${weights.length} weight frames for ${trim.solids.length} solids.\n`,
);
const output = createWriteStream(targetPath);
for (const frame of weights) {
	output.write(`${JSON.stringify(frame)}\n`);
}
process.stderr.write(
	`weigh: Written ${weights.length} weight frames to target.\n`,
);
