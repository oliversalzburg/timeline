import { isNil, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { MILLISECONDS } from "./constants.js";
import type { RendererOptions } from "./renderer.js";
import { Alias, Child, Joiner } from "./renderer-ancestry.js";
import type { Event, Identity, Marriage, Timeline } from "./types.js";

export const millisecondsAsYears = (milliseconds: number) =>
	Math.round(milliseconds / MILLISECONDS.ONE_YEAR);

export const parseStringAsDate = (input?: string, offset = 0) => {
	if (input === undefined) {
		return undefined;
	}
	let date: Date | undefined;
	if (input.length === 4) {
		const year = Number(input);
		date = new Date(new Date(year, 0).valueOf() + offset);
	}

	date ??= new Date(Date.parse(input) + offset);
	if (Number.isNaN(date.valueOf())) {
		throw new InvalidOperationError(`date string '${input}' is invalid`);
	}
	return date;
};

export const uncertainEventToDate = (input?: Event | null) => {
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
		return mustExist(parseStringAsDate(after, 1), `invalid date '${after}'`);
	}
	if (before !== undefined) {
		return mustExist(parseStringAsDate(before, -1), `invalid date '${before}'`);
	}

	return undefined;
};

export const uncertainEventToDateString = (
	input?: Event | null,
	dateRenderer?: RendererOptions["dateRenderer"],
) => {
	const date = uncertainEventToDate(input);
	if (isNil(date)) {
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
	nodes: Array<Child | Alias | Joiner | null>;
	identity: (id: string) => Identity | undefined;
	node: (id: string) => Child | Alias | Joiner | undefined;
	motherOf: (id: string) => Child | Alias;
	fatherOf: (id: string) => Child | Alias;
	marriage: (id: string, spouse?: string) => Array<Marriage>;
	marriageInDnaScope: (id: string) => Marriage | undefined;
	rootId: (id: string) => string;
	distance: (a: string, b?: string) => void;
	joins: (a: string, b: string) => Array<Joiner>;
	childrenDuring: (id: string, after: Date, before?: Date) => Array<string>;
	trim: (distance?: number) => void;
}
export const identityGraph = (
	timelines: Array<Timeline & { meta: { identity?: Identity } }>,
): IdentityGraph => {
	const ids = new Array<string | null>(timelines.length);
	const identities = new Array<Identity | null>(timelines.length);
	const nodes = new Array<Child | Alias | Joiner | null>(timelines.length);

	for (const _ in timelines) {
		identities[_] = timelines[_].meta.identity ?? null;
		ids[_] = identities[_] === null ? null : identities[_].id;
		nodes[_] = null;
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

	const rootId = (id: string) =>
		rootIdForNode(nodes[ids.indexOf(id)] as Child | Alias);
	const rootIdForNode = (_: Child | Alias) =>
		_ instanceof Alias ? _.origin : _.identity;
	const identity = (id: string) => identities[ids.indexOf(id)] ?? undefined;
	const node = (id: string) => nodes[ids.indexOf(id)] ?? undefined;
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
	const marriage = (id: string, spouse?: string) =>
		marriedToIn(
			mustExist(
				identity(id),
				`can't look up marriage for unknown identity '${id}'`,
			),
		).filter((_) => (spouse !== undefined ? _.marriedTo === spouse : true));

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

			const date = uncertainEventToDate(relation);

			const joinId = Joiner.makeJoinId(
				identities[_].id,
				relation.marriedTo,
				date?.toISOString(),
			);

			if (!ids.includes(joinId)) {
				const who = [identities[_].id, relation.marriedTo];
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
					if (marriageOnSpouse.date !== relation.date) {
						throw new InvalidOperationError(
							`marriage date mismatch between '${identities[_].id}' and '${relation.marriedTo}'`,
						);
					}
				}

				const joiner = new Joiner(who, "marriage");
				joiner.date = date?.toISOString();
				ids.push(joinId);
				identities.push(null);
				nodes.push(joiner);
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

		const motherNode = motherOf(identities[_].id);
		const mother =
			motherNode !== undefined ? rootIdForNode(motherNode) : undefined;
		const fatherNode = fatherOf(identities[_].id);
		const father =
			fatherNode !== undefined
				? rootIdForNode(fatherOf(identities[_].id))
				: undefined;

		if (father === undefined && mother === undefined) {
			continue;
		}

		if (mother === undefined) {
			const motherNode = generateFemale();
			const motherIdentity = mustExist(
				identity(motherNode.identity),
				"generated female has no identity",
			);
			motherNode.children.push(identities[_].id);
			motherIdentity.relations?.push({ motherOf: identities[_].id });
		}
		if (father === undefined) {
			const fatherNode = generateMale();
			const fatherIdentity = mustExist(
				identity(fatherNode.identity),
				"generated male has no identity",
			);
			fatherNode.children.push(identities[_].id);
			fatherIdentity.relations?.push({ fatherOf: identities[_].id });
		}
	}

	// Register parents on children.
	for (const _ in identities) {
		if (identities[_] === null) {
			// Timeline contained no identity section.
			continue;
		}

		const childrenAsFather = fatherOfIdIn(identities[_]);
		const childrenAsMother = motherOfIdIn(identities[_]);

		for (const child of childrenAsFather) {
			const childNode = node(rootId(child)) as Child | undefined;
			if (childNode !== undefined) {
				childNode.father = identities[_].id;
			}
		}
		for (const child of childrenAsMother) {
			const childNode = node(rootId(child)) as Child | undefined;
			if (childNode !== undefined) {
				childNode.mother = identities[_].id;
			}
		}
	}

	// Join parents.
	for (const _ in identities) {
		if (identities[_] === null) {
			// Timeline contained no identity section.
			continue;
		}

		const motherNode = motherOf(identities[_].id);
		const mother =
			motherNode !== undefined ? rootIdForNode(motherNode) : undefined;
		const fatherNode = fatherOf(identities[_].id);
		const father =
			fatherNode !== undefined
				? rootIdForNode(fatherOf(identities[_].id))
				: undefined;

		if (father === undefined || mother === undefined) {
			continue;
		}

		const joinId = Joiner.makeJoinId(father, mother);
		if (!ids.includes(joinId)) {
			ids.push(joinId);
			nodes.push(new Joiner([father, mother], "dna"));
		}
	}

	const childrenDuring = (
		id: string,
		after: Date,
		before?: Date,
	): Array<string> => {
		const egoIdentity = node(rootId(id)) as Child | undefined;
		return (
			egoIdentity?.children.filter((_) => {
				const born = uncertainEventToDate(identity(rootId(_))?.born);
				const bornAfter =
					born !== undefined ? after.valueOf() < born.valueOf() : true;
				const bornBefore =
					born !== undefined && before !== undefined
						? born.valueOf() < before.valueOf()
						: true;
				return bornAfter && bornBefore;
			}) ?? []
		);
	};

	const distance = (a: string, b?: string) => {
		const rootA = mustExist(rootId(a));
		const rootB = b !== undefined ? mustExist(rootId(b)) : undefined;
		const nodeA = nodes[ids.indexOf(rootA)] as Child;
		const nodeB =
			rootB !== undefined ? (nodes[ids.indexOf(rootB)] as Child) : undefined;

		let changes = 1;
		let _misses = 0;
		nodeA.distance = 0;
		while (
			(nodeB !== undefined && nodeB.distance === undefined) ||
			0 < changes
		) {
			changes = 0;
			_misses = 0;
			for (const subject of nodes) {
				if (subject instanceof Child === false) {
					continue;
				}

				let bestDistance = subject.distance;
				const mother =
					subject.mother !== undefined
						? (node(mustExist(rootId(subject.mother))) as Child)
						: undefined;
				if (mother !== undefined && mother.distance !== undefined) {
					if (
						bestDistance !== undefined &&
						mother.distance + 1 < bestDistance
					) {
						bestDistance = mother.distance + 1;
					}
					if (bestDistance === undefined) {
						bestDistance = mother.distance + 1;
					}
				}

				const father =
					subject.father !== undefined
						? (node(mustExist(rootId(subject.father))) as Child)
						: undefined;
				if (father !== undefined && father.distance !== undefined) {
					if (
						bestDistance !== undefined &&
						father.distance + 1 < bestDistance
					) {
						bestDistance = father.distance + 1;
					}
					if (bestDistance === undefined) {
						bestDistance = father.distance + 1;
					}
				}

				for (const childId of subject.children) {
					const child = node(mustExist(rootId(childId))) as Child;
					if (child.distance !== undefined) {
						if (
							bestDistance !== undefined &&
							child.distance + 1 < bestDistance
						) {
							bestDistance = child.distance + 1;
						}
						if (bestDistance === undefined) {
							bestDistance = child.distance + 1;
						}
					}
				}

				if (
					bestDistance !== undefined &&
					(subject.distance === undefined || bestDistance < subject.distance)
				) {
					subject.distance = bestDistance;
					++changes;
					continue;
				}
				++_misses;
			}
		}
	};

	const joins = (a: string, b?: string) =>
		nodes.filter(
			(_) =>
				_ instanceof Joiner &&
				_.who.includes(a) &&
				(b === undefined || _.who.includes(b)),
		) as Array<Joiner>;

	const marriageInDnaScope = (ego: string): Marriage | undefined => {
		const motherNode = motherOf(rootId(ego));
		const fatherNode = fatherOf(rootId(ego));
		const subjects = marriage(motherNode.identity, fatherNode.identity);
		return subjects[0];
	};

	const trim = (distance = 100) => {
		for (const _ in identities) {
			if (identities[_] === null) {
				continue;
			}

			const subjectNode = node(identities[_].id);
			if (subjectNode instanceof Child === false) {
				continue;
			}

			if (distance < (subjectNode.distance ?? Number.POSITIVE_INFINITY)) {
				const joinNodes = joins(mustExist(ids[_]));
				for (const joinNode of joinNodes) {
					const joinNodeIndex = nodes.indexOf(joinNode);
					ids[joinNodeIndex] = null;
					nodes[joinNodeIndex] = null;
				}
				identities[_] = null;
				ids[_] = null;
				nodes[_] = null;
			}
		}
	};

	return {
		ids,
		identities,
		nodes,
		identity,
		node,
		fatherOf,
		motherOf,
		marriage,
		marriageInDnaScope,
		rootId,
		distance,
		joins,
		childrenDuring,
		trim,
	};
};
