#!/bin/env node

import { constants, copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import { load } from "../lib/index.js";

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

const root = typeof args.root === "string" ? args.root : undefined;
if (root === undefined) {
	process.stdout.write("No --root provided.\n");
	process.exit(1);
}
const universe = typeof args.universe === "string" ? args.universe : undefined;
if (universe === undefined) {
	process.stdout.write("No --universe provided.\n");
	process.exit(1);
}
const target = typeof args.target === "string" ? args.target : undefined;
if (target === undefined) {
	process.stdout.write("No --target provided.\n");
	process.exit(1);
}

// Load timeline data.
const rawData = readFileSync(universe, "utf-8").split("\n---\n");
const originTimelineId = parse(rawData[0]).id;
if (typeof originTimelineId !== "string") {
	process.stdout.write(
		`Unable to parse id of origin document '${args.origin}'.\n`,
	);
	process.exit(1);
}

let mediaItemCount = 0;
let failed = false;
for (const data of rawData) {
	const timelineData = parse(data);
	const timeline = load(timelineData, timelineData.id);
	if (
		"identity" in timeline.meta &&
		timeline.meta.identity !== undefined &&
		timeline.meta.identity !== null &&
		typeof timeline.meta.identity === "object" &&
		"id" in timeline.meta.identity &&
		typeof timeline.meta.identity.id === "string"
	) {
		const id = timeline.meta.identity.id;
		const fileParts = id.split(".");
		const fileExtension = fileParts[fileParts.length - 1];
		if (!id.includes(".") || (id.includes(".") && 4 < fileExtension.length)) {
			//process.stderr.write(`X ${timeline.meta.identity.id}\n`);
			continue;
		}

		if (fileExtension.toLowerCase() !== fileExtension) {
			process.stderr.write(
				`invalid file extension (${fileExtension}) on ID in '${timelineData.id}' (from '${id}')!\n`,
			);
			process.exit(1);
		}

		const isMediaItem =
			id.startsWith("media/") &&
			(id.startsWith("media/sfx") ||
				fileExtension === "jpg" ||
				fileExtension === "jpeg" ||
				fileExtension === "mp3" ||
				fileExtension === "mp4" ||
				fileExtension === "png");
		if (!isMediaItem) {
			continue;
		}
		++mediaItemCount;
		const pathSource = join(root, timeline.meta.identity.id);
		const pathTarget = join(target, timeline.meta.identity.id);
		mkdirSync(dirname(pathTarget), { recursive: true });
		try {
			copyFileSync(pathSource, pathTarget, constants.COPYFILE_FICLONE);
			if (fileExtension === "jpeg") {
				process.stderr.write(`Consider renaming ${pathSource} to '.jpg'!\n`);
			}
		} catch (fault) {
			if (
				fault !== undefined &&
				fault !== null &&
				typeof fault === "object" &&
				"code" in fault &&
				fault.code === "ENOENT"
			) {
				process.stderr.write(
					`Source file '${pathSource}' not found! Referenced in '${timelineData.id}'.\n`,
				);
				failed = true;
			}
		}
	}
}
if (failed) {
	process.stderr.write(
		`Failed. Copied ${mediaItemCount} items, but encountered errors during processing. Check log.\n`,
	);
	process.exit(1);
}
process.stderr.write(`Done. Copied ${mediaItemCount} items.\n`);
