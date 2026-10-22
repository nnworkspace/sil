import { describe, expect, it } from "vitest";

import { MAX_TRIP_DAYS, isTripDay, tripDays } from "@/lib/trip-days";

/**
 * A trip's days (#270).
 *
 * The interesting cases are all boundaries — a one-day trip, a month end, and
 * the timezone trap that makes a calendar day arithmetic problem look like a
 * clock problem.
 */

describe("#270 — the days of a trip", () => {
  it("includes both ends", () => {
    const days = tripDays("2026-08-03", "2026-08-05");
    expect(days.map((d) => d.iso)).toEqual(["2026-08-03", "2026-08-04", "2026-08-05"]);
  });

  it("handles a one-day trip", () => {
    // A day trip is a trip. Off-by-one here would render nothing at all.
    expect(tripDays("2026-08-03", "2026-08-03").map((d) => d.iso)).toEqual(["2026-08-03"]);
  });

  it("crosses a month boundary", () => {
    expect(tripDays("2026-07-30", "2026-08-02").map((d) => d.iso)).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });

  it("crosses a year boundary and a leap day", () => {
    expect(tripDays("2027-12-31", "2028-01-01").map((d) => d.iso)).toEqual([
      "2027-12-31",
      "2028-01-01",
    ]);
    expect(tripDays("2028-02-28", "2028-03-01").map((d) => d.iso)).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });

  it("is unaffected by the machine's timezone", () => {
    // The trap: formatting a UTC-midnight Date in a negative-offset zone gives
    // the previous day, so a trip silently starts a day early for anyone west
    // of Greenwich. Both the ISO value and the label are pinned to UTC.
    const days = tripDays("2026-08-03", "2026-08-03");
    expect(days[0].iso).toBe("2026-08-03");
    expect(days[0].label).toMatch(/3 Aug/);
    expect(days[0].label).toMatch(/^Mon/);
  });

  it("numbers the days, for a trip whose dates say nothing", () => {
    expect(tripDays("2026-08-03", "2026-08-05").map((d) => d.ordinal)).toEqual([1, 2, 3]);
  });
});

describe("#270 — when there are no days to show", () => {
  it("returns nothing when either date is missing", () => {
    // Every trip in the catalogue before this feature. The view must say why
    // rather than render an empty frame.
    expect(tripDays(null, "2026-08-05")).toEqual([]);
    expect(tripDays("2026-08-03", null)).toEqual([]);
    expect(tripDays(null, null)).toEqual([]);
    expect(tripDays(undefined, undefined)).toEqual([]);
  });

  it("returns nothing when the end precedes the start", () => {
    expect(tripDays("2026-08-05", "2026-08-03")).toEqual([]);
  });

  it("refuses a range longer than the cap", () => {
    // A mistyped year should not render 365 groups.
    expect(tripDays("2026-08-03", "2027-08-03")).toEqual([]);
    expect(tripDays("2026-01-01", "2026-01-01")).toHaveLength(1);
  });

  it("accepts a range exactly at the cap", () => {
    const end = new Date(Date.parse("2026-01-01T00:00:00Z") + (MAX_TRIP_DAYS - 1) * 86_400_000);
    expect(tripDays("2026-01-01", end.toISOString().slice(0, 10))).toHaveLength(MAX_TRIP_DAYS);
  });

  it("ignores a value that is not a plain calendar day", () => {
    expect(tripDays("not-a-date", "2026-08-05")).toEqual([]);
    expect(tripDays("2026-08-03T12:00:00Z", "2026-08-05")).toEqual([]);
  });
});

describe("#270 — an assignment can outlive the dates that made it", () => {
  it("knows which stored days still belong to the trip", () => {
    // Shorten a trip and a piece filed under the dropped day would otherwise
    // be invisible without being gone. The view groups those separately.
    const days = tripDays("2026-08-03", "2026-08-04");
    expect(isTripDay(days, "2026-08-03")).toBe(true);
    expect(isTripDay(days, "2026-08-05")).toBe(false);
    expect(isTripDay([], "2026-08-03")).toBe(false);
  });
});
