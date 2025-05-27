import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import type { Timeline, TimelineMetrics } from "./types.js";

/**
 * The timeline is expected to already be sorted.
 */
export const analyze = (timeline: Timeline): TimelineMetrics => {
  if (timeline.length < 1) {
    throw new InvalidOperationError("Timelines must contain at least one item.");
  }

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
    durationTotal: mustExist(latest) - mustExist(earliest),
    periodLongest: longest ?? 0,
    periodShortest: shortest ?? 0,
    timeEarliest: mustExist(earliest),
    timeLatest: mustExist(latest),
  };
};
