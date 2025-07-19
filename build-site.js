#!/usr/bin/env node

import { readFileSync } from "node:fs";

const subjectFile = process.argv[2] ?? "timelines/.universe.gv.cairo.svg";

const indexHtml = readFileSync("index.template.html", "utf-8");
const universeSvg = readFileSync(subjectFile, "utf-8");
const svg = universeSvg
  .replace(/^<\?xml .+dtd">/s, "")
  .replaceAll(/( class="[^"]+">)/g, ' tabindex="0"\$1');
process.stdout.write(`${indexHtml.replace("SVG", svg)}\n`);
