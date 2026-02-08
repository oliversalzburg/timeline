import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import {
	IdentityGraph,
	isIdentityLocation,
	isIdentityMedia,
	isIdentityPeriod,
	isIdentityPerson,
	isIdentityPlain,
	isNotIdentityTimeline,
	uncertainEventToDateDeterministic,
} from "./index.js";
import { buildFrames } from "./renderer.js";
import type { Identity, Timeline, TimelineAncestryRenderer } from "./types.js";

export function trimUniverse<
	TTimeline extends Timeline & { meta: { identity?: Identity } },
>(
	timelines: Array<TTimeline>,
	origin: TTimeline,
	maxHops = Number.POSITIVE_INFINITY,
	minIdentityBorn = Number.NEGATIVE_INFINITY,
) {
	const timelinesPersons = timelines.filter((timeline) =>
		isIdentityPerson(timeline),
	) as Array<TimelineAncestryRenderer>;
	const originIdentityId = mustExist(
		origin.meta.identity?.id,
		`Unable to determine identity from origin timeline.`,
	);

	const graphUniverse = new IdentityGraph(timelinesPersons, originIdentityId);
	const originIsLocation = isIdentityLocation(
		graphUniverse.timelineOf(originIdentityId),
	);
	const hops = graphUniverse.calculateHopsFrom(originIdentityId, {
		allowChildHop: !originIsLocation,
		allowEventHop: originIsLocation,
		allowLinkHop: true,
		allowLocationHop: originIsLocation,
		allowMarriageHop: false,
		allowParentHop: !originIsLocation,
	});

	const trimmedTimelines = timelines.filter((_) => {
		const born = isIdentityPerson(_)
			? uncertainEventToDateDeterministic(
					(_ as TimelineAncestryRenderer).meta.identity.born,
				)?.valueOf()
			: undefined;
		const distance = isIdentityPerson(_)
			? (hops.get((_ as TimelineAncestryRenderer).meta.identity.id) ??
				Number.POSITIVE_INFINITY)
			: Number.POSITIVE_INFINITY;

		return (
			isNotIdentityTimeline(_) ||
			isIdentityPlain(_) ||
			isIdentityLocation(_) ||
			isIdentityPeriod(_) ||
			isIdentityMedia(_) ||
			(isIdentityPerson(_) &&
				Number.isFinite(distance) &&
				distance <= maxHops &&
				(minIdentityBorn !== undefined && born !== undefined
					? minIdentityBorn <= born
					: true))
		);
	});
	const timelinesPersonsRetained = trimmedTimelines.filter((timeline) =>
		isIdentityPerson(timeline),
	) as Array<TimelineAncestryRenderer>;
	const timelinesSolidRetained = trimmedTimelines.filter(
		(_) => isIdentityLocation(_) || isIdentityPeriod(_) || isIdentityPerson(_),
	);
	const graphTrimmed = new IdentityGraph(trimmedTimelines, originIdentityId);
	return {
		graph: graphTrimmed,
		hops,
		timelines: trimmedTimelines,
		solids: timelinesSolidRetained,
		personsCount: timelinesPersons.length,
		personsRetainedCount: timelinesPersonsRetained.length,
	};
}

export function calculateWeights<
	TTimeline extends Timeline & { meta: { identity?: Identity } },
>(timelines: Array<TTimeline>, origin: TTimeline) {
	const frames = buildFrames(timelines);
	const renderPlan = [...frames.entries()].sort(([a], [b]) => a - b);
	const weightCache = new Array<Array<number>>();
	for (const [_timestamp, frame] of renderPlan) {
		const weightFrame =
			0 < weightCache.length
				? [...weightCache[weightCache.length - 1]]
				: new Array<number>(timelines.length).fill(0, 0, timelines.length);
		for (const [_title, contributors] of frame.events) {
			if (!contributors.has(origin)) {
				continue;
			}
			for (
				let timelineIndex = 0;
				timelineIndex < timelines.length;
				++timelineIndex
			) {
				weightFrame[timelineIndex] += contributors.has(timelines[timelineIndex])
					? 1
					: 0;
			}
		}
		weightCache.push(weightFrame);
	}
	return weightCache;
}
