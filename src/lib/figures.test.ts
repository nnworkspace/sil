import { describe, expect, it } from "vitest";

import {
  acquisitionByYear,
  active,
  collection,
  careSplit,
  collectionByPrimary,
  colourFamilies,
  costPerWear,
  costPerWearLeaders,
  gaps,
  materialFamilies,
  mostWorn,
  overview,
  purchaseYears,
  seasonCoverage,
  spendByBrand,
  wearRecorded,
  wearSummary,
  wearTotal,
  type FigureItem,
} from "@/lib/figures";
import { makeItem } from "@/test/factories";
import {
  ACTIVE,
  ARCHIVED_SOLD,
  CATALOGUE,
  CULOTTES_IN_BOTH,
  NEVER_WORN,
  NO_WEARS,
  SHIRT_DRESS,
} from "@/test/fixtures/catalogue";

const item = (o: Partial<FigureItem> = {}) => makeItem(o) as FigureItem;

describe("VAL-FIG-01: active by default", () => {
  it("drops archived pieces", () => {
    expect(active(CATALOGUE as FigureItem[])).not.toContain(ARCHIVED_SOLD);
    expect(active(CATALOGUE as FigureItem[]).length).toBe(ACTIVE.length);
  });
});

describe("VAL-FIG-10: wear total combines both sources", () => {
  it("adds recalled wears and logged events", () => {
    expect(wearTotal(item({ priorWears: 8, wearEvents: [{ wornAt: "2026-01-01" }] }))).toBe(9);
  });

  it("is zero when neither source has anything", () => {
    expect(wearTotal(item({ priorWears: 0, wearEvents: [] }))).toBe(0);
  });
});

describe("VAL-FIG-07: undefined cost-per-wear stays undefined", () => {
  it("is null for an unworn piece rather than its full price", () => {
    // The trap: the browse sort divides by max(1, wears), which would report a
    // €400 unworn coat as "€400 per wear". A leaderboard must not assert that.
    expect(costPerWear(item({ pricePaidCents: 40000, priorWears: 0, wearEvents: [] }))).toBeNull();
  });

  it("is null when the price is unknown, however often it was worn", () => {
    expect(costPerWear(item({ pricePaidCents: null, priorWears: 20 }))).toBeNull();
  });

  it("divides price by total wears when both are known", () => {
    expect(costPerWear(item({ pricePaidCents: 2000, priorWears: 20 }))).toBe(100);
  });
});

describe("VAL-FIG-03: figures carry the base they were computed over", () => {
  it("reports how many pieces were excluded for having no price", () => {
    const items = [
      item({ pricePaidCents: 1000 }),
      item({ pricePaidCents: 3000 }),
      item({ pricePaidCents: null }),
    ];
    const o = overview(items, 2026);
    expect(o.totalValueCents.value).toBe(4000);
    expect(o.totalValueCents.base).toBe(2);
    expect(o.totalValueCents.excluded).toBe(1);
  });

  it("averages over priced pieces only, not over the whole wardrobe", () => {
    const items = [
      item({ pricePaidCents: 1000 }),
      item({ pricePaidCents: 3000 }),
      item({ pricePaidCents: null }),
    ];
    // 4000/2, not 4000/3: the unpriced piece is absent, not zero.
    expect(overview(items, 2026).averagePriceCents.value).toBe(2000);
  });

  it("reports undated pieces as excluded from the timeline", () => {
    const items = [item({ purchasedAt: "2024-03-01" }), item({ purchasedAt: null })];
    const years = acquisitionByYear(items);
    expect(years.base).toBe(1);
    expect(years.excluded).toBe(1);
  });

  it("reports unbranded pieces as excluded from brand spend", () => {
    const items = [item({ brand: "Atelier Nord" }), item({ brand: null }), item({ brand: "  " })];
    const brands = spendByBrand(items);
    expect(brands.base).toBe(1);
    expect(brands.excluded).toBe(2);
  });
});

describe("VAL-FIG-02 / 05: category counts roll up and overlap", () => {
  it("rolls a sub-category into its parent", () => {
    // Two pieces filed directly under `dresses` plus one `shirt-dresses`: the
    // parent must report all three, the leaf only its own.
    const rows = collection(ACTIVE as FigureItem[]);
    expect(rows.find((r) => r.slug === "dresses")?.count).toBe(3);
    expect(rows.find((r) => r.slug === "shirt-dresses")?.count).toBe(1);
  });

  it("counts a cross-filed piece under each of its categories", () => {
    const rows = collection([CULOTTES_IN_BOTH] as FigureItem[]);
    expect(rows.find((r) => r.slug === "trousers")?.count).toBe(1);
    expect(rows.find((r) => r.slug === "skirts")?.count).toBe(1);
    // …which is exactly why the totals exceed the wardrobe size (VAL-FIG-05).
    const summed = rows.reduce((n, r) => n + r.count, 0);
    expect(summed).toBeGreaterThan(1);
  });

  it("omits categories with nothing in them", () => {
    expect(collection([item({ category: "dresses" })]).map((r) => r.slug)).toEqual(["dresses"]);
  });
});

describe("VAL-FIG-04: nothing to show is a state, not a zero", () => {
  it("returns an empty timeline rather than a fabricated year", () => {
    const empty = acquisitionByYear([]);
    expect(empty.value).toEqual([]);
    expect(empty.base).toBe(0);
  });

  it("survives an entirely empty wardrobe", () => {
    const o = overview([], 2026);
    expect(o.pieces).toBe(0);
    expect(o.categoriesInUse).toBe(0);
    expect(o.averagePriceCents.value).toBe(0); // no division by zero
  });
});

describe("acquisition timeline", () => {
  it("keeps empty years so the shape is truthful", () => {
    const items = [item({ purchasedAt: "2020-01-01" }), item({ purchasedAt: "2023-01-01" })];
    expect(acquisitionByYear(items).value.map((r) => r.year)).toEqual([2020, 2021, 2022, 2023]);
    expect(acquisitionByYear(items).value[1].pieces).toBe(0);
  });

  it("sums spend within a year and ignores unpriced pieces in the sum", () => {
    const items = [
      item({ purchasedAt: "2024-02-01", pricePaidCents: 5000 }),
      item({ purchasedAt: "2024-09-01", pricePaidCents: null }),
    ];
    const row = acquisitionByYear(items).value[0];
    expect(row.pieces).toBe(2);
    expect(row.spendCents).toBe(5000);
  });

  it("lists purchase years newest first for the filter", () => {
    const items = [item({ purchasedAt: "2019-01-01" }), item({ purchasedAt: "2026-01-01" })];
    expect(purchaseYears(items)).toEqual([2026, 2019]);
  });
});

describe("brand spend", () => {
  it("ranks by spend and groups pieces of the same brand", () => {
    const items = [
      item({ brand: "Atelier Nord", pricePaidCents: 3000 }),
      item({ brand: "Atelier Nord", pricePaidCents: 2000 }),
      item({ brand: "Maison Verre", pricePaidCents: 40000 }),
    ];
    const rows = spendByBrand(items).value;
    expect(rows[0]).toMatchObject({ brand: "Maison Verre", pieces: 1, spendCents: 40000 });
    expect(rows[1]).toMatchObject({ brand: "Atelier Nord", pieces: 2, spendCents: 5000 });
  });
});

describe("VAL-FIG-11: the primary view sums to the wardrobe", () => {
  it("counts every piece exactly once", () => {
    const rows = collectionByPrimary(ACTIVE as FigureItem[]);
    const summed = rows.reduce((n, r) => n + r.count, 0);
    expect(summed).toBe(ACTIVE.length);
  });

  it("rolls a sub-category piece up to its top-level category", () => {
    // A shirt dress is one dress, not one dress plus one shirt-dress.
    const rows = collectionByPrimary([SHIRT_DRESS] as FigureItem[]);
    expect(rows).toEqual([{ slug: "dresses", label: "Dresses", count: 1, isChild: false }]);
  });

  it("files a cross-filed piece under its primary only", () => {
    // Culottes are also skirts, but they are principally trousers.
    const rows = collectionByPrimary([CULOTTES_IN_BOTH] as FigureItem[]);
    expect(rows.map((r) => r.slug)).toEqual(["trousers"]);
  });
});

describe("#191: never worn is not the same as never recorded", () => {
  it("distinguishes them even though both have a wear total of zero", () => {
    expect(wearTotal(NO_WEARS as FigureItem)).toBe(0);
    expect(wearTotal(NEVER_WORN as FigureItem)).toBe(0);
    // …and that is exactly why a total of zero cannot be read as a measurement.
    expect(wearRecorded(NO_WEARS as FigureItem)).toBe(false);
    expect(wearRecorded(NEVER_WORN as FigureItem)).toBe(true);
  });

  it("treats a logged wear as recorded even with no prior count", () => {
    expect(wearRecorded(item({ priorWears: null, wearEvents: [{ wornAt: "2026-01-01" }] }))).toBe(
      true,
    );
  });

  it("leaves cost-per-wear undefined for both", () => {
    // A recorded zero is a finding, but it still cannot be divided by.
    expect(costPerWear({ ...NEVER_WORN, pricePaidCents: 40000 } as FigureItem)).toBeNull();
    expect(costPerWear({ ...NO_WEARS, pricePaidCents: 40000 } as FigureItem)).toBeNull();
  });

  it("counts an unrecorded prior as nothing in the arithmetic", () => {
    expect(wearTotal(item({ priorWears: null, wearEvents: [{ wornAt: "2026-01-01" }] }))).toBe(1);
  });
});

describe("VAL-FIG-12: wear summary separates the two zeroes", () => {
  it("counts never-worn as a finding and unrecorded as a gap", () => {
    const s = wearSummary([
      NEVER_WORN as FigureItem, // recorded: never worn
      NO_WEARS as FigureItem, // nobody said
      item({ priorWears: 5 }),
    ]);
    expect(s.recorded).toBe(2);
    expect(s.notRecorded).toBe(1);
    expect(s.neverWorn).toBe(1);
    expect(s.wears).toBe(5);
  });
});

describe("VAL-FIG-03 / 07: wear leaderboards state their base", () => {
  it("ranks most-worn over recorded pieces only", () => {
    const items = [
      item({ name: "Often", priorWears: 30 }),
      item({ name: "Rarely", priorWears: 2 }),
      NO_WEARS as FigureItem,
    ];
    const m = mostWorn(items);
    expect(m.value.map((r) => r.name)).toEqual(["Often", "Rarely"]);
    expect(m.base).toBe(2);
    expect(m.excluded).toBe(1);
  });

  it("excludes pieces with no defined cost-per-wear from both leaderboards", () => {
    const items = [
      item({ name: "Good", pricePaidCents: 2000, priorWears: 20 }), // €1
      item({ name: "Bad", pricePaidCents: 40000, priorWears: 2 }), // €200
      item({ name: "Unworn", pricePaidCents: 40000, priorWears: 0 }), // undefined
      item({ name: "Unpriced", pricePaidCents: null, priorWears: 10 }), // undefined
    ];
    const l = costPerWearLeaders(items);
    expect(l.base).toBe(2);
    expect(l.excluded).toBe(2);
    expect(l.value.best[0].name).toBe("Good");
    expect(l.value.worst[0].name).toBe("Bad");
    // The unworn coat must not head the "worst" list at its full price.
    expect(l.value.worst.map((r) => r.name)).not.toContain("Unworn");
  });
});

describe("gaps", () => {
  it("counts each gap and omits the ones with nothing in them", () => {
    const items = [
      item({ pricePaidCents: null, material: "wool", storageLocation: "R1" }),
      item({ pricePaidCents: 100, material: "  ", storageLocation: "R1" }),
    ];
    const g = gaps(items, () => true);
    const by = Object.fromEntries(g.map((x) => [x.kind, x.count]));
    expect(by.price).toBe(1);
    expect(by.material).toBe(1);
    expect(by.berth).toBeUndefined(); // both have one: no row at all
    expect(by.photo).toBeUndefined();
  });

  it("counts an unrecorded wear history but not a recorded zero (#191)", () => {
    const g = gaps([NEVER_WORN as FigureItem, NO_WEARS as FigureItem], () => true);
    expect(g.find((x) => x.kind === "wears")?.count).toBe(1);
  });

  it("asks the caller about photos rather than knowing about them", () => {
    const a = item(), b = item();
    const g = gaps([a, b], (id) => id === a.id);
    expect(g.find((x) => x.kind === "photo")?.count).toBe(1);
  });
});

describe("VAL-FIG-05: overlapping dimensions do not sum", () => {
  it("counts a blend in every material family it names", () => {
    const items = [item({ material: "70% wool, 30% silk" })];
    const m = materialFamilies(items);
    expect(m.value.map((r) => r.key).sort()).toEqual(["silk", "wool"]);
    // One piece, two rows, which is why these must never be totalled.
    expect(m.value.reduce((n, r) => n + r.count, 0)).toBe(2);
    expect(m.base).toBe(1);
  });

  it("excludes pieces with no material rather than filing them as other", () => {
    const m = materialFamilies([item({ material: null }), item({ material: "  " })]);
    expect(m.value).toEqual([]);
    expect(m.excluded).toBe(2);
  });

  it("counts a piece under every season it carries", () => {
    const s = seasonCoverage([item({ tags: ["spring", "summer", "autumn"] })]);
    expect(s.value.filter((r) => r.count > 0).map((r) => r.key)).toEqual([
      "spring",
      "summer",
      "autumn",
    ]);
    expect(s.base).toBe(1);
  });
});

describe("colour families", () => {
  it("matches free text by keyword and reports the unclassified", () => {
    const c = colourFamilies([
      item({ color: "off-white" }),
      item({ color: "Palace Blue" }),
      item({ color: "chartreuse" }), // in no family
    ]);
    const by = Object.fromEntries(c.value.map((r) => [r.key, r.count]));
    expect(by.white).toBe(1);
    expect(by.blue).toBe(1);
    expect(c.base).toBe(2);
    expect(c.excluded).toBe(1);
  });

  it("carries a swatch so the mark can show the thing it counts", () => {
    const c = colourFamilies([item({ color: "black" })]);
    expect(c.value[0].swatch).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("care and season keep their vocabulary order", () => {
  it("lists seasons spring → winter, not by size", () => {
    const s = seasonCoverage([
      item({ tags: ["winter"] }),
      item({ tags: ["winter"] }),
      item({ tags: ["spring"] }),
    ]);
    // Winter is larger, but the order of seasons is meaning, not ranking.
    expect(s.value.map((r) => r.key)).toEqual(["spring", "summer", "autumn", "winter"]);
  });

  it("counts pieces with no tag from the group as excluded", () => {
    const c = careSplit([item({ tags: ["easy-care"] }), item({ tags: ["summer"] })]);
    expect(c.base).toBe(1);
    expect(c.excluded).toBe(1);
  });
});
