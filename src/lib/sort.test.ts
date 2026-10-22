import { describe, expect, it } from "vitest";

import { DEFAULT_SORT, SORT_VALUES, sortItems, sortLabel } from "@/lib/sort";
import { makeItem } from "@/test/factories";

const names = (items: { name: string }[]) => items.map((i) => i.name);

describe("browse sorting", () => {
  it("orders by price, newest, name and wears", () => {
    const cheap = makeItem({ name: "Cheap", pricePaidCents: 1000 });
    const dear = makeItem({ name: "Dear", pricePaidCents: 9000 });
    expect(names(sortItems([cheap, dear], "price-desc"))).toEqual(["Dear", "Cheap"]);
    expect(names(sortItems([dear, cheap], "price-asc"))).toEqual(["Cheap", "Dear"]);

    const older = makeItem({ name: "Older", createdAt: new Date("2024-01-01") });
    const newer = makeItem({ name: "Newer", createdAt: new Date("2026-01-01") });
    expect(names(sortItems([older, newer], "new"))).toEqual(["Newer", "Older"]);

    expect(names(sortItems([makeItem({ name: "B" }), makeItem({ name: "A" })], "name-asc")))
      .toEqual(["A", "B"]);
  });

  it("counts recalled wears and logged events together", () => {
    // 8 recalled + 2 logged beats 9 recalled + 0 logged.
    const mixed = makeItem({
      name: "Mixed",
      priorWears: 8,
      wearEvents: [{ wornAt: "2026-01-01" }, { wornAt: "2026-02-01" }],
    });
    const recalled = makeItem({ name: "Recalled", priorWears: 9 });
    expect(names(sortItems([recalled, mixed], "wears-desc"))).toEqual(["Mixed", "Recalled"]);
  });

  it("divides price by total wears for cost-per-wear", () => {
    const good = makeItem({ name: "Good", pricePaidCents: 2000, priorWears: 20 }); // €1
    const bad = makeItem({ name: "Bad", pricePaidCents: 20000, priorWears: 2 }); // €100
    expect(names(sortItems([bad, good], "cpw-asc"))).toEqual(["Good", "Bad"]);
  });

  it("treats an unworn piece as one wear rather than dividing by zero", () => {
    const unworn = makeItem({ name: "Unworn", pricePaidCents: 5000, priorWears: 0 });
    expect(() => sortItems([unworn], "cpw-asc")).not.toThrow();
    expect(names(sortItems([unworn], "cpw-asc"))).toEqual(["Unworn"]);
  });

  it("puts pieces with no value last, whichever direction is asked for", () => {
    const priced = makeItem({ name: "Priced", pricePaidCents: 5000 });
    const unpriced = makeItem({ name: "Unpriced", pricePaidCents: null });
    expect(names(sortItems([unpriced, priced], "price-desc"))).toEqual(["Priced", "Unpriced"]);
    expect(names(sortItems([unpriced, priced], "price-asc"))).toEqual(["Priced", "Unpriced"]);
  });

  it("does not mutate the array it is given", () => {
    const a = makeItem({ name: "A", pricePaidCents: 100 });
    const b = makeItem({ name: "B", pricePaidCents: 900 });
    const original = [a, b];
    sortItems(original, "price-desc");
    expect(names(original)).toEqual(["A", "B"]);
  });

  it("falls back to newest for an unknown sort value", () => {
    const older = makeItem({ name: "Older", createdAt: new Date("2024-01-01") });
    const newer = makeItem({ name: "Newer", createdAt: new Date("2026-01-01") });
    expect(names(sortItems([older, newer], "nonsense"))).toEqual(["Newer", "Older"]);
    expect(sortLabel("nonsense")).toBe(sortLabel(DEFAULT_SORT));
  });

  it("handles every advertised sort option without throwing", () => {
    const items = [makeItem(), makeItem({ pricePaidCents: null, purchasedAt: null })];
    for (const value of SORT_VALUES) {
      expect(() => sortItems(items, value)).not.toThrow();
      expect(sortItems(items, value)).toHaveLength(2);
    }
  });
});
