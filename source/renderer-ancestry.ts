import {
	isNil,
	type Maybe,
	mustExist,
} from "@oliversalzburg/js-utils/data/nil.js";
import { FONT_NAME, FONT_SIZE, TRANSPARENT } from "./constants.js";
import {
	dot,
	type EdgeStyle,
	makeHtmlString,
	type NodeProperties,
	type PortPos,
	type RankDir,
} from "./dot.js";
import { uncertainEventToDateString } from "./genealogy.js";
import { Graph } from "./genealogy2.js";
import { matchLuminance, setOpacity } from "./palette.js";
import type { RendererOptions } from "./renderer.js";
import { StyleStatic } from "./style.js";
import type { Style } from "./styles.js";
import type { Identity, TimelineAncestryRenderer } from "./types.js";

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
	options: RendererOptions,
) => {
	const depth = 7;

	const graph2 = new Graph(timelines, options.origin);
	const hops =
		options.origin !== undefined
			? graph2.calculateHopsFrom(options.origin, {
					allowChildHop: true,
					allowMarriageHop: false,
					allowParentHop: true,
				})
			: new Map<string, number>();
	const originIdentity = options.origin
		? graph2.resolveRootIdentity(options.origin)
		: undefined;
	const originAntecedents =
		originIdentity !== undefined
			? graph2.antecedents(originIdentity.id)
			: undefined;
	const originDescendants =
		originIdentity !== undefined
			? graph2.descendants(originIdentity.id)
			: undefined;
	const originBloodline =
		originIdentity !== undefined
			? graph2.bloodline(originIdentity.id)
			: undefined;

	const defaultBackground =
		options.debug || options.theme === "light" ? "#FFFFFF" : "#000000";
	const defaultForeground =
		options.debug || options.theme === "light" ? "#000000" : "#FFFFFF";
	const _fonts = [
		// Serif
		"DejaVu Serif",
		// Florar
		"Mollani",
		// Fraktur
		"Morsten",
		// Elegant
		"Switzerland",
		"Billa Mount",
	];
	const fontNode = "DejaVu Serif";
	const rankdir: RankDir = "RL";

	const d = dot();
	d.raw("digraph ancestry {");
	d.raw(
		`node [fontcolor="${defaultForeground}"; fontname="${fontNode}"; fontsize="${FONT_SIZE}";]`,
	);
	d.raw(
		`edge [color="${defaultForeground}"; fontcolor="${defaultForeground}"; fontname="${FONT_NAME}"; fontsize="${FONT_SIZE}";]`,
	);
	d.raw(`bgcolor="${defaultBackground}"`);
	d.raw('center="true"');
	d.raw('comment=" "');
	//d.raw('concentrate="true"');
	d.raw(`fontcolor="${defaultForeground}"`);
	d.raw(`fontname="Blackside Personal Use Only"`);
	d.raw(`fontsize="${FONT_SIZE * 10}"`);
	if (originIdentity !== undefined && options.dateRenderer !== undefined) {
		d.raw(`label="${originIdentity.name ?? originIdentity.id}"`);
	}
	d.raw(`labeljust="l"`);
	d.raw(`labelloc="b"`);
	d.raw(`margin="0"`);
	d.raw(`pad="0"`);
	d.raw(`rankdir="${rankdir}"`);
	d.raw(`ranksep="3"`);
	d.raw(`tooltip=" "`);

	const name = (_?: Identity | null | undefined) => _?.name ?? _?.id ?? _;
	const opacityFromDistance = (distance?: number) =>
		options.debug
			? 255
			: Math.max(
					30,
					distance !== undefined ? Math.max(0, 255 - distance * 30) : 0,
				);

	const _computePenWidth = (style: Style, isOrigin = false) => {
		if (options.debug === true) {
			return isOrigin ? 5 : 1;
		}
		const p = style.penwidth / 3;
		return style.outline ? p * p : 0.5;
	};

	const getStyle = (_?: TimelineAncestryRenderer) => {
		if (options.styleSheet === undefined || _ === undefined) {
			return StyleStatic;
		}
		return mustExist(options.styleSheet.get(_.meta.id));
	};

	const _computeNodeProperties = (
		title: string,
		contributors: Set<Identity>,
		leader?: Identity,
		distance = Number.POSITIVE_INFINITY,
	) => {
		const opacity = opacityFromDistance(distance);
		const contributorsTimelines = [...contributors.values()].map((_) =>
			graph2.timelineOf(_.id),
		);

		const leaderTimeline =
			leader !== undefined ? graph2.timelineOf(leader.id) : undefined;

		const color = setOpacity(
			(leaderTimeline !== undefined || contributorsTimelines[0] !== undefined
				? getStyle(leaderTimeline)
				: undefined
			)?.pencolor ?? "#808080FF",
			opacity,
		);

		const fillcolors = contributorsTimelines.reduce((fillColors, timeline) => {
			const fill =
				(timeline !== undefined ? getStyle(timeline)?.fillcolor : undefined) ??
				TRANSPARENT;

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
						: matchLuminance(fill, getStyle(leaderTimeline).fillcolor),
					opacity,
				),
			);
			return fillColors;
		}, new Array<string>());

		const fontcolor = setOpacity(
			(leaderTimeline !== undefined || contributorsTimelines[0] !== undefined
				? getStyle(leaderTimeline)
				: undefined
			)?.fontcolor ?? defaultForeground,
			opacity,
		);

		const prefixes = contributorsTimelines
			.values()
			.reduce((_, timeline) => _ + (timeline?.meta.prefix ?? ""), "");

		const label = `${0 < prefixes.length ? `${prefixes}\u00A0` : ""}${makeHtmlString(
			`${title}`,
		)}`;

		const style = getStyle(leaderTimeline);

		const nodeProperties: Partial<NodeProperties> = {
			color,
			fillcolor:
				fillcolors.length === 1
					? fillcolors[0]
					: `${fillcolors[0]}:${fillcolors[1]}`,
			fixedsize: true,
			fontcolor,
			height: 0.75,
			label,
			penwidth: style.penwidth,
			shape: "box", //"oval",
			style: style.style?.join(","),
			width: 3.5,
		};

		return nodeProperties;
	};

	const pointTowards = (
		unfixed = false,
	): { headport?: PortPos; tailport?: PortPos } => {
		switch (rankdir as RankDir) {
			case "LR":
				return {
					headport: unfixed ? undefined : "w",
					tailport: unfixed ? undefined : "e",
				};
			case "RL":
				return {
					headport: unfixed ? undefined : "e",
					tailport: unfixed ? undefined : "w",
				};
			case "TB":
				return {
					headport: unfixed ? undefined : "n",
					tailport: unfixed ? undefined : "s",
				};
			case "BT":
				return {
					headport: unfixed ? undefined : "s",
					tailport: unfixed ? undefined : "n",
				};
		}
	};
	/*
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
*/
	for (const identity of graph2.identities) {
		const distance = hops.get(identity.id);
		//console.log(originDescendants?.includes(identity), distance);
		if (
			distance === undefined ||
			!Number.isFinite(distance) ||
			depth < distance
		) {
			continue;
		}
		const opacity = opacityFromDistance(distance);
		const color = setOpacity(defaultForeground, opacity);
		d.node(
			identity.id,
			{
				fontcolor:
					identity === originIdentity || originAntecedents?.includes(identity)
						? defaultForeground
						: color,
				fontname: identity === originIdentity ? `${fontNode} bold` : undefined,
				fontsize: identity === originIdentity ? FONT_SIZE + 4 : undefined,
				//label: `${name(identity)} (${distance})`,
				label: `${name(identity)}`,
				penwidth: 0,
			},
			/*computeNodeProperties(identity.id, new Set([identity])),*/
		);
	}
	for (const identity of graph2.identities) {
		const distance = hops.get(identity.id);
		if (
			distance === undefined ||
			!Number.isFinite(distance) ||
			depth < distance
		) {
			continue;
		}

		for (const child of graph2.childrenOf(identity.id) ?? []) {
			const childDistance = hops.get(child.id);
			if (
				childDistance === undefined ||
				!Number.isFinite(childDistance) ||
				depth < childDistance
			) {
				continue;
			}

			const opacity = opacityFromDistance(childDistance);
			const color = setOpacity(defaultForeground, opacity);

			let linkStyle: EdgeStyle | undefined = originDescendants?.includes(child)
				? "solid"
				: undefined;
			linkStyle ??=
				child === originIdentity || originAntecedents?.includes(child)
					? "bold"
					: undefined;
			linkStyle ??= originBloodline?.includes(child) ? "dashed" : undefined;
			linkStyle ??= "dotted";

			d.link(identity.id, child.id, {
				...pointTowards(),
				color,
				style: linkStyle,
				weight: childDistance < 10 ? 1000 : 1,
			});
		}
	}
	/*
	for (const node of graph.nodes) {
		const identity = node;
		if (identity instanceof Joiner) {
			const joiner = identity as Joiner;

			// Skip creating DNA joiner nodes, if the same people are also married.
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
				fontsize: identity.type === "dna" ? 0 : FONT_SIZE,
				height: identity.type === "dna" ? 0 : 1,
				label: identity.type === "dna" ? undefined : nodeProperties.label,
				margin: identity.type === "dna" ? 0 : undefined,
				penwidth: identity.type === "dna" ? 0 : nodeProperties.penwidth,
				shape: identity.type === "dna" ? "point" : "oval",
				style: identity.type === "dna" ? undefined : nodeProperties.style,
				width: identity.type === "dna" ? 0 : 4,
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

					if (0 < graph.marriage(father, mother).length) {
						continue;
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
						...pointTowards(),
						arrowhead: "none",
						color,
						penwidth: computePenWidth(style),
						style:
							style.style?.includes("dashed") || style.link === false
								? "dashed"
								: "solid",
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
						...pointTowards(),
						color: colorMotherOf,
						headlabel:
							age !== undefined
								? millisecondsAsYears(age).toFixed()
								: undefined,
						penwidth: computePenWidth(styleMotherOf),
						style:
							styleMotherOf.style?.includes("dashed") ||
							styleMotherOf.link === false
								? "dashed"
								: "solid",
					});

					if (0 < graph.marriage(father, mother).length) {
						continue;
					}

					d.link(subject.identity, joinerId, {
						...pointTowards(),
						arrowhead: "none",
						color,
						penwidth: computePenWidth(style),
						style:
							style.style?.includes("dashed") || style.link === false
								? "dashed"
								: "solid",
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

					d.link(ego, joinerId, {
						...pointTowards(),
						arrowhead: "none",
						color,
						penwidth: computePenWidth(style),
						style:
							style.style?.includes("dashed") || style.link === false
								? "dashed"
								: "solid",
						taillabel:
							age !== undefined
								? millisecondsAsYears(age).toFixed()
								: undefined,
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
*/
	d.raw("}");
	return d.toString();
};

export const renderMarkdown = (
	timelines: Array<TimelineAncestryRenderer>,
	options: RendererOptions,
) => {
	const graph = new Graph(timelines, options.origin);
	const hops =
		options.origin !== undefined
			? graph.calculateHopsFrom(options.origin, {
					allowChildHop: true,
					allowMarriageHop: false,
					allowParentHop: true,
				})
			: new Map<string, number>();
	const originIdentity = mustExist(graph.resolveRootIdentity(options.origin));
	const originAntecedents = graph.antecedents(originIdentity.id) ?? [];
	const originDescendants = graph.descendants(originIdentity.id) ?? [];

	const documents = new Array<{ filename: string; content: string }>();
	const buffer = new Array<string>();
	const renderMaybe = (maybe: Maybe<string>) =>
		isNil(maybe) || maybe === ""
			? "`(INFORMATION FEHLT)`"
			: maybe.replaceAll(/Unbekannt/g, "`UNBEKANNT`");

	const title = `Stammbaum von ${graph.resolveIdentityNameAtDate(originIdentity.id)}`;

	buffer.push("---");
	//buffer.push(`title: ${title}`);
	//buffer.push(`author: Oliver Salzburg`);
	buffer.push(`email: oliver.salzburg@gmail.com`);
	//buffer.push(`date: ${new Date().toISOString()}`);
	buffer.push(`copyright: © 2025 Oliver Salzburg. Alle Rechte vorbehalten.`);
	buffer.push(`rights: © 2025 Oliver Salzburg. Alle Rechte vorbehalten.`);
	buffer.push(`mainfont: Open Sans`);
	buffer.push(`geometry: a4paper`);
	buffer.push(`numbersections: false`);
	buffer.push(`block-headings: true`);
	buffer.push(`header-includes:`);
	buffer.push(`- \\pagenumbering{gobble}`);
	buffer.push("...");

	buffer.push(`# ${title}\n`);
	buffer.push(
		`geboren ${renderMaybe(originIdentity.name ?? originIdentity.id)} am ${renderMaybe(uncertainEventToDateString(originIdentity.born, options.dateRenderer))} in ${renderMaybe(originIdentity.born?.where)}.`,
	);
	buffer.push(`\n![](ancestry.gv.png)`);

	if (0 < originDescendants.length) {
		let consumed = 0;

		buffer.push(`\n## Meine Kinder\n`);
		for (const descendant of originDescendants) {
			if (hops.get(descendant.id) !== 1) {
				continue;
			}

			buffer.push(`1. **${graph.resolveIdentityNameAtDate(descendant.id)}**  `);
			buffer.push(
				`   geboren ${renderMaybe(descendant.name ?? descendant.id)} am ${renderMaybe(uncertainEventToDateString(descendant.born, options.dateRenderer))} in ${renderMaybe(descendant.born?.where)}.\n`,
			);
			++consumed;
		}

		if (consumed < originDescendants.length) {
			buffer.push(`\n## Meine Enkel\n`);
			for (const descendant of originDescendants) {
				if (hops.get(descendant.id) !== 2) {
					continue;
				}

				buffer.push(
					`1. **${graph.resolveIdentityNameAtDate(descendant.id)}**  `,
				);
				buffer.push(
					`   geboren ${renderMaybe(descendant.name ?? descendant.id)} am ${renderMaybe(uncertainEventToDateString(descendant.born, options.dateRenderer))} in ${renderMaybe(descendant.born?.where)}.\n`,
				);
				++consumed;
			}
		}

		if (consumed < originDescendants.length) {
			buffer.push(`\n## Meine Urenkel\n`);
			for (const descendant of originDescendants) {
				if (hops.get(descendant.id) !== 3) {
					continue;
				}

				buffer.push(
					`1. **${graph.resolveIdentityNameAtDate(descendant.id)}**  `,
				);
				buffer.push(
					`   geboren ${renderMaybe(descendant.name ?? descendant.id)} am ${renderMaybe(uncertainEventToDateString(descendant.born, options.dateRenderer))} in ${renderMaybe(descendant.born?.where)}.\n`,
				);
				++consumed;
			}
		}
	}

	if (0 < originAntecedents.length) {
		buffer.push(`\n## Meine Vorfahren\n`);

		let consumed = 0;
		let generation = 1;

		while (consumed < originAntecedents.length) {
			buffer.push(`\n### ${generation}. Generation\n`);
			for (const antecedent of originAntecedents) {
				if (hops.get(antecedent.id) !== generation) {
					continue;
				}

				buffer.push(
					`1. **${graph.resolveIdentityNameAtDate(antecedent.id)}**  `,
				);
				buffer.push(
					`   geboren ${renderMaybe(antecedent.name ?? antecedent.id)} am ${renderMaybe(uncertainEventToDateString(antecedent.born, options.dateRenderer))} in ${renderMaybe(antecedent.born?.where)}.\n`,
				);
				++consumed;
			}
			++generation;
		}
	}

	documents.push({
		filename: "index.md",
		content: `${buffer.join("\n")}\n`,
	});

	return documents;
};
