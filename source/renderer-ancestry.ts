import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { FONT_NAME, FONT_SIZE, TRANSPARENT } from "./constants.js";
import { dot, makeHtmlString } from "./dot.js";
import type { RendererOptions } from "./renderer.js";
import type { Identity, TimelineAncestryRenderer } from "./types.js";

export class Child {
	identity: string | Identity;
	constructor(identity: string | Identity) {
		this.identity = identity;
	}
	father?: string | Child;
	mother?: string | Child;
}
export class Alias {
	alias: string;
	origin: string | Child;
	constructor(alias: string, origin: string | Child) {
		this.alias = alias;
		this.origin = origin;
	}
}

export const parentOf = (identity: Identity) => [
	...fatherOf(identity),
	...motherOf(identity),
];
export const fatherOf = (identity: Identity) =>
	identity.relations?.filter((_) => "fatherOf" in _).map((_) => _.fatherOf) ??
	[];
export const motherOf = (identity: Identity) =>
	identity.relations?.filter((_) => "motherOf" in _).map((_) => _.motherOf) ??
	[];
export const marriedToMeta = (identity: Identity) =>
	identity.relations?.filter((_) => "marriedTo" in _) ?? [];

export const plan = (
	timelines: Array<TimelineAncestryRenderer>,
	_options: Partial<RendererOptions> = {},
) => {
	const identities = new Map<string, Identity>();
	for (const timeline of timelines) {
		const identity = timeline.meta.identity;
		if (identities.has(identity.id)) {
			throw new InvalidOperationError(`Duplicate identity: ${identity.id}`);
		}
		identities.set(identity.id, timeline.meta.identity);
	}

	// Parse identities and construct relationship graph.
	const graphNodes = new Map<string, Child | Alias>();
	for (const [id, identity] of identities.entries()) {
		if (!graphNodes.has(id)) {
			graphNodes.set(id, new Child(mustExist(identities.get(id))));
		}

		const graphNode = mustExist(graphNodes.get(id)) as Child;

		for (const childId of fatherOf(identity)) {
			if (!graphNodes.has(childId)) {
				graphNodes.set(childId, new Child(mustExist(identities.get(childId))));
			}

			const childNode = mustExist(graphNodes.get(childId)) as Child;
			childNode.father = graphNode;
		}

		for (const childId of motherOf(identity)) {
			if (!graphNodes.has(childId)) {
				graphNodes.set(childId, new Child(mustExist(identities.get(childId))));
			}

			const childNode = mustExist(graphNodes.get(childId)) as Child;
			childNode.mother = graphNode;
		}

		for (const marriage of marriedToMeta(identity)) {
			const alias = marriage.as;
			if (alias === undefined) {
				continue;
			}

			if (!graphNodes.has(alias)) {
				graphNodes.set(alias, new Alias(alias, id));
			}

			const aliasNode = mustExist(graphNodes.get(alias)) as Alias;
			aliasNode.origin = graphNode;
		}
	}

	for (const [name, marker] of graphNodes.entries()) {
		if ("origin" in marker && typeof marker.origin === "string") {
			// Alias marker
			const origin = mustExist(graphNodes.get(marker.origin));
			if ("alias" in origin) {
				throw new InvalidOperationError(
					`'${name}' is an alias of an alias '${origin.alias}'. Aliases should point to their origin.`,
				);
			}

			graphNodes.set(name, { alias: name, origin });
			continue;
		}

		const childMarker = marker as Child;

		graphNodes.set(name, {
			identity: childMarker.identity,
			father:
				typeof childMarker.father === "string"
					? (graphNodes.get(childMarker.father) as Child | undefined)
					: childMarker.father,
			mother:
				typeof childMarker.mother === "string"
					? (graphNodes.get(childMarker.mother) as Child | undefined)
					: childMarker.mother,
		});
	}

	return graphNodes;
};

export const render = (
	timelines: Array<TimelineAncestryRenderer>,
	options: Partial<RendererOptions> = {},
) => {
	const _graph = plan(timelines);

	const d = dot();
	d.raw("digraph ancestry {");
	d.raw(`node [fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`);
	d.raw(`edge [fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`);
	d.raw(`bgcolor="${TRANSPARENT}"`);
	d.raw('comment=" "');
	d.raw('concentrate="true"');
	d.raw(`fontname="${FONT_NAME}"`);
	d.raw(`fontsize="${FONT_SIZE}"`);
	d.raw('label=" "');
	d.raw(`rankdir="RL"`);
	d.raw(`ranksep="0.5"`);
	d.raw(`tooltip=" "`);

	const identityMap = new Map<string, TimelineAncestryRenderer>();
	const marriagesUnconcluded = new Map<string, string>();

	const findFatherOf = (id: string) =>
		timelines.find((_) =>
			(_.meta.identity.relations ?? []).some(
				(relation) => "fatherOf" in relation && relation.fatherOf === id,
			),
		);
	const findMotherOf = (id: string) =>
		timelines.find((_) =>
			(_.meta.identity.relations ?? []).some(
				(relation) => "motherOf" in relation && relation.motherOf === id,
			),
		);
	const toDate = (input?: string) => {
		if (input === undefined) {
			return undefined;
		}
		if (input.length === 4) {
			const year = Number(input);
			return new Date(year, 0);
		}
		return new Date(input);
	};

	for (const timeline of timelines) {
		const identity = timeline.meta.identity;
		identityMap.set(identity.id, timeline);

		const born = toDate(identity.born)?.valueOf();
		const bornString =
			born !== undefined && options?.dateRenderer
				? options.dateRenderer(born)
				: born !== undefined
					? new Date(born).toDateString()
					: "";

		const died = toDate(identity.died)?.valueOf();
		const diedString =
			died !== undefined && options?.dateRenderer
				? options.dateRenderer(died)
				: died !== undefined
					? new Date(died).toDateString()
					: "";

		const relations = identity.relations ?? [];
		const marriages = relations.filter((_) => "marriedTo" in _);

		let chromosomes: "M" | "W" | undefined;
		if (relations.some((_) => "fatherOf" in _)) {
			chromosomes = "M";
		}
		if (relations.some((_) => "motherOf" in _)) {
			chromosomes = "W";
		}

		d.node(identity.id, {
			color:
				chromosomes === "M" ? "blue" : chromosomes === "W" ? "red" : "black",
			label: makeHtmlString(
				(identity.name ?? identity.id) +
					(born ? `\n* ${bornString}` : "") +
					(died ? `\n✝︎ ${diedString}` : ""),
			),
		});

		if (0 < marriages.length) {
			marriagesUnconcluded.set(identity.id, marriages[0].marriedTo);
			const name = marriages[0].as ?? identity.name ?? identity.id;
			const spouse = marriages[0].marriedTo;
			d.node(`MARRIAGE-${identity.id}+${spouse}`, {
				label: makeHtmlString(`${name} + ${spouse}`),
				style: "dotted",
			});
		}
	}

	// Render relations.
	for (const timeline of timelines) {
		const id = timeline.meta.identity.id;
		const relations = timeline.meta.identity.relations ?? [];

		for (const relation of relations) {
			try {
				if ("fatherOf" in relation) {
					const child = mustExist(identityMap.get(relation.fatherOf));
					const father = id;
					const mother = findMotherOf(child.meta.identity.id)?.meta.identity.id;
					const dna = `DNA-${father}+${mother}`;
					if (!d.has(dna)) {
						d.node(dna, {
							shape: "point",
							style: "invis",
							width: 0,
							height: 0,
						});
					}
					d.link(id, dna, {
						arrowhead: "none",
						headport: "e",
						tailport: "w",
					});
					d.link(dna, relation.fatherOf, { headport: "e", tailport: "w" });
				} else if ("motherOf" in relation) {
					const child = mustExist(identityMap.get(relation.motherOf));
					const father = findFatherOf(child.meta.identity.id)?.meta.identity.id;
					const mother = id;
					const dna = `DNA-${father}+${mother}`;
					if (!d.has(dna)) {
						d.node(dna, {
							shape: "point",
							style: "invis",
							width: 0,
							height: 0,
						});
					}
					d.link(id, dna, {
						arrowhead: "none",
						headport: "e",
						tailport: "w",
					});
					d.link(dna, relation.motherOf, { headport: "e", tailport: "w" });
				} else if ("marriedTo" in relation) {
					d.link(id, relation.marriedTo, {
						arrowhead: "none",
						comment: "married to",
						constraint: false,
						style: "bold",
					});
				}
			} catch (fault) {
				process.stderr.write(
					`Error while processing relation '${JSON.stringify(relation)}' of ${timeline.meta.id}!\n`,
				);
				throw fault;
			}
		}
	}

	d.raw("}");
	return d.toString();
};
