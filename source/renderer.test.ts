/** biome-ignore-all lint/style/noUnusedTemplateLiteral: Consistency overrules */

import * as assert from "node:assert";
import { before, describe, it } from "node:test";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { matchFontColorTo } from "./palette.js";
import type { RGBTuple } from "./types.js";

/**
 * Renderer
 */

describe("Renderer", () => {
	before(() => {
		assert.strictEqual(
			new Date().getTimezoneOffset(),
			0,
			"The test suite must be executed in the UTC time zone.",
		);
	});

	it("should produce the expected font colors", () => {
		const colors = {
			"#004db9": "#FFFFFFFF",
		};
		Object.entries(colors).forEach(([fill, font]) => {
			const rgb = mustExist(fill.substring(1).match(/../g)).map((x) =>
				Number.parseInt(x, 16),
			) as RGBTuple;
			const generated = matchFontColorTo(rgb);
			assert.deepStrictEqual(
				generated,
				[250, 250, 250, 255],
				`Generated font color '${generated}' doesn't match expected font color '${font}'.`,
			);
		});
	});
});
