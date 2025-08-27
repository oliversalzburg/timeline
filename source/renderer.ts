import {
	isNil,
	type Maybe,
	mustExist,
} from "@oliversalzburg/js-utils/data/nil.js";
import { hashCyrb53 } from "@oliversalzburg/js-utils/data/string.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { FONT_NAME, FONT_SIZE, TRANSPARENT } from "./constants.js";
import { dot, makeHtmlString, type NodeProperties } from "./dot.js";
import type { Graph } from "./genealogy.js";
import { uncertainEventToDate } from "./genealogy.js";
import { matchLuminance } from "./palette.js";
import { type Style, StyleStatic } from "./style.js";
import { STYLE_TRANSFER_MARKER } from "./styles.js";
import type {
	RenderMode,
	TimelineAncestryRenderer,
	TimelineReferenceRenderer,
} from "./types.js";

export interface RendererOptions {
	dateRenderer?: (date: number) => string;
	styleSheet?: Map<string, Style>;
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
	timeline: TTimelines;
	index?: number;
	isTransferMarker: boolean;
	timestamp: number;
	title: string;
}
export const plan = <
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
>(
	timelines: Array<TTimelines>,
	options: Partial<RendererOptions> = {},
) => {
	const segments = new Array<{
		events: Array<PlanEvent<TTimelines>>;
		timelines: Array<TTimelines>;
		timestamps: Array<number>;
		weights: Map<TTimelines, number>;
	}>();

	// A list of every timestamp that is used in any of the given timelines.
	const timestampsUnique = [
		...new Set(timelines.flatMap((t) => t.records.map(([time, _]) => time))),
	];

	// Determine if a given timestamp is in the current window.
	const isTimestampInRange = (timestamp: number): boolean =>
		(options.skipBefore ?? Number.NEGATIVE_INFINITY) < timestamp &&
		timestamp < (options.skipAfter ?? Number.POSITIVE_INFINITY);

	const hasTimelineEnded = (
		timeline: TTimelines,
		timestamp: number,
	): boolean => {
		if (!Array.isArray(timeline.records) || timeline.records.length === 0) {
			return true;
		}
		return timeline.records[timeline.records.length - 1][0] < timestamp;
	};
	const hasTimelineStarted = (
		timeline: TTimelines,
		timestamp: number,
	): boolean => {
		if (!Array.isArray(timeline.records) || timeline.records.length === 0) {
			return false;
		}
		return timeline.records[0][0] <= timestamp;
	};

	const eventHorizon = timestampsUnique.filter(isTimestampInRange);
	const globalHistory = eventHorizon.sort((a, b) => a - b);

	let globalHistoryIndex = 0;
	let segmentRanks = 0;
	let segmentEvents = new Array<{
		timeline: TTimelines;
		index?: number;
		isTransferMarker: boolean;
		timestamp: number;
		title: string;
	}>();
	const segmentTimelines = new Set<TTimelines>();
	const localHistoryIndexes = new Array<number>(timelines.length).fill(
		0,
		0,
		timelines.length,
	);

	const endSegment = () => {
		const timestamp = globalHistory[globalHistoryIndex];
		for (const timeline of segmentTimelines) {
			if (timestamp === undefined || hasTimelineEnded(timeline, timestamp)) {
				continue;
			}
			segmentEvents.push({
				timeline,
				timestamp: timestamp + 1,
				title: `TX-OUT-${timeline.meta.id}-${timestamp}`,
				isTransferMarker: true,
			});
		}
		const timelines = [...segmentTimelines];
		segments.push({
			events: segmentEvents,
			timelines,
			timestamps: [
				...new Set(
					segmentEvents.map((_) =>
						_.index !== undefined
							? _.timeline.records[_.index][0]
							: mustExist(_.timestamp),
					),
				),
			].sort((a, b) => a - b),
			weights: new Map(
				timelines.map((_) => [
					_,
					segmentEvents.filter((event) => event.timeline === _).length - 1,
				]),
			),
		});

		segmentRanks = 0;
		segmentEvents = [];
		for (const timeline of segmentTimelines) {
			if (hasTimelineEnded(timeline, timestamp)) {
				segmentTimelines.delete(timeline);
			}
		}
	};

	const startSegment = () => {
		const timestamp = globalHistory[globalHistoryIndex];
		for (const timeline of segmentTimelines) {
			segmentEvents.push({
				timeline,
				timestamp: timestamp - 1,
				title: `TX-IN-${timeline.meta.id}-${timestamp}`,
				isTransferMarker: true,
			});
		}
	};

	// Fast-forward index pointers to start of horizon.
	for (
		let timelineIndex = 0;
		timelineIndex < timelines.length;
		++timelineIndex
	) {
		const timeline = timelines[timelineIndex];
		let localHistoryIndex = localHistoryIndexes[timelineIndex];
		while (
			localHistoryIndex < timeline.records.length &&
			timeline.records[localHistoryIndex][0] < globalHistory[0]
		) {
			++localHistoryIndex;
		}
		localHistoryIndexes[timelineIndex] = localHistoryIndex;
	}

	while (globalHistoryIndex < globalHistory.length) {
		const timestamp = globalHistory[globalHistoryIndex];
		for (
			let timelineIndex = 0;
			timelineIndex < timelines.length;
			++timelineIndex
		) {
			const timeline = timelines[timelineIndex];
			if (
				!hasTimelineStarted(timeline, timestamp) ||
				hasTimelineEnded(timeline, timestamp)
			) {
				continue;
			}

			segmentTimelines.add(timeline);

			let localHistoryIndex = localHistoryIndexes[timelineIndex];
			while (
				localHistoryIndex < timeline.records.length &&
				timeline.records[localHistoryIndex][0] === timestamp
			) {
				segmentEvents.push({
					timeline,
					index: localHistoryIndex,
					title: timeline.records[localHistoryIndex][1].title,
					timestamp: timeline.records[localHistoryIndex][0],
					isTransferMarker: false,
				});
				++segmentRanks;
				++localHistoryIndex;
			}
			localHistoryIndexes[timelineIndex] = localHistoryIndex;
		}
		if ((options.segment ?? Number.POSITIVE_INFINITY) < segmentRanks) {
			endSegment();
			startSegment();
		}
		++globalHistoryIndex;
	}
	endSegment();
	return segments;
};

/**
 * The Renderer in the reference implementation generates a GraphViz graph containing all passed
 * timelines. How these timelines are merged, and rendered, is opinionated. It should serve
 * as an example of how to further utilize recorded timeline data.
 * Readers are encouraged to write their own Renderer implementation.
 */
export const render = <
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
>(
	timelines: Array<TTimelines>,
	options: RendererOptions,
	_identityGraph?: Graph<TTimelines> | undefined,
	hops?: Map<string, number> | undefined,
): {
	graph: Array<string>;
	ids: Set<string>;
} => {
	const now = options?.now ?? Date.now();
	const origin: TTimelines =
		options?.origin !== undefined
			? mustExist(
					timelines.find(
						(_) =>
							("identity" in _.meta && _.meta.identity.id === options.origin) ||
							_.meta.id === options.origin,
					),
					`no timeline has identity '${options.origin}'`,
				)
			: timelines[0];
	const originTimestamp =
		"identity" in origin.meta
			? (uncertainEventToDate(origin.meta.identity.born)?.valueOf() ??
				origin.records[0][0])
			: now;
	const _originString = options?.dateRenderer
		? options.dateRenderer(originTimestamp)
		: new Date(originTimestamp).toDateString();

	const isTimestampInRange = (timestamp: number): boolean =>
		(options.skipBefore ?? Number.NEGATIVE_INFINITY) < timestamp &&
		timestamp < (options.skipAfter ?? Number.POSITIVE_INFINITY);

	const classes = new Map<string, string>(
		timelines.map((_) => [_.meta.id, `t${hashCyrb53(_.meta.id)}`]),
	);
	const ranks = new Map<string, number>(
		timelines.map((_) => [
			_.meta.id,
			rank(
				_,
				"identity" in _.meta
					? hops?.get(_.meta.identity.id)
					: Number.POSITIVE_INFINITY,
			),
		]),
	);
	const styleSheet = options.styleSheet;

	let eventIndex = 0;
	const allNodeIds = new Set<string>();
	const registerId = (timestamp: number) => {
		// Convert the timestamp to a Date for API features.
		const date = new Date(timestamp);
		const id = `Z${date.getFullYear().toFixed().padStart(4, "0")}-${(date.getMonth() + 1).toFixed().padStart(2, "0")}-${date.getDate().toFixed().padStart(2, "0")}-${eventIndex++}`;
		allNodeIds.add(id);
		return id;
	};

	const getStyle = (_?: TTimelines) => {
		if (styleSheet === undefined || _ === undefined) {
			return StyleStatic;
		}
		return mustExist(
			styleSheet.get(_.meta.id),
			`missing style for '${_.meta.id}'`,
		);
	};

	const computeNodeProperties = (
		isTransferMarker: boolean,
		timestamp: number,
		title: string,
		contributors: Set<TTimelines>,
		leader?: TTimelines,
	) => {
		const classList = isTransferMarker
			? ["tx", ...contributors.values().map((_) => classes.get(_.meta.id))]
			: ["event", ...contributors.values().map((_) => classes.get(_.meta.id))];
		const color = isTransferMarker ? "transparent" : getStyle(leader).pencolor;
		const fillcolors = isTransferMarker
			? ["#FF0000FF"]
			: contributors.values().reduce((fillColors, timeline) => {
					const fill = getStyle(timeline).fillcolor;

					// Whatever we want to draw, _one_ transparent fill should be enough.
					if (fill === TRANSPARENT && fillColors.includes(TRANSPARENT)) {
						return fillColors;
					}

					fillColors.push(
						timeline === leader || fill === TRANSPARENT
							? fill
							: matchLuminance(fill, getStyle(leader).fillcolor),
					);
					return fillColors;
				}, new Array<string>());
		const fontcolor = isTransferMarker
			? "#000000FF"
			: getStyle(leader).fontcolor;
		const id = isTransferMarker ? undefined : registerId(timestamp);

		const prefixes = contributors
			.values()
			.reduce((_, timeline) => _ + (timeline.meta.prefix ?? ""), "");
		const dateString = options?.dateRenderer
			? options.dateRenderer(timestamp)
			: new Date(timestamp).toDateString();
		const label = isTransferMarker
			? undefined
			: `${0 < prefixes.length ? `${prefixes}\u00A0` : ""}${makeHtmlString(
					`${title}\\n${dateString}`,
				)}`;

		const _timePassedSinceOrigin = timestamp - originTimestamp;
		const _timePassedSinceThen = now - timestamp;
		/*
		const tooltip = isTransferMarker
			? undefined
			: `${formatMilliseconds(timePassedSinceOrigin)} seit ${originString}\\n${formatMilliseconds(
					timePassedSinceThen,
				)} her`;
				 */
		const tooltip = undefined;

		const style = isTransferMarker ? STYLE_TRANSFER_MARKER : getStyle(leader);

		const nodeProperties: Partial<NodeProperties> = {
			class: classList.join(" "),
			color,
			fillcolor: style.style.includes("filled")
				? fillcolors.length === 1
					? fillcolors[0]
					: `${fillcolors[0]}:${fillcolors[1]}`
				: undefined,
			fixedsize: isTransferMarker ? true : undefined,
			fontcolor,
			fontsize: isTransferMarker ? 0 : undefined,
			height: isTransferMarker ? 0 : undefined,
			id,
			label,
			penwidth: style.penwidth,
			shape: style.shape,
			skipDraw: !isTimestampInRange(timestamp),
			style: style.style.join(","),
			tooltip,
			width: isTransferMarker ? 1 : undefined,
		};

		return nodeProperties;
	};

	const dotGraph = (d = dot()) => {
		d.raw("digraph timeline {");
		d.raw(`node [fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`);
		d.raw(`edge [fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`);
		d.raw(`bgcolor="${TRANSPARENT}"`);
		d.raw('comment=""');
		d.raw(`fontname="${FONT_NAME}"`);
		d.raw(`fontsize="${FONT_SIZE}"`);
		d.raw('label=""');
		d.raw(`rankdir="TD"`);
		d.raw(`ranksep="0.5"`);
		d.raw(`tooltip=""`);
		return d;
	};

	const renderPlan = plan(timelines, options);
	let d = dotGraph();
	const graphSegments = new Array<string>();
	for (const segment of renderPlan) {
		const timestampsSegment = segment.timestamps;
		const timelinesSegment = timelines.filter((_) =>
			segment.timelines.includes(_),
		);

		d.clear();
		d = dotGraph(d);

		/**
		 * We iterate over each unique timestamp that exists globally.
		 * For each unique timestamp, we want to look at all global events that
		 * exist at this timestamp.
		 */
		for (const timestamp of timestampsSegment) {
			eventIndex = 0;

			// We now iterate over all global events at the current timestamp.
			const events = segment.events.filter((_) => _.timestamp === timestamp);

			const eventTitles = new Map<string, PlanEvent<TTimelines>>(
				events.map((event) => [event.title, event]),
			);

			for (const title of new Set(eventTitles.keys())) {
				// The map only contains a single entry for each title.
				// If that entry is a transfer marker, we assume that it also
				// has no contributors.
				const transferMarker = mustExist(eventTitles.get(title));

				// Remember which timelines contribute to the event.
				const contributors = new Set<TTimelines>();
				// Remember the contributor with the highest rank.
				let leader: TTimelines | undefined;

				if (!transferMarker.isTransferMarker) {
					// We now further iterate over all global events at this timestamp which share the same title.
					for (const event of events) {
						if (event.title !== title) {
							continue;
						}
						contributors.add(event.timeline);
						if (leader === undefined) {
							leader = event.timeline;
							continue;
						}

						if (
							mustExist(ranks.get(mustExist(leader.meta.id, "no leader"))) <=
							mustExist(
								ranks.get(mustExist(event.timeline.meta.id, "no timeline")),
							)
						) {
							leader = event.timeline;
						}
					}
				} else {
					leader = transferMarker.timeline;
					contributors.add(transferMarker.timeline);
				}

				const style = getStyle(transferMarker.timeline);
				if (!transferMarker.isTransferMarker || style.link) {
					const nodeProperties = computeNodeProperties(
						transferMarker.isTransferMarker,
						timestamp,
						title,
						contributors,
						leader,
					);
					d.node(title, nodeProperties);
				}
			}

			const isTransferMarkerSection =
				events[0].isTransferMarker ||
				events[events.length - 1].isTransferMarker;

			if (isTransferMarkerSection) {
				d.raw("{");
				d.raw('rank="same"');
				const linkedEvents = events.filter((_) => getStyle(_.timeline).link);
				for (
					let eventIndex = 1;
					eventIndex < linkedEvents.length;
					++eventIndex
				) {
					d.link(
						linkedEvents[eventIndex - 1].title,
						linkedEvents[eventIndex].title,
						{
							style: options.debug ? "dashed" : "invis",
							weight: 1_000_000,
						},
					);
				}
				d.raw("}");
			}
		}

		// Link items in their individual timelines together.
		let timePassed = 0;
		for (const timeline of timelinesSegment) {
			const style = getStyle(timeline);

			if (!style.link) {
				continue;
			}

			// The timestamp we looked at during the last iteration.
			let previousTimestamp: number | undefined;
			// The entries at the previous timestamp.
			let previousEntries = new Array<string>();
			// How many milliseconds passed since the previous timestamp.
			let _timePassed = 0;

			const eventsInSegment = segment.events.filter(
				(_) => _.timeline.meta.id === timeline.meta.id,
			);
			const eventTimesInSegment = eventsInSegment.map((_) =>
				_.index !== undefined
					? timeline.records[_.index][0]
					: mustExist(_.timestamp),
			);

			let previousWasTransferMarker = true;

			for (const timestamp of eventTimesInSegment) {
				if (previousTimestamp && timestamp <= previousTimestamp) {
					continue;
				}

				_timePassed = previousTimestamp
					? Math.max(1, timestamp - previousTimestamp)
					: 0;

				// We need to remember these for the next timestamp iteration.
				const processedTitles = new Array<string>();

				const eventsAtTimestamp = eventsInSegment.filter(
					(_) =>
						(_.index !== undefined
							? timeline.records[_.index][0]
							: mustExist(_.timestamp)) === timestamp,
				);

				for (const event of eventsAtTimestamp) {
					const timelineEvent =
						event.index !== undefined
							? event.timeline.records[event.index][1].title
							: event.title;
					const timelineWeight = segment.weights.get(event.timeline);

					processedTitles.push(timelineEvent);
					if (0 === previousEntries.length) {
						continue;
					}

					for (const previousEntry of previousEntries) {
						d.link(previousEntry, timelineEvent, {
							arrowhead: event.isTransferMarker ? "none" : undefined,
							color: style.pencolor,
							headport: event.isTransferMarker ? "n" : undefined,
							penwidth: style.penwidth,
							samehead: timeline.meta.id,
							sametail: timeline.meta.id,
							skipDraw: !isTimestampInRange(timestamp),
							style: style.link,
							tailport: previousWasTransferMarker ? "s" : undefined,
							/*
							tooltip: !event.isTransferMarker
								? `${formatMilliseconds(timePassed)} passed`
								: undefined,
								*/
							weight: timelineWeight !== undefined ? timelineWeight : undefined,
						});
					}
				}

				previousTimestamp = timestamp;
				previousEntries = processedTitles;
				previousWasTransferMarker = eventsAtTimestamp.some(
					(_) => _.isTransferMarker,
				);
			}
		}

		// Link up all entries in a single time chain.
		let previousTimestamp: number | undefined;
		let previousTimestampEntries = new Array<PlanEvent<TTimelines>>();
		timePassed = 0;
		for (const timestamp of timestampsSegment) {
			timePassed = previousTimestamp
				? Math.max(1, timestamp - previousTimestamp)
				: 0;

			// We need to remember these for the next timestamp iteration.
			const processedEntries = new Array<PlanEvent<TTimelines>>();

			// We now iterate over all global events at the current timestamp.
			const events = segment.events
				.filter((_) => _.timestamp === timestamp)
				.sort((a, b) => a.title.localeCompare(b.title));

			const isTimestampTransfer = events.some(
				(event) => event.isTransferMarker,
			);
			if (isTimestampTransfer) {
				const bestTransferMarker = events.reduce(
					(previous, current) => {
						const style = getStyle(current.timeline);
						const weight = segment.weights.get(current.timeline);

						if (style.link && weight !== undefined && previous.score < weight) {
							previous.timeline = current.timeline;
							previous.score = weight;
							previous.event = current;
						}
						return previous;
					},
					{
						score: Number.NEGATIVE_INFINITY,
						timeline: timelines[0],
						event: events[0],
					},
				);
				processedEntries.push(bestTransferMarker.event);
				if (bestTransferMarker.event.title.startsWith("TX-OUT")) {
					if (0 === previousTimestampEntries.length) {
						continue;
					}

					for (const previousEntry of previousTimestampEntries) {
						// Draw rank-forcing link between merged timeline entries.
						// This forces all entries into a globally linear order.
						d.link(previousEntry.title, bestTransferMarker.event.title, {
							skipDraw: !isTimestampInRange(timestamp),
							style: options.debug ? "dashed" : "invis",
							tooltip:
								options.debug && !bestTransferMarker.event.isTransferMarker
									? `${formatMilliseconds(timePassed)} passed`
									: undefined,
						});
					}
				}
				previousTimestamp = timestamp;
				previousTimestampEntries = processedEntries;
				continue;
			}

			for (const event of events) {
				if (processedEntries.find((_) => _.title === event.title)) {
					// Events in multiple timelines share time and title.
					// By skipping here, we automatically end up with only a
					// single node with that identity.
					continue;
				}

				processedEntries.push(event);

				if (0 === previousTimestampEntries.length) {
					continue;
				}

				for (const previousEntry of previousTimestampEntries) {
					// Draw rank-forcing link between merged timeline entries.
					// This forces all entries into a globally linear order.
					d.link(previousEntry.title, event.title, {
						skipDraw: !isTimestampInRange(timestamp),
						style: options.debug ? "dashed" : "invis",
						tooltip:
							options.debug && !event.isTransferMarker
								? `${formatMilliseconds(timePassed)} passed`
								: undefined,
					});
				}
			}

			previousTimestamp = timestamp;
			previousTimestampEntries = processedEntries;
		}

		d.raw("}");
		graphSegments.push(d.toString());
	}

	return {
		graph: graphSegments,
		ids: allNodeIds,
	};
};
