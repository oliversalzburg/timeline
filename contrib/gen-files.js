#!/usr/bin/env node

import { createWriteStream, mkdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

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

if (typeof args.target !== "string") {
	process.stderr.write("Missing --target.\n");
	process.exit(1);
}

const inputFiles = process.argv
	.slice(2)
	.filter((_) => !_.startsWith("--"))
	.sort();

if (inputFiles.length < 1) {
	process.stderr.write("Expected 1 unlabeled argument.\n");
	process.exit(1);
}

/**
 * @param {string} filename -
 */
function timestampFromFilename(filename) {
	const timestamp = filename.match(/\d{4}-\d{2}-\d{2}/) ?? [];
	if (timestamp.length === 0) {
		return null;
	}
	const year = timestamp[0]?.substring(0, 4);
	const month = timestamp[0]?.substring(5, 7);
	const day = timestamp[0]?.substring(8, 10);
	return `${year}-${month}-${day}`;
}

let successCount = 0;
const allEntries = new Set();
for (const file of inputFiles) {
	const entryDate = timestampFromFilename(file);
	const filePath = relative(dirname(file), file);
	const documentPath = join(filePath.replace(/\.[^.]+$/, ".yml"));
	const documentPathAbsolute = join(args.target, documentPath);
	const documentDirectory = dirname(documentPathAbsolute);
	mkdirSync(documentDirectory, { recursive: true });
	const output = createWriteStream(documentPathAbsolute, "utf8");

	const mediaIndex = file.indexOf("/media/");
	if (mediaIndex < 0) {
		throw new Error(`couldn't find /media/ in path`);
	}
	const timelineEntry = `  ${entryDate}: 📍`;
	const yamlDocument = [
		"---",
		"prefix: 📄",
		"identity:",
		`  id: ${file.substring(mediaIndex + 1)}`,
		`  name: Datei ${basename(file)}`,
		"timeline:",
		timelineEntry,
	];
	allEntries.add(timelineEntry);
	output.write(`${yamlDocument.join("\n")}\n`);
	++successCount;
}

process.stdout.write(`${[...allEntries.values()].sort().join("\n")}\n`);

process.stderr.write(`${successCount} documents generated successfully.\n`);
process.stderr.write("Done.\n");
