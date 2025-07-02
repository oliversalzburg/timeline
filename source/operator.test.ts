import { expect } from "chai";
import { describe, it } from "mocha";
import { random } from "./fixtures/documents.js";
import { load } from "./loader.js";
import { add, concat } from "./operator.js";
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
