#!/usr/bin/env node

import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { dateToString } from "../lib/serializer.js";

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

if (typeof args.target !== "string") {
	process.stderr.write("Missing --target.\n");
	process.exit(1);
}

const inputFiles = process.argv
	.slice(2)
	.filter((_) => !_.startsWith("--"))
	.sort();

if (inputFiles.length !== 1) {
	process.stderr.write("Expected 1 unlabeled argument.\n");
	process.exit(1);
}

/**
 * @param {string} filename -
 */
function timestampFromFilename(filename) {
	const timestamp = filename.match(/\d{8}/) ?? [];
	if (timestamp.length === 0) {
		return null;
	}
	const year = timestamp[0]?.substring(0, 4);
	const month = timestamp[0]?.substring(4, 6);
	const day = timestamp[0]?.substring(6, 8);
	return `${year}:${month}:${day}`;
}

const suspects = [];
const inputFile = inputFiles[0];

const exifRaw = readFileSync(inputFile, "utf-8");
const exifArray = JSON.parse(exifRaw);
for (const entry of exifArray) {
	if (entry.FileName.endsWith(".tmp.json") || entry.FileName.endsWith(".xmp")) {
		continue;
	}
	if (entry.DateTimeOriginal === undefined) {
		const timestamp = timestampFromFilename(entry.FileName);
		entry.DateTimeOriginal = timestamp;
	}

	suspects.push(entry);
}

let successCount = 0;
const allEntries = new Set();
for (const entry of suspects) {
	const bufferEntry = [
		entry.FileName ? `FileName        : ${entry.FileName}` : null,
		entry.CreateDate ? `CreateDate      : ${entry.CreateDate}` : null,
		entry.DateTimeOriginal
			? `DateTimeOriginal: ${entry.DateTimeOriginal}`
			: null,
		entry.FileModifyDate ? `FileModifyDate  : ${entry.FileModifyDate}` : null,
		entry.MediaCreateDate ? `MediaCreateDate : ${entry.MediaCreateDate}` : null,
		entry.MediaModifyDate ? `MediaModifyDate : ${entry.MediaModifyDate}` : null,
		entry.ModifyDate ? `ModifyDate      : ${entry.ModifyDate}` : null,
		entry.TrackCreateDate ? `TrackCreateDate : ${entry.TrackCreateDate}` : null,
		entry.TrackModifyDate ? `TrackModifyDate : ${entry.TrackModifyDate}` : null,
	].filter((_) => typeof _ === "string");
	const candidates = [
		entry.CreateDate,
		entry.DateTimeOriginal,
		entry.FileModifyDate,
		entry.MediaCreateDate,
		entry.MediaModifyDate,
		entry.ModifyDate,
		entry.TrackCreateDate,
		entry.TrackModifyDate,
	]
		.filter(
			(_) =>
				typeof _ === "string" &&
				// Fields with all 0 timestamps
				!_.startsWith("0000") &&
				// Android EXIF bug (https://issuetracker.google.com/issues/36967504)
				_ !== "2002:12:08 12:00:00",
		)
		.sort();
	let best = candidates[0];
	if (
		1 < candidates.length &&
		best.length < candidates[1].length &&
		candidates[1].startsWith(best)
	) {
		best = candidates[1];
	}
	if (best === candidates[0] && best === entry.FileModifyDate) {
		process.stderr.write(
			`\n - resolved to modified date: '${entry.FileName}'\n`,
		);
		process.stderr.write(`   ${entry.SourceFile}\n`);
		process.stderr.write(`${bufferEntry.map((_) => `   ${_}`).join("\n")}\n`);
		continue;
	}
	const bestString = best.substring(0, 10).replaceAll(":", "");
	if (!entry.FileName.includes(bestString)) {
		process.stderr.write(
			`\n - file name does not include best date match: '${bestString}' -> '${entry.FileName}'\n`,
		);
		process.stderr.write(`   ${entry.SourceFile}\n`);
		process.stderr.write(`${bufferEntry.map((_) => `   ${_}`).join("\n")}\n`);
		if (entry.FileName.endsWith(".mp4")) {
			process.stderr.write(
				`   Assuming best date match as valid for video file.\n`,
			);
		}
	}

	const bestYear = best.substring(0, 4);
	const bestMonth = best.substring(5, 7);
	const bestDay = best.substring(8, 10);

	const date = new Date(`${bestYear}-${bestMonth}-${bestDay}`);

	const documentPath = join(
		args.target,
		relative(dirname(inputFile), entry.SourceFile).replace(/\.[^.]+$/, ".yml"),
	);
	const documentDirectory = dirname(documentPath);
	mkdirSync(documentDirectory, { recursive: true });
	const output = createWriteStream(documentPath, "utf8");

	const mediaIndex = entry.SourceFile.indexOf("/media/");
	if (mediaIndex < 0) {
		throw new Error(`couldn't find /media/ in path`);
	}
	const timelineEntry = `  ${dateToString(date)}: 📱`;
	const yamlDocument = [
		"---",
		"prefix: 📸",
		"identity:",
		`  id: ${entry.SourceFile.substring(mediaIndex + 1)}`,
		`  name: WhatsApp Bild ${entry.FileName}`,
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
