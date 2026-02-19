import { isNil, type Maybe } from "@oliversalzburg/js-utils/data/nil.js";
import { MILLISECONDS, TRANSPARENT } from "./constants.js";
import type { Style } from "./style.js";
import type {
	RenderMode,
	TimelineAncestryRenderer,
	TimelineEntry,
	TimelineReferenceRenderer,
} from "./types.js";

export interface RendererOptions {
	dateRenderer?: (date: number) => string;
	styleSheet: Map<string, Style>;
	debug?: boolean;
	now: number;
	/**
	 * The ID of the timeline that serves as the origin for the rendering.
	 * This is NOT the ID of the _identity_ of the timeline, but the ID of the
	 * timeline itself.
	 */
	origin: string;
	segment?: number | undefined;
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

export const renderDateDDMMYYYY_de_DE = (date: number) => {
	const _ = new Date(date);
	return `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][_.getDay()]}, ${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
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

export interface Frame<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
> {
	readonly events: Map<string, Set<TTimelines>>;
	readonly records: Map<TTimelines, Array<TimelineEntry>>;
	readonly timelines: Set<TTimelines>;
}

/**
 * Segment a universe into frames.
 */
export function buildFrames<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
>(timelines: Array<TTimelines>) {
	const frames = new Map<number, Frame<TTimelines>>();
	for (const timeline of timelines) {
		for (const [timestamp, entry] of timeline.records) {
			const frame: Frame<TTimelines> = frames.get(timestamp) ?? {
				events: new Map<string, Set<TTimelines>>(),
				records: new Map<TTimelines, Array<TimelineEntry>>(),
				timelines: new Set<TTimelines>(),
			};
			const events = frame.events.get(entry.title) ?? new Set<TTimelines>();
			events.add(timeline);
			frame.events.set(entry.title, events);

			const records = frame.records.get(timeline) ?? new Array<TimelineEntry>();
			records.push(entry);
			frame.records.set(timeline, records);

			frame.timelines.add(timeline);
			frames.set(timestamp, frame);
		}
	}

	return frames;
}
