#!/usr/bin/env node
import { Random } from "@oliversalzburg/js-utils/data/random.js";

const timestampsRequested = 2 < process.argv.length ? Number(process.argv[2]) : 1;
const seed = Date.now();
process.stderr.write(`seed: ${seed}\n`);
const random = new Random(seed);
for (let iteration = 0; iteration < timestampsRequested; ++iteration) {
  const year = random.nextRange(1980, 2030).toFixed(0).padStart(2, "0");
  const month = random.nextRange(1, 12).toFixed(0).padStart(2, "0");
  const day = random
    .nextRange(1, month === 2 ? 28 : 30)
    .toFixed(0)
    .padStart(2, "0");
  const hour = random.nextRange(0, 23).toFixed(0).padStart(2, "0");
  const minute = random.nextRange(0, 59).toFixed(0).padStart(2, "0");
  const second = random.nextRange(0, 59).toFixed(0).padStart(2, "0");
  process.stdout.write(`${year}-${month}-${day} ${hour}:${minute}:${second}\n`);
}
