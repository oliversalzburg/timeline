import { isNil, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { MILLISECONDS } from "./constants.js";
import type { RendererOptions } from "./renderer.js";
import type { Event } from "./types.js";

export const millisecondsAsYears = (milliseconds: number) =>
	Math.round(milliseconds / MILLISECONDS.ONE_YEAR);

export const parseStringAsDate = (input?: string) => {
	if (input === undefined) {
		return undefined;
	}
	if (input.length === 4) {
		const year = Number(input);
		return new Date(year, 0);
	}
	return new Date(input);
};

export const uncertainEventToDate = (input?: Event) => {
	if (isNil(input)) {
		return undefined;
	}

	if (input.date !== undefined) {
		return parseStringAsDate(input.date);
	}

	const when = input.when;
	if (when === undefined) {
		return undefined;
	}

	const after = when.after;
	const before = when.before;
	if (after !== undefined && before !== undefined) {
		const start = mustExist(
			parseStringAsDate(after),
			`invalid date '${after}'`,
		);
		const end = mustExist(
			parseStringAsDate(before),
			`invalid date '${before}'`,
		);
		const distance = end.valueOf() - start.valueOf();
		return new Date(start.valueOf() + distance / 2);
	}
	if (after !== undefined) {
		return mustExist(parseStringAsDate(after), `invalid date '${after}'`);
	}
	if (before !== undefined) {
		return mustExist(parseStringAsDate(before), `invalid date '${before}'`);
	}

	return undefined;
};

export const uncertainEventToDateString = (
	input?: Event,
	dateRenderer?: RendererOptions["dateRenderer"],
) => {
	const date = uncertainEventToDate(input);
	if (date === undefined) {
		return "";
	}

	if (input?.when?.showAs !== undefined) {
		return input?.when?.showAs;
	}

	const dateString =
		dateRenderer !== undefined
			? dateRenderer(date.valueOf())
			: date.toLocaleDateString();

	const after = input?.when?.after;
	const before = input?.when?.before;
	if (after !== undefined && before !== undefined) {
		return `± ${dateString}`;
	}

	if (after !== undefined) {
		return `> ${dateString}`;
	}

	if (before !== undefined) {
		return `< ${dateString}`;
	}

	if (dateString !== undefined) {
		return dateString;
	}

	throw new InvalidOperationError(`unexpected date input: ${input}`);
};
