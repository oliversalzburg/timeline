#!/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { parse } from "yaml";
import { analyze } from "../lib/analyzer.js";
import { MILLISECONDS, TRANSPARENT } from "../lib/constants.js";
import { recurringYearly } from "../lib/generator.js";
import { load } from "../lib/loader.js";
import { map, sort, uniquify } from "../lib/operator.js";
import { render } from "../lib/renderer.js";

/** @import {RendererOptions} from "../lib/renderer.js" */

const NOW = Date.now();

// Parse potential switches.
const args = process.argv
  .slice(2)
  .filter(_ => _.startsWith("--"))
  .reduce(
    (args, _) => {
      const argument = _.substring(2);
      const parts = argument.match(/^(?<name>[^=]+)=?(?<value>.*)$/);
      if (parts === null || parts.groups === undefined) {
        return args;
      }

      args[parts.groups.name ?? parts.groups.value] = typeof parts.groups.value === "string" && parts.groups.value !== "" ? parts.groups.value : true;

      return args;
    },
    /** @type {Record<string,boolean|string>} */({}),
  );

// Read raw data from input files.
const files =
  2 < process.argv.length
    ? process.argv.slice(2).filter(_ => !_.startsWith("--"))
    : readdirSync("timelines/")
      .filter(_ => _.endsWith(".yml"))
      .map(_ => `timelines/${_}`);

if (files.length === 0) {
  process.stderr.write("No files provided.\n");
  process.exit(0);
}

// process.stderr.write(`Processing:\n${files.map(_ => `  ${_}\n`).join("")}`);

const rawData = new Map(files.map(_ => [_, readFileSync(_, "utf-8")]));

// Parse raw data with appropriate parser.
const plainData = new Map(rawData.entries().map(([filename, data]) => [filename, parse(data)]));

// Load raw data to normalized model.
const data = new Map(
  plainData.entries().map(([filename, data]) => [filename, load(data, filename)]),
);

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

// Generate New Year's Eve events.
const yearEarliest = new Date(globalEarliest).getFullYear();
data.set("timelines/.decoration.nye", {
  meta: {
    color: TRANSPARENT,
    id: "nye",
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

// Adjust the titles in the data set.
data.set(
  "timelines/mediacontrol-top1-singles.yml",
  map(mustExist(data.get("timelines/mediacontrol-top1-singles.yml")), record => [
    record[0],
    { title: record[1].title.split(" - ").reverse().join("\n") },
  ]),
);

// Inject the "universe" graph.
process.stderr.write("Rendering universe...\n");
const finalTimelines = [
  ...data
    .entries()
    .filter(([filename]) => !basename(filename).startsWith("_"))
    .map(([_, timeline]) => uniquify(sort(timeline))),
];
const finalEntryCount = finalTimelines.reduce(
  (previous, timeline) => previous + timeline.records.length,
  0,
);

process.stderr.write(`  Universe has ${finalEntryCount} individual entries from ${data.size} timelines.\n`);
process.stderr.write(`  Horizon spans from ${new Date(globalEarliest).toLocaleDateString()} to ${new Date(globalLatest).toLocaleDateString()}.\n`);
process.stderr.write(`  Averaging ~${finalEntryCount / ((globalLatest - globalEarliest) / MILLISECONDS.ONE_DAY)} events per day.\n`);

const PREVIEW = Boolean(args.preview);

/** @type {Partial<RendererOptions>} */
const CONFIG_QUALITY_PREVIEW = {
  baseUnit: "week",
  preview: true,
  scale: "logarithmic",
};
/** @type {Partial<RendererOptions>} */
const CONFIG_QUALITY_ULTRA = {
  baseUnit: "day",
  preview: false,
  scale: "linear",
};

// Write GraphViz graph to stdout.
process.stderr.write("Writing GraphViz graph for universe..." + "\n");

const dotGraph = render(finalTimelines, {
  dateRenderer: date => {
    const _ = new Date(date);
    return `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][_.getDay()]}, ${_.getDate().toFixed(0).padStart(2, "0")}.${(_.getMonth() + 1).toFixed(0).padStart(2, "0")}.${_.getFullYear()}`;
  },
  now: NOW,
  origin: new Date(1983, 11, 25, 0, 0, 0, 0).valueOf(),
  ...(PREVIEW ? CONFIG_QUALITY_PREVIEW : CONFIG_QUALITY_ULTRA),
  skipBefore: args["skip-before"] ? new Date(args["skip-before"]).valueOf() : undefined,
  skipAfter: args["skip-after"] ? new Date(args["skip-after"]).valueOf() : undefined,
});

// Dump palette for debugging purposes.
process.stderr.write(
  `Generated palette for universe:\n`,
);
const paletteMeta = dotGraph.palette;
const colors = paletteMeta.lookup;
for (const [color, timelines] of paletteMeta.assignments) {
  const timelinePalette = mustExist(colors.get(timelines[0]));
  process.stderr.write(
    `- ${color} -> Pen: ${timelinePalette.pen} Fill: ${timelinePalette.fill} Font: ${timelinePalette.font}\n`,
  );
  for (const id of timelines) {
    process.stderr.write(`  ${id}\n`);
  }
}

process.stdout.write(dotGraph.graph);
process.stderr.write("GraphViz graph for universe written successfully.\n");
