import * as assert from "node:assert";
import { before, describe, it } from "node:test";
import { random } from "./fixtures/documents.js";
import { load } from "./loader.js";
import { add, concat, map, sort, uniquify } from "./operator.js";
import type { TimelineDocument } from "./types.js";

/**
 * Operator
 */

before(() => {
	assert.strictEqual(
		new Date().getTimezoneOffset(),
		0,
		"The test suite must be executed in the UTC time zone.",
	);
});

describe("Operator - add", () => {
	it("should create a new timeline with an additional event", () => {
		const document: TimelineDocument = { ...random };
		const timeline = load(document, "document");
		const expanded = add(timeline, [0, { title: "0" }]);
		assert.notStrictEqual(
			timeline,
			expanded,
			"The expanded timeline should be an entirely new timeline. The original timeline must remain untouched.",
		);
		assert.strictEqual(expanded.records.length, timeline.records.length + 1);
		assert.deepStrictEqual(expanded.records[timeline.records.length], [
			0,
			{ title: "0" },
		]);
	});
});

describe("Operator - concat", () => {
	it("should create a new timeline with additional events", () => {
		const document: TimelineDocument = { ...random };
		const timeline = load(document, "document");
		const expanded = concat(timeline, [
			[0, { title: "0" }],
			[1, { title: "1" }],
		]);
		assert.notStrictEqual(
			timeline,
			expanded,
			"The expanded timeline should be an entirely new timeline. The original timeline must remain untouched.",
		);
		assert.strictEqual(expanded.records.length, timeline.records.length + 2);
		assert.deepStrictEqual(expanded.records[timeline.records.length + 0], [
			0,
			{ title: "0" },
		]);
		assert.deepStrictEqual(expanded.records[timeline.records.length + 1], [
			1,
			{ title: "1" },
		]);
	});
});

describe("Operator - map", () => {
	it("should create a new timeline with adjusted events", () => {
		const document: TimelineDocument = { ...random };
		const timeline = load(document, "document");
		const adjusted = map(timeline, ([timestamp]) => [
			timestamp,
			{ title: "changed" },
		]);
		assert.notStrictEqual(
			timeline,
			adjusted,
			"The adjusted timeline should be an entirely new timeline. The original timeline must remain untouched.",
		);
		assert.strictEqual(adjusted.records.length, timeline.records.length);
		for (let index = 0; index < timeline.records.length; ++index) {
			assert.notStrictEqual(timeline.records[index][1].title, "changed");
			assert.strictEqual(adjusted.records[index][1].title, "changed");
		}
	});
});

describe("Operator - sort", () => {
	it("should create a new timeline with sorted events", () => {
		const document: TimelineDocument = { ...random };
		const timeline = load(document, "document");
		const adjusted = sort(timeline);
		assert.notStrictEqual(
			timeline,
			adjusted,
			"The adjusted timeline should be an entirely new timeline. The original timeline must remain untouched.",
		);
		assert.strictEqual(adjusted.records.length, timeline.records.length);
		let previous = Number.NEGATIVE_INFINITY;
		for (let index = 0; index < timeline.records.length; ++index) {
			assert.strictEqual(
				previous < adjusted.records[index][0],
				true,
				"The previous entry should have appeared before this one in the timeline.",
			);
			previous = adjusted.records[index][0];
		}
	});
});

describe("Operator - uniquify", () => {
	it("should append year to deduplicate", () => {
		const artifact = uniquify({
			meta: { id: "test", private: true },
			records: [
				[new Date(2000, 0, 1).valueOf(), { title: "Now" }],
				[new Date(2001, 0, 1).valueOf(), { title: "Now" }],
				[new Date(2002, 0, 1).valueOf(), { title: "Now" }],
				[new Date(2003, 0, 1).valueOf(), { title: "Now" }],
			],
		});
		assert.strictEqual(artifact.records[0][1].title, "Now (2000)");
		assert.strictEqual(artifact.records[1][1].title, "Now (2001)");
		assert.strictEqual(artifact.records[2][1].title, "Now (2002)");
		assert.strictEqual(artifact.records[3][1].title, "Now (2003)");
	});

	it("should append year+month to deduplicate", () => {
		const artifact = uniquify({
			meta: { id: "test", private: true },
			records: [
				[new Date(2000, 0, 1).valueOf(), { title: "Now" }],
				[new Date(2000, 1, 1).valueOf(), { title: "Now" }],
				[new Date(2000, 2, 1).valueOf(), { title: "Now" }],
				[new Date(2000, 3, 1).valueOf(), { title: "Now" }],
			],
		});
		assert.strictEqual(artifact.records[0][1].title, "Now (01.2000)");
		assert.strictEqual(artifact.records[1][1].title, "Now (02.2000)");
		assert.strictEqual(artifact.records[2][1].title, "Now (03.2000)");
		assert.strictEqual(artifact.records[3][1].title, "Now (04.2000)");
	});

	it("should append year+month+day to deduplicate", () => {
		const artifact = uniquify({
			meta: { id: "test", private: true },
			records: [
				[new Date(2000, 0, 1).valueOf(), { title: "Now" }],
				[new Date(2000, 0, 2).valueOf(), { title: "Now" }],
				[new Date(2000, 0, 3).valueOf(), { title: "Now" }],
				[new Date(2000, 0, 4).valueOf(), { title: "Now" }],
			],
		});
		assert.strictEqual(artifact.records[0][1].title, "Now (01.01.2000)");
		assert.strictEqual(artifact.records[1][1].title, "Now (02.01.2000)");
		assert.strictEqual(artifact.records[2][1].title, "Now (03.01.2000)");
		assert.strictEqual(artifact.records[3][1].title, "Now (04.01.2000)");
	});
});
