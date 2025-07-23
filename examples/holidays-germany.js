#!/bin/env node

import { MILLISECONDS, TRANSPARENT } from "../lib/constants.js";
import { serialize } from "../lib/serializer.js";

const cliArguments = process.argv.slice(2);
const startYear = Number(cliArguments[0] ?? "1933");
const ageOrLastYear = Number(cliArguments[1] ?? "2026");

const HOLIDAYS = [
	{
		from: new Date(1934, 0, 1),
		to: new Date(1945, 4, 8),
		name: "Neujahr",
		date: [1, 1],
	},
	{
		from: new Date(1934, 0, 1),
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
			let day = 16;
			let _ = new Date(year, 2, day);
			while (_.getDay() !== 0) {
				_ = new Date(year, 2, --day);
			}
			return [3, day];
		},
	},
	{
		from: new Date(1934, 0, 1),
		to: new Date(1945, 4, 8),
		name: "Karfreitag",
		date: (/** @type {number} */ year) => {
			const _ = spencer(year);
			return [_[0], _[1] - 2];
		},
	},
	{
		from: new Date(1934, 0, 1),
		to: new Date(1945, 4, 8),
		name: "Ostermontag",
		date: (/** @type {number} */ year) => {
			const _ = spencer(year);
			return [_[0], _[1] + 1];
		},
	},
	{
		from: new Date(1939, 0),
		to: new Date(1940, 0),
		name: "Führergeburtstag",
		date: [4, 20],
	},

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
			const _ = spencer(year);
			return [_[0], _[1] + 1];
		},
	},
	{
		from: new Date(1995, 0),
		name: "Christi Himmelfahrt",
		date: (/** @type {number} */ year) => {
			const _ = spencer(year);
			return [_[0], _[1] + 39];
		},
	},
	{
		from: new Date(1995, 0),
		name: "Pfingstsonntag",
		date: (/** @type {number} */ year) => {
			const _ = spencer(year);
			return [_[0], _[1] + 49];
		},
	},
	{
		from: new Date(1995, 0),
		name: "Pfingstmontag",
		date: (/** @type {number} */ year) => {
			const _ = spencer(year);
			return [_[0], _[1] + 50];
		},
	},
];

/**
 * @param {number} year -
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
 */
const holidays = (year) => {
	const start = new Date(year, 0);
	const end = new Date(year + 1, 0);
	const result = [];
	for (const _ of HOLIDAYS) {
		if (_.from < start && (_.to === undefined || end < _.to)) {
			const indices = typeof _.date === "function" ? _.date(year) : _.date;
			result.push([new Date(year, indices[0] - 1, indices[1]), _.name]);
		}
	}
	return result;
};

const yearCount =
	ageOrLastYear < 150 ? ageOrLastYear : ageOrLastYear - startYear;
const endYear = startYear + yearCount;

process.stderr.write(`German Holidays from ${startYear} until ${endYear}:\n`);

/** @type {import("../lib/types.js").TimelinePlain} */
const timeline = {
	meta: {
		color: TRANSPARENT,
		private: false,
	},
	records: new Array(yearCount)
		.fill(0, 0, yearCount)
		.flatMap((_, index) =>
			holidays(startYear + index).map((_) => [
				_[0],
				{ title: `${_[1]} ${startYear + index}` },
			]),
		),
};

const serialized = serialize(timeline);
process.stdout.write(`${serialized}\n`);
