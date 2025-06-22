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

export const map = (
  timeline: Timeline,
  fn: (record: TimelineRecord) => TimelineRecord,
): Timeline => {
  return {
    ...timeline,
    records: timeline.records.map(record => fn(record)),
  };
};

export const deduplicateRecords = (records: Array<TimelineRecord>): Array<TimelineRecord> => {
  const unique = new Array<TimelineRecord>();
  let previousTimestamp: number | undefined;
  let previousEntry: string | undefined;
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

export const uniquify = (timeline: Timeline): Timeline => {
  return {
    ...timeline,
    records: uniquifyRecords(timeline.records),
  };
};

export const uniquifyRecords = (records: Array<TimelineRecord>): Array<TimelineRecord> => {
  const counts = new Map<string, number>();
  for (const record of records) {
    const [, entry] = record;
    counts.set(entry.title, (counts.get(entry.title) ?? 0) + 1);
  }
  const result = new Array<TimelineRecord>();
  for (const record of records.toReversed()) {
    const [timestamp, entry] = record;
    const count = counts.get(entry.title);
    if (count === 1) {
      result.push([timestamp, entry]);
      continue;
    }
    counts.set(entry.title, (count ?? 0) - 1);
    result.push([timestamp, { title: `${entry.title} 🔁${(count ?? 0) - 1}` }]);
  }
  return result.reverse();
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

export const roundDateToDay = (date: number): number =>
  new Date(date).setHours(0, 0, 0, 0).valueOf();

export const roundToDay = (timeline: Timeline): Timeline => {
  for (const _ of timeline.records) {
    _[0] = roundDateToDay(_[0]);
  }
  return timeline;
};
