#!/usr/bin/env node

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

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

const assets = typeof args.assets === "string" ? args.assets : "output/images";

if (typeof args.target !== "string") {
	process.stderr.write("Missing --target.\n");
	process.exit(1);
}

const content = readFileSync(args.target, "utf8");
const contentLocation = dirname(args.target);
const contentName = basename(args.target);

const PREFIXES = {
	"\u{1F1E9}\u{1F1EA}": {
		emoji: "🇩🇪",
		name: "flag: germany",
		src: "1F1E9-1F1EA.svg",
	},
	"\u{1F1EB}\u{1F1F7}": {
		emoji: "🇫🇷",
		name: "flag: france",
		src: "1F1EB-1F1F7.svg",
	},
	"\u{1F1EC}\u{1F1E7}": {
		emoji: "🇬🇧",
		name: "flag: united kingdom",
		src: "1F1EC-1F1E7.svg",
	},
	"\u{1F1EE}\u{1F1F7}": {
		emoji: "🇮🇷",
		name: "flag: iran",
		src: "1F1EE-1F1F7.svg",
	},
	"\u{1F1F7}\u{1F1FA}": {
		emoji: "🇷🇺",
		name: "flag: russia",
		src: "1F1F7-1F1FA.svg",
	},
	"\u{1F1F8}\u{1F1E6}": {
		emoji: "🇸🇦",
		name: "flag: saudi arabia",
		src: "1F1F8-1F1E6.svg",
	},
	"\u{1F1FA}\u{1F1F8}": {
		emoji: "🇺🇸",
		name: "flag: united states",
		src: "1F1FA-1F1F8.svg",
	},
	"\u{1F30D}": {
		emoji: "🌍",
		name: "globe showing europe-africa",
		src: "1F30D.svg",
	},
	"\u{1F3AC}": {
		emoji: "🎬",
		name: "clapper board",
		src: "1F3AC.svg",
	},
	"\u{1F3AD}": {
		emoji: "🎭",
		name: "performing arts",
		src: "1F3AD.svg",
	},
	"\u{1F3C5}": {
		emoji: "🏅",
		name: "sports medal",
		src: "1F3C5.svg",
	},
	"\u{1F3F3}\u{FE0F}\u{200D}\u{1F7E5}": {
		emoji: "🏳️‍🟥",
		name: "red flag",
		src: "1F3F3-FE0F-200D-1F7E5.svg",
	},
	"\u{1F4FA}": {
		emoji: "📺",
		name: "television",
		src: "1F4FA.svg",
	},
	"\u{1F680}": {
		emoji: "🚀",
		name: "rocket",
		src: "1F680.svg",
	},
	"\u{1F6F8}": {
		emoji: "🛸",
		name: "flying saucer",
		src: "1F6F8.svg",
	},
	"\u{1F94A}": {
		emoji: "🥊",
		name: "boxing glove",
		src: "1F94A.svg",
	},
	"\u{1F9EC}": {
		emoji: "🧬",
		name: "dna",
		src: "1F9EC.svg",
	},
	"\u{1FA99}": {
		emoji: "🪙",
		name: "coin",
		src: "1FA99.svg",
	},
	"\u2622": {
		emoji: "☢",
		name: "radioactive",
		src: "2622.svg",
	},
	"\u26BD": {
		emoji: "⚽",
		name: "soccer ball",
		src: "26BD.svg",
	},
	"\u271D": {
		emoji: "✝",
		name: "latin cross",
		src: "271D.svg",
	},
};

let svgPrefixes = content;
for (const [prefix, config] of Object.entries(PREFIXES)) {
	svgPrefixes = svgPrefixes.replaceAll(
		new RegExp(`<${prefix}.*\u{00A0}(.+)>;`, "gu"),
		`<<TABLE BORDER="0" CELLBORDER="0"><TR><TD FIXEDSIZE="TRUE" WIDTH="30"><IMG SRC="${config.src}"/></TD><TD FIXEDSIZE="TRUE" WIDTH="10"></TD><TD>\$1</TD></TR></TABLE>>;`,
	);
	copyFileSync(join(assets, config.src), join(contentLocation, config.src));
}

writeFileSync(
	join(contentLocation, contentName.replace(/\.gv$/, ".img.gv")),
	svgPrefixes,
);

process.stderr.write(`Successfully emojified ${args.target}.\n`);
