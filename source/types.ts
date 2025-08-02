export interface TimelineDocument extends Record<string, unknown> {
	timeline: TimelineFlexibleInput;
}

export interface TimelineFlexibleInput
	extends Record<
		string,
		string | number | Array<string | number | TimelineEntry>
	> {}

export interface TimelineEntry {
	title: string;
	notes?: string;
}
export type TimelineRecord = [number, TimelineEntry];
export interface TimelinePlain {
	meta?: unknown;
	records: Array<TimelineRecord>;
}
export interface Timeline extends TimelinePlain {
	meta: {
		id: string;
		private: boolean;
	} & Record<string, unknown>;
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

export interface MetaSectionReferenceRenderer extends Record<string, unknown> {
	color?: string;
	prefix?: string;
	rank?: number;
}
export interface TimelineDocumentReferenceRenderer
	extends TimelineDocument,
		MetaSectionReferenceRenderer {}
export interface TimelineReferenceRenderer extends Timeline {
	meta: MetaSectionReferenceRenderer & { id: string; private: boolean };
	records: Array<TimelineRecord>;
}

export interface RelationMarriage {
	marriedTo: string;
	since?: string;
	as?: string;
}
export interface RelationMother {
	motherOf: string;
}
export interface RelationFather {
	fatherOf: string;
}
export interface Identity {
	id: string;
	born?: string;
	died?: string;
	name?: string;
	relations?: Array<RelationMarriage | RelationFather | RelationMother>;
}
export interface MetaSectionAncestryRenderer extends Record<string, unknown> {
	identity: Identity;
}
export interface TimelineAncestryRenderer extends Timeline {
	meta: MetaSectionAncestryRenderer & { id: string; private: boolean };
	records: Array<TimelineRecord>;
}
