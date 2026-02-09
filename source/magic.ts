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
import { buildFrames, type Frame } from "./renderer.js";
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

	const timelinesRetained = timelines.filter((_) => {
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
	const timelinesTrimmed = timelines.filter(
		(_) => !timelinesRetained.includes(_),
	);
	const timelinesRetainedPersons = timelinesRetained.filter((timeline) =>
		isIdentityPerson(timeline),
	) as Array<TimelineAncestryRenderer>;
	const timelinesRetainedSolid = timelinesRetained.filter(
		(_) => isIdentityLocation(_) || isIdentityPeriod(_) || isIdentityPerson(_),
	);
	const timelinesRetainedNonSolid = timelinesRetained.filter(
		(_) =>
			!isIdentityLocation(_) && !isIdentityPeriod(_) && !isIdentityPerson(_),
	);
	const graphTrimmed = new IdentityGraph(timelinesRetained, originIdentityId);
	return {
		graph: graphTrimmed,
		hops,
		timelinesTrimmed,
		timelinesRetained: timelinesRetained,
		solidsRetained: timelinesRetainedSolid,
		nonSolidsRetained: timelinesRetainedNonSolid,
		persons: timelinesPersons,
		personsCount: timelinesPersons.length,
		personsRetained: timelinesRetainedPersons,
		personsRetainedCount: timelinesRetainedPersons.length,
	};
}

export function hopsToWeights<
	TTimeline extends Timeline & { meta: { identity?: Identity } },
>(timelines: Array<TTimeline>, hops: Map<string, number>) {
	let rangeMax = Number.NEGATIVE_INFINITY;
	for (const timeline of timelines) {
		const distance =
			hops.get(timeline.meta.identity?.id ?? "") ?? Number.POSITIVE_INFINITY;
		if (Number.isFinite(distance) && rangeMax < distance) {
			rangeMax = distance;
		}
	}
	const weights = new Array<number>();
	for (const timeline of timelines) {
		const distance =
			hops.get(timeline.meta.identity?.id ?? "") ?? Number.NEGATIVE_INFINITY;
		weights.push(Number.isFinite(distance) ? rangeMax - distance + 1 : 1);
	}
	return weights;
}

export type WeightedFrame<
	TTimeline extends Timeline & { meta: { identity?: Identity } },
> = {
	content: Frame<TTimeline>;
	timestamp: number;
	weights: Map<TTimeline, number>;
};
export type WeightedFramesGenerator<
	TTimeline extends Timeline & { meta: { identity?: Identity } },
> = Generator<WeightedFrame<TTimeline>>;
export function* weightedFrames<
	TTimeline extends Timeline & { meta: { identity?: Identity } },
>(
	timelines: Array<TTimeline>,
	baseline: Array<number>,
	origin: TTimeline,
): WeightedFramesGenerator<TTimeline> {
	const frames = buildFrames(timelines);
	const renderPlan = [...frames.entries()].sort(([a], [b]) => a - b);
	let weightCache: Map<TTimeline, number> | undefined;
	for (let planIndex = 0; planIndex < renderPlan.length; ++planIndex) {
		const [timestamp, frame] = renderPlan[planIndex];
		const frameWeights = new Map<TTimeline, number>();
		for (
			let timelineIndex = 0;
			timelineIndex < timelines.length;
			++timelineIndex
		) {
			const timeline = timelines[timelineIndex];
			frameWeights.set(
				timeline,
				(weightCache !== undefined ? mustExist(weightCache.get(timeline)) : 0) +
					(frame.events
						.entries()
						.find(
							([_title, contributors]) =>
								contributors.has(timeline) && contributors.has(origin),
						)?.length ?? 0) *
						baseline[timelineIndex],
			);
		}
		yield { content: frame, timestamp, weights: frameWeights };
		weightCache = frameWeights;
	}
}
