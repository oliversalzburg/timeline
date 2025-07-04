export interface TimelineDocument {
  id: string;
  color?: string;
  link?: boolean;
  prefix?: string;
  rank?: number;
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
    id: string;
    color?: string;
    link?: boolean;
    prefix?: string;
    rank?: number;
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
