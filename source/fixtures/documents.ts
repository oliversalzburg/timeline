import type { TimelineDocument } from "../types.js";

/**
 * This timeline is sneaky.
 * It provides two unique values in the input, that map to the exact same timestamp.
 * This timeline is ORDERED.
 */
export const withConflict: TimelineDocument = Object.freeze({
  timeline: {
    "1999-12-31 24:00:00": 946684800000,
    "2000": 946684800000,
    "2025-06-03 13:51:30": 1748958690000,
  },
});

/**
 * The timestamps in this timeline were randomly generated, using `contrib/random-timestamp.js`.
 */
export const random: TimelineDocument = Object.freeze({
  timeline: {
    "2017-07-09 08:53:43": "1499590423000",
    "2002-08-09 19:23:12": "1028920992000",
    "2022-09-19 11:07:37": "1663585657000",
    "1992-03-04 23:58:04": "699753484000",
    "2017-09-03 20:00:29": "1504468829000",
    "2021-02-11 05:38:25": "1613021905000",
    "2007-10-18 16:52:13": "1192726333000",
    "2011-11-26 10:53:41": "1322304821000",
    "2028-02-22 10:41:46": "1834828906000",
    "2021-07-26 18:49:50": "1627325390000",
    "2018-11-12 10:54:40": "1542020080000",
    "1987-04-09 23:13:18": "545008398000",
  },
});
