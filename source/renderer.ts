import { indent } from "@oliversalzburg/js-utils/data/string.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { clamp } from "@oliversalzburg/js-utils/math/core.js";
import { analyze } from "./analyzer.js";
import { MILLISECONDS } from "./constants.js";
import { dot, makeHtmlString } from "./dot.js";
import type { Timeline, TimelineEntry } from "./types.js";
import { errorToString, unknownToError } from "@oliversalzburg/js-utils/errors/error-serializer.js";
import { flatten } from "./operator.js";

export interface RendererOptions {
  baseUnit: "week" | "month";
  clusterYears: boolean;
  dateFormat: string;
  scale: "linear" | "logarithmic";
}

/**
 * The Renderer in the reference implementation generates a DOT graph containing all passed
 * timelines. How these timelines are merged, and rendered, is opinionated. It should serve
 * as an example of how to further utilize recorded timeline data.
 * Readers are encouraged to write their own Renderer implementation.
 */
export const render = (timelines: Array<Timeline>, options: Partial<RendererOptions> = {}) => {
  const timestamps = timelines
    .flatMap(t => flatten(t).records.map(([time, _]) => time))
    .sort((a, b) => a - b);

  //const metrics = analyze(timeline);
  //process.stderr.write(JSON.stringify(metrics, undefined, 2) + "\n");
  const timeMaps = timelines.map(t => new Map(flatten(t).records));

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
  const nodes = new Map<string, number>();
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

      // Did the previous item already occupy this timestamp?
      if (previous && previous[0] === timestamp) {
        if (previous[1].title === entry.title) {
          process.stderr.write(`+ Exact match in title. Items will be merged. '${entry.title}'\n`);
          continue;
        }
        process.stderr.write(
          `Timeline collision at ${timestamp}! ${previous[1].title} - ${entry.title}\n`,
        );
        process.stderr.write(`! Collision remains unhandled! Node is rendered.\n`);
      }

      const timeline = timelines[timeMaps.indexOf(timeMap)];
      if (nodes.has(entry.title)) {
        if (nodes.get(entry.title) === timestamp) {
          process.stderr.write(`- Skipping duplicate node ${entry.title} at ${timestamp}.\n`);
          continue;
        }
        process.stderr.write(
          `Node with title ${entry.title} was already rendered with different timestamp (${nodes.get(entry.title)}, current:${timestamp})!\n`,
        );
        process.stderr.write(`! Node is skipped with information loss.\n`);
        continue;
      }
      nodes.set(entry.title, timestamp);

      d.node(entry.title, {
        color: timeline.meta.color,
        fontsize: 20,
        label: makeHtmlString(
          `${(timeline.meta.prefix ? `${timeline.meta.prefix} ` : "") + entry.title}\\n${isDateMarker ? new Date(timestamp).toDateString() : new Date(timestamp).toUTCString()}\\n${formatMilliseconds(timePassedSinceStart)}\\n${formatMilliseconds(timePassedSinceThen * -1)}`,
        ),
      });

      previous = [timestamp, entry];
    }

    previousYear = date.getUTCFullYear();
  }

  // Ensure last cluster is closed.
  if (options.clusterYears) {
    d.raw("}");
  }

  // Link items in timelines together.
  const links = new Map<string, string>();
  previous = undefined;
  let timePassed = 0;
  let remainder = 0;
  for (const timeline of timelines) {
    previous = undefined;
    let timePassed = 0;
    let remainder = 0;
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

        // If nodes were already linked, link them again.
        if (links.get(previous[1].title) === entry.title) {
          previous = [timestamp, entry];
          continue;
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
          label: `${formatMilliseconds(timePassed)} +${formatMilliseconds(remainder)}`,
          minlen: linkLength,
          penwidth: 0.5,
          style: "solid",
        });

        links.set(previous[1].title, entry.title);
      }
      previous = [timestamp, entry];
    }
  }

  // Link up all entries in a single time chain.
  previous = undefined;
  timePassed = 0;
  remainder = 0;
  for (const timestamp of timestamps) {
    for (const timeMap of timeMaps) {
      const entry = timeMap.get(timestamp);
      if (entry === undefined) {
        continue;
      }

      timePassed = previous ? Math.max(1, timestamp - previous[0]) : 0;
      if (previous) {
        let adjustedTime = timePassed;
        if (remainder !== 0 && TIME_BASE < timePassed) {
          adjustedTime += remainder;
          remainder = 0;
        } else if (timePassed < TIME_BASE) {
          remainder += timePassed;
        }

        // If nodes were already linked, link them again.
        if (links.get(previous[1].title) === entry.title) {
          previous = [timestamp, entry];
          continue;
        }

        // Handle collisions.
        if (previous && previous[0] === timestamp) {
          if (previous[1].title === entry.title) {
            //process.stderr.write(`+ Exact match in title. Link is skipped.\n`);
            continue;
          }
          process.stderr.write(
            `Timeline collision at ${timestamp}! ${previous[1].title} - ${entry.title}\n`,
          );
          process.stderr.write(`! Collision remains unhandled! Link is rendered.\n`);
        }

        const linkLength = clamp(
          options?.scale === "logarithmic"
            ? Math.log(adjustedTime * TIME_SCALE)
            : adjustedTime * TIME_SCALE,
          0.01,
          1000,
        );

        // Draw force-directing link between merged timeline entries.
        // This forces all entries into linear global order.
        //d.link(previous[1].title, entry.title, { minlen:0.5, style: "dashed", weight:0.5 });
        d.link(previous[1].title, entry.title, {
          arrowhead: "empty",
          color: "#000000",
          label: `${formatMilliseconds(timePassed)} +${formatMilliseconds(remainder)}`,
          minlen: linkLength,
          penwidth: 0.5,
          style: "dashed",
        });

        links.set(previous[1].title, entry.title);
      }

      previous = [timestamp, entry];
    }
  }

  d.raw("}");

  return d.toString();
};
