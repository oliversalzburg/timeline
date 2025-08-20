import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { hslPalette } from "@oliversalzburg/js-utils/graphics/palette.js";
import { TRANSPARENT } from "./constants.js";
import type { EdgeStyle, NodeStyle, Shape } from "./dot.js";
import type { Graph } from "./genealogy2.js";
import {
	fillColorForPen,
	matchFontColorTo,
	rgbaToString,
	rgbFromString,
	rgbToString,
} from "./palette.js";
import type { Identity, RenderMode, RGBTuple, Timeline } from "./types.js";

export interface Style {
	fillcolor: string;
	fontcolor: string;
	link: false | EdgeStyle;
	pencolor: string;
	penwidth: number;
	shape: Shape;
	style: Array<NodeStyle>;
}

export const StyleStatic: Style = {
	fillcolor: TRANSPARENT,
	fontcolor: "#808080FF",
	link: "dashed",
	pencolor: "#808080FF",
	penwidth: 1,
	shape: "box",
	style: ["dotted"],
};

export class Styling<
	TTimeline extends Timeline & {
		meta: { color?: string; identity?: Identity; rank?: number };
	},
> {
	constructor(
		public readonly timelines: Array<TTimeline>,
		public readonly theme: RenderMode,
	) {}

	palette() {
		const slots = new Array<{ color: string; timelines: Array<TTimeline> }>();
		const add = (color: string, timeline: TTimeline) => {
			let slot = slots.find((_) => _.color === color);
			if (slot === undefined) {
				slot = { color, timelines: [] };
				slots.push(slot);
			}
			slot.timelines.push(timeline);
		};

		for (const timeline of this.timelines) {
			if (typeof timeline.meta.color === "string") {
				add(timeline.meta.color, timeline);
				continue;
			}

			add(timeline.meta.id, timeline);
		}

		const demand = slots.reduce(
			(sum, slot) =>
				sum +
				(slot.color.startsWith("#") || slot.color === TRANSPARENT ? 0 : 1),
			0,
		);
		const flexibleColors = hslPalette(demand, 0, 0.4, 0.5);
		for (const slot of slots) {
			if (slot.color.startsWith("#") || slot.color === TRANSPARENT) {
				slot.color = rgbaToString(
					this.theme === "light" ? [255, 255, 255, 0] : [0, 0, 0, 0],
				);
				continue;
			}
			const color = mustExist(flexibleColors.pop());
			slot.color = rgbaToString([...color, 255]);
		}
		return new Map<TTimeline, RGBTuple>(
			slots.flatMap((slot) =>
				slot.timelines.map((_) => [_, rgbFromString(slot.color)]),
			),
		);
	}

	styles(identityGraph: Graph<TTimeline>): Map<string, Style> {
		const palette = this.palette();
		const styleSheet = new Map<string, Style>();

		const originTimeline = mustExist(
			this.timelines.find((_) => _.meta.identity?.id === identityGraph.origin),
		);
		const antecedentsTimelines =
			identityGraph
				.antecedents()
				?.map((_) =>
					mustExist(
						this.timelines.find(
							(timeline) => timeline.meta.identity?.id === _.id,
						),
					),
				) ?? [];
		const descendantsTimelines =
			identityGraph
				.descendants()
				?.map((_) =>
					mustExist(
						this.timelines.find(
							(timeline) => timeline.meta.identity?.id === _.id,
						),
					),
				) ?? [];
		const bloodlineTimelines =
			identityGraph
				.bloodline()
				?.map((_) =>
					mustExist(
						this.timelines.find(
							(timeline) => timeline.meta.identity?.id === _.id,
						),
					),
				) ?? [];
		const hops = identityGraph.calculateHopsFrom(identityGraph.origin, {
			allowChildHop: true,
			allowParentHop: true,
			allowMarriageHop: false,
		});
		const hopsMax = hops
			.values()
			.reduce((best, _) => (Number.isFinite(_) && best < _ ? _ : best), 0);

		styleSheet.set(originTimeline.meta.id, {
			fillcolor: rgbaToString(
				fillColorForPen(mustExist(palette.get(originTimeline)), this.theme),
			),
			fontcolor: rgbaToString(
				matchFontColorTo(mustExist(palette.get(originTimeline))),
			),
			link: "bold",
			pencolor: rgbToString(mustExist(palette.get(originTimeline))),
			penwidth: 5,
			shape: "box",
			style: ["bold", "filled", "rounded"],
		});

		for (const timeline of antecedentsTimelines) {
			styleSheet.set(timeline.meta.id, {
				fillcolor: rgbaToString(
					fillColorForPen(mustExist(palette.get(timeline)), this.theme),
				),
				fontcolor: rgbaToString(
					matchFontColorTo(mustExist(palette.get(timeline))),
				),
				link: "solid",
				pencolor: rgbToString(mustExist(palette.get(timeline))),
				penwidth: Math.max(
					1,
					5 -
						(mustExist(hops.get(mustExist(timeline.meta.identity).id)) /
							hopsMax) *
							5,
				),
				shape: "box",
				style: ["filled", "rounded"],
			});
		}
		for (const timeline of descendantsTimelines) {
			styleSheet.set(timeline.meta.id, {
				fillcolor: rgbaToString(
					fillColorForPen(mustExist(palette.get(timeline)), this.theme),
				),
				fontcolor: rgbaToString(
					matchFontColorTo(mustExist(palette.get(timeline))),
				),
				link: "solid",
				pencolor: rgbToString(mustExist(palette.get(timeline))),
				penwidth: Math.max(
					1,
					5 - mustExist(hops.get(mustExist(timeline.meta.identity).id)),
				),
				shape: "box",
				style: ["filled", "rounded"],
			});
		}
		for (const timeline of bloodlineTimelines) {
			if (styleSheet.has(timeline.meta.id)) {
				continue;
			}
			styleSheet.set(timeline.meta.id, {
				fillcolor: rgbaToString(
					fillColorForPen(mustExist(palette.get(timeline)), this.theme),
				),
				fontcolor: rgbaToString(
					matchFontColorTo(mustExist(palette.get(timeline))),
				),
				link: "dashed",
				pencolor: rgbToString(mustExist(palette.get(timeline))),
				penwidth: 1,
				shape: "box",
				style: ["dashed", "rounded"],
			});
		}
		for (const timeline of this.timelines) {
			if (styleSheet.has(timeline.meta.id)) {
				continue;
			}
			if ("identity" in timeline.meta === false) {
				continue;
			}

			styleSheet.set(timeline.meta.id, {
				fillcolor: rgbaToString(
					fillColorForPen(mustExist(palette.get(timeline)), this.theme),
				),
				fontcolor: rgbaToString(
					matchFontColorTo(mustExist(palette.get(timeline))),
				),
				link: "dotted",
				pencolor: rgbToString(mustExist(palette.get(timeline))),
				penwidth: 1,
				shape: "box",
				style: ["dotted", "rounded"],
			});
		}

		for (const timeline of this.timelines) {
			if (styleSheet.has(timeline.meta.id)) {
				continue;
			}
			styleSheet.set(timeline.meta.id, {
				fillcolor: rgbaToString(
					this.theme === "light" ? [255, 255, 255, 0] : [0, 0, 0, 0],
				),
				fontcolor: rgbaToString(
					matchFontColorTo(
						this.theme === "light" ? [255, 255, 255] : [0, 0, 0],
					),
				),
				link: false,
				pencolor: rgbToString(mustExist(palette.get(timeline))),
				penwidth: 1,
				shape: "box",
				style: ["dotted", "rounded"],
			});
		}

		return styleSheet;
	}
}
