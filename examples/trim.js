#!/bin/env node

import { createWriteStream, readFileSync } from "node:fs";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { load, trimUniverse } from "../lib/index.js";

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

// Load timeline data.
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

process.stderr.write(
	`trim: Universe consists of ${timelines.length} timelines. The universe is trimmed to ${trim.timelinesRetained.length} total timelines. ${trim.personsRetainedCount} out of ${trim.personsCount} persons have been retained.\n`,
);

let max = Number.NEGATIVE_INFINITY;
let maxRetained = Number.NEGATIVE_INFINITY;
const output = createWriteStream(targetPath);
for (const [id, hops] of [...trim.hops.entries()].sort(
	([, a], [, b]) => a - b,
)) {
	const retained = trim.timelinesRetained.find(
		(_) => /** @type {TimelineAncestryRenderer} */ (_).meta.identity?.id === id,
	);
	output.write(`${retained ? "" : "X"}${hops}\t${id}\n`);
	if (Number.isFinite(hops)) {
		max = Math.max(max, hops);
	}
	if (Number.isFinite(hops) && retained) {
		maxRetained = Math.max(maxRetained, hops);
	}
}

process.stderr.write(
	`trim: Deepest global branch is ${max} hops long. Deepest retainer at hop ${maxRetained}.\n`,
);
