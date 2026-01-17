import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { hashCyrb53 } from "@oliversalzburg/js-utils/data/string.js";
import { FONT_NAME, FONT_SIZE_1000MM_V07_READ_PT } from "./constants.js";
import { dot, makeHtmlString, type NodeProperties } from "./dot.js";
import {
	isIdentityMedia,
	isIdentityPeriod,
	uncertainEventToDate,
	uncertainEventToDateString,
} from "./genealogy.js";
import { matchLuminance, rgbaToHexString } from "./palette.js";
import { type RendererMetaResult, renderMilliseconds } from "./renderer.js";
import { STYLE_TRANSFER_MARKER, type Style } from "./style.js";
import type {
	RenderMode,
	RGBATuple,
	TimelineAncestryRenderer,
	TimelineEntry,
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

export const renderEventAsNode = <
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
>(
	options: RendererOptions,
	classes: Map<string, string>,
	origin: Origin,
	timestamp: number,
	title: string,
	contributors: Set<TTimelines>,
	leader: TTimelines,
) => {
	const style = mustExist(
		options.styleSheet?.get(leader.meta.id),
		`missing style for '${leader.meta.id}'`,
	);
	const contributorClasses = [
		...contributors.values().map((_) => classes.get(_.meta.id)),
	];
	const classList = ["event", ...contributorClasses];
	const color = style.pencolor;
	const fillcolors = contributors.values().reduce((fillColors, timeline) => {
		if (isIdentityMedia(timeline) || isIdentityPeriod(timeline)) {
			return fillColors;
		}

		const timelineStyle = mustExist(
			options.styleSheet?.get(timeline.meta.id),
			`missing style for '${timeline.meta.id}'`,
		);
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
				: matchLuminance(fill, style.fillcolor),
		);
		return fillColors;
	}, new Array<RGBATuple | "transparent">());
	const fontcolor = style.fontcolor;
	const prefixes = contributors
		.values()
		.reduce((_, timeline) => _ + (timeline.meta.prefix ?? ""), "");
	const dateString = options?.dateRenderer
		? options.dateRenderer(timestamp)
		: new Date(timestamp).toDateString();
	const label = `${0 < prefixes.length ? `${prefixes}\u00A0` : ""}${makeHtmlString(
		`${title}`,
	)}`;
	const timePassedSinceOrigin = timestamp - origin.timestamp;
	const timePassedSinceThen = options.now - timestamp;
	const tooltip = [
		`${dateString}\\n`,
		0 < timePassedSinceOrigin
			? `${renderMilliseconds(timePassedSinceOrigin)} seit ${origin.timestampString}\\n`
			: `${renderMilliseconds(timePassedSinceOrigin * -1)} bis ${origin.timestampString}\\n`,
		0 < timePassedSinceThen
			? `${renderMilliseconds(timePassedSinceThen)} bis ${origin.nowString}`
			: `${renderMilliseconds(timePassedSinceThen)} seit ${origin.nowString}`,
	].join("");
	const nodeProperties: Partial<NodeProperties> = {
		class: classList.join(" "),
		color: rgbaToHexString(color),
		fillcolor: style.style.includes("filled")
			? fillcolors.length === 1
				? rgbaToHexString(fillcolors[0])
				: `${rgbaToHexString(fillcolors[0])}:${rgbaToHexString(fillcolors[1])}`
			: undefined,
		fontcolor: rgbaToHexString(fontcolor),
		label,
		penwidth: style.penwidth,
		shape: style.shape,
		style: style.style.join(","),
		tooltip,
	};

	return nodeProperties;
};
export const renderTransferMarker = <
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
>(
	classes: Map<string, string>,
	contributors: Set<TTimelines>,
) => {
	const style = STYLE_TRANSFER_MARKER;
	const contributorClasses = [
		...contributors.values().map((_) => classes.get(_.meta.id)),
	];
	const classList = ["tx", ...contributorClasses];
	const label = " ";
	const nodeProperties: Partial<NodeProperties> = {
		class: classList.join(" "),
		color: rgbaToHexString(style.pencolor),
		comment: `Transfermarker for ${contributorClasses.join(",")}`,
		fillcolor: rgbaToHexString(style.fillcolor),
		fixedsize: true,
		fontcolor: rgbaToHexString(style.fontcolor),
		fontsize: 0,
		height: 0,
		label,
		penwidth: style.penwidth,
		shape: style.shape,
		style: style.style.join(","),
		width: 1,
	};

	return nodeProperties;
};

export interface Origin<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
> {
	now: number;
	nowString: string;
	timeline: TTimelines;
	timestamp: number;
	timestampString: string;
}

export const render = <
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
>(
	timelines: Array<TTimelines>,
	options: RendererOptions,
	_hops?: Map<string, number> | undefined,
): RendererMetaResult<TTimelines> => {
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

	let d = dotGraph();
	const graphSegments = new Array<{
		graph: string;
		start: number;
		end: number;
	}>();

	// Generate styling information
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
	const originTimestampString = mustExist(
		"identity" in origin.meta
			? uncertainEventToDateString(
					origin.meta.identity.born ?? origin.meta.identity.established,
					options.dateRenderer,
				)
			: "now",
	);
	const classes = new Map<string, string>(
		timelines.map((_) => [_.meta.id, `t${hashCyrb53(_.meta.id)}`]),
	);
	const idMesh = new Map<TTimelines, Array<string>>();
	for (const timeline of timelines) {
		idMesh.set(timeline, new Array<string>());
	}

	// Segment universe into frames
	type Frame = {
		readonly events: Map<string, Set<TTimelines>>;
		readonly records: Map<TTimelines, Array<TimelineEntry>>;
		readonly timelines: Set<TTimelines>;
	};
	const frames = new Map<number, Frame>();
	for (const timeline of timelines) {
		for (const [timestamp, entry] of timeline.records) {
			const frame: Frame = frames.get(timestamp) ?? {
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

	// Render frames
	const renderPlan = [...frames.entries()].sort(([a], [b]) => a - b);
	const frameCache: {
		frameTrailer: string | undefined;
		pendingConnect: Map<TTimelines, TimelineEntry>;
		previousFrameTrailer: string | undefined;
	} = {
		frameTrailer: undefined,
		pendingConnect: new Map<TTimelines, TimelineEntry>(),
		previousFrameTrailer: undefined,
	};

	let segmentStart = renderPlan[0][0];
	let segmentLength = 0;

	for (const [timestamp, frame] of renderPlan) {
		// Graph Segmenting
		if (options.segment !== undefined && options.segment < segmentLength) {
			if (0 < frameCache.pendingConnect.size) {
				d.raw("{");
				d.graphSpec({ comment: "Transfer Out Section", rank: "same" });
				let firstTransferMarker: string | undefined;
				let previousTransferMarker: string | undefined;
				for (const timeline of frameCache.pendingConnect.keys()) {
					const transferMarker = `TX-OUT-${timeline.meta.id}-${timestamp}`;
					firstTransferMarker ??= transferMarker;
					const nodeProperties = renderTransferMarker(
						classes,
						new Set([timeline]),
					);
					d.node(transferMarker, nodeProperties);
					if (previousTransferMarker !== undefined) {
						d.link(previousTransferMarker, transferMarker, {
							arrowhead: "none",
							color: "#FF0000FF",
							comment: "Transfer Marker Inter-Link",
							minlen: 7,
							weight: 1_000_000,
						});
					}
					previousTransferMarker = transferMarker;
				}
				d.raw("}");

				for (const timeline of frameCache.pendingConnect.keys()) {
					d.link(
						mustExist(frameCache.pendingConnect.get(timeline)).title,
						`TX-OUT-${timeline.meta.id}-${timestamp}`,
						{
							arrowhead: "none",
							class: classes.get(timeline.meta.id),
							color: "#FFFFFFFF",
							comment: `Link Records to Transfer Out in ${timeline.meta.id}`,
							headport: "n",
							minlen: 2,
							weight: 10,
						},
					);
				}
				if (frameCache.previousFrameTrailer !== undefined) {
					d.link(
						frameCache.previousFrameTrailer,
						mustExist(firstTransferMarker),
						{
							arrowhead: "open",
							color: "#0080FF80",
							comment: "Force Transfer Section to BOTTOM",
							style: "dotted",
							weight: 1,
						},
					);
				}
			}

			d.raw("}");
			graphSegments.push({
				graph: d.toString(),
				start: segmentStart,
				end: timestamp,
			});
			frameCache.previousFrameTrailer = undefined;

			d = dotGraph();
			segmentLength = 0;
			segmentStart = timestamp;
			if (0 < frameCache.pendingConnect.size) {
				d.raw("{");
				d.graphSpec({ comment: "Transfer In Section", rank: "same" });
				let previousTransferMarker: string | undefined;
				for (const timeline of frameCache.pendingConnect.keys()) {
					const transferCandidate = mustExist(
						frameCache.pendingConnect.get(timeline),
					);
					const transferMarker = `TX-IN-${timeline.meta.id}-${timestamp}`;
					const nodeProperties = renderTransferMarker(
						classes,
						new Set([timeline]),
					);
					d.node(transferMarker, nodeProperties);
					if (previousTransferMarker !== undefined) {
						d.link(previousTransferMarker, transferMarker, {
							arrowhead: "none",
							color: "#FF0000FF",
							comment: "Transfer Marker Inter-Link",
							minlen: 7,
							weight: 1_000_000,
						});
					}
					previousTransferMarker = transferMarker;
					frameCache.pendingConnect.set(timeline, {
						...transferCandidate,
						title: transferMarker,
					});
					frameCache.previousFrameTrailer = transferMarker;
				}
				d.raw("}");
			}
		}

		// Render Events
		const date = new Date(timestamp);
		let eventIndex = 0;
		d.raw("{");
		d.graphSpec({ comment: `Frame for ${date.toISOString()}`, rank: "same" });
		for (const [eventTitle, frameTimelines] of frame.events) {
			frameCache.frameTrailer ??= eventTitle;

			const nodeProperties = renderEventAsNode(
				options,
				classes,
				{
					now,
					nowString,
					timeline: origin,
					timestamp: originTimestamp,
					timestampString: originTimestampString,
				},
				timestamp,
				eventTitle,
				frameTimelines,
				[...frameTimelines.values()][0],
			);
			const id = `Z${date.getFullYear().toFixed().padStart(4, "0")}-${(date.getMonth() + 1).toFixed().padStart(2, "0")}-${date.getDate().toFixed().padStart(2, "0")}-${eventIndex++}`;
			d.node(eventTitle, { ...nodeProperties, id });

			for (const timeline of frameTimelines) {
				mustExist(idMesh.get(timeline)).push(id);
			}
		}

		const linksIn = new Set<string>();
		const linksOut = new Set<string>();
		for (const [timeline, timelineFrameRecords] of frame.records) {
			const style = mustExist(
				options.styleSheet?.get(timeline.meta.id),
				`missing style for '${timeline.meta.id}'`,
			);
			let previousRecord: TimelineEntry | undefined;
			for (const record of timelineFrameRecords) {
				if (previousRecord !== undefined) {
					if (style.link) {
						d.link(previousRecord.title, record.title, {
							class: classes.get(timeline.meta.id),
							color: "#FFFFFFFF",
							comment: `Link Records in ${timeline.meta.id}`,
							minlen: 2,
							tailport: previousRecord.title.startsWith("TX-IN-")
								? "s"
								: undefined,
							weight: 10,
						});
					} else {
						if (
							linksOut.has(previousRecord.title) ||
							linksIn.has(record.title)
						) {
							continue;
						}
						d.link(previousRecord.title, record.title, {
							arrowhead: "open",
							color: "#808000FF",
							comment: `Link Records in UNLINKED ${timeline.meta.id}`,
							minlen: 2,
							style: "solid",
							weight: 1_000,
						});
					}
					linksOut.add(previousRecord.title);
					linksIn.add(record.title);
				}
				previousRecord = record;
			}
		}

		let previousEventTitle: string | undefined;
		for (const [eventTitle] of frame.events) {
			if (
				previousEventTitle !== undefined &&
				previousEventTitle !== eventTitle &&
				!linksOut.has(previousEventTitle) &&
				!linksIn.has(eventTitle)
			) {
				d.link(previousEventTitle, eventTitle, {
					arrowhead: "open",
					color: "#808000FF",
					comment: `Link Events in UNLINKED timelines`,
					minlen: 2,
					style: "dashed",
					weight: 10,
				});
				linksOut.add(previousEventTitle);
				linksIn.add(eventTitle);
				previousEventTitle = undefined;
			}
			previousEventTitle = eventTitle;
		}
		d.raw("}");
		++segmentLength;

		// Inter-Frame

		for (const pending of frameCache.pendingConnect.keys()) {
			if (frame.timelines.has(pending)) {
				const entryPending = mustExist(frameCache.pendingConnect.get(pending));
				const entryFrame = mustExist(frame.records.get(pending)?.[0]);
				d.link(entryPending.title, entryFrame.title, {
					class: classes.get(pending.meta.id),
					color: "#FFFFFFFF",
					comment: `Link Records in ${pending.meta.id}`,
					minlen: 2,
					tailport: entryPending.title.startsWith("TX-IN-") ? "s" : undefined,
					weight: 10,
				});
				if (entryPending.title === frameCache.previousFrameTrailer) {
					frameCache.previousFrameTrailer = undefined;
				}
				frameCache.pendingConnect.delete(pending);
			}
		}
		if (
			frameCache.previousFrameTrailer !== undefined &&
			frameCache.frameTrailer !== undefined
		) {
			d.link(frameCache.previousFrameTrailer, frameCache.frameTrailer, {
				arrowhead: "open",
				color: "#0080FF80",
				comment: "Global Link Chain",
				style: "dashed",
				weight: 1,
			});
		}

		// Update frame cache
		for (const [timeline, entries] of frame.records) {
			const style = mustExist(
				options.styleSheet?.get(timeline.meta.id),
				`missing style for '${timeline.meta.id}'`,
			);
			const hasOnlyGeneratedEventsInFrame = !entries.some(
				(_) => _.generated !== true,
			);
			const eventIndexInTimeline = timeline.records.findIndex(
				([_]) => _ === timestamp,
			);
			const nextEventIsGenerated =
				eventIndexInTimeline < timeline.records.length - 1 &&
				timeline.records[eventIndexInTimeline + 1][1].generated === true;

			if (
				style.link &&
				timeline.records[timeline.records.length - 1][1] !==
					entries[entries.length - 1] &&
				!(hasOnlyGeneratedEventsInFrame && nextEventIsGenerated)
			) {
				frameCache.pendingConnect.set(timeline, entries[entries.length - 1]);
			}
		}
		frameCache.previousFrameTrailer = [...frame.events.keys()][0];
		frameCache.frameTrailer = undefined;
	}

	d.raw("}");

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
