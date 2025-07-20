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

const graphPath = process.argv.slice(2).filter((_) => !_.startsWith("--"))[0];
if (!graphPath.endsWith(".gv")) {
	process.stderr.write(
		`Invalid source document. File name is expected to end in '.gv'.\nProvided: ${graphPath}\n`,
	);
	process.exit(1);
}

const VARIANTS = {
	system: { source: ".default.svg" },
	fallback: { source: ".cairo.min.svg" },
};
const variants = new Map();
for (const [variant, settings] of Object.entries(VARIANTS)) {
	variants.set(variant, {
		...settings,
		output: join(
			typeof args.output === "string" ? args.output : process.cwd(),
			`index.${variant}.html`,
		),
		svg: readFileSync(graphPath.replace(/\.gv$/, settings.source), "utf-8"),
	});
}

const templatePath = join(import.meta.dirname, "index.template");
const templateCss = readFileSync(`${templatePath}.css`, "utf-8");
const templateHtml = readFileSync(`${templatePath}.html`, "utf-8");
const templateJs = readFileSync(`${templatePath}.js`, "utf-8");

for (const [variant, meta] of variants.entries()) {
	const svg = meta.svg
		.replace(/^<\?xml .+dtd">/s, "")
		.replaceAll(/( class="[^"]+">)/g, ' tabindex="0"\$1');

	const html = templateHtml
		.replace("/*CSS*/", templateCss)
		.replace("/*JS*/", templateJs)
		.replace("<!--SVG-->", svg);

	process.stderr.write(`${variant}: Writing '${meta.output}'...\n`);
	writeFileSync(meta.output, html);
}

process.stderr.write("Done\n");
