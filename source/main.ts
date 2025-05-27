#!/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
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
const data = new Map(plainData.entries().map(([filename, data]) => [filename, load(data)]));

// Generate DOT graph.
const dotGraphs = new Map(
  data.entries().map(([filename, timeline]) => [filename, render(timeline)]),
);

// Render DOT graph with GraphViz.
instance().then(viz => {
  for (const [filename, graph] of dotGraphs) {
    const imageData = viz.renderString(graph, { format: "svg" });
    writeFileSync(`${filename}.svg`, imageData);
  }
});

// Write generated output to file or DOM.
