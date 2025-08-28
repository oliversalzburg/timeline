#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";

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

if (typeof args.assets !== "string") {
	process.stderr.write("Missing --assets.\n");
	process.exit(1);
}
if (typeof args.target !== "string") {
	process.stderr.write("Missing --target.\n");
	process.exit(1);
}

const assets = args.assets;
const svgInput = readFileSync(args.target, "utf8");
const imageNodes = svgInput.matchAll(
	/^<image xlink:href="([^"]*)".* x="([^"]+)".* y="([^"]+)".*\/>/gm,
);
// { path: _[1], x: Number(_[2]), y: Number(_[3]) }
const usedImages = new Set(imageNodes.map((_) => _[1]));
const imageNodeReferences = svgInput.replaceAll(
	/^<image xlink:href="([^"]*)".* x="([^"]+)".* y="([^"]+)".*\/>/gm,
	(_image, filename, x, y) =>
		`<use xlink:href="#USE${filename.replace(/\.svg$/, "").replaceAll("-", "")}" style="opacity: 0.7;" transform="translate(${x - 10} ${y - 4}) scale(0.5)" />`,
);

const images = usedImages.values().reduce(
	(acc, filename) => {
		const path = join(assets, filename);
		const content = readFileSync(path, "utf8");
		const svg = mustExist(
			content.match(/<svg.*<\/svg>/s)?.[0],
			`failed to find <svg> node in '${path}'`,
		)
			.replace('xmlns="http://www.w3.org/2000/svg"', "")
			.replace('xmlns:svg="http://www.w3.org/2000/svg"', "")
			.replace(/ viewBox="[^"]*"/, "")
			.replaceAll(/<g id="[^"]*"/g, "<g")
			.replaceAll(/id="path\d+"/g, "");
		acc.push(svg);
		return acc;
	},
	/** @type {Array<string>} */ ([]),
);

const nestedContent = imageNodeReferences.replace(
	/<\/svg>/,
	`${images.join("\n")}\n</svg>`,
);

process.stdout.write(nestedContent);
