import {
	isNil,
	type Maybe,
	mustExist,
} from "@oliversalzburg/js-utils/data/nil.js";
import { hashCyrb53 } from "@oliversalzburg/js-utils/data/string.js";
import {
	FONT_NAME,
	FONT_SIZE_1000MM_V07_READ_PT,
	MILLISECONDS,
	TRANSPARENT,
} from "./constants.js";
import { dot, makeHtmlString, type NodeProperties } from "./dot.js";
import {
	isIdentityMedia,
	isIdentityPeriod,
	uncertainEventToDate,
	uncertainEventToDateString,
} from "./genealogy.js";
import { matchLuminance, rgbaToHexString } from "./palette.js";
import { STYLE_TRANSFER_MARKER, type Style, StyleStatic } from "./style.js";
import type {
	RenderMode,
	RGBATuple,
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
		transferIn: Array<TransferMarker<TTimelines>>;
		transferOut: Array<TransferMarker<TTimelines>>;
		timelines: Array<TTimelines>;
		timestamps: Array<number>;
		weights: Map<TTimelines, number>;
	}>();

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

	// A list of every timestamp that is used in any of the given timelines.
	const timestampsUnique = [
		...new Set(timelines.flatMap((t) => t.records.map(([time, _]) => time))),
	];
	const eventHorizon = timestampsUnique.filter(isTimestampInRange);
	const globalHistory = eventHorizon.sort((a, b) => a - b);

	let globalHistoryIndex = 0;
	let segmentGraphRanks = 0;
	let segmentEvents = new Array<{
		generated: boolean;
		index?: number;
		timeline: TTimelines;
		timestamp: number;
		title: string;
	}>();
	let segmentTransferIn = new Array<{
		index?: number;
		timeline: TTimelines;
		timestamp: number;
		title: string;
	}>();
	let segmentTransferOut = new Array<{
		index?: number;
		timeline: TTimelines;
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
			segmentTransferOut.push({
				timeline,
				timestamp: timestamp + 1,
				title: `TX-OUT-${timeline.meta.id}-${timestamp}`,
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
			transferIn: segmentTransferIn,
			transferOut: segmentTransferOut,
			weights: new Map(
				timelines.map((_) => [
					_,
					Math.max(
						0,
						segmentEvents.filter((event) => event.timeline === _).length - 1,
					),
				]),
			),
		});

		segmentGraphRanks = 0;
		segmentEvents = [];
		segmentTransferIn = [];
		segmentTransferOut = [];
		for (const timeline of segmentTimelines) {
			if (hasTimelineEnded(timeline, timestamp)) {
				segmentTimelines.delete(timeline);
			}
		}
	};

	const startSegment = () => {
		const timestamp = globalHistory[globalHistoryIndex];
		for (const timeline of segmentTimelines) {
			segmentTransferIn.push({
				timeline,
				timestamp: timestamp - 1,
				title: `TX-IN-${timeline.meta.id}-${timestamp}`,
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

	// Iterate over all timestamps in the document window.
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
					generated: timeline.records[localHistoryIndex][1].generated ?? false,
					index: localHistoryIndex,
					timeline,
					timestamp: timeline.records[localHistoryIndex][0],
					title: timeline.records[localHistoryIndex][1].title,
				});
				++segmentGraphRanks;
				++localHistoryIndex;
			}
			localHistoryIndexes[timelineIndex] = localHistoryIndex;
		}
		if ((options.segment ?? Number.POSITIVE_INFINITY) < segmentGraphRanks) {
			endSegment();
			startSegment();
		}
		++globalHistoryIndex;
	}
	endSegment();
	return segments;
};

export interface RendererMetaResult<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
> {
	timelineClasses: Map<TTimelines, string>;
	timelineIds: Map<TTimelines, Array<string>>;
	graph: Array<{ graph: string; start: number; end: number }>;
}

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
	hops?: Map<string, number> | undefined,
): RendererMetaResult<TTimelines> => {
	const now = options?.now ?? Date.now();
	const nowString = options.dateRenderer?.(now) ?? now.toString();
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
			? (uncertainEventToDate(
					origin.meta.identity.born ?? origin.meta.identity.established,
				)?.valueOf() ?? origin.records[0][0])
			: now;
	const originTimestampString =
		"identity" in origin.meta
			? uncertainEventToDateString(
					origin.meta.identity.born ?? origin.meta.identity.established,
					options.dateRenderer,
				)
			: "now";

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
		const style = isTransferMarker ? STYLE_TRANSFER_MARKER : getStyle(leader);

		const contributorClasses = [
			...contributors.values().map((_) => classes.get(_.meta.id)),
		];
		const classList = isTransferMarker
			? ["tx", ...contributorClasses]
			: ["event", ...contributorClasses];
		const color = isTransferMarker ? "transparent" : getStyle(leader).pencolor;
		const fillcolors = isTransferMarker
			? [[255, 0, 0, 255] as RGBATuple]
			: contributors.values().reduce((fillColors, timeline) => {
					if (isIdentityMedia(timeline) || isIdentityPeriod(timeline)) {
						return fillColors;
					}

					const timelineStyle = getStyle(timeline);
					// If we know that the node will be filled, fall back to pen color
					// in case the fill is transparent, to avoid ugly gradients.
					const fill =
						timelineStyle.fillcolor[3] === 0 && style.style.includes("filled")
							? timelineStyle.pencolor
							: timelineStyle.fillcolor;

					// Ignore transparent fills.
					if (fill[3] === 0) {
						return fillColors;
					}

					fillColors.push(
						timeline === leader || fill[3] === 0
							? fill
							: matchLuminance(fill, getStyle(leader).fillcolor),
					);
					return fillColors;
				}, new Array<RGBATuple | "transparent">());
		const fontcolor = isTransferMarker
			? ([0, 0, 0, 255] as RGBATuple)
			: getStyle(leader).fontcolor;
		const id = isTransferMarker ? undefined : registerId(timestamp);

		const prefixes = contributors
			.values()
			.reduce((_, timeline) => _ + (timeline.meta.prefix ?? ""), "");
		const dateString = options?.dateRenderer
			? options.dateRenderer(timestamp)
			: new Date(timestamp).toDateString();
		const label = isTransferMarker
			? " "
			: `${0 < prefixes.length ? `${prefixes}\u00A0` : ""}${makeHtmlString(
					`${title}`,
				)}`;

		const timePassedSinceOrigin = timestamp - originTimestamp;
		const timePassedSinceThen = now - timestamp;
		const tooltip = isTransferMarker
			? undefined
			: [
					`${dateString}\\n`,
					0 < timePassedSinceOrigin
						? `${renderMilliseconds(timePassedSinceOrigin)} seit ${originTimestampString}\\n`
						: `${renderMilliseconds(timePassedSinceOrigin * -1)} bis ${originTimestampString}\\n`,
					0 < timePassedSinceThen
						? `${renderMilliseconds(timePassedSinceThen)} bis ${nowString}`
						: `${renderMilliseconds(timePassedSinceThen)} seit ${nowString}`,
				].join("");

		const nodeProperties: Partial<NodeProperties> = {
			class: classList.join(" "),
			color: rgbaToHexString(color),
			comment: isTransferMarker
				? `Transfermarker for ${contributorClasses.join(",")}`
				: undefined,
			fillcolor: style.style.includes("filled")
				? fillcolors.length === 1
					? rgbaToHexString(fillcolors[0])
					: `${rgbaToHexString(fillcolors[0])}:${rgbaToHexString(fillcolors[1])}`
				: undefined,
			fixedsize: isTransferMarker ? true : undefined,
			fontcolor: rgbaToHexString(fontcolor),
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
		const fontsize = FONT_SIZE_1000MM_V07_READ_PT;
		d.raw("digraph {");
		d.graphSpec({
			bgcolor: "transparent",
			comment: " ",
			fontname:
				options.rendererAnonymization === "enabled" ? "Dummy Text2" : FONT_NAME,
			fontsize,
			rankdir: "TB",
			ranksep: 0.5,
		});
		d.nodeSpec({
			fontname:
				options.rendererAnonymization === "enabled" ? "Dummy Text2" : FONT_NAME,
			fontsize,
		});
		d.linkSpec({
			fontname:
				options.rendererAnonymization === "enabled" ? "Dummy Text2" : FONT_NAME,
			fontsize,
		});
		return d;
	};

	const renderPlan = plan(timelines, options);
	let d = dotGraph();
	const graphSegments = new Array<{
		graph: string;
		start: number;
		end: number;
	}>();
	const idMesh = new Map<TTimelines, Array<string>>();
	for (const timeline of timelines) {
		idMesh.set(timeline, new Array<string>());
	}

	for (const segment of renderPlan) {
		const timestampsSegment = segment.timestamps;
		const timelinesSegment = timelines.filter((_) =>
			segment.timelines.includes(_),
		);

		d.clear();
		d = dotGraph(d);

		//#region Transfer Marker Section
		if (0 < segment.transferIn.length) {
			d.raw("{");
			d.graphSpec({ comment: "Transfer In Section", rank: "same" });

			const markers = segment.transferIn;
			const nodeProperties = computeNodeProperties(
				true,
				markers[0].timestamp,
				markers[0].title,
				new Set([markers[0].timeline]),
			);
			d.node(markers[0].title, nodeProperties);
			let previous: string | undefined;
			let markersDrawn = 0;
			for (
				let linkedEventIndex = 0;
				linkedEventIndex < markers.length;
				++linkedEventIndex
			) {
				const style = getStyle(markers[linkedEventIndex].timeline);
				if (!style.link) {
					markers[linkedEventIndex].omitted = true;
					continue;
				}
				const nodeProperties = computeNodeProperties(
					true,
					markers[linkedEventIndex].timestamp,
					markers[linkedEventIndex].title,
					new Set([markers[linkedEventIndex].timeline]),
				);
				d.node(markers[linkedEventIndex].title, nodeProperties);
				++markersDrawn;
				if (previous !== undefined) {
					d.link(previous, markers[linkedEventIndex].title, {
						comment: "Marker Link",
						style: options.debug ? "dashed" : "invis",
						weight: 1_000_000,
					});
				}
				previous = markers[linkedEventIndex].title;
			}
			if (markersDrawn === 0) {
				const nodeProperties = computeNodeProperties(
					true,
					markers[0].timestamp,
					markers[0].title,
					new Set([markers[0].timeline]),
				);
				d.node(markers[0].title, nodeProperties);
				markers[0].omitted = false;
			}
			d.raw("}");
		}
		if (0 < segment.transferOut.length) {
			d.raw("{");
			d.graphSpec({ comment: "Transfer Out Section", rank: "same" });

			const markers = segment.transferOut;
			const nodeProperties = computeNodeProperties(
				true,
				markers[0].timestamp,
				markers[0].title,
				new Set([markers[0].timeline]),
			);
			d.node(markers[0].title, nodeProperties);
			let previous: string | undefined;
			let markersDrawn = 0;
			for (
				let linkedEventIndex = 1;
				linkedEventIndex < markers.length;
				++linkedEventIndex
			) {
				const style = getStyle(markers[linkedEventIndex].timeline);
				if (!style.link) {
					markers[linkedEventIndex].omitted = true;
					continue;
				}
				const nodeProperties = computeNodeProperties(
					true,
					markers[linkedEventIndex].timestamp,
					markers[linkedEventIndex].title,
					new Set([markers[linkedEventIndex].timeline]),
				);
				d.node(markers[linkedEventIndex].title, nodeProperties);
				++markersDrawn;
				if (previous !== undefined) {
					d.link(previous, markers[linkedEventIndex].title, {
						comment: "Marker Section Link",
						style: options.debug ? "dashed" : "invis",
						weight: 1_000_000,
					});
				}
				previous = markers[linkedEventIndex].title;
			}
			if (markersDrawn === 0) {
				const nodeProperties = computeNodeProperties(
					true,
					markers[0].timestamp,
					markers[0].title,
					new Set([markers[0].timeline]),
				);
				d.node(markers[0].title, nodeProperties);
				markers[0].omitted = false;
			}
			d.raw("}");
		}
		//#endregion

		//#region Render Events
		/*
		 * We iterate over each unique timestamp that exists globally.
		 * For each unique timestamp, we want to look at all global events that
		 * exist at this timestamp.
		 */
		let previousEvents: Array<PlanEvent<TTimelines>> | undefined;
		for (const timestamp of timestampsSegment) {
			eventIndex = 0;

			/*
			 * We now iterate over all global events at the current timestamp.
			 * These events should appear next to each other in the graph.
			 */
			const eventsAtTimestamp = segment.events.filter(
				(_) => _.timestamp === timestamp,
			);

			const eventTitles = new Map<string, PlanEvent<TTimelines>>(
				eventsAtTimestamp.map((event) => [event.title, event]),
			);

			/*
			 * Unique titles are unique events.
			 * We want to render a single node for each of these events.
			 * The events might appear in multiple timelines.
			 */
			for (const title of new Set(eventTitles.keys())) {
				// Remember which timelines contribute to the event.
				const contributors = new Set<TTimelines>();
				// Remember the contributor with the highest rank.
				let leader: TTimelines | undefined;
				const transfersIn = new Array<
					[TransferMarker<TTimelines>, PlanEvent<TTimelines>]
				>();
				const transfersOut = new Array<
					[TransferMarker<TTimelines>, PlanEvent<TTimelines>]
				>();

				/*
				 * Now we go through all events on this timestamp again,
				 * to find the timelines which have this event.
				 */
				for (const event of eventsAtTimestamp) {
					if (event.title !== title) {
						continue;
					}

					contributors.add(event.timeline);

					const timelineSegmentEvents = segment.events.filter(
						(_) => _.timeline === event.timeline,
					);

					const transferIn = segment.transferIn.find(
						(_) => _.timeline === event.timeline,
					);
					if (
						transferIn &&
						timelineSegmentEvents[0].timestamp === event.timestamp
					) {
						transfersIn.push([transferIn, event]);
					}
					const transferOut = segment.transferOut.find(
						(_) => _.timeline === event.timeline,
					);
					if (
						transferOut &&
						timelineSegmentEvents[timelineSegmentEvents.length - 1]
							.timestamp === event.timestamp
					) {
						transfersOut.push([transferOut, event]);
					}

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

				const nodeProperties = computeNodeProperties(
					false,
					timestamp,
					title,
					contributors,
					leader,
				);
				d.node(title, nodeProperties);

				if (0 < transfersIn.length) {
					const availableTransferMarker = segment.transferIn.filter(
						(_) => _.omitted !== true,
					);
					for (const [transferMarker, event] of transfersIn) {
						const timelineStyle = getStyle(event.timeline);
						// If a timeline is generally not linked, it still needs
						// an invisible "transfer in" link. Without this link,
						// the events would appear above the transfer marker section
						// in the resulting graph.
						if (event.generated || timelineStyle.link === false) {
							if (availableTransferMarker.length === 0) {
								throw new Error("no transfer markers available");
							}
							// We don't want to use the actual transfer marker for the
							// timeline, because this would require us to have hundreds
							// of transfer markers, for invisible edges.
							// Instead, we just order below the transfer marker in the middle.
							const substituteMarker =
								availableTransferMarker[
									Math.trunc(availableTransferMarker.length / 2)
								];
							d.link(substituteMarker.title, title, {
								class: classes.get(event.timeline.meta.id),
								comment: "Link from Transfer In (Order Only, Substitute)",
								skipDraw: !isTimestampInRange(timestamp),
								style: "invis",
								tailport: "s",
							});
							continue;
						}
						d.link(transferMarker.title, title, {
							class: classes.get(event.timeline.meta.id),
							color: rgbaToHexString(timelineStyle.pencolor),
							comment: "Link from Transfer In",
							penwidth: timelineStyle.penwidth,
							skipDraw: !isTimestampInRange(timestamp),
							style: timelineStyle.link || undefined,
							tailport: "s",
						});
					}
				}

				if (0 < transfersOut.length) {
					const availableTransferMarker = segment.transferOut.filter(
						(_) => _.omitted !== true,
					);
					for (const [transferMarker, event] of transfersOut) {
						const timelineStyle = getStyle(event.timeline);
						if (event.generated || timelineStyle.link === false) {
							if (availableTransferMarker.length === 0) {
								throw new Error("no transfer markers available");
							}
							const substituteMarker =
								availableTransferMarker[
									Math.trunc(availableTransferMarker.length / 2)
								];
							d.link(title, substituteMarker.title, {
								class: classes.get(event.timeline.meta.id),
								comment: "Link to Transfer Out (Order Only, Substitute)",
								headport: "n",
								skipDraw: !isTimestampInRange(timestamp),
								style: "invis",
							});
							continue;
						}
						d.link(title, transferMarker.title, {
							class: classes.get(event.timeline.meta.id),
							color: rgbaToHexString(timelineStyle.pencolor),
							comment: "Link to Transfer Out",
							headport: "n",
							arrowhead: "none",
							penwidth: timelineStyle.penwidth,
							skipDraw: !isTimestampInRange(timestamp),
							style: timelineStyle.link || undefined,
						});
					}
				}

				if (previousEvents !== undefined) {
					for (const previousEvent of previousEvents) {
						d.link(previousEvent.title, title, {
							comment: "All Event Link",
							skipDraw: !isTimestampInRange(timestamp),
							style: "invis",
						});
					}
				}

				if (nodeProperties.id !== undefined) {
					for (const _ of contributors) {
						idMesh.get(_)?.push(nodeProperties.id);
					}
				}
			}

			previousEvents = eventsAtTimestamp;
		}
		//#endregion

		//#region Link Timeline Events
		// Link items in their individual timelines together.
		for (const timeline of timelinesSegment) {
			const style = getStyle(timeline);

			if (style.link === false) {
				continue;
			}

			// The timestamp we looked at during the last iteration.
			let previousTimestamp: number | undefined;
			// The entries at the previous timestamp.
			let previousEntries = new Array<PlanEvent<TTimelines>>();
			// How many milliseconds passed since the previous timestamp.
			let timePassed = 0;

			const eventsInSegment = segment.events.filter(
				(_) => _.timeline.meta.id === timeline.meta.id,
			);
			const eventTimesInSegment = eventsInSegment.map((_) => _.timestamp);

			for (const timestamp of eventTimesInSegment) {
				if (previousTimestamp && timestamp <= previousTimestamp) {
					continue;
				}

				timePassed = previousTimestamp
					? Math.max(1, timestamp - previousTimestamp)
					: 0;

				// We need to remember these for the next timestamp iteration.
				const linkableEvents = new Array<PlanEvent<TTimelines>>();

				const eventsAtTimestamp = eventsInSegment.filter(
					(_) =>
						(_.index !== undefined
							? timeline.records[_.index][0]
							: mustExist(_.timestamp)) === timestamp,
				);

				for (const event of eventsAtTimestamp) {
					const _timelineWeight = segment.weights.get(event.timeline);

					linkableEvents.push(event);

					for (const previousEntry of previousEntries) {
						if (previousEntry.generated && event.generated) {
							continue;
						}

						d.link(previousEntry.title, event.title, {
							class: classes.get(event.timeline.meta.id),
							color: rgbaToHexString(style.pencolor),
							comment: "Intra-Timeline Link",
							penwidth: style.penwidth,
							skipDraw: !isTimestampInRange(timestamp),
							style: style.link,
							tooltip: `${renderMilliseconds(timePassed)} vergangen`,
						});
					}
				}

				previousTimestamp = timestamp;
				previousEntries = linkableEvents;
			}
		}
		//#endregion

		d.raw("}");
		graphSegments.push({
			graph: d.toString(),
			start: segment.timestamps[0],
			end: segment.timestamps[segment.timestamps.length - 1],
		});
	}

	return {
		graph: graphSegments,
		timelineClasses: new Map(
			classes
				.entries()
				.map(([id, className]) => [
					mustExist(timelines.find((_) => _.meta.id === id)),
					className,
				]),
		),
		timelineIds: idMesh,
	};
};
