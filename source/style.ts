import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { hslPalette } from "@oliversalzburg/js-utils/graphics/palette.js";
import { TRANSPARENT } from "./constants.js";
import type { EdgeStyle, NodeStyle, Shape } from "./dot.js";
import {
	type IdentityGraph,
	isIdentityLocation,
	isIdentityMedia,
	isIdentityPeriod,
	isIdentityPerson,
} from "./genealogy.js";
import {
	fillColorForPen,
	matchFontColorTo,
	rgbaFromString,
	rgbaToString,
} from "./palette.js";
import type {
	MetaSectionAncestryRenderer,
	MetaSectionReferenceRenderer,
	RenderMode,
	RGBATuple,
	Timeline,
} from "./types.js";

export interface Style {
	fillcolor: RGBATuple;
	fontcolor: RGBATuple | typeof TRANSPARENT;
	link: false | EdgeStyle;
	pencolor: RGBATuple;
	penwidth: number;
	shape: Shape;
	style: Array<NodeStyle>;
}

export const StyleStatic: Style = {
	fillcolor: [0, 0, 0, 0],
	fontcolor: [160, 160, 160, 255],
	link: "dashed",
	pencolor: [160, 160, 160, 255],
	penwidth: 1,
	shape: "box",
	style: ["dotted"],
};
export const StyleSheetStatic: Map<string, Style> = new Map([
	["0", StyleStatic],
	["1", StyleStatic],
	["document", StyleStatic],
	["history", StyleStatic],
	["random", StyleStatic],
	["test", StyleStatic],
]);

export const STYLE_TRANSFER_MARKER: Style = {
	fillcolor: [0, 0, 0, 0],
	link: "invis",
	penwidth: 1,
	fontcolor: [0, 0, 0, 0],
	pencolor: [0, 0, 0, 0],
	shape: "rect",
	style: ["solid"],
};
export const STYLE_UNBOUND_MEDIA: Style = {
	fillcolor: [0, 0, 0, 0],
	link: "invis",
	penwidth: 1,
	fontcolor: [255, 0, 0, 0],
	pencolor: [255, 0, 0, 0],
	shape: "rect",
	style: [],
};

export interface PaletteFactory<
	TTimeline extends Timeline & {
		meta: MetaSectionAncestryRenderer | MetaSectionReferenceRenderer;
	},
> {
	demand: number;
	reduce: () => Map<TTimeline, RGBATuple>;
	slots: Array<{ color: string; timelines: Array<TTimeline> }>;
}
export class Styling<
	TTimeline extends Timeline & {
		meta: MetaSectionAncestryRenderer | MetaSectionReferenceRenderer;
	},
> {
	constructor(
		public readonly timelines: Array<TTimeline>,
		public readonly theme: RenderMode,
	) {}

	palette(): PaletteFactory<TTimeline> {
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

			// Unless explicitly colored, locations share the same palette slot.
			if (isIdentityLocation(timeline)) {
				add("$location", timeline);
				continue;
			}

			// Unless explicitly colored, media items should not be colored at all.
			if (isIdentityMedia(timeline)) {
				add(TRANSPARENT, timeline);
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
		return {
			reduce: () => {
				return new Map<TTimeline, RGBATuple>(
					slots.flatMap((slot) =>
						slot.timelines.map((_) => [_, rgbaFromString(slot.color)]),
					),
				);
			},
			demand,
			slots,
		};
	}

	styles(
		identityGraph: IdentityGraph<TTimeline>,
		hops: Map<string, number>,
		hopsMax?: number,
	): Map<string, Style> {
		const palette = this.palette().reduce();
		const styleSheet = new Map<string, Style>();

		const originTimeline = mustExist(
			this.timelines.find(
				(_) =>
					"identity" in _.meta && _.meta.identity?.id === identityGraph.origin,
			),
			`unable to find timeline for origin identity '${identityGraph.origin}'`,
		);
		const timelinesAntecedents =
			identityGraph.antecedents()?.map((_) =>
				mustExist(
					this.timelines.find(
						(timeline) =>
							"identity" in timeline.meta &&
							timeline.meta.identity?.id === _.id,
					),
					`identity graph references identity without registered timeline '${_.id}'`,
				),
			) ?? [];
		const timelinesDescendants =
			identityGraph.descendants()?.map((_) =>
				mustExist(
					this.timelines.find(
						(timeline) =>
							"identity" in timeline.meta &&
							timeline.meta.identity?.id === _.id,
					),
					`identity graph references identity without registered timeline '${_.id}'`,
				),
			) ?? [];
		const timelinesBloodline =
			identityGraph.bloodline()?.map((_) =>
				mustExist(
					this.timelines.find(
						(timeline) =>
							"identity" in timeline.meta &&
							timeline.meta.identity?.id === _.id,
					),
					`identity graph references identity without registered timeline '${_.id}'`,
				),
			) ?? [];
		const timelinesSiblings =
			identityGraph.siblings()?.map((_) =>
				mustExist(
					this.timelines.find(
						(timeline) =>
							"identity" in timeline.meta &&
							timeline.meta.identity?.id === _.id,
					),
					`identity graph references identity without registered timeline '${_.id}'`,
				),
			) ?? [];
		const maxHopsForStyling = Math.min(
			5,
			hopsMax !== undefined && Number.isFinite(hopsMax)
				? hopsMax
				: hops
						.values()
						.reduce(
							(best, _) => (Number.isFinite(_) && best < _ ? _ : best),
							0,
						),
		);

		// Set origin style.
		styleSheet.set(originTimeline.meta.id, {
			fillcolor: fillColorForPen(
				mustExist(palette.get(originTimeline)),
				this.theme,
			),
			fontcolor: matchFontColorTo(mustExist(palette.get(originTimeline))),
			link: "bold",
			pencolor: mustExist(palette.get(originTimeline)),
			penwidth: 5,
			shape: "box",
			style: ["bold", "filled", "rounded"],
		});

		// Derive styles from genealogy information.
		for (const timeline of timelinesSiblings) {
			styleSheet.set(timeline.meta.id, {
				fillcolor: fillColorForPen(
					mustExist(palette.get(timeline)),
					this.theme,
				),
				fontcolor: matchFontColorTo(mustExist(palette.get(timeline))),
				link: "solid",
				pencolor: mustExist(palette.get(timeline)),
				penwidth: 4,
				shape: "box",
				style: ["filled", "rounded"],
			});
		}
		for (const timeline of timelinesAntecedents) {
			const penwidth =
				"identity" in timeline.meta
					? Math.max(
							1,
							5 -
								(mustExist(hops.get(mustExist(timeline.meta.identity).id)) /
									maxHopsForStyling) *
									5,
						)
					: 0;
			styleSheet.set(timeline.meta.id, {
				fillcolor: fillColorForPen(
					mustExist(palette.get(timeline)),
					this.theme,
				),
				fontcolor: matchFontColorTo(mustExist(palette.get(timeline))),
				link: "solid",
				pencolor: mustExist(palette.get(timeline)),
				penwidth,
				shape: "box",
				style: ["filled", "rounded"],
			});
		}
		for (const timeline of timelinesDescendants) {
			styleSheet.set(timeline.meta.id, {
				fillcolor: fillColorForPen(
					mustExist(palette.get(timeline)),
					this.theme,
				),
				fontcolor: matchFontColorTo(mustExist(palette.get(timeline))),
				link: "solid",
				pencolor: mustExist(palette.get(timeline)),
				penwidth:
					"identity" in timeline.meta
						? Math.max(
								1,
								5 - mustExist(hops.get(mustExist(timeline.meta.identity).id)),
							)
						: 0,
				shape: "box",
				style: ["filled", "rounded"],
			});
		}
		for (const timeline of timelinesBloodline) {
			if (styleSheet.has(timeline.meta.id)) {
				continue;
			}
			styleSheet.set(timeline.meta.id, {
				fillcolor: fillColorForPen(
					mustExist(palette.get(timeline)),
					this.theme,
				),
				fontcolor: matchFontColorTo(mustExist(palette.get(timeline))),
				link: "dashed",
				pencolor: mustExist(palette.get(timeline)),
				penwidth: 1,
				shape: "box",
				style: ["dashed", "rounded"],
			});
		}

		// Generate styles for unrelated person identities.
		for (const timeline of this.timelines) {
			if (styleSheet.has(timeline.meta.id)) {
				continue;
			}
			if (!isIdentityPerson(timeline)) {
				continue;
			}

			// Completely unrelated identities are expected to have infinite hops.
			const identityHops =
				"identity" in timeline.meta
					? mustExist(hops.get(mustExist(timeline.meta.identity).id))
					: Number.POSITIVE_INFINITY;
			// A finite amount of hops indicates a link beyond family relations.
			if (Number.isFinite(identityHops)) {
				// These identities are treated like cousins.
				styleSheet.set(timeline.meta.id, {
					fillcolor: fillColorForPen(
						mustExist(palette.get(timeline)),
						this.theme,
					),
					fontcolor: matchFontColorTo(mustExist(palette.get(timeline))),
					link: "solid",
					pencolor: mustExist(palette.get(timeline)),
					penwidth: 1,
					shape: "box",
					style: ["filled", "rounded"],
				});
				continue;
			}

			styleSheet.set(timeline.meta.id, {
				fillcolor: fillColorForPen(
					mustExist(palette.get(timeline)),
					this.theme,
				),
				fontcolor: matchFontColorTo(mustExist(palette.get(timeline))),
				link: timeline.meta.generated === true ? false : "dotted",
				pencolor: mustExist(palette.get(timeline)),
				penwidth: 1,
				shape: "box",
				style: ["dotted", "rounded"],
			});
		}

		// Generate styles for all remaining timelines.
		for (const timeline of this.timelines) {
			if (styleSheet.has(timeline.meta.id)) {
				continue;
			}
			const pencolor = mustExist(palette.get(timeline));
			styleSheet.set(timeline.meta.id, {
				fillcolor: this.theme === "light" ? [255, 255, 255, 0] : [0, 0, 0, 0],
				fontcolor: matchFontColorTo(
					this.theme === "light" ? [255, 255, 255] : [0, 0, 0],
					pencolor[3] === 0 && isIdentityMedia(timeline) ? 128 : 255,
				),
				link: isIdentityPeriod(timeline) ? "dotted" : false,
				pencolor,
				penwidth: 1,
				shape: "box",
				style: ["dotted", "rounded"],
			});
		}

		return styleSheet;
	}
}
