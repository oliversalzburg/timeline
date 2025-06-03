#!/bin/env node

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { errorToString, unknownToError } from "@oliversalzburg/js-utils/errors/error-serializer.js";
import { parse } from "yaml";
import { analyze } from "./analyzer.js";
import { MILLISECONDS } from "./constants.js";
import { recurringYearly } from "./generator.js";
import { load } from "./loader.js";
import { render } from "./renderer.js";
import { serialize } from "./serializer.js";
import type { TimelineDocument } from "./types.js";

// Read raw data from input files.
const files =
  2 < process.argv.length
    ? [process.argv[2]]
    : readdirSync("timelines/")
        .filter(_ => _.endsWith(".yml"))
        .map(_ => `timelines/${_}`);
const rawData = new Map(files.map(_ => [_, readFileSync(_, "utf-8")]));

// Parse raw data with appropriate parser.
const plainData = new Map(
  rawData.entries().map(([filename, data]) => [filename, parse(data) as TimelineDocument]),
);

// Load raw data to generate normalized model.
const data = new Map(plainData.entries().map(([filename, data]) => [filename, load(data)]));

// Inject generated timeline.
// data.set("timelines/.birthdays", {
//   meta: { color: "#123456" },
//   records: recurringYearly(new Date("1980-10-04 01:00:00 +0700"), "Birthday", 85),
// });

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

data.set("timelines/.decoration.now", {
  meta: {
    color: "#808080",
  },
  records: [[Date.now(), { title: "Now" }]],
});
data.set("timelines/.decoration.nye", {
  meta: {
    color: "#808080",
  },
  records: [
    ...recurringYearly(
      new Date(Date.UTC(new Date(globalEarliest).getFullYear(), 0, 1, 0, 0, 0, 0)),
      "New Year",
      Math.floor((globalLatest - globalEarliest) / MILLISECONDS.ONE_YEAR),
    ),
  ],
});

// Write normalized timelines back to storage.
mkdirSync("timelines/.generated", { recursive: true });
for (const [filename, timeline] of data) {
  try {
    const normalized = `---\n${serialize(timeline)}`;
    const generatedName = join(
      "timelines",
      ".generated",
      `.${basename(filename).replace(/\.ya?ml$/, "")}.generated.yml`.replace(/^\.+/, "."),
    );
    process.stderr.write(generatedName + "\n");
    writeFileSync(generatedName, normalized, { encoding: "utf-8" });
  } catch (fault) {
    const error = unknownToError(fault);
    process.stderr.write(
      `${filename} produced an error while trying to dump the associated normalization. Processing continues.\n`,
    );
    process.stderr.write(errorToString(error) + "\n");
  }
}

// Generate DOT graph.
const dotGraphs = new Map(
  data
    .entries()
    .map(([filename, timeline]) => [
      filename,
      render([timeline], { baseUnit: "week", clusterYears: true, scale: "logarithmic" }),
    ]),
);

// Inject the "universe" graph.
dotGraphs.set(
  "timelines/.universe",
  render(
    [
      ...data
        .entries()
        .filter(([filename]) => !basename(filename).startsWith("_"))
        .map(([_, timeline]) => timeline),
    ],
    { baseUnit: "week", clusterYears: true, scale: "logarithmic" },
  ),
);

// Write DOT graphs to storage.
for (const [filename, graph] of dotGraphs) {
  try {
    process.stderr.write(`Writing DOT graph for ${filename}...` + "\n");
    writeFileSync(`${filename}.gv`, graph);
  } catch (fault) {
    const error = unknownToError(fault);
    process.stderr.write(
      `${filename} produced an error while storing the result. Processing is aborted.\n`,
    );
    process.stderr.write(errorToString(error) + "\n");
    throw fault;
  }
}

// Write generated output to file or DOM.
/*
instance().then(viz => {
  for (const [filename, graph] of dotGraphs) {
    try {
      const imageData = viz.renderString(graph, { format: "svg" });
      process.stderr.write(filename + "\n");
      writeFileSync(`${filename}.svg`, imageData);
      writeFileSync(`${filename}.gv`, graph);
    } catch (fault) {
      const error = unknownToError(fault);
      process.stderr.write(
        `${filename} produced an error during GraphViz rendering. Raw graph will be dumped.\n`,
      );
      process.stderr.write(errorToString(error) + "\n");
      writeFileSync(`${filename}.dump`, graph);
    }
  }
});
*/
