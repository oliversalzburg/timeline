#!/bin/env node

import { stringify } from "yaml";
import { MILLISECONDS, TRANSPARENT } from "../lib/constants.js";
import { serialize } from "../lib/serializer.js";

const cliArguments = process.argv.slice(2);
const startYear = Number(cliArguments[0] ?? "1933");
const ageOrLastYear = Number(cliArguments[1] ?? "2026");

/** @type {Array<{from:Date;to?:Date;name:string;date:[number,number]|((year:number)=>[number,number]);debug?:boolean|number}>} */
const HOLIDAYS = [
	// NS Deutschland
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Neujahr",
		date: [1, 1],
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1939, 0),
		name: "Heldengedenktag",
		date: (/** @type {number} */ year) => {
			const _ = spencer(year);
			const date = new Date(year, _[0] - 1, _[1]);
			const remi = new Date(date.valueOf() - MILLISECONDS.ONE_WEEK * 5);
			return [remi.getMonth() + 1, remi.getDate()];
		},
	},
	{
		from: new Date(1939, 0),
		to: new Date(1945, 4, 8),
		name: "Heldengedenktag",
		date: (/** @type {number} */ year) => {
			let _ = new Date(year, 2, 16);
			// Rewind to Sunday
			while (_.getDay() !== 0) {
				_ = new Date(_.valueOf() - MILLISECONDS.ONE_DAY);
			}
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Karfreitag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Rewind 2 days
			_ = new Date(_.valueOf() - MILLISECONDS.ONE_DAY * 2);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Ostermontag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 1 day
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1939, 0),
		to: new Date(1940, 0),
		name: "Führergeburtstag",
		date: [4, 20],
	},
	{
		from: new Date(1933, 0),
		to: new Date(1934, 1, 27),
		name: "Feiertag der nationalen Arbeit",
		date: [5, 1],
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Nationaler Feiertag des\ndeutschen Volkes",
		date: [5, 1],
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Christi Himmelfahrt",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 39 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 39);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Pfingstmontag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 50 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 50);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Fronleichnam",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 60 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 60);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Erntedanktag",
		date: (/** @type {number} */ year) => {
			let _ = new Date(year, 8, 29);
			// Forward to Sunday
			while (_.getDay() !== 0) {
				_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY);
			}
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Reformationstag",
		date: [10, 31],
	},
	{
		from: new Date(1939, 0),
		to: new Date(1945, 4, 8),
		name: "Gedenktag für die Gefallenen\nder Bewegung",
		date: [11, 9],
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "Bußtag",
		date: (/** @type {number} */ year) => {
			const a = advent(year);
			const b = new Date(year, a[0] - 1, a[1]);
			// Totensonntag
			let _ = new Date(b.valueOf() - MILLISECONDS.ONE_WEEK);
			// Rewind to Wednesday
			while (_.getDay() !== 3) {
				_ = new Date(_.valueOf() - MILLISECONDS.ONE_DAY);
			}
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "1. Weihnachtsfeiertag",
		date: [12, 25],
	},
	{
		from: new Date(1934, 1, 27),
		to: new Date(1945, 4, 8),
		name: "2. Weihnachtsfeiertag",
		date: [12, 26],
	},

	// DDR
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "Neujahr",
		date: [1, 1],
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "Karfreitag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Rewind 2 days
			_ = new Date(_.valueOf() - MILLISECONDS.ONE_DAY * 2);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "Ostersonntag",
		date: (/** @type {number} */ year) => spencer(year),
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1967, 0),
		name: "Ostermontag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 1 day
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1990, 0),
		to: new Date(1991, 0),
		name: "Ostermontag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 1 day
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "Internationaler Kampf- und Feiertag der Werk-\ntätigen für Frieden und Sozialismus",
		date: [5, 1],
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1967, 0),
		name: "Tag der Befreiung",
		date: [5, 8],
	},
	{
		from: new Date(1985, 0),
		to: new Date(1986, 0),
		name: "Tag der Befreiung",
		date: [5, 8],
	},
	{
		from: new Date(1975, 0),
		to: new Date(1976, 0),
		name: "Tag des Sieges",
		date: [5, 8],
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1967, 0),
		name: "Christi Himmelfahrt",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 39 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 39);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1990, 0),
		to: new Date(1991, 0),
		name: "Christi Himmelfahrt",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 39 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 39);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "Pfingstsonntag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 49 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 49);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "Pfingstmontag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 50 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 50);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "Tag der Republik",
		date: [10, 7],
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1966, 0),
		name: "Reformationstag",
		date: [10, 31],
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "Buß- und Bettag",
		date: (/** @type {number} */ year) => {
			let _ = new Date(year, 10, 23);
			// Rewind to Wednesday
			while (_.getDay() !== 3) {
				_ = new Date(_.valueOf() - MILLISECONDS.ONE_DAY);
			}
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "1. Weihnachtsfeiertag",
		date: [12, 25],
	},
	{
		from: new Date(1945, 6, 1),
		to: new Date(1990, 8, 12),
		name: "2. Weihnachtsfeiertag",
		date: [12, 26],
	},

	// Post-Wende
	{
		from: new Date(1995, 0),
		name: "Neujahr",
		date: [1, 1],
	},
	{
		from: new Date(1995, 0),
		name: "Tag der Arbeit",
		date: [5, 1],
	},
	{
		from: new Date(1995, 0),
		name: "Tag der Deutschen Einheit",
		date: [10, 3],
	},
	{
		from: new Date(1995, 0),
		name: "1. Weihnachtsfeiertag",
		date: [12, 25],
	},
	{
		from: new Date(1995, 0),
		name: "2. Weihnachtsfeiertag",
		date: [12, 26],
	},
	{
		from: new Date(1995, 0),
		name: "Ostersonntag",
		date: (/** @type {number} */ year) => spencer(year),
	},
	{
		from: new Date(1995, 0),
		name: "Ostermontag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 1 day
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1995, 0),
		name: "Christi Himmelfahrt",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 39 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 39);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1995, 0),
		name: "Pfingstsonntag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 49 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 49);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
	{
		from: new Date(1995, 0),
		name: "Pfingstmontag",
		date: (/** @type {number} */ year) => {
			const easter = spencer(year);
			let _ = new Date(year, easter[0] - 1, easter[1]);
			// Forward 50 days
			_ = new Date(_.valueOf() + MILLISECONDS.ONE_DAY * 50);
			return [_.getMonth() + 1, _.getDate()];
		},
	},
];

/**
 * @param {number} year -
 * @returns {[number, number]}
 */
const advent = (year) => {
	let a = new Date(year, 11, 25);
	while (a.getDay() !== 0) {
		a = new Date(a.valueOf() - MILLISECONDS.ONE_DAY);
	}
	const b = new Date(a.valueOf() - MILLISECONDS.ONE_WEEK * 3);
	return [b.getMonth() + 1, b.getDate()];
};

/**
 * @param {number} year -
 * @returns {[number, number]}
 */
const spencer = (year) => {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const n = Math.floor((h + l - 7 * m + 114) / 31);
	const o = (h + l - 7 * m + 114) % 31;
	return [n, o + 1];
};

/**
 * @param {number} year -
 * @returns {Array<[Date, string]>}
 */
const holidays = (year) => {
	const start = new Date(year, 0);
	const end = new Date(year + 1, 0);
	/** @type {Array<[Date, string]>} */
	const result = [];
	for (const _ of HOLIDAYS) {
		// biome-ignore lint/suspicious/noDebugger: Debugging is a lot of fun.
		if (_.debug === year) debugger;
		if (_.from <= start && (_.to === undefined || end <= _.to)) {
			const indices = typeof _.date === "function" ? _.date(year) : _.date;
			result.push(
				/** @type {[Date, string]} */ ([
					new Date(year, indices[0] - 1, indices[1]),
					_.name,
				]),
			);
		}
	}
	return result;
};

const yearCount =
	ageOrLastYear < 150 ? ageOrLastYear : ageOrLastYear - startYear;
const endYear = startYear + yearCount;

process.stderr.write(`German Holidays from ${startYear} until ${endYear}:\n`);

/** @type {import("../lib/types.js").TimelineReferenceRenderer} */
const timeline = {
	meta: {
		id: "",
		color: TRANSPARENT,
		private: false,
	},
	records: new Array(yearCount)
		.fill(0, 0, yearCount)
		.flatMap((_, index) =>
			holidays(startYear + index).map(
				(_) =>
					/** @type {[number, { title: string, generated: boolean }]} */ ([
						_[0].valueOf(),
						{ title: `${_[1]} ${startYear + index}`, generated: true },
					]),
			),
		),
};

const serialized = stringify(serialize(timeline, timeline.meta));
process.stdout.write(`${serialized}\n`);
