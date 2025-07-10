import { expect } from "chai";
import { describe, it } from "mocha";
import { random } from "./fixtures/documents.js";
import { load } from "./loader.js";
import { add, concat, map, sort } from "./operator.js";
import type { TimelineDocument } from "./types.js";

/**
 * Operator
 */

before(() => {
  expect(new Date().getTimezoneOffset()).to.equal(
    0,
    "The test suite must be executed in the UTC time zone.",
  );
});

describe("Operator - add", () => {
  it("should create a new timeline with an additional event", () => {
    const document: TimelineDocument = { ...random };
    const timeline = load(document);
    const expanded = add(timeline, [0, { title: "0" }]);
    expect(timeline).not.to.equal(
      expanded,
      "The expanded timeline should be an entirely new timeline. The original timeline must remain untouched.",
    );
    expect(expanded.records.length).to.equal(timeline.records.length + 1);
    expect(expanded.records[timeline.records.length]).to.eql([0, { title: "0" }]);
  });
});

describe("Operator - concat", () => {
  it("should create a new timeline with additional events", () => {
    const document: TimelineDocument = { ...random };
    const timeline = load(document);
    const expanded = concat(timeline, [
      [0, { title: "0" }],
      [1, { title: "1" }],
    ]);
    expect(timeline).not.to.equal(
      expanded,
      "The expanded timeline should be an entirely new timeline. The original timeline must remain untouched.",
    );
    expect(expanded.records.length).to.equal(timeline.records.length + 2);
    expect(expanded.records[timeline.records.length + 0]).to.eql([0, { title: "0" }]);
    expect(expanded.records[timeline.records.length + 1]).to.eql([1, { title: "1" }]);
  });
});

describe("Operator - map", () => {
  it("should create a new timeline with adjusted events", () => {
    const document: TimelineDocument = { ...random };
    const timeline = load(document);
    const adjusted = map(timeline, ([timestamp]) => [timestamp, { title: "changed" }]);
    expect(timeline).not.to.equal(
      adjusted,
      "The adjusted timeline should be an entirely new timeline. The original timeline must remain untouched.",
    );
    expect(adjusted.records.length).to.equal(timeline.records.length);
    for (let index = 0; index < timeline.records.length; ++index) {
      expect(timeline.records[index][1].title).not.to.equal("changed");
      expect(adjusted.records[index][1].title).to.equal("changed");
    }
  });
});

describe("Operator - sort", () => {
  it("should create a new timeline with sorted events", () => {
    const document: TimelineDocument = { ...random };
    const timeline = load(document);
    const adjusted = sort(timeline);
    expect(timeline).not.to.equal(
      adjusted,
      "The adjusted timeline should be an entirely new timeline. The original timeline must remain untouched.",
    );
    expect(adjusted.records.length).to.equal(timeline.records.length);
    let previous = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < timeline.records.length; ++index) {
      expect(adjusted.records[index][0]).to.be.greaterThan(
        previous,
        "The previous entry should have appeared before this one in the timeline.",
      );
      previous = adjusted.records[index][0];
    }
  });
});
