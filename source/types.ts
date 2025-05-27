export interface TimelineDocument {
  timeline: TimelineSimple | TimelineExtended;
}
export interface TimelineSimple extends Record<string | number, string> {}
export interface TimelineExtended extends Record<string | number, TimelineEntry> {}
export interface TimelineEntry {
  title: string;
}
export type TimelineRecord = [number, TimelineEntry];
export type Timeline = Array<TimelineRecord>;
export interface TimelineMetrics {
  durationTotal: number;
  periodLongest: number;
  periodShortest: number;
  timeEarliest: number;
  timeLatest: number;
}
