import type { Timeline, TimelineRecord } from "./types.js";

export const add = (timeline: Timeline, record: TimelineRecord): Timeline => {
  return concat(timeline, [record]);
};

export const concat = (timeline: Timeline, records: Array<TimelineRecord>): Timeline => {
  return {
    ...timeline,
    records: timeline.records.concat(records),
  };
};

export const deduplicateRecords = (records: Array<TimelineRecord>): Array<TimelineRecord> => {
  const unique = new Array<TimelineRecord>();
  let previousTimestamp;
  let previousEntry;
  for (const record of records) {
    const [timestamp, entry] = record;
    if (timestamp === previousTimestamp && entry.title === previousEntry) {
      continue;
    }
    unique.push(record);
    previousTimestamp = timestamp;
    previousEntry = entry.title;
  }
  return unique;
};

export const sort = (timeline: Timeline): Timeline => {
  return {
    ...timeline,
    records: sortRecords(timeline.records),
  };
};

export const sortRecords = (records: Array<TimelineRecord>): Array<TimelineRecord> => {
  return records.toSorted(([a], [b]) => a - b);
};

export const joinDuringPeriod = (
  start: number,
  end: number,
  host: Timeline,
  guests: Array<Timeline>,
): void => {
  const period = new Array<TimelineRecord>();
  for (const [timestamp, entry] of host.records) {
    if (timestamp < start) {
      continue;
    }
    if (end < timestamp) {
      break;
    }
    period.push([timestamp, entry]);
  }
  for (const guest of guests) {
    guest.records = sortRecords(guest.records.concat(period));
  }
};

export const mergeDuringPeriod = (start: number, end: number, guests: Array<Timeline>): void => {
  const period = new Array<TimelineRecord>();
  for (const guest of guests) {
    for (const [timestamp, entry] of guest.records) {
      if (timestamp < start) {
        continue;
      }
      if (end < timestamp) {
        break;
      }
      period.push([timestamp, entry]);
    }
  }
  for (const guest of guests) {
    guest.records = deduplicateRecords(sortRecords(guest.records.concat(period)));
  }
};

export const roundToDay = (timeline: Timeline): Timeline => {
  for (const _ of timeline.records) {
    _[0] = new Date(_[0]).setHours(0, 0, 0, 0).valueOf();
  }
  return timeline;
};
