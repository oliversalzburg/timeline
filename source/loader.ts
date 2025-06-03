import type { Timeline, TimelineDocument, TimelineRecord } from "./types.js";

export const load = (document: TimelineDocument): Timeline => {
  const timelineEntries = [...Object.entries(document.timeline)].map(
    ([timestampLike, entry]) =>
      [
        new Date(timestampLike).valueOf(),
        ["number", "string"].includes(typeof entry) ? { title: entry.toString() } : entry,
      ] as TimelineRecord,
  );

  timelineEntries.sort(([a, _a], [b, _b]) => a - b);

  return {
    meta: { color: document.color },
    records: timelineEntries.sort(([a, _a], [b, _b]) => a - b),
  } as Timeline;
};
