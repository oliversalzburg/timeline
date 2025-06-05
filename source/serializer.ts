import { stringify } from "yaml";
import type { Timeline, TimelineDocument, TimelineFlexibleInput } from "./types.js";

export const serialize = (timeline: Timeline, metadata: Record<string | number, unknown> = {}) => {
  const document: TimelineDocument = {
    ...timeline.meta,
    ...metadata,
    timeline: timeline.records.reduce((serialized, [timestamp, entry]) => {
      serialized[timestamp] =
        timestamp in serialized
          ? Array.isArray(serialized[timestamp])
            ? [...serialized[timestamp], entry.title]
            : [serialized[timestamp], entry.title]
          : entry.title;
      return serialized;
    }, {} as TimelineFlexibleInput),
  };
  return stringify(document);
};
