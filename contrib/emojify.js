#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
	FONT_SCALE,
	FONT_SIZE_700MM_V07_STUDY_PT,
	FONT_SIZE_1000MM_V07_READ_PT,
	FONT_SIZE_1000MM_V07_STUDY_PT,
	LABEL_PREFIX_GROUP,
	LABEL_TITLE_SEPARATOR,
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

			const slot = parts.groups.name ?? parts.groups.value;
			const value =
				typeof parts.groups.value === "string" && parts.groups.value !== ""
					? parts.groups.value
					: true;
			args[slot] = Array.isArray(args[slot])
				? [...args[slot], value]
				: typeof args[slot] === "undefined"
					? value
					: [args[slot], value];

			return args;
		},
		/** @type {Record<string, boolean | string | Array<boolean | string>>} */ ({}),
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
	"\u{1F1E8}\u{1F1F1}": {
		emoji: "🇨🇱",
		name: "flag: chile",
		src: "1F1E8-1F1F1.svg",
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
	"\u{1F1EA}\u{1F1FA}": {
		emoji: "🇪🇺",
		name: "flag: european union",
		src: "1F1EA-1F1FA.svg",
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
	"\u{1F1ED}\u{1F1F0}": {
		emoji: "🇭🇰",
		name: "flag: hong kong",
		src: "1F1ED-1F1F0.svg",
	},
	"\u{1F1ED}\u{1F1FA}": {
		emoji: "🇭🇺",
		name: "flag: hungary",
		src: "1F1ED-1F1FA.svg",
	},
	"\u{1F1EE}\u{1F1EA}": {
		emoji: "🇮🇪",
		name: "flag: india",
		src: "1F1EE-1F1EA.svg",
	},
	"\u{1F1EE}\u{1F1F3}": {
		emoji: "🇮🇳",
		name: "flag: india",
		src: "1F1EE-1F1F3.svg",
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
	"\u{1F1F3}\u{1F1FF}": {
		emoji: "🇳🇿",
		name: "flag: new zealand",
		src: "1F1F3-1F1FF.svg",
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
	"\u{1F1F9}\u{1F1FC}": {
		emoji: "🇹🇼",
		name: "flag: taiwan",
		src: "1F1F9-1F1FC.svg",
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
	"\u{1F310}": {
		emoji: "🌐",
		name: "globe with meridians",
		src: "1F310.svg",
	},
	"\u{1F396}": {
		emoji: "🎖",
		name: "military medal",
		src: "1F396.svg",
	},
	"\u{1F39E}": {
		emoji: "🎞",
		name: "film frames",
		src: "1F39E.svg",
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
	"\u{1F3AB}": {
		emoji: "🎫",
		name: "ticket",
		src: "1F3AB.svg",
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
	"\u{1F3B5}": {
		emoji: "🎵",
		name: "musical note",
		src: "1F3B5.svg",
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
	"\u{1F465}": {
		emoji: "👥",
		name: "busts in silhouette",
		src: "1F465.svg",
	},
	"\u{1F466}": {
		emoji: "👦",
		name: "boy",
		src: "1F466.svg",
	},
	"\u{1F466}\u{1F3FB}": {
		emoji: "👦🏻",
		name: "boy: light skin tone",
		src: "1F466-1F3FB.svg",
	},
	"\u{1F466}\u{1F3FC}": {
		emoji: "👦🏼",
		name: "boy: medium-light skin tone",
		src: "1F466-1F3FC.svg",
	},
	"\u{1F466}\u{1F3FD}": {
		emoji: "👦🏽",
		name: "boy: medium skin tone",
		src: "1F466-1F3FD.svg",
	},
	"\u{1F466}\u{1F3FE}": {
		emoji: "👦🏾",
		name: "boy: medium-dark skin tone",
		src: "1F466-1F3FE.svg",
	},
	"\u{1F466}\u{1F3FF}": {
		emoji: "👦🏿",
		name: "boy: dark skin tone",
		src: "1F466-1F3FF.svg",
	},
	"\u{1F467}": {
		emoji: "👧",
		name: "girl",
		src: "1F467.svg",
	},
	"\u{1F467}\u{1F3FB}": {
		emoji: "👧🏻",
		name: "girl: light skin tone",
		src: "1F467-1F3FB.svg",
	},
	"\u{1F467}\u{1F3FC}": {
		emoji: "👧🏼",
		name: "girl: medium-light skin tone",
		src: "1F467-1F3FC.svg",
	},
	"\u{1F467}\u{1F3FD}": {
		emoji: "👧🏽",
		name: "girl: medium skin tone",
		src: "1F467-1F3FD.svg",
	},
	"\u{1F467}\u{1F3FE}": {
		emoji: "👧🏾",
		name: "girl: medium-dark skin tone",
		src: "1F467-1F3FE.svg",
	},
	"\u{1F467}\u{1F3FF}": {
		emoji: "👧🏿",
		name: "girl: dark skin tone",
		src: "1F467-1F3FF.svg",
	},
	"\u{1F468}": {
		emoji: "👱",
		name: "man",
		src: "1F468.svg",
	},
	"\u{1F468}\u{1F3FB}": {
		emoji: "👨🏻",
		name: "man: light skin tone",
		src: "1F468-1F3FB.svg",
	},
	"\u{1F468}\u{1F3FC}": {
		emoji: "👨🏼",
		name: "man: medium-light skin tone",
		src: "1F468-1F3FC.svg",
	},
	"\u{1F468}\u{1F3FD}": {
		emoji: "👨🏽",
		name: "man: medium skin tone",
		src: "1F468-1F3FD.svg",
	},
	"\u{1F468}\u{1F3FE}": {
		emoji: "👨🏾",
		name: "man: medium-dark skin tone",
		src: "1F468-1F3FE.svg",
	},
	"\u{1F468}\u{1F3FF}": {
		emoji: "👨🏿",
		name: "man: dark skin tone",
		src: "1F468-1F3FF.svg",
	},
	"\u{1F468}\u200D\u{1F9B0}": {
		emoji: "👨‍🦰",
		name: "man: red hair",
		src: "1F468-200D-1F9B0.svg",
	},
	"\u{1F468}\u{1F3FB}\u200D\u{1F9B0}": {
		emoji: "👨🏻‍🦰",
		name: "man: light skin tone, red hair",
		src: "1F468-1F3FB-200D-1F9B0.svg",
	},
	"\u{1F468}\u{1F3FC}\u200D\u{1F9B0}": {
		emoji: "👨🏼‍🦰",
		name: "man: medium-light skin tone, red hair",
		src: "1F468-1F3FC-200D-1F9B0.svg",
	},
	"\u{1F468}\u{1F3FD}\u200D\u{1F9B0}": {
		emoji: "👨🏽‍🦰",
		name: "man: medium skin tone, red hair",
		src: "1F468-1F3FD-200D-1F9B0.svg",
	},
	"\u{1F468}\u{1F3FE}\u200D\u{1F9B0}": {
		emoji: "👨🏾‍🦰",
		name: "man: medium-dark skin tone, red hair",
		src: "1F468-1F3FE-200D-1F9B0.svg",
	},
	"\u{1F468}\u{1F3FF}\u200D\u{1F9B0}": {
		emoji: "👨🏿‍🦰",
		name: "man: dark skin tone, red hair",
		src: "1F468-1F3FF-200D-1F9B0.svg",
	},
	"\u{1F468}\u200D\u{1F9B1}": {
		emoji: "👨‍🦱",
		name: "man: curly hair",
		src: "1F468-200D-1F9B1.svg",
	},
	"\u{1F468}\u{1F3FB}\u200D\u{1F9B1}": {
		emoji: "👨🏻‍🦱",
		name: "man: light skin tone, curly hair",
		src: "1F468-1F3FB-200D-1F9B1.svg",
	},
	"\u{1F468}\u{1F3FC}\u200D\u{1F9B1}": {
		emoji: "👨🏼‍🦱",
		name: "man: medium-light skin tone, curly hair",
		src: "1F468-1F3FC-200D-1F9B1.svg",
	},
	"\u{1F468}\u{1F3FD}\u200D\u{1F9B1}": {
		emoji: "👨🏽‍🦱",
		name: "man: medium skin tone, curly hair",
		src: "1F468-1F3FD-200D-1F9B1.svg",
	},
	"\u{1F468}\u{1F3FE}\u200D\u{1F9B1}": {
		emoji: "👨🏾‍🦱",
		name: "man: medium-dark skin tone, curly hair",
		src: "1F468-1F3FE-200D-1F9B1.svg",
	},
	"\u{1F468}\u{1F3FF}\u200D\u{1F9B1}": {
		emoji: "👨🏿‍🦱",
		name: "man: dark skin tone, curly hair",
		src: "1F468-1F3FF-200D-1F9B1.svg",
	},
	"\u{1F468}\u200D\u{1F9B2}": {
		emoji: "👨‍🦲",
		name: "man: bald",
		src: "1F468-200D-1F9B2.svg",
	},
	"\u{1F468}\u{1F3FB}\u200D\u{1F9B2}": {
		emoji: "👨🏻‍🦲",
		name: "man: light skin tone, bald",
		src: "1F468-1F3FB-200D-1F9B2.svg",
	},
	"\u{1F468}\u{1F3FC}\u200D\u{1F9B2}": {
		emoji: "👨🏼‍🦲",
		name: "man: medium-light skin tone, bald",
		src: "1F468-1F3FC-200D-1F9B2.svg",
	},
	"\u{1F468}\u{1F3FD}\u200D\u{1F9B2}": {
		emoji: "👨🏽‍🦲",
		name: "man: medium skin tone, bald",
		src: "1F468-1F3FD-200D-1F9B2.svg",
	},
	"\u{1F468}\u{1F3FE}\u200D\u{1F9B2}": {
		emoji: "👨🏾‍🦲",
		name: "man: medium-dark skin tone, bald",
		src: "1F468-1F3FE-200D-1F9B2.svg",
	},
	"\u{1F468}\u{1F3FF}\u200D\u{1F9B2}": {
		emoji: "👨🏿‍🦲",
		name: "man: dark skin tone, bald",
		src: "1F468-1F3FF-200D-1F9B2.svg",
	},
	"\u{1F468}\u200D\u{1F9B3}": {
		emoji: "👨‍🦳",
		name: "man: white hair",
		src: "1F468-200D-1F9B3.svg",
	},
	"\u{1F468}\u{1F3FB}\u200D\u{1F9B3}": {
		emoji: "👨🏻‍🦳",
		name: "man: light skin tone, white hair",
		src: "1F468-1F3FB-200D-1F9B3.svg",
	},
	"\u{1F468}\u{1F3FC}\u200D\u{1F9B3}": {
		emoji: "👨🏼‍🦳",
		name: "man: medium-light skin tone, white hair",
		src: "1F468-1F3FC-200D-1F9B3.svg",
	},
	"\u{1F468}\u{1F3FD}\u200D\u{1F9B3}": {
		emoji: "👨🏽‍🦳",
		name: "man: medium skin tone, white hair",
		src: "1F468-1F3FD-200D-1F9B3.svg",
	},
	"\u{1F468}\u{1F3FE}\u200D\u{1F9B3}": {
		emoji: "👨🏾‍🦳",
		name: "man: medium-dark skin tone, white hair",
		src: "1F468-1F3FE-200D-1F9B3.svg",
	},
	"\u{1F468}\u{1F3FF}\u200D\u{1F9B3}": {
		emoji: "👨🏿‍🦳",
		name: "man: dark skin tone, white hair",
		src: "1F468-1F3FF-200D-1F9B3.svg",
	},
	"\u{1F469}": {
		emoji: "👩",
		name: "woman",
		src: "1F469.svg",
	},
	"\u{1F469}\u{1F3FB}": {
		emoji: "👩🏻",
		name: "woman: light skin tone",
		src: "1F469-1F3FB.svg",
	},
	"\u{1F469}\u{1F3FC}": {
		emoji: "👩🏼",
		name: "woman: medium-light skin tone",
		src: "1F469-1F3FC.svg",
	},
	"\u{1F469}\u{1F3FD}": {
		emoji: "👩🏽",
		name: "woman: medium skin tone",
		src: "1F469-1F3FD.svg",
	},
	"\u{1F469}\u{1F3FE}": {
		emoji: "👩🏾",
		name: "woman: medium-dark skin tone",
		src: "1F469-1F3FE.svg",
	},
	"\u{1F469}\u{1F3FF}": {
		emoji: "👩🏿",
		name: "woman: dark skin tone",
		src: "1F469-1F3FF.svg",
	},
	"\u{1F469}\u200D\u{1F9B0}": {
		emoji: "👩‍🦰",
		name: "woman: red hair",
		src: "1F469-200D-1F9B0.svg",
	},
	"\u{1F469}\u{1F3FB}\u200D\u{1F9B0}": {
		emoji: "👩🏻‍🦰",
		name: "woman: light skin tone, red hair",
		src: "1F469-1F3FB-200D-1F9B0.svg",
	},
	"\u{1F469}\u{1F3FC}\u200D\u{1F9B0}": {
		emoji: "👩🏼‍🦰",
		name: "woman: medium-light skin tone, red hair",
		src: "1F469-1F3FC-200D-1F9B0.svg",
	},
	"\u{1F469}\u{1F3FD}\u200D\u{1F9B0}": {
		emoji: "👩🏽‍🦰",
		name: "woman: medium skin tone, red hair",
		src: "1F469-1F3FD-200D-1F9B0.svg",
	},
	"\u{1F469}\u{1F3FE}\u200D\u{1F9B0}": {
		emoji: "👩🏾‍🦰",
		name: "woman: medium-dark skin tone, red hair",
		src: "1F469-1F3FE-200D-1F9B0.svg",
	},
	"\u{1F469}\u{1F3FF}\u200D\u{1F9B0}": {
		emoji: "👩🏿‍🦰",
		name: "woman: dark skin tone, red hair",
		src: "1F469-1F3FF-200D-1F9B0.svg",
	},
	"\u{1F469}\u200D\u{1F9B1}": {
		emoji: "👩‍🦱",
		name: "woman: curly hair",
		src: "1F469-200D-1F9B1.svg",
	},
	"\u{1F469}\u{1F3FB}\u200D\u{1F9B1}": {
		emoji: "👩🏻‍🦱",
		name: "woman: light skin tone, curly hair",
		src: "1F469-1F3FB-200D-1F9B1.svg",
	},
	"\u{1F469}\u{1F3FC}\u200D\u{1F9B1}": {
		emoji: "👩🏼‍🦱",
		name: "woman: medium-light skin tone, curly hair",
		src: "1F469-1F3FC-200D-1F9B1.svg",
	},
	"\u{1F469}\u{1F3FD}\u200D\u{1F9B1}": {
		emoji: "👩🏽‍🦱",
		name: "woman: medium skin tone, curly hair",
		src: "1F469-1F3FD-200D-1F9B1.svg",
	},
	"\u{1F469}\u{1F3FE}\u200D\u{1F9B1}": {
		emoji: "👩🏾‍🦱",
		name: "woman: medium-dark skin tone, curly hair",
		src: "1F469-1F3FE-200D-1F9B1.svg",
	},
	"\u{1F469}\u{1F3FF}\u200D\u{1F9B1}": {
		emoji: "👩🏿‍🦱",
		name: "woman: dark skin tone, curly hair",
		src: "1F469-1F3FF-200D-1F9B1.svg",
	},
	"\u{1F469}\u200D\u{1F9B2}": {
		emoji: "👩‍🦲",
		name: "woman: bald",
		src: "1F469-200D-1F9B2.svg",
	},
	"\u{1F469}\u{1F3FB}\u200D\u{1F9B2}": {
		emoji: "👩🏻‍🦲",
		name: "woman: light skin tone, bald",
		src: "1F469-1F3FB-200D-1F9B2.svg",
	},
	"\u{1F469}\u{1F3FC}\u200D\u{1F9B2}": {
		emoji: "👩🏼‍🦲",
		name: "woman: medium-light skin tone, bald",
		src: "1F469-1F3FC-200D-1F9B2.svg",
	},
	"\u{1F469}\u{1F3FD}\u200D\u{1F9B2}": {
		emoji: "👩🏽‍🦲",
		name: "woman: medium skin tone, bald",
		src: "1F469-1F3FD-200D-1F9B2.svg",
	},
	"\u{1F469}\u{1F3FE}\u200D\u{1F9B2}": {
		emoji: "👩🏾‍🦲",
		name: "woman: medium-dark skin tone, bald",
		src: "1F469-1F3FE-200D-1F9B2.svg",
	},
	"\u{1F469}\u{1F3FF}\u200D\u{1F9B2}": {
		emoji: "👩🏿‍🦲",
		name: "woman: dark skin tone, bald",
		src: "1F469-1F3FF-200D-1F9B2.svg",
	},
	"\u{1F469}\u200D\u{1F9B3}": {
		emoji: "👩‍🦳",
		name: "woman: white hair",
		src: "1F469-200D-1F9B3.svg",
	},
	"\u{1F469}\u{1F3FB}\u200D\u{1F9B3}": {
		emoji: "👩🏻‍🦳",
		name: "woman: light skin tone, white hair",
		src: "1F469-1F3FB-200D-1F9B3.svg",
	},
	"\u{1F469}\u{1F3FC}\u200D\u{1F9B3}": {
		emoji: "👩🏼‍🦳",
		name: "woman: medium-light skin tone, white hair",
		src: "1F469-1F3FC-200D-1F9B3.svg",
	},
	"\u{1F469}\u{1F3FD}\u200D\u{1F9B3}": {
		emoji: "👩🏽‍🦳",
		name: "woman: medium skin tone, white hair",
		src: "1F469-1F3FD-200D-1F9B3.svg",
	},
	"\u{1F469}\u{1F3FE}\u200D\u{1F9B3}": {
		emoji: "👩🏾‍🦳",
		name: "woman: medium-dark skin tone, white hair",
		src: "1F469-1F3FE-200D-1F9B3.svg",
	},
	"\u{1F469}\u{1F3FF}\u200D\u{1F9B3}": {
		emoji: "👩🏿‍🦳",
		name: "woman: dark skin tone, white hair",
		src: "1F469-1F3FF-200D-1F9B3.svg",
	},
	"\u{1F469}\u200D\u{1F52C}": {
		emoji: "👩‍🔬",
		name: "woman scientist",
		src: "1F469-200D-1F52C.svg",
	},
	"\u{1F470}": {
		emoji: "👰",
		name: "person with veil",
		src: "1F470.svg",
	},
	"\u{1F471}": {
		emoji: "👱",
		name: "person with blond hair",
		src: "1F471.svg",
	},
	"\u{1F471}\u{1F3FB}": {
		emoji: "👱🏻",
		name: "person: light skin tone, blond hair",
		src: "1F471-1F3FB.svg",
	},
	"\u{1F471}\u{1F3FC}\u200D\u2640\uFE0F": {
		emoji: "👱🏼‍♀️",
		name: "woman: medium-light skin tone, blond hair",
		src: "1F471-1F3FC-200D-2640-FE0F.svg",
	},
	"\u{1F471}\u200D\u2640\uFE0F": {
		emoji: "👱‍♀️",
		name: "woman: blond hair",
		src: "1F471-200D-2640-FE0F.svg",
	},
	"\u{1F471}\u200D\u2642\uFE0F": {
		emoji: "👱‍♀️",
		name: "man: blond hair",
		src: "1F471-200D-2642-FE0F.svg",
	},
	"\u{1F472}": {
		emoji: "👲",
		name: "person with skullcap",
		src: "1F472.svg",
	},
	"\u{1F473}": {
		emoji: "👳",
		name: "person with turban",
		src: "1F473.svg",
	},
	"\u{1F474}": {
		emoji: "👴",
		name: "old man",
		src: "1F474.svg",
	},
	"\u{1F474}\u{1F3FB}": {
		emoji: "👴🏻",
		name: "old man: light skin tone",
		src: "1F474-1F3FB.svg",
	},
	"\u{1F474}\u{1F3FC}": {
		emoji: "👴🏼",
		name: "old man: medium-light skin tone",
		src: "1F474-1F3FC.svg",
	},
	"\u{1F474}\u{1F3FD}": {
		emoji: "👴🏽",
		name: "old man: medium skin tone",
		src: "1F474-1F3FD.svg",
	},
	"\u{1F474}\u{1F3FE}": {
		emoji: "👴🏾",
		name: "old man: medium-dark skin tone",
		src: "1F474-1F3FE.svg",
	},
	"\u{1F474}\u{1F3FF}": {
		emoji: "👴🏿",
		name: "old man: dark skin tone",
		src: "1F474-1F3FF.svg",
	},
	"\u{1F475}": {
		emoji: "👵",
		name: "old woman",
		src: "1F475.svg",
	},
	"\u{1F475}\u{1F3FB}": {
		emoji: "👵🏻",
		name: "old woman: light skin tone",
		src: "1F475-1F3FB.svg",
	},
	"\u{1F475}\u{1F3FC}": {
		emoji: "👵🏼",
		name: "old woman: medium-light skin tone",
		src: "1F475-1F3FC.svg",
	},
	"\u{1F475}\u{1F3FD}": {
		emoji: "👵🏽",
		name: "old woman: medium skin tone",
		src: "1F475-1F3FD.svg",
	},
	"\u{1F475}\u{1F3FE}": {
		emoji: "👵🏾",
		name: "old woman: medium-dark skin tone",
		src: "1F475-1F3FE.svg",
	},
	"\u{1F475}\u{1F3FF}": {
		emoji: "👵🏿",
		name: "old woman: dark skin tone",
		src: "1F475-1F3FF.svg",
	},
	"\u{1F476}": {
		emoji: "👶",
		name: "baby",
		src: "1F476.svg",
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
	"\u{1F4C5}": {
		emoji: "📅",
		name: "calendar",
		src: "1F4C5.svg",
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
	"\u{1F64D}": {
		emoji: "🙍",
		name: "person frowning",
		src: "1F64D.svg",
	},
	"\u{1F64D}\u200D\u2640\uFE0F": {
		emoji: "🙍‍♀️",
		name: "woman frowning",
		src: "1F64D-200D-u2640-FE0F.svg",
	},
	"\u{1F64D}\u200D\u2642\uFE0F": {
		emoji: "🙍‍♂️",
		name: "man frowning",
		src: "1F64D-200D-u2642-FE0F.svg",
	},
	"\u{1F64E}": {
		emoji: "🙎",
		name: "person pouting",
		src: "1F64E.svg",
	},
	"\u{1F64E}\u200D\u2640\uFE0F": {
		emoji: "🙎‍♀️",
		name: "woman pouting",
		src: "1F64E-200D-u2640-FE0F.svg",
	},
	"\u{1F64E}\u200D\u2642\uFE0F": {
		emoji: "🙎‍♂️",
		name: "man pouting",
		src: "1F64E-200D-u2642-FE0F.svg",
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
	"\u{1F9D0}": {
		emoji: "🧐",
		name: "face with monocle",
		src: "1F9D0.svg",
	},
	"\u{1F9D1}": {
		emoji: "🧑",
		name: "person",
		src: "1F9D1.svg",
	},
	"\u{1F9D1}\u200D\u{1F9B0}": {
		emoji: "🧑‍🦰",
		name: "person: red hair",
		src: "1F9D1-200D-1F9B0.svg",
	},
	"\u{1F9D1}\u200D\u{1F9B1}": {
		emoji: "🧑‍🦱",
		name: "person: curly hair",
		src: "1F9D1-200D-1F9B1.svg",
	},
	"\u{1F9D1}\u200D\u{1F9B2}": {
		emoji: "🧑‍🦲",
		name: "person: bald",
		src: "1F9D1-200D-1F9B2.svg",
	},
	"\u{1F9D1}\u200D\u{1F9B3}": {
		emoji: "🧑‍🦳",
		name: "person: white hair",
		src: "1F9D1-200D-1F9B3.svg",
	},
	"\u{1F9D1}\u{1F3FB}": {
		emoji: "🧑🏻",
		name: "person: light skin tone",
		src: "1F9D1-1F3FB.svg",
	},
	"\u{1F9D1}\u{1F3FB}\u200D\u{1F9B0}": {
		emoji: "🧑🏻‍🦰",
		name: "person: light skin tone, red hair",
		src: "1F9D1-1F3FB-200D-1F9B0.svg",
	},
	"\u{1F9D1}\u{1F3FB}\u200D\u{1F9B1}": {
		emoji: "🧑🏻‍🦱",
		name: "person: light skin tone, curly hair",
		src: "1F9D1-1F3FB-200D-1F9B1.svg",
	},
	"\u{1F9D1}\u{1F3FB}\u200D\u{1F9B2}": {
		emoji: "🧑🏻‍🦲",
		name: "person: light skin tone, bald",
		src: "1F9D1-1F3FB-200D-1F9B2.svg",
	},
	"\u{1F9D1}\u{1F3FB}\u200D\u{1F9B3}": {
		emoji: "🧑🏻‍🦳",
		name: "person: light skin tone, white hair",
		src: "1F9D1-1F3FB-200D-1F9B3.svg",
	},
	"\u{1F9D1}\u{1F3FC}": {
		emoji: "🧑🏼",
		name: "person: medium-light skin tone",
		src: "1F9D1-1F3FC.svg",
	},
	"\u{1F9D1}\u{1F3FC}\u200D\u{1F9B0}": {
		emoji: "🧑🏼‍🦰",
		name: "person: medium-light skin tone, red hair",
		src: "1F9D1-1F3FC-200D-1F9B0.svg",
	},
	"\u{1F9D1}\u{1F3FC}\u200D\u{1F9B1}": {
		emoji: "🧑🏼‍🦱",
		name: "person: medium-light skin tone, curly hair",
		src: "1F9D1-1F3FC-200D-1F9B1.svg",
	},
	"\u{1F9D1}\u{1F3FC}\u200D\u{1F9B2}": {
		emoji: "🧑🏼‍🦲",
		name: "person: medium-light skin tone, bald",
		src: "1F9D1-1F3FC-200D-1F9B2.svg",
	},
	"\u{1F9D1}\u{1F3FC}\u200D\u{1F9B3}": {
		emoji: "🧑🏼‍🦳",
		name: "person: medium-light skin tone, white hair",
		src: "1F9D1-1F3FC-200D-1F9B3.svg",
	},
	"\u{1F9D1}\u{1F3FD}": {
		emoji: "🧑🏽",
		name: "person: medium skin tone",
		src: "1F9D1-1F3FD.svg",
	},
	"\u{1F9D1}\u{1F3FD}\u200D\u{1F9B0}": {
		emoji: "🧑🏽‍🦰",
		name: "person: medium skin tone, red hair",
		src: "1F9D1-1F3FD-200D-1F9B0.svg",
	},
	"\u{1F9D1}\u{1F3FD}\u200D\u{1F9B1}": {
		emoji: "🧑🏽‍🦱",
		name: "person: medium skin tone, curly hair",
		src: "1F9D1-1F3FD-200D-1F9B1.svg",
	},
	"\u{1F9D1}\u{1F3FD}\u200D\u{1F9B2}": {
		emoji: "🧑🏽‍🦲",
		name: "person: medium skin tone, bald",
		src: "1F9D1-1F3FD-200D-1F9B2.svg",
	},
	"\u{1F9D1}\u{1F3FD}\u200D\u{1F9B3}": {
		emoji: "🧑🏽‍🦳",
		name: "person: medium skin tone, white hair",
		src: "1F9D1-1F3FD-200D-1F9B3.svg",
	},
	"\u{1F9D1}\u{1F3FE}": {
		emoji: "🧑🏾",
		name: "person: medium-dark skin tone",
		src: "1F9D1-1F3FE.svg",
	},
	"\u{1F9D1}\u{1F3FE}\u200D\u{1F9B0}": {
		emoji: "🧑🏾‍🦰",
		name: "person: medium-dark skin tone, red hair",
		src: "1F9D1-1F3FE-200D-1F9B0.svg",
	},
	"\u{1F9D1}\u{1F3FE}\u200D\u{1F9B1}": {
		emoji: "🧑🏾‍🦱",
		name: "person: medium-dark skin tone, curly hair",
		src: "1F9D1-1F3FE-200D-1F9B1.svg",
	},
	"\u{1F9D1}\u{1F3FE}\u200D\u{1F9B2}": {
		emoji: "🧑🏾‍🦲",
		name: "person: medium-dark skin tone, bald",
		src: "1F9D1-1F3FE-200D-1F9B2.svg",
	},
	"\u{1F9D1}\u{1F3FE}\u200D\u{1F9B3}": {
		emoji: "🧑🏾‍🦳",
		name: "person: medium-dark skin tone, white hair",
		src: "1F9D1-1F3FE-200D-1F9B3.svg",
	},
	"\u{1F9D1}\u{1F3FF}": {
		emoji: "🧑🏿",
		name: "person: dark skin tone",
		src: "1F9D1-1F3FF.svg",
	},
	"\u{1F9D1}\u{1F3FF}\u200D\u{1F9B0}": {
		emoji: "🧑🏿‍🦰",
		name: "person: dark skin tone, red hair",
		src: "1F9D1-1F3FF-200D-1F9B0.svg",
	},
	"\u{1F9D1}\u{1F3FF}\u200D\u{1F9B1}": {
		emoji: "🧑🏿‍🦱",
		name: "person: dark skin tone, curly hair",
		src: "1F9D1-1F3FF-200D-1F9B1.svg",
	},
	"\u{1F9D1}\u{1F3FF}\u200D\u{1F9B2}": {
		emoji: "🧑🏿‍🦲",
		name: "person: dark skin tone, bald",
		src: "1F9D1-1F3FF-200D-1F9B2.svg",
	},
	"\u{1F9D1}\u{1F3FF}\u200D\u{1F9B3}": {
		emoji: "🧑🏿‍🦳",
		name: "person: dark skin tone, white hair",
		src: "1F9D1-1F3FF-200D-1F9B3.svg",
	},
	"\u{1F9D2}": {
		emoji: "🧒",
		name: "child",
		src: "1F9D2.svg",
	},
	"\u{1F9D2}\u{1F3FB}": {
		emoji: "🧒🏻",
		name: "child: light skin tone",
		src: "1F9D2-1F3FB.svg",
	},
	"\u{1F9D2}\u{1F3FC}": {
		emoji: "🧒🏼",
		name: "child: medium-light skin tone",
		src: "1F9D2-1F3FC.svg",
	},
	"\u{1F9D2}\u{1F3FD}": {
		emoji: "🧒🏽",
		name: "child: medium skin tone",
		src: "1F9D2-1F3FD.svg",
	},
	"\u{1F9D2}\u{1F3FE}": {
		emoji: "🧒🏾",
		name: "child: medium-dark skin tone",
		src: "1F9D2-1F3FE.svg",
	},
	"\u{1F9D2}\u{1F3FF}": {
		emoji: "🧒🏿",
		name: "child: dark skin tone",
		src: "1F9D2-1F3FF.svg",
	},
	"\u{1F9D3}": {
		emoji: "🧓",
		name: "older person",
		src: "1F9D3.svg",
	},
	"\u{1F9D3}\u{1F3FB}": {
		emoji: "🧓🏻",
		name: "older person: light skin tone",
		src: "1F9D3-1F3FB.svg",
	},
	"\u{1F9D3}\u{1F3FC}": {
		emoji: "🧓🏼",
		name: "older person: medium-light skin tone",
		src: "1F9D3-1F3FC.svg",
	},
	"\u{1F9D3}\u{1F3FD}": {
		emoji: "🧓🏽",
		name: "older person: medium skin tone",
		src: "1F9D3-1F3FD.svg",
	},
	"\u{1F9D3}\u{1F3FE}": {
		emoji: "🧓🏾",
		name: "older person: medium-dark skin tone",
		src: "1F9D3-1F3FE.svg",
	},
	"\u{1F9D3}\u{1F3FF}": {
		emoji: "🧓🏿",
		name: "older person: dark skin tone",
		src: "1F9D3-1F3FF.svg",
	},
	"\u{1F9D4}": {
		emoji: "🧔",
		name: "person with beard",
		src: "1F9D4.svg",
	},
	"\u{1F9D4}\u200D\u2640\uFE0F": {
		emoji: "🧔‍♀️",
		name: "person with beard: female",
		src: "1F9D4-200D-2640-FE0F.svg",
	},
	"\u{1F9D4}\u200D\u2642\uFE0F": {
		emoji: "🧔‍♂️",
		name: "person with beard: male",
		src: "1F9D4-200D-2642-FE0F.svg",
	},
	"\u{1F9D4}\u{1F3FB}\u200D\u2642\uFE0F": {
		emoji: "🧔🏻‍♂️",
		name: "person with beard: light skin tone, male",
		src: "1F9D4-1F3FB-200D-2642-FE0F.svg",
	},
	"\u{1F9D4}\u{1F3FC}\u200D\u2642\uFE0F": {
		emoji: "🧔🏼‍♂️",
		name: "person with beard: medium-light skin tone, male",
		src: "1F9D4-1F3FC-200D-2642-FE0F.svg",
	},
	"\u{1F9D4}\u{1F3FD}\u200D\u2642\uFE0F": {
		emoji: "🧔🏽‍♂️",
		name: "person with beard: medium skin tone, male",
		src: "1F9D4-1F3FD-200D-2642-FE0F.svg",
	},
	"\u{1F9D4}\u{1F3FE}\u200D\u2642\uFE0F": {
		emoji: "🧔🏾‍♀️",
		name: "person with beard: medium-dark skin tone, male",
		src: "1F9D4-1F3FE-200D-2642-FE0F.svg",
	},
	"\u{1F9D4}\u{1F3FF}\u200D\u2642\uFE0F": {
		emoji: "🧔🏿‍♂️",
		name: "person with beard: dark skin tone, male",
		src: "1F9D4-1F3FF-200D-2642-FE0F.svg",
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
	"\u2764\uFE0F\u200D\u{1F525}": {
		emoji: "❤️‍🔥",
		name: "heart on fire",
		src: "2764-FE0F-200D-1F525.svg",
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
	"soviet-union": {
		name: "soviet union",
		src: "flag-soviet-union.svg",
	},
	u60311: {
		name: "u60311",
		src: "logo-u60311.svg",
	},
	yugoslavia: {
		name: "yugoslavia",
		src: "flag-yugoslavia-1946-1992.svg",
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
			 * @param {Array<string>} iconCells -
			 * @param {string} labelBody -
			 */
			rowBody: (iconCells, labelBody) =>
				instance.row([...iconCells.join(""), instance.cellPlain(labelBody)]),

			/**
			 * @param {string} label -
			 */
			cellPlain: (label) => `<TD>${label}</TD>`,

			/**
			 * @param {string} icon -
			 * @param {string} tooltip -
			 */
			cellIcon: (icon, tooltip) =>
				[
					`<TD FIXEDSIZE="TRUE" WIDTH="${Math.floor(
						FONT_SIZE_1000MM_V07_READ_PT * FONT_SCALE,
					)}" HEIGHT="${Math.floor(FONT_SIZE_1000MM_V07_READ_PT * FONT_SCALE)}" TOOLTIP="${tooltip}">`,
					`<IMG SRC="${prefixConfigs.get(icon)?.src}"/>`,
					`</TD>`,
				].join(""),

			/**
			 * @param {string} label -
			 */
			cellTextRight: (label) => `<TD ALIGN="RIGHT">${label}</TD>`,

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
						instance.cellPlain(label),
					]),
				])}`,
		};
		return instance;
	},
	stamped: () => {
		const instance = {
			...TEMPLATES.standard(),
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
						instance.cellPlain(label.replace(/ \([0-9.]+\)$/, "")),
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
			...TEMPLATES.standard(),
			/**
			 * @param {string} labelTrailer -
			 * @param {number} indent -
			 */
			rowTrailer: (labelTrailer, indent = 1) =>
				`<TR><TD COLSPAN="${indent}"></TD>${instance.cellPlain(
					`<FONT POINT-SIZE="${FONT_SIZE_1000MM_V07_STUDY_PT}">${labelTrailer}</FONT>`,
				)}</TR>`,

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
	title: () => {
		const instance = {
			...TEMPLATES.standard(),
			/**
			 * @param {string} labelTitle -
			 * @param {number} columns -
			 */
			cellTitle: (labelTitle, columns = 1) =>
				`<TD ALIGN="LEFT" COLOR="#FFFFFFFF" COLSPAN="${columns}">${labelTitle}</TD>`,

			/**
			 * @param {string} labelTitle -
			 * @param {number} columns -
			 */
			rowTitle: (labelTitle, columns = 1) =>
				instance.row([
					instance.cellTitle(
						`<FONT POINT-SIZE="${FONT_SIZE_700MM_V07_STUDY_PT}">${labelTitle}</FONT>`,
						columns,
					),
				]),

			/**
			 * @param {string} labelBody -
			 * @param {string} labelTitle -
			 * @param {Map<string, number>} prefixes -
			 */
			render: (labelBody, labelTitle, prefixes) =>
				instance.table([
					instance.rowTitle(labelTitle, prefixes.size + 1),
					instance.rowBody(instance.emojiToColumns(prefixes), labelBody),
				]),
		};
		return instance;
	},
	titleStamped: () => {
		const instance = {
			...TEMPLATES.title(),
			...TEMPLATES.stamped(),
			/**
			 * @param {string} labelBody -
			 * @param {string} labelTitle -
			 * @param {Map<string, number>} prefixes -
			 */
			render: (labelBody, labelTitle, prefixes) =>
				instance.table([
					instance.rowTitle(labelTitle, prefixes.size + 1),
					instance.rowBody(
						instance.emojiToColumns(prefixes),
						labelBody.replace(/ \([0-9.]+\)$/, ""),
					),
					instance.rowTimestamp(
						labelBody.match(/ \(([0-9.]+)\)$/)?.[1] ??
							"TIMESTAMP_EXTRACTION_FAILED",
						prefixes.size,
					),
				]),
		};
		return instance;
	},
	titleTrailer: () => {
		const instance = {
			...TEMPLATES.title(),
			...TEMPLATES.trailer(),
			/**
			 * @param {string} labelBody -
			 * @param {string} labelTitle -
			 * @param {string} labelTrailer -
			 * @param {Map<string, number>} prefixes -
			 */
			render: (labelBody, labelTitle, labelTrailer, prefixes) =>
				instance.table([
					instance.rowTitle(labelTitle, prefixes.size + 1),
					instance.rowBody(instance.emojiToColumns(prefixes), labelBody),
					instance.rowTrailer(labelTrailer, prefixes.size),
				]),
		};
		return instance;
	},
	titleTrailerStamped: () => {
		const instance = {
			...TEMPLATES.title(),
			...TEMPLATES.trailerStamped(),
			/**
			 * @param {string} labelBody -
			 * @param {string} labelTitle -
			 * @param {string} labelTrailer -
			 * @param {Map<string, number>} prefixes -
			 */
			render: (labelBody, labelTitle, labelTrailer, prefixes) =>
				instance.table([
					instance.rowTitle(labelTitle, prefixes.size + 1),
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

		const prefixes = prefixString.split(LABEL_PREFIX_GROUP);
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
						character.codePointAt(0)?.toString(16).toUpperCase(),
					)
					.map((hex) =>
						hex !== undefined
							? `\\u${hex.length < 5 ? `${hex}` : `{${hex}}`}`
							: hex,
					)
					.join("")})\n`,
			);
		}
		if (usages.size === 0) {
			return substring;
		}

		const labelBlocks = label.split('<BR ALIGN="CENTER"/><BR ALIGN="CENTER"/>');
		const labelHasTitle = labelBlocks[0].includes(LABEL_TITLE_SEPARATOR);
		const labelTitle = labelHasTitle
			? labelBlocks[0].split(LABEL_TITLE_SEPARATOR)[0]
			: undefined;
		const labelBody = labelHasTitle
			? labelBlocks[0]
					.split(LABEL_TITLE_SEPARATOR)[1]
					.replace(/^<BR ALIGN="CENTER"\/>/, "")
			: labelBlocks[0];
		const labelTrailer = labelBlocks.length === 2 ? labelBlocks[1] : undefined;
		const labelDateSuffix = label.match(
			/ \((?:\d\d\.)?(?:\d\d\.)?(?:\d\d\d\d)\)$/,
		);

		if (
			labelTitle !== undefined &&
			labelBody !== undefined &&
			labelTrailer !== undefined
		) {
			const template =
				labelDateSuffix !== null
					? TEMPLATES.titleTrailerStamped()
					: TEMPLATES.titleTrailer();
			return `<${template.render(labelBody, labelTitle, labelTrailer, usages)}>`;
		}
		if (labelTitle !== undefined && labelBody !== undefined) {
			const template =
				labelDateSuffix !== null ? TEMPLATES.titleStamped() : TEMPLATES.title();
			return `<${template.render(labelBody, labelTitle, usages)}>`;
		}
		if (labelTrailer !== undefined) {
			const template =
				labelDateSuffix !== null
					? TEMPLATES.trailerStamped()
					: TEMPLATES.trailer();
			return `<${template.render(labelBody, labelTrailer, usages)}>`;
		}
		if (labelBody !== undefined) {
			const template =
				labelDateSuffix !== null ? TEMPLATES.stamped() : TEMPLATES.standard();
			return `<${template.render(labelBody, usages)}>`;
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
