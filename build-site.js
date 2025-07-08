#!/usr/bin/env node

import { readFileSync } from "node:fs";

const subjectFile = process.argv[2] ?? "timelines/.universe.gv.cairo.svg";

const indexHtml = readFileSync("index.template.html", "utf-8");
const universeSvg = readFileSync(subjectFile, "utf-8");
process.stdout.write(`${indexHtml.replace("SVG", universeSvg.replace(/^<\?xml .+dtd">/s, ""))}\n`);
