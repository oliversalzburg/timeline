import { readFileSync } from "node:fs";
import { expect } from "chai";
import { describe, it } from "mocha";
import { serialize } from "./serializer.js";
import type { Timeline } from "./types.js";

/**
 * Serializer
 */

describe("Serializer", () => {
  before(() => {
    expect(new Date().getTimezoneOffset()).to.equal(
      0,
      "The test suite must be executed in the UTC time zone.",
    );
  });

  it("should merge records with same timestamp into array", () => {
    const fixture = readFileSync("source/fixtures/serializer-merge.yml", "utf-8");
    const timeline: Timeline = {
      records: [
        [100, { title: "one" }],
        [100, { title: "two" }],
      ],
    };
    const document = serialize(timeline);
    expect(document).to.equal(fixture, "The timeline was not serialized as expected.");
  });
});
