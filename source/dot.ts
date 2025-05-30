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
export type PortPos = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" | "c" | "_";

export interface LinkProperties {
  arrowhead: Arrow;
  arrowtail: Arrow;
  color: Color;
  constraint: boolean;
  fillcolor: Color;
  fontcolor: Color;
  fontname: string;
  fontsize: number;
  headport: PortPos;
  label: string;
  labelfontcolor: Color;
  minlen: number;
  penwidth: number;
  style: "bold" | "dashed" | "dotted" | "invis" | "solid" | "tapered";
  tailclip: boolean;
  tailport: PortPos;
  weight: number;
}
export interface NodeProperties {
  color: Color;
  fillcolor: Color;
  fontcolor: Color;
  fontname: string;
  fontsize: number;
  label: string;
  margin: number;
  shape: "egg" | "ellipse" | "box" | "point" | "plain" | "plaintext";
  style: "bold" | "dashed" | "dotted" | "invis" | "solid";
}

const makePropertyString = (properties: Record<string, boolean | number | string>) =>
  Object.entries(properties)
    .map(([key, _]) => (key === "label" ? `${key}=<${_}>` : `${key}="${_}"`))
    .sort()
    .join("; ");

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

  const toHtmlString = (_: string) => `<TABLE ALIGN="CENTER" BORDER="0" CELLBORDER="0" CELLPADDING="0" CELLSPACING="0"><TR><TD ALIGN="TEXT" CELLPADDING="0" CELLSPACING="0">${_.replaceAll(/\n|\\n/g, `<BR ALIGN="CENTER"/>`)}</TD></TR></TABLE>`;

  const renderNode = (_: string, options?: Partial<NodeProperties>) => {
    if (nodeIds.get(_)) {
      // Not re-rendering node with already seen title.
      return;
    }
    const id = ++nextNodeIndex;
    nodeIds.set(_, id);
    renderRaw(`${id} [${makePropertyString({ label: toHtmlString(_), ...options })};]`);
  };

  const renderLink = (a: string, b: string, options?: Partial<LinkProperties>) => {
    const aId = nodeIds.get(a);
    if (aId === undefined) {
      throw new InvalidOperationError(`Node with given title is unknown: ${a}`);
    }
    const bId = nodeIds.get(b);
    if (bId === undefined) {
      throw new InvalidOperationError(`Node with given title is unknown: ${b}`);
    }
    renderRaw(`${aId} -> ${bId}${options ? ` [${makePropertyString(options ?? {})};]` : ""}`);
  };

  const renderAnnotation = (_: string, text: string) => {
    const annotationId = nextNodeIndex;
    renderNode(`annotation${annotationId}`, {
      label: toHtmlString( text),
      margin: 0.2,
      shape: "plaintext",
      style: "dotted",
    });

    renderLink(`annotation${annotationId}`, _, {
      arrowhead: "none",
      constraint: false,
      penwidth: 0.5,
      style: "dotted",
      tailclip: false,
    });
  };

  return {
    raw: renderRaw,
    node: renderNode,
    annotation: renderAnnotation,
    link: renderLink,
    toString: () => buffer.join("\n"),
  };
};
