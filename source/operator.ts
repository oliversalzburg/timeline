import type { Timeline } from "./types.js";

export const flatten = (timeline: Timeline): Timeline => {
  let previousTimestamp;
  let corrections = 0;
  for (const _ of timeline.records) {
    const [timestamp] = _;
    if (timestamp === previousTimestamp) {
      _[0] += 0.1;
      ++corrections;
    }
    previousTimestamp = timestamp;
  }

  if (0 < corrections) {
    return flatten(timeline);
  }

  return timeline;
};
