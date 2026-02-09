/** biome-ignore-all lint/style/noUnusedTemplateLiteral: Consistency overrules */

import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { expect } from "chai";
import { describe, it } from "mocha";
import { matchFontColorTo } from "./palette.js";
import type { RGBTuple } from "./types.js";

/**
 * Renderer
 */

describe("Renderer", () => {
	before(() => {
		expect(new Date().getTimezoneOffset()).to.equal(
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
			expect(generated).to.eql(
				[250, 250, 250, 255],
				`Generated font color '${generated}' doesn't match expected font color '${font}'.`,
			);
		});
	});
});
