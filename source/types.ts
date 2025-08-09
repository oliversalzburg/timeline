export interface TimelineDocument {
	timeline: TimelineFlexibleInput;
}
export interface TimelineDocumentInternal extends TimelineDocument {
	id?: string;
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
	};
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

export interface MetaSectionReferenceRenderer {
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

export interface RelationConnection {
	connectedTo: string;
}
export interface RelationFamily {
	relatedTo: string;
}
export interface Marriage extends Event {
	marriedTo: string;
	as?: string;
}
export interface Mother {
	motherOf: string;
}
export interface Father {
	fatherOf: string;
}
export interface Event {
	date?: string;
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
export interface Birth extends Event {}
export interface Death extends Event {
	inMilitaryService?: boolean | null;
}
export interface Identity {
	id: string;
	established?: Event | null;
	dissolved?: Event | null;
	position?: Location;
	born?: Birth | null;
	died?: Death | null;
	name?: string;
	relations?: Array<Marriage | Father | Mother>;
}
export interface MetaSectionAncestryRenderer
	extends MetaSectionReferenceRenderer {
	identity: Identity;
}
export interface TimelineAncestryRenderer extends Timeline {
	meta: MetaSectionAncestryRenderer & { id: string; private: boolean };
	records: Array<TimelineRecord>;
}
