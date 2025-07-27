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
	"\u2764\uFE0F\u200D\u{1F525}": {
		emoji: "❤️‍🔥",
		name: "heart on fire",
		src: "2764-FE0F-200D-1F525.svg",
	},
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
	"\u{1F3A4}": {
		emoji: "🎤",
		name: "microphone",
		src: "1F3A4.svg",
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
	"\u{1F3AE}": {
		emoji: "🎮",
		name: "video game",
		src: "1F3AE.svg",
	},
	"\u{1F3B4}": {
		emoji: "🎴",
		name: "flower playing cards",
		src: "1F3B4.svg",
	},
	"\u{1F3B6}": {
		emoji: "🎶",
		name: "musical notes",
		src: "1F3B6.svg",
	},
	"\u{1F3C5}": {
		emoji: "🏅",
		name: "sports medal",
		src: "1F3C5.svg",
	},
	"\u{1F3D7}": {
		emoji: "🏗",
		name: "building construction",
		src: "1F3D7.svg",
	},
	"\u{1F427}": {
		emoji: "🐧",
		name: "penguin",
		src: "1F427.svg",
	},
	"\u{1F48A}": {
		emoji: "💊",
		name: "pill",
		src: "1F48A.svg",
	},
	"\u{1F4FA}": {
		emoji: "📺",
		name: "television",
		src: "1F4FA.svg",
	},
	"\u{1F4FB}": {
		emoji: "📻",
		name: "radio",
		src: "1F4FB.svg",
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
	"\u270A": {
		emoji: "✊",
		name: "raised fist",
		src: "270A.svg",
	},
	"\u271D": {
		emoji: "✝",
		name: "latin cross",
		src: "271D.svg",
	},
	"\u274C": {
		emoji: "❌",
		name: "cross mark",
		src: "274C.svg",
	},
	"atom-bomb": {
		emoji: "",
		name: "atom bomb",
		src: "E2DA.svg",
	},
	ddr: {
		name: "ddr",
		src: "Flag_of_East_Germany.svg",
	},
	"german-reich": {
		name: "german reich",
		src: "Flag_of_Germany_(1867–1918).svg",
	},
	nazi: {
		name: "nazi germany",
		src: "Flag_of_Germany_(1935–1945).svg",
	},
	messe: {
		emoji: "",
		name: "collaboration",
		src: "E249.svg",
	},
	raf: {
		name: "rote armee fraktion",
		src: "RAF-Logo.svg",
	},
};

let svgPrefixes = content;
for (const [prefix, config] of Object.entries(PREFIXES)) {
	const cells = [
		`<TD FIXEDSIZE="TRUE" WIDTH="24" HEIGHT="24"><IMG SRC="${config.src}"/></TD>`,
		`<TD>\$1</TD>`,
	];
	const row = `<TR>${cells.join()}</TR>`;
	const table = `<TABLE BORDER="0" CELLBORDER="0" CELLPADDING="0" CELLSPACING="5">${row}</TABLE>`;
	svgPrefixes = svgPrefixes.replaceAll(
		new RegExp(`<${prefix}.*\u{00A0}(.+)>;`, "gu"),
		`<${table}>;`,
	);
	copyFileSync(join(assets, config.src), join(contentLocation, config.src));
}

writeFileSync(
	join(contentLocation, contentName.replace(/\.gv$/, ".img.gv")),
	svgPrefixes,
);

process.stderr.write(`Successfully emojified ${args.target}.\n`);
