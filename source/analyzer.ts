import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { hashCyrb53 } from "@oliversalzburg/js-utils/data/string.js";
import {
	type IdentityGraph,
	isIdentityLocation,
	isIdentityMedia,
	isIdentityPeriod,
	isIdentityPerson,
	isIdentityPlain,
} from "./genealogy.js";
import type {
	Identity,
	Timeline,
	TimelineMetrics,
	TimelineRecord,
} from "./types.js";

export const analyze = (timeline: Array<TimelineRecord>): TimelineMetrics => {
	let earliest: number | undefined;
	let latest: number | undefined;
	let shortest: number | undefined;
	let longest: number | undefined;
	let previous: number | undefined;
	for (const [timestamp, _] of timeline) {
		if (earliest === undefined) {
			earliest = timestamp;
		}
		latest = timestamp;

		const toPrevious =
			previous !== undefined ? timestamp - previous : undefined;
		if (toPrevious !== undefined) {
			if (shortest === undefined || toPrevious < shortest) {
				shortest = toPrevious;
			}
			if (longest === undefined || longest < toPrevious) {
				longest = toPrevious;
			}
		}

		previous = timestamp;
	}

	return {
		durationTotal:
			latest !== undefined && earliest !== undefined
				? mustExist(latest) - mustExist(earliest)
				: 0,
		periodLongest: longest ?? 0,
		periodShortest: shortest ?? 0,
		timeEarliest: earliest ?? Number.POSITIVE_INFINITY,
		timeLatest: latest ?? Number.NEGATIVE_INFINITY,
	};
};

export function report<
	TTimeline extends Timeline & { meta: { identity?: Identity } },
>(
	timelines: Array<TTimeline>,
	timelinesAdditional: Array<TTimeline>,
	timelinesTrimmed: Array<TTimeline>,
	hops: Map<string, number>,
	baseline: Array<number>,
	endWeights: Map<TTimeline, number>,
	probes: Array<[number, Map<TTimeline, number> | undefined]>,
	graph: IdentityGraph<TTimeline>,
) {
	const identifyIdentity = (identity: Identity | undefined) => {
		switch (true) {
			case isIdentityLocation(identity):
				return "Location";
			case isIdentityMedia(identity):
				return "Media";
			case isIdentityPeriod(identity):
				return "Period";
			case isIdentityPerson(identity):
				return "Person";
			case isIdentityPlain(identity):
				return "Plain";
			default:
				return "Not an identity";
		}
	};
	const buffer = new Array<string>();
	for (
		let timelineIndex = 0;
		timelineIndex < timelines.length;
		++timelineIndex
	) {
		const timeline = timelines[timelineIndex];
		buffer.push(
			[
				"---",
				`Timeline ID: ${timeline.meta.id}`,
				`Timeline Identity ID: ${timeline.meta.identity?.id ?? "<has no identity>"}`,
				`Timeline Identity Type: ${identifyIdentity(timeline.meta.identity)}`,
				`CSS Class: ${`t${hashCyrb53(timeline.meta.id)}`}`,
				`Identity Hops: ${hops.get(timeline.meta.identity?.id ?? "") ?? "undefined (treated as +Infinity), retained"}`,
				`Base Weight: ${baseline[timelineIndex] ?? "<ERROR WEIGHT NOT FOUND>"}`,
				`End Weight: ${endWeights.get(timeline) ?? "<ERROR WEIGHT NOT FOUND>"}`,
				...probes.map(
					([timestamp, _]) => `Probe Weight[${timestamp}]: ${_?.get(timeline)}`,
				),
				"Locations:",
				timeline.meta.identity === undefined
					? "none, requires identity"
					: graph
							.locations(timeline.meta.identity?.id)
							?.map((_) => `- ${_.id}`)
							.join("\n"),
				"Periods:",
				timeline.meta.identity === undefined
					? "none, requires identity"
					: graph
							.periods(timeline.meta.identity?.id)
							?.map((_) => `- ${_.id}`)
							.join("\n"),
			].join("\n"),
		);
	}
	for (const timeline of timelinesTrimmed) {
		buffer.push(
			[
				"---",
				`Timeline ID: ${timeline.meta.id}`,
				`Timeline Identity ID: ${timeline.meta.identity?.id ?? "<has no identity>"}`,
				`Timeline Identity Type: ${identifyIdentity(timeline.meta.identity)}`,
				`CSS Class: ${`t${hashCyrb53(timeline.meta.id)}`}`,
				`Identity Hops: ${hops.get(timeline.meta.identity?.id ?? "") ?? "undefined (treated as +Infinity)"}`,
				"Base Weight: none, was trimmed from graph",
				"End Weight: none, was trimmed from graph",
				...probes.map(
					([timestamp, _]) =>
						`Probe Weight[${timestamp}]: none, was trimmed from graph`,
				),
				"Locations:",
				timeline.meta.identity === undefined ||
				isIdentityMedia(timeline.meta.identity)
					? "none, requires non-media identity"
					: graph
							.locations(timeline.meta.identity?.id)
							?.map((_) => `- ${_.id}`)
							.join("\n"),
				"Periods:",
				timeline.meta.identity === undefined ||
				isIdentityMedia(timeline.meta.identity)
					? "none, requires non-media identity"
					: graph
							.periods(timeline.meta.identity?.id)
							?.map((_) => `- ${_.id}`)
							.join("\n"),
			].join("\n"),
		);
	}
	for (const timeline of timelinesAdditional) {
		buffer.push(
			[
				"---",
				`Timeline ID: ${timeline.meta.id}`,
				`Timeline Identity ID: ${timeline.meta.identity?.id ?? "<has no identity>"}`,
				`Timeline Identity Type: ${identifyIdentity(timeline.meta.identity)}`,
				`CSS Class: ${`t${hashCyrb53(timeline.meta.id)}`}`,
				`Identity Hops: ${hops.get(timeline.meta.identity?.id ?? "") ?? "undefined (treated as +Infinity), retained"}`,
				"Base Weight: <weightless>",
				"End Weight: <weightless>",
				...probes.map(
					([timestamp, _]) => `Probe Weight[${timestamp}]: ${_?.get(timeline)}`,
				),
				"Locations:",
				timeline.meta.identity === undefined ||
				isIdentityMedia(timeline.meta.identity)
					? "none, requires non-media identity"
					: graph
							.locations(timeline.meta.identity?.id)
							?.map((_) => `- ${_.id}`)
							.join("\n"),
				"Periods:",
				timeline.meta.identity === undefined ||
				isIdentityMedia(timeline.meta.identity)
					? "none, requires non-media identity"
					: graph
							.periods(timeline.meta.identity?.id)
							?.map((_) => `- ${_.id}`)
							.join("\n"),
			].join("\n"),
		);
	}
	return buffer.join("\n");
}
