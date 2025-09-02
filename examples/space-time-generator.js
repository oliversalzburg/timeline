#!/bin/env node

import { createWriteStream, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isNil, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { MILLISECONDS } from "../lib/constants.js";
import { Graph, uncertainEventToDate } from "../lib/genealogy.js";
import { recurringYearly } from "../lib/generator.js";
import { load } from "../lib/loader.js";
import {
	anonymize,
	mergeDuringPeriod,
	sort,
	sortRecords,
} from "../lib/operator.js";
import { serialize } from "../lib/serializer.js";

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

/** @type {Array<import("../lib/types.js").TimelineAncestryRenderer|import("../lib/types.js").TimelineReferenceRenderer>} */
let allTimelines = [];
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
	const graph = new Graph(
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
 * @param timeline {import("../lib/types.js").TimelineAncestryRenderer | import("../lib/types.js").TimelineReferenceRenderer} -
 * @param graph {Graph<import("../lib/types.js").TimelineAncestryRenderer | import("../lib/types.js").TimelineReferenceRenderer>}
 */
const fill = (timeline) => {
	if ("identity" in timeline.meta === false) {
		return timeline;
	}

	const name = timeline.meta.identity.name ?? timeline.meta.identity.id;

	// Require genealogy links for private identities.
	if (timeline.meta.private) {
		if ("urls" in timeline.meta.identity === false) {
			process.stderr.write(
				`Warning: Missing 'urls' section in identity in '${timeline.meta.id}'.\n`,
			);
		} else {
			if (!timeline.meta.identity.urls?.some((_) => _.match(/ancestry.com/))) {
				process.stderr.write(
					`Notice: Missing 'ancestry.com' URL in identity in '${timeline.meta.id}'.\n`,
				);
			}
			if (
				!timeline.meta.identity.urls?.some((_) => _.match(/familysearch.org/))
			) {
				process.stderr.write(
					`Notice: Missing 'familysearch.org' URL in identity in '${timeline.meta.id}'.\n`,
				);
			}
		}
	}

	let birth;
	if (timeline.meta.identity.born === null) {
		if (timeline.records.length === 0) {
			process.stderr.write(
				`Warning: No birth record in identity with empty timeline '${timeline.meta.id}'.\n`,
			);
			return timeline;
		}

		process.stderr.write(
			`Warning: No birth record in timeline '${timeline.meta.id}'. Using date of first entry.\n`,
		);
		birth = new Date(timeline.records[0][0]);
	} else {
		birth = uncertainEventToDate(timeline.meta.identity.born);
	}

	if (isNil(birth)) {
		process.stderr.write(
			`Notice: Unspecific birth in identity in '${timeline.meta.id}'.\n`,
		);
		return timeline;
	}

	let death;
	if (timeline.meta.identity.died === null) {
		process.stderr.write(
			`Warning: No death record in dead identity '${timeline.meta.id}'. Assuming aged 85.\n`,
		);
		death = new Date(birth.valueOf() + MILLISECONDS.ONE_YEAR * 85);
	} else {
		death = uncertainEventToDate(timeline.meta.identity.died);
	}

	const deathRecord = timeline.records.find(([, entry]) =>
		entry.title.startsWith("☠️"),
	);
	if (deathRecord !== undefined) {
		process.stderr.write(
			`Warning: Apparent death timeline entry '${deathRecord[1].title.replaceAll("\n", "\\n")}' in dead identity '${timeline.meta.id}' should probably be a death record.\n`,
		);
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
	for (const marriage of marriages) {
		const marriageDate = uncertainEventToDate(marriage);
		if (marriageDate === undefined) {
			process.stderr.write(
				`Warning: Marriage with '${marriage.marriedTo}' in identity '${timeline.meta.id}' is missing a date and will cause issues with name changes of the identity.\n`,
			);
		}
	}

	/**
	 * @param date {Date} -
	 */
	const nameAtDate = (date) => {
		let marriageBeforeDate;
		let bestDate;
		for (const marriage of marriages) {
			const marriageDate = uncertainEventToDate(marriage);
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

	/** @type {typeof timeline} */
	const document = {
		...timeline,
		records: [
			...timeline.records,
			...recurringYearly(
				new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0),
				(index) =>
					`${index}. Geburtstag ${nameAtDate(new Date(birthYear + index, birthMonth - 1, birthDay, 0, 0, 0, 0))}`,
				age,
			),
		],
	};
	if (death !== undefined) {
		document.records.push([
			death.valueOf(),
			{ title: `☠️ ${nameAtDate(death)} verstorben` },
		]);
	}
	return sort(document);
};
/**
 * @param timeline {import("../lib/types.js").TimelineAncestryRenderer | import("../lib/types.js").TimelineReferenceRenderer} -
 * @param graph {Graph<import("../lib/types.js").TimelineAncestryRenderer | import("../lib/types.js").TimelineReferenceRenderer>}
 */
const fillOthers = (timeline, graph) => {
	if ("identity" in timeline.meta === false) {
		return;
	}

	const name = timeline.meta.identity.name ?? timeline.meta.identity.id;

	let birth;
	if (timeline.meta.identity.born === null) {
		if (timeline.records.length === 0) {
			return;
		}

		birth = new Date(timeline.records[0][0]);
	} else {
		birth = uncertainEventToDate(timeline.meta.identity.born);
	}

	if (isNil(birth)) {
		return;
	}

	/** @type {import("../lib/types.js").TimelineRecord} */
	const conceptionRecord = [
		Math.trunc(birth.valueOf() - 9 * MILLISECONDS.ONE_MONTH),
		{ title: `Geschätzte Zeugung\n${name}` },
	];
	/** @type {import("../lib/types.js").TimelineRecord} */
	const birthRecord = [birth.valueOf(), { title: `👶 Geburt ${name}` }];

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

allTimelines = allTimelines.map((_) => fill(_));
const graph = new Graph([originTimeline, ...allTimelines], "invalid");
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
	`---\n${serialize(originTimeline, originTimeline.meta, true)}\n---\n${allTimelines.map((_) => serialize(_, _.meta, true)).join("\n---\n")}`,
);

if (targetStream !== process.stdout) {
	targetStream.end();
}
