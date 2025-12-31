import { indent } from "@oliversalzburg/js-utils/data/string.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { TRANSPARENT } from "./constants.js";

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
export type EdgeStyle =
	| "bold"
	| "dashed"
	| "dotted"
	| "invis"
	| "solid"
	| "tapered";
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
export type RankDir = "LR" | "RL" | "TB" | "BT";
export type RankType = "same" | "min" | "source" | "max" | "sink";
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

export interface EdgeProperties {
	arrowhead: Arrow;
	arrowtail: Arrow;
	class: string;
	color: Color;
	comment: string;
	constraint: boolean;
	edgetooltip: string;
	edgeURL: string;
	fillcolor: Color;
	fontcolor: Color;
	fontname: string;
	fontsize: number;
	headlabel: string;
	headport: PortPos;
	headtooltip: string;
	headURL: string;
	label: string;
	labeltooltip: string;
	labelfontcolor: Color;
	len: number;
	minlen: number;
	penwidth: number;
	samehead: string;
	sametail: string;
	skipDraw: boolean;
	style: EdgeStyle;
	tailclip: boolean;
	taillabel: string;
	tailport: PortPos;
	tailtooltip: string;
	tailURL: string;
	tooltip: string;
	URL: string;
	weight: number;
}
export interface GraphProperties {
	bgcolor: Color;
	comment: string;
	fontname: string;
	fontsize: number;
	label: string;
	rank: RankType;
	rankdir: RankDir;
	ranksep: number;
	skipDraw: boolean;
	tooltip: string;
}
export interface NodeProperties {
	class: string;
	color: Color;
	comment: string;
	fillcolor: Color;
	fixedsize: boolean | string;
	fontcolor: Color;
	fontname: string;
	fontsize: number;
	height: number;
	id: string;
	label: string;
	margin: number | string;
	ordering: "out" | "in";
	penwidth: number;
	peripheries: number;
	shape: Shape;
	skipDraw: boolean;
	style: NodeStyle | string;
	tooltip: string;
	ts: number;
	URL: string;
	width: number;
}

const makePropertyString = (
	properties: Record<string, boolean | number | string | undefined>,
	terminateLastAttribute = false,
) => {
	const entries = Object.entries(properties);
	const propertyString = entries
		.filter(([key, _]) => key !== "skipDraw" && _ !== undefined)
		.map(([key, _]) => {
			if (key === "label") {
				if (_ === "") {
					return 'label=""';
				}
				if (_ === " ") {
					return 'label=" "';
				}
				return `${key}=<${_}>`;
			}
			if (
				_?.toString().includes(" ") ||
				_?.toString().includes("#") ||
				_?.toString().includes("-") ||
				_?.toString().includes(",")
			) {
				return `${key}="${_}"`;
			}
			return `${key}=${_}`;
		})
		.sort()
		.join(",\n\t");
	return propertyString !== ""
		? `[${propertyString}${1 < entries.length && terminateLastAttribute ? "\n" : ""}]`
		: "";
};

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
	let buffer = new Array<string>();
	const nodeIds = new Map<string, number>();

	let indentation = 0;
	let nextNodeIndex = 0;

	const renderRaw = (_: string) => {
		const opens = _.endsWith("{");
		const closes = _ === "}";
		if (closes) {
			--indentation;
		}
		buffer.push(
			`${indent(_, indentation, "\t")}${!opens && !closes ? ";" : ""}`,
		);
		if (opens) {
			++indentation;
		}
	};

	const validateColorHex = (
		color: "color" | "fontcolor" | "fillcolor",
		options?: Partial<NodeProperties>,
	) => {
		if (
			options !== undefined &&
			color in options &&
			options[color] !== undefined &&
			options[color].length !== 9 &&
			options[color] !== TRANSPARENT
		) {
			throw new InvalidOperationError(
				`${color} is expected to have #RRGGBBAA format. received '${options.color}'`,
			);
		}
	};

	const renderGraphDefaults = (options?: Partial<GraphProperties>) => {
		if (options?.skipDraw !== true) {
			renderRaw(`graph ${makePropertyString({ ...options }, true)}`);
		}
	};
	const renderNodeDefaults = (options?: Partial<NodeProperties>) => {
		if (options?.skipDraw !== true) {
			renderRaw(
				`node ${makePropertyString({ label: "\\N", ...options }, true)}`,
			);
		}
	};
	const renderEdgeDefaults = (options?: Partial<EdgeProperties>) => {
		if (options?.skipDraw !== true) {
			renderRaw(`edge ${makePropertyString({ ...options }, true)}`);
		}
	};

	const renderNode = (_: string, options?: Partial<NodeProperties>) => {
		if (nodeIds.get(_)) {
			// Not re-rendering node with already seen title.
			return;
		}
		const id = ++nextNodeIndex;
		nodeIds.set(_, id);

		validateColorHex("color", options);

		if (options?.skipDraw !== true) {
			renderRaw(`${id}\t${makePropertyString({ label: _, ...options })}`);
		}
	};

	const renderLink = (
		a: string,
		b: string,
		options?: Partial<EdgeProperties>,
	) => {
		const aId = nodeIds.get(a);
		if (aId === undefined) {
			throw new InvalidOperationError(
				`Source Node with given title is unknown: '${a}'`,
			);
		}
		const bId = nodeIds.get(b);
		if (bId === undefined) {
			throw new InvalidOperationError(
				`Target Node with given title is unknown: '${b}'`,
			);
		}
		if (aId === bId) {
			throw new InvalidOperationError(
				`Can't link node with itself: '${a}' <-> '${b}'`,
			);
		}
		validateColorHex("color", options);

		if (options?.skipDraw !== true) {
			renderRaw(
				`${aId} -> ${bId}${options ? `\t${makePropertyString(options ?? {})}` : ""}`,
			);
		}
	};

	return {
		raw: renderRaw,
		graphSpec: renderGraphDefaults,
		node: renderNode,
		nodeSpec: renderNodeDefaults,
		link: renderLink,
		linkSpec: renderEdgeDefaults,
		toString: () => buffer.join("\n"),
		clear: () => {
			buffer = new Array<string>();
			indentation = 0;
		},
		has: (id: string) => nodeIds.has(id),
	};
};
