import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { hslPalette } from "@oliversalzburg/js-utils/graphics/palette.js";
import { TRANSPARENT } from "./constants.js";
import type { EdgeStyle, NodeStyle, Shape } from "./dot.js";
import { rgbaToString } from "./palette.js";
import type { Identity, Timeline } from "./types.js";

export interface Style {
	fill: boolean;
	fillcolor: string;
	fontcolor: string;
	link: false | EdgeStyle;
	pencolor: string;
	penwidth: number;
	shape: Shape;
	style?: Array<NodeStyle>;
}

export const StyleStatic: Style = {
	fill: false,
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
	constructor(public timelines: Array<TTimeline>) {}

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
				continue;
			}
			const color = mustExist(flexibleColors.pop());
			slot.color = rgbaToString([...color, 255]);
		}
		return new Map<TTimeline, string>(
			slots.flatMap((slot) => slot.timelines.map((_) => [_, slot.color])),
		);
	}

	styles(): Map<TTimeline, Style> {
		const palette = this.palette();

		for (const timeline of this.timelines) {
			if (timeline.meta.rank !== undefined) {
			}
		}

		return new Map(
			this.timelines.map((timeline) => [
				timeline,
				{
					fill: false,
					fillcolor: TRANSPARENT,
					fontcolor: "#808080FF",
					link: "dashed",
					pencolor: mustExist(palette.get(timeline)),
					penwidth: 1,
					shape: "box",
					style: ["dotted"],
				},
			]),
		);
	}
}
