#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

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

const graphPath = process.argv.slice(2).filter((_) => !_.startsWith("--"))[0];
if (!graphPath.endsWith(".gv")) {
	process.stderr.write(
		`Invalid source document. File name is expected to end in '.gv'.\nProvided: ${graphPath}\n`,
	);
	process.exit(1);
}

const VARIANTS = {
	// Intended for exploration.
	zen: { svgSource: ".default.svg", withJs: true, starfield: true },
	// Default. Retains text, has JS navigation.
	system: { svgSource: ".default.svg", withJs: true, starfield: false },
	// No JS at all. Intended as fallback in sharing scenarios.
	compat: { svgSource: ".default.min.svg", withJs: false, starfield: false },
	// Best-effort to produce something viewable.
	safe: { svgSource: ".cairo.min.svg", withJs: false, starfield: false },
};

const graphName = basename(graphPath).replace(/\.gv$/, "");

const variants = new Map();
for (const [variant, settings] of Object.entries(VARIANTS)) {
	variants.set(variant, {
		...settings,
		output: join(
			typeof args.output === "string" ? args.output : process.cwd(),
			`${graphName}.${variant}.html`,
		),
		info: readFileSync(graphPath.replace(/\.gv$/, ".info"), "utf-8"),
		svg: readFileSync(graphPath.replace(/\.gv$/, settings.svgSource), "utf-8"),
	});
}

const templatePath = join(import.meta.dirname, "index.template");
const templateCss = readFileSync(`${templatePath}.css`, "utf-8");
const templateHtml = readFileSync(`${templatePath}.html`, "utf-8");
const templateJs = readFileSync(`${templatePath}.js`, "utf-8");
const templateTxt = readFileSync(`${templatePath}.txt`, "utf-8");

for (const [variant, meta] of variants.entries()) {
	const js = templateJs.replace(
		"const FEATURE_FLAG_STARFIELD = undefined;",
		`const FEATURE_FLAG_STARFIELD = ${meta.starfield};`,
	);

	const svg = meta.svg
		// Remove header to allow embedding.
		.replace(/^<\?xml .+dtd['"]>/s, "")
		.replace(/^<\?xml .+?>/s, "")
		// Add tabindex="0" to all nodes, to allow them to receive focus.
		.replaceAll(/( class="node [^"]+">)/g, ' tabindex="0"\$1');

	const html = templateHtml
		.replace(
			"<!--GENERATOR-->",
			[
				"<!--",
				`Document generated with Open Time-Travel Engine on ${new Date().toISOString()}`,
				`Renderer provided following universe metadata block:`,
				"",
				meta.info.trim(),
				"-->",
			].join("\n"),
		)
		.replace("<!--GUIDANCE-->", ["<!--", templateTxt, "-->"].join("\n"))
		.replace("INITIAL_BODY_CLASS", meta.withJs ? "loading" : "")
		.replace("/*CSS*/", templateCss)
		.replace("/*JS*/", meta.withJs ? js : "")
		.replace("<!--SVG-->", svg);

	process.stderr.write(`${variant}: Writing '${meta.output}'...\n`);
	writeFileSync(meta.output, html);
}

process.stderr.write("Done\n");
