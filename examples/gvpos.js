#!/usr/bin/env node

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Random } from "@oliversalzburg/js-utils/data/random.js";

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

const random = new Random(0);
const content = readFileSync(args.target, "utf8");
const contentLocation = dirname(args.target);
const contentName = basename(args.target);

const start = new Date(1800, 0).valueOf();
const end = new Date(2030, 0).valueOf();
const distance = end - start;
/** @type {null|{nodeid:string;height:number;id:string;pos:string;ts:number;width:number;y:number}} */
let previous = null;
const positioned = content.replaceAll(
	/(?<nodeid>\d+).+?height=(?<height>[^,]+).+?id="(?<id>[^"]+)".+?pos="(?<pos>[^"]+)".+?ts=(?<ts>[^,]+).+?width=(?<width>[^\],\n]+)/gs,
	/**
	 * @param {string} substring -
	 * @param {string} nodeid -
	 * @param {string} height -
	 * @param {string} id -
	 * @param {string} pos -
	 * @param {string} ts -
	 * @param {string} width -
	 */
	(substring, nodeid, height, id, pos, ts, width) => {
		const timestamp = Number(ts);
		const previousHeight = Number(previous?.height ?? 0);
		const currentHeight = Number(height);
		const y =
			(previous?.y ?? 0) + 100 * (previousHeight / 2 + currentHeight / 2) + 50; ///2000000 - ((date - start) / distance) * 2000000;
		previous = {
			nodeid,
			height: Number(height),
			id,
			pos,
			ts: Number(ts),
			width: Number(width),
			y,
		};
		return substring.replace(
			/pos="([^"]+)"/,
			`pos="${9.5 + ((random.simplex2(0, y) + 1) / 2) * 300},${y}"`,
		);
	},
);
process.stdout.write(`${positioned}\n`);
