import { coalesceArray, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { uncertainEventToDate } from "./genealogy.js";
import type { Identity, Timeline } from "./types.js";

export class Graph<
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
					(marriage) => [uncertainEventToDate(marriage), marriage.as] as const,
				)
				.filter(([, alias]) => alias !== undefined)
				.sort(
					([a], [b]) =>
						(a?.valueOf() ?? Number.NEGATIVE_INFINITY) -
						(b?.valueOf() ?? Number.NEGATIVE_INFINITY),
				) ?? [];
		if (0 < aliases?.length) {
			return mustExist(
				aliases.findLast(
					([aliasDate]) =>
						(aliasDate?.valueOf() ?? Number.NEGATIVE_INFINITY) <
						date?.valueOf(),
				),
			)[1];
		}

		const identity = mustExist(this.resolveIdentity(id));
		return identity.name ?? identity?.id;
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
		return this.identities.find((identity) =>
			identity.relations?.some(
				(relation) => "fatherOf" in relation && relation.fatherOf === id,
			),
		);
	}

	motherOf(id = this.origin) {
		return this.identities.find((identity) =>
			identity.relations?.some(
				(relation) => "motherOf" in relation && relation.motherOf === id,
			),
		);
	}

	childrenOf(id = this.origin) {
		return this.resolveRootIdentities(id)
			.flatMap(
				(_) =>
					_.relations
						?.filter(
							(relation) => "fatherOf" in relation || "motherOf" in relation,
						)
						.map((relation) =>
							"fatherOf" in relation ? relation.fatherOf : relation.motherOf,
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

	calculateHopsFrom(
		id = this.origin,
		options: Partial<{
			allowChildHop: boolean;
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
		const root = mustExist(this.resolveIdentity(id));
		distances.set(root.id, 0);

		let changes = 1;
		while (0 < changes) {
			changes = 0;
			for (const identity of this.identities) {
				const currentBest =
					distances.get(identity.id) ?? Number.POSITIVE_INFINITY;

				const father = this.fatherOf(identity.id);
				const mother = this.motherOf(identity.id);
				const fatherDistance =
					(options.allowParentHop !== false && father !== undefined
						? distances.get(father.id)
						: undefined) ?? Number.POSITIVE_INFINITY;
				const motherDistance =
					(options.allowParentHop !== false && mother !== undefined
						? distances.get(mother.id)
						: undefined) ?? Number.POSITIVE_INFINITY;
				const hopFatherDistance = fatherDistance + 1;
				const hopMotherDistance = motherDistance + 1;
				if (hopFatherDistance < currentBest) {
					distances.set(identity.id, hopFatherDistance);
					++changes;
					continue;
				}
				if (hopMotherDistance < currentBest) {
					distances.set(identity.id, hopMotherDistance);
					++changes;
					continue;
				}

				const children = this.childrenOf(identity.id);
				if (options.allowChildHop !== false && children !== undefined) {
					for (const child of children) {
						const childDistance =
							distances.get(child.id) ?? Number.POSITIVE_INFINITY;
						const hopDistance = childDistance + 1;
						if (hopDistance < currentBest) {
							distances.set(identity.id, hopDistance);
							++changes;
							break;
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
							++changes;
							break;
						}
					}
				}
			}
		}

		return distances;
	}
}
