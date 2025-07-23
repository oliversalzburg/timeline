import { indent } from "@oliversalzburg/js-utils/data/string.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";

export type Arrow =
	| "box"
	| "crow"
	| "diamond"
	| "dot"
	| "ediamond"
	| "empty"
	| "halfopen"
	| "inv"
	| "invdot"
	| "invempty"
	| "invodot"
	| "none"
	| "normal"
	| "obox"
	| "odiamond"
	| "odot"
	| "open"
	| "tee"
	| "vee";
export type Color = string;
export type NodeStyle =
	| "bold"
	| "dashed"
	| "diagonals"
	| "dotted"
	| "filled"
	| "invis"
	| "radial"
	| "rounded"
	| "solid"
	| "striped"
	| "wedged";
export type PortPos =
	| "n"
	| "ne"
	| "e"
	| "se"
	| "s"
	| "sw"
	| "w"
	| "nw"
	| "c"
	| "_";
export type Shape =
	| "assembly"
	| "box"
	| "box3d"
	| "cds"
	| "circle"
	| "component"
	| "cylinder"
	| "diamond"
	| "doublecircle"
	| "doubleoctagon"
	| "egg"
	| "ellipse"
	| "fivepoverhang"
	| "folder"
	| "hexagon"
	| "house"
	| "insulator"
	| "invhouse"
	| "invtrapezium"
	| "invtriangle"
	| "larrow"
	| "lpromoter"
	| "Mcircle"
	| "Mdiamond"
	| "Msquare"
	| "none"
	| "note"
	| "noverhang"
	| "octagon"
	| "oval"
	| "parallelogram"
	| "pentagon"
	| "plain"
	| "plaintext"
	| "point"
	| "polygon"
	| "primersite"
	| "promoter"
	| "proteasesite"
	| "proteinstab"
	| "rarrow"
	| "rect"
	| "rectangle"
	| "restrictionsite"
	| "ribosite"
	| "rnastab"
	| "rpromoter"
	| "septagon"
	| "signature"
	| "square"
	| "star"
	| "tab"
	| "terminator"
	| "threepoverhang"
	| "trapezium"
	| "triangle"
	| "tripleoctagon"
	| "underline"
	| "utr";

export interface LinkProperties {
	arrowhead: Arrow;
	arrowtail: Arrow;
	color: Color;
	constraint: boolean;
	edgetooltip: string;
	edgeURL: string;
	fillcolor: Color;
	fontcolor: Color;
	fontname: string;
	fontsize: number;
	headport: PortPos;
	headtooltip: string;
	headURL: string;
	label: string;
	labeltooltip: string;
	labelfontcolor: Color;
	minlen: number;
	penwidth: number;
	style: "bold" | "dashed" | "dotted" | "invis" | "solid" | "tapered";
	tailclip: boolean;
	tailport: PortPos;
	tailtooltip: string;
	tailURL: string;
	tooltip: string;
	URL: string;
	weight: number;
}
export interface NodeProperties {
	class: string;
	color: Color;
	fillcolor: Color;
	fixedsize: boolean;
	fontcolor: Color;
	fontname: string;
	fontsize: number;
	id: string;
	label: string;
	margin: number;
	penwidth: number;
	shape: Shape;
	style: NodeStyle | string;
	tooltip: string;
	URL: string;
	width: number;
}

const makePropertyString = (
	properties: Record<string, boolean | number | string>,
) =>
	Object.entries(properties)
		.filter(([_, value]) => value !== undefined)
		.map(([key, _]) => (key === "label" ? `${key}=<${_}>` : `${key}="${_}"`))
		.sort()
		.join("; ");

/**
 * Transforms a multi-line string into an HTML-like construct to be rendered by GraphViz.
 */
export const makeHtmlString = (_: string) =>
	`${_.replace(
		/[&<>'"]/g,
		(tag) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				"'": "&#39;",
				'"': "&quot;",
			})[tag] ?? "",
	).replaceAll(/\n|\\n/g, `<BR ALIGN="CENTER"/>`)}`;

/**
 * Provides helper constructs to render GraphViz graphs.
 */
export const dot = () => {
	const buffer = new Array<string>();
	const nodeIds = new Map<string, number>();

	let indentation = 0;
	let nextNodeIndex = 0;

	const renderRaw = (_: string) => {
		const opens = _.endsWith("{");
		const closes = _ === "}";
		if (closes) {
			--indentation;
		}
		buffer.push(`${indent(_, indentation)}${!opens && !closes ? ";" : ""}`);
		if (opens) {
			++indentation;
		}
	};

	const renderNode = (_: string, options?: Partial<NodeProperties>) => {
		if (nodeIds.get(_)) {
			// Not re-rendering node with already seen title.
			return;
		}
		const id = ++nextNodeIndex;
		nodeIds.set(_, id);
		renderRaw(
			`${id} [${makePropertyString({ label: makeHtmlString(_), ...options })};]`,
		);
	};

	const renderLink = (
		a: string,
		b: string,
		options?: Partial<LinkProperties>,
	) => {
		const aId = nodeIds.get(a);
		if (aId === undefined) {
			throw new InvalidOperationError(`Node with given title is unknown: ${a}`);
		}
		const bId = nodeIds.get(b);
		if (bId === undefined) {
			throw new InvalidOperationError(`Node with given title is unknown: ${b}`);
		}
		renderRaw(
			`${aId} -> ${bId}${options ? ` [${makePropertyString(options ?? {})};]` : ""}`,
		);
	};

	return {
		raw: renderRaw,
		node: renderNode,
		link: renderLink,
		toString: () => buffer.join("\n"),
	};
};
