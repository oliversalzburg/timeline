#!/usr/bin/env node

import { createWriteStream, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

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

const segments = process.argv
	.slice(2)
	.filter((_) => !_.startsWith("--"))
	.sort();

let maxWidth = 0;
let height = 0;
const meta = new Map();
for (const segment of segments) {
	try {
		const rawSVG = readFileSync(segment, "utf8");
		const svgStart = rawSVG.indexOf("<svg");
		const svgStartContent = rawSVG.indexOf(">", svgStart) + 1;
		const svgHeader = rawSVG.substring(svgStart, svgStartContent);

		const dimensions = svgHeader.match(
			/width="(?<width>\d+)pt" height="(?<height>\d+)pt"/,
		);
		const heightSegment = Number(dimensions.groups.height);
		const widthSegment = Number(dimensions.groups.width);

		const txMarker = rawSVG.matchAll(
			/class="node tx.+?text-anchor="middle" x="(?<x>[^"]+)" y="(?<y>[^"]+)+"/gs,
		);

		meta.set(segment, {
			width: widthSegment,
			height: heightSegment,
			marker: [...txMarker].map((_) => _.groups),
		});

		maxWidth = Math.max(maxWidth, Number(dimensions.groups.width));
		height += Number(dimensions.groups.height);
	} catch (error) {
		console.error(segment);
		throw error;
	}
}

const output = createWriteStream(args.target, "utf8");
output.write(
	[
		`<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
		`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`,
		`<svg width="${maxWidth}pt" height="${height}pt" viewBox="0.00 0.00 ${maxWidth}.00 ${height}.00" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
	].join("\n"),
);
let offset = 0;
for (const segment of segments) {
	const rawSVG = readFileSync(segment, "utf8");
	const svgStart = rawSVG.indexOf("<svg");
	const svgEnd = rawSVG.lastIndexOf("</svg>");
	const svgStartContent = rawSVG.indexOf(">", svgStart) + 1;
	const svgHeader = rawSVG.substring(svgStart, svgStartContent);
	const dimensions = svgHeader.match(
		/width="(?<width>\d+)pt" height="(?<height>\d+)pt"/,
	);
	const heightSegment = Number(dimensions.groups.height);
	const widthSegment = Number(dimensions.groups.width);
	const center = maxWidth / 2;
	const margin = center - widthSegment / 2;
	let svg = rawSVG.substring(svgStartContent, svgEnd);
	svg = svg.replace(
		/translate\(0 [^)]+\)/,
		`translate(${margin} ${offset + heightSegment})`,
	);
	offset += heightSegment;
	output.write(svg);
}
output.write("</svg>");
output.close();
