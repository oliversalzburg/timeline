import type { Timeline, TimelineDocument } from "./types.js";

export const load = (document: TimelineDocument): Timeline => {
  return Object.entries(document.timeline)
    .map(
      ([timestampLike, entryText]) =>
        [new Date(timestampLike).getTime(), { title: entryText }] as const,
    )
    .sort(([a, _a], [b, _b]) => a - b) as Timeline;
};
