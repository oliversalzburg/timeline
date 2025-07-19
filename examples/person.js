#!/bin/env node

import { MILLISECONDS } from "../lib/constants.js";
import { recurringYearly } from "../lib/generator.js";
import { serialize } from "../lib/serializer.js";

const cliArguments = process.argv.slice(2);
const birthday = cliArguments[0];
const ageOrLastYear = Number(cliArguments[1]);
const name = cliArguments.slice(2).join(" ");

const birthDate = birthday.split("-");
const [birthYear, birthMonth, birthDay] = birthDate.map(Number);

const age = ageOrLastYear < 150 ? ageOrLastYear : ageOrLastYear - birthYear;
const endYear = birthYear + age;
const endday = [
  endYear.toFixed().padStart(4, "0"),
  birthMonth.toFixed().padStart(2, "0"),
  birthDay.toFixed().padStart(2, "0"),
].join("-");

const birth = new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0);

process.stderr.write(`Timeline for '${name}' (${birthday} - ${endday}):\n`);

/** @type {import("../lib/types.js").TimelinePlain} */
const timeline = {
  meta: {
    rank: 100,
  },
  records: [
    [
      Math.trunc(birth.valueOf() - 9 * MILLISECONDS.ONE_MONTH),
      { title: `Estimated Conception\n${name}` },
    ],
    [birth.valueOf(), { title: `👶 Geburt ${name}` }],
    ...recurringYearly(
      new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0),
      (index) => `${index}. Geburtstag ${name}`,
      age,
    ),
  ],
};

const serialized = serialize(timeline);
process.stdout.write(`${serialized}\n`);
