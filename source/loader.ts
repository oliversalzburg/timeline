import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { sortRecords } from "./operator.js";
import type { Timeline, TimelineDocument, TimelineEntry, TimelineRecord } from "./types.js";

export const voidInvalidEntry = (entry?: unknown) => {
  if (entry && "title" in (entry as Record<string, unknown>)) {
    return entry as TimelineEntry;
  }
  return { title: "Entry is malformed. Please check input document." };
};

export const load = (document: TimelineDocument, id: string): Timeline => {
  if (!("timeline" in document)) {
    throw new InvalidOperationError(
      "The provided document does not contain a 'timeline' property! This document can not be loaded.",
    );
  }

  if (typeof document.timeline !== "object") {
    throw new InvalidOperationError(
      "The 'timeline' property in the document is of an unexpected type! Timelines need to be maps that point timestamps to entries.",
    );
  }

  const timelineEntries: Array<TimelineRecord> = [];
  for (const [timestampRaw, entry] of Object.entries(document.timeline)) {
    const subjects = Array.isArray(entry) ? entry : [entry];
    for (const entryElement of subjects) {
      const timestampAsNumber = Number.parseInt(timestampRaw, 10);
      const timestampBackToString = timestampAsNumber.toFixed(0);
      const isUnixTimestamp =
        timestampRaw === timestampBackToString &&
        (timestampAsNumber < 199 || 2999 < timestampAsNumber);

      timelineEntries.push([
        isUnixTimestamp ? timestampAsNumber : Date.parse(timestampRaw),
        ["number", "string"].includes(typeof entryElement)
          ? { title: entryElement.toString() }
          : voidInvalidEntry(entryElement),
      ]);
    }
  }

  const meta = {
    id,
    ...Object.fromEntries(
      Object.entries(document).filter(([key]) => !["id", "records"].includes(key)),
    ),
  };

  return {
    meta,
    records: sortRecords(timelineEntries),
  };
};
