#!/bin/env node

import { createWriteStream, readFileSync } from "node:fs";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import {
	calculateWeights,
	hopsToWeights,
	load,
	report,
	trimUniverse,
} from "../lib/index.js";

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

const maxHops =
	typeof args["max-identity-distance"] === "string"
		? Number(args["max-identity-distance"])
		: Number.POSITIVE_INFINITY;
const minIdentityBorn =
	typeof args["min-identity-born"] === "string"
		? new Date(args["min-identity-born"]).valueOf()
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
const weights = calculateWeights(
	trim.solidsRetained,
	hopsToWeights(trim.solidsRetained, trim.hops),
	mustExist(timelines.find((_) => _.meta.id === originTimelineId)),
);
const reportString = report(
	trim.solidsRetained,
	trim.nonSolidsRetained,
	trim.timelinesTrimmed,
	trim.hops,
	hopsToWeights(trim.solidsRetained, trim.hops),
	weights,
	mustExist(timelines.find((_) => _.meta.id === originTimelineId)),
);
const output = createWriteStream(targetPath);
output.write(`${reportString}\n`);
