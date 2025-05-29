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

export const render = (timelines: Array<Timeline>, options: Partial<RendererOptions> = {}) => {
  const timestamps = timelines
    .flatMap(t => t.records.map(([time, _]) => time))
    .sort((a, b) => a - b);
  //const metrics = analyze(timeline);
  //process.stderr.write(JSON.stringify(metrics, undefined, 2) + "\n");
  const timeMaps = timelines.map(t => new Map(t.records));

  const d = dot();

  d.raw("digraph {");
  let fontname =
    "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif";
  fontname = "Simple Plan";
  d.raw(`node [fontname="${fontname}";]`);
  d.raw(`edge [fontname="Master Photograph";]`);
  d.raw(`fontname="${fontname}"`);
  //d.render(`pad="0.5"`);
  d.raw(`rankdir="TD"`);

  const TIME_BASE = options.baseUnit === "week" ? MILLISECONDS.ONE_WEEK : MILLISECONDS.ONE_MONTH;
  const TIME_SCALE = 1 / TIME_BASE;

  let previous: [number, TimelineEntry] | undefined;
  let previousYear: number | undefined;
  let timePassed = 0;
  let remainder = 0;
  for (const timestamp of timestamps) {
    const date = new Date(timestamp);
    const currentYear = date.getUTCFullYear();

    // Force at least 1ms gap between events, regardless of input.
    //timePassed = previous ? Math.max(1, timestamp - previous[0]) : 0;

    const timePassedSinceStart = timestamp - timestamps[0];
    const timePassedSinceThen = Date.now() - timestamp;
    const isDateMarker =
      Math.trunc(timestamp / MILLISECONDS.ONE_DAY) * MILLISECONDS.ONE_DAY === timestamp;

    if (options.clusterYears && currentYear !== previousYear) {
      if (previousYear !== undefined) {
        d.raw("}");
      }
      d.raw(`subgraph cluster_${currentYear} {`);
      d.raw(`fontname="Master Photograph"`);
      d.raw(`label="${currentYear}"`);
      d.raw(`penwidth="0.2"`);
      d.raw(`style="dashed"`);
    }

    for (const timeMap of timeMaps) {
      const entry = timeMap.get(timestamp);
      if (entry === undefined) {
        continue;
      }

      const timeline = timelines[timeMaps.indexOf(timeMap)];

      d.raw("subgraph {");
      d.raw("peripheries=0");
      d.raw("cluster=true");
      d.raw('label=""');
      d.node(entry.title, { color: timeline.meta.color, fontsize: 20 });
      d.annotation(
        entry.title,
        `${isDateMarker ? new Date(timestamp).toDateString() : new Date(timestamp).toUTCString()}\\n${formatMilliseconds(timePassedSinceStart)}\\n${formatMilliseconds(timePassedSinceThen * -1)}`,
      );
      d.raw("}");

      if (previous) {
        // Draw force-directing link between merged timeline entries.
        // This forces all entries into linear global order.
        d.link(previous[1].title, entry.title, { style: "dotted", minlen: 0, weight:0 });
      }

      if (previous && previous[0] === timestamp) {
        process.stderr.write(`Unhandled timeline collision at ${timestamp}!\n`);
      }

      previous = [timestamp, entry];
    }

    previousYear = date.getUTCFullYear();
  }

  for (const timeline of timelines) {
    previous = undefined;
    timePassed = 0;
    remainder = 0;
    for (const [timestamp, entry] of timeline.records) {
      timePassed = previous ? Math.max(1, timestamp - previous[0]) : 0;
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

        d.link(previous[1].title, entry.title, {
          color: timeline.meta.color,
          minlen: linkLength,
          penwidth: 0.5,
          style:"solid",
          weight: 1,
        });
      }
      previous = [timestamp, entry];
    }
  }

  // Ensure last cluster is closed.
  if (options.clusterYears) {
    d.raw("}");
  }

  d.raw("}");

  return d.toString();
};
