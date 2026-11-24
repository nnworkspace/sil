import { describe, expect, it } from "vitest";

import { itemInputSchema } from "@/lib/validation";

/** A minimal valid payload; each test overrides only the field it is about. */
const input = (overrides: Record<string, unknown> = {}) => ({
  name: "Linen Shirt",
  category: "shirts",
  tags: [],
  details: [],
  ...overrides,
});

const parse = (overrides: Record<string, unknown> = {}) =>
  itemInputSchema.safeParse(input(overrides));

describe("VAL-ITEM-01: name", () => {
  it("requires a non-empty name", () => {
    expect(parse({ name: "" }).success).toBe(false);
    expect(parse({ name: "   " }).success).toBe(false);
  });

  it("trims and caps at 120 characters", () => {
    const ok = parse({ name: "  Linen Shirt  " });
    expect(ok.success && ok.data.name).toBe("Linen Shirt");
    expect(parse({ name: "x".repeat(121) }).success).toBe(false);
  });
});

describe("VAL-ITEM-02: categories", () => {
  it("rejects an unknown primary category", () => {
    expect(parse({ category: "hats" }).success).toBe(false);
  });

  it("accepts a sub-category as the primary (#78)", () => {
    expect(parse({ category: "shirt-dresses" }).success).toBe(true);
  });

  it("de-duplicates the extras and drops the primary from them (#71)", () => {
    const r = parse({
      category: "tops",
      secondaryCategories: ["knitwear", "knitwear", "tops"],
    });
    expect(r.success && r.data.secondaryCategories).toEqual(["knitwear"]);
  });

  it("rejects an unknown extra category", () => {
    expect(parse({ secondaryCategories: ["hats"] }).success).toBe(false);
  });
});

describe("VAL-ITEM-04: prices", () => {
  it("rejects a negative price", () => {
    expect(parse({ pricePaidCents: -1 }).success).toBe(false);
  });

  it("defaults the currency to EUR", () => {
    const r = parse();
    expect(r.success && r.data.currency).toBe("EUR");
  });
});

describe("VAL-ITEM-05: tags", () => {
  it("rejects a tag outside the vocabulary", () => {
    expect(parse({ tags: ["not-a-tag"] }).success).toBe(false);
  });

  it("de-duplicates known tags", () => {
    const r = parse({ tags: ["summer", "summer", "casual"] });
    expect(r.success && r.data.tags).toEqual(["summer", "casual"]);
  });
});

describe("VAL-ITEM-06 / 07: dates", () => {
  it("rejects a purchase date in the future", () => {
    const nextYear = `${new Date().getFullYear() + 1}-01-01`;
    expect(parse({ purchasedAt: nextYear }).success).toBe(false);
  });

  it("allows a return-by date in the future: it is a deadline", () => {
    const nextYear = `${new Date().getFullYear() + 1}-01-01`;
    expect(parse({ returnBy: nextYear }).success).toBe(true);
  });

  it("rejects a return-by date before the purchase date", () => {
    expect(
      parse({ purchasedAt: "2024-05-10", returnBy: "2024-05-01" }).success,
    ).toBe(false);
  });
});

describe("VAL-ITEM-12: berth (#172)", () => {
  it("is optional", () => {
    expect(parse().success).toBe(true);
  });

  it("trims and caps at 31 characters", () => {
    const ok = parse({ storageLocation: "  R1-W1R1-S1-F  " });
    expect(ok.success && ok.data.storageLocation).toBe("R1-W1R1-S1-F");
    expect(parse({ storageLocation: "x".repeat(32) }).success).toBe(false);
  });
});

describe("VAL-ITEM-09: details", () => {
  it("caps the list at 30 entries", () => {
    const many = Array.from({ length: 31 }, () => ({ label: "L", value: "V" }));
    expect(parse({ details: many }).success).toBe(false);
  });
});
