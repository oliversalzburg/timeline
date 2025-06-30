import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { hslPalette } from "@oliversalzburg/js-utils/graphics/palette.js";
import { clamp } from "@oliversalzburg/js-utils/math/core.js";
import { FONTS_SYSTEM, MILLISECONDS } from "./constants.js";
import { dot, makeHtmlString } from "./dot.js";
import { roundToDay } from "./operator.js";
import type { Timeline, TimelineEntry } from "./types.js";

export interface RendererOptions {
  baseUnit: "day" | "week" | "month";
  clusterYears: boolean;
  dateRenderer: (date: number) => string;
  now: number;
  origin: number;
  preview: boolean;
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

  const palettePen = hslPalette(timelines.length, 0, 0.4, 0.6);
  const paletteFill = hslPalette(timelines.length, 0, 0.4, 0.9);
  const colors = new Map(
    timelines.map((_, index) => [
      _,
      {
        fill: `#${paletteFill[index].map(x => x.toString(16).padStart(2, "0")).join("")}`,
        pen: `#${palettePen[index].map(x => x.toString(16).padStart(2, "0")).join("")}`,
      },
    ]),
  );

  const d = dot();

  d.raw("digraph universe {");
  const FONT_COLOR = "#000000";
  const FONT_SIZE = 12;
  //const FONT_NODES = "Simple Plan";
  //const FONT_EDGES = "Master Photograph";
  d.raw(`node [fontcolor="${FONT_COLOR}"; fontname="${FONTS_SYSTEM}"; fontsize="${FONT_SIZE}";]`);
  d.raw(`edge [fontcolor="${FONT_COLOR}"; fontname="${FONTS_SYSTEM}"; fontsize="${FONT_SIZE}";]`);
  d.raw('comment="The Universe"');
  d.raw(`fontcolor="${FONT_COLOR}"`);
  d.raw(`fontname="${FONTS_SYSTEM}"`);
  d.raw(`fontsize="${FONT_SIZE}"`);
  d.raw('label="Universe"');
  d.raw(`rankdir="TD"`);
  d.raw(`ranksep="0.1"`);
  d.raw(`tooltip=" "`);

  const TIME_BASE =
    options.baseUnit === "week"
      ? MILLISECONDS.ONE_WEEK
      : options.baseUnit === "month"
        ? MILLISECONDS.ONE_MONTH
        : MILLISECONDS.ONE_DAY;
  const TIME_SCALE = 1 / TIME_BASE;

  const now = options?.now ?? Date.now();
  const origin = options?.origin ?? timestampsUnique[0];
  const originString = options?.dateRenderer
    ? options.dateRenderer(origin)
    : new Date(origin).toDateString();
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

      let color = colors.get(timeline)?.pen ?? timeline.meta?.color ?? "";
      let colorsFill = colors.get(timeline)?.fill ?? timeline.meta?.color ?? "";
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
                ? (timelineNext.meta?.color ?? "")
                : `${colorsFill}:${timelineNext.meta.color}`
              : colorsFill;
          prefixes += timelineNext.meta?.prefix ?? "";
          [, timelineNext, entryNext] = timelineGlobal[++nextEventIndex];
        }
      }

      const penWidth = firstNodeAlreadySeen.has(timeline) ? 1 : 3;
      const dateString = options?.dateRenderer
        ? options.dateRenderer(timestamp)
        : new Date(timestamp).toDateString();
      d.node(entry.title, {
        color,
        fillcolor: colorsFill !== "" ? colorsFill : color,
        label: makeHtmlString(
          `${(prefixes !== "" ? `${prefixes} ` : "") + entry.title}\\n${dateString}`,
        ),
        penwidth: penWidth,
        shape: 0 < merges ? "ellipse" : "box",
        style: 0 < merges ? "wedged" : `filled${options.preview !== true ? ",rounded" : ""}`,
        tooltip: `${formatMilliseconds(timePassedSinceStart)} since ${originString}\\n${formatMilliseconds(timePassedSinceThen)} ago`,
      });

      firstNodeAlreadySeen.add(timeline);
    }

    previousYear = date.getFullYear();
  }

  // Ensure last cluster is closed.
  if (options.clusterYears) {
    d.raw("}");
  }

  // Link items in their individual timelines together.
  let timePassed = 0;
  for (const timeline of timelines) {
    const color = colors.get(timeline)?.pen ?? timeline.meta?.color;

    // The timestamp we looked at during the last iteration.
    let previousTimestamp: number | undefined;
    // The entries at the previous timestamp.
    let previousEntries = new Array<TimelineEntry>();
    // How many milliseconds passed since the previous timestamp.
    let timePassed = 0;
    nextEventIndex = 0;

    for (const [timestamp] of timeline.records) {
      if (previousTimestamp && timestamp <= previousTimestamp) {
        continue;
      }

      timePassed = previousTimestamp ? Math.max(1, timestamp - previousTimestamp) : 0;
      const previousEntriesNext = new Array<TimelineEntry>();

      while (
        nextEventIndex < timeline.records.length &&
        timeline.records[nextEventIndex][0] === timestamp
      ) {
        const [, entry] = timeline.records[nextEventIndex++];
        previousEntriesNext.push(entry);
        if (0 === previousEntries.length) {
          continue;
        }

        for (const previousEntry of previousEntries) {
          const linkLength =
            timePassed < TIME_BASE
              ? // Derived from minimum value for ranksep.
                0.02
              : clamp(
                  options?.scale === "logarithmic"
                    ? Math.log(timePassed * TIME_SCALE * 10)
                    : timePassed * TIME_SCALE,
                  0.02,
                  // Likely to just introduce rasterization issues, if larger.
                  1000,
                );

          d.link(previousEntry.title, entry.title, {
            color,
            minlen: linkLength,
            penwidth: 0.5,
            style: options.preview !== true && timeline.meta?.link !== false ? "solid" : "invis",
            //tooltip: `${formatMilliseconds(timePassed)} (${linkLength}: ${timePassed} * ${TIME_SCALE} = ${timePassed * TIME_SCALE})`,
          });
        }
      }

      previousTimestamp = timestamp;
      previousEntries = previousEntriesNext;
    }
  }

  // Link up all entries in a single time chain.
  let previousTimestamp: number | undefined;
  let allPrevious = new Array<TimelineEntry>();
  timePassed = 0;
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
        // This link length is ultimately the strictest control on the distance between events.
        // If we have a "time base" of 1 day, we want all events that appear within the same day,
        // to be grouped in one row. For simplicity, we focus on time distances larger than 24 hours,
        // instead of strict date changes.
        // For any distance smaller than 1 day, we want to ensure a link length < 1, to keep the node
        // on the same row as the previous one.
        // For any distances of 1 day or longer, we want to ensure the link length is also >= 1.
        const linkLength =
          timePassed < TIME_BASE
            ? // Derived from minimum value for ranksep.
              0.02
            : clamp(
                options?.scale === "logarithmic"
                  ? Math.log(timePassed * TIME_SCALE * 10)
                  : timePassed * TIME_SCALE,
                0.02,
                // Likely to just introduce rasterization issues, if larger.
                1000,
              );

        // Draw force-directing link between merged timeline entries.
        // This forces all entries into linear global order.
        //d.link(previous[1].title, entry.title, { minlen:0.5, style: "dashed", weight:0.5 });
        d.link(previousEntry.title, entry.title, {
          minlen: linkLength,
          style: options.preview ? "dashed" : "invis",
          //tooltip: `${formatMilliseconds(timePassed)} (${linkLength}: ${timePassed} * ${TIME_SCALE} = ${timePassed * TIME_SCALE})`,
        });
      }
    }

    previousTimestamp = timestamp;
    allPrevious = nextPrevious;
  }

  d.raw("}");

  return d.toString();
};
