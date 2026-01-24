#!/usr/bin/env node

import { createWriteStream, readFileSync } from "node:fs";
import { join } from "node:path";

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

if (typeof args.build !== "string") {
	process.stderr.write("Missing --build.\n");
	process.exit(1);
}
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

const metaRaw = readFileSync(join(args.build, "universe.meta"), "utf-8");
/** @type {import("../lib/types.js").RenderResultMetadata} */
const meta = JSON.parse(metaRaw);
const timelineMeta = new Map(meta[1].map((_) => [_[0], _]));

const svgInput = readFileSync(inputFiles[0], "utf8");
process.stdout.write("gradientify: Locating gradients...");
const gradientSearch = /^<linearGradient .+>/gm;
let gradientNode = gradientSearch.exec(svgInput);
/** @type {Array<string>} */
const gradients = [];
while (gradientNode !== null) {
	gradients.push(gradientNode[0]);
	process.stdout.write(".");
	gradientNode = gradientSearch.exec(svgInput);
}
process.stdout.write("\n");

process.stdout.write("gradientify: Locating usages...");
const usageSearch = /^<path fill="url\(#Z.+\/>/gm;
let usageNode = usageSearch.exec(svgInput);
/** @type {Array<string>} */
const usages = [];
while (usageNode !== null) {
	usages.push(usageNode[0]);
	process.stdout.write(".");
	usageNode = usageSearch.exec(svgInput);
}
process.stdout.write("\n");

process.stdout.write("gradientify: Locating classes...");
/** @type {Map<string, Array<string>>} */
const targets = new Map();
for (const gradient of gradients) {
	const id = gradient.match(/id="([^_]+)_l_\d+"/)?.[1];
	if (typeof id !== "string") {
		throw new Error(`can't match ID in '${gradient}'`);
	}

	const containerRegex = new RegExp(`<g id="${id}" .+>`);
	const container = svgInput.match(containerRegex)?.[0];
	if (typeof container !== "string") {
		throw new Error(`can't find container for '${id}'`);
	}
	process.stdout.write(".");

	const classSearch = /t[a-f0-9]{16}/g;
	let contributorClass = classSearch.exec(container);
	if (contributorClass === null) {
		throw new Error(`found no classes on '${container}'`);
	}
	const colors = [];
	while (contributorClass !== null) {
		const meta = timelineMeta.get(contributorClass[0]);
		if (meta === undefined) {
			throw new Error(`unable to find metadata for '${contributorClass[0]}'`);
		}
		if (meta[1] !== "#00000000") {
			colors.push(meta[1]);
		}
		contributorClass = classSearch.exec(container);
	}
	targets.set(id, colors);
}
process.stdout.write("\n");

process.stdout.write("gradientify: Rebuilding...");
let svgOutput = svgInput;
for (const [id, colors] of targets.entries()) {
	const gradientRegex = new RegExp(
		`<linearGradient id="${id}.+</linearGradient>`,
		"gs",
	);
	svgOutput = svgOutput.replace(gradientRegex, (substring) =>
		substring.replace(
			/<stop.+?<\/linearGradient>/s,
			colors
				.map(
					(_, index) =>
						`<stop offset="${index / (colors.length - 1)}" style="stop-color:${_};stop-opacity:1.;"/>`,
				)
				.join("\n"),
		),
	);
	process.stdout.write(".");
}
process.stdout.write("\n");

const output = createWriteStream(args.target, "utf8");
output.write(`${svgOutput}\n`);
