#!/bin/env node

import { createWriteStream, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, stringify } from "yaml";

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

const allTimelineData = [];
let originTimelineData;
for (const timelinePath of timelinePaths) {
	let timelineData = readFileSync(timelinePath, "utf8");
	if (!timelineData.startsWith("---")) {
		process.stderr.write(
			`${timelinePath} is missing document separator! File is skipped.\n`,
		);
		continue;
	}

	// Register document ID and re-serialize it.
	const timeline = parse(timelineData);
	timeline.id = timelinePath;
	timelineData = stringify(timeline);

	if (timelinePath === originPath) {
		originTimelineData = timelineData;
		continue;
	}
	allTimelineData.push(timelineData);
}

if (originTimelineData === undefined) {
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
	`---\n${originTimelineData}\n---\n${allTimelineData.join("\n---\n")}`,
);

if (targetStream !== process.stdout) {
	targetStream.end();
}
