/**
 * The fixture wardrobe (#183).
 *
 * Fifteen-ish pieces, and **every one exists to encode an edge case**, not to
 * represent a garment the owner happens to own. That is what keeps the suite
 * stable: this file grows when a new *shape* appears (a new hierarchy level, a
 * new archive reason), never when another skirt is filed.
 *
 * Each constant documents the rule or bug it defends, so a failing test points
 * at the behaviour that broke rather than at an anonymous row.
 */

import { makeItem, type TestItem } from "@/test/factories";

/** Filed in two families at once: culottes are trousers *and* skirts. Counting
 *  across families must count it **once** (the 59 + 36 = 95 trap; 87 is right). */
export const CULOTTES_IN_BOTH = makeItem({
  name: "Wide-Leg Culottes",
  category: "culottes",
  secondaryCategories: ["skirts"],
});

/** Primary `tops`, cross-filed into `knitwear`. The #180 bug: a primary-only
 *  test hid most knitwear pieces from the trip picker. */
export const KNIT_TOP_SECONDARY = makeItem({
  name: "Seamless 3D Knit Sweater",
  category: "tops",
  secondaryCategories: ["knitwear"],
  material: "90% wool, 10% cashmere",
});

/** A sub-category piece: must roll up into `dresses`, and must *not* appear in
 *  the parent's "not categorised" bucket. */
export const SHIRT_DRESS = makeItem({
  name: "Midi Shirt Dress",
  category: "shirt-dresses",
  material: "100% cotton",
});

/** Filed directly at a parent with no sub-type: the "not categorised" bucket. */
export const PLAIN_DRESS = makeItem({ name: "Column Dress", category: "dresses" });

/** Sold and archived: must vanish from every active-wardrobe read, while
 *  remaining openable on its own page (SPEC-ARCHIVE-FUNC). */
export const ARCHIVED_SOLD = makeItem({
  name: "Sold Skirt",
  category: "skirts",
  archivedAt: "2026-07-01",
});

/** No price: Figures must exclude it from spend rather than treat it as €0. */
export const NO_PRICE = makeItem({ name: "Gift Scarf", category: "accessories", pricePaidCents: null });

/** Wear history never recorded (#191): nobody has said. A gap to fill, and
 *  cost-per-wear is undefined: not zero, not infinite. */
export const NO_WEARS = makeItem({ name: "Unrecorded Blazer", category: "blazers", priorWears: null });

/** Recorded as genuinely never worn (#191). Same wear total as NO_WEARS, but a
 *  finding rather than a gap. The pair exists so a rule that conflates them
 *  fails here. */
export const NEVER_WORN = makeItem({ name: "Never-Worn Coat", category: "outerwear", priorWears: 0 });

/** Wear data from both sources: the recalled count *and* logged events. Any
 *  wear total must combine them, not pick one. */
export const WORN_BOTH_WAYS = makeItem({
  name: "Everyday Tee",
  category: "t-shirts",
  priorWears: 8,
  wearEvents: [{ wornAt: "2026-07-01" }, { wornAt: "2026-07-15" }],
});

/** A deep-ish leaf under jewellery: roll-up must reach it from the root. */
export const RING = makeItem({ name: "Signet Ring", category: "rings", material: null });

/** Wool + heavy: season inference should reach autumn/winter (#108). */
export const WOOL_COAT = makeItem({
  name: "Wool Coat",
  category: "outerwear",
  material: "80% wool, 20% polyamide",
});

/** Linen + sleeveless: season inference should reach spring/summer (#108). */
export const LINEN_VEST = makeItem({
  name: "Linen Vest",
  category: "vests",
  material: "100% linen",
  description: "A sleeveless linen top for hot days.",
  tags: ["sleeveless"],
});

/** Free-text colour that a colour-family filter must match by keyword (#105). */
export const OFF_WHITE = makeItem({ name: "Ecru Shirt", category: "shirts", color: "off-white" });

/** Has a berth: the browse keyword search must find it by location (#172). */
export const BERTHED = makeItem({
  name: "Stowed Coat",
  category: "outerwear",
  storageLocation: "R1-W1R1-S1-F",
});

/** Favourite, for the favourites-only facet (#135). */
export const FAVOURITE = makeItem({ name: "Beloved Dress", category: "dresses", favorite: true });

/** The whole fixture wardrobe. Use `ACTIVE` unless the test is about archiving. */
export const CATALOGUE: TestItem[] = [
  CULOTTES_IN_BOTH,
  KNIT_TOP_SECONDARY,
  SHIRT_DRESS,
  PLAIN_DRESS,
  ARCHIVED_SOLD,
  NO_PRICE,
  NO_WEARS,
  NEVER_WORN,
  WORN_BOTH_WAYS,
  RING,
  WOOL_COAT,
  LINEN_VEST,
  OFF_WHITE,
  BERTHED,
  FAVOURITE,
];

/** The active wardrobe: what every non-archive read should see. */
export const ACTIVE: TestItem[] = CATALOGUE.filter((i) => i.archivedAt === null);
