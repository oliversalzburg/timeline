#!/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { hostname, userInfo } from "node:os";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { analyze } from "../lib/analyzer.js";
import {
	Graph,
	isIdentityLocation,
	isIdentityMedia,
	isIdentityPerson,
	uncertainEventToDate,
} from "../lib/genealogy.js";
import { load } from "../lib/loader.js";
import { sort, uniquify } from "../lib/operator.js";
import { render } from "../lib/renderer.js";
import { Styling } from "../lib/style.js";

/** @import {RendererOptions} from "../lib/renderer.js" */
/** @import {RenderResultMetadata, TimelineAncestryRenderer, TimelineReferenceRenderer } from "../lib/types.js" */

const NOW = Date.now();

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

if (typeof args.origin !== "string") {
	process.stderr.write("Missing --origin.\n");
	process.exit(1);
}

const rawData = readFileSync(args.origin, "utf-8").split("\n---\n");
const originTimelineId = parse(rawData[0]).id;
if (typeof originTimelineId !== "string") {
	process.stdout.write(
		`Unable to parse id of origin document '${args.origin}'.\n`,
	);
	process.exit(1);
}

const targetPath = typeof args.target === "string" ? args.target : undefined;
if (targetPath === undefined) {
	process.stdout.write("No --target filename provided.\n");
	process.exit(1);
}
if (args.segment === undefined && !targetPath.endsWith(".gv")) {
	process.stdout.write(
		`Invalid output document. File name is expected to end in '.gv'.\nProvided: ${targetPath}\n`,
	);
	process.exit(1);
}
if (args.segment === true && !targetPath.endsWith(".gvus")) {
	process.stdout.write(
		`Invalid output document. File name is expected to end in '.gvus'.\nProvided: ${targetPath}\n`,
	);
	process.exit(1);
}

// Load timeline data.
/** @type {Map<string, TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const data = new Map(
	rawData.map((data) => {
		const timeline = parse(data);
		return [timeline.id, load(timeline, timeline.id)];
	}),
);

/** @type {Array<TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const finalTimelines = [
	// uniquify ensures unique entries PER DOCUMENT!
	// In the merged universe, there might still be duplicate labels.
	...data.entries().map(([_, timeline]) => uniquify(sort(timeline))),
];

const timelinesPersons = /** @type {Array<TimelineAncestryRenderer>} */ (
	finalTimelines.filter((timeline) => isIdentityPerson(timeline))
);
const originIdentityId = mustExist(
	timelinesPersons.find((_) => _.meta.id === originTimelineId),
	`Unable to determine identity from origin timeline '${originTimelineId}'.`,
).meta.identity.id;

const maxHops =
	typeof args["max-identity-distance"] === "string"
		? Number(args["max-identity-distance"])
		: Number.POSITIVE_INFINITY;
const minIdentityBorn =
	typeof args["min-identity-born"] === "string"
		? new Date(args["min-identity-born"]).valueOf()
		: undefined;
const graphUniverse = new Graph(timelinesPersons, originIdentityId);
const hops = graphUniverse.calculateHopsFrom(originIdentityId, {
	allowChildHop: true,
	allowMarriageHop: false,
	allowParentHop: true,
});
const trimmedTimelines = finalTimelines.filter((_) => {
	const born = isIdentityPerson(_)
		? uncertainEventToDate(
				/** @type {import("../source/types.js").TimelineAncestryRenderer} */ (_)
					.meta.identity.born,
			)?.valueOf()
		: undefined;
	const distance = isIdentityPerson(_)
		? (hops.get(
				/** @type {import("../source/types.js").TimelineAncestryRenderer} */ (_)
					.meta.identity.id,
			) ?? Number.POSITIVE_INFINITY)
		: Number.POSITIVE_INFINITY;

	return (
		(!isIdentityPerson(_) && !isIdentityLocation(_)) ||
		(isIdentityPerson(_) &&
			Number.isFinite(distance) &&
			distance <= maxHops &&
			(minIdentityBorn !== undefined
				? minIdentityBorn <= mustExist(born)
				: true))
	);
});
const graphTrimmed = new Graph(trimmedTimelines, originIdentityId);

process.stdout.write(
	`Universe contains ${timelinesPersons.length} human identities, trimmed to ${trimmedTimelines.length} timelines.\n`,
);

// Generate stylesheet for entire universe.
/** @type {import("source/types.js").RenderMode} */
const theme = args.theme === "light" ? "light" : "dark";
const styleSheet = new Styling(trimmedTimelines, theme).styles(
	graphTrimmed,
	hops,
	maxHops,
);

// Generate GraphViz graph.
/** @type {RendererOptions} */
const renderOptions = {
	debug: Boolean(args.debug),
	dateRenderer: (/** @type {number} */ date) => {
		const _ = new Date(date);
		return `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][_.getDay()]}, ${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
	},
	now: NOW,
	origin: originIdentityId,
	rendererAnalytics: args.analytics === true ? "enabled" : "disabled",
	rendererAnonymization: args.anonymize === true ? "enabled" : "disabled",
	segment: typeof args.segment === "string" ? Number(args.segment) : undefined,
	skipBefore:
		typeof args["skip-before"] === "string"
			? new Date(args["skip-before"]).valueOf()
			: undefined,
	skipAfter:
		typeof args["skip-after"] === "string"
			? new Date(args["skip-after"]).valueOf()
			: undefined,
	styleSheet,
	theme,
};
const dotGraph = render(trimmedTimelines, renderOptions, hops);

// Calculate universe metrics.
const metrics = new Map(
	data
		.entries()
		.map(([filename, timeline]) => [filename, analyze(timeline.records)]),
);
const globalEarliest = metrics
	.values()
	.reduce(
		(previous, current) =>
			current.timeEarliest < previous ? current.timeEarliest : previous,
		Number.POSITIVE_INFINITY,
	);
const globalLatest = metrics
	.values()
	.reduce(
		(previous, current) =>
			previous < current.timeLatest ? current.timeLatest : previous,
		0,
	);
const finalEntryCount = trimmedTimelines.reduce(
	(previous, timeline) => previous + timeline.records.length,
	0,
);
const buildDate = new Date(NOW);
const offset = buildDate.getTimezoneOffset();
const dBuild = buildDate.toUTCString();
const dIso = buildDate.toISOString();
const dStart = new Date(globalEarliest).toUTCString();
const dEnd = new Date(globalLatest).toUTCString();
const dFrom =
	renderOptions.skipBefore !== undefined
		? new Date(renderOptions.skipBefore).toUTCString()
		: dStart;
const dTo =
	renderOptions.skipAfter !== undefined
		? new Date(renderOptions.skipAfter).toUTCString()
		: dEnd;
const info = [
	`Universe was generated on a device indicating a local point in time of:`,
	`${dBuild} offset ${offset} minutes from UTC`,
	`${dIso} universal coordinated time (${NOW})`,
	`Device self-identified as "${hostname()}" being operated by "${userInfo().username}".`,
	`Universe has ${finalEntryCount} individual entries from ${data.size} timeline documents.`,
	`Universe Horizon`,
	`${dStart} - ${dEnd}`,
	`Exported Document Window`,
	`${dFrom} - ${dTo}`,
];

process.stdout.write("Writing graph...");
if (dotGraph.graph.length === 1) {
	writeFileSync(targetPath, dotGraph.graph[0]);
} else {
	for (let graphIndex = 0; graphIndex < dotGraph.graph.length; ++graphIndex) {
		const graph = dotGraph.graph[graphIndex];
		const index = graphIndex
			.toFixed()
			.padStart(dotGraph.graph.length.toFixed().length, "0");
		const uniqueGraph = graph.replace(
			/digraph timeline \{/,
			`digraph segment_${index} { id="segment_${index}";`,
		);
		const segmentFilename = targetPath.replace(/\.gvus$/, `${index}.gvus`);
		process.stdout.write(".");
		writeFileSync(segmentFilename, uniqueGraph);
	}
}
process.stdout.write("\n");
const originBirthDate =
	uncertainEventToDate(graphTrimmed.resolveIdentity()?.born) ?? new Date();

writeFileSync(
	targetPath.replace(/\.gv(?:us)?$/, ".info"),
	`${info.join("\n")}\n`,
);
writeFileSync(
	targetPath.replace(/\.gv(?:us)?$/, ".meta"),
	`${JSON.stringify(
		/** @type {RenderResultMetadata} */ ([
			[
				...dotGraph.timelineIds
					.entries()
					.map(([timeline, ids]) => [
						dotGraph.timelineClasses.get(timeline),
						ids,
					]),
			],
			[
				...dotGraph.timelineIds
					.entries()
					.map(([timeline]) => [
						dotGraph.timelineClasses.get(timeline),
						[
							styleSheet.get(timeline.meta.id)?.pencolor,
							isIdentityPerson(timeline)
								? 1
								: isIdentityLocation(timeline)
									? 2
									: isIdentityMedia(timeline)
										? 3
										: 0,
							"identity" in timeline.meta
								? timeline.meta.identity.id
								: timeline.meta.id,
							"identity" in timeline.meta
								? (timeline.meta.identity.name ?? timeline.meta.identity.id)
								: timeline.meta.id,
						],
					]),
			],
			[
				graphTrimmed.resolveIdentity()?.name,
				`Z${originBirthDate.getFullYear().toFixed().padStart(4, "0")}-${(originBirthDate.getMonth() + 1).toFixed().padStart(2, "0")}-${originBirthDate.getDate().toFixed().padStart(2, "0")}-0`,
				dotGraph.timelineClasses.get(mustExist(graphTrimmed.timelineOf())),
			],
		]),
	)}\n`,
);
