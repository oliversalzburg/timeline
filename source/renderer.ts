import { indent } from "@oliversalzburg/js-utils/data/string.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { analyze } from "./analyzer.js";
import { MILLISECONDS } from "./constants.js";
import type { Timeline, TimelineEntry } from "./types.js";

export const render = (data: Timeline) => {
  const timeline = [
    ...data,
    [
      Date.now(),
      {
        title: "Now",
      },
    ],
  ] as Timeline;
  const timestamps = timeline.map(([time, _]) => time);
  const metrics = analyze(timeline);
  process.stderr.write(JSON.stringify(metrics, undefined, 2) + "\n");

  const buffer = new Array<string>();
  let indentation = 0;

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
  let nextNodeIndex = 0;
  const renderNode = (_: string, shape = "ellipse", label = _) =>
    render(`"${_}" [label="${label}"; shape="${shape}";]`);
  const renderAnnotation = (_: string, text: string) => {
    renderNode(`annotation${nextNodeIndex}`, "box", text);
    renderLink(`annotation${nextNodeIndex}`, _, 0, 0);
    ++nextNodeIndex;
  };
  const renderLink = (a: string, b: string, minlen = 1, weight = 1, label = "") =>
    render(`"${a}" -> "${b}" [label="${label}"; minlen=${minlen}; weight=${weight};]`);

  render("digraph {");
  render(`fontname="sans-serif"`);
  render(`pad="0.5"`);
  render(`rankdir="TD"`);

  const TIME_SCALE = 1 / MILLISECONDS.ONE_WEEK;

  let previous: [number, TimelineEntry] | undefined;
  let timePassed = 0;
  for (const [timestampRaw, entry] of timeline) {
    const timestamp = Number(timestampRaw);
    timePassed = previous ? timestamp - previous[0] : 0;
    const timePassedSinceStart = timestamp - Number(timestamps[0]);
    const timePassedSinceThen = Date.now() - timestamp;

    render("subgraph {");
    render("cluster=true");
    renderNode(entry.title);
    renderAnnotation(
      entry.title,
      `${new Date(timestamp).toLocaleString()}\n${formatMilliseconds(timePassedSinceStart)}\n${formatMilliseconds(timePassedSinceThen)}`,
    );
    if (previous) {
      renderLink(
        previous[1].title,
        entry.title,
        timePassed * TIME_SCALE,
        1,
        formatMilliseconds(timePassed),
      );
    }
    render("}");

    //console.info(`- Time passed: ${formatMilliseconds(timePassed)}`);
    //console.info(`* ${new Date(timestamp).toLocaleString()} ${entry.title}`);

    previous = [timestamp, entry];
  }

  render("}");

  // In case you want to copy to another DOT renderer, like for PNG exporting.
  return buffer.join("\n");
};
