import { expect } from "chai";
import { describe, it } from "mocha";
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

		expect(d.toString()).to.equal(
			"digraph {\n}",
			"The GraphViz helper produced unexpected output.",
		);
	});

	it("should render nodes", () => {
		const d = dot();
		d.raw("digraph {");
		d.node("GraphViz is great", { color: "#FF0000FF" });
		d.raw("}");

		expect(d.toString()).to.equal(
			"digraph {\n" +
				'    1 [color="#FF0000FF"; label=<GraphViz is great>;];\n' +
				"}",
			"The GraphViz helper produced unexpected output.",
		);
	});
});
