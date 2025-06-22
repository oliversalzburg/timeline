#!/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { parse } from "yaml";
import { analyze } from "../lib/analyzer.js";
import { MILLISECONDS } from "../lib/constants.js";
import { recurringYearly } from "../lib/generator.js";
import { load } from "../lib/loader.js";
import { add, map, sort, uniquify } from "../lib/operator.js";
import { render } from "../lib/renderer.js";

const NOW = Date.now();

// Read raw data from input files.
const files =
  2 < process.argv.length
    ? [process.argv[2]]
    : readdirSync("timelines/")
        .filter(_ => _.endsWith(".yml"))
        .map(_ => `timelines/${_}`);
const rawData = new Map(files.map(_ => [_, readFileSync(_, "utf-8")]));

// Parse raw data with appropriate parser.
const plainData = new Map(rawData.entries().map(([filename, data]) => [filename, parse(data)]));

// Load raw data to normalized model.
const data = new Map(plainData.entries().map(([filename, data]) => [filename, load(data)]));

const metrics = new Map(
  data.entries().map(([filename, timeline]) => [filename, analyze(timeline.records)]),
);
const globalEarliest = metrics
  .values()
  .reduce(
    (previous, current) => (current.timeEarliest < previous ? current.timeEarliest : previous),
    Number.POSITIVE_INFINITY,
  );
const globalLatest = metrics
  .values()
  .reduce(
    (previous, current) => (previous < current.timeLatest ? current.timeLatest : previous),
    0,
  );

const yearEarliest = new Date(globalEarliest).getFullYear();
data.set("timelines/.decoration.nye", {
  meta: {
    color: "#808080",
    link: false,
    prefix: "🎆",
  },
  records: [
    ...recurringYearly(
      new Date(yearEarliest, 0, 1, 0, 0, 0, 0),
      index => `New Year ${yearEarliest + index}`,
      Math.floor((globalLatest - globalEarliest) / MILLISECONDS.ONE_YEAR),
    ),
  ],
});
data.set(
  "timelines/mediacontrol-top1-singles.yml",
  map(data.get("timelines/mediacontrol-top1-singles.yml"), record => [
    record[0],
    { title: record[1].title.split(" - ").reverse().join("\n") },
  ]),
);

// Inject the "universe" graph.
process.stderr.write("Rendering universe...\n");
const dotGraph = render(
  [
    ...data
      .entries()
      .filter(([filename]) => !basename(filename).startsWith("_"))
      .map(([_, timeline]) => uniquify(sort(add(timeline, [NOW, { title: "Now" }])))),
  ],
  {
    baseUnit: "week",
    clusterYears: false,
    dateRenderer: date => {
      const _ = new Date(date);
      return `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][_.getDay()]}, ${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
    },
    now: NOW,
    origin: new Date(1983, 11, 25, 0, 0, 0, 0).valueOf(),
    scale: "logarithmic",
  },
);

// Write DOT graph to stdout.
process.stderr.write("Writing DOT graph for universe..." + "\n");
process.stdout.write(dotGraph);
