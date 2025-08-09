import { isNil, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { MILLISECONDS } from "./constants.js";
import type { RendererOptions } from "./renderer.js";
import { Alias, Child, Joiner } from "./renderer-ancestry.js";
import type { Event, Identity, Marriage, Timeline } from "./types.js";

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

export interface IdentityGraph {
	ids: Array<string | null>;
	identities: Array<Identity | null>;
	nodes: Array<Child | Alias | Joiner>;
	identity: (id: string) => Identity | null;
	node: (id: string) => Child | Alias | Joiner;
	motherOf: (id: string) => Child | Alias;
	fatherOf: (id: string) => Child | Alias;
	marriage: (id: string, spouse: string) => Array<Marriage>;
	rootId: (id: string | undefined) => string | undefined;
}
export const identityGraph = (
	timelines: Array<Timeline & { meta: { identity?: Identity } }>,
	_options: Partial<RendererOptions> = {},
): IdentityGraph => {
	const ids = new Array<string | null>(timelines.length);
	const identities = new Array<Identity | null>(timelines.length);
	const nodes = new Array<Child | Alias | Joiner>(timelines.length);

	for (const _ in timelines) {
		identities[_] = timelines[_].meta.identity ?? null;
		ids[_] = identities[_] === null ? null : identities[_].id;
	}

	let randomIndex = 1;
	const generateMale = (): Child => {
		const name = `Unbekannter Mann ${randomIndex++}`;
		const child = new Child(name);
		identities.push({ id: name, name, relations: [] });
		ids.push(name);
		nodes.push(child);
		return child;
	};
	const generateFemale = (): Child => {
		const name = `Unbekannte Frau ${randomIndex++}`;
		const child = new Child(name);
		identities.push({ id: name, name, relations: [] });
		ids.push(name);
		nodes.push(child);
		return child;
	};

	const fatherOfIdIn = (identity: Identity) =>
		identity.relations?.filter((_) => "fatherOf" in _).map((_) => _.fatherOf) ??
		[];
	const motherOfIdIn = (identity: Identity) =>
		identity.relations?.filter((_) => "motherOf" in _).map((_) => _.motherOf) ??
		[];
	const marriedToIn = (identity: Identity) =>
		identity.relations?.filter((_) => "marriedTo" in _) ?? [];

	const rootId = (_: string | undefined) =>
		_ === undefined
			? undefined
			: rootIdForNode(nodes[ids.indexOf(_)] as Child | Alias | undefined);
	const rootIdForNode = (_: Child | Alias | undefined) =>
		_ === undefined ? undefined : _ instanceof Alias ? _.origin : _.identity;
	const identity = (id: string) => identities[ids.indexOf(id)] as Identity;
	const node = (id: string) => nodes[ids.indexOf(id)];
	const fatherOf = (id: string) =>
		nodes[
			identities.findIndex(
				(_) => _ !== null && fatherOfIdIn(_ as Identity).includes(id),
			)
		] as Child | Alias;
	const motherOf = (id: string) =>
		nodes[
			identities.findIndex(
				(_) => _ !== null && motherOfIdIn(_ as Identity).includes(id),
			)
		] as Child | Alias;
	const marriage = (id: string, spouse: string) =>
		marriedToIn(identity(id)).filter((_) => _.marriedTo === spouse);

	// Parse identities and construct relationship graph.
	for (const _ in identities) {
		if (identities[_] === null) {
			// Timeline contained no identity section.
			continue;
		}

		nodes[_] = new Child(identities[_].id);

		const marriages = marriedToIn(identities[_]);
		const childrenAsFather = fatherOfIdIn(identities[_]);
		const childrenAsMother = motherOfIdIn(identities[_]);
		const children = [...childrenAsFather, ...childrenAsMother];
		nodes[_].children = children;
		nodes[_].marriages = marriages.map((_) => _.marriedTo);

		for (const relation of marriages) {
			const marriedAs = relation.as;
			if (marriedAs !== undefined && !ids.includes(marriedAs)) {
				ids.push(marriedAs);
				identities.push(null);
				nodes.push(new Alias(marriedAs, identities[_].id));
			}

			const joinId = Joiner.makeJoinId(
				identities[_].id,
				relation.marriedTo,
				relation.date,
			);
			if (!ids.includes(joinId)) {
				const who = [identities[_].id, relation.marriedTo];
				if (marriedAs !== undefined) {
					who.push(marriedAs);
				}

				const marriageOnSpouse = marriage(
					relation.marriedTo,
					identities[_].id,
				)[0];
				if (marriageOnSpouse === undefined) {
					throw new InvalidOperationError(
						`identity '${identities[_].id}' declares marriage to '${relation.marriedTo}', but there is no matching relation on that identity.`,
					);
				}
				const spouseMarriedAs = marriageOnSpouse.as;
				if (spouseMarriedAs !== undefined) {
					if (!ids.includes(spouseMarriedAs)) {
						ids.push(spouseMarriedAs);
						identities.push(null);
						nodes.push(new Alias(spouseMarriedAs, identities[_].id));
					}
					who.push(spouseMarriedAs);
				}

				ids.push(joinId);
				identities.push(null);
				nodes.push(new Joiner(who, "marriage"));
			}
		}

		for (const child of children) {
			if (!ids.includes(child)) {
				ids.push(child);
				identities.push(null);
				nodes.push(new Child(child));
			}
		}
	}

	// Generate identities for undefined parents.
	for (const _ in identities) {
		if (identities[_] === null) {
			// Timeline contained no identity section.
			continue;
		}

		const mother = rootIdForNode(motherOf(identities[_].id));
		const father = rootIdForNode(fatherOf(identities[_].id));

		if (father === undefined && mother === undefined) {
			continue;
		}

		if (mother === undefined) {
			const motherNode = generateFemale();
			const motherIdentity = identity(motherNode.identity);
			motherNode.children.push(identities[_].id);
			motherIdentity.relations?.push({ motherOf: identities[_].id });
		}
		if (father === undefined) {
			const fatherNode = generateMale();
			const fatherIdentity = identity(fatherNode.identity);
			fatherNode.children.push(identities[_].id);
			fatherIdentity.relations?.push({ fatherOf: identities[_].id });
		}
	}

	// Join parents.
	for (const _ in identities) {
		if (identities[_] === null) {
			// Timeline contained no identity section.
			continue;
		}

		const mother = rootIdForNode(motherOf(identities[_].id));
		const father = rootIdForNode(fatherOf(identities[_].id));
		if (father !== undefined && mother !== undefined) {
			const joinId = Joiner.makeJoinId(father, mother);
			if (!ids.includes(joinId)) {
				ids.push(joinId);
				nodes.push(new Joiner([father, mother], "dna"));
			}
		}
	}

	return {
		ids,
		identities,
		nodes,
		identity,
		node,
		fatherOf,
		motherOf,
		marriage,
		rootId,
	};
};
