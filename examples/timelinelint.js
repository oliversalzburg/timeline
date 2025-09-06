#!/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { Report } from "@oliversalzburg/js-utils/log/report.js";
import { parse } from "yaml";
import { uncertainEventToDate } from "../lib/genealogy.js";
import { load } from "../lib/loader.js";

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

const timelinePaths = readdirSync(args.root, {
	recursive: true,
	withFileTypes: true,
})
	.filter((_) => _.isFile() && _.name.endsWith(".yml"))
	.map((_) => `${_.parentPath}/${_.name}`)
	.sort();

/**
 * @import { TimelineAncestryRenderer, TimelineReferenceRenderer } from "../lib/types.js"
 */

const reportRoot = new Report("timelinelint");

/** @type {Map<string, { report: Report, timeline: TimelineAncestryRenderer | TimelineReferenceRenderer }>} */
const allTimelines = new Map();
for (const timelinePath of timelinePaths) {
	const timelineData = readFileSync(timelinePath, "utf8");
	const report = reportRoot.child(new Report(timelinePath, reportRoot));
	if (!timelineData.startsWith("---")) {
		report.log("missing document separator");
	}

	const timelineObject = parse(timelineData);
	const timeline = load(timelineObject, timelinePath);
	allTimelines.set(timelinePath, { report, timeline });
}

/**
 * @param job {{ report: Report, timeline: TimelineAncestryRenderer | TimelineReferenceRenderer }} -
 */
const lint = (job) => {
	if ("identity" in job.timeline.meta === false) {
		job.report.log("missing 'identity' meta field");
		return;
	}

	// Require genealogy links for private identities.
	const isPrivate = job.timeline.meta.private;
	if (isPrivate) {
		if ("urls" in job.timeline.meta.identity === false) {
			job.report.log(`Missing 'urls' section in identity.`);
		} else {
			if (
				!job.timeline.meta.identity.urls?.some((_) => _.match(/ancestry.com/))
			) {
				job.report.log(`Missing 'ancestry.com' URL in identity.`);
			}
			if (
				!job.timeline.meta.identity.urls?.some((_) =>
					_.match(/familysearch.org/),
				)
			) {
				job.report.log(`Missing 'familysearch.org' URL in identity.`);
			}
		}
	}

	const wasBorn = job.timeline.meta.identity.born !== undefined;
	if (wasBorn) {
		if (job.timeline.meta.identity.born?.sexus === undefined) {
			job.report.log(`Missing sexus in identity.`);
		}
		if (job.timeline.meta.identity.born === null) {
			job.report.log(`Missing birth record in identity.`);
		} else if (job.timeline.meta.identity.born?.date === undefined) {
			job.report.log(`Unspecific birth date in identity.`);
		}
	}

	const hasDied = job.timeline.meta.identity.died !== undefined;
	if (hasDied) {
		if (job.timeline.meta.identity.died === null) {
			job.report.log(`Missing death record in dead identity.`);
		} else if (job.timeline.meta.identity.died?.date === undefined) {
			job.report.log(`Unspecific death date in identity.`);
		}
	}

	const marriages =
		job.timeline.meta.identity.relations?.filter(
			(relation) => "marriedTo" in relation,
		) ?? [];
	for (const marriage of marriages) {
		const marriageDate = uncertainEventToDate(marriage);
		if (marriageDate === undefined) {
			job.report.log(
				`Marriage with '${marriage.marriedTo}' in identity is missing a date, and will cause issues with name changes of the identity.`,
			);
		}
	}
};

for (const [, _] of allTimelines.entries()) {
	lint(_);
}

reportRoot.aggregate({ log: (text) => process.stdout.write(`${text}\n`) });
