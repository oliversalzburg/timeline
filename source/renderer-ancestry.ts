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
import { matchLuminance, setOpacity } from "./palette.js";
import type { RendererOptions } from "./renderer.js";
import type { Style } from "./styles.js";
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
		graph.trim();
	}

	const colors = mustExist(options.palette?.lookup);
	const defaultBackground =
		options.debug || options.theme === "light" ? "#FFFFFF" : "#000000";
	const defaultForeground =
		options.debug || options.theme === "light" ? "#000000" : "#FFFFFF";

	const d = dot();
	d.raw("digraph ancestry {");
	d.raw(
		`node [fontcolor="${defaultForeground}"; fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`,
	);
	d.raw(
		`edge [color="${defaultForeground}"; fontcolor="${defaultForeground}"; fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`,
	);
	d.raw(`bgcolor="${defaultBackground}"`);
	d.raw('comment=" "');
	d.raw('concentrate="true"');
	d.raw(`fontcolor="${defaultForeground}"`);
	d.raw(`fontname="${FONT_NAME}"`);
	d.raw(`fontsize="${FONT_SIZE}"`);
	d.raw('label=" "');
	d.raw(`rankdir="RL"`);
	d.raw(`ranksep="1"`);
	d.raw(`tooltip=" "`);

	const name = (_?: Identity | null | undefined) => _?.name ?? _?.id ?? _;
	const opacityFromDistance = (distance?: number) =>
		options.debug
			? 255
			: Math.max(
					30,
					distance !== undefined ? Math.max(0, 255 - distance * 30) : 0,
				);

	const computePenWidth = (style: Style, isOrigin = false) => {
		if (options.debug === true) {
			return isOrigin ? 5 : 1;
		}
		return style.outline ? style.penwidth : 0.5;
	};

	const computeNodeProperties = (
		title: string,
		contributors: Set<Identity>,
		leader?: Identity,
		distance = Number.POSITIVE_INFINITY,
	) => {
		const opacity = opacityFromDistance(distance);
		const contributorsTimelines = [...contributors.values()].map(
			(_) => timelines[graph.ids.indexOf(_.id)],
		);
		const leaderTimeline =
			leader !== undefined
				? timelines[graph.ids.indexOf(leader.id)]
				: undefined;

		const color = setOpacity(
			colors.get(leaderTimeline?.meta.id ?? contributorsTimelines[0]?.meta.id)
				?.pen ?? "#808080FF",
			opacity,
		);
		const fillcolors = contributorsTimelines.reduce((fillColors, timeline) => {
			const fill = colors.get(timeline?.meta.id)?.fill ?? TRANSPARENT;

			// Whatever we want to draw, _one_ transparent fill should be enough.
			if (fill === TRANSPARENT && fillColors.includes(TRANSPARENT)) {
				return fillColors;
			}

			fillColors.push(
				setOpacity(
					timeline === leaderTimeline ||
						fill === TRANSPARENT ||
						leaderTimeline === undefined
						? fill
						: matchLuminance(
								fill,
								mustExist(colors.get(mustExist(leaderTimeline).meta.id)).fill,
							),
					opacity,
				),
			);
			return fillColors;
		}, new Array<string>());
		const fontcolor = setOpacity(
			colors.get(leaderTimeline?.meta.id ?? contributorsTimelines[0]?.meta.id)
				?.font ?? defaultForeground,
			opacity,
		);
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
			penwidth: computePenWidth(style, distance === 0),
			shape: "oval",
			style: style.style?.join(","),
		};

		return nodeProperties;
	};

	const computeMarriageProperties = (ego: string, spouse: string) => {
		const egoIsMale =
			graph.identity(ego)?.relations?.some((_) => "fatherOf" in _) === true;
		const egoIsFemale =
			graph.identity(ego)?.relations?.some((_) => "motherOf" in _) === true;
		if (egoIsMale && egoIsFemale) {
			throw new InvalidOperationError(
				`graph marks '${ego}' with conflicting parenthood attributes father+mother`,
			);
		}

		const spouseIsMale =
			graph.identity(spouse)?.relations?.some((_) => "fatherOf" in _) === true;
		const spouseIsFemale =
			graph.identity(spouse)?.relations?.some((_) => "motherOf" in _) === true;
		if (spouseIsMale && spouseIsFemale) {
			throw new InvalidOperationError(
				`graph marks '${spouse}' with conflicting parenthood attributes father+mother`,
			);
		}

		let father: string | undefined;
		let mother: string | undefined;
		if (egoIsMale || spouseIsFemale) {
			father = ego;
			mother = spouse;
		} else if (egoIsFemale || spouseIsMale) {
			father = spouse;
			mother = ego;
		}

		return { father, mother };
	};

	for (const node of graph.nodes) {
		const identity = node;
		if (identity instanceof Joiner) {
			const joiner = identity as Joiner;

			if (joiner.type === "dna") {
				const joins = graph.joins(joiner.who[0], joiner.who[1]);
				if (joins.some((_) => _.type === "marriage")) {
					continue;
				}
			}

			const joinedId = Joiner.makeJoinId(
				joiner.who[0],
				joiner.who[1],
				joiner.date,
			);

			if (graph.node(joinedId) === null) {
				continue;
			}

			if (d.has(joinedId)) {
				throw new InvalidOperationError(
					`unexpected join ID collision on '${joinedId}'`,
				);
			}

			const date = uncertainEventToDate(identity)?.valueOf();
			const dateString =
				date !== undefined && options?.dateRenderer
					? options.dateRenderer(date)
					: date !== undefined
						? new Date(date).toDateString()
						: "";

			const ego = joiner.who[0];
			const spouse = joiner.who[1];
			const marriage =
				identity.type === "marriage"
					? mustExist(
							graph.marriage(ego, spouse)[0],
							`can't find marriage between '${ego}' and '${spouse}'`,
						)
					: undefined;
			const marriageOnSpouse =
				identity.type === "marriage"
					? mustExist(
							graph.marriage(spouse, ego)[0],
							`can't find marriage between '${spouse}' and '${ego}'`,
						)
					: undefined;

			const contributors = joiner.who.map((_) =>
				mustExist(
					graph.identity(graph.rootId(_)),
					`can't look up contributing unknown identity: '${_}'`,
				),
			);
			const contributorNodes = contributors.map((_) => graph.node(_.id));
			const { father } = computeMarriageProperties(ego, spouse);
			const names = contributors.map((_) => name(_) ?? _);

			const nodeProperties = computeNodeProperties(
				`${marriage?.as ?? names[0]}\n⚭${date ? ` ${dateString}` : ""}\n${marriageOnSpouse?.as ?? names[1]}`,
				new Set(contributors),
				father ? (graph.identity(father) ?? undefined) : undefined,
				contributorNodes.reduce(
					(min, current) =>
						Math.min(
							min,
							current instanceof Child
								? (current.distance ?? Number.POSITIVE_INFINITY)
								: Number.POSITIVE_INFINITY,
						),
					Number.POSITIVE_INFINITY,
				),
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
			const didDie = egoIdentity.died !== undefined;
			const diedString =
				egoIdentity.died === null
					? ""
					: egoIdentity === undefined
						? undefined
						: uncertainEventToDateString(
								egoIdentity.died,
								options.dateRenderer,
							);
			const diedSymbol =
				egoIdentity.died?.inMilitaryService === true ||
				egoIdentity.died?.inMilitaryService === null
					? "⚔︎"
					: "✝︎";

			const title =
				(egoIdentity.name ?? egoIdentity.id) +
				(options.debug ? ` (${ego.distance?.toFixed() ?? "∞"})` : "") +
				(bornString !== "" ? `\n* ${bornString}` : "") +
				(didDie
					? diedString !== ""
						? `\n${diedSymbol} ${diedString}`
						: `\n${diedSymbol}`
					: "");

			const nodeProperties = computeNodeProperties(
				title,
				new Set([egoIdentity]),
				egoIdentity,
				ego.distance,
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
				const node = graph.node(subject.identity);
				const opacity = opacityFromDistance(
					node instanceof Child ? node.distance : undefined,
				);
				const color = setOpacity(
					colors.get(timeline?.meta.id)?.pen ?? "#808080FF",
					opacity,
				);
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

					const dnaRoot = uncertainEventToDate(
						graph.marriageInDnaScope(childIdentity.id),
					);

					const joinerId = Joiner.makeJoinId(
						father,
						mother,
						dnaRoot?.toISOString(),
					);
					d.link(subject.identity, joinerId, {
						arrowhead: "none",
						color,
						headport: "e",
						penwidth: computePenWidth(style),
						style:
							style.style?.includes("dashed") || style.link === false
								? "dashed"
								: "solid",
						tailport: "w",
					});
					// We only link the mother
					//d.link(joinerId, relation.fatherOf, { headport: "e", tailport: "w" });
				} else if ("motherOf" in relation) {
					const subjectIdentity = mustExist(graph.identity(subject.identity));
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

					const dnaRoot = uncertainEventToDate(
						graph.marriageInDnaScope(childIdentity.id),
					);

					const joinerId = Joiner.makeJoinId(
						father,
						mother,
						dnaRoot?.toISOString(),
					);
					const subjectBorn = uncertainEventToDate(subjectIdentity.born);
					const childBorn = uncertainEventToDate(childIdentity.born);
					const age =
						options.debug &&
						subjectBorn !== undefined &&
						childBorn !== undefined
							? childBorn.valueOf() - subjectBorn.valueOf()
							: undefined;

					d.link(subject.identity, joinerId, {
						arrowhead: "none",
						color,
						headport: "e",
						penwidth: computePenWidth(style),
						style:
							style.style?.includes("dashed") || style.link === false
								? "dashed"
								: "solid",
						tailport: "w",
					});

					const timelineMotherOf =
						timelines[graph.ids.indexOf(relation.motherOf)];
					const nodeMotherOf = graph.node(relation.motherOf) as Child;
					const colorMotherOf = setOpacity(
						colors.get(timelineMotherOf?.meta.id)?.pen ?? "#808080FF",
						opacityFromDistance(nodeMotherOf.distance),
					);
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
						penwidth: computePenWidth(styleMotherOf),
						style:
							styleMotherOf.style?.includes("dashed") ||
							styleMotherOf.link === false
								? "dashed"
								: "solid",
						tailport: "w",
					});
				} else if ("marriedTo" in relation) {
					const marriage = relation as Marriage;
					const subjectIdentity = mustExist(graph.identity(subject.identity));
					const subjectBorn = uncertainEventToDate(subjectIdentity.born);
					const date = uncertainEventToDate(relation);
					const age =
						options.debug && subjectBorn !== undefined && date !== undefined
							? date.valueOf() - subjectBorn.valueOf()
							: undefined;

					const ego = subject.identity;
					const marriedTo = marriage.marriedTo;

					const joinerId = Joiner.makeJoinId(
						ego,
						marriedTo,
						date?.toISOString(),
					);

					if (graph.node(joinerId) === undefined) {
						continue;
					}

					const _children =
						date !== undefined
							? 0 < graph.childrenDuring(ego, date).length
							: false;

					d.link(ego, joinerId, {
						arrowhead: "none",
						color,
						headport: "e",
						penwidth: computePenWidth(style),
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
