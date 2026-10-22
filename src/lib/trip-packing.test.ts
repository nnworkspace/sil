import { describe, expect, it } from "vitest";

import { packingGroups } from "@/lib/trip-packing";
import { tripDays } from "@/lib/trip-days";
import { TOP_LEVEL_CATEGORIES } from "@/lib/categories";

/**
 * Grouping for a packing list (#259).
 *
 * Extracted when the printable sheet grew the same grouping the Markdown export
 * already had. The tests below are mostly about the two decisions that are easy
 * to get wrong in either copy — order, and a piece appearing exactly once.
 */

const row = (name: string, category: string, packed = false) => ({
  item: { name, category },
  packed,
});

describe("#259 — packingGroups", () => {
  it("groups by category and sorts by name inside each", () => {
    const groups = packingGroups([
      row("Wide-Leg Trousers", "trousers"),
      row("Silk Dress", "dresses"),
      row("Chino Trousers", "trousers"),
    ]);
    expect(groups.map((g) => g.slug)).toEqual(["dresses", "trousers"]);
    expect(groups[1].rows.map((r) => r.item.name)).toEqual([
      "Chino Trousers",
      "Wide-Leg Trousers",
    ]);
  });

  it("drops empty categories rather than printing bare headings", () => {
    // A heading with nothing under it is noise on screen and wasted paper.
    const groups = packingGroups([row("Silk Dress", "dresses")]);
    expect(groups).toHaveLength(1);
  });

  it("follows the wardrobe's own order, not the alphabet", () => {
    // CATEGORIES runs roughly in the order a wardrobe is walked, which is the
    // order things are actually picked up when packing. Alphabetical would put
    // Accessories first and Trousers before Tops.
    const groups = packingGroups([row("Bag", "bags"), row("A Dress", "dresses")]);
    const order = TOP_LEVEL_CATEGORIES.map((c) => c.slug);
    expect(order.indexOf(groups[0].slug)).toBeLessThan(order.indexOf(groups[1].slug));
    expect(groups[0].slug).toBe("dresses");
  });

  it("lists a piece exactly once", () => {
    // A bolero is also in Tops and Outerwear via its secondaries. On a packing
    // sheet it must appear once — you pack the garment, not its filings.
    const groups = packingGroups([row("Lace-Back Bolero", "boleros")]);
    expect(groups.flatMap((g) => g.rows)).toHaveLength(1);
  });
});

/**
 * Rolling up to the parent (#286).
 *
 * #259 grouped by the piece's own category and justified it with "a piece must
 * appear exactly once" — an argument about *secondary* categories, which does
 * not apply to rolling the primary up. Meanwhile the fine grouping split four
 * garments across three headings, with Shoes between Dresses and Shirt Dresses.
 */
describe("#286 — the roll-up", () => {
  it("puts a shirt dress under Dresses", () => {
    const groups = packingGroups([
      row("Flared Poplin Dress", "dresses"),
      row("Oversized Grandad-Collar Shirt Dress", "shirt-dresses"),
      row("Long Silk Slip Dress", "slip-dresses"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].slug).toBe("dresses");
    expect(groups[0].rows).toHaveLength(3);
  });

  it("puts a bolero under Tops", () => {
    const groups = packingGroups([row("Lace-Back Bolero", "boleros")]);
    expect(groups[0].slug).toBe("tops");
  });

  it("still gives each piece exactly one group", () => {
    // The guarantee #259 was reaching for, and which the roll-up keeps: every
    // piece has one primary category, so it has one root.
    const rows = [
      row("A Dress", "dresses"),
      row("A Shirt Dress", "shirt-dresses"),
      row("A Bolero", "boleros"),
      row("A Shirt", "shirts"),
      row("Pumps", "shoes"),
    ];
    const groups = packingGroups(rows);
    expect(groups.flatMap((g) => g.rows)).toHaveLength(rows.length);
    expect(groups.map((g) => g.slug)).toEqual(["dresses", "tops", "shoes"]);
  });

  it("leaves a piece already at the top level alone", () => {
    expect(packingGroups([row("Pumps", "shoes")])[0].slug).toBe("shoes");
  });

  it("carries the caller's own fields through untouched", () => {
    // The printable sheet needs `packed` to tick the box; the export needs it
    // for the checklist. Neither should have to re-join anything.
    const groups = packingGroups([row("Silk Dress", "dresses", true)]);
    expect(groups[0].rows[0].packed).toBe(true);
  });

  it("returns nothing for a trip with no pieces", () => {
    expect(packingGroups([])).toEqual([]);
  });
});

/**
 * Ordering a group by the trip's own sequence (#288).
 *
 * Name order was the only sensible one before there was a day plan. With one,
 * the list can read as an itinerary — and the owner's rule for a repeat wear is
 * its **first** outing, not its last.
 */
describe("#288 — day order inside a group", () => {
  const DAYS = tripDays("2026-08-03", "2026-08-06"); // Mon–Thu

  const dressOn = (name: string, days: string[] = [], everyDay = false) => ({
    item: { name, category: "dresses" },
    everyDay,
    days: days.map((day) => ({ day })),
  });

  it("orders by the day a piece is worn, not by name", () => {
    const rows = [
      dressOn("Zebra Dress", ["2026-08-03"]),
      dressOn("Apple Dress", ["2026-08-05"]),
    ];
    expect(packingGroups(rows, DAYS)[0].rows.map((r) => r.item.name)).toEqual([
      "Zebra Dress",
      "Apple Dress",
    ]);
  });

  it("uses the FIRST day for a repeat wear", () => {
    // The owner's rule, stated exactly: a piece worn Monday and Thursday sits
    // with Monday. Sorting by the last day would bury it at the end.
    const rows = [
      dressOn("Repeat", ["2026-08-06", "2026-08-03"]),
      dressOn("Tuesday Only", ["2026-08-04"]),
    ];
    expect(packingGroups(rows, DAYS)[0].rows.map((r) => r.item.name)).toEqual([
      "Repeat",
      "Tuesday Only",
    ]);
  });

  it("keys an every-day piece on day one", () => {
    const rows = [dressOn("Wednesday", ["2026-08-05"]), dressOn("Always", [], true)];
    expect(packingGroups(rows, DAYS)[0].rows.map((r) => r.item.name)).toEqual([
      "Always",
      "Wednesday",
    ]);
  });

  it("puts undated pieces last, by name", () => {
    // They have no place in the sequence yet, and leading with them would hide
    // the sequence the rest of the list is in.
    const rows = [
      dressOn("Unplaced Zebra"),
      dressOn("Unplaced Apple"),
      dressOn("Thursday", ["2026-08-06"]),
    ];
    expect(packingGroups(rows, DAYS)[0].rows.map((r) => r.item.name)).toEqual([
      "Thursday",
      "Unplaced Apple",
      "Unplaced Zebra",
    ]);
  });

  it("breaks a tie on name, so the order is total", () => {
    const rows = [dressOn("Beta", ["2026-08-03"]), dressOn("Alpha", ["2026-08-03"])];
    const once = packingGroups(rows, DAYS)[0].rows.map((r) => r.item.name);
    expect(once).toEqual(["Alpha", "Beta"]);
    expect(packingGroups([...rows].reverse(), DAYS)[0].rows.map((r) => r.item.name)).toEqual(once);
  });

  it("ignores a day the trip no longer has", () => {
    // Shortening a trip strands assignments (#270). A stranded day must not
    // drag a piece to the top as though it were day zero.
    const rows = [dressOn("Stranded", ["2026-09-01"]), dressOn("Monday", ["2026-08-03"])];
    expect(packingGroups(rows, DAYS)[0].rows.map((r) => r.item.name)).toEqual([
      "Monday",
      "Stranded",
    ]);
  });

  it("falls back to name order for a trip with no day plan", () => {
    // The "order them however you like" case: don't change anything.
    const rows = [dressOn("Zebra", ["2026-08-03"]), dressOn("Apple", ["2026-08-05"])];
    expect(packingGroups(rows).map((g) => g.rows.map((r) => r.item.name))).toEqual([
      ["Apple", "Zebra"],
    ]);
  });

  it("orders within each group independently", () => {
    const rows = [
      { item: { name: "Late Shoes", category: "shoes" }, days: [{ day: "2026-08-06" }] },
      { item: { name: "Early Shoes", category: "shoes" }, days: [{ day: "2026-08-03" }] },
      dressOn("A Dress", ["2026-08-05"]),
    ];
    const groups = packingGroups(rows, DAYS);
    expect(groups.map((g) => g.slug)).toEqual(["dresses", "shoes"]);
    expect(groups[1].rows.map((r) => r.item.name)).toEqual(["Early Shoes", "Late Shoes"]);
  });
});
