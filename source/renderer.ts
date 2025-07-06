import { isNil, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { hsl2rgb, rgb2hsl } from "@oliversalzburg/js-utils/graphics/color.js";
import { hslPalette } from "@oliversalzburg/js-utils/graphics/palette.js";
import { clamp } from "@oliversalzburg/js-utils/math/core.js";
import { FONTS_SYSTEM, MILLISECONDS } from "./constants.js";
import { gv, makeHtmlString, type NodeProperties } from "./gv.js";
import { roundToDay } from "./operator.js";
import type { Timeline, TimelineEntry } from "./types.js";

export interface RendererOptions {
  baseUnit: "day" | "week" | "month";
  clusterYears: boolean;
  dateRenderer: (date: number) => string;
  debug: boolean;
  now: number;
  origin: number;
  preview: boolean;
  scale: "linear" | "logarithmic";
}

export const fontColorForFill = (fillColor: string): string => {
  const components = mustExist(fillColor.substring(1).match(/../g)).map(x =>
    Number.parseInt(x, 16),
  );
  const hsl = rgb2hsl(components[0], components[1], components[2]);
  return hsl[2] < 180 ? "#ffffff" : "#000000";
};

export const matchLuminance = (toAdjust: string, target: string): string => {
  if (toAdjust === target) {
    return toAdjust;
  }

  const componentsBase = mustExist(toAdjust.substring(1).match(/../g)).map(x =>
    Number.parseInt(x, 16),
  );
  const componentsTarget = mustExist(target.substring(1).match(/../g)).map(x =>
    Number.parseInt(x, 16),
  );
  const hslBase = rgb2hsl(
    componentsBase[0] / 255,
    componentsBase[1] / 255,
    componentsBase[2] / 255,
  );
  const hslTarget = rgb2hsl(
    componentsTarget[0] / 255,
    componentsTarget[1] / 255,
    componentsTarget[2] / 255,
  );

  return `#${hsl2rgb(hslBase[0], hslBase[1], hslTarget[2])
    .map(x =>
      Math.floor(x * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

/**
 * The Renderer in the reference implementation generates a GraphViz graph containing all passed
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

  const d = gv();

  d.raw("digraph timeline {");
  const FONT_COLOR = "#000000";
  const FONT_SIZE = 12;
  //const FONT_NODES = "Simple Plan";
  //const FONT_EDGES = "Master Photograph";
  d.raw(`node [fontcolor="${FONT_COLOR}"; fontname="${FONTS_SYSTEM}"; fontsize="${FONT_SIZE}";]`);
  d.raw(`edge [fontcolor="${FONT_COLOR}"; fontname="${FONTS_SYSTEM}"; fontsize="${FONT_SIZE}";]`);
  d.raw('comment=" "');
  d.raw(`fontcolor="${FONT_COLOR}"`);
  d.raw(`fontname="${FONTS_SYSTEM}"`);
  d.raw(`fontsize="${FONT_SIZE}"`);
  d.raw('label=" "');
  d.raw(`rankdir="TD"`);
  d.raw(`ranksep="0.5"`);
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

  /**
   * We iterate over each unique timestamp that exists globally.
   * For each unique timestamp, we want to look at all global events that
   * exist at this timestamp.
   */
  for (const timestamp of timestampsUnique) {
    // Convert the timestamp to a Date for API features.
    const date = new Date(timestamp);
    // We need the current year to support the "cluster years" feature.
    const currentYear = date.getFullYear();

    const timePassedSinceOrigin = timestamp - origin;
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

    // We now iterate over all global events at the current timestamp.
    while (
      nextEventIndex < timelineGlobal.length &&
      timelineGlobal[nextEventIndex][0] === timestamp
    ) {
      // Collect all colors that were configured in the timeline documents.
      const colorsConfigured = new Set<string>();
      // Collect all generated fill colors for all timelines.
      const colorsGeneratedFill = new Set<string>();
      // Collect all generated pen colors for all timelines.
      const colorsGeneratedPen = new Set<string>();
      // Collect all colors to be ultimately used to fill the node.
      const colorsFill = new Set<string>();
      // Color that will dictate the luminance of gradient fills of nodes for merged events.
      let colorLuminanceSource: string | undefined;
      // Color to be ultimately used for the pen.
      let colorPen: string | undefined;
      // The rank of the timeline that dictates the pen color so far.
      let colorPenRank = -1;
      // The prefixes configured in all timeline documents.
      const prefixes = new Set<string>();
      // How many events were merged into a single node?
      let merges = -1;
      let timestampHasRoots = false;

      // We now further iterate over all global events at this timestamp which share the same title.
      let [timestampActual, timeline, entry] = timelineGlobal[nextEventIndex];
      do {
        /**
         * We know that `timelineGlobal[nextEventIndex]` points to an event at `timestamp`,
         * because we handle _all_ timestamps in an ordered series, and we always consume
         * all events from the previous timestamp.
         */
        [timestampActual, timeline, entry] = timelineGlobal[nextEventIndex];
        if (timestamp !== timestampActual) {
          throw new InvalidOperationError("This should not happen :(");
        }

        // We want to know if any of the events we're looking at, are the first event in their respective
        // source timeline. We want to highlight such nodes, to indicate the start of a document.
        timestampHasRoots ||= !firstNodeAlreadySeen.has(timeline);
        firstNodeAlreadySeen.add(timeline);

        if (!isNil(timeline.meta.color)) {
          colorsConfigured.add(timeline.meta.color);
          colorsFill.add(timeline.meta.color);

          // We can only have a single pen color.
          // We pick the color from the timeline with the largest rank.
          // For timelines with equal rank, the behavior is undefined.
          if (colorPenRank < (timeline.meta.rank ?? 0)) {
            colorLuminanceSource = timeline.meta.color;
            colorPenRank = timeline.meta.rank ?? 0;
            colorPen = timeline.meta.color;
          }
        } else {
          const fill = mustExist(colors.get(timeline)).fill;
          colorsFill.add(fill);
          colorLuminanceSource ??= fill;
          colorPen ??= timeline.meta.color ?? colors.get(timeline)?.pen;
        }

        if (!isNil(timeline.meta.prefix)) {
          prefixes.add(timeline.meta.prefix);
        }

        colorsGeneratedFill.add(mustExist(colors.get(timeline)).fill);
        colorsGeneratedPen.add(mustExist(colors.get(timeline)).pen);

        ++merges;
        ++nextEventIndex;
      } while (
        nextEventIndex < timelineGlobal.length - 1 &&
        timelineGlobal[nextEventIndex][0] === timestamp &&
        timelineGlobal[nextEventIndex][2].title === entry.title
      );

      const dateString = options?.dateRenderer
        ? options.dateRenderer(timestamp)
        : new Date(timestamp).toDateString();
      const colorsFillPalette = [...colorsFill].map(_ =>
        matchLuminance(_, mustExist(colorLuminanceSource)),
      );

      const nodeProperties: Partial<NodeProperties> = {
        color: colorPen,
        fillcolor: colorsFillPalette.join(":"),
        fontcolor: fontColorForFill(colorsFillPalette[0]),
        label: makeHtmlString(
          `${(0 < prefixes.size ? `${[...prefixes].join("")} ` : "") + entry.title}\\n${dateString}`,
        ),
        penwidth: 0 < (timeline.meta.rank ?? 0) && timestampHasRoots ? 3 : 1,
        shape: "box",
        style: "filled,rounded",
        tooltip: `${formatMilliseconds(timePassedSinceOrigin)} since ${originString}\\n${formatMilliseconds(timePassedSinceThen)} ago`,
      };
      d.node(entry.title, nodeProperties);
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
    const color = timeline.meta?.color ?? mustExist(colors.get(timeline)).pen;
    const rank = timeline.meta?.rank ?? 0;

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

      // We need to remember these for the next timestamp iteration.
      const processedEntries = new Array<TimelineEntry>();

      while (
        nextEventIndex < timeline.records.length &&
        timeline.records[nextEventIndex][0] === timestamp
      ) {
        const [, entry] = timeline.records[nextEventIndex++];
        processedEntries.push(entry);
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
            minlen: options.preview !== true ? linkLength : undefined,
            penwidth: rank / 2,
            style: 0 < rank ? "solid" : "invis",
            tooltip: `${formatMilliseconds(timePassed)} (${linkLength} ranks)`,
          });
        }
      }

      previousTimestamp = timestamp;
      previousEntries = processedEntries;
    }
  }

  // Link up all entries in a single time chain.
  let previousTimestamp: number | undefined;
  let previousTimestampEntries = new Array<TimelineEntry>();
  let remainder = 0;
  timePassed = 0;
  nextEventIndex = 0;
  for (const timestamp of timestampsUnique) {
    timePassed = previousTimestamp ? Math.max(1, timestamp - previousTimestamp) : 0;
    if (TIME_BASE < remainder + timePassed) {
      timePassed += remainder;
      remainder = timePassed % TIME_BASE;
      timePassed -= remainder;
    }

    // We need to remember these for the next timestamp iteration.
    const processedEntries = new Array<TimelineEntry>();

    while (
      nextEventIndex < timelineGlobal.length &&
      timelineGlobal[nextEventIndex][0] === timestamp
    ) {
      const [, , entry] = timelineGlobal[nextEventIndex++];

      if (processedEntries.find(_ => _.title === entry.title)) {
        // Events in multiple timelines share time and title.
        // By skipping here, we automatically end up with only a single node with that identity.
        continue;
      }

      processedEntries.push(entry);

      if (0 === previousTimestampEntries.length) {
        continue;
      }

      // This link length is ultimately the strictest control on the distance between events.
      // If we have a "time base" of 1 day, we want all events that appear within the same day,
      // to be grouped in one row. For simplicity, we focus on time distances larger than 24 hours,
      // instead of strict date changes.
      // For any distance smaller than 1 day, we want to ensure a link length < 1, to keep the node
      // on the same row as the previous one.
      // For any distances of 1 day or longer, we want to ensure the link length is also >= 1.
      const linkLength = Math.trunc(
        timePassed < TIME_BASE
          ? 0
          : clamp(
              options?.scale === "logarithmic"
                ? Math.log(timePassed * TIME_SCALE * 10)
                : timePassed * TIME_SCALE,
              0,
              // Arbitrarily chosen as "sane" limit.
              1000,
            ),
      );

      for (const previousEntry of previousTimestampEntries) {
        // Draw rank-forcing link between merged timeline entries.
        // This forces all entries into a globally linear order.
        d.link(previousEntry.title, entry.title, {
          minlen: options.preview !== true ? linkLength : undefined,
          style: options.debug ? "dashed" : "invis",
          tooltip: `${formatMilliseconds(timePassed)} (carrying ${remainder})`,
        });
      }
    }

    previousTimestamp = timestamp;
    previousTimestampEntries = processedEntries;
  }

  d.raw("}");

  return d.toString();
};
