#!/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { errorToString, unknownToError } from "@oliversalzburg/js-utils/errors/error-serializer.js";
import { instance } from "@viz-js/viz";
import { parse } from "yaml";
import { load } from "./loader.js";
import { render } from "./renderer.js";
import type { TimelineDocument } from "./types.js";

// Read raw data from input files.
const files = readdirSync("timelines/")
  .filter(_ => _.endsWith(".yml"))
  .map(_ => `timelines/${_}`);
const rawData = new Map(files.map(_ => [_, readFileSync(_, "utf-8")]));

// Parse raw data with appropriate parser.
const plainData = new Map(
  rawData.entries().map(([filename, data]) => [filename, parse(data) as TimelineDocument]),
);

// Load raw data to generate normalized model.
const data = new Map(
  plainData
    .entries()
    .map(([filename, data]) => [filename, load(data, { addNewYearMarkers: false, addNow: true })]),
);

// Generate DOT graph.
const dotGraphs = new Map(
  data
    .entries()
    .map(([filename, timeline]) => [
      filename,
      render([timeline], { baseUnit: "week", clusterYears: true, scale: "logarithmic" }),
    ]),
);

dotGraphs.set("timelines/.universe", render([...data.values()],{ baseUnit: "week", clusterYears: true, scale: "logarithmic" }));

// Render DOT graph with GraphViz.
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

// Write generated output to file or DOM.
