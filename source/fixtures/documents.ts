/** biome-ignore-all lint/style/noUnusedTemplateLiteral: Consistency overrules */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import type { TimelineDocument } from "../types.js";

export const snapshotIdentity = (_: Mocha.Context, suffix = ""): string => {
  const test = mustExist(_.test);
  const file = mustExist(test.file);
  return `${basename(file)}-${test
    .fullTitle()
    .replaceAll(/[^A-Za-z0-9_-]/g, "_")
    .replaceAll(/_+/g, "_")}.snapshot${suffix}`;
};

export const snapshotHasRegression = (id: string, artifact: string) => {
  const snapshotFilename = `fixtures/snapshot-${id}`;
  if (!existsSync(snapshotFilename)) {
    process.stderr.write(`Request for MISSING SNAPSHOT '${id}'.\n`);
    process.stderr.write(`Snapshot will be generated and test will be marked as failed!\n`);
    writeFileSync(snapshotFilename, artifact);
    return true;
  }

  const truth = readFileSync(snapshotFilename, "utf8");
  const hasRegression = truth !== artifact;
  if (hasRegression) {
    process.stderr.write(`Snapshot regressed: '${id}'!\n`);
    writeFileSync(snapshotFilename, artifact);
  }

  return hasRegression;
};

/**
 * The timestamps in this timeline were randomly generated, using `contrib/random-timestamp.js`.
 */
export const random: TimelineDocument = Object.freeze({
  id: "random",
  rank: 1,
  timeline: {
    "2017-07-09 08:53:43": "1499590423000",
    "2002-08-09 19:23:12": "1028920992000",
    "2022-09-19 11:07:37": "1663585657000",
    "1992-03-04 23:58:04": "699753484000",
    "2017-09-03 20:00:29": "1504468829000",
    "2021-02-11 05:38:25": "1613021905000",
    "2007-10-18 16:52:13": "1192726333000",
    "2011-11-26 10:53:41": "1322304821000",
    "2028-02-22 10:41:46": "1834828906000",
    "2021-07-26 18:49:50": "1627325390000",
    "2018-11-12 10:54:40": "1542020080000",
    "1987-04-09 23:13:18": "545008398000",
  },
});

/**
 * This timeline is sneaky.
 * It provides two unique values in the input, that map to the exact same timestamp.
 * This timeline is ORDERED.
 */
export const withConflict: TimelineDocument = Object.freeze({
  id: "withConflict",
  rank: 1,
  timeline: {
    "1999-12-31 24:00:00": 946684800000,
    "2000": 946684800000,
    "2025-06-03 13:51:30": 1748958690000,
  },
});

export const history: TimelineDocument = Object.freeze({
  id: "history",
  rank: 1,
  timeline: {
    "0000-01-01T00:00:00Z": "Start of the 1st Century",
    "0099-12-31T24:00:00Z": "Start of the 2nd Century",
    "0199-12-31": "Start of the 3rd Century",
    "0299-12-31": "Start of the 4th Century",
    "0399-12-31": "Start of the 5th Century",
    "0499-12-31": "Start of the 6th Century",
    "0599-12-31": "Start of the 7th Century",
    "0699-12-31": "Start of the 8th Century",
    "0799-12-31": "Start of the 9th Century",
    "0899-12-31": "Start of the 10th Century",
    "0999-12-31": "Start of the 11th Century",
    "1099-12-31": "Start of the 12th Century",
    "1199-12-31": "Start of the 13th Century",
    "1299-12-31": "Start of the 14th Century",
    "1399-12-31": "Start of the 15th Century",
    "1499-12-31": "Start of the 16th Century",
    "1599-12-31": "Start of the 17th Century",
    "1699-12-31": "Start of the 18th Century",
    "1799-12-31": "Start of the 19th Century",
    "1899-12-31": "Start of the 20th Century",
    "1999-12-31": "Start of the 21st Century",
    "2099-12-31": "Start of the 22nd Century",
  },
});

export const beforeUnix: TimelineDocument = Object.freeze({
  id: "beforeUnix",
  rank: 1,
  timeline: {
    "0000-01-01T00:00:00Z": "Start of the 1st Century",
    "0099-12-31T24:00:00Z": "Start of the 2nd Century",
    "1899-12-31": "Start of the 20th Century",
    "0": "Start of the UNIX Epoch",
    "-219373200000": "Negative Epoch",
    "411778800000": "Positive Epoch",
  },
});
