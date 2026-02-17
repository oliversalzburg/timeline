import type { RendererOptions } from "./renderer.js";
export type { RendererOptions };

export interface TimelineDocument {
	timeline: TimelineFlexibleInput;
}
export interface TimelineDocumentInternal extends TimelineDocument {
	id?: string;
}

export interface TimelineFlexibleInput
	extends Record<
		string,
		string | number | TimelineEntry | Array<string | number | TimelineEntry>
	> {}

export interface TimelineEntry {
	title: string;
	notes?: string;
	generated?: boolean;
}
export type TimelineRecord = [number, TimelineEntry];
export interface TimelinePlain {
	meta?: unknown;
	records: Array<TimelineRecord>;
}
export interface Timeline extends TimelinePlain {
	meta: MetaSection;
}

export interface TimelineMetrics {
	durationTotal: number;
	periodLongest: number;
	periodShortest: number;
	timeEarliest: number;
	timeLatest: number;
}
export type RGBTuple = [number, number, number];
export type RGBATuple = [number, number, number, number];
export type RenderMode = "dark" | "light";

export interface MetaSection {
	id: string;
	private: boolean;
}
export interface MetaSectionReferenceRenderer extends MetaSection {
	color?: string;
	prefix?: string;
	rank?: number;
	generated?: boolean;
}
export interface TimelineDocumentReferenceRenderer
	extends TimelineDocument,
		MetaSectionReferenceRenderer {}
export interface TimelineReferenceRenderer extends Timeline {
	meta: MetaSectionReferenceRenderer;
	records: Array<TimelineRecord>;
}

export interface Linked {
	linkedTo: string;
}
export interface Marriage extends Event {
	marriedTo: string;
	as?: string;
}
export interface Father {
	fatherOf: string;
}
export interface Mother {
	motherOf: string;
}
export interface AdoptiveParent extends Event {
	adopted: string;
}

export interface Event {
	date?: string;
	in?: string;
	when?: {
		before?: string;
		after?: string;
		showAs?: string;
	};
	where?: string;
}
export interface Location {
	latlong?: string;
	where?: {
		around?: string;
		within?: string;
		showAs?: string;
	};
}
export type Sexus = "Femininum" | "Maskulinum";
export interface Birth extends Event {
	sexus?: Sexus;
}
export interface Death extends Event {
	inMilitaryService?: boolean | null;
}
export interface Identity {
	id: string;
	urls?: Array<string>;
	established?: Event | null;
	dissolved?: Event | null;
	started?: Event | null;
	ended?: Event | null;
	position?: Location;
	born?: Birth | null;
	died?: Death | null;
	name?: string;
	relations?: Array<Linked | Marriage | Father | Mother | AdoptiveParent>;
}
export interface MetaSectionAncestryRenderer
	extends MetaSectionReferenceRenderer {
	identity: Identity;
}
export interface TimelineAncestryRenderer extends Timeline {
	meta: MetaSectionAncestryRenderer;
	records: Array<TimelineRecord>;
}
export type TimelineMetadata = [
	/** CSS class */
	string,
	/** pencolor */
	string,
	/** fillcolor */
	string,
	/** type */
	number,
	/** identity id or id */
	string,
	/** identity name or id */
	string,
];
export type RenderResultMetadata = [
	/**
	 * Key-value pairs of timeline CSS class to all event IDs on that timeline.
	 */
	Array<[string, Array<string>]>,
	/**
	 * Timeline metadata.
	 */
	Array<TimelineMetadata>,
	/**
	 * Root identity name, ID of event relating to their birth, CSS class of their timeline.
	 */
	[string, string, string],
	/***
	 * Start and end timestamps of all segments in order.
	 */
	Array<[number, number]>,
];
export interface RendererResultMetadata<
	TTimelines extends TimelineReferenceRenderer | TimelineAncestryRenderer =
		| TimelineReferenceRenderer
		| TimelineAncestryRenderer,
> {
	events: Map<number, Set<[string, string]>>;
	timelines: Map<TTimelines, TimelineMetadata>;
	contributors: Map<string, Set<TTimelines>>;
	origin: TimelineMetadata;
	graph: Array<{ graph: string; start: number; end: number }>;
}
export type UniverseResultMetadata = [
	/**
	 * Key-value pairs of all global events IDs, and their title.
	 * And Ordered list of events contributors.
	 */
	Array<[number, string, string, Array<string>]>,
	/**
	 * Ordered list of timeline metadata.
	 */
	Array<TimelineMetadata>,
	/**
	 * Root identity name, ID of event relating to their birth, CSS class of their timeline.
	 */
	[string, string, string],
];
