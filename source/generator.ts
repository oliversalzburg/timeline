import { MILLISECONDS } from "./constants.js";
import type { TimelineRecord } from "./types.js";

export const recurringYearly = (
	date: Date,
	title: string | ((index: number) => string),
	limit = 100,
	offset = 1,
	skip = 0,
): Array<TimelineRecord> =>
	new Array(limit - skip).fill(0).map((_, index) => [
		Date.parse(
			`${date.getFullYear() + index + offset + skip}-${
				date.getMonth() + 1
			}-${date.getDate()}`,
		),
		{
			generated: true,
			title:
				typeof title === "string"
					? 0 < index + offset + skip
						? `${title} #${index + offset + skip}`
						: title
					: title(index + offset + skip),
		},
	]);

export const interval = (
	date: Date,
	title: string | ((index: number) => string),
	intervalMilliseconds = MILLISECONDS.ONE_MONTH,
	limit = 100,
	offset = 0,
) =>
	new Array(limit).fill(0).map((_, index) => [
		date.valueOf() + intervalMilliseconds * (index + offset),
		{
			title:
				typeof title === "string"
					? 0 < index + offset
						? `${title} #${index + offset}`
						: title
					: title(index + offset),
		},
	]);
