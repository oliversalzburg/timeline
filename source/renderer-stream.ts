import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { hashCyrb53 } from "@oliversalzburg/js-utils/data/string.js";
import {
	FONT_NAME,
	FONT_SIZE_1000MM_V07_READ_PT,
	LABEL_PREFIX_GROUP,
	LABEL_PREFIX_SEPARATOR,
	LABEL_TITLE_SEPARATOR,
} from "./constants.js";
import {
	dot,
	type EdgeProperties,
	makeHtmlString,
	type NodeProperties,
} from "./dot.js";
import {
	isIdentityLocation,
	isIdentityMedia,
	isIdentityPeriod,
	isIdentityPerson,
	uncertainEventToDateDeterministic,
	uncertainEventToDateString,
} from "./genealogy.js";
import type { WeightedFrame, WeightedFramesGenerator } from "./index.js";
import { matchLuminance, rgbaToHexString } from "./palette.js";
import { type RendererOptions, rank, renderMilliseconds } from "./renderer.js";
import { STYLE_TRANSFER_MARKER, type Style } from "./style.js";
import type {
	RendererResultMetadata,
	RGBATuple,
	TimelineAncestryRenderer,
	TimelineEntry,
	TimelineMetadata,
	TimelineReferenceRenderer,
} from "./types.js";

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

		const fill = timelineStyle.fillcolor;
		// Ignore transparent fills.
		if (fill[3] === 0) {
			return fillColors;
		}

		fillColors.push(
			timeline === leader ? fill : matchLuminance(style.fillcolor, fill),
		);
		return fillColors;
	}, new Array<RGBATuple | "transparent">());
	const fontcolor = style.fontcolor;
	const prefixes = [
		...contributors
			.values()
			.filter((_) => typeof _.meta.prefix === "string")
			.map((_) => _.meta.prefix),
	].join(LABEL_PREFIX_GROUP);
	const dateString = options?.dateRenderer
		? options.dateRenderer(timestamp)
		: new Date(timestamp).toDateString();
	const label =
		"identity" in leader.meta &&
		leader.meta.identity !== undefined &&
		title.startsWith(leader.meta.identity.id)
			? `${0 < prefixes.length ? `${prefixes}${LABEL_PREFIX_SEPARATOR}` : ""}${makeHtmlString(
					`${title.replace(leader.meta.identity.id, `${leader.meta.identity.id}${LABEL_TITLE_SEPARATOR}`)}`,
				)}`
			: `${0 < prefixes.length ? `${prefixes}${LABEL_PREFIX_SEPARATOR}` : ""}${makeHtmlString(
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
export const renderLinkTransferMarker = (debug = false) => {
	const linkProperties: Partial<EdgeProperties> = debug
		? {
				arrowhead: "none",
				color: "#FF0000FF",
				comment: "Transfer Marker Inter-Link",
				minlen: 7,
				style: "solid",
				weight: 1_000_000,
			}
		: {
				comment: "Transfer Marker Inter-Link",
				minlen: 7,
				style: "invis",
				weight: 1_000_000,
			};
	return linkProperties;
};
export const renderLinkGlobal = (debug = false) => {
	const linkProperties: Partial<EdgeProperties> = debug
		? {
				arrowhead: "open",
				color: "#0080FF80",
				comment: "Global Link Chain",
				style: "dashed",
				weight: 1,
			}
		: {
				comment: "Global Link Chain",
				style: "invis",
				weight: 1,
			};
	return linkProperties;
};
export const renderLinkUnlinked = (debug = false) => {
	const linkProperties: Partial<EdgeProperties> = debug
		? {
				arrowhead: "open",
				color: "#808000FF",
				comment: `Link Events in UNLINKED timelines`,
				minlen: 2,
				style: "dashed",
				weight: 10,
			}
		: {
				comment: `Link Events in UNLINKED timelines`,
				minlen: 2,
				style: "invis",
				weight: 10,
			};
	return linkProperties;
};
export const renderLinkLinked = (classes: string, style: Style) => {
	const linkProperties: Partial<EdgeProperties> = {
		class: classes,
		color: rgbaToHexString(style.pencolor),
		comment: "Intra-Timeline Link",
		minlen: 2,
		penwidth: style.penwidth,
		style: style.link === false ? "invis" : style.link,
		weight: style.penwidth,
	};
	return linkProperties;
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
	frames: WeightedFramesGenerator<TTimelines>,
	hops?: Map<string, number> | undefined,
): RendererResultMetadata<TTimelines> => {
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
			? (uncertainEventToDateDeterministic(
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
	const idMesh = new Map<TTimelines, Array<string>>();
	for (const timeline of timelines) {
		idMesh.set(timeline, new Array<string>());
	}

	// Metadata to collect during rendering process
	const allEventsInGraph = new Map<number, Set<[string, string]>>();
	const allEventContributors = new Map<string, Set<TTimelines>>();

	// Render frames
	const frameCache: {
		frameTrailer: string | undefined;
		pendingConnect: Map<TTimelines, TimelineEntry>;
		previousFrameTrailer: string | undefined;
	} = {
		frameTrailer: undefined,
		pendingConnect: new Map<TTimelines, TimelineEntry>(),
		previousFrameTrailer: undefined,
	};

	let segmentStart: number | undefined;
	let segmentLength = 0;

	// Event index for events on the same date.
	let eventIndex = 0;
	let previousDateString = "";
	let previousFrame: WeightedFrame<TTimelines> | undefined;

	for (const frame of frames) {
		const timestamp = frame.timestamp;
		if (segmentStart === undefined) {
			segmentStart = timestamp;
		}
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
						d.link(
							previousTransferMarker,
							transferMarker,
							renderLinkTransferMarker(options.debug),
						);
					}
					previousTransferMarker = transferMarker;
				}
				d.raw("}");

				for (const timeline of frameCache.pendingConnect.keys()) {
					d.link(
						mustExist(frameCache.pendingConnect.get(timeline)).title,
						`TX-OUT-${timeline.meta.id}-${timestamp}`,
						{
							...renderLinkLinked(
								mustExist(classes.get(timeline.meta.id)),
								mustExist(options.styleSheet?.get(timeline.meta.id)),
							),
							arrowhead: "none",
							comment: `Link Records to Transfer Out in ${timeline.meta.id}`,
							headport: "n",
						},
					);
				}
				if (frameCache.previousFrameTrailer !== undefined) {
					d.link(
						frameCache.previousFrameTrailer,
						mustExist(firstTransferMarker),
						renderLinkGlobal(options.debug),
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
						d.link(
							previousTransferMarker,
							transferMarker,
							renderLinkTransferMarker(options.debug),
						);
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
		const dateString = `${date.getFullYear().toFixed().padStart(4, "0")}-${(date.getMonth() + 1).toFixed().padStart(2, "0")}-${date.getDate().toFixed().padStart(2, "0")}`;
		if (dateString !== previousDateString) {
			eventIndex = 0;
		}

		allEventsInGraph.set(timestamp, new Set<[string, string]>());
		d.raw("{");
		d.graphSpec({
			comment: `Frame for ${date.valueOf()} (${date.toISOString()})`,
			rank: "same",
		});
		for (const [eventTitle, eventTimelines] of frame.content.events) {
			frameCache.frameTrailer ??= eventTitle;

			const leader = [...eventTimelines.values()].sort(
				(a, b) =>
					mustExist(ranks.get(b.meta.id)) - mustExist(ranks.get(a.meta.id)),
			)[0];
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
				eventTimelines,
				leader,
			);
			const id = `Z${date.getFullYear().toFixed().padStart(4, "0")}-${(date.getMonth() + 1).toFixed().padStart(2, "0")}-${date.getDate().toFixed().padStart(2, "0")}-${eventIndex++}`;
			d.node(eventTitle, {
				...nodeProperties,
				id,
				comment: [
					...eventTimelines
						.values()
						.map(
							(_) =>
								`${_.meta.id ?? classes.get(_.meta.id)}:${frame.weights.get(_)}`,
						),
				].join(", "),
			});
			mustExist(allEventsInGraph.get(timestamp)).add([id, eventTitle]);
			allEventContributors.set(eventTitle, eventTimelines);

			for (const timeline of eventTimelines) {
				mustExist(idMesh.get(timeline)).push(id);
			}
		}

		const linksIn = new Set<string>();
		const linksOut = new Set<string>();
		for (const [timeline, timelineFrameRecords] of frame.content.records) {
			const style = mustExist(
				options.styleSheet?.get(timeline.meta.id),
				`missing style for '${timeline.meta.id}'`,
			);
			let previousRecord: TimelineEntry | undefined;
			for (const record of timelineFrameRecords) {
				if (previousRecord !== undefined) {
					if (style.link) {
						d.link(previousRecord.title, record.title, {
							...renderLinkLinked(
								mustExist(classes.get(timeline.meta.id)),
								mustExist(options.styleSheet?.get(timeline.meta.id)),
							),
							comment: `Intra-Timeline Link for ${timeline.meta.id}`,
							tailport: previousRecord.title.startsWith("TX-IN-")
								? "s"
								: undefined,
						});
					} else {
						if (
							linksOut.has(previousRecord.title) ||
							linksIn.has(record.title)
						) {
							continue;
						}
						d.link(
							previousRecord.title,
							record.title,
							renderLinkUnlinked(options.debug),
						);
					}
					linksOut.add(previousRecord.title);
					linksIn.add(record.title);
				}
				previousRecord = record;
			}
		}

		let previousEventTitle: string | undefined;
		for (const [eventTitle] of frame.content.events) {
			if (
				previousEventTitle !== undefined &&
				previousEventTitle !== eventTitle &&
				!linksOut.has(previousEventTitle) &&
				!linksIn.has(eventTitle)
			) {
				d.link(
					previousEventTitle,
					eventTitle,
					renderLinkUnlinked(options.debug),
				);
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
			if (frame.content.timelines.has(pending)) {
				const entryPending = mustExist(frameCache.pendingConnect.get(pending));
				const entryFrame = mustExist(frame.content.records.get(pending)?.[0]);
				d.link(entryPending.title, entryFrame.title, {
					...renderLinkLinked(
						mustExist(classes.get(pending.meta.id)),
						mustExist(options.styleSheet?.get(pending.meta.id)),
					),
					comment: `Intra-Timeline Link for ${pending.meta.id}`,
					tailport: entryPending.title.startsWith("TX-IN-") ? "s" : undefined,
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
			d.link(
				frameCache.previousFrameTrailer,
				frameCache.frameTrailer,
				renderLinkGlobal(options.debug),
			);
		}

		// Update frame cache
		for (const [timeline, entries] of frame.content.records) {
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
		frameCache.previousFrameTrailer = [...frame.content.events.keys()][0];
		frameCache.frameTrailer = undefined;

		previousDateString = dateString;
		previousFrame = frame;
	}

	d.raw("}");
	graphSegments.push({
		graph: d.toString(),
		start: mustExist(segmentStart),
		end: mustExist(previousFrame).timestamp,
	});

	const timelineMetaMap = new Map(
		timelines.map((_) => {
			const style = mustExist(options.styleSheet.get(_.meta.id));
			return [
				_,
				[
					mustExist(classes.get(_.meta.id)),
					rgbaToHexString(style.pencolor),
					rgbaToHexString(style.fillcolor),
					isIdentityPerson(_)
						? 1
						: isIdentityLocation(_)
							? 2
							: isIdentityMedia(_)
								? 3
								: 0,
					"identity" in _.meta ? _.meta.identity.id : _.meta.id,
					"identity" in _.meta
						? (_.meta.identity.name ?? _.meta.identity.id)
						: _.meta.id,
				] as TimelineMetadata,
			];
		}),
	);
	return {
		contributors: allEventContributors,
		events: allEventsInGraph,
		origin: mustExist(timelineMetaMap.get(origin)),
		timelines: timelineMetaMap,
		graph: graphSegments,
	};
};
