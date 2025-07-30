import type { Shape } from "./dot.js";

export interface Style {
	fill: boolean;
	outline: boolean;
	link: boolean;
	penwidth: number;
	shape: Shape;
	style?: Array<string>;
}

export const DEFAULT_STYLES: Array<Style> = [
	{
		fill: false,
		outline: false,
		link: false,
		penwidth: 0,
		shape: "plaintext",
	},
	{
		fill: false,
		outline: true,
		link: false,
		penwidth: 0.5,
		shape: "box",
		style: ["dashed", "rounded"],
	},
	{
		fill: false,
		outline: true,
		link: false,
		penwidth: 1,
		shape: "box",
		style: ["dashed", "rounded"],
	},
	{
		fill: false,
		outline: true,
		link: false,
		penwidth: 1,
		shape: "box",
		style: ["solid", "rounded"],
	},
	{
		fill: false,
		outline: true,
		link: true,
		penwidth: 1,
		shape: "box",
		style: ["solid", "rounded"],
	},
	{
		fill: true,
		outline: true,
		link: true,
		penwidth: 1,
		shape: "box",
		style: ["solid", "rounded", "filled"],
	},
];
export const STYLE_TRANSFER_MARKER: Style = {
	fill: false,
	link: true,
	outline: false,
	penwidth: 1,
	shape: "box",
	style: ["solid"],
};
export const STYLE_TRANSPARENT = 0;
export const STYLE_VISIBLE = 1;
export const STYLE_INFO = 2;
export const STYLE_NOTICE = 3;
export const STYLE_FOLLOW = 4;
export const STYLE_LEADER = DEFAULT_STYLES.length - 1;

export const styles = (ranksUsed: Array<number>) => {
	const ranks = [
		...ranksUsed
			.reduce((_, rank) => {
				_.add(rank ?? 0);
				return _;
			}, new Set<number>())
			.values(),
	].sort((a, b) => a - b);

	const styles = new Array<Style>();
	switch (ranks.length) {
		case 0:
			break;
		case 1:
			styles.push(DEFAULT_STYLES[STYLE_LEADER]);
			break;
		case 2:
			styles.push(DEFAULT_STYLES[STYLE_NOTICE], DEFAULT_STYLES[STYLE_LEADER]);
			break;
		case 3:
			styles.push(
				DEFAULT_STYLES[STYLE_INFO],
				DEFAULT_STYLES[STYLE_NOTICE],
				DEFAULT_STYLES[STYLE_LEADER],
			);
			break;
		case 4:
			styles.push(
				DEFAULT_STYLES[STYLE_TRANSPARENT],
				DEFAULT_STYLES[STYLE_INFO],
				DEFAULT_STYLES[STYLE_NOTICE],
				DEFAULT_STYLES[STYLE_LEADER],
			);
			break;
		case 5:
			styles.push(
				DEFAULT_STYLES[STYLE_TRANSPARENT],
				DEFAULT_STYLES[STYLE_INFO],
				DEFAULT_STYLES[STYLE_NOTICE],
				DEFAULT_STYLES[STYLE_FOLLOW],
				DEFAULT_STYLES[STYLE_LEADER],
			);
			break;
		case 6:
			styles.push(
				DEFAULT_STYLES[STYLE_TRANSPARENT],
				DEFAULT_STYLES[STYLE_VISIBLE],
				DEFAULT_STYLES[STYLE_INFO],
				DEFAULT_STYLES[STYLE_NOTICE],
				DEFAULT_STYLES[STYLE_FOLLOW],
				DEFAULT_STYLES[STYLE_LEADER],
			);
			break;
		default:
			styles.push(
				DEFAULT_STYLES[STYLE_TRANSPARENT],
				DEFAULT_STYLES[STYLE_VISIBLE],
				DEFAULT_STYLES[STYLE_INFO],
				DEFAULT_STYLES[STYLE_NOTICE],
				DEFAULT_STYLES[STYLE_FOLLOW],
				DEFAULT_STYLES[STYLE_LEADER],
			);
			for (let extra = 6; extra < ranks.length; ++extra) {
				const style = { ...DEFAULT_STYLES[STYLE_LEADER] };
				style.penwidth += extra - 5;
				styles.push(style);
			}
	}

	const toStyleSheet = () => {
		return new Map<number, Style>(
			styles.map((style, index) => [ranks[index], style] as [number, Style]),
		);
	};

	return { styles, toStyleSheet };
};
