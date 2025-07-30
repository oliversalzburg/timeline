import {
	isNil,
	type Maybe,
	mustExist,
} from "@oliversalzburg/js-utils/data/nil.js";
import { hashCyrb53 } from "@oliversalzburg/js-utils/data/string.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { TRANSPARENT } from "./constants.js";
import { dot, makeHtmlString, type NodeProperties } from "./dot.js";
import { roundToDay } from "./operator.js";
import { matchLuminance, type PaletteMeta, palette } from "./palette.js";
import { STYLE_TRANSFER_MARKER, type Style, styles } from "./styles.js";
import type {
	RenderMode,
	TimelineEntry,
	TimelineReferenceRenderer,
} from "./types.js";

export interface RendererOptions {
	baseUnit: "day" | "week" | "month";
	condensed: boolean;
	dateRenderer: (date: number) => string;
	debug: boolean;
	now: number;
	origin: number;
	segment: number;
	skipAfter: number;
	skipBefore: number;
	theme: RenderMode;
}

/**
 * Determine the rank of a timeline.
 * NOT to be confused with ranks in a dot graph.
 */
export const rank = (timeline: Maybe<TimelineReferenceRenderer>) => {
	return isNil(timeline)
		? -1
		: (timeline.meta.rank ?? (timeline.meta.color === TRANSPARENT ? -1 : 0));
};

export interface PlanEvent {
	timeline: TimelineReferenceRenderer;
	index?: number;
	isTransferMarker: boolean;
	timestamp: number;
	title: string;
}
export const plan = (
	timelines: Array<TimelineReferenceRenderer>,
	options: Partial<RendererOptions> = {},
) => {
	const segments = new Array<{
		events: Array<PlanEvent>;
		timelines: Array<TimelineReferenceRenderer>;
		timestamps: Array<number>;
	}>();

	// A list of every timestamp that is used in any of the given timelines.
	const timestampsUnique = [
		...new Set(
			timelines.flatMap((t) => roundToDay(t).records.map(([time, _]) => time)),
		),
	];

	// Determine if a given timestamp is in the current window.
	const isTimestampInRange = (timestamp: number): boolean =>
		(options.skipBefore ?? Number.NEGATIVE_INFINITY) < timestamp &&
		timestamp < (options.skipAfter ?? Number.POSITIVE_INFINITY);

	const hasTimelineEnded = (
		timeline: TimelineReferenceRenderer,
		timestamp: number,
	): boolean => timeline.records[timeline.records.length - 1][0] < timestamp;
	const hasTimelineStarted = (
		timeline: TimelineReferenceRenderer,
		timestamp: number,
	): boolean => timeline.records[0][0] <= timestamp;

	const eventHorizon = timestampsUnique.filter(isTimestampInRange);
	const globalHistory = eventHorizon.sort((a, b) => a - b);

	let globalHistoryIndex = 0;
	let segmentRanks = 0;
	let segmentEvents = new Array<{
		timeline: TimelineReferenceRenderer;
		index?: number;
		isTransferMarker: boolean;
		timestamp: number;
		title: string;
	}>();
	const segmentTimelines = new Set<TimelineReferenceRenderer>();
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
		segments.push({
			events: segmentEvents,
			timelines: [...segmentTimelines],
			timestamps: [
				...new Set(
					segmentEvents.map((_) =>
						_.index !== undefined
							? _.timeline.records[_.index][0]
							: mustExist(_.timestamp),
					),
				),
			].sort((a, b) => a - b),
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
				++localHistoryIndex;
			}
			localHistoryIndexes[timelineIndex] = localHistoryIndex;
		}
		if (200 < ++segmentRanks) {
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
export const render = (
	timelines: Array<TimelineReferenceRenderer>,
	options: Partial<RendererOptions> = {},
): {
	graph: Array<string>;
	ids: Set<string>;
	palette: PaletteMeta<string>;
	ranks: Map<TimelineReferenceRenderer, number>;
	styles: Map<number, Style>;
} => {
	const now = options?.now ?? Date.now();
	const origin = options?.origin ?? timelines[0].records[0][0];
	const originString = options?.dateRenderer
		? options.dateRenderer(origin)
		: new Date(origin).toDateString();

	const isTimestampInRange = (timestamp: number): boolean =>
		(options.skipBefore ?? Number.NEGATIVE_INFINITY) < timestamp &&
		timestamp < (options.skipAfter ?? Number.POSITIVE_INFINITY);

	// We default to dark, as the assume the default output media to be a display.
	// For printing use cases, we'd prefer to use light.
	const p = palette<string>(options.theme ?? "dark");

	for (const timeline of timelines) {
		p.add(timeline.meta.id, timeline.meta.color);
	}

	const paletteMeta = p.toPalette();
	const colors = paletteMeta.lookup;

	const classes = new Map<string, string>(
		timelines.map((_) => [_.meta.id, `t${hashCyrb53(_.meta.id)}`]),
	);
	const ranks = new Map<TimelineReferenceRenderer, number>(
		timelines.map((_) => [_, rank(_)]),
	);
	const styleSheet = styles([...ranks.values()]).toStyleSheet();

	let eventIndex = 0;
	const allNodeIds = new Set<string>();
	const registerId = (timestamp: number) => {
		// Convert the timestamp to a Date for API features.
		const date = new Date(timestamp);
		const id = `Z${date.getFullYear().toFixed().padStart(4, "0")}-${(date.getMonth() + 1).toFixed().padStart(2, "0")}-${date.getDate().toFixed().padStart(2, "0")}-${eventIndex++}`;
		allNodeIds.add(id);
		return id;
	};

	const computeNodeProperties = (
		isTransferMarker: boolean,
		timestamp: number,
		title: string,
		contributors: Set<TimelineReferenceRenderer>,
		leader?: TimelineReferenceRenderer,
	) => {
		const classList = isTransferMarker
			? ["tx", ...contributors.values().map((_) => classes.get(_.meta.id))]
			: [...contributors.values().map((_) => classes.get(_.meta.id))];
		const color = isTransferMarker
			? "transparent"
			: mustExist(
					colors.get(mustExist(leader, "missing leader").meta.id),
					"missing color",
				).pen;
		const fillcolors = isTransferMarker
			? ["#FF0000FF"]
			: contributors.values().reduce((fillColors, timeline) => {
					const fill = mustExist(colors.get(timeline.meta.id)).fill;

					// Whatever we want to draw, _one_ transparent fill should be enough.
					if (fill === TRANSPARENT && fillColors.includes(TRANSPARENT)) {
						return fillColors;
					}

					fillColors.push(
						timeline === leader || fill === TRANSPARENT
							? fill
							: matchLuminance(
									fill,
									mustExist(colors.get(mustExist(leader).meta.id)).fill,
								),
					);
					return fillColors;
				}, new Array<string>());
		const fontcolor = isTransferMarker
			? "#000000FF"
			: mustExist(colors.get(mustExist(leader).meta.id)).font;
		const id = registerId(timestamp);

		const prefixes = contributors
			.values()
			.reduce((_, timeline) => _ + (timeline.meta.prefix ?? ""), "");
		const dateString = options?.dateRenderer
			? options.dateRenderer(timestamp)
			: new Date(timestamp).toDateString();
		const label = isTransferMarker
			? " "
			: `${0 < prefixes.length ? `${prefixes}\u00A0` : ""}${makeHtmlString(
					`${title}\\n${dateString}`,
				)}`;

		const timePassedSinceOrigin = timestamp - origin;
		const timePassedSinceThen = now - timestamp;
		const tooltip = isTransferMarker
			? undefined
			: `${formatMilliseconds(timePassedSinceOrigin)} since ${originString}\\n${formatMilliseconds(timePassedSinceThen)} ago`;

		const style = isTransferMarker
			? STYLE_TRANSFER_MARKER
			: mustExist(styleSheet.get(rank(leader)));

		const nodeProperties: Partial<NodeProperties> = {
			class: classList.join(" "),
			color,
			fillcolor:
				fillcolors.length === 1
					? fillcolors[0]
					: `${fillcolors[0]}:${fillcolors[1]}`,
			fixedsize: isTransferMarker ? true : undefined,
			fontcolor,
			fontsize: isTransferMarker ? 0 : undefined,
			height: isTransferMarker ? 0 : undefined,
			id,
			label,
			penwidth: style.outline ? style.penwidth : 0,
			shape: style.shape,
			skipDraw: !isTimestampInRange(timestamp),
			style: style.style?.join(","),
			tooltip,
			ts: timestamp,
			width: isTransferMarker ? 1.25 : undefined,
		};

		return nodeProperties;
	};

	const dotGraph = (d = dot()) => {
		d.raw("digraph timeline {");
		const FONT_NAME = "Arial";
		const FONT_SIZE = 12;
		d.raw(`node [fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`);
		d.raw(`edge [fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`);
		d.raw(`bgcolor="${TRANSPARENT}"`);
		d.raw('comment=" "');
		d.raw(`fontname="${FONT_NAME}"`);
		d.raw(`fontsize="${FONT_SIZE}"`);
		d.raw('label=" "');
		d.raw(`rankdir="TD"`);
		d.raw(`ranksep="0.5"`);
		d.raw(`tooltip=" "`);
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

			const eventTitles = new Map<string, PlanEvent>(
				events.map((event) => [event.title, event]),
			);

			for (const title of new Set(eventTitles.keys())) {
				// The map only contains a single entry for each title.
				// If that entry is a transfer marker, we assume that it also
				// has no contributors.
				const transferMarker = mustExist(eventTitles.get(title));

				// Remember which timelines contribute to the event.
				const contributors = new Set<TimelineReferenceRenderer>();
				// Remember the contributor with the highest rank.
				let leader: TimelineReferenceRenderer | undefined;

				if (!transferMarker.isTransferMarker) {
					// We now further iterate over all global events at this timestamp which share the same title.
					for (const event of events) {
						if (event.title !== title) {
							continue;
						}
						contributors.add(event.timeline);
						if (rank(leader) <= rank(event.timeline)) {
							leader = event.timeline;
						}
					}
				} else {
					const style = mustExist(
						styleSheet.get(rank(transferMarker.timeline)),
					);
					if (!style.link) {
						continue;
					}
					leader = transferMarker.timeline;
					contributors.add(transferMarker.timeline);
				}

				const nodeProperties = computeNodeProperties(
					transferMarker.isTransferMarker,
					timestamp,
					title,
					contributors,
					leader,
				);

				d.node(title, nodeProperties);
			}

			const isTransferMarkerSection =
				events[0].isTransferMarker ||
				events[events.length - 1].isTransferMarker;

			if (isTransferMarkerSection) {
				d.raw("{");
				d.raw('rank="same"');
				const linkedEvents = events.filter(
					(_) => mustExist(styleSheet.get(rank(_.timeline))).link,
				);
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
						},
					);
				}
				d.raw("}");
			}
		}

		// Link items in their individual timelines together.
		let timePassed = 0;
		for (const timeline of timelinesSegment) {
			const color = mustExist(colors.get(timeline.meta.id)).pen;
			const style = mustExist(styleSheet.get(rank(timeline)));

			if (!style.link) {
				continue;
			}

			// The timestamp we looked at during the last iteration.
			let previousTimestamp: number | undefined;
			// The entries at the previous timestamp.
			let previousEntries = new Array<string>();
			// How many milliseconds passed since the previous timestamp.
			let timePassed = 0;

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

				timePassed = previousTimestamp
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

					processedTitles.push(timelineEvent);
					if (0 === previousEntries.length) {
						continue;
					}

					for (const previousEntry of previousEntries) {
						d.link(previousEntry, timelineEvent, {
							arrowhead: event.isTransferMarker ? "none" : undefined,
							color,
							headport: event.isTransferMarker ? "n" : undefined,
							penwidth: style.link
								? style.outline
									? style.penwidth
									: 0
								: undefined,
							samehead: timeline.meta.id,
							sametail: timeline.meta.id,
							skipDraw: !isTimestampInRange(timestamp),
							style: style.link ? "solid" : "invis",
							tailport: previousWasTransferMarker ? "s" : undefined,
							tooltip:
								style.link && !event.isTransferMarker
									? `${formatMilliseconds(timePassed)} passed`
									: undefined,
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
		let previousTimestampEntries = new Array<TimelineEntry>();
		timePassed = 0;
		for (const timestamp of timestampsSegment) {
			timePassed = previousTimestamp
				? Math.max(1, timestamp - previousTimestamp)
				: 0;

			// We need to remember these for the next timestamp iteration.
			const processedEntries = new Array<TimelineEntry>();

			// We now iterate over all global events at the current timestamp.
			const events = segment.events
				.filter((_) => _.timestamp === timestamp)
				.sort((a, b) => a.title.localeCompare(b.title));

			for (const event of events) {
				if (processedEntries.find((_) => _.title === event.title)) {
					// Events in multiple timelines share time and title.
					// By skipping here, we automatically end up with only a single node with that identity.
					continue;
				}

				if (
					event.isTransferMarker &&
					!mustExist(styleSheet.get(rank(event.timeline))).link
				) {
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
		palette: paletteMeta,
		ranks,
		styles: styleSheet,
	};
};
