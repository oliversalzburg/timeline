#!/bin/env node

import { createWriteStream, readFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { load, mergeIntoDuringPeriod, serialize } from "../lib/index.js";

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

const targetPath = typeof args.target === "string" ? args.target : undefined;
if (targetPath === undefined) {
	process.stdout.write("No --target filename provided.\n");
	process.exit(1);
}

const inputFiles = process.argv.slice(2).filter((_) => !_.startsWith("--"));

// Load timeline data.
const data = [];
for (const file of inputFiles) {
	const raw = readFileSync(file, "utf-8");
	const plain = parse(raw);
	const timeline = load(plain, file);
	data.push(timeline);
}

mergeIntoDuringPeriod(
	Number.NEGATIVE_INFINITY,
	Number.POSITIVE_INFINITY,
	data[data.length - 1],
	data.slice(0, -1),
);
const plain = serialize(data[data.length - 1], data[data.length - 1].meta);
const raw = stringify(plain);

const output =
	targetPath === "-" ? process.stdout : createWriteStream(targetPath);
output.write(`---\n${raw}\n`);
