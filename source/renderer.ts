import { isNil, type Maybe, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { clamp } from "@oliversalzburg/js-utils/math/core.js";
import { FONTS_SYSTEM, MILLISECONDS, TRANSPARENT } from "./constants.js";
import { dot, makeHtmlString, type NodeProperties } from "./dot.js";
import { roundToDay } from "./operator.js";
import { matchLuminance, palette } from "./palette.js";
import { styles } from "./styles.js";
import type { RenderMode, TimelineEntry, TimelineReferenceRenderer } from "./types.js";

export interface RendererOptions {
  baseUnit: "day" | "week" | "month";
  clusterYears: boolean;
  dateRenderer: (date: number) => string;
  debug: boolean;
  now: number;
  origin: number;
  preview: boolean;
  scale: "linear" | "logarithmic";
  skipAfter: number;
  skipBefore: number;
  theme: RenderMode;
}

export const rank = (timeline: Maybe<TimelineReferenceRenderer>) => {
  return isNil(timeline)
    ? -1
    : (timeline.meta.rank ?? (timeline.meta.color === TRANSPARENT ? -1 : 0));
};

/**
 * The Renderer in the reference implementation generates a GraphViz graph containing all passed
 * timelines. How these timelines are merged, and rendered, is opinionated. It should serve
 * as an example of how to further utilize recorded timeline data.
 * Readers are encouraged to write their own Renderer implementation.
 */
export const render = (
  timelines: Array<TimelineReferenceRenderer>,
  options: Partial<RendererOptions> = {},
) => {
  const timestampsUnique = [
    ...new Set(timelines.flatMap(t => roundToDay(t).records.map(([time, _]) => time))),
  ].sort((a, b) => a - b);
  type TimeTuple = [number, TimelineReferenceRenderer, TimelineEntry];
  const timelineGlobal = timelines
    .flatMap(_ => roundToDay(_).records.map(r => [r[0], _, r[1]] as TimeTuple))
    .sort(([a, , aentry], [b, , bentry]) =>
      a - b !== 0 ? a - b : aentry.title.localeCompare(bentry.title),
    );

  // We default to dark, as the assume the default output media to be a display.
  // For printing use cases, we'd prefer to use light.
  const p = palette<string>(options.theme ?? "dark");

  for (const timeline of timelines) {
    p.add(timeline.meta.id, timeline.meta.color);
  }

  const paletteMeta = p.toPalette();
  const colors = paletteMeta.lookup;

  const ranks = new Map<TimelineReferenceRenderer, number>(timelines.map(_ => [_, rank(_)]));
  const styleSheet = styles([...ranks.values()]).toStyleSheet();

  const d = dot();

  d.raw("digraph timeline {");
  const FONT_SIZE = 12;
  //const FONT_NODES = "Simple Plan";
  //const FONT_EDGES = "Master Photograph";
  d.raw(`node [fontname="${FONTS_SYSTEM}"; fontsize="${FONT_SIZE}";]`);
  d.raw(`edge [fontname="${FONTS_SYSTEM}"; fontsize="${FONT_SIZE}";]`);
  d.raw(`bgcolor="${TRANSPARENT}"`);
  d.raw('comment=" "');
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
  const firstNodeAlreadySeen = new Set<TimelineReferenceRenderer>();
  let nextEventIndex = 0;

  /**
   * We iterate over each unique timestamp that exists globally.
   * For each unique timestamp, we want to look at all global events that
   * exist at this timestamp.
   */
  for (const timestamp of timestampsUnique) {
    // Fast-forward through skip section.
    if (
      timestamp < (options.skipBefore ?? Number.NEGATIVE_INFINITY) ||
      (options.skipAfter ?? Number.POSITIVE_INFINITY) < timestamp
    ) {
      while (
        nextEventIndex < timelineGlobal.length &&
        timelineGlobal[nextEventIndex][0] === timestamp
      ) {
        ++nextEventIndex;
      }
      continue;
    }

    // Convert the timestamp to a Date for API features.
    const date = new Date(timestamp);
    let eventIndex = 0;
    const makeId = () =>
      `${date.getFullYear().toFixed().padStart(4, "0")}-${(date.getMonth() + 1).toFixed().padStart(2, "0")}-${date.getDate().toFixed().padStart(2, "0")}-${eventIndex++}`;
    // We need the current year to support the "cluster years" feature.
    const currentYear = date.getFullYear();

    const timePassedSinceOrigin = timestamp - origin;
    const timePassedSinceThen = now - timestamp;

    if (options.clusterYears && currentYear !== previousYear) {
      if (previousYear !== undefined) {
        d.raw("}");
      }
      d.raw(`subgraph cluster_${currentYear} {`);
      d.raw(`fontname="${FONTS_SYSTEM}"`);
      d.raw(`fontsize="${FONT_SIZE}"`);
      d.raw(`label="${currentYear}"`);
      d.raw(`penwidth="0.2"`);
      d.raw(`style="dashed,rounded"`);
    }

    // We now iterate over all global events at the current timestamp.
    while (
      nextEventIndex < timelineGlobal.length &&
      timelineGlobal[nextEventIndex][0] === timestamp
    ) {
      const contributors = new Set<TimelineReferenceRenderer>();
      let leader: TimelineReferenceRenderer | undefined;

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

        contributors.add(timeline);
        if (rank(leader) <= rank(timeline)) {
          leader = timeline;
        }

        ++nextEventIndex;
      } while (
        nextEventIndex < timelineGlobal.length - 1 &&
        timelineGlobal[nextEventIndex][0] === timestamp &&
        timelineGlobal[nextEventIndex][2].title === entry.title
      );

      contributors.forEach(_ => firstNodeAlreadySeen.add(_));

      const id = makeId();
      const dateString = options?.dateRenderer
        ? options.dateRenderer(timestamp)
        : new Date(timestamp).toDateString();

      const style = mustExist(styleSheet.get(rank(leader)));
      const color = mustExist(colors.get(mustExist(leader).meta.id)).pen;

      const fillcolor = contributors
        .values()
        .reduce((fillColors, timeline) => {
          const fill = mustExist(colors.get(timeline.meta.id)).fill;

          // Whatever we want to draw, _one_ transparent fill should be enough.
          if (fill === TRANSPARENT && fillColors.includes(TRANSPARENT)) {
            return fillColors;
          }

          fillColors.push(
            timeline === leader || fill === TRANSPARENT
              ? fill
              : matchLuminance(fill, mustExist(colors.get(mustExist(leader).meta.id)).fill),
          );
          return fillColors;
        }, new Array<string>())
        .join(":");

      const fontcolor = mustExist(colors.get(mustExist(leader).meta.id)).font;

      const prefixes = contributors
        .values()
        .reduce((_, timeline) => _ + (timeline.meta.prefix ?? ""), "");

      const nodeProperties: Partial<NodeProperties> = {
        color,
        fillcolor,
        fontcolor,
        id,
        label: makeHtmlString(
          `${(0 < prefixes.length ? `${prefixes} ` : "") + entry.title}\\n${dateString}`,
        ),
        penwidth: style.outline ? style.penwidth : 0,
        shape: style.shape,
        style: style.style?.join(","),
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
    const color = mustExist(colors.get(timeline.meta.id)).pen;
    const style = mustExist(styleSheet.get(rank(timeline)));

    // The timestamp we looked at during the last iteration.
    let previousTimestamp: number | undefined;
    // The entries at the previous timestamp.
    let previousEntries = new Array<TimelineEntry>();
    // How many milliseconds passed since the previous timestamp.
    let timePassed = 0;
    nextEventIndex = 0;

    for (const [timestamp] of timeline.records) {
      // Fast-forward through skip section.
      if (
        timestamp < (options.skipBefore ?? Number.NEGATIVE_INFINITY) ||
        (options.skipAfter ?? Number.POSITIVE_INFINITY) < timestamp
      ) {
        do {
          ++nextEventIndex;
        } while (
          nextEventIndex < timelineGlobal.length &&
          timelineGlobal[nextEventIndex][0] === timestamp
        );
        continue;
      }

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
            penwidth: style.link ? (style.outline ? style.penwidth : 0) : undefined,
            style: style.link ? "solid" : "invis",
            tooltip: style.link
              ? `${formatMilliseconds(timePassed)} (${linkLength} ranks)`
              : undefined,
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
    // Fast-forward through skip section.
    if (
      timestamp < (options.skipBefore ?? Number.NEGATIVE_INFINITY) ||
      (options.skipAfter ?? Number.POSITIVE_INFINITY) < timestamp
    ) {
      while (
        nextEventIndex < timelineGlobal.length &&
        timelineGlobal[nextEventIndex][0] === timestamp
      ) {
        ++nextEventIndex;
      }
      continue;
    }

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
          tooltip: options.debug
            ? `${formatMilliseconds(timePassed)} (carrying ${remainder})`
            : undefined,
        });
      }
    }

    previousTimestamp = timestamp;
    previousTimestampEntries = processedEntries;
  }

  d.raw("}");

  return { graph: d.toString(), palette: paletteMeta, ranks, styles: styleSheet };
};
