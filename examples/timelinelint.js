#!/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { Report } from "@oliversalzburg/js-utils/log/report.js";
import { parse } from "yaml";
import {
	isIdentityMedia,
	isIdentityPerson,
	uncertainEventToDateDeterministic,
} from "../lib/genealogy.js";
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

/** @type {Map<string, { path: string, report: Report, timeline: TimelineAncestryRenderer | TimelineReferenceRenderer }>} */
const allTimelines = new Map();
for (const timelinePath of timelinePaths) {
	const timelineData = readFileSync(timelinePath, "utf8");
	const report = reportRoot.child(new Report(timelinePath, reportRoot));
	if (!timelineData.startsWith("---")) {
		report.log("missing document separator");
	}

	const timelineObject = parse(timelineData);
	const timeline = load(timelineObject, timelinePath);
	allTimelines.set(timelinePath, { path: timelinePath, report, timeline });
}

const identitiesSeen = new Map();

/**
 * @param job {{ path: string, report: Report, timeline: TimelineAncestryRenderer | TimelineReferenceRenderer }} -
 */
const lint = (job) => {
	if ("identity" in job.timeline.meta === false) {
		//job.report.log("missing 'identity' meta field");
		return;
	}

	if ("id" in job.timeline.meta.identity === false) {
		job.report.log("missing 'id' in identity meta field");
		return;
	}

	const existingIdentity = identitiesSeen.get(job.timeline.meta.identity.id);
	if (existingIdentity !== undefined) {
		job.report.log(
			`identity id '${job.timeline.meta.identity.id}' was already defined by '${existingIdentity.path}'`,
		);
	}

	identitiesSeen.set(job.timeline.meta.identity.id, job);

	// Require genealogy links for private identities.
	const isPerson = isIdentityPerson(job.timeline);
	const isPrivate = job.timeline.meta.private;
	if (isPerson && isPrivate) {
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
	const wasEstablished = job.timeline.meta.identity.established !== undefined;
	if (wasEstablished) {
		if (job.timeline.meta.identity.position === undefined) {
			job.report.log(`Missing position in identity.`);
		}
		if (job.timeline.meta.identity.established === null) {
			job.report.log(`Missing establishment record in identity.`);
		} else if (job.timeline.meta.identity.established?.date === undefined) {
			job.report.log(`Unspecific establishment date in identity.`);
		}
	}
	const wasStarted = job.timeline.meta.identity.started !== undefined;
	if (wasStarted) {
		if (job.timeline.meta.identity.started === null) {
			job.report.log(`Missing start record in identity.`);
		} else if (job.timeline.meta.identity.started?.date === undefined) {
			job.report.log(`Unspecific start date in identity.`);
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
		const marriageDate = uncertainEventToDateDeterministic(marriage);
		if (marriageDate === undefined) {
			job.report.log(
				`Marriage with '${marriage.marriedTo}' in identity is missing a date, and will cause issues with name changes of the identity.`,
			);
		}
	}

	const isMedia = isIdentityMedia(job.timeline);
	if (isMedia) {
		const mediaPath = job.timeline.meta.id;
		if (!existsSync(mediaPath)) {
			job.report.log(`Media item path wasn't found!`);
		}
	}
};

for (const [, _] of allTimelines.entries()) {
	lint(_);
}

reportRoot.aggregate({ log: (text) => process.stdout.write(`${text}\n`) });
