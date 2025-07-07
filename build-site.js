#!/usr/bin/env node

import { readFileSync } from "node:fs";

const indexHtml = readFileSync("index.template.html", "utf-8");
const universeSvg = readFileSync("timelines/.universe.gv.cairo.svg", "utf-8");
process.stdout.write(`${indexHtml.replace("SVG", universeSvg.replace(/^<\?xml .+dtd">/s, ""))}\n`);
