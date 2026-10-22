import { describe, expect, it } from "vitest";

import { groupTripsByTime } from "@/lib/trip-groups";

/**
 * Coming and past (#290).
 *
 * Every interesting case is a boundary, which is why the rule takes `today`
 * rather than reading the clock: a test that has to freeze time tends not to
 * get written, and this split has an edge exactly one day wide.
 */

const trip = (name: string, startDate: string | null, endDate: string | null) => ({
  name,
  startDate,
  endDate,
});

const TODAY = "2026-08-02";
const group = (trips: ReturnType<typeof trip>[], key: "coming" | "past") =>
  groupTripsByTime(trips, TODAY)
    .find((g) => g.key === key)
    ?.trips.map((t) => t.name) ?? [];

describe("#290 — which side of today", () => {
  it("files a finished trip under Past", () => {
    expect(group([trip("Copenhagen", "2026-07-01", "2026-07-05")], "past")).toEqual(["Copenhagen"]);
  });

  it("files a future trip under Coming", () => {
    expect(group([trip("Kyoto", "2026-08-10", "2026-08-22")], "coming")).toEqual(["Kyoto"]);
  });

  it("keeps a trip you are on right now under Coming", () => {
    // The split is on the END date. A trip that started yesterday is not
    // finished, and filing it with the past would bury the card you most want.
    expect(group([trip("In progress", "2026-08-01", "2026-08-04")], "coming")).toEqual([
      "In progress",
    ]);
  });

  it("keeps a trip that ends today under Coming", () => {
    // The one-day edge: today is still the trip.
    expect(group([trip("Ends today", "2026-07-30", TODAY)], "coming")).toEqual(["Ends today"]);
  });

  it("files a trip that ended yesterday under Past", () => {
    expect(group([trip("Ended yesterday", "2026-07-28", "2026-08-01")], "past")).toEqual([
      "Ended yesterday",
    ]);
  });

  it("judges a trip with no end date by its start", () => {
    expect(group([trip("Open-ended", "2026-07-01", null)], "past")).toEqual(["Open-ended"]);
    expect(group([trip("Starts later", "2026-09-01", null)], "coming")).toEqual(["Starts later"]);
  });

  it("treats an undated trip as Coming, not finished", () => {
    // A trip with no dates is one not planned yet.
    expect(group([trip("Someday", null, null)], "coming")).toEqual(["Someday"]);
  });
});

describe("#290 — nearest to today, first", () => {
  it("sorts Coming soonest first", () => {
    const trips = [
      trip("Far", "2026-12-01", "2026-12-05"),
      trip("Soon", "2026-08-10", "2026-08-22"),
      trip("Middle", "2026-09-15", "2026-09-18"),
    ];
    expect(group(trips, "coming")).toEqual(["Soon", "Middle", "Far"]);
  });

  it("sorts Past most recent first", () => {
    // The same rule from the other side: nearest to today at the top.
    const trips = [
      trip("Long ago", "2025-03-01", "2025-03-04"),
      trip("Last month", "2026-07-01", "2026-07-05"),
      trip("Last year", "2025-11-01", "2025-11-06"),
    ];
    expect(group(trips, "past")).toEqual(["Last month", "Last year", "Long ago"]);
  });

  it("puts an undated trip last among the coming ones", () => {
    const trips = [trip("Someday", null, null), trip("Soon", "2026-08-10", "2026-08-22")];
    expect(group(trips, "coming")).toEqual(["Soon", "Someday"]);
  });
});

describe("#290 — the groups themselves", () => {
  it("drops a group with nothing in it rather than printing a bare heading", () => {
    const groups = groupTripsByTime([trip("Kyoto", "2026-08-10", "2026-08-22")], TODAY);
    expect(groups.map((g) => g.key)).toEqual(["coming"]);
  });

  it("returns nothing at all for no trips", () => {
    expect(groupTripsByTime([], TODAY)).toEqual([]);
  });

  it("always lists Coming before Past", () => {
    const groups = groupTripsByTime(
      [trip("Old", "2025-01-01", "2025-01-02"), trip("New", "2026-09-01", "2026-09-02")],
      TODAY,
    );
    expect(groups.map((g) => g.key)).toEqual(["coming", "past"]);
  });
});
