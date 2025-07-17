#!/bin/env node

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
const endday = [endYear.toFixed().padStart(4, "0"), birthMonth.toFixed().padStart(2, "0"), birthDay.toFixed().padStart(2, "0")].join("-");

process.stderr.write(`Timeline for '${name}' (${birthday} - ${endday}):\n`)

/** @type {import("../lib/types.js").TimelinePlain} */
const timeline = {
  meta: {
    prefix: "👱",
    rank: 100
  },
  records: [
    [new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0).valueOf(), { title: `Estimated Conception\n${name}` }],
    [new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0).valueOf(), { title: `Geburt ${name}` }],
    ...recurringYearly(
      new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0),
      index => `${index}. Geburtstag ${name}`,
      age,
    ),
  ],
}

const serialized = serialize(timeline);
process.stdout.write(serialized + "\n");
