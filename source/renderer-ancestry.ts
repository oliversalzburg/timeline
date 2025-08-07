import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { FONT_NAME, FONT_SIZE } from "./constants.js";
import { dot, makeHtmlString } from "./dot.js";
import {
	millisecondsAsYears,
	uncertainEventToDate,
	uncertainEventToDateString,
} from "./genealogy.js";
import type { RendererOptions } from "./renderer.js";
import type {
	Father,
	Identity,
	Marriage,
	Mother,
	TimelineAncestryRenderer,
} from "./types.js";

export class Child {
	identity: string | Identity;
	constructor(identity: string | Identity) {
		this.identity = identity;
	}
	father?: string | Child;
	mother?: string | Child;
	distance?: number;
}
export interface ChildMarker {
	identity: string;
	father?: string;
	mother?: string;
}
export interface ChildConcrete {
	identity: Identity;
	father?: ChildConcrete;
	mother?: ChildConcrete;
	distance?: number;
}
export class Alias {
	identity: string | Identity;
	origin: string | Child;
	constructor(identity: string, origin: string | Child) {
		this.identity = identity;
		this.origin = origin;
	}
}
export interface AliasConcrete {
	identity: Identity;
	origin: ChildConcrete;
}
export class Joiner {
	who: Set<string | Child | Alias>;
	type?: "marriage" | "dna";
	date?: string;
	until?: string;
	mergeFrom?: Joiner;
	mergeInto?: Joiner;
	constructor(who: Array<string>, type?: "marriage" | "dna") {
		this.who = new Set(who);
		this.type = type;
	}
	static makeJoinId(
		a: string | undefined,
		b: string | undefined,
		date?: string,
		until?: string,
	) {
		const ids = [a ?? "NULL", b ?? "NULL"].sort();
		return `JOINED-${ids.join("+")}@${date ?? "NULL"}-${until ?? "NULL"}`;
	}
}
export interface JoinerConcrete {
	who: Set<ChildConcrete | AliasConcrete>;
	type?: "marriage" | "dna";
	date?: string;
	until?: string;
	mergeInto?: JoinerConcrete;
	mergeFrom?: JoinerConcrete;
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
	options: Partial<RendererOptions & { originIdentity: string }> = {},
) => {
	const identities = new Map<string, Identity>();
	for (const timeline of timelines) {
		const identity = timeline.meta.identity;
		if (identities.has(identity.id)) {
			throw new InvalidOperationError(`Duplicate identity: '${identity.id}'`);
		}
		identities.set(identity.id, timeline.meta.identity);
	}
	const originIdentity =
		options?.originIdentity !== undefined
			? identities.get(options.originIdentity)
			: undefined;

	const nodeId = (maybeNode: string | Child) => {
		return maybeNode instanceof Child
			? typeof maybeNode.identity === "string"
				? maybeNode.identity
				: maybeNode.identity.id
			: maybeNode;
	};
	const joinNodes = (a: string, b: string, type?: "marriage" | "dna") => {
		const joinerId = Joiner.makeJoinId(
			a,
			b,
			//marriage.date,
		);

		const node = graphNodes.get(joinerId) as Joiner | undefined;
		if (node === undefined) {
			const joiner = new Joiner([a, b], type);
			graphNodes.set(joinerId, joiner);
			return joiner;
		}

		if (type === "marriage" && node.type !== "marriage") {
			node.type = type;
		}
		return node;
	};
	let randomIndex = 1;
	const generateMale = (relations?: Array<Father>): Identity => {
		const name = `Unbekannter Mann ${randomIndex++}`;
		return { name, id: name, relations };
	};
	const generateFemale = (relations?: Array<Mother>): Identity => {
		const name = `Unbekannte Frau ${randomIndex++}`;
		return { name, id: name, relations };
	};

	// Parse identities and construct relationship graph.
	const graphNodes = new Map<string, Child | Alias | Joiner>();
	for (const [id, identity] of identities.entries()) {
		if (!graphNodes.has(id)) {
			graphNodes.set(id, new Child(mustExist(identities.get(id))));
		}

		const graphNode = mustExist(graphNodes.get(id)) as Child;

		for (const marriage of marriedToMeta(identity)) {
			// Generate new node for potential name change.
			const alias = marriage.as;
			if (alias !== undefined) {
				if (!graphNodes.has(alias)) {
					graphNodes.set(alias, new Alias(alias, id));
					identities.set(alias, { id: alias, name: alias });
				}
				const aliasNode = mustExist(graphNodes.get(alias)) as Alias;
				aliasNode.origin = graphNode;
			}
			const self = alias ?? id;
			const marriedTo = marriage.marriedTo;
			const spouseIdentity = mustExist(
				identities.get(marriedTo),
				`unknown identity '${marriedTo}' in '${id}'`,
			);
			const spouseMarriage = marriedToMeta(spouseIdentity).find(
				(_) => _.marriedTo === id,
			);
			const spouse = spouseMarriage?.as ?? marriedTo;

			const joiner = joinNodes(self, marriedTo, "marriage");
			joiner.date = marriage.date;
			if (spouse !== marriedTo) {
				const joinerAlias = joinNodes(self, spouse, "marriage");
				joinerAlias.mergeInto = joiner;
				joiner.mergeFrom = joinerAlias;
				joinerAlias.date = marriage.date;
			}
		}

		for (const childId of fatherOf(identity)) {
			if (!graphNodes.has(childId)) {
				graphNodes.set(
					childId,
					new Child(
						mustExist(
							identities.get(childId),
							`'${id}' declares father of unknown identity '${childId}'`,
						),
					),
				);
			}

			const childNode = mustExist(graphNodes.get(childId)) as Child;
			childNode.father = graphNode;

			if (childNode.father && childNode.mother) {
				joinNodes(nodeId(childNode.father), nodeId(childNode.mother), "dna");
			}
		}

		for (const childId of motherOf(identity)) {
			if (!graphNodes.has(childId)) {
				graphNodes.set(
					childId,
					new Child(
						mustExist(
							identities.get(childId),
							`'${id}' declares mother of unknown identity '${childId}'`,
						),
					),
				);
			}

			const childNode = mustExist(graphNodes.get(childId)) as Child;
			childNode.mother = graphNode;

			if (childNode.father && childNode.mother) {
				joinNodes(nodeId(childNode.father), nodeId(childNode.mother), "dna");
			}
		}
	}

	// Generate missing parents
	for (const [id, node] of graphNodes.entries()) {
		if (node instanceof Child === false) {
			continue;
		}

		// Children with both parents unknown, stop recursion.
		if (node.father === undefined && node.mother === undefined) {
			continue;
		}

		if (node.father === undefined) {
			const father = generateMale([{ fatherOf: id }]);
			identities.set(father.id, father);
			node.father = new Child(father);
			graphNodes.set(father.id, node.father);
		}
		if (node.mother === undefined) {
			const mother = generateFemale([{ motherOf: id }]);
			identities.set(mother.id, mother);
			node.mother = new Child(mother);
			graphNodes.set(mother.id, node.mother);
		}

		joinNodes(nodeId(node.father), nodeId(node.mother), "dna");
	}

	// Resolve
	for (const [id, marker] of graphNodes.entries()) {
		if (marker instanceof Joiner) {
			marker.who = new Set(
				marker.who
					.values()
					.map((_) =>
						typeof _ === "string"
							? (mustExist(graphNodes.get(_)) as ChildConcrete)
							: _,
					),
			);
			continue;
		}

		if (marker instanceof Alias) {
			const alias = marker as Alias;
			alias.identity =
				typeof alias.identity === "string"
					? mustExist(identities.get(alias.identity as string))
					: alias.identity;
			alias.origin =
				typeof alias.origin === "string"
					? (mustExist(graphNodes.get(alias.origin as string)) as Child)
					: alias.origin;
			continue;
		}

		const childMarker = marker as Child;

		const child = new Child(childMarker.identity);
		child.father =
			typeof childMarker.father === "string"
				? (mustExist(graphNodes.get(childMarker.father)) as Child)
				: childMarker.father;
		child.mother =
			typeof childMarker.mother === "string"
				? (mustExist(graphNodes.get(childMarker.mother)) as Child)
				: childMarker.mother;
		graphNodes.set(id, child);
	}

	// Resolve for origin
	const traverse = (
		child: ChildConcrete,
		options: Array<ChildConcrete | undefined>,
	) => {
		const tests = options.map((_) =>
			_ !== undefined ? _.distance : undefined,
		);
		const distances = tests
			.filter((_) => typeof _ === "number")
			.sort((a, b) => a - b);
		const depth = 0 < distances.length ? distances[0] + 1 : undefined;
		if (depth !== undefined) {
			child.distance = depth;
		}
		return depth;
	};

	if (originIdentity !== undefined) {
		const children = [
			...graphNodes.values().filter((_) => _ instanceof Child),
		] as Array<ChildConcrete>;
		const childrenOfParents = new Array<[string, Array<ChildConcrete>]>();

		for (const child of children) {
			if (child.father !== undefined) {
				childrenOfParents.push([child.father.identity.id, []]);
			}
			if (child.mother !== undefined) {
				childrenOfParents.push([child.mother.identity.id, []]);
			}
		}
		const childrenLookup = new Map<string, Array<ChildConcrete>>(
			childrenOfParents,
		);
		for (const child of children) {
			if (child.father !== undefined) {
				const childrenCollection = mustExist(
					childrenLookup.get(child.father.identity.id),
				);
				childrenCollection.push(child);
			}
			if (child.mother !== undefined) {
				const childrenCollection = mustExist(
					childrenLookup.get(child.mother.identity.id),
				);
				childrenCollection.push(child);
			}
		}
		let iterations = 0;
		let changes = 0;
		for (; iterations < 20; ++iterations) {
			console.log(`${changes} changes after ${iterations} iterations`);
			for (const child of children.values()) {
				if (child.distance !== undefined) {
					continue;
				}
				if (child.identity === originIdentity) {
					child.distance = 0;
					++changes;
					continue;
				}
				if (
					traverse(child, [
						child.father !== undefined
							? (graphNodes.get(child.father.identity.id) as ChildConcrete)
							: undefined,
						child.mother !== undefined
							? (graphNodes.get(child.mother.identity.id) as ChildConcrete)
							: undefined,
						...(childrenLookup.get(child.identity.id) ?? []).map(
							(_) => graphNodes.get(_.identity.id) as ChildConcrete | undefined,
						),
					]) !== undefined
				) {
					++changes;
				}
			}
		}
	}

	return graphNodes as Map<
		string,
		ChildConcrete | AliasConcrete | JoinerConcrete
	>;
};

export const render = (
	timelines: Array<TimelineAncestryRenderer>,
	options: Partial<RendererOptions> = {},
) => {
	const graph = plan(timelines, options);

	const d = dot();
	d.raw("digraph ancestry {");
	d.raw(
		`node [fontcolor="white"; fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`,
	);
	d.raw(
		`edge [color="white"; fontcolor="white"; fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`,
	);
	d.raw(`bgcolor="${options.theme === "light" ? "white" : "black"}"`);
	d.raw('comment=" "');
	d.raw('concentrate="true"');
	d.raw(`fontcolor="white"`);
	d.raw(`fontname="${FONT_NAME}"`);
	d.raw(`fontsize="${FONT_SIZE}"`);
	d.raw('label=" "');
	d.raw(`rankdir="RL"`);
	d.raw(`ranksep="0.5"`);
	d.raw(`tooltip=" "`);

	for (const [id, identity] of graph) {
		if (identity instanceof Joiner) {
			const joiner = identity as JoinerConcrete;

			if (joiner.mergeInto !== undefined) {
				continue;
			}

			// Resolve aliases to their origin.
			const who = ([...joiner.who] as Array<ChildConcrete | AliasConcrete>).map(
				(_) => (_ instanceof Alias ? (_ as AliasConcrete).origin : _),
			);
			const joinedId = Joiner.makeJoinId(
				who[0].identity.id,
				who[1].identity.id,
				//child.identity.born,
				//child.identity.died,
			);
			if (d.has(joinedId)) {
				continue;
			}

			const date = uncertainEventToDate(identity)?.valueOf();
			const dateString =
				date !== undefined && options?.dateRenderer
					? options.dateRenderer(date)
					: date !== undefined
						? new Date(date).toDateString()
						: "";

			const mergedWho =
				joiner.mergeFrom?.who !== undefined ? [...joiner.mergeFrom.who] : who;
			const names = mergedWho.map((_) => _.identity.name ?? _.identity.id);
			d.node(joinedId, {
				color: "white",
				height: identity.type === "dna" ? 0 : undefined,
				label: makeHtmlString(
					`${names[0]}\n⚭${date ? ` ${dateString}` : ""}\n${names[1]}`,
				),
				shape: identity.type === "dna" ? "point" : "ellipse",
				style: identity.type === "dna" ? "invis" : "dashed",
				width: identity.type === "dna" ? 0 : undefined,
			});
			continue;
		}

		//if (identity instanceof Alias) {
		//	const alias = identity as AliasConcrete;
		//	d.node(alias.identity.id, {
		//		label: alias.identity.name ?? alias.identity.name,
		//		style: "dashed",
		//	});
		//	continue;
		//}

		if (identity instanceof Child === false) {
			continue;
		}

		const subject = (
			"origin" in identity ? identity.origin : identity
		) as ChildConcrete;
		const bornString = uncertainEventToDateString(
			subject.identity.born,
			options.dateRenderer,
		);
		const diedString =
			subject.identity.died === null
				? ""
				: uncertainEventToDateString(
						subject.identity.died,
						options.dateRenderer,
					);
		const diedSymbol =
			subject.identity.died?.inMilitaryService === true ||
			subject.identity.died?.inMilitaryService === null
				? "⚔︎"
				: "✝︎";

		const relations = subject.identity.relations ?? [];
		const _marriages = relations.filter((_) => "marriedTo" in _);
		const fatherhoods = relations.filter((_) => "fatherOf" in _);
		const motherhoods = relations.filter((_) => "motherOf" in _);

		let chromosomes: "M" | "W" | undefined;
		if (0 < fatherhoods.length) {
			chromosomes = "M";
		}

		if (0 < motherhoods.length) {
			chromosomes = "W";
		}

		const colorComponent = (
			subject.distance === 0
				? 255
				: Math.floor(255 - 20 * (subject.distance ?? 10))
		).toString(16);
		d.node(id, {
			color: `#${colorComponent.repeat(3)}`,
			fillcolor:
				chromosomes === "M"
					? "darkblue"
					: chromosomes === "W"
						? "darkred"
						: undefined,
			style: chromosomes !== undefined ? "filled" : undefined,
			label: makeHtmlString(
				((identity instanceof Alias
					? ((identity as AliasConcrete).origin.identity.name ??
						(identity as AliasConcrete).origin.identity.id)
					: undefined) ??
					subject.identity.name ??
					subject.identity.id) +
					(bornString !== undefined ? `\n* ${bornString}` : "") +
					(diedString !== undefined ? `\n${diedSymbol} ${diedString}` : "") +
					`\n${subject.distance ?? "?"}`,
			),
		});
	}

	for (const [id, node] of graph) {
		if (node instanceof Joiner) {
			continue;
		}

		const _alias = node as AliasConcrete;
		const child = node as ChildConcrete;

		//if (node instanceof Alias) {
		//	d.link(alias.origin.identity.id, alias.identity.id, { style: "dashed" });
		//}

		const relations = child.identity.relations ?? [];

		for (const relation of relations) {
			try {
				if ("fatherOf" in relation) {
					const child = mustExist(
						graph.get(relation.fatherOf) as ChildConcrete,
					);
					const father = id;
					const mother = child.mother?.identity.id;
					const joinerId = Joiner.makeJoinId(
						father,
						mother,
						//marriage.date,
					);
					d.link(id, joinerId, {
						arrowhead: "none",
						headport: "e",
						tailport: "w",
					});
					// We only link the mother
					//d.link(joinerId, relation.fatherOf, { headport: "e", tailport: "w" });
				} else if ("motherOf" in relation) {
					const offspring = mustExist(
						graph.get(relation.motherOf) as ChildConcrete,
					);
					const father = offspring.father?.identity.id;
					const mother = id;
					const age =
						child.identity.born?.date !== undefined &&
						offspring.identity.born?.date !== undefined
							? new Date(offspring.identity.born?.date).valueOf() -
								new Date(child.identity.born.date).valueOf()
							: undefined;

					const joinerId = Joiner.makeJoinId(
						father,
						mother,
						//marriage.date,
					);
					d.link(id, joinerId, {
						arrowhead: "none",
						headport: "e",
						tailport: "w",
					});
					d.link(joinerId, relation.motherOf, {
						headlabel:
							age !== undefined
								? millisecondsAsYears(age).toFixed()
								: undefined,
						headport: "e",
						tailport: "w",
					});
				} else if ("marriedTo" in relation) {
					const marriage = relation as Marriage;
					const age =
						child.identity.born?.date !== undefined &&
						relation.date !== undefined
							? new Date(relation.date).valueOf() -
								new Date(child.identity.born.date).valueOf()
							: undefined;

					const self = id;
					const marriedTo = marriage.marriedTo;
					const spouseIdentity = (
						mustExist(graph.get(marriedTo)) as AliasConcrete | ChildConcrete
					).identity;
					const spouseMarriage = marriedToMeta(spouseIdentity).find(
						(_) => _.marriedTo === id,
					);
					const _spouse = spouseMarriage?.as ?? marriage.marriedTo;

					const joinerId = Joiner.makeJoinId(
						self,
						marriedTo,
						//relation.date,
					);
					// TODO: Only link, if no shared children during marriage.
					d.link(id, joinerId, {
						arrowhead: "none",
						headport: "e",
						taillabel:
							age !== undefined
								? millisecondsAsYears(age).toFixed()
								: undefined,
						tailport: "w",
					});
				}
			} catch (fault) {
				process.stderr.write(
					`Error while processing relation '${JSON.stringify(relation)}' of ${id}!\n`,
				);
				throw fault;
			}
		}
	}

	d.raw("}");
	return d.toString();
};
