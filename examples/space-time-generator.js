#!/bin/env node

import { createWriteStream, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isNil, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import {
	anonymize,
	deduplicateRecords,
	IdentityGraph,
	load,
	MILLISECONDS,
	map,
	mergeDuringPeriod,
	recurringYearly,
	roundDateToDay,
	serialize,
	sort,
	sortRecords,
	uncertainEventToDateArtistic,
	uncertainEventToDateDeterministic,
	uniquifyRecords,
} from "../lib/index.js";

// Parse command line arguments.
const args = process.argv
	.slice(2)
	.filter((_) => _.startsWith("--"))
	.reduce(
		(args, _) => {
			const argument = _.substring(2);
			const parts = argument.match(/^(?<name>[^=]+)=?(?<value>.*)$/);
			if (parts === null || parts.groups === undefined) {
				return args;
			}

			args[parts.groups.name ?? parts.groups.value] =
				typeof parts.groups.value === "string" && parts.groups.value !== ""
					? parts.groups.value
					: true;

			return args;
		},
		/** @type {Record<string, boolean | string>} */ ({}),
	);

if (typeof args.root !== "string") {
	process.stderr.write("Missing --root.\n");
	process.exit(1);
}
if (typeof args.origin !== "string") {
	process.stderr.write("Missing --origin.\n");
	process.exit(1);
}

/**
 * @import { TimelineAncestryRenderer, TimelineReferenceRenderer } from "../lib/types.js"
 */

const seed = [...crypto.getRandomValues(new Uint32Array(10))]
	.map((_) => _.toString(16))
	.join("");

const targetPath = typeof args.target === "string" ? args.target : undefined;
const originPath = resolve(args.origin);
const timelinePaths = readdirSync(args.root, {
	recursive: true,
	withFileTypes: true,
})
	.filter((_) => _.isFile() && _.name.endsWith(".yml"))
	.map((_) => `${_.parentPath}/${_.name}`)
	.sort();

/** @type {Array<TimelineAncestryRenderer | TimelineReferenceRenderer>} */
const allTimelines = [];
let originTimeline;
for (const timelinePath of timelinePaths) {
	const timelineData = readFileSync(timelinePath, "utf8");
	if (!timelineData.startsWith("---")) {
		process.stderr.write(
			`${timelinePath} is missing document separator! File is skipped.\n`,
		);
		continue;
	}

	const timelineObject = parse(timelineData);
	const timeline = load(timelineObject, timelinePath);
	if (timelinePath === originPath) {
		originTimeline = timeline;
		continue;
	}
	allTimelines.push(timeline);
}

if (originTimeline === undefined) {
	process.stderr.write(`${originPath} was not ingested. Failed.\n`);
	process.exit(1);
}

if (args.anonymize) {
	const graph = new IdentityGraph(
		[originTimeline, ...allTimelines],
		"invalid",
	).anonymize(seed);

	allTimelines.length = 0;
	originTimeline = undefined;

	for (const timeline of graph.timelines) {
		if (timeline.meta.id === originPath) {
			originTimeline = anonymize(timeline, seed + timeline.meta.id);
			continue;
		}
		const anonymized = anonymize(timeline, seed + timeline.meta.id);
		allTimelines.push(anonymized);
	}
}

if (originTimeline === undefined) {
	process.stderr.write(`${originPath} was not ingested. Failed.\n`);
	process.exit(1);
}

/**
 * @param timeline {TimelineAncestryRenderer | TimelineReferenceRenderer} -
 */
const fill = (timeline) => {
	if ("identity" in timeline.meta === false) {
		return timeline;
	}

	let birth;
	if (timeline.meta.identity.born !== null) {
		birth = uncertainEventToDateArtistic(timeline.meta.identity.born);
	}

	if (isNil(birth)) {
		return timeline;
	}

	timeline.meta.generated = timeline.records.length === 0;

	const name = timeline.meta.identity.name ?? timeline.meta.identity.id;

	let death;
	if (timeline.meta.identity.died === null) {
		death = new Date(birth.valueOf() + MILLISECONDS.ONE_YEAR * 85);
	} else {
		death = uncertainEventToDateArtistic(timeline.meta.identity.died);
	}

	const birthYear = birth.getFullYear();
	const birthMonth = birth.getMonth() + 1;
	const birthDay = birth.getDate();
	const age = Math.floor(
		death === undefined
			? 85
			: (death.valueOf() - birth.valueOf()) / MILLISECONDS.ONE_YEAR,
	);

	const marriages =
		timeline.meta.identity.relations?.filter(
			(relation) => "marriedTo" in relation,
		) ?? [];

	/**
	 * @param date {Date} -
	 */
	const nameAtDate = (date) => {
		let marriageBeforeDate;
		let bestDate;
		for (const marriage of marriages) {
			const marriageDate = uncertainEventToDateDeterministic(marriage);
			if (
				marriageDate !== undefined &&
				date.valueOf() < marriageDate.valueOf()
			) {
				continue;
			}
			if (marriageBeforeDate === undefined) {
				marriageBeforeDate = marriage;
				bestDate = marriageDate;
				continue;
			}
			if (
				marriageDate !== undefined &&
				bestDate !== undefined &&
				bestDate.valueOf() < marriageDate.valueOf()
			) {
				marriageBeforeDate = marriage;
				bestDate = marriageDate;
			}
		}
		return marriageBeforeDate?.as ?? name;
	};

	const birthdays = recurringYearly(
		new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0),
		(index) =>
			`${index}. Geburtstag ${nameAtDate(new Date(birthYear + index, birthMonth - 1, birthDay, 0, 0, 0, 0))}`,
		age,
	).filter((_) => !timeline.records.some((record) => record[0] === _[0]));

	/** @type {typeof timeline} */
	const document = {
		...timeline,
		records: [...timeline.records, ...birthdays],
	};
	if (death !== undefined) {
		document.records.push([
			death.valueOf(),
			{ title: `☠️ ${nameAtDate(death)} verstorben`, generated: false },
		]);
	}
	return sort(document);
};
/**
 * @param timeline {TimelineAncestryRenderer | TimelineReferenceRenderer} -
 * @param graph {IdentityGraph<TimelineAncestryRenderer | TimelineReferenceRenderer>}
 */
const fillOthers = (timeline, graph) => {
	if ("identity" in timeline.meta === false) {
		return;
	}

	// We can't use the "name" of the identity here, as those might result in
	// duplicate labels in the DOT graph. This is a hack to allow lax event dates.
	const name = timeline.meta.identity.id;

	let birth;
	if (timeline.meta.identity.born !== null) {
		birth = uncertainEventToDateArtistic(timeline.meta.identity.born);
	}

	if (isNil(birth)) {
		return;
	}

	/** @type {import("../lib/types.js").TimelineRecord} */
	const conceptionRecord = [
		roundDateToDay(Math.trunc(birth.valueOf() - 9 * MILLISECONDS.ONE_MONTH)),
		{ title: `Geschätzte Zeugung\n${name}`, generated: false },
	];
	/** @type {import("../lib/types.js").TimelineRecord} */
	const birthRecord = [
		birth.valueOf(),
		{ title: `* Geburt ${name}`, generated: false },
	];

	timeline.records = sortRecords(
		timeline.records.concat([conceptionRecord, birthRecord]),
	);

	const identityMother = graph.motherOf(timeline.meta.identity.id);
	if (identityMother !== undefined) {
		const timelineMother = mustExist(graph.timelineOf(identityMother.id));
		mergeDuringPeriod(conceptionRecord[0], birthRecord[0], [
			timeline,
			timelineMother,
		]);
	}

	const identityFather = graph.fatherOf(timeline.meta.identity.id);
	if (identityFather !== undefined) {
		const timelineFather = mustExist(graph.timelineOf(identityFather.id));
		timelineFather.records = sortRecords(
			timelineFather.records.concat([conceptionRecord]),
		);
	}
};

const filledTimelines = [originTimeline, ...allTimelines].map((_) => fill(_));

// This is stupid, but it still works fairly well.
const allGlobalEvents = deduplicateRecords(
	sortRecords([...filledTimelines].flatMap((_) => _.records)),
);
const labelCache = uniquifyRecords(allGlobalEvents);
const finalTimelines = filledTimelines.map((_) =>
	map(
		_,
		([timestamp, entry]) =>
			labelCache.find(
				(needle) =>
					needle[0] === timestamp && needle[1].title.startsWith(entry.title),
			) ?? [timestamp, entry],
	),
);

const graph = new IdentityGraph(finalTimelines, "invalid");
graph.timelines.forEach((_) => {
	fillOthers(_, graph);
});

const targetStream =
	targetPath !== undefined
		? createWriteStream(targetPath, { encoding: "utf8" })
		: process.stdout;

targetStream.on("error", () => {
	process.stderr.write(
		`Output stream error. Maybe not fully consumed. Exiting with failure.\n`,
	);
	process.exitCode = 1;
});

targetStream.write(
	`---\n${finalTimelines.map((_) => serialize(_, _.meta, true)).join("\n---\n")}`,
);

if (targetStream !== process.stdout) {
	targetStream.end();
}
