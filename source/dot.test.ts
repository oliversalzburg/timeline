import { expect } from "chai";
import { describe, it } from "mocha";
import { dot } from "./dot.js";

/**
 * The DOT module provides a helper to render DOT graphs, which are authored in plaintext.
 * Inside the reference implementation it only serves as a helper construct for the renderer.
 */

describe("DOT", () => {
  it("should render a simple graph", () => {
    const d = dot();
    d.raw("digraph {");
    d.raw("}");

    expect(d.toString()).to.equal("digraph {\n}", "The DOT helper produced unexpected output.");
  });

  it("should render nodes", () => {
    const d = dot();
    d.raw("digraph {");
    d.node("DOT is great", { color: "red" });
    d.raw("}");

    expect(d.toString()).to.equal(
      "digraph {\n" +
        '    1 [color="red"; label=<<TABLE ALIGN="CENTER" BORDER="0" CELLBORDER="0" CELLPADDING="0" CELLSPACING="0"><TR><TD ALIGN="TEXT" CELLPADDING="0" CELLSPACING="0">DOT is great</TD></TR></TABLE>>;];\n' +
        "}",
      "The DOT helper produced unexpected output.",
    );
  });
});
