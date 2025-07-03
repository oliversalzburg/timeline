import { expect } from "chai";
import { describe, it } from "mocha";
import { gv } from "./gv.js";

/**
 * The GV module provides a helper to render GraphViz graphs, which are authored in plaintext.
 * Inside the reference implementation it only serves as a helper construct for the renderer.
 */

describe("GraphViz", () => {
  it("should render a simple graph", () => {
    const d = gv();
    d.raw("digraph {");
    d.raw("}");

    expect(d.toString()).to.equal(
      "digraph {\n}",
      "The GraphViz helper produced unexpected output.",
    );
  });

  it("should render nodes", () => {
    const d = gv();
    d.raw("digraph {");
    d.node("GraphViz is great", { color: "red" });
    d.raw("}");

    expect(d.toString()).to.equal(
      "digraph {\n" + '    1 [color="red"; label=<GraphViz is great>;];\n' + "}",
      "The GraphViz helper produced unexpected output.",
    );
  });
});
