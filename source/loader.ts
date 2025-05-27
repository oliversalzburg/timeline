import { analyze } from "./analyzer.js";
import type { Timeline, TimelineDocument, TimelineRecord, TimelineSimple } from "./types.js";

export interface LoaderOptions {
  addNewYearMarkers: boolean;
  addNow: boolean;
}

export const load = (
  document: TimelineDocument,
  options: Partial<LoaderOptions> = {},
): Timeline => {
  const timelineEntries = [...Object.entries(document.timeline)].map(
    ([timestampLike, entry]) =>
      [
        new Date(timestampLike).getTime(),
        typeof entry === "string" ? { title: entry } : entry,
      ] as TimelineRecord,
  );

  if (options.addNow) {
    timelineEntries.push([Date.now(), { title: "Now" }] as TimelineRecord);
  }

  timelineEntries.sort(([a, _a], [b, _b]) => a - b);

  if (options.addNewYearMarkers) {
    const metrics = analyze(timelineEntries);
    for (
      let year = new Date(metrics.timeEarliest).getUTCFullYear();
      year < new Date(metrics.timeLatest).getUTCFullYear();
      ++year
    ) {
      const timestamp = Date.UTC(year, 0).valueOf();

      // Offset existing entries at this time.
      let request = timestamp;
      let conflict: TimelineRecord | undefined;
      while (
        (conflict = timelineEntries.find(subject => subject !== conflict && subject[0] === request))
      ) {
        conflict[0] += 1;
        request += 1;
      }

      timelineEntries.push([timestamp, { title: year.toString() }]);
    }
  }

  return timelineEntries.sort(([a, _a], [b, _b]) => a - b) as Timeline;
};
