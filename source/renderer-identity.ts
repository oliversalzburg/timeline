import {
	isNil,
	type Maybe,
	mustExist,
} from "@oliversalzburg/js-utils/data/nil.js";
import {
	FONT_NAME,
	FONT_SIZE,
	TRANSPARENT,
	UNICODE_DIED,
	UNICODE_MARRIED,
	UNICODE_SEX_FEMALE,
	UNICODE_SEX_MALE,
	UNICODE_SEX_UNKNOWN,
} from "./constants.js";
import {
	dot,
	type EdgeStyle,
	makeHtmlString,
	type NodeProperties,
	type PortPos,
	type RankDir,
} from "./dot.js";
import {
	Graph,
	uncertainEventToDate,
	uncertainEventToDateString,
} from "./genealogy.js";
import { matchLuminance, setOpacity } from "./palette.js";
import type { RendererOptions } from "./renderer.js";
import { StyleStatic } from "./style.js";
import type { Style } from "./styles.js";
import type { Identity, Sexus, TimelineAncestryRenderer } from "./types.js";

export const renderSimple = (
	timelines: Array<TimelineAncestryRenderer>,
	options: RendererOptions,
) => {
	const depth = 4;

	const graph = new Graph(timelines, options.origin);
	const hops =
		options.origin !== undefined
			? graph.calculateHopsFrom(options.origin, {
					allowChildHop: true,
					allowMarriageHop: false,
					allowParentHop: true,
				})
			: new Map<string, number>();
	const originIdentity = mustExist(graph.resolveIdentity(options.origin));
	const originAntecedents =
		originIdentity !== undefined
			? graph.antecedents(originIdentity.id)
			: undefined;
	const originDescendants =
		originIdentity !== undefined
			? graph.descendants(originIdentity.id)
			: undefined;
	const originBloodline =
		originIdentity !== undefined
			? graph.bloodline(originIdentity.id)
			: undefined;

	const defaultBackground = options.theme === "light" ? "#FFFFFF" : "#000000";
	const defaultForeground = options.theme === "light" ? "#000000" : "#FFFFFF";
	const fontNode =
		options.rendererAnonymization === "enabled" ? "DummyText2" : "DejaVu Serif";

	const rankdir: RankDir = "RL";

	const d = dot();
	d.raw("digraph ancestry {");
	d.raw(
		`node [fontcolor="${defaultForeground}"; fontname="${fontNode}"; fontsize="${FONT_SIZE}";]`,
	);
	d.raw(`edge [color="${defaultForeground}";]`);
	d.raw(`bgcolor="${defaultBackground}"`);
	//d.raw('center="true"');
	d.raw('comment=" "');
	//d.raw('concentrate="true"');
	/*
	d.raw(`fontcolor="${defaultForeground}"`);
	d.raw(`fontname="Blackside Personal Use Only"`);
	d.raw(`fontsize="${FONT_SIZE * 10}"`);
	if (originIdentity !== undefined && options.dateRenderer !== undefined) {
		d.raw(`label="${originIdentity.name ?? originIdentity.id}"`);
	}
	d.raw(`labeljust="l"`);
	d.raw(`labelloc="b"`);
	*/
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

	for (const identity of graph.identities) {
		const distance = hops.get(identity.id);
		if (
			distance === undefined ||
			!Number.isFinite(distance) ||
			depth < distance
		) {
			continue;
		}
		const opacity = opacityFromDistance(distance);
		const color = setOpacity(defaultForeground, opacity);
		d.node(identity.id, {
			fontcolor:
				identity === originIdentity || originAntecedents?.includes(identity)
					? defaultForeground
					: color,
			fontname: identity === originIdentity ? `${fontNode} bold` : undefined,
			fontsize: identity === originIdentity ? FONT_SIZE + 4 : undefined,
			label: `${name(identity)}`,
			penwidth: identity.id === originIdentity.id ? 1 : 0,
			shape: identity.id === originIdentity.id ? "oval" : "box",
		});
	}
	for (const identity of graph.identities) {
		const distance = hops.get(identity.id);
		if (
			distance === undefined ||
			!Number.isFinite(distance) ||
			depth < distance
		) {
			continue;
		}

		for (const child of graph.childrenOf(identity.id) ?? []) {
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
			});
		}
	}

	d.raw("}");
	return d.toString();
};

export const renderUniverse = (
	timelines: Array<TimelineAncestryRenderer>,
	options: RendererOptions,
) => {
	const depth = 100;

	const graph = new Graph(timelines, options.origin);
	const hops =
		options.origin !== undefined
			? graph.calculateHopsFrom(options.origin, {
					allowChildHop: true,
					allowMarriageHop: false,
					allowParentHop: true,
				})
			: new Map<string, number>();
	const originIdentity = options.origin
		? graph.resolveIdentity(options.origin)
		: undefined;
	const originAntecedents =
		originIdentity !== undefined
			? graph.antecedents(originIdentity.id)
			: undefined;
	const originDescendants =
		originIdentity !== undefined
			? graph.descendants(originIdentity.id)
			: undefined;
	const originBloodline =
		originIdentity !== undefined
			? graph.bloodline(originIdentity.id)
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
	const fontNode = "DummyText2"; //"DejaVu Serif";
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
			graph.timelineOf(_.id),
		);

		const leaderTimeline =
			leader !== undefined ? graph.timelineOf(leader.id) : undefined;

		const color = setOpacity(
			(leaderTimeline !== undefined
				? getStyle(leaderTimeline)
				: contributorsTimelines[0] !== undefined
					? getStyle(contributorsTimelines[0])
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
	for (const identity of graph.identities) {
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
	for (const identity of graph.identities) {
		const distance = hops.get(identity.id);
		if (
			distance === undefined ||
			!Number.isFinite(distance) ||
			depth < distance
		) {
			continue;
		}

		for (const child of graph.childrenOf(identity.id) ?? []) {
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

export const renderReport = (
	timelines: Array<TimelineAncestryRenderer>,
	options: RendererOptions & { pedigreeChartPath?: string },
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

	const sortIdentitiesByBirthdate = (identities: Array<Identity>) =>
		identities.toSorted(
			(a, b) =>
				(uncertainEventToDate(a.born)?.valueOf() ?? Number.NEGATIVE_INFINITY) -
				(uncertainEventToDate(b.born)?.valueOf() ?? Number.NEGATIVE_INFINITY),
		);

	const originIdentity = mustExist(graph.resolveIdentity(options.origin));
	const originAntecedents = sortIdentitiesByBirthdate(
		graph.antecedents(originIdentity.id) ?? [],
	);
	const originDescendants = sortIdentitiesByBirthdate(
		graph.descendants(originIdentity.id) ?? [],
	);
	const originBloodline = sortIdentitiesByBirthdate(
		graph.bloodline(originIdentity.id) ?? [],
	);

	const documents = new Array<{ filename: string; content: string }>();
	const buffer = new Array<string>();
	const renderMaybe = (maybe: Maybe<string>, label?: string) =>
		isNil(maybe) || maybe === ""
			? `[${label !== undefined ? `${label} ` : ""}fehlt]{.mark}`
			: maybe.replaceAll(/Unbekannt/g, "[Unbekannt]{.mark}");

	/**
	 * This is WRONG. The sexus is not the sex of the person.
	 * Using sex symbols for the sexus is entirely invalid, and only temporary.
	 */
	const renderSexus = (sexus: Maybe<Sexus>) =>
		sexus === "Femininum"
			? UNICODE_SEX_FEMALE
			: sexus === "Maskulinum"
				? UNICODE_SEX_MALE
				: UNICODE_SEX_UNKNOWN;

	const renderBirthnamePrefixMaybe = (_: Identity) => {
		const name = graph.resolveIdentityNameAtDate(_.id);
		if (name === (_.name ?? _.id)) {
			return "";
		}
		return `_${_.name ?? _.id}_ `;
	};

	const title = "Mein Stammbaum";
	const dateString =
		options.dateRenderer !== undefined
			? options.dateRenderer(options.now)
			: new Date(options.now).toLocaleDateString();

	const renderIdentity = (subject: Identity, output = buffer) => {
		output.push(`### ${graph.resolveIdentityNameAtDate(subject.id)}`);
		const sexus =
			!isNil(subject.born) && "sexus" in subject.born
				? renderSexus(subject.born.sexus)
				: undefined;
		const sexusString = sexus !== undefined ? `${sexus} ` : "";
		const sexusAnalytics = renderMaybe(sexus, "Sexus");

		let hasBirth = false;
		let hasMarriage = false;
		let hasDeath = false;

		const nameBirth = renderBirthnamePrefixMaybe(subject);
		const _dateBirth = uncertainEventToDate(subject.born);
		const dateBirthString = uncertainEventToDateString(
			subject.born,
			options.dateRenderer,
		);
		const dateBirthAnalytics = renderMaybe(dateBirthString, "Datum");
		const locationBirth = subject.born?.where;
		const locationBirthString =
			locationBirth !== undefined ? ` in ${locationBirth}` : undefined;
		const locationBirthAnalytics = renderMaybe(locationBirth, "Ort");

		if (options.rendererAnalytics === "enabled") {
			output.push(
				`${sexusAnalytics} geboren ${nameBirth}${dateBirthAnalytics} in ${locationBirthAnalytics}  `,
			);
			hasBirth = true;
		} else {
			if (
				nameBirth !== "" ||
				dateBirthString !== undefined ||
				locationBirthString !== undefined
			) {
				output.push(
					`${sexusString}geboren ${nameBirth}${dateBirthString ?? ""}${locationBirthString ?? ""}  `,
				);
				hasBirth = true;
			}
		}

		const marriages = graph.marriagesOf(subject.id);
		for (const marriage of marriages) {
			const dateMarriage = uncertainEventToDate(marriage);
			const dateMarriageString = uncertainEventToDateString(
				marriage,
				options.dateRenderer,
			)?.concat(" ");
			const dateMarriageAnalytics = renderMaybe(dateMarriageString, "Datum");
			const spouse = graph.resolveIdentityNameAtDate(
				marriage.marriedTo,
				dateMarriage,
			);
			const locationMarriage = marriage.where;
			const locationMarriageString =
				locationMarriage !== undefined ? ` in ${locationMarriage}` : undefined;
			const locationMarriageAnalytics = renderMaybe(marriage.where, "Ort");
			if (options.rendererAnalytics === "enabled") {
				output.push(
					`${UNICODE_MARRIED} ${dateMarriageAnalytics} mit ${spouse} in ${locationMarriageAnalytics}  `,
				);
				hasMarriage = true;
			} else {
				output.push(
					`${UNICODE_MARRIED} ${dateMarriageString ?? ""}mit ${spouse}${locationMarriageString ?? ""}  `,
				);
				hasMarriage = true;
			}
		}

		if (subject.died !== undefined) {
			const _dateDied = uncertainEventToDate(subject.died);
			const dateDiedString = uncertainEventToDateString(
				subject.died,
				options.dateRenderer,
			);
			const dateDiedAnalytics = renderMaybe(dateDiedString, "Datum");
			const locationDied = subject.died?.where;
			const locationDiedString =
				locationDied !== undefined ? ` in ${locationDied}` : undefined;
			const locationDiedAnalytics = renderMaybe(locationDied, "Ort");

			if (options.rendererAnalytics === "enabled") {
				output.push(
					`${UNICODE_DIED} ${dateDiedAnalytics} in ${locationDiedAnalytics}  `,
				);
				hasDeath = true;
			} else {
				output.push(
					`${UNICODE_DIED} ${dateDiedString ?? ""}${locationDiedString ?? ""}  `,
				);
				hasDeath = true;
			}
		}

		if (!hasBirth && !hasMarriage && !hasDeath) {
			output.push("lebt  ");
		}
		output.push("");
	};

	const bufferEgo = new Array<string>();
	renderIdentity(originIdentity, bufferEgo);

	buffer.push("---");
	buffer.push(`title: ${title}`);
	buffer.push(`author: |-`);
	//buffer.push(`  ${name}\n`);
	buffer.push(...bufferEgo.map((_) => `  ${_}\n`));
	//buffer.push(`email: oliver.salzburg@gmail.com`);
	buffer.push(`date: |-`);
	buffer.push(`  Stand: ${dateString} ^i${graph.identities.length}^\n`);
	buffer.push(`  ${originBloodline.length} Verwandte bekannt`);
	buffer.push(`copyright: © 2025 Oliver Salzburg. Alle Rechte vorbehalten.`);
	buffer.push(`rights: © 2025 Oliver Salzburg. Alle Rechte vorbehalten.`);
	buffer.push(`mainfont: DejaVu Sans`);
	buffer.push(`geometry: [ a4paper, margin=20mm ]`);
	buffer.push(`output:`);
	buffer.push(`  pdf_document:`);
	buffer.push(`    md_extensions: +inline_code_attributes`);
	//buffer.push(`numbersections: false`);
	//buffer.push(`block-headings: true`);
	//buffer.push(`header-includes:`);
	//buffer.push(`- \\pagenumbering{gobble}`);
	buffer.push("...");

	//buffer.push(`# ${title}\n`);

	if (options.pedigreeChartPath !== undefined) {
		buffer.push(`![](${options.pedigreeChartPath})\n`);
	}

	if (0 < originDescendants.length) {
		let consumed = 0;

		buffer.push(`\\newpage`);
		buffer.push(`# Meine Kinder`);
		for (const descendant of originDescendants) {
			if (hops.get(descendant.id) !== 1) {
				continue;
			}

			renderIdentity(descendant);
			++consumed;
		}

		if (consumed < originDescendants.length) {
			buffer.push(`# Meine Enkel`);
			for (const descendant of originDescendants) {
				if (hops.get(descendant.id) !== 2) {
					continue;
				}

				renderIdentity(descendant);
				++consumed;
			}
		}

		if (consumed < originDescendants.length) {
			buffer.push(`# Meine Urenkel`);
			for (const descendant of originDescendants) {
				if (hops.get(descendant.id) !== 3) {
					continue;
				}

				renderIdentity(descendant);
				++consumed;
			}
		}

		if (consumed < originDescendants.length) {
			buffer.push(`# Meine Ururenkel`);
			for (const descendant of originDescendants) {
				if (hops.get(descendant.id) !== 4) {
					continue;
				}

				renderIdentity(descendant);
				++consumed;
			}
		}
	}

	const generationToCommonName = (generation: number) => {
		switch (generation) {
			case 0:
				return "Mein Ego";
			case 1:
				return "Meine Eltern";
			case 2:
				return "Meine Großeltern";
			case 3:
				return "Meine Urgroßeltern";
			case 4:
				return "Meine Ururgroßeltern (Alteltern)";
			case 5:
				return "Meine Urururgroßeltern (Altgroßeltern)";
			case 6:
				return `Meine Ur(×${generation - 2})großeltern (Alturgroßeltern)`;
			case 7:
				return `Meine Ur(×${generation - 2})großeltern (Obereltern)`;
			case 8:
				return `Meine Ur(×${generation - 2})großeltern (Obergroßeltern)`;
			case 9:
				return `Meine Ur(×${generation - 2})großeltern (Oberurgroßeltern)`;
			default:
				return `Meine Ur(×${generation - 2})großeltern`;
		}
	};

	if (0 < originAntecedents.length) {
		buffer.push(`\\newpage`);
		buffer.push(`# Meine Vorfahren`);

		let consumed = 0;
		let generation = 1;

		while (consumed < originAntecedents.length) {
			buffer.push(`## ${generationToCommonName(generation)}`);
			for (const antecedent of originAntecedents) {
				if (hops.get(antecedent.id) !== generation) {
					continue;
				}

				renderIdentity(antecedent);
				++consumed;
			}
			++generation;
		}
	}

	if (0 < originBloodline.length) {
		buffer.push(`\\newpage`);
		buffer.push(`# Weitere Nachkommen meiner Vorfahren`);

		const memberByHops = new Map(
			originBloodline
				.filter(
					(_) =>
						!originDescendants.includes(_) &&
						!originAntecedents.includes(_) &&
						originIdentity !== _,
				)
				.sort((a, b) => mustExist(hops.get(a.id)) - mustExist(hops.get(b.id)))
				.reduce((cache, identitiy) => {
					const jump = mustExist(hops.get(identitiy.id));
					if (!cache.has(jump)) {
						cache.set(jump, []);
					}
					mustExist(cache.get(jump)).push(identitiy);
					return cache;
				}, new Map<number, Array<Identity>>()),
		);

		for (const [degree, members] of memberByHops.entries()) {
			if (0 === members.length || !Number.isFinite(degree)) {
				continue;
			}

			buffer.push(`## ${degree}. Grad`);
			for (const member of members) {
				renderIdentity(member);
			}
		}
	}

	documents.push({
		filename: "index.md",
		content: `${buffer.join("\n")}\n`,
	});

	return documents;
};
