import type { Timeline, TimelineEntry, TimelineRecord } from "./types.js";

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

export const roundToDay = (timeline: Timeline): Timeline => {
  for (const _ of timeline.records) {
    _[0] = new Date(_[0]).setHours(0, 0, 0, 0).valueOf();
  }
  return timeline;
};

export const sort = (timeline: Timeline): Timeline => {
  return {
    ...timeline,
    records: timeline.records.toSorted(([a], [b]) => a - b),
  };
};

export const add = (
  timeline: Timeline,
  record: TimelineRecord,
): Timeline => {
  return {
    ...timeline,
    records: timeline.records.concat([record]),
  };
};

export const concat = (
  timeline: Timeline,
  record: Array<TimelineRecord>,
): Timeline => {
  return {
    ...timeline,
    records: timeline.records.concat(record),
  };
};
