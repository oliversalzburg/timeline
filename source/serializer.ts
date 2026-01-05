import { stringify } from "yaml";
import type {
	MetaSectionAncestryRenderer,
	MetaSectionReferenceRenderer,
	Timeline,
	TimelineDocumentInternal,
	TimelineEntry,
	TimelineFlexibleInput,
	TimelinePlain,
} from "./types.js";

export const serialize = (
	timeline: Timeline | TimelinePlain,
	metadata: MetaSectionAncestryRenderer | MetaSectionReferenceRenderer,
	serializeId = false,
) => {
	const serializeEntry = (entry: TimelineEntry) => {
		return entry.generated
			? { title: entry.title, generated: true }
			: entry.title;
	};
	const document: TimelineDocumentInternal = {
		...("meta" in timeline && typeof timeline.meta === "object"
			? timeline.meta
			: {}),
		...metadata,
		timeline: timeline.records.reduce((serialized, [timestamp, entry]) => {
			const date = new Date(timestamp);
			const dateString = `${date.getFullYear().toFixed().padStart(4, "0")}-${(date.getMonth() + 1).toFixed().padStart(2, "0")}-${date.getDate().toFixed().padStart(2, "0")}`;
			const dateValueFromDateString = Date.parse(dateString);
			const remainder = date.valueOf() - dateValueFromDateString;
			if (remainder === 0) {
				serialized[dateString] =
					dateString in serialized
						? Array.isArray(serialized[dateString])
							? [...serialized[dateString], serializeEntry(entry)]
							: [serialized[dateString], serializeEntry(entry)]
						: serializeEntry(entry);
				return serialized;
			}

			const timeString = `${dateString}T${date.getHours().toFixed().padStart(2, "0")}:${date.getMinutes().toFixed().padStart(2, "0")}:${date.getSeconds().toFixed().padStart(2, "0")}Z`;
			serialized[timeString] =
				timeString in serialized
					? Array.isArray(serialized[timeString])
						? [...serialized[timeString], serializeEntry(entry)]
						: [serialized[timeString], serializeEntry(entry)]
					: serializeEntry(entry);
			return serialized;
		}, {} as TimelineFlexibleInput),
	};

	if (serializeId !== true) {
		delete document.id;
	}

	return stringify(document);
};
