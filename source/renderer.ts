import { indent } from "@oliversalzburg/js-utils/data/string.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { clamp } from "@oliversalzburg/js-utils/math/core.js";
import { analyze } from "./analyzer.js";
import { MILLISECONDS } from "./constants.js";
import { dot } from "./dot.js";
import type { Timeline, TimelineEntry } from "./types.js";

export interface RendererOptions {
  baseUnit: "week" | "month";
  clusterYears: boolean;
  dateFormat: string;
  scale: "linear" | "logarithmic";
}

export const render = (timeline: Timeline, options: Partial<RendererOptions> = {}) => {
  const timestamps = timeline.map(([time, _]) => time);
  //const metrics = analyze(timeline);
  //process.stderr.write(JSON.stringify(metrics, undefined, 2) + "\n");

  const d = dot();

  d.render("digraph {");
  let fontname =
    "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif";
  fontname = "Simple Plan";
  d.render(`node [fontname="${fontname}";]`);
  d.render(`edge [fontname="Master Photograph";]`);
  d.render(`fontname="${fontname}"`);
  //d.render(`pad="0.5"`);
  d.render(`rankdir="TD"`);

  const TIME_BASE = options.baseUnit === "week" ? MILLISECONDS.ONE_WEEK : MILLISECONDS.ONE_MONTH;
  const TIME_SCALE = 1 / TIME_BASE;

  let previous: [number, TimelineEntry] | undefined;
  let previousYear: number | undefined;
  let timePassed = 0;
  let remainder = 0;
  for (const [timestamp, entry] of timeline) {
    const date = new Date(timestamp);
    const currentYear = date.getUTCFullYear();

    // Force at least 1ms gap between events, regardless of input.
    timePassed = previous ? Math.max(1, timestamp - previous[0]) : 0;

    const timePassedSinceStart = timestamp - timestamps[0];
    const timePassedSinceThen = Date.now() - timestamp;
    const isDateMarker =
      Math.trunc(timestamp / MILLISECONDS.ONE_DAY) * MILLISECONDS.ONE_DAY === timestamp;

    if (options.clusterYears && currentYear !== previousYear) {
      if (previousYear !== undefined) {
        d.render("}");
      }
      d.render(`subgraph cluster_${currentYear} {`);
      d.render(`penwidth="0.2"`);
      d.render(`label="${currentYear}"`);
    }

    d.render("subgraph {");
    d.render("peripheries=0");
    d.render("cluster=true");
    d.render('label=""');
    d.renderNode(entry.title, { fontsize: 20 });
    d.renderAnnotation(
      entry.title,
      `${isDateMarker ? new Date(timestamp).toDateString() : new Date(timestamp).toUTCString()}\\n${formatMilliseconds(timePassedSinceStart)}\\n-${formatMilliseconds(timePassedSinceThen)}`,
    );
    if (previous) {
      let adjustedTime = timePassed;
      if (remainder !== 0 && TIME_BASE < timePassed) {
        adjustedTime += remainder;
        remainder = 0;
      } else if (timePassed < TIME_BASE) {
        remainder += timePassed;
      }

      const linkLength = clamp(
        options?.scale === "logarithmic"
          ? Math.log(adjustedTime * TIME_SCALE)
          : adjustedTime * TIME_SCALE,
        0.01,
        1000,
      );

      d.renderLink(previous[1].title, entry.title, {
        label: `${formatMilliseconds(timePassed)} +${formatMilliseconds(remainder)}`,
        minlen: linkLength,
        penwidth: 0.5,
        weight: 1,
      });
    }
    d.render("}");

    //console.info(`- Time passed: ${formatMilliseconds(timePassed)}`);
    //console.info(`* ${new Date(timestamp).toLocaleString()} ${entry.title}`);

    previous = [timestamp, entry];
    previousYear = date.getUTCFullYear();
  }

  // Ensure last cluster is closed.
  if (options.clusterYears) {
    d.render("}");
  }

  d.render("}");

  return d.toString();
};
