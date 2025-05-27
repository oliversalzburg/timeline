import { indent } from "@oliversalzburg/js-utils/data/string.js";

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
  fontname: string;
  fontsize: number;
  headport: PortPos;
  label: string;
  minlen: number;
  penwidth: number;
  style: "bold" | "dashed" | "dotted" | "invis" | "solid" | "tapered";
  tailclip: boolean;
  tailport: PortPos;
  weight: number;
}
export interface NodeProperties {
  fontname: string;
  fontsize: number;
  label: string;
  margin: number;
  shape: "egg" | "ellipse" | "box" | "point" | "plain" | "plaintext";
  style: "bold" | "dashed" | "dotted" | "invis" | "solid";
}

export const dot = () => {
  const buffer = new Array<string>();

  let indentation = 0;
  let nextNodeIndex = 0;

  const render = (_: string) => {
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
  const makePropertyString = (properties: Record<string, boolean | number | string>) =>
    Object.entries(properties)
      .map(([key, _]) => `${key}="${_}"`)
      .join("; ");
  const renderNode = (_: string, options?: Partial<NodeProperties>) =>
    render(`"${_}" [${makePropertyString(options ?? { label: _ })};]`);
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
  const renderLink = (a: string, b: string, options?: Partial<LinkProperties>) =>
    render(`"${a}" -> "${b}" [${makePropertyString(options ?? {})};]`);

  return {
    render,
    renderNode,
    renderAnnotation,
    renderLink,
    toString: () => buffer.join("\n"),
  };
};
