import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { clamp } from "@oliversalzburg/js-utils/math/core.js";
import { MILLISECONDS } from "./constants.js";
import { dot, makeHtmlString } from "./dot.js";
import { roundToDay } from "./operator.js";
import type { Timeline, TimelineEntry } from "./types.js";

export interface RendererOptions {
  baseUnit: "week" | "month";
  clusterYears: boolean;
  now: number;
  origin: number;
  scale: "linear" | "logarithmic";
}

/**
 * The Renderer in the reference implementation generates a DOT graph containing all passed
 * timelines. How these timelines are merged, and rendered, is opinionated. It should serve
 * as an example of how to further utilize recorded timeline data.
 * Readers are encouraged to write their own Renderer implementation.
 */
export const render = (timelines: Array<Timeline>, options: Partial<RendererOptions> = {}) => {
  const timestampsUnique = [
    ...new Set(timelines.flatMap(t => roundToDay(t).records.map(([time, _]) => time))),
  ].sort((a, b) => a - b);
  type TimeTuple = [number, Timeline, TimelineEntry];
  const timelineGlobal = timelines
    .flatMap(_ => roundToDay(_).records.map(r => [r[0], _, r[1]] as TimeTuple))
    .sort(([a, , aentry], [b, , bentry]) =>
      a - b !== 0 ? a - b : aentry.title.localeCompare(bentry.title),
    );

  //const metrics = analyze(timeline);
  //process.stderr.write(JSON.stringify(metrics, undefined, 2) + "\n");
  //const timeMaps = timelines.map(t => new Map(t.records));

  const d = dot();
  const appendOpacity = (color: string, opacity = 35): string =>
    color === "" ? color : `${color}${opacity.toString(16)}`;

  d.raw("digraph {");
  let fontname =
    "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif";
  fontname = "Simple Plan";
  d.raw(`node [fontname="${fontname}";]`);
  d.raw(`edge [fontname="Master Photograph";]`);
  d.raw(`fontname="${fontname}"`);
  d.raw("layout=dot");
  d.raw(`rankdir="TD"`);

  const TIME_BASE = options.baseUnit === "week" ? MILLISECONDS.ONE_WEEK : MILLISECONDS.ONE_MONTH;
  const TIME_SCALE = 1 / TIME_BASE;

  const now = options?.now ?? Date.now();
  const origin = options?.origin ?? timestampsUnique[0];
  let previousYear: number | undefined;
  const firstNodeAlreadySeen = new Set<Timeline>();
  let nextEventIndex = 0;
  for (const timestamp of timestampsUnique) {
    const date = new Date(timestamp);
    const currentYear = date.getFullYear();

    // Force at least 1ms gap between events, regardless of input.
    //timePassed = previous ? Math.max(1, timestamp - previous[0]) : 0;

    const timePassedSinceStart = timestamp - origin;
    const timePassedSinceThen = now - timestamp;

    if (options.clusterYears && currentYear !== previousYear) {
      if (previousYear !== undefined) {
        d.raw("}");
      }
      d.raw(`subgraph cluster_${currentYear} {`);
      d.raw(`fontname="Master Photograph"`);
      d.raw(`label="${currentYear}"`);
      d.raw(`penwidth="0.2"`);
      d.raw(`style="dashed,rounded"`);
    }

    while (
      nextEventIndex < timelineGlobal.length &&
      timelineGlobal[nextEventIndex][0] === timestamp
    ) {
      const [, timeline, entry] = timelineGlobal[nextEventIndex++];

      let color = timeline.meta?.color ?? "";
      let colorsFill = appendOpacity(timeline.meta?.color ?? "");
      let prefixes = timeline.meta?.prefix ?? "";
      let merges = 0;
      if (nextEventIndex < timelineGlobal.length) {
        let [, timelineNext, entryNext] = timelineGlobal[nextEventIndex];
        while (nextEventIndex < timelineGlobal.length && entryNext.title === entry.title) {
          ++merges;
          color ??= timelineNext.meta?.color ?? color;
          colorsFill =
            timelineNext.meta?.link !== false && timelineNext.meta?.color
              ? colorsFill === ""
                ? appendOpacity(timelineNext.meta?.color ?? "")
                : `${colorsFill}:${appendOpacity(timelineNext.meta.color)}`
              : colorsFill;
          prefixes += timelineNext.meta?.prefix ?? "";
          [, timelineNext, entryNext] = timelineGlobal[++nextEventIndex];
        }
      }

      const penWidth = firstNodeAlreadySeen.has(timeline) ? 1 : 3;
      d.node(entry.title, {
        color,
        fillcolor: colorsFill !== "" ? colorsFill : undefined,
        fontsize: 20,
        label: makeHtmlString(
          `${(prefixes !== "" ? `${prefixes} ` : "") + entry.title}\\n${new Date(timestamp).toDateString()}\\n${formatMilliseconds(timePassedSinceStart)}\\n${formatMilliseconds(timePassedSinceThen * -1)}`,
        ),
        penwidth: penWidth,
        shape: 0 < merges ? "ellipse" : "box",
        style: 0 < merges ? "wedged" : "rounded",
      });

      firstNodeAlreadySeen.add(timeline);
    }

    previousYear = date.getFullYear();
  }

  // Ensure last cluster is closed.
  if (options.clusterYears) {
    d.raw("}");
  }

  // Link items in timelines together.
  let timePassed = 0;
  let remainder = 0;
  for (const timeline of timelines) {
    let previousTimestamp: number | undefined;
    let allPrevious = new Array<TimelineEntry>();
    let timePassed = 0;
    let remainder = 0;
    nextEventIndex = 0;
    for (const [timestamp] of timeline.records) {
      if (previousTimestamp && timestamp <= previousTimestamp) {
        continue;
      }

      timePassed = previousTimestamp ? Math.max(1, timestamp - previousTimestamp) : 0;
      const nextPrevious = new Array<TimelineEntry>();

      while (
        nextEventIndex < timeline.records.length &&
        timeline.records[nextEventIndex][0] === timestamp
      ) {
        const [, entry] = timeline.records[nextEventIndex++];
        nextPrevious.push(entry);
        if (0 === allPrevious.length) {
          continue;
        }

        for (const previousEntry of allPrevious) {
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

          d.link(previousEntry.title, entry.title, {
            color: timeline.meta?.color,
            //label: `${formatMilliseconds(timePassed)} +${formatMilliseconds(remainder)}`,
            minlen: linkLength,
            penwidth: 0.5,
            style: timeline.meta?.link !== false ? "solid" : "invis",
          });
        }
      }

      previousTimestamp = timestamp;
      allPrevious = nextPrevious;
    }
  }

  // Link up all entries in a single time chain.
  let previousTimestamp: number | undefined;
  let allPrevious = new Array<TimelineEntry>();
  timePassed = 0;
  remainder = 0;
  nextEventIndex = 0;
  for (const timestamp of timestampsUnique) {
    timePassed = previousTimestamp ? Math.max(1, timestamp - previousTimestamp) : 0;
    const nextPrevious = new Array<TimelineEntry>();

    while (
      nextEventIndex < timelineGlobal.length &&
      timelineGlobal[nextEventIndex][0] === timestamp
    ) {
      const [, , entry] = timelineGlobal[nextEventIndex++];

      if (nextPrevious.find(_ => _.title === entry.title)) {
        process.stderr.write(
          `+ Events in multiple timelines share time and title. '${entry.title}'\n  Items will be merged automatically.\n`,
        );
        continue;
      }

      nextPrevious.push(entry);

      if (0 === allPrevious.length) {
        continue;
      }

      for (const previousEntry of allPrevious) {
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

        // Draw force-directing link between merged timeline entries.
        // This forces all entries into linear global order.
        //d.link(previous[1].title, entry.title, { minlen:0.5, style: "dashed", weight:0.5 });
        d.link(previousEntry.title, entry.title, {
          arrowhead: "empty",
          color: "#000000",
          //label: `${formatMilliseconds(timePassed)} +${formatMilliseconds(remainder)}`,
          minlen: linkLength,
          penwidth: 0.5,
          style: "invis",
        });
      }
    }

    previousTimestamp = timestamp;
    allPrevious = nextPrevious;
  }

  d.raw("}");

  return d.toString();
};
