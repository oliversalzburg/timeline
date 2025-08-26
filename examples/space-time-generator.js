#!/bin/env node

import { createWriteStream, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { Graph } from "../lib/genealogy.js";
import { load } from "../lib/loader.js";
import { anonymize } from "../lib/operator.js";
import { serialize } from "../lib/serializer.js";

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

if (typeof args.root !== "string") {
	process.stderr.write("Missing --root.\n");
	process.exit(1);
}
if (typeof args.origin !== "string") {
	process.stderr.write("Missing --origin.\n");
	process.exit(1);
}

const seed = [...crypto.getRandomValues(new Uint32Array(10))]
	.map((_) => _.toString(16))
	.join("");

const targetPath = typeof args.target === "string" ? args.target : undefined;
const originPath = resolve(args.origin);
const timelinePaths = readdirSync(args.root, {
	recursive: true,
	withFileTypes: true,
})
	.filter(
		(_) =>
			_.isFile() && _.name.endsWith(".yml") && !_.name.endsWith(".auto.yml"),
	)
	.map((_) => `${_.parentPath}/${_.name}`)
	.sort();

const allTimelines = [];
let originTimeline;
for (const timelinePath of timelinePaths) {
	const timelineData = readFileSync(timelinePath, "utf8");
	if (!timelineData.startsWith("---")) {
		process.stderr.write(
			`${timelinePath} is missing document separator! File is skipped.\n`,
		);
		continue;
	}

	const timelineObject = parse(timelineData);
	const timeline = load(timelineObject, timelinePath);
	if (timelinePath === originPath) {
		originTimeline = timeline;
		continue;
	}
	allTimelines.push(timeline);
}

if (originTimeline === undefined) {
	process.stderr.write(`${originPath} was not ingested. Failed.\n`);
	process.exit(1);
}

if (args.anonymize) {
	const graph = new Graph(
		[originTimeline, ...allTimelines],
		"invalid",
	).anonymize(seed);

	allTimelines.length = 0;
	originTimeline = undefined;

	for (const timeline of graph.timelines) {
		if (timeline.meta.id === originPath) {
			originTimeline = anonymize(timeline, seed + timeline.meta.id);
			continue;
		}
		const anonymized = anonymize(timeline, seed + timeline.meta.id);
		allTimelines.push(anonymized);
	}
}

if (originTimeline === undefined) {
	process.stderr.write(`${originPath} was not ingested. Failed.\n`);
	process.exit(1);
}

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

targetStream.write(
	`---\n${serialize(originTimeline, originTimeline.meta, true)}\n---\n${allTimelines.map((_) => serialize(_, _.meta, true)).join("\n---\n")}`,
);

if (targetStream !== process.stdout) {
	targetStream.end();
}
