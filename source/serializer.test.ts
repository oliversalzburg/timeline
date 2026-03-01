import * as assert from "node:assert";
import { before, describe } from "node:test";

/**
 * Serializer
 */

describe("Serializer", () => {
	before(() => {
		assert.strictEqual(
			new Date().getTimezoneOffset(),
			0,
			"The test suite must be executed in the UTC time zone.",
		);
	});
});
