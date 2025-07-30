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

let offsetX = 0;
let offsetY = 0;
const buffer = [];
const boundingBox = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
};

const MARKER_Y = "-22.67";
for (const segment of segments) {
	const rawSVG = readFileSync(segment, "utf8");
	const svgStart = rawSVG.indexOf("<svg");
	const svgEnd = rawSVG.lastIndexOf("</svg>");
	const svgStartContent = rawSVG.indexOf(">", svgStart) + 1;

	const svgMeta = meta.get(segment);
	const entryMarker = svgMeta.marker
		.filter((_) => _.y !== MARKER_Y)
		.map((_) => Number(_.x))
		.sort((a, b) => a - b);
	const exitMarker = svgMeta.marker
		.filter((_) => _.y === MARKER_Y)
		.map((_) => Number(_.x))
		.sort((a, b) => a - b);

	const leftMostEntry = 0 < entryMarker.length ? entryMarker[1] : 0;
	offsetX -= leftMostEntry;

	let svg = rawSVG.substring(svgStartContent, svgEnd);
	const svgHeightAdjusted = svgMeta.height + Number(MARKER_Y) - 3;
	const translation = `${Math.round(offsetX * 100) / 100} ${Math.round((offsetY + svgHeightAdjusted) * 100) / 100}`;

	boundingBox.right = Math.max(boundingBox.right, offsetX + svgMeta.width);
	boundingBox.left = Math.min(boundingBox.left, offsetX);
	boundingBox.bottom = Math.max(
		boundingBox.bottom,
		offsetY + svgHeightAdjusted,
	);

	process.stderr.write(`${segment}: ${translation}\n`);

	svg = svg.replace(/translate\(0 [^)]+\)/, `translate(${translation})`);

	const leftMostExit = 0 < exitMarker.length ? exitMarker[1] : 0;
	offsetX += leftMostExit;
	offsetY += svgHeightAdjusted;

	buffer.push(svg);
}
buffer.unshift(
	[
		`<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
		`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`,
		`<svg width="${boundingBox.right - boundingBox.left}pt" height="${boundingBox.bottom}pt" viewBox="0.00 0.00 ${boundingBox.right - boundingBox.left} ${boundingBox.bottom}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
	].join("\n"),
);
buffer.push("</svg>");
const output = createWriteStream(args.target, "utf8");
output.write(buffer.join("\n"));
output.close();
