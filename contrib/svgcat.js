#!/usr/bin/env node

import { createWriteStream, readFileSync } from "node:fs";

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

const boundingBox = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
};
// Magic constant pulled from SVG output: y="<this value for exit markers>"
const MARKER_Y = "-0.42";
let offsetX = 0;
let offsetY = 0;
/** @type {Map<string,{width:number;height:number;marker:Array<Record<string,string>>;x:number}>} */
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
		const heightSegment = Number(dimensions?.groups?.height);
		const widthSegment = Number(dimensions?.groups?.width);

		const txMarker = rawSVG.matchAll(
			/class="node tx.+?text-anchor="middle" x="(?<x>[^"]+)" y="(?<y>[^"]+)+"/gs,
		);

		const _m = {
			width: widthSegment,
			height: heightSegment,
			marker: [...txMarker].map((_) => _.groups ?? {}),
			x: 0,
		};
		meta.set(segment, _m);

		const entryMarker = _m.marker
			.filter((_) => _.y !== MARKER_Y)
			.map((_) => Number(_.x))
			.sort((a, b) => a - b);
		const exitMarker = _m.marker
			.filter((_) => _.y === MARKER_Y)
			.map((_) => Number(_.x))
			.sort((a, b) => a - b);

		const leftMostEntry = 0 < entryMarker.length ? entryMarker[0] : 0;
		offsetX -= leftMostEntry;
		process.stderr.write(`${segment}: ${leftMostEntry} -> ${offsetX}\n`);

		_m.x = offsetX;

		boundingBox.right = Math.max(boundingBox.right, offsetX + widthSegment);
		boundingBox.left = Math.min(boundingBox.left, offsetX);
		boundingBox.bottom = Math.max(boundingBox.bottom, offsetY + _m.height);

		const leftMostExit = 0 < exitMarker.length ? exitMarker[0] : 0;
		offsetX += leftMostExit;
		offsetY += _m.height;
	} catch (error) {
		console.error(segment);
		throw error;
	}
}

const leftMostSegment = segments.reduce(
	(lowest, _) =>
		(meta.get(_)?.x ?? 0) < lowest ? (meta.get(_)?.x ?? 0) : lowest,
	0,
);
for (const segment of segments) {
	const segmentMeta = meta.get(segment);
	if (segmentMeta === undefined) {
		throw new Error("fuck ts");
	}
	segmentMeta.x -= leftMostSegment;
}

const buffer = [];
offsetY = 0;

for (const segment of segments) {
	const rawSVG = readFileSync(segment, "utf8");
	const svgStart = rawSVG.indexOf("<svg");
	const svgEnd = rawSVG.lastIndexOf("</svg>");
	const svgStartContent = rawSVG.indexOf(">", svgStart) + 1;

	const svgMeta = meta.get(segment);
	if (svgMeta === undefined) {
		throw new Error("Unexpected miss on segment metadata.");
	}

	offsetY += svgMeta.height;
	offsetY -= 3;
	const translation = `${Math.round(svgMeta.x * 100) / 100} ${Math.round(offsetY * 100) / 100}`;
	process.stderr.write(`${segment}: ${svgMeta.width} -> ${translation}\n`);

	let svg = rawSVG.substring(svgStartContent, svgEnd);
	svg = svg.replace(/translate\(0 [^)]+\)/, `translate(${translation})`);

	// Clean SVG
	svg = svg
		.replace(/<!--.*?-->/gms, "")
		.replace(/<title>.*?<\/title>/gm, "")
		.replace(/<g id="graph\d+"/gm, "<g")
		.replace(/<g id="edge\d+"/gm, "<g")
		.replace(/<g id="node\d+"/gm, "<g")
		.replace(/\n+/g, "\n");

	buffer.push(svg.trim());
}
const width =
	Math.round(Math.abs(boundingBox.left - boundingBox.right) * 10) / 10;
const height = Math.round(boundingBox.bottom * 10) / 10;
buffer.unshift(
	[
		`<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
		`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`,
		`<svg width="${width}pt" height="${height}pt" viewBox="0.00 0.00 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
	].join("\n"),
);
buffer.push("</svg>");
const output = createWriteStream(args.target, "utf8");
output.write(buffer.join("\n"));
output.close();
