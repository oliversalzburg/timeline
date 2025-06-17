import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import type { TimelineMetrics, TimelineRecord } from "./types.js";

/**
 * The timeline is expected to already be sorted.
 */
export const analyze = (timeline: Array<TimelineRecord>): TimelineMetrics => {
  let earliest;
  let latest;
  let shortest;
  let longest;
  let previous;
  for (const [timestamp, _] of timeline) {
    if (earliest === undefined) {
      earliest = timestamp;
    }
    latest = timestamp;

    const toPrevious = previous !== undefined ? timestamp - previous : undefined;
    if (toPrevious !== undefined) {
      if (shortest === undefined || toPrevious < shortest) {
        shortest = toPrevious;
      }
      if (longest === undefined || longest < toPrevious) {
        longest = toPrevious;
      }
    }

    previous = timestamp;
  }

  return {
    durationTotal:
      latest !== undefined && earliest !== undefined ? mustExist(latest) - mustExist(earliest) : 0,
    periodLongest: longest ?? 0,
    periodShortest: shortest ?? 0,
    timeEarliest: earliest ?? Number.POSITIVE_INFINITY,
    timeLatest: latest ?? Number.NEGATIVE_INFINITY,
  };
};
