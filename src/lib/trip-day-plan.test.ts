import { describe, expect, it } from "vitest";

import { dayPlan, dayLabelsFor, type PlannableItem } from "@/lib/trip-day-plan";
import { tripDays } from "@/lib/trip-days";

/**
 * A trip's pieces arranged by day (#270).
 *
 * The behaviour worth pinning is all about what must **not** collapse into
 * something else: a repeat wear must stay one packed piece, "for the whole
 * trip" must stay distinct from "not decided yet", and a piece filed under a
 * day the trip no longer has must stay visible rather than vanishing.
 */

type Row = PlannableItem<{ name: string }>;

const row = (name: string, days: string[] = [], everyDay = false): Row => ({
  itemId: name,
  name,
  everyDay,
  days: days.map((day) => ({ day })),
});

const trip = { startDate: "2026-08-03", endDate: "2026-08-05" };
const byName = (a: Row, b: Row) => a.name.localeCompare(b.name);
const plan = (rows: Row[], t = trip) => dayPlan(t, rows, byName);
const names = (rows: Row[]) => rows.map((r) => r.name);
const group = (rows: Row[], key: string, t = trip) =>
  plan(rows, t).groups.find((g) => g.key === key)!;

describe("#270: the groups", () => {
  it("gives every day of the trip a group, including the empty ones", () => {
    // An empty Thursday is the most useful thing this view can tell you.
    const { groups } = plan([row("Linen dress", ["2026-08-03"])]);
    expect(groups.filter((g) => g.kind === "day").map((g) => g.key)).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
    ]);
    expect(names(group([row("Linen dress", ["2026-08-03"])], "2026-08-04").rows)).toEqual([]);
  });

  it("puts an every-day piece in its own group and nowhere else", () => {
    const rows = [row("Isabella Pumps", [], true)];
    expect(names(group(rows, "all").rows)).toEqual(["Isabella Pumps"]);
    expect(names(group(rows, "2026-08-03").rows)).toEqual([]);
    expect(names(group(rows, "unscheduled").rows)).toEqual([]);
  });

  it("keeps 'not decided yet' apart from 'for the whole trip'", () => {
    // Merging them would make "Across all days" mean nothing: it would just be
    // where unplaced pieces went.
    const rows = [row("Navy blazer", [], true), row("White tee")];
    expect(names(group(rows, "all").rows)).toEqual(["Navy blazer"]);
    expect(names(group(rows, "unscheduled").rows)).toEqual(["White tee"]);
  });

  it("shows a repeat wear under every day it is planned for", () => {
    const rows = [row("Wide-leg jeans", ["2026-08-03", "2026-08-05"])];
    expect(names(group(rows, "2026-08-03").rows)).toEqual(["Wide-leg jeans"]);
    expect(names(group(rows, "2026-08-05").rows)).toEqual(["Wide-leg jeans"]);
    // …and not as unscheduled, which would be the obvious bug.
    expect(names(group(rows, "unscheduled").rows)).toEqual([]);
  });

  it("sorts within a group with the comparator it is given", () => {
    const rows = [row("Wide-leg jeans", ["2026-08-03"]), row("Ankle boots", ["2026-08-03"])];
    expect(names(group(rows, "2026-08-03").rows)).toEqual(["Ankle boots", "Wide-leg jeans"]);
  });
});

describe("#270: a shortened trip", () => {
  const rows = [row("Silk dress", ["2026-08-09"]), row("Linen dress", ["2026-08-03"])];

  it("keeps a piece filed under a dropped day visible", () => {
    // Shorten a trip and this piece is still packed and still planned for
    // something. Dropping it silently would lose the plan without saying so.
    expect(names(group(rows, "orphan").rows)).toEqual(["Silk dress"]);
  });

  it("does not also call it unscheduled, which would list it twice", () => {
    expect(names(group(rows, "unscheduled").rows)).toEqual([]);
  });

  it("has no orphan group when every day is still in range", () => {
    expect(plan([row("Linen dress", ["2026-08-03"])]).groups.some((g) => g.kind === "orphan")).toBe(
      false,
    );
  });
});

describe("#270: a trip with no days", () => {
  it("says why, rather than leaving the view to guess", () => {
    expect(dayPlan({ startDate: null, endDate: null }, [], byName).noDaysReason).toBe("no-dates");
    expect(
      dayPlan({ startDate: "2026-08-05", endDate: "2026-08-03" }, [], byName).noDaysReason,
    ).toBe("bad-range");
    expect(
      dayPlan({ startDate: "2026-01-01", endDate: "2027-01-01" }, [], byName).noDaysReason,
    ).toBe("too-long");
    expect(plan([]).noDaysReason).toBeNull();
  });

  it("does not claim a day assignment is orphaned when there are no days at all", () => {
    // Every trip before this feature has assignments of neither kind, but a
    // trip whose dates were *removed* would otherwise show every piece under
    // "a day this trip no longer has": technically true, useless to read.
    const p = dayPlan({ startDate: null, endDate: null }, [row("Silk dress", ["2026-08-09"])], byName);
    expect(p.groups.some((g) => g.kind === "orphan")).toBe(false);
  });
});

describe("#270: the labels the packing list shows", () => {
  const days = tripDays("2026-08-03", "2026-08-05");

  it("names each day a piece is planned for, in trip order", () => {
    // Stored order is whatever the inserts happened to be; read order is the
    // trip's. "(Mon, Wed)" must not come out as "(Wed, Mon)".
    expect(dayLabelsFor(days, row("x", ["2026-08-05", "2026-08-03"]))).toEqual(["Mon", "Wed"]);
  });

  it("says 'every day' rather than listing three days", () => {
    expect(dayLabelsFor(days, row("x", [], true))).toEqual(["every day"]);
  });

  it("says nothing for a piece that is not scheduled", () => {
    // The label is omitted entirely rather than rendered empty: a packing
    // list from a trip with no day plan must look exactly as it did before.
    expect(dayLabelsFor(days, row("x"))).toEqual([]);
    expect(dayLabelsFor([], row("x", ["2026-08-03"]))).toEqual([]);
  });

  it("ignores a day the trip no longer has", () => {
    expect(dayLabelsFor(days, row("x", ["2026-08-09"]))).toEqual([]);
  });
});
