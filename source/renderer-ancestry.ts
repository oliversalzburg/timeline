import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { InvalidOperationError } from "@oliversalzburg/js-utils/errors/InvalidOperationError.js";
import { FONT_NAME, FONT_SIZE, TRANSPARENT } from "./constants.js";
import { dot, makeHtmlString, type NodeProperties } from "./dot.js";
import {
	identityGraph,
	millisecondsAsYears,
	uncertainEventToDate,
	uncertainEventToDateString,
} from "./genealogy.js";
import { matchLuminance } from "./palette.js";
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
	const graph = identityGraph(timelines);
	if (options.origin !== undefined) {
		graph.distance(options.origin);
	}

	const colors = mustExist(options.palette?.lookup);

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

	const computeNodeProperties = (
		title: string,
		contributors: Set<Identity>,
		leader?: Identity,
	) => {
		const contributorsTimelines = [...contributors.values()].map(
			(_) => timelines[graph.ids.indexOf(_.id)],
		);
		const leaderTimeline =
			leader !== undefined
				? timelines[graph.ids.indexOf(leader.id)]
				: undefined;

		const color =
			colors.get(leaderTimeline?.meta.id ?? contributorsTimelines[0]?.meta.id)
				?.pen ?? "#808080FF";
		const fillcolors = contributorsTimelines.reduce((fillColors, timeline) => {
			const fill = colors.get(timeline?.meta.id)?.fill ?? TRANSPARENT;

			// Whatever we want to draw, _one_ transparent fill should be enough.
			if (fill === TRANSPARENT && fillColors.includes(TRANSPARENT)) {
				return fillColors;
			}

			fillColors.push(
				timeline === leaderTimeline ||
					fill === TRANSPARENT ||
					leaderTimeline === undefined
					? fill
					: matchLuminance(
							fill,
							mustExist(colors.get(mustExist(leaderTimeline).meta.id)).fill,
						),
			);
			return fillColors;
		}, new Array<string>());
		const fontcolor =
			colors.get(leaderTimeline?.meta.id ?? contributorsTimelines[0]?.meta.id)
				?.font ?? "#808080FF";
		const prefixes = contributorsTimelines
			.values()
			.reduce((_, timeline) => _ + (timeline?.meta.prefix ?? ""), "");
		const label = `${0 < prefixes.length ? `${prefixes}\u00A0` : ""}${makeHtmlString(
			`${title}`,
		)}`;
		const style = mustExist(
			options.styleSheet?.get(
				options.ranks?.get(
					leaderTimeline?.meta.id ?? contributorsTimelines[0]?.meta.id,
				) ?? 1,
			),
		);

		const nodeProperties: Partial<NodeProperties> = {
			color,
			fillcolor:
				fillcolors.length === 1
					? fillcolors[0]
					: `${fillcolors[0]}:${fillcolors[1]}`,
			fontcolor,
			label,
			penwidth: style.outline ? style.penwidth : 0.5,
			shape: "oval",
			style: style.style?.join(","),
		};

		return nodeProperties;
	};

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

			const contributors = joiner.who.map((_) =>
				mustExist(graph.identity(graph.rootId(_)), `unknown identity: '${_}'`),
			);
			const names = contributors.map((_) => name(_) ?? _);

			const nodeProperties = computeNodeProperties(
				`${marriage?.as ?? names[0]}\n⚭${date ? ` ${dateString}` : ""}\n${marriageOnSpouse?.as ?? names[1]}`,
				new Set(contributors),
			);

			d.node(joinedId, {
				...nodeProperties,
				height: identity.type === "dna" ? 0 : undefined,
				shape: identity.type === "dna" ? "point" : "ellipse",
				style: identity.type === "dna" ? "invis" : nodeProperties.style,
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

			let _chromosomes: "M" | "W" | undefined;
			if (0 < fatherhoods.length) {
				_chromosomes = "M";
			}

			if (0 < motherhoods.length) {
				_chromosomes = "W";
			}

			const title =
				(egoIdentity.name ?? egoIdentity.id) +
				(bornString !== undefined ? `\n* ${bornString}` : "") +
				(diedString !== undefined ? `\n${diedSymbol} ${diedString}` : "") +
				`\n${ego.distance ?? "?"}`;

			const nodeProperties = computeNodeProperties(
				title,
				new Set([egoIdentity]),
				egoIdentity,
			);

			d.node(egoIdentity.id, nodeProperties);
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
				const timeline = timelines[graph.ids.indexOf(subject.identity)];
				const color = colors.get(timeline?.meta.id)?.pen ?? "#808080FF";
				const style = mustExist(
					options.styleSheet?.get(options.ranks?.get(timeline?.meta.id) ?? -1),
				);

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
						color,
						headport: "e",
						penwidth: style.outline ? style.penwidth : 0.5,
						style:
							style.style?.includes("dashed") || style.link === false
								? "dashed"
								: "solid",
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
						color,
						headport: "e",
						penwidth: style.outline ? style.penwidth : 0.5,
						style:
							style.style?.includes("dashed") || style.link === false
								? "dashed"
								: "solid",
						tailport: "w",
					});

					const timelineMotherOf =
						timelines[graph.ids.indexOf(relation.motherOf)];
					const colorMotherOf =
						colors.get(timelineMotherOf?.meta.id)?.pen ?? "#808080FF";
					const styleMotherOf = mustExist(
						options.styleSheet?.get(
							options.ranks?.get(timelineMotherOf?.meta.id) ?? -1,
						),
					);

					d.link(joinerId, relation.motherOf, {
						color: colorMotherOf,
						headlabel:
							age !== undefined
								? millisecondsAsYears(age).toFixed()
								: undefined,
						headport: "e",
						penwidth: styleMotherOf.outline ? styleMotherOf.penwidth : 0.5,
						style:
							styleMotherOf.style?.includes("dashed") ||
							styleMotherOf.link === false
								? "dashed"
								: "solid",
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
						color,
						headport: "e",
						penwidth: style.outline ? style.penwidth : 0.5,
						style:
							style.style?.includes("dashed") || style.link === false
								? "dashed"
								: "solid",
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
