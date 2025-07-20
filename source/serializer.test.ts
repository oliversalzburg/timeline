import { expect } from "chai";
import { describe, it } from "mocha";
import {
	snapshotHasRegression,
	snapshotIdentity,
} from "./fixtures/documents.js";
import { serialize } from "./serializer.js";
import type { Timeline } from "./types.js";

/**
 * Serializer
 */

describe("Serializer", () => {
	before(() => {
		expect(new Date().getTimezoneOffset()).to.equal(
			0,
			"The test suite must be executed in the UTC time zone.",
		);
	});

	it("should merge records with same timestamp into array", function () {
		const timeline: Timeline = {
			meta: { id: "test", private: true },
			records: [
				[100, { title: "one" }],
				[100, { title: "two" }],
			],
		};
		const document = serialize(timeline);
		expect(snapshotHasRegression(snapshotIdentity(this, ".yml"), document)).to
			.be.false;
	});
});
