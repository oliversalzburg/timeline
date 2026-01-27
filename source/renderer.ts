import { isNil, type Maybe } from "@oliversalzburg/js-utils/data/nil.js";
import { MILLISECONDS, TRANSPARENT } from "./constants.js";
import type { Style } from "./style.js";
import type {
	RenderMode,
	TimelineAncestryRenderer,
	TimelineReferenceRenderer,
} from "./types.js";

export interface RendererOptions {
	dateRenderer?: (date: number) => string;
	styleSheet: Map<string, Style>;
	debug?: boolean;
	now: number;
	origin: string;
	segment?: number | undefined;
	skipAfter?: number | undefined;
	skipBefore?: number | undefined;
	theme: RenderMode;
	rendererAnalytics: "enabled" | "disabled";
	rendererAnonymization: "enabled" | "disabled";
}

export const renderMilliseconds = (ms: number): string => {
	const levels = [
		MILLISECONDS.ONE_YEAR,
		MILLISECONDS.ONE_DAY,
		MILLISECONDS.ONE_HOUR,
		MILLISECONDS.ONE_MINUTE,
	];
	const counts = [];
	for (const level of levels) {
		let count = 0;
		while (level <= ms) {
			ms -= level;
			++count;
		}
		counts[levels.indexOf(level)] = count;
	}
	return 0 < counts[0]
		? `${counts[0]} Jahr${counts[0] !== 1 ? "e" : ""} ${counts[1]} Tag${counts[1] !== 1 ? "e" : ""}`
		: `${counts[1]} Tag${counts[1] !== 1 ? "e" : ""}`;
};

/**
 * Determine the rank of a timeline.
 * NOT to be confused with ranks in a dot graph.
 */
export const rank = (
	timeline: Maybe<TimelineReferenceRenderer | TimelineAncestryRenderer>,
	distance?: number,
) => {
	let rank: number | undefined;
	if (
		distance !== undefined &&
		!isNil(timeline?.meta) &&
		timeline.meta.rank === undefined
	) {
		rank = 100 - distance;
	}
	return (
		rank ??
		(isNil(timeline)
			? -1
			: (timeline.meta.rank ?? (timeline.meta.color === TRANSPARENT ? -1 : 0)))
	);
};

export interface PlanEvent<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
> {
	generated: boolean;
	index?: number;
	timeline: TTimelines;
	timestamp: number;
	title: string;
}
export interface TransferMarker<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
> {
	omitted?: boolean;
	timeline: TTimelines;
	timestamp: number;
	title: string;
}
export interface RenderPlanSegment<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
> {
	events: Array<PlanEvent<TTimelines>>;
	transferIn: Array<TransferMarker<TTimelines>>;
	transferOut: Array<TransferMarker<TTimelines>>;
	timelines: Array<TTimelines>;
	timestamps: Array<number>;
	weights: Map<TTimelines, number>;
}

export interface RendererResultMetadata<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
> {
	timelineClasses: Map<TTimelines, string>;
	timelineIds: Map<TTimelines, Array<string>>;
	graph: Array<{ graph: string; start: number; end: number }>;
}
