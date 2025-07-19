import { expect } from "chai";
import { describe, it } from "mocha";
import { MILLISECONDS } from "./constants.js";
import { interval, recurringYearly } from "./generator.js";

/**
 * The Generator provides convenience mechanisms to generate timeline data.
 * It is only used in examples.
 */

describe("Generator - Interval", () => {
	before(() => {
		expect(new Date().getTimezoneOffset()).to.equal(
			0,
			"The test suite must be executed in the UTC time zone.",
		);
	});

	it("should generate a series of 4 days", () => {
		const records = interval(
			new Date(2000, 0, 1, 0, 0, 0, 0),
			"Some Event",
			MILLISECONDS.ONE_DAY,
			4,
			0,
		);

		expect(records).to.eql(
			[
				[946684800000, { title: "Some Event" }],
				[946771200000, { title: "Some Event #1" }],
				[946857600000, { title: "Some Event #2" }],
				[946944000000, { title: "Some Event #3" }],
			],
			"The generated series does not match our expected timeline.",
		);
	});

	it("should correctly skip events", () => {
		const records = interval(
			new Date(2000, 0, 1, 0, 0, 0, 0),
			"Some Event",
			MILLISECONDS.ONE_DAY,
			4,
			1,
		);

		expect(records).to.eql(
			[
				[946771200000, { title: "Some Event #1" }],
				[946857600000, { title: "Some Event #2" }],
				[946944000000, { title: "Some Event #3" }],
				[947030400000, { title: "Some Event #4" }],
			],
			"The generated series does not match our expected timeline.",
		);
	});

	it("should use our callback for event titles", () => {
		const records = interval(
			new Date(2000, 0, 1, 0, 0, 0, 0),
			(index: number) => `${index}. Some Event`,
			MILLISECONDS.ONE_DAY,
			4,
			1,
		);

		expect(records).to.eql(
			[
				[946771200000, { title: "1. Some Event" }],
				[946857600000, { title: "2. Some Event" }],
				[946944000000, { title: "3. Some Event" }],
				[947030400000, { title: "4. Some Event" }],
			],
			"The generated series does not match our expected timeline.",
		);
	});
});

describe("Generator - Yearly Occurrence", () => {
	before(() => {
		expect(new Date().getTimezoneOffset()).to.equal(
			0,
			"The test suite must be executed in the UTC time zone.",
		);
	});

	it("should generate a series of 4 years", () => {
		const records = recurringYearly(
			new Date(2000, 0, 1, 0, 0, 0, 0),
			"Some Event",
			4,
			0,
			0,
		);

		expect(records).to.eql(
			[
				[946684800000, { title: "Some Event" }],
				[978307200000, { title: "Some Event #1" }],
				[1009843200000, { title: "Some Event #2" }],
				[1041379200000, { title: "Some Event #3" }],
			],
			"The generated series does not match our expected timeline.",
		);
	});
});
