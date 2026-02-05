#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
	FONT_SIZE_700MM_V07_STUDY_PT,
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

if (typeof args.target !== "string") {
	process.stderr.write("Missing --target.\n");
	process.exit(1);
}

if (
	!args.target.endsWith(".dot") &&
	!args.target.endsWith(".dotus") &&
	!args.target.endsWith(".gv") &&
	!args.target.endsWith(".gvus")
) {
	process.stdout.write(
		`Invalid target document. File name is expected to end in '.dot', '.dotus', '.gv', '.gvus'.\nProvided: ${args.target}\n`,
	);
	process.exit(1);
}

const content = readFileSync(args.target, "utf8");
const contentLocation = dirname(args.target);
const contentName = basename(args.target);

export const PREFIXES = {
	"\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}": {
		emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
		name: "flag: england",
		src: "1F3F4-E0067-E0062-E0065-E006E-E0067-E007F.svg",
	},
	"\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}": {
		emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
		name: "flag: scotland",
		src: "1F3F4-E0067-E0062-E0065-E006E-E0067-E007F.svg",
	},
	"\u2764\uFE0F\u200D\u{1F525}": {
		emoji: "❤️‍🔥",
		name: "heart on fire",
		src: "2764-FE0F-200D-1F525.svg",
	},
	"\u{1F469}\u200D\u{1F52C}": {
		emoji: "👩‍🔬",
		name: "woman scientist",
		src: "1F469-200D-1F52C.svg",
	},
	"\u{1F1E6}\u{1F1F7}": {
		emoji: "🇦🇷",
		name: "flag: argentina",
		src: "1F1E6-1F1F7.svg",
	},
	"\u{1F1E6}\u{1F1F9}": {
		emoji: "🇦🇹",
		name: "flag: austria",
		src: "1F1E6-1F1F9.svg",
	},
	"\u{1F1E6}\u{1F1FA}": {
		emoji: "🇦🇺",
		name: "flag: australia",
		src: "1F1E6-1F1FA.svg",
	},
	"\u{1F1E6}\u{1F1FF}": {
		emoji: "🇦🇿",
		name: "flag: azerbaijan",
		src: "1F1E6-1F1FF.svg",
	},
	"\u{1F1E7}\u{1F1EA}": {
		emoji: "🇧🇪",
		name: "flag: belgium",
		src: "1F1E7-1F1EA.svg",
	},
	"\u{1F1E7}\u{1F1F7}": {
		emoji: "🇧🇷",
		name: "flag: brazil",
		src: "1F1E7-1F1F7.svg",
	},
	"\u{1F1E8}\u{1F1E6}": {
		emoji: "🇨🇦",
		name: "flag: canada",
		src: "1F1E8-1F1E6.svg",
	},
	"\u{1F1E8}\u{1F1ED}": {
		emoji: "🇨🇭",
		name: "flag: switzerland",
		src: "1F1E8-1F1ED.svg",
	},
	"\u{1F1E8}\u{1F1F3}": {
		emoji: "🇨🇳",
		name: "flag: china",
		src: "1F1E8-1F1F3.svg",
	},
	"\u{1F1E9}\u{1F1EA}": {
		emoji: "🇩🇪",
		name: "flag: germany",
		src: "1F1E9-1F1EA.svg",
	},
	"\u{1F1E9}\u{1F1F0}": {
		emoji: "🇩🇰",
		name: "flag: denmark",
		src: "1F1E9-1F1F0.svg",
	},
	"\u{1F1EA}\u{1F1F8}": {
		emoji: "🇪🇸",
		name: "flag: spain",
		src: "1F1EA-1F1F8.svg",
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
	"\u{1F1EC}\u{1F1F7}": {
		emoji: "🇬🇷",
		name: "flag: greece",
		src: "1F1EC-1F1F7.svg",
	},
	"\u{1F1ED}\u{1F1FA}": {
		emoji: "🇭🇺",
		name: "flag: hungary",
		src: "1F1ED-1F1FA.svg",
	},
	"\u{1F1EE}\u{1F1F7}": {
		emoji: "🇮🇷",
		name: "flag: iran",
		src: "1F1EE-1F1F7.svg",
	},
	"\u{1F1EE}\u{1F1F9}": {
		emoji: "🇮🇹",
		name: "flag: italy",
		src: "1F1EE-1F1F9.svg",
	},
	"\u{1F1EF}\u{1F1F5}": {
		emoji: "🇯🇵",
		name: "flag: japan",
		src: "1F1EF-1F1F5.svg",
	},
	"\u{1F1F0}\u{1F1F7}": {
		emoji: "🇰🇷",
		name: "flag: south korea",
		src: "1F1F0-1F1F7.svg",
	},
	"\u{1F1F2}\u{1F1FD}": {
		emoji: "🇲🇽",
		name: "flag: mexico",
		src: "1F1F2-1F1FD.svg",
	},
	"\u{1F1F3}\u{1F1F1}": {
		emoji: "🇳🇱",
		name: "flag: netherlands",
		src: "1F1F3-1F1F1.svg",
	},
	"\u{1F1F3}\u{1F1F4}": {
		emoji: "🇳🇴",
		name: "flag: norway",
		src: "1F1F3-1F1F4.svg",
	},
	"\u{1F1F5}\u{1F1F1}": {
		emoji: "🇵🇱",
		name: "flag: poland",
		src: "1F1F5-1F1F1.svg",
	},
	"\u{1F1F5}\u{1F1F9}": {
		emoji: "🇵🇹",
		name: "flag: portugal",
		src: "1F1F5-1F1F9.svg",
	},
	"\u{1F1F6}\u{1F1E6}": {
		emoji: "🇶🇦",
		name: "flag: qatar",
		src: "1F1F6-1F1E6.svg",
	},
	"\u{1F1F7}\u{1F1F4}": {
		emoji: "🇷🇴",
		name: "flag: romania",
		src: "1F1F7-1F1F4.svg",
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
	"\u{1F1F8}\u{1F1EA}": {
		emoji: "🇸🇪",
		name: "flag: sweden",
		src: "1F1F8-1F1EA.svg",
	},
	"\u{1F1FA}\u{1F1E6}": {
		emoji: "🇺🇦",
		name: "flag: ukraine",
		src: "1F1FA-1F1E6.svg",
	},
	"\u{1F1FA}\u{1F1F8}": {
		emoji: "🇺🇸",
		name: "flag: united states",
		src: "1F1FA-1F1F8.svg",
	},
	"\u{1F1FF}\u{1F1E6}": {
		emoji: "🇿🇦",
		name: "flag: south africa",
		src: "1F1FF-1F1E6.svg",
	},
	"\u{1F30B}": {
		emoji: "🌋",
		name: "volcano",
		src: "1F30B.svg",
	},
	"\u{1F30D}": {
		emoji: "🌍",
		name: "globe showing europe-africa",
		src: "1F30D.svg",
	},
	"\u{1F396}": {
		emoji: "🎖",
		name: "military medal",
		src: "1F396.svg",
	},
	"\u{1F3A4}": {
		emoji: "🎤",
		name: "microphone",
		src: "1F3A4.svg",
	},
	"\u{1F3AA}": {
		emoji: "🎪",
		name: "circus tent",
		src: "1F3AA.svg",
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
	"\u{1F3C6}": {
		emoji: "🏆",
		name: "trophy",
		src: "1F3C6.svg",
	},
	"\u{1F3D7}": {
		emoji: "🏗",
		name: "building construction",
		src: "1F3D7.svg",
	},
	"\u{1F3DF}": {
		emoji: "🏟",
		name: "stadium",
		src: "1F3DF.svg",
	},
	"\u{1F427}": {
		emoji: "🐧",
		name: "penguin",
		src: "1F427.svg",
	},
	"\u{1F431}": {
		emoji: "🐱",
		name: "cat face",
		src: "1F431.svg",
	},
	"\u{1F480}": {
		emoji: "💀",
		name: "skull",
		src: "1F480.svg",
	},
	"\u{1F48A}": {
		emoji: "💊",
		name: "pill",
		src: "1F48A.svg",
	},
	"\u{1F4A1}": {
		emoji: "💡",
		name: "light bulb",
		src: "1F4A1.svg",
	},
	"\u{1F4BD}": {
		emoji: "💽",
		name: "computer disk",
		src: "1F4BD.svg",
	},
	"\u{1F4C3}": {
		emoji: "📃",
		name: "page with curl",
		src: "1F4C3.svg",
	},
	"\u{1F4C4}": {
		emoji: "📄",
		name: "page facing up",
		src: "1F4C4.svg",
	},
	"\u{1F4C9}": {
		emoji: "📉",
		name: "chart decreasing",
		src: "1F4C9.svg",
	},
	"\u{1F4DD}": {
		emoji: "📝",
		name: "memo",
		src: "1F4DD.svg",
	},
	"\u{1F4F7}": {
		emoji: "📷",
		name: "camera",
		src: "1F4F7.svg",
	},
	"\u{1F4F8}": {
		emoji: "📸",
		name: "camera with flash",
		src: "1F4F8.svg",
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
	"\u{1F4FC}": {
		emoji: "📼",
		name: "videocasette",
		src: "1F4FC.svg",
	},
	"\u{1F4FD}": {
		emoji: "📽",
		name: "film projector",
		src: "1F4FD.svg",
	},
	"\u{1F5E1}": {
		emoji: "🗡️",
		name: "dagger",
		src: "1F5E1.svg",
	},
	"\u{1F630}": {
		emoji: "😰",
		name: "anxious face with sweat",
		src: "1F630.svg",
	},
	"\u{1F63A}": {
		emoji: "😺",
		name: "grinning cat",
		src: "1F63A.svg",
	},
	"\u{1F63E}": {
		emoji: "😾",
		name: "pouting cat",
		src: "1F63E.svg",
	},
	"\u{1F680}": {
		emoji: "🚀",
		name: "rocket",
		src: "1F680.svg",
	},
	"\u{1F6AB}": {
		emoji: "🚫",
		name: "prohibited",
		src: "1F6AB.svg",
	},
	"\u{1F6D1}": {
		emoji: "🛑",
		name: "stop sign",
		src: "1F6D1.svg",
	},
	"\u{1F6F8}": {
		emoji: "🛸",
		name: "flying saucer",
		src: "1F6F8.svg",
	},
	"\u{1F92F}": {
		emoji: "🤯",
		name: "exploding head",
		src: "1F92F.svg",
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
	"\u{1F9FE}": {
		emoji: "🧾",
		name: "receipt",
		src: "1F9FE.svg",
	},
	"\u{1FA96}": {
		emoji: "🪖",
		name: "military helmet",
		src: "1FA96.svg",
	},
	"\u{1FA99}": {
		emoji: "🪙",
		name: "coin",
		src: "1FA99.svg",
	},
	"\u2620": {
		emoji: "☠",
		name: "skull and crossbones",
		src: "2620.svg",
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
	"\u26D4": {
		emoji: "⛔",
		name: "no entry",
		src: "26D4.svg",
	},
	"\u2709": {
		emoji: "✉",
		name: "envelope",
		src: "2709.svg",
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
		src: "flag-east-germany.svg",
	},
	"german-reich": {
		name: "german reich",
		src: "flag-germany-1867-1918.svg",
	},
	hr3: {
		name: "hr3",
		src: "logo-hr3.svg",
	},
	nazi: {
		name: "nazi germany",
		src: "flag-germany-1935-1945.svg",
	},
	messe: {
		emoji: "",
		name: "collaboration",
		src: "E249.svg",
	},
	raf: {
		name: "rote armee fraktion",
		src: "logo-raf.svg",
	},
	transmission: {
		name: "transmission",
		src: "E0A1.svg",
	},
	u60311: {
		name: "u60311",
		src: "logo-u60311.svg",
	},
};
export const TEMPLATES = {
	standard: () => {
		const instance = {
			/**
			 * @param {Array<string>} rows -
			 */
			table: (rows) =>
				`<TABLE BORDER="0" CELLBORDER="0" CELLPADDING="0" CELLSPACING="5">${rows.join("")}</TABLE>`,
			/**
			 * @param {Array<string>} cells -
			 */
			row: (cells) => `<TR>${cells.join("")}</TR>`,
			/**
			 * @param {string} icon -
			 * @param {string} tooltip -
			 */
			cellIcon: (icon, tooltip) =>
				[
					`<TD FIXEDSIZE="TRUE" WIDTH="24" HEIGHT="24" TOOLTIP="${tooltip}">`,
					`<IMG SRC="${prefixConfigs.get(icon)?.src}"/>`,
					`</TD>`,
				].join(""),
			/**
			 * @param {string} label -
			 */
			cellText: (label) => `<TD>${label}</TD>`,
			/**
			 * @param {Map<string, number>} prefixes -
			 */
			emojiToColumns: (prefixes) => [
				...prefixes
					.entries()
					.map(([prefix, count]) => instance.cellIcon(prefix, count.toFixed())),
			],
			/**
			 * @param {string} label -
			 * @param {Map<string, number>} prefixes -
			 */
			render: (label, prefixes) =>
				`${instance.table([
					instance.row([
						...instance.emojiToColumns(prefixes),
						instance.cellText(label),
					]),
				])}`,
		};
		return instance;
	},
	stamped: () => {
		const instance = {
			...TEMPLATES.standard(),
			/**
			 * @param {string} label -
			 */
			cellTextRight: (label) => `<TD ALIGN="RIGHT">${label}</TD>`,
			/**
			 * @param {string} timestamp -
			 * @param {number} indent -
			 */
			rowTimestamp: (timestamp, indent = 1) =>
				`<TR><TD COLSPAN="${indent}"></TD>${instance.cellTextRight(
					`<FONT POINT-SIZE="${FONT_SIZE_700MM_V07_STUDY_PT}">${timestamp}</FONT>`,
				)}</TR>`,
			/**
			 * @param {string} label -
			 * @param {Map<string, number>} prefixes -
			 */
			render: (label, prefixes) =>
				instance.table([
					instance.row([
						...instance.emojiToColumns(prefixes),
						instance.cellText(label.replace(/ \([0-9.]+\)$/, "")),
					]),
					instance.rowTimestamp(
						label.match(/ \(([0-9.]+)\)$/)?.[1] ??
							"TIMESTAMP_EXTRACTION_FAILED",
						prefixes.size,
					),
				]),
		};
		return instance;
	},
	trailer: () => {
		const instance = {
			/**
			 * @param {Array<string>} rows -
			 */
			table: (rows) =>
				`<TABLE BORDER="0" CELLBORDER="0" CELLPADDING="0" CELLSPACING="5">${rows.join("")}</TABLE>`,
			/**
			 * @param {Array<string>} iconCells -
			 * @param {string} labelBody -
			 */
			rowBody: (iconCells, labelBody) =>
				`<TR>${iconCells.join("")}${instance.cellText(labelBody)}</TR>`,
			/**
			 * @param {string} labelTrailer -
			 * @param {number} indent -
			 */
			rowTrailer: (labelTrailer, indent = 1) =>
				`<TR><TD COLSPAN="${indent}"></TD>${instance.cellText(
					`<FONT POINT-SIZE="${FONT_SIZE_1000MM_V07_STUDY_PT}">${labelTrailer}</FONT>`,
				)}</TR>`,
			/**
			 * @param {string} icon -
			 * @param {string} tooltip -
			 */
			cellIcon: (icon, tooltip) =>
				[
					`<TD FIXEDSIZE="TRUE" WIDTH="24" HEIGHT="24" TOOLTIP="${tooltip}">`,
					`<IMG SRC="${prefixConfigs.get(icon)?.src}"/>`,
					`</TD>`,
				].join(""),
			/**
			 * @param {string} label -
			 */
			cellText: (label) => `<TD>${label}</TD>`,
			/**
			 * @param {Map<string, number>} prefixes -
			 */
			emojiToColumns: (prefixes) => [
				...prefixes
					.entries()
					.map(([prefix, count]) => instance.cellIcon(prefix, count.toFixed())),
			],
			/**
			 * @param {string} labelBody -
			 * @param {string} labelTrailer -
			 * @param {Map<string, number>} prefixes -
			 */
			render: (labelBody, labelTrailer, prefixes) =>
				instance.table([
					instance.rowBody(instance.emojiToColumns(prefixes), labelBody),
					instance.rowTrailer(labelTrailer, prefixes.size),
				]),
		};
		return instance;
	},
	trailerStamped: () => {
		const instance = {
			...TEMPLATES.trailer(),
			...TEMPLATES.stamped(),
			/**
			 * @param {string} labelBody -
			 * @param {string} labelTrailer -
			 * @param {Map<string, number>} prefixes -
			 */
			render: (labelBody, labelTrailer, prefixes) =>
				instance.table([
					instance.rowBody(instance.emojiToColumns(prefixes), labelBody),
					instance.rowTrailer(
						labelTrailer.replace(/ \([0-9.]+\)$/, ""),
						prefixes.size,
					),
					instance.rowTimestamp(
						labelTrailer.match(/ \(([0-9.]+)\)$/)?.[1] ??
							"TIMESTAMP_EXTRACTION_FAILED",
						prefixes.size,
					),
				]),
		};
		return instance;
	},
};

const prefixConfigs = new Map(Object.entries(PREFIXES));

const svgPrefixes = content.replaceAll(
	/<(.*)\u{00A0}(.+)>,/gu,
	/**
	 * @param {string} substring -
	 * @param {string | undefined} prefixString -
	 * @param {string | undefined} label -
	 */
	(substring, prefixString, label) => {
		if (prefixString === undefined || label === undefined) {
			return substring;
		}

		const prefixes = prefixString.split("\u200B");
		const usages = new Map();
		for (const prefix of prefixes) {
			if (prefix in PREFIXES) {
				usages.set(prefix, (usages.get(prefix) ?? 0) + 1);
				prefixString = prefixString.replace(prefix, "");
				continue;
			}
			process.stderr.write(
				`emojify: unregistered prefix: '${prefix}' (${Array.from(prefix)
					.map((character) =>
						character?.codePointAt(0)?.toString(16).toUpperCase(),
					)
					.map((hex) => `\\u{${hex}}`)})\n`,
			);
		}
		if (usages.size === 0) {
			return substring;
		}
		const labelBlocks = label.split('<BR ALIGN="CENTER"/><BR ALIGN="CENTER"/>');
		const labelDateSuffix = label.match(
			/ \((?:\d\d\.)?(?:\d\d\.)?(?:\d\d\d\d)\)$/,
		);
		if (labelBlocks.length === 1) {
			const template =
				labelDateSuffix !== null ? TEMPLATES.stamped() : TEMPLATES.standard();
			return `<${template.render(label, usages)}>`;
		}
		if (labelBlocks.length === 2) {
			const template =
				labelDateSuffix !== null
					? TEMPLATES.trailerStamped()
					: TEMPLATES.trailer();
			return `<${template.render(labelBlocks[0], labelBlocks[1], usages)}>`;
		}
		throw new Error(`unexpected input with ${labelBlocks.length} blocks`);
	},
);

const filename = contentName
	.replace(/\.dot$/, ".idot")
	.replace(/\.dotus$/, ".idotus")
	.replace(/\.gv$/, ".igv")
	.replace(/\.gvus$/, ".igvus");
writeFileSync(join(contentLocation, filename), svgPrefixes);
