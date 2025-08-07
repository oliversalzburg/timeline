import { stringify } from "yaml";
import type {
	Timeline,
	TimelineDocumentInternal,
	TimelineFlexibleInput,
	TimelinePlain,
} from "./types.js";

export const serialize = (
	timeline: Timeline | TimelinePlain,
	metadata: Record<string | number, unknown> = {},
) => {
	const document: TimelineDocumentInternal = {
		...("meta" in timeline && typeof timeline.meta === "object"
			? timeline.meta
			: {}),
		...metadata,
		timeline: timeline.records.reduce((serialized, [timestamp, entry]) => {
			const date = new Date(timestamp);
			const dateString = `${date.getFullYear().toFixed().padStart(4, "0")}-${(date.getMonth() + 1).toFixed().padStart(2, "0")}-${date.getDate().toFixed().padStart(2, "0")}`;
			serialized[dateString] =
				dateString in serialized
					? Array.isArray(serialized[dateString])
						? [...serialized[dateString], entry.title]
						: [serialized[dateString], entry.title]
					: entry.title;
			return serialized;
		}, {} as TimelineFlexibleInput),
	};
	delete document.id;
	return stringify(document);
};
