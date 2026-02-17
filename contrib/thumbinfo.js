#!/bin/env node

import { createWriteStream, readFileSync } from "node:fs";

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

if (typeof args.exif !== "string") {
	process.stderr.write("Missing --exif.\n");
	process.exit(1);
}
if (typeof args.meta !== "string") {
	process.stderr.write("Missing --meta.\n");
	process.exit(1);
}
if (typeof args.target !== "string") {
	process.stderr.write("Missing --target.\n");
	process.exit(1);
}

const exifDataRaw = readFileSync(args.exif, "utf-8");
/**
 * @type {Array<{
 * 	SourceFile: string,
 * 	FileSize: string,
 * 	FileType: string,
 * 	MIMEType: string,
 * 	PageCount?: number,
 * 	ImageWidth?: number,
 * 	ImageHeight?: number,
 * 	Duration?: string,
 * }>}
 */
const exifData = JSON.parse(exifDataRaw);
const exifLookup = new Map(exifData.map((_) => [_.SourceFile, _]));

const metaRaw = readFileSync(args.meta, "utf-8");
/** @type {import("source/types.js").RenderResultMetadata} */
const meta = JSON.parse(metaRaw);

let failed = false;
for (const timelineMeta of meta[1]) {
	const id = timelineMeta[4];
	if (!id.startsWith("media/")) {
		continue;
	}

	const exif = exifLookup.get(id);
	if (exif === undefined) {
		process.stderr.write(`failed to lookup exif for '${id}'!\n`);
		failed = true;
		continue;
	}
	if (exif.MIMEType === "image/jpeg" || exif.MIMEType === "image/png") {
		if (exif.ImageWidth === undefined || exif.ImageHeight === undefined) {
			process.stderr.write(`invalid exif for '${id}'!\n`);
			failed = true;
			continue;
		}
		timelineMeta[6] = [exif.ImageWidth, exif.ImageHeight, 0];
	}
}

if (failed) {
	process.stderr.write(`Failed. Check log.\n`);
	process.exit(1);
}
const output = createWriteStream(args.target);
output.write(`${JSON.stringify(meta)}\n`);
process.stderr.write(`Done.\n`);
