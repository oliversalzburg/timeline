import { stringify } from "yaml";
import type { Timeline } from "./types.js";

export const serialize = (timeline: Timeline, metadata: Record<string | number, unknown> = {}) => {
  const document = {
    ...metadata,
    timeline,
  };
  return stringify(document);
};
