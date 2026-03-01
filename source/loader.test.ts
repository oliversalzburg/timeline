import * as assert from "node:assert";
import { before, describe, it } from "node:test";
import {
	beforeUnix,
	history,
	random,
	withConflict,
} from "./fixtures/documents.js";
import { load } from "./loader.js";
import type { TimelineDocument } from "./types.js";

/**
 * The purpose of the Loader is to accept a well-formed TimelineDocument,
 * and convert it to a well-formed, ordered Timeline.
 * The Loader is not "correcting" user input.
 *
 * If date strings in the timeline do not specify a time zone, the local
 * time zone is assumed. This test suite assumes the local time zone to be UTC.
 */

describe("Loader", () => {
	before(() => {
		assert.strictEqual(
			new Date().getTimezoneOffset(),
			0,
			"The test suite must be executed in the UTC time zone.",
		);
	});

	it("should transform date strings to timestamps (fixture 1)", () => {
		const document: TimelineDocument = { ...random };
		const timeline = load(document, "document");
		for (
			let recordIndex = 0;
			recordIndex < timeline.records.length;
			++recordIndex
		) {
			assert.strictEqual(
				timeline.records[recordIndex][0],
				Number(timeline.records[recordIndex][1].title),
				"Resulting timestamp does not match expectation of date string. The input date string is lost, and can not be shown.",
			);
		}
	});

	it("should transform date strings to timestamps (fixture 2)", () => {
		const document: TimelineDocument = { ...withConflict };
		const timeline = load(document, "document");
		for (
			let recordIndex = 0;
			recordIndex < timeline.records.length;
			++recordIndex
		) {
			assert.strictEqual(
				timeline.records[recordIndex][0],
				Number(timeline.records[recordIndex][1].title),
				"Resulting timestamp does not match expectation of date string. The input date string is lost, and can not be shown.",
			);
		}
	});

	it("should produce an ordered list of records (fixture 1)", () => {
		const document: TimelineDocument = { ...random };
		const timeline = load(document, "document");
		let previousTimestamp = timeline.records[0][0];
		for (
			let recordIndex = 1;
			recordIndex < timeline.records.length;
			++recordIndex
		) {
			assert.strictEqual(
				previousTimestamp <= timeline.records[recordIndex][0],
				true,
			);
			previousTimestamp = timeline.records[recordIndex][0];
		}
	});

	it("should produce an ordered list of records (fixture 3)", () => {
		const document: TimelineDocument = { ...history };
		const timeline = load(document, "document");
		let previousTimestamp = timeline.records[0][0];
		for (
			let recordIndex = 1;
			recordIndex < timeline.records.length;
			++recordIndex
		) {
			assert.strictEqual(
				previousTimestamp <= timeline.records[recordIndex][0],
				true,
			);
			previousTimestamp = timeline.records[recordIndex][0];
		}
	});

	it("should produce an ordered list of records (fixture 4)", () => {
		const document: TimelineDocument = { ...beforeUnix };
		const timeline = load(document, "document");
		let previousTimestamp = timeline.records[0][0];
		for (
			let recordIndex = 1;
			recordIndex < timeline.records.length;
			++recordIndex
		) {
			assert.strictEqual(
				previousTimestamp <= timeline.records[recordIndex][0],
				true,
			);
			previousTimestamp = timeline.records[recordIndex][0];
		}
	});
});
