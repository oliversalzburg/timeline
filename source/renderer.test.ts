/** biome-ignore-all lint/style/noUnusedTemplateLiteral: Consistency overrules */
import { expect } from "chai";
import { describe, it } from "mocha";
import { random } from "./fixtures/documents.js";
import { load } from "./loader.js";
import { render } from "./renderer.js";
import type { TimelineDocument } from "./types.js";

/**
 * Renderer
 */

describe("Renderer", () => {
  before(() => {
    expect(new Date().getTimezoneOffset()).to.equal(
      0,
      "The test suite must be executed in the UTC time zone.",
    );
  });

  it("should render timelines correctly (fixture 1)", () => {
    const document: TimelineDocument = { ...random };
    const now = Date.UTC(2025, 5, 15);
    const timeline = load(document);
    const artifact = render([timeline], { now });
    const snapshot = [
      `digraph universe {`,
      `    node [fontcolor="#000000"; fontname="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif"; fontsize="12";];`,
      `    edge [fontcolor="#000000"; fontname="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif"; fontsize="12";];`,
      `    comment="The Universe";`,
      `    fontcolor="#000000";`,
      `    fontname="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif";`,
      `    fontsize="12";`,
      `    label="Universe";`,
      `    rankdir="TD";`,
      `    ranksep="0.1";`,
      `    tooltip=" ";`,
      `    1 [color="#c17070"; fillcolor="#efdbdb"; label=<545008398000<BR ALIGN="CENTER"/>Thu Apr 09 1987>; penwidth="3"; shape="box"; style="filled,rounded"; tooltip="0ms since Thu Apr 09 1987\\n38y 77d ago";];`,
      `    2 [color="#c17070"; fillcolor="#efdbdb"; label=<699753484000<BR ALIGN="CENTER"/>Wed Mar 04 1992>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="4y 331d since Thu Apr 09 1987\\n33y 111d ago";];`,
      `    3 [color="#c17070"; fillcolor="#efdbdb"; label=<1028920992000<BR ALIGN="CENTER"/>Fri Aug 09 2002>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="15y 126d since Thu Apr 09 1987\\n22y 316d ago";];`,
      `    4 [color="#c17070"; fillcolor="#efdbdb"; label=<1192726333000<BR ALIGN="CENTER"/>Thu Oct 18 2007>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="20y 197d since Thu Apr 09 1987\\n17y 245d ago";];`,
      `    5 [color="#c17070"; fillcolor="#efdbdb"; label=<1322304821000<BR ALIGN="CENTER"/>Sat Nov 26 2011>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="24y 237d since Thu Apr 09 1987\\n13y 205d ago";];`,
      `    6 [color="#c17070"; fillcolor="#efdbdb"; label=<1499590423000<BR ALIGN="CENTER"/>Sun Jul 09 2017>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="30y 99d since Thu Apr 09 1987\\n7y 343d ago";];`,
      `    7 [color="#c17070"; fillcolor="#efdbdb"; label=<1504468829000<BR ALIGN="CENTER"/>Sun Sep 03 2017>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="30y 155d since Thu Apr 09 1987\\n7y 287d ago";];`,
      `    8 [color="#c17070"; fillcolor="#efdbdb"; label=<1542020080000<BR ALIGN="CENTER"/>Mon Nov 12 2018>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="31y 225d since Thu Apr 09 1987\\n6y 217d ago";];`,
      `    9 [color="#c17070"; fillcolor="#efdbdb"; label=<1613021905000<BR ALIGN="CENTER"/>Thu Feb 11 2021>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="33y 317d since Thu Apr 09 1987\\n4y 125d ago";];`,
      `    10 [color="#c17070"; fillcolor="#efdbdb"; label=<1627325390000<BR ALIGN="CENTER"/>Mon Jul 26 2021>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="34y 117d since Thu Apr 09 1987\\n3y 325d ago";];`,
      `    11 [color="#c17070"; fillcolor="#efdbdb"; label=<1663585657000<BR ALIGN="CENTER"/>Mon Sep 19 2022>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="35y 172d since Thu Apr 09 1987\\n2y 270d ago";];`,
      `    12 [color="#c17070"; fillcolor="#efdbdb"; label=<1834828906000<BR ALIGN="CENTER"/>Tue Feb 22 2028>; penwidth="1"; shape="box"; style="filled,rounded"; tooltip="40y 329d since Thu Apr 09 1987\\n-2y -252d ago";];`,
      `    1 -> 2 [color="#c17070"; minlen="1000"; penwidth="0.5"; style="solid";];`,
      `    2 -> 3 [color="#c17070"; minlen="1000"; penwidth="0.5"; style="solid";];`,
      `    3 -> 4 [color="#c17070"; minlen="1000"; penwidth="0.5"; style="solid";];`,
      `    4 -> 5 [color="#c17070"; minlen="1000"; penwidth="0.5"; style="solid";];`,
      `    5 -> 6 [color="#c17070"; minlen="1000"; penwidth="0.5"; style="solid";];`,
      `    6 -> 7 [color="#c17070"; minlen="56"; penwidth="0.5"; style="solid";];`,
      `    7 -> 8 [color="#c17070"; minlen="435"; penwidth="0.5"; style="solid";];`,
      `    8 -> 9 [color="#c17070"; minlen="822"; penwidth="0.5"; style="solid";];`,
      `    9 -> 10 [color="#c17070"; minlen="165"; penwidth="0.5"; style="solid";];`,
      `    10 -> 11 [color="#c17070"; minlen="420"; penwidth="0.5"; style="solid";];`,
      `    11 -> 12 [color="#c17070"; minlen="1000"; penwidth="0.5"; style="solid";];`,
      `    1 -> 2 [minlen="1000"; style="invis";];`,
      `    2 -> 3 [minlen="1000"; style="invis";];`,
      `    3 -> 4 [minlen="1000"; style="invis";];`,
      `    4 -> 5 [minlen="1000"; style="invis";];`,
      `    5 -> 6 [minlen="1000"; style="invis";];`,
      `    6 -> 7 [minlen="56"; style="invis";];`,
      `    7 -> 8 [minlen="435"; style="invis";];`,
      `    8 -> 9 [minlen="822"; style="invis";];`,
      `    9 -> 10 [minlen="165"; style="invis";];`,
      `    10 -> 11 [minlen="420"; style="invis";];`,
      `    11 -> 12 [minlen="1000"; style="invis";];`,
      `}`,
    ].join("\n");

    expect(artifact).to.equal(snapshot);
  });
});
