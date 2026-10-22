import { describe, expect, it } from "vitest";

import {
  categoryMatcher,
  countAcrossCategories,
  descendantSlugs,
  isInCategory,
  parentOf,
  normaliseSecondaries,
  TAG_GROUPS,
  TOP_LEVEL_CATEGORIES,
} from "@/lib/categories";
import { makeItem } from "@/test/factories";
import {
  ACTIVE,
  CULOTTES_IN_BOTH,
  KNIT_TOP_SECONDARY,
  PLAIN_DRESS,
  RING,
  SHIRT_DRESS,
} from "@/test/fixtures/catalogue";

describe("category tree (#78)", () => {
  it("rolls a parent up over every descendant", () => {
    expect(descendantSlugs("dresses")).toEqual(
      expect.arrayContaining(["dresses", "shirt-dresses", "slip-dresses"]),
    );
  });

  it("returns just itself for a leaf", () => {
    expect(descendantSlugs("rings")).toEqual(["rings"]);
  });

  it("keeps sub-categories out of the home grid", () => {
    const slugs = TOP_LEVEL_CATEGORIES.map((c) => c.slug);
    expect(slugs).toContain("tops");
    expect(slugs).not.toContain("jumpers");
    expect(parentOf("jumpers")).toBe("tops");
  });
});

describe("VAL-ITEM-02 — a piece's categories", () => {
  it("matches on the primary category", () => {
    expect(isInCategory(PLAIN_DRESS, "dresses")).toBe(true);
  });

  it("matches on a secondary category (#71)", () => {
    expect(isInCategory(CULOTTES_IN_BOTH, "skirts")).toBe(true);
  });

  it("matches a parent through a sub-category", () => {
    expect(isInCategory(SHIRT_DRESS, "dresses")).toBe(true);
    expect(isInCategory(RING, "jewellery")).toBe(true);
  });

  it("does not match an unrelated category", () => {
    expect(isInCategory(PLAIN_DRESS, "trousers")).toBe(false);
  });

  it("treats a missing secondary list as empty", () => {
    const piece = { category: "tops" };
    expect(isInCategory(piece, "tops")).toBe(true);
    expect(isInCategory(piece, "skirts")).toBe(false);
  });
});

describe("#180 regression — cross-filed pieces must be visible", () => {
  it("scoping to knitwear includes a piece filed there as a secondary", () => {
    // The bug: the trip picker tested only `item.category`, so this piece —
    // primary `tops`, secondary `knitwear` — was hidden. Only a fraction of the knitwear
    // pieces were shown.
    const inKnitwear = categoryMatcher("knitwear");
    expect(inKnitwear(KNIT_TOP_SECONDARY)).toBe(true);
    expect(ACTIVE.filter(inKnitwear)).toContain(KNIT_TOP_SECONDARY);
  });

  it("a primary-only test would have missed it", () => {
    // Pins the distinction the fix rests on, so a future refactor that reverts
    // to primary-only matching fails loudly here.
    const primaryOnly = ACTIVE.filter((i) => i.category === "knitwear");
    expect(primaryOnly).not.toContain(KNIT_TOP_SECONDARY);
  });
});

describe("counting across category families", () => {
  it("counts a piece filed in two families once", () => {
    // Culottes are trousers *and* skirts: adding the two counts double-counts.
    const trousers = ACTIVE.filter(categoryMatcher("trousers")).length;
    const skirts = ACTIVE.filter(categoryMatcher("skirts")).length;
    const distinct = countAcrossCategories(ACTIVE, ["trousers", "skirts"]);

    expect(trousers).toBeGreaterThan(0);
    expect(skirts).toBeGreaterThan(0);
    expect(distinct).toBeLessThan(trousers + skirts);
    expect(distinct).toBe(trousers + skirts - 1); // the one culotte in both
  });

  it("counts a piece in three families once", () => {
    const everywhere = makeItem({
      category: "culottes",
      secondaryCategories: ["skirts", "activewear"],
    });
    expect(
      countAcrossCategories([everywhere], ["trousers", "skirts", "activewear"]),
    ).toBe(1);
  });

  it("is zero for an empty wardrobe", () => {
    expect(countAcrossCategories([], ["dresses"])).toBe(0);
  });
});

describe("the tag vocabulary (#204)", () => {
  it("offers `occasion-only` in the Occasion group", () => {
    const occasion = TAG_GROUPS.find((g) => g.kind === "occasion");
    expect(occasion?.tags).toContain("occasion-only");
  });

  it("keeps `occasion` alongside it — the two compose, they do not replace", () => {
    // A piece stays `occasion` and *gains* the narrowing, so existing filters
    // and the 100-odd pieces already tagged keep working.
    const occasion = TAG_GROUPS.find((g) => g.kind === "occasion");
    expect(occasion?.tags).toContain("occasion");
  });

  it("uses no tag twice across groups", () => {
    // A tag is stored as a bare string on the item, so a duplicate across two
    // groups would make the group it came from unknowable.
    const all = TAG_GROUPS.flatMap((g) => g.tags);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("normaliseSecondaries (#206)", () => {
  it("adds the parent of the primary — a Shirts piece is also in Tops", () => {
    expect(normaliseSecondaries("shirts", [])).toEqual(["tops"]);
  });

  it("adds the parent of any ticked child, not only the primary's", () => {
    // A dress that is also filed under jeans gains trousers as well.
    expect(normaliseSecondaries("dresses", ["jeans"]).sort()).toEqual(["jeans", "trousers"]);
  });

  it("never returns the primary itself", () => {
    // Ticking the primary, or something whose parent *is* the primary, must not
    // put the primary into the secondaries — categoryMatcher already matches it.
    expect(normaliseSecondaries("tops", ["tops"])).toEqual([]);
    expect(normaliseSecondaries("tops", ["shirts"])).toEqual(["shirts"]);
  });

  it("drops a stale parent when the primary moves — the staleness guard", () => {
    // The piece was `shirts` and carried `tops`. Re-filed as `trousers`, the
    // old parent is simply not re-derived, so it disappears rather than
    // lingering and keeping the piece in Tops for ever.
    expect(normaliseSecondaries("trousers", [])).toEqual([]);
  });

  it("keeps genuinely unrelated ticks", () => {
    expect(normaliseSecondaries("shirts", ["knitwear"]).sort()).toEqual(["knitwear", "tops"]);
  });

  it("de-duplicates when a child and its parent are both ticked", () => {
    expect(normaliseSecondaries("dresses", ["jeans", "trousers"]).sort()).toEqual([
      "jeans",
      "trousers",
    ]);
  });

  it("is idempotent — re-saving an already-normalised piece changes nothing", () => {
    const once = normaliseSecondaries("shirts", ["knitwear"]);
    expect(normaliseSecondaries("shirts", once).sort()).toEqual(once.sort());
  });

  it("leaves a top-level primary with no parent to add", () => {
    expect(normaliseSecondaries("bags", [])).toEqual([]);
  });
});
