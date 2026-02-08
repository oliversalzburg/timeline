import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { hashCyrb53 } from "@oliversalzburg/js-utils/data/string.js";
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
	weights: Array<Array<number>>,
	_origin: TTimeline,
) {
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
				`CSS Class: ${`t${hashCyrb53(timeline.meta.id)}`}`,
				`Identity Hops: ${hops.get(timeline.meta.identity?.id ?? "") ?? "undefined (treated as +Infinity)"}`,
				`Base Weight: ${baseline[timelineIndex] ?? "<ERROR WEIGHT NOT FOUND>"}`,
				`End Weight: ${weights[weights.length - 1][timelineIndex] ?? "<ERROR WEIGHT NOT FOUND>"}`,
			].join("\n"),
		);
	}
	for (const timeline of timelinesTrimmed) {
		buffer.push(
			[
				"---",
				`Timeline ID: ${timeline.meta.id}`,
				`Timeline Identity ID: ${timeline.meta.identity?.id ?? "<has no identity>"}`,
				`CSS Class: ${`t${hashCyrb53(timeline.meta.id)}`}`,
				`Identity Hops: ${hops.get(timeline.meta.identity?.id ?? "") ?? "undefined (treated as +Infinity)"} <was trimmed from graph>`,
			].join("\n"),
		);
	}
	for (const timeline of timelinesAdditional) {
		buffer.push(
			[
				"---",
				`Timeline ID: ${timeline.meta.id}`,
				`Timeline Identity ID: ${timeline.meta.identity?.id ?? "<has no identity>"}`,
				`CSS Class: ${`t${hashCyrb53(timeline.meta.id)}`}`,
				`Identity Hops: ${hops.get(timeline.meta.identity?.id ?? "") ?? "undefined (treated as +Infinity)"}`,
				`Base Weight: <weightless>`,
			].join("\n"),
		);
	}
	return buffer.join("\n");
}
