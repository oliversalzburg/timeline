import {
	Random,
	seedFromString,
} from "@oliversalzburg/js-utils/data/random.js";
import type { Identity, Timeline, TimelineRecord } from "./types.js";

export const add = (timeline: Timeline, record: TimelineRecord): Timeline => {
	return concat(timeline, [record]);
};

export const concat = (
	timeline: Timeline,
	records: Array<TimelineRecord>,
): Timeline => {
	return {
		...timeline,
		records: timeline.records.concat(records),
	};
};

export const map = (
	timeline: Timeline,
	fn: (record: TimelineRecord) => TimelineRecord,
): Timeline => {
	return {
		...timeline,
		records: timeline.records.map((record) => fn(record)),
	};
};

export const intersect = (
	left: Timeline,
	right: Timeline,
): Array<TimelineRecord> => {
	if (left.records.length === 0 || right.records.length === 0) {
		return [];
	}

	const intersection = new Array<TimelineRecord>();
	let indexLeft = 0;
	let indexRight = 0;
	for (;;) {
		let recordLeft = left.records[indexLeft];
		let recordRight = right.records[indexRight];
		while (indexLeft < left.records.length && recordLeft[0] < recordRight[0]) {
			++indexLeft;
			recordLeft = left.records[indexLeft];
		}
		while (
			indexRight < right.records.length &&
			recordRight[0] < recordLeft[0]
		) {
			++indexRight;
			recordRight = right.records[indexRight];
		}
		if (
			indexLeft < left.records.length &&
			indexRight < right.records.length &&
			recordLeft[0] === recordRight[0] &&
			recordLeft[1].title === recordRight[1].title
		) {
			intersection.push(recordLeft);
		}
		++indexLeft;
		++indexRight;
		if (
			left.records.length <= indexLeft ||
			right.records.length <= indexRight
		) {
			break;
		}
	}
	return intersection;
};

export const deduplicateRecords = (
	records: Array<TimelineRecord>,
): Array<TimelineRecord> => {
	const unique = new Array<TimelineRecord>();
	let previousTimestamp: number | undefined;
	let previousEntry: string | undefined;
	for (const record of records) {
		const [timestamp, entry] = record;
		if (timestamp === previousTimestamp && entry.title === previousEntry) {
			continue;
		}
		unique.push(record);
		previousTimestamp = timestamp;
		previousEntry = entry.title;
	}
	return unique;
};

export const uniquifyCache = (
	records: Array<TimelineRecord>,
): Map<string, number> => {
	const result = [...records];
	const counts = new Map<string, number>();
	if (counts.size === 0) {
		for (const record of result) {
			const [, entry] = record;
			counts.set(entry.title, (counts.get(entry.title) ?? 0) + 1);
		}
	}
	return counts;
};

export const uniquify = <T extends Timeline>(
	timeline: T,
	counts?: Map<string, number>,
): T => {
	return {
		...timeline,
		records: uniquifyRecords(timeline.records, counts),
	};
};

export const uniquifyRecords = (
	records: Array<TimelineRecord>,
	counts = uniquifyCache(records),
): Array<TimelineRecord> => {
	const result = [...records];
	const duplicateTitles = new Set(
		counts
			.entries()
			.filter(([, count]) => 1 < count)
			.map(([name]) => name),
	);
	let subjects = result.filter(([, entry]) => duplicateTitles.has(entry.title));

	// Append year to subjects.
	counts.clear();
	for (const subject of subjects) {
		const date = new Date(subject[0]);
		const year = date.getFullYear().toString();
		subject[1].title = subject[1].title.replace(/$/, ` (${year})`);
		counts.set(subject[1].title, (counts.get(subject[1].title) ?? 0) + 1);
	}

	const duplicateTitlesWithYear = new Set(
		counts
			.entries()
			.filter(([, count]) => 1 < count)
			.map(([name]) => name),
	);
	subjects = result.filter(([, entry]) =>
		duplicateTitlesWithYear.has(entry.title),
	);

	// Append month to subjects.
	counts.clear();
	for (const subject of subjects) {
		const date = new Date(subject[0]);
		const year = date.getFullYear().toString();
		const month = (date.getMonth() + 1).toFixed().padStart(2, "0");
		subject[1].title = subject[1].title.replace(
			new RegExp(` \\(${year}\\)$`),
			` (${month}.${year})`,
		);
		counts.set(subject[1].title, (counts.get(subject[1].title) ?? 0) + 1);
	}

	const duplicateTitlesWithMonth = new Set(
		counts
			.entries()
			.filter(([, count]) => 1 < count)
			.map(([name]) => name),
	);
	subjects = result.filter(([, entry]) =>
		duplicateTitlesWithMonth.has(entry.title),
	);

	// Append day to subjects.
	counts.clear();
	for (const subject of subjects) {
		const date = new Date(subject[0]);
		const year = date.getFullYear().toString();
		const month = (date.getMonth() + 1).toFixed().padStart(2, "0");
		const day = date.getDate().toFixed().padStart(2, "0");
		subject[1].title = subject[1].title.replace(
			new RegExp(` \\(${month}.${year}\\)$`),
			` (${day}.${month}.${year})`,
		);
		counts.set(subject[1].title, (counts.get(subject[1].title) ?? 0) + 1);
	}

	return result;
};

export const sort = <T extends Timeline>(timeline: T): T => {
	return {
		...timeline,
		records: sortRecords(timeline.records),
	};
};

export const sortRecords = (
	records: Array<TimelineRecord>,
): Array<TimelineRecord> => {
	return records.toSorted(([a, aMeta], [b, bMeta]) =>
		a === b ? aMeta.title.localeCompare(bMeta.title) : a - b,
	);
};

export const joinDuringPeriod = (
	start: number,
	end: number,
	host: Timeline,
	guests: Array<Timeline>,
): void => {
	const period = new Array<TimelineRecord>();
	for (const [timestamp, entry] of host.records) {
		if (timestamp < start) {
			continue;
		}
		if (end < timestamp) {
			break;
		}
		period.push([timestamp, entry]);
	}
	for (const guest of guests) {
		guest.records = sortRecords(guest.records.concat(period));
	}
};

export const mergeDuringPeriod = (
	start: number,
	end: number,
	guests: Array<Timeline>,
): void => {
	const period = new Array<TimelineRecord>();
	for (const guest of guests) {
		for (const [timestamp, entry] of guest.records) {
			if (timestamp < start || end < timestamp) {
				continue;
			}
			period.push([timestamp, entry]);
		}
	}
	for (const guest of guests) {
		guest.records = deduplicateRecords(
			sortRecords(guest.records.concat(period)),
		);
	}
};

export const roundDateToDay = (date: number): number =>
	new Date(date).setHours(0, 0, 0, 0).valueOf();

export const roundToDay = <T extends Timeline>(timeline: T): T => {
	for (const _ of timeline.records) {
		_[0] = roundDateToDay(_[0]);
	}
	return timeline;
};

export const anonymize = <T extends Timeline>(timeline: T, seed: string): T => {
	return {
		...timeline,
		records: anonymizeRecords(timeline.records, seed),
	};
};

export const anonymizeString = (
	subject: string,
	randomOrSeed: Random | string,
): string => {
	const random =
		typeof randomOrSeed === "string"
			? new Random(seedFromString(randomOrSeed))
			: randomOrSeed;
	const lengthOriginal = subject.length;
	const lengthVariance = Math.max(1, Math.floor(lengthOriginal * 0.15));
	const lengthNew =
		lengthOriginal + random.nextRange(-lengthVariance, lengthVariance);
	const wordCount = Math.max(1, Math.floor(lengthNew / random.nextRange(4, 6)));
	const words = new Array<string>();
	let lineWidth = 0;
	while (words.length < wordCount) {
		const wordRandom = random.nextString(
			random.nextRange(2, 10),
			"aeiou".repeat(4) +
				"abcdefghiklmnoprstu".repeat(3) +
				"abcdefghijklmnopqrstuvwxyz" +
				"äöüß",
		);
		const word =
			words.length === 0 || random.nextBoolean()
				? wordRandom.substring(0, 1).toLocaleUpperCase() +
					wordRandom.substring(1)
				: wordRandom;
		words.push(word);

		lineWidth += word.length;
		if (25 < lineWidth) {
			lineWidth = 0;
			words.push("\n");
		}
	}
	return words.join(" ").trim();
};

export const anonymizeIdentity = (
	subject: Identity,
	seed: string,
): Identity => {
	const random = new Random(seedFromString(seed));
	return {
		id: anonymizeString(subject.id, random),
		born: {
			date: new Date().toISOString(),
			where:
				subject.born?.where !== undefined
					? anonymizeString(subject.born?.where, random)
					: undefined,
		},
	};
};

export const anonymizeRecords = (
	records: Array<TimelineRecord>,
	seed: string,
): Array<TimelineRecord> => {
	const random = new Random(seedFromString(seed));
	return records.map(([_, entry]) => {
		const lengthOriginal = entry.title.length;
		const lengthVariance = Math.max(1, Math.floor(lengthOriginal * 0.15));
		const lengthNew =
			lengthOriginal + random.nextRange(-lengthVariance, lengthVariance);
		const wordCount = Math.max(
			1,
			Math.floor(lengthNew / random.nextRange(4, 6)),
		);
		const words = new Array<string>();
		let lineWidth = 0;
		while (words.length < wordCount) {
			const wordRandom = random.nextString(
				random.nextRange(2, 10),
				"aeiou".repeat(4) +
					"abcdefghiklmnoprstu".repeat(3) +
					"abcdefghijklmnopqrstuvwxyz" +
					"äöüß",
			);
			const word =
				words.length === 0 || random.nextBoolean()
					? wordRandom.substring(0, 1).toLocaleUpperCase() +
						wordRandom.substring(1)
					: wordRandom;
			words.push(word);

			lineWidth += word.length;
			if (25 < lineWidth) {
				lineWidth = 0;
				words.push("\n");
			}
		}
		const title = anonymizeString(entry.title, random);
		return [_, { ...entry, title }];
	});
};
