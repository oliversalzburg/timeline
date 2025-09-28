#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
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

for (const [variant, meta] of Object.entries(VARIANTS)) {
	if (variant !== args.format) {
		continue;
	}

	const settings = {
		...meta,
		output: args.target,
		info: readFileSync(args.target.replace(/\.html$/, ".info"), "utf-8"),
		meta: readFileSync(args.target.replace(/\.html$/, ".meta"), "utf-8"),
		svg: readFileSync(args.target.replace(/\.html$/, meta.svgSource), "utf-8"),
	};

	const js = templateJs.replace(
		'const DATA = [[], [], ["", "", ""]];',
		`const DATA = ${settings.meta};`,
	);

	if (js.length === templateJs.length) {
		process.stdout.write(`${variant}: Failed to inject JS! Aborting.\n`);
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
		.replace("/*CSS*/", templateCss)
		.replace("/*JS*/", settings.withJs ? js : "")
		.replace("<!--SVG-->", svg);

	writeFileSync(settings.output, html);
}
