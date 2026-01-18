#!/usr/bin/env node

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
	FONT_NAME,
	FONT_SCALE,
	FONT_SIZE_1000MM_V07_BROWSE_PT,
	FONT_SIZE_1000MM_V07_READ_PT,
	FONT_SIZE_1000MM_V07_STUDY_MM,
	FONT_SIZE_1000MM_V07_STUDY_PT,
} from "../lib/constants.js";

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

if (typeof args.format !== "string") {
	process.stderr.write("Missing --format.\n");
	process.exit(1);
}
if (typeof args.target !== "string") {
	process.stderr.write("Missing --target.\n");
	process.exit(1);
}

/** @type {Record<string,{svgSource:string; withJs:boolean; starfield:boolean;}>} */
const VARIANTS = {
	// Intended for exploration.
	zen: {
		svgSource: ".svg",
		withJs: true,
		starfield: true,
	},
	// Retains text, has JS navigation.
	default: {
		svgSource: ".svg",
		withJs: true,
		starfield: false,
	},
	// Best-effort to produce something viewable.
	static: {
		svgSource: ".min.svg",
		withJs: false,
		starfield: false,
	},
};

const templatePath = join(import.meta.dirname, "index.template");
const templateCss = readFileSync(`${templatePath}.css`, "utf-8");
const templateHtml = readFileSync(`${templatePath}.html`, "utf-8");
const templateJs = readFileSync(`${templatePath}.js`, "utf-8");
const templateTxt = readFileSync(`${templatePath}.txt`, "utf-8");

const meta = VARIANTS[args.format];
if (meta === undefined) {
	process.stderr.write(`Invalid format '${args.format}'.\n`);
	process.exit(1);
}

const settings = {
	...meta,
	output: args.target,
	info: readFileSync(args.target.replace(/\.html$/, ".info"), "utf-8"),
	meta: readFileSync(args.target.replace(/\.html$/, ".meta"), "utf-8"),
	svg: readFileSync(args.target.replace(/\.html$/, meta.svgSource), "utf-8"),
};

const css = templateCss
	.replaceAll(
		"/* FONT_SIZE_ROOT */",
		`font-size: ${FONT_SIZE_1000MM_V07_STUDY_MM * FONT_SCALE}mm;`,
	)
	.replaceAll(
		"/* FONT_FAMILY_ROOT */",
		`font-family: ${FONT_NAME}, sans-serif;`,
	)
	.replaceAll(
		"/* FONT_SIZE_BROWSE */",
		`font-size: ${FONT_SIZE_1000MM_V07_BROWSE_PT * FONT_SCALE}pt;`,
	)
	.replaceAll(
		"/* FONT_SIZE_READ */",
		`font-size: ${FONT_SIZE_1000MM_V07_READ_PT * FONT_SCALE}pt;`,
	)
	.replaceAll(
		"/* FONT_SIZE_STUDY */",
		`font-size: ${FONT_SIZE_1000MM_V07_STUDY_PT * FONT_SCALE}pt;`,
	);

const js = templateJs.replace(
	'const DATA = [[], [], ["", "", ""]];',
	`const DATA = ${settings.meta};`,
);

if (js.length === templateJs.length) {
	process.stdout.write(`Failed to inject JS! Aborting.\n`);
	process.exit(1);
}

const svg = settings.svg
	// Remove header to allow embedding.
	.replace(/^<\?xml .+dtd['"]>/s, "")
	.replace(/^<\?xml .+?>/s, "")
	// Strip title nodes, as those are only event indices in our data.
	.replaceAll(/<title>[^<]*<\/title>/g, "")
	// Add tabindex="0" to all nodes, to allow them to receive focus.
	.replaceAll(/( class="node [^"]+">)/g, ' tabindex="0"$1');

const html = templateHtml
	.replace(
		"<!--GENERATOR-->",
		[
			"<!--",
			`Document generated with Open Time-Travel Engine on ${new Date().toISOString()}`,
			`Renderer provided following universe metadata block:`,
			"",
			settings.info.trim(),
			"-->",
		].join("\n"),
	)
	.replace("<!--GUIDANCE-->", ["<!--", templateTxt, "-->"].join("\n"))
	.replace("INITIAL_BODY_CLASS", settings.withJs ? "loading" : "")
	.replace("/*CSS*/", css)
	.replace("/*JS*/", settings.withJs ? js : "")
	.replace("<!--SVG-->", svg);

writeFileSync(settings.output, html);
copyFileSync(
	join(import.meta.dirname, "favicon.ico"),
	join(dirname(settings.output), "favicon.ico"),
);
