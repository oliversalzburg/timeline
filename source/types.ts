export interface TimelineDocument {
  timeline: TimelineSimple;
}
export interface TimelineSimple extends Record<string | number, string> {}
export interface TimelineEntry {
  title: string;
}
export type Timeline = Array<[number, TimelineEntry]>;
export interface TimelineMetrics {
  get durationTotal(): number;
  get periodLongest(): number;
  get periodShortest(): number;
}
