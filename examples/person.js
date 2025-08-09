#!/bin/env node

import { readFileSync } from "node:fs";
import { isNil } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { MILLISECONDS } from "../lib/constants.js";
import { uncertainEventToDate } from "../lib/genealogy.js";
import { recurringYearly } from "../lib/generator.js";
import { load } from "../lib/loader.js";
import { serialize } from "../lib/serializer.js";

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

const rawData = readFileSync(args.target, "utf8");
const data = parse(rawData);
/** @type {import("../source/types.js").TimelineAncestryRenderer} */
const timeline = load(data, args.target);

if ("identity" in timeline.meta === false) {
	process.stderr.write(`Warning: No identity in '${args.target}'.\n`);
	process.stdout.write(rawData);
	process.exit(0);
}

const name = timeline.meta.identity.name ?? timeline.meta.identity.id;
if (timeline.meta.identity.born === undefined) {
	process.stderr.write(
		`Warning: No birth in identity in '${args.target}'. Might not be treated as a person.\n`,
	);
	process.stdout.write(rawData);
	process.exit(0);
}

let birth;
if (timeline.meta.identity.born === null) {
	if (timeline.records.length === 0) {
		process.stderr.write(
			`Warning: No birth record in identity with empty timeline '${args.target}'.\n`,
		);
		process.stdout.write(rawData);
		process.exit(0);
	}

	process.stderr.write(
		`Warning: No birth record in timeline '${args.target}'. Using date of first entry.\n`,
	);
	birth = new Date(timeline.records[0][0]);
} else {
	birth = uncertainEventToDate(timeline.meta.identity.born);
}

if (isNil(birth)) {
	process.stderr.write(
		`Warning: Unspecific birth in identity in '${args.target}'.\n`,
	);
	process.stdout.write(rawData);
	process.exit(0);
}

let death;
if (timeline.meta.identity.died === null) {
	process.stderr.write(
		`Warning: No death record in dead identity '${args.target}'. Assuming aged 85.\n`,
	);
	death = new Date(birth.valueOf() + MILLISECONDS.ONE_YEAR * 85);
} else {
	death = uncertainEventToDate(timeline.meta.identity.died);
}

const birthYear = birth.getFullYear();
const birthMonth = birth.getMonth() + 1;
const birthDay = birth.getDate();
const age = Math.floor(
	death === undefined
		? 85
		: (death.valueOf() - birth.valueOf()) / MILLISECONDS.ONE_YEAR,
);

/** @type {import("../lib/types.js").TimelinePlain} */
const records = {
	...timeline,
	records: [
		...timeline.records,
		[
			Math.trunc(birth.valueOf() - 9 * MILLISECONDS.ONE_MONTH),
			{ title: `Estimated Conception\n${name}` },
		],
		[birth.valueOf(), { title: `👶 Geburt ${name}` }],
		...recurringYearly(
			new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0),
			(index) => `${index}. Geburtstag ${name}`,
			age,
		),
	],
};

const serialized = serialize(records);
process.stdout.write(`---\n${serialized}\n`);
