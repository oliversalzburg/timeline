import {
	coalesceArray,
	isNil,
	mustExist,
} from "@oliversalzburg/js-utils/data/nil.js";
import {
	Random,
	random,
	seedFromString,
} from "@oliversalzburg/js-utils/data/random.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { intersect } from "./operator.js";
import type { RendererOptions } from "./renderer.js";
import type {
	Event,
	Identity,
	Timeline,
	TimelineAncestryRenderer,
} from "./types.js";

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

export const uncertainEventToDateArtistic = (
	input?: Event | null,
	rng = random,
) => {
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
		return new Date(start.valueOf() + rng.nextRange(0, distance));
	}
	if (after !== undefined) {
		return mustExist(parseStringAsDate(after, 1), `invalid date '${after}'`);
	}
	if (before !== undefined) {
		return mustExist(parseStringAsDate(before, -1), `invalid date '${before}'`);
	}

	return undefined;
};
export const uncertainEventToDateDeterministic = (input?: Event | null) => {
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
	const date = uncertainEventToDateDeterministic(input);
	if (isNil(date)) {
		return undefined;
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

export const uncertainEventToLocationString = (
	input?: Event | null,
	graph?: IdentityGraph<TimelineAncestryRenderer>,
) => {
	if (isNil(input)) {
		return undefined;
	}

	if (input.in !== undefined) {
		if (graph !== undefined) {
			const locationIdentity = mustExist(
				graph.resolveIdentity(input.in),
				`unkown identity '${input.in}'`,
			);
			return locationIdentity.name ?? locationIdentity.id;
		}
		return `?${input.where}?`;
	}

	if (input.where !== undefined) {
		return `"${input.where}"`;
	}

	return undefined;
};

export const isNotIdentity = (identity?: Identity): boolean => {
	if (isNil(identity)) {
		return true;
	}
	return !("id" in identity);
};
export const isNotIdentityTimeline = (timeline?: Timeline): boolean => {
	if (isNil(timeline)) {
		return true;
	}
	return !("identity" in timeline.meta);
};
export const isIdentityPlain = (identity?: Identity | Timeline): boolean => {
	if (isNil(identity)) {
		return false;
	}
	if ("meta" in identity) {
		if ("identity" in identity.meta) {
			const realIdentity = identity.meta.identity as Identity;
			return isIdentityPlain(realIdentity);
		}
		return false;
	}
	return (
		"id" in identity &&
		identity.id !== undefined &&
		!isIdentityLocation(identity) &&
		!isIdentityMedia(identity) &&
		!isIdentityPeriod(identity) &&
		!isIdentityPerson(identity)
	);
};
export const isIdentityPerson = (identity?: Identity | Timeline): boolean => {
	if (isNil(identity)) {
		return false;
	}
	if ("meta" in identity) {
		if ("identity" in identity.meta) {
			const realIdentity = identity.meta.identity as Identity;
			return isIdentityPerson(realIdentity);
		}
		return false;
	}
	return "born" in identity && identity.born !== undefined;
};
export const isIdentityLocation = (identity?: Identity | Timeline): boolean => {
	if (isNil(identity)) {
		return false;
	}
	if ("meta" in identity) {
		if ("identity" in identity.meta) {
			const realIdentity = identity.meta.identity as Identity;
			return isIdentityLocation(realIdentity);
		}
		return false;
	}

	return "established" in identity && identity.established !== undefined;
};
export const isIdentityPeriod = (identity?: Identity | Timeline): boolean => {
	if (isNil(identity)) {
		return false;
	}
	if ("meta" in identity) {
		if ("identity" in identity.meta) {
			const realIdentity = identity.meta.identity as Identity;
			return isIdentityPeriod(realIdentity);
		}
		return false;
	}

	return "started" in identity && identity.started !== undefined;
};
export const isIdentityMedia = (identity?: Identity | Timeline): boolean => {
	if (isNil(identity)) {
		return false;
	}
	if ("meta" in identity) {
		if ("identity" in identity.meta) {
			const realIdentity = identity.meta.identity as Identity;
			return isIdentityMedia(realIdentity);
		}
		return false;
	}

	return (
		"id" in identity &&
		(identity.id.startsWith("media/") || identity.id.startsWith("/kiwix/"))
	);
};

export class IdentityGraph<
	TTimeline extends Timeline & { meta: { identity?: Identity } },
> {
	constructor(
		public readonly timelines: Array<TTimeline>,
		public readonly origin: string,
	) {}

	get identities() {
		return this.timelines
			.map((timeline) => timeline.meta.identity ?? undefined)
			.filter((identity) => identity !== undefined);
	}

	resolveIdentity(id = this.origin) {
		return this.identities.find((identity) => identity.id === id);
	}

	resolveRootIdentities(id = this.origin) {
		return this.identities.filter(
			(identity) =>
				identity.id === id ||
				identity.name === id ||
				identity.relations?.some(
					(relation) => "as" in relation && relation.as === id,
				),
		);
	}

	resolveIdentityNameAtDate(id = this.origin, date = new Date()) {
		const aliases =
			this.marriagesOf(id)
				?.map(
					(marriage) =>
						[uncertainEventToDateDeterministic(marriage), marriage.as] as const,
				)
				.filter(([, alias]) => alias !== undefined)
				.sort(
					([a], [b]) =>
						(a?.valueOf() ?? Number.NEGATIVE_INFINITY) -
						(b?.valueOf() ?? Number.NEGATIVE_INFINITY),
				) ?? [];
		if (0 < aliases?.length) {
			const alias = aliases.findLast(
				([aliasDate]) =>
					(aliasDate?.valueOf() ?? Number.NEGATIVE_INFINITY) < date?.valueOf(),
			);
			if (!isNil(alias)) {
				return alias[1];
			}
		}

		const identity = mustExist(
			this.resolveIdentity(id),
			`unable to resolve identity '${id}'`,
		);
		return identity.name ?? identity?.id;
	}

	resolveRelation(
		from: string | null,
		to = this.origin,
		visited: Array<string> = [],
	): Array<{ label: string; identity: string }> | false {
		if (from === null || visited.includes(from)) {
			return false;
		}
		if (from === to) {
			return [];
		}

		let chainBest: Array<{ label: string; identity: string }> | undefined;
		for (const child of this.childrenOf(from)) {
			const chain = this.resolveRelation(child.id, to, [from, ...visited]);
			if (
				chain !== false &&
				(chainBest === undefined ||
					(chainBest !== undefined && chain.length < chainBest.length - 1))
			) {
				chainBest = [{ label: "parent of", identity: child.id }, ...chain];
			}
		}

		if (this.fatherOf(from)?.id === to) {
			return [
				{ label: "father of", identity: from },
				{ label: "subject", identity: to },
			];
		} else {
			const chain = this.resolveRelation(this.fatherOf(from)?.id ?? null, to, [
				from,
				...visited,
			]);
			if (
				chain !== false &&
				(chainBest === undefined ||
					(chainBest !== undefined && chain.length < chainBest.length - 1))
			) {
				chainBest = [{ label: "father of", identity: from }, ...chain];
			}
		}

		if (this.motherOf(from)?.id === to) {
			return [
				{ label: "mother of", identity: from },
				{ label: "subject", identity: to },
			];
		} else {
			const chain = this.resolveRelation(this.motherOf(from)?.id ?? null, to, [
				from,
				...visited,
			]);
			if (
				chain !== false &&
				(chainBest === undefined ||
					(chainBest !== undefined && chain.length < chainBest.length - 1))
			) {
				chainBest = [{ label: "mother of", identity: from }, ...chain];
			}
		}
		return chainBest ?? false;
	}

	timelineOf(id = this.origin) {
		return this.timelines.find((timeline) => timeline.meta.identity?.id === id);
	}

	marriagesOf(id = this.origin) {
		return this.resolveRootIdentities(id)
			?.flatMap((_) =>
				_.relations?.filter((relation) => "marriedTo" in relation),
			)
			.filter((_) => _ !== undefined);
	}

	fatherOf(id = this.origin) {
		return this.identities.find((_) =>
			_.relations?.some(
				(relation) => "fatherOf" in relation && relation.fatherOf === id,
			),
		);
	}

	motherOf(id = this.origin) {
		return this.identities.find((_) =>
			_.relations?.some(
				(relation) => "motherOf" in relation && relation.motherOf === id,
			),
		);
	}

	parentsOf(id = this.origin) {
		return this.identities.filter((_) =>
			_.relations?.some(
				(relation) =>
					("fatherOf" in relation && relation.fatherOf === id) ||
					("motherOf" in relation && relation.motherOf === id) ||
					("adopted" in relation && relation.adopted === id),
			),
		);
	}

	containersOf(id = this.origin) {
		return (
			this.identities.filter((_) =>
				_.relations?.some(
					(relation) => "contains" in relation && relation.contains === id,
				),
			) ?? []
		);
	}

	linksOf(id = this.origin) {
		return this.resolveRootIdentities(id)
			?.flatMap((_) =>
				_.relations?.filter((relation) => "linkedTo" in relation),
			)
			.filter((_) => _ !== undefined);
	}
	linksTo(id = this.origin) {
		return (
			this.identities.filter((_) =>
				_.relations?.some(
					(relation) => "linkedTo" in relation && relation.linkedTo === id,
				),
			) ?? []
		);
	}

	recursiveContainersOf(id = this.origin, maxDepth = 100): Array<Identity> {
		if (maxDepth === 0) {
			return [];
		}

		const containers = this.containersOf(id);
		if (containers.length === 0) {
			return [];
		}

		return containers.concat(
			containers.flatMap((container) =>
				this.recursiveContainersOf(container.id),
			),
		);
	}

	childrenOf(id = this.origin) {
		return this.resolveRootIdentities(id)
			.flatMap(
				(_) =>
					_.relations
						?.filter(
							(relation) =>
								"fatherOf" in relation ||
								"motherOf" in relation ||
								"adopted" in relation,
						)
						.map((relation) =>
							"fatherOf" in relation
								? relation.fatherOf
								: "motherOf" in relation
									? relation.motherOf
									: relation.adopted,
						) ?? [],
			)
			.map((childId) => this.resolveIdentity(childId))
			.filter((child) => child !== undefined);
	}

	antecedents(id = this.origin, maxDepth = 100): Array<Identity> | undefined {
		if (maxDepth === 0) {
			return [];
		}

		const parents = coalesceArray([this.motherOf(id), this.fatherOf(id)]);
		if (parents.length === 0) {
			return [];
		}

		return parents.concat(
			parents.flatMap((parent) => this.antecedents(parent.id) ?? []),
		);
	}

	descendants(id = this.origin, maxDepth = 100): Array<Identity> | undefined {
		if (maxDepth === 0) {
			return [];
		}

		const children = this.childrenOf(id);
		if (children === undefined) {
			return undefined;
		}

		return children.concat(
			children.flatMap(
				(child) => this.descendants(child.id, maxDepth - 1) ?? [],
			),
		);
	}

	bloodline(id = this.origin, maxDepth = 100): Array<Identity> | undefined {
		if (maxDepth === 0) {
			return [];
		}

		const ancestors = this.antecedents(id, maxDepth - 1) ?? [];
		if (ancestors?.length === 0) {
			return undefined;
		}

		return [
			...new Set(
				ancestors.concat(
					ancestors.flatMap(
						(ancestor) => this.descendants(ancestor.id, maxDepth - 1) ?? [],
					),
				),
			),
		];
	}

	siblings(id = this.origin): Array<Identity> | undefined {
		const mother = this.motherOf(id);
		const father = this.fatherOf(id);
		const childrenMother = new Set(
			this.childrenOf(mother?.id).map((_) => _.id),
		);
		const childrenFather = new Set(
			this.childrenOf(father?.id).map((_) => _.id),
		);
		const childrenShared = childrenMother.intersection(childrenFather);
		return [...childrenShared]
			.map((_) => this.resolveIdentity(_))
			.filter((_) => _ !== undefined);
	}

	locations(id = this.origin, quant = true): Array<Identity> | undefined {
		const rootIdentity = this.resolveIdentity(id);
		if (rootIdentity === undefined) {
			return undefined;
		}

		if (isIdentityLocation(rootIdentity)) {
			return coalesceArray([rootIdentity, ...this.recursiveContainersOf(id)]);
		}

		const rootMarriages = this.marriagesOf(id);
		const locationTimelines = this.timelines.filter((_) =>
			isIdentityLocation(_),
		) as Array<TimelineAncestryRenderer>;
		const locationIdentities = locationTimelines.map((_) => _.meta.identity);
		const found = [];
		for (const location of locationIdentities) {
			if (rootIdentity.born?.in === location.id) {
				found.push(location);
				if (!quant) {
					continue;
				}
			}
			if (rootIdentity.died?.in === location.id) {
				found.push(location);
				if (!quant) {
					continue;
				}
			}
			if (rootIdentity.started?.in === location.id) {
				found.push(location);
				if (!quant) {
					continue;
				}
			}
			if (rootIdentity.ended?.in === location.id) {
				found.push(location);
				if (!quant) {
					continue;
				}
			}

			if (rootMarriages.some((_) => _.in === location.id)) {
				found.push(location);
				if (!quant) {
					continue;
				}
			}

			const shared = intersect(
				mustExist(this.timelineOf(id)),
				mustExist(this.timelineOf(location.id)),
			);
			if (0 < shared.length) {
				found.push(location);
				for (const parent of this.recursiveContainersOf(location.id)) {
					found.push(parent);
				}
				if (!quant) {
					break;
				}
			}
		}
		return found;
	}

	periods(id = this.origin): Array<Identity> | undefined {
		const rootIdentity = this.resolveIdentity(id);
		if (rootIdentity === undefined) {
			return undefined;
		}

		// Plain identities behave like unbounded periods.
		const periodTimelines = this.timelines.filter(
			(_) => isIdentityPeriod(_) || isIdentityPlain(_),
		) as Array<TimelineAncestryRenderer>;
		const periodIdentities = periodTimelines.map((_) => _.meta.identity);
		const found = [];
		for (const period of periodIdentities) {
			const shared = intersect(
				mustExist(this.timelineOf(rootIdentity.id)),
				mustExist(this.timelineOf(period.id)),
			);
			if (0 < shared.length) {
				found.push(period);
			}
		}
		return found;
	}

	calculateHopsFrom(
		id = this.origin,
		options: Partial<{
			allowChildHop: boolean;
			allowEventHop: boolean;
			allowLinkHop: boolean;
			allowLocationHop: boolean;
			allowMarriageHop: boolean;
			allowParentHop: boolean;
		}> = {},
	): Map<string, number> {
		const distances = new Map<string, number>(
			this.identities.map((identity) => [
				identity.id,
				Number.POSITIVE_INFINITY,
			]),
		);

		distances.set(id, 0);
		const root = mustExist(
			this.resolveIdentity(id),
			`unable to resolve identity '${id}'`,
		);
		distances.set(root.id, 0);

		if (options?.allowEventHop === true) {
			const rootTimeline = this.timelineOf()?.records ?? [];
			for (const identity of this.identities) {
				for (const [timestampA, recordA] of this.timelineOf(identity.id)
					?.records ?? []) {
					for (const [timestampB, recordB] of rootTimeline) {
						if (timestampA !== timestampB) {
							continue;
						}
						if (recordA.title === recordB.title) {
							const currentDistance =
								distances.get(identity.id) ?? Number.POSITIVE_INFINITY;
							distances.set(
								identity.id,
								Math.min(Math.max(0, currentDistance - 1), 100),
							);
						}
					}
				}
			}
		}

		if (options?.allowLocationHop === true) {
			// Locations that are associated with the root identity.
			const rootLocations = this.locations(id, false);

			if (rootLocations !== undefined && 0 < rootLocations.length) {
				// All identities, and their associated locations.
				const identityLocations = new Map(
					this.identities.map((_) => [_.id, this.locations(_.id) ?? []]),
				);

				for (const [identity, locations] of identityLocations) {
					if (identity === id) {
						continue;
					}
					for (const location of locations) {
						const locationHops = rootLocations.indexOf(location);
						if (-1 < locationHops) {
							const currentDistance =
								distances.get(identity) ?? Number.POSITIVE_INFINITY;
							distances.set(
								identity,
								Math.min(
									Math.max(0, currentDistance - 1),
									(locationHops + 1) * 100,
								),
							);
						}
					}
				}
			}
		}

		let changes = 1;
		while (0 < changes) {
			changes = 0;
			for (const identity of this.identities) {
				let currentBest =
					distances.get(identity.id) ?? Number.POSITIVE_INFINITY;

				if (options.allowParentHop !== false) {
					const parents = this.parentsOf(identity.id);
					for (const parent of parents) {
						const parentDistance =
							distances.get(parent.id) ?? Number.POSITIVE_INFINITY;
						const hopDistance = parentDistance + 1;
						if (hopDistance < currentBest) {
							distances.set(identity.id, hopDistance);
							currentBest = hopDistance;
							++changes;
						}
					}
				}

				const children = this.childrenOf(identity.id);
				if (options.allowChildHop !== false && children !== undefined) {
					for (const child of children) {
						const childDistance =
							distances.get(child.id) ?? Number.POSITIVE_INFINITY;
						const hopDistance = childDistance + 1;
						if (hopDistance < currentBest) {
							distances.set(identity.id, hopDistance);
							currentBest = hopDistance;
							++changes;
						}
					}
				}

				const marriages = this.marriagesOf(identity.id);
				if (options.allowMarriageHop !== false && marriages !== undefined) {
					for (const marriage of marriages) {
						const spouse = this.resolveIdentity(marriage.marriedTo);
						const spouseDistance =
							(spouse !== undefined ? distances.get(spouse.id) : undefined) ??
							Number.POSITIVE_INFINITY;
						const hopDistance = spouseDistance + 1;
						if (hopDistance < currentBest) {
							distances.set(identity.id, hopDistance);
							currentBest = hopDistance;
							++changes;
						}
					}
				}

				if (options.allowLinkHop === true) {
					const links = this.linksOf(identity.id);
					for (const link of links) {
						const linkDistance =
							(link !== undefined ? distances.get(link.linkedTo) : undefined) ??
							Number.POSITIVE_INFINITY;
						const hopDistance = linkDistance + 3;
						if (hopDistance < currentBest) {
							distances.set(identity.id, hopDistance);
							currentBest = hopDistance;
							++changes;
						}
					}
				}
			}
		}

		return distances;
	}

	mapIdentities(mapper: (id: Identity) => Identity) {
		const newTimelines = this.timelines.map((timeline) =>
			timeline.meta.identity !== undefined
				? {
						...timeline,
						meta: {
							...timeline.meta,
							identity: mapper(timeline.meta.identity),
						},
					}
				: timeline,
		);
		return new IdentityGraph(newTimelines, this.origin);
	}

	anonymize(seed: string) {
		const random = new Random(seedFromString(seed));
		const nameCache = new Map<string, string>();
		const getName = (id: string) => {
			if (nameCache.has(id)) {
				return mustExist(nameCache.get(id));
			}
			const name = random.nextString(19);
			nameCache.set(id, name);
			return name;
		};
		const result = [];
		for (const timeline of this.timelines) {
			if (timeline.meta.identity === undefined) {
				result.push(timeline);
				continue;
			}

			if (
				timeline.meta.private === false ||
				!isIdentityPerson(timeline.meta.identity)
			) {
				result.push(timeline);
				continue;
			}

			const identity = {
				id: getName(timeline.meta.identity.id),
				born: {
					date: new Date().toISOString(),
				},
				relations: timeline.meta.identity.relations
					?.map((relation) => {
						if ("marriedTo" in relation) {
							return {
								marriedTo: getName(relation.marriedTo),
							};
						}
						if ("fatherOf" in relation) {
							return { fatherOf: getName(relation.fatherOf) };
						}
						if ("motherOf" in relation) {
							return { motherOf: getName(relation.motherOf) };
						}
						if ("adopted" in relation) {
							return { adopted: getName(relation.adopted) };
						}
						if ("linkedTo" in relation) {
							return undefined;
						}
						throw new InvalidOperationError(
							`Unknown relation type with keys: ${Object.keys(relation).join(",")}`,
						);
					})
					.filter((_) => _ !== undefined),
			};

			result.push({
				...timeline,
				meta: {
					...timeline.meta,
					identity,
				},
			});
		}
		return new IdentityGraph(result, getName(this.origin));
	}
}
