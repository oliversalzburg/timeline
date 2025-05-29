import { indent } from "@oliversalzburg/js-utils/data/string.js";

export type Color = string;
export type PortPos = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" | "c" | "_";

export interface LinkProperties {
  arrowhead:
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
  color: Color;
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
    .map(([key, _]) => `${key}="${_}"`)
    .join("; ");

export const dot = () => {
  const buffer = new Array<string>();

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

  const renderNode = (_: string, options?: Partial<NodeProperties>) =>
    renderRaw(`"${_}" [${makePropertyString(options ?? { label: _ })};]`);

  const renderLink = (a: string, b: string, options?: Partial<LinkProperties>) =>
    renderRaw(`"${a}" -> "${b}"${options ? ` [${makePropertyString(options ?? {})};]` : ""}`);

  const renderAnnotation = (_: string, text: string) => {
    renderNode(`annotation${nextNodeIndex}`, {
      label: text,
      margin: 0.2,
      shape: "plaintext",
      style: "dotted",
    });

    renderLink(`annotation${nextNodeIndex}`, _, {
      arrowhead: "none",
      minlen: 0,
      penwidth: 0.5,
      style: "dotted",
      tailclip: false,
      weight: 0,
    });

    ++nextNodeIndex;
  };

  return {
    raw: renderRaw,
    node: renderNode,
    annotation: renderAnnotation,
    link: renderLink,
    toString: () => buffer.join("\n"),
  };
};
