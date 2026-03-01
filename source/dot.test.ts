import * as assert from "node:assert";
import { describe, it } from "node:test";
import { dot } from "./dot.js";

/**
 * The DOT module provides a helper to render GraphViz graphs, which are authored in plaintext.
 * Inside the reference implementation it only serves as a helper construct for the renderer.
 */

describe("DOT", () => {
	it("should render a simple graph", () => {
		const d = dot();
		d.raw("digraph {");
		d.raw("}");

		assert.strictEqual(
			d.toString(),
			"digraph {\n}",
			"The GraphViz helper produced unexpected output.",
		);
	});

	it("should render nodes", () => {
		const d = dot();
		d.raw("digraph {");
		d.node("GraphViz is great", { color: "#FF0000FF" });
		d.raw("}");

		assert.strictEqual(
			d.toString(),
			"digraph {\n" +
				'\t1\t[color="#FF0000FF",\n\t\tlabel=<GraphViz is great>];\n' +
				"}",
			"The GraphViz helper produced unexpected output.",
		);
	});
});
