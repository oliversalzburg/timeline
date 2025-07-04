/** biome-ignore-all lint/style/noUnusedTemplateLiteral: Consistency overrules */

import { expect } from "chai";
import { describe, it } from "mocha";
import { history, random, snapshotHasRegression, snapshotIdentity } from "./fixtures/documents.js";
import { load } from "./loader.js";
import { fontColorForFill, render } from "./renderer.js";
import type { TimelineDocument } from "./types.js";

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
      "#004db9": "#ffffff",
    };
    Object.entries(colors).forEach(([fill, font]) => {
      const generated = fontColorForFill(fill);
      expect(generated).to.equal(
        font,
        `Generated font color '${generated}' doesn't match expected font color '${font}'.`,
      );
    });
  });

  it("should render timelines correctly (fixture 1)", function () {
    const document: TimelineDocument = { ...random };
    const now = Date.UTC(2025, 5, 15);
    const timeline = load(document);
    const artifact = render([timeline], { now });
    expect(snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact)).to.be.false;
  });

  it("should render timelines correctly (fixture 3)", function () {
    const document: TimelineDocument = { ...history };
    const now = Date.UTC(2025, 5, 15);
    const timeline = load(document);
    const artifact = render([timeline], { now });
    expect(snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact)).to.be.false;
  });

  it("should render timelines correctly (fixture 1+3)", function () {
    const documents: Array<TimelineDocument> = [{ ...random }, { ...history }];
    const now = Date.UTC(2025, 5, 15);
    const timelines = documents.map(_ => load(_));
    const artifact = render(timelines, { now });
    expect(snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact)).to.be.false;
  });

  it("should merge timelines correctly (fixture 1a)", function () {
    const document: TimelineDocument = { ...random };
    const now = Date.UTC(2025, 5, 15);
    const timeline = load(document);
    const artifact = render(
      [timeline, { meta: { id: "test", rank: 1 }, records: timeline.records.slice(0, 1) }],
      {
        now,
      },
    );
    expect(snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact)).to.be.false;
  });
  it("should merge timelines correctly (fixture 1b)", function () {
    const document: TimelineDocument = { ...random };
    const now = Date.UTC(2025, 5, 15);
    const timeline = load(document);
    const artifact = render(
      [timeline, { meta: { id: "test", rank: 1 }, records: timeline.records.slice(1, 2) }],
      {
        now,
      },
    );
    expect(snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact)).to.be.false;
  });
  it("should merge timelines correctly (fixture 1c)", function () {
    const document: TimelineDocument = { ...random };
    const now = Date.UTC(2025, 5, 15);
    const timeline = load(document);
    const artifact = render(
      [timeline, { meta: { id: "test", rank: 1 }, records: timeline.records.slice(0, 2) }],
      {
        now,
      },
    );
    expect(snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact)).to.be.false;
  });
});
