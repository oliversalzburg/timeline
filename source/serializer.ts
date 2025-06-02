import { stringify } from "yaml";
import type { Timeline } from "./types.js";

export const serialize = (timeline: Timeline, metadata: Record<string | number, unknown> = {}) => {
  const document = {
    ...timeline.meta,
    ...metadata,
    timeline: Object.fromEntries(timeline.records),
  };
  return stringify(document);
};
