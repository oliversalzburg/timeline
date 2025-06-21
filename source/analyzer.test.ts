import { expect } from "chai";
import { describe, it } from "mocha";
import { analyze } from "./analyzer.js";
import { random, withConflict } from "./fixtures/documents.js";
import { load } from "./loader.js";
import type { TimelineDocument } from "./types.js";

/**
 * The Analyzer calculates metrics about a timeline.
 */

describe("Analyzer", () => {
  before(() => {
    expect(new Date().getTimezoneOffset()).to.equal(
      0,
      "The test suite must be executed in the UTC time zone.",
    );
  });

  it("should produce the expected metrics (fixture 1)", () => {
    const document: TimelineDocument = { ...random };
    const timeline = load(document);
    const metrics = analyze(timeline.records);

    expect(metrics).to.eql({
      durationTotal: 1289820508000,
      periodLongest: 329167508000,
      periodShortest: 4878406000,
      timeEarliest: 545008398000,
      timeLatest: 1834828906000,
    });
  });

  it("should produce the expected metrics (fixture 2)", () => {
    const document: TimelineDocument = { ...withConflict };
    const timeline = load(document);
    const metrics = analyze(timeline.records);

    expect(metrics).to.eql({
      durationTotal: 802273890000,
      periodLongest: 802273890000,
      periodShortest: 0,
      timeEarliest: 946684800000,
      timeLatest: 1748958690000,
    });
  });
});
