import { MILLISECONDS } from "./constants.js";
import type { TimelineRecord } from "./types.js";

export const recurringYearly = (
  date: Date,
  title: string,
  limit = 100,
  offset = 1,
): Array<TimelineRecord> =>
  new Array(limit)
    .fill(0)
    .map((_, index) => [
      Date.UTC(
        date.getUTCFullYear() + index + offset,
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds(),
      ),
      { title: `${title} #${index + offset}` },
    ]);

export const interval = (
  date: Date,
  title: string,
  intervalMilliseconds = MILLISECONDS.ONE_MONTH,
  limit = 100,
  offset = 0,
) =>
  new Array(limit)
    .fill(0)
    .map((_, index) => [
      date.valueOf() + intervalMilliseconds * (index + offset),
      { title: `${title} #${index + offset}` },
    ]);
