export interface TimelineDocument {
  color?: string;
  link?: boolean;
  prefix?: string;
  timeline: TimelineFlexibleInput;
}
export interface TimelineFlexibleInput
  extends Record<string, string | number | Array<string | number | TimelineEntry>> {}
export interface TimelineEntry {
  title: string;
}
export type TimelineRecord = [number, TimelineEntry];
export type Timeline = {
  meta: {
    color?: string;
    link?: boolean;
    prefix?: string;
  };
  records: Array<TimelineRecord>;
};
export interface TimelineMetrics {
  durationTotal: number;
  periodLongest: number;
  periodShortest: number;
  timeEarliest: number;
  timeLatest: number;
}
