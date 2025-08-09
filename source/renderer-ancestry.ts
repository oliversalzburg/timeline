import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { FONT_NAME, FONT_SIZE } from "./constants.js";
import { dot, makeHtmlString } from "./dot.js";
import {
	identityGraph,
	millisecondsAsYears,
	uncertainEventToDate,
	uncertainEventToDateString,
} from "./genealogy.js";
import type { RendererOptions } from "./renderer.js";
import type { Identity, Marriage, TimelineAncestryRenderer } from "./types.js";

export class Child {
	identity: string;
	constructor(identity: string) {
		this.identity = identity;
		this.children = [];
		this.marriages = [];
	}
	father?: string;
	mother?: string;
	marriages: Array<string>;
	children: Array<string>;
	distance?: number;
}
export class Alias {
	identity: string;
	origin: string;
	constructor(identity: string, origin: string) {
		this.identity = identity;
		this.origin = origin;
	}
}
export class Joiner {
	who: Array<string>;
	type?: "marriage" | "dna";
	date?: string;
	until?: string;
	mergeFrom?: Joiner;
	mergeInto?: Joiner;
	constructor(who: Array<string>, type?: "marriage" | "dna") {
		this.who = who;
		this.type = type;
	}
	static makeJoinId(
		a: string | undefined,
		b: string | undefined,
		date?: string,
		until?: string,
	) {
		date = undefined;
		until = undefined;
		const ids = [a ?? "NULL", b ?? "NULL"].sort();
		return `JOINED-${ids.join("+")}@${date ?? "NULL"}-${until ?? "NULL"}`;
	}
}

export const render = (
	timelines: Array<TimelineAncestryRenderer>,
	options: Partial<RendererOptions> = {},
) => {
	const graph = identityGraph(timelines, options);

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

	const name = (_?: Identity | null | undefined) => _?.name ?? _?.id ?? _;

	for (const node of graph.nodes) {
		const identity = node;
		if (identity instanceof Joiner) {
			const joiner = identity as Joiner;

			const joinedId = Joiner.makeJoinId(
				joiner.who[0],
				joiner.who[1],
				joiner.date,
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

			const marriage =
				identity.type === "marriage"
					? mustExist(
							graph.marriage(joiner.who[0], joiner.who[1])[0],
							`can't find marriage between '${joiner.who[0]}' and '${joiner.who[1]}'`,
						)
					: undefined;
			const marriageOnSpouse =
				identity.type === "marriage"
					? mustExist(
							graph.marriage(joiner.who[1], joiner.who[0])[0],
							`can't find marriage between '${joiner.who[1]}' and '${joiner.who[0]}'`,
						)
					: undefined;

			const names = joiner.who.map((_) => name(graph.identity(_)) ?? _);
			d.node(joinedId, {
				color: "white",
				height: identity.type === "dna" ? 0 : undefined,
				label: makeHtmlString(
					`${marriage?.as ?? names[0]}\n⚭${date ? ` ${dateString}` : ""}\n${marriageOnSpouse?.as ?? names[1]}`,
				),
				shape: identity.type === "dna" ? "point" : "ellipse",
				style: identity.type === "dna" ? "invis" : "dashed",
				width: identity.type === "dna" ? 0 : undefined,
			});
			continue;
		}

		if (identity instanceof Child) {
			const ego = identity as Child;
			const egoIdentity = mustExist(
				graph.identity(identity.identity),
				`identity not found on graph: '${identity.identity}'`,
			);

			const bornString = uncertainEventToDateString(
				egoIdentity.born,
				options.dateRenderer,
			);
			const diedString =
				egoIdentity.died === null
					? ""
					: uncertainEventToDateString(egoIdentity.died, options.dateRenderer);
			const diedSymbol =
				egoIdentity.died?.inMilitaryService === true ||
				egoIdentity.died?.inMilitaryService === null
					? "⚔︎"
					: "✝︎";

			const relations = egoIdentity.relations ?? [];
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
				ego.distance === 0 ? 255 : Math.floor(255 - 20 * (ego.distance ?? 10))
			).toString(16);
			d.node(egoIdentity.id, {
				color: `#${colorComponent.repeat(3)}`,
				fillcolor:
					chromosomes === "M"
						? "darkblue"
						: chromosomes === "W"
							? "darkred"
							: undefined,
				style: chromosomes !== undefined ? "filled" : undefined,
				label: makeHtmlString(
					(egoIdentity.name ?? egoIdentity.id) +
						(bornString !== undefined ? `\n* ${bornString}` : "") +
						(diedString !== undefined ? `\n${diedSymbol} ${diedString}` : "") +
						`\n${ego.distance ?? "?"}`,
				),
			});
		}
	}

	for (const node of graph.nodes) {
		if (node instanceof Child === false) {
			continue;
		}

		const subject = node as Child;

		//if (node instanceof Alias) {
		//	d.link(alias.origin.identity.id, alias.identity.id, { style: "dashed" });
		//}

		const relations =
			mustExist(
				graph.identity(subject.identity),
				`identity is unknown on graph: '${subject.identity}'`,
			).relations ?? [];

		for (const relation of relations) {
			try {
				if ("fatherOf" in relation) {
					const childIdentity = mustExist(
						graph.identity(relation.fatherOf),
						`identity '${subject.identity}' declares to be father of unknown identity: '${relation.fatherOf}'`,
					);
					const father = subject.identity;
					const motherPointer = graph.motherOf(childIdentity.id);
					const mother = graph.rootId(motherPointer.identity);
					if (mother === undefined) {
						throw new InvalidOperationError(
							`identity '${subject.identity}' is father of '${childIdentity.id}', but mother is undefined.`,
						);
					}

					const joinerId = Joiner.makeJoinId(father, mother);
					d.link(subject.identity, joinerId, {
						arrowhead: "none",
						headport: "e",
						tailport: "w",
					});
					// We only link the mother
					//d.link(joinerId, relation.fatherOf, { headport: "e", tailport: "w" });
				} else if ("motherOf" in relation) {
					const childIdentity = mustExist(
						graph.identity(relation.motherOf),
						`identity '${subject.identity}' declares to be mother of unknown identity: '${relation.motherOf}'`,
					);
					const mother = subject.identity;
					const fatherPointer = graph.fatherOf(childIdentity.id);
					const father = graph.rootId(fatherPointer.identity);
					if (father === undefined) {
						throw new InvalidOperationError(
							`identity '${subject.identity}' is mother of '${childIdentity.id}', but father is undefined.`,
						);
					}

					const joinerId = Joiner.makeJoinId(father, mother);
					const age = undefined;
					// 	subject.identity.born?.date !== undefined &&
					// 	offspring.identity.born?.date !== undefined
					// 		? new Date(offspring.identity.born?.date).valueOf() -
					// 			new Date(subject.identity.born.date).valueOf()
					// 		: undefined;

					d.link(subject.identity, joinerId, {
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
					const age = undefined;
					// subject.identity.born?.date !== undefined &&
					// relation.date !== undefined
					// 	? new Date(relation.date).valueOf() -
					// 		new Date(subject.identity.born.date).valueOf()
					// 	: undefined;

					const ego = subject.identity;
					const marriedTo = marriage.marriedTo;
					const joinerId = Joiner.makeJoinId(ego, marriedTo, relation.date);
					// TODO: Only link, if no shared children during marriage.
					d.link(ego, joinerId, {
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
					`Error while processing relation '${JSON.stringify(relation)}' of ${subject.identity}!\n`,
				);
				throw fault;
			}
		}
	}

	d.raw("}");
	return d.toString();
};
