/**
 * Derived metrics for the Figures dashboard (SPEC-FIGURES-DATA, #181).
 *
 * Every function here is **pure over an array of pieces** — no database, no
 * Drizzle types. That is deliberate: the metric definitions are the part worth
 * testing, and keeping them free of I/O means they are tested against the
 * fixture catalogue with no test database (#183).
 *
 * The rule that shapes all of it: coverage is uneven (wear data reaches barely
 * a third of the wardrobe), so a metric computed over a subset carries the size
 * of that subset with it — see `Derived<T>` and VAL-FIG-03. A caller cannot
 * render one of these numbers without also having the denominator to hand.
 */

import {
  CATEGORIES,
  TAG_GROUPS,
  categoryMatcher,
  parentOf,
  type Categorised,
} from "@/lib/categories";
import { COLOR_FAMILIES, isInColorFamily } from "@/lib/colors";

/** The fields a figure may read. Structural, not the Drizzle row type, so a new
 *  column no metric consults cannot ripple into this layer or its tests. */
export type FigureItem = Categorised & {
  id: string;
  name: string;
  brand: string | null;
  color: string | null;
  material: string | null;
  tags: string[];
  pricePaidCents: number | null;
  purchasedAt: string | null;
  priorWears: number | null;
  wearEvents: { wornAt: string }[];
  favorite: boolean;
  archivedAt: string | null;
  storageLocation: string | null;
  createdAt: Date;
};

/** A figure plus the base it was computed over (VAL-FIG-03). `excluded` is the
 *  number of pieces that had to be left out for want of data — a caller shows
 *  it rather than letting a partial figure pose as a complete one. */
export type Derived<T> = {
  value: T;
  /** Pieces the figure is computed over. */
  base: number;
  /** Pieces in scope but excluded for missing data. */
  excluded: number;
};

/** Total wears: the owner's recalled count plus logged events, always both
 *  (VAL-FIG-10, #69). An unrecorded prior count contributes nothing — but see
 *  `wearRecorded`, because "contributes nothing" is not the same as "is zero". */
export function wearTotal(item: Pick<FigureItem, "priorWears" | "wearEvents">): number {
  return (item.priorWears ?? 0) + item.wearEvents.length;
}

/**
 * Whether anything is *known* about how often a piece has been worn (#191).
 *
 * The distinction the schema now carries: `prior_wears = NULL` with no logged
 * events means nobody has said — a gap to fill. `prior_wears = 0` means the
 * owner said "never worn" — a finding, and often an interesting one. Both give
 * `wearTotal === 0`, so any figure about wear must ask this before treating a
 * zero as a measurement.
 */
export function wearRecorded(item: Pick<FigureItem, "priorWears" | "wearEvents">): boolean {
  return item.priorWears != null || item.wearEvents.length > 0;
}

/**
 * Cost per wear in cents, or `null` when it is not defined (VAL-FIG-07).
 *
 * Deliberately unlike the browse sort, which divides by `max(1, wears)` so an
 * unworn piece still orders sensibly. That is right for ordering and wrong
 * here: a leaderboard that showed an unworn €400 coat as "€400 per wear" would
 * assert something the data does not say. Undefined stays undefined.
 */
export function costPerWear(item: FigureItem): number | null {
  const wears = wearTotal(item);
  if (item.pricePaidCents == null || wears === 0) return null;
  return item.pricePaidCents / wears;
}

/** The active wardrobe — the default base for every figure (VAL-FIG-01). */
export function active(items: FigureItem[]): FigureItem[] {
  return items.filter((i) => i.archivedAt == null);
}

/** Restrict to a purchase year. Pieces with no purchase date drop out, which is
 *  why the caller reports them as excluded (VAL-FIG-03). */
export function inYear(items: FigureItem[], year: number): FigureItem[] {
  return items.filter((i) => i.purchasedAt != null && purchaseYear(i) === year);
}

function purchaseYear(item: FigureItem): number | null {
  return item.purchasedAt ? Number(item.purchasedAt.slice(0, 4)) : null;
}

// --- Overview ---------------------------------------------------------------

export type Overview = {
  pieces: number;
  totalValueCents: Derived<number>;
  categoriesInUse: number;
  averagePriceCents: Derived<number>;
  addedThisYear: number;
  favourites: number;
};

/** The headline tiles. `thisYear` is passed in rather than read from the clock,
 *  so the figure is reproducible in a test and stable within a request. */
export function overview(items: FigureItem[], thisYear: number): Overview {
  const priced = items.filter((i) => i.pricePaidCents != null);
  const total = priced.reduce((sum, i) => sum + (i.pricePaidCents ?? 0), 0);
  const excludedFromPrice = items.length - priced.length;

  return {
    pieces: items.length,
    totalValueCents: { value: total, base: priced.length, excluded: excludedFromPrice },
    categoriesInUse: CATEGORIES.filter((c) => items.some(categoryMatcher(c.slug))).length,
    averagePriceCents: {
      value: priced.length === 0 ? 0 : Math.round(total / priced.length),
      base: priced.length,
      excluded: excludedFromPrice,
    },
    addedThisYear: items.filter((i) => purchaseYear(i) === thisYear).length,
    favourites: items.filter((i) => i.favorite).length,
  };
}

// --- Collection -------------------------------------------------------------

export type CategoryCount = { slug: string; label: string; count: number; isChild: boolean };

/**
 * The category breakdown, rolled up and deduplicated (VAL-FIG-02).
 *
 * Counts come from `categoryMatcher`, so a parent includes its descendants and
 * a cross-filed piece counts under each of its categories. That last part is
 * why these counts **do not sum** to the wardrobe size — the caller says so
 * (VAL-FIG-05) rather than quietly presenting a total that doesn't add up.
 */
export function collection(items: FigureItem[]): CategoryCount[] {
  return CATEGORIES.map((c) => ({
    slug: c.slug,
    label: c.label,
    count: items.filter(categoryMatcher(c.slug)).length,
    isChild: "parent" in c,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// --- Spending & acquisition -------------------------------------------------

export type YearRow = { year: number; pieces: number; spendCents: number };

/**
 * Acquisitions per year, oldest first, **including years with nothing** so the
 * shape of the timeline is truthful rather than compressed. Pieces with no
 * purchase date are excluded and counted.
 */
export function acquisitionByYear(items: FigureItem[]): Derived<YearRow[]> {
  const dated = items.filter((i) => i.purchasedAt != null);
  if (dated.length === 0) {
    return { value: [], base: 0, excluded: items.length };
  }

  const rows = new Map<number, YearRow>();
  for (const item of dated) {
    const year = purchaseYear(item)!;
    const row = rows.get(year) ?? { year, pieces: 0, spendCents: 0 };
    row.pieces += 1;
    row.spendCents += item.pricePaidCents ?? 0;
    rows.set(year, row);
  }

  const years = [...rows.keys()];
  const value: YearRow[] = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) {
    value.push(rows.get(y) ?? { year: y, pieces: 0, spendCents: 0 });
  }

  return { value, base: dated.length, excluded: items.length - dated.length };
}

export type BrandRow = { brand: string; pieces: number; spendCents: number };

/** Spend by brand, biggest first. Pieces with no brand are excluded and
 *  counted — an unbranded piece is not a brand called "Unknown". */
export function spendByBrand(items: FigureItem[], limit = 8): Derived<BrandRow[]> {
  const branded = items.filter((i) => i.brand != null && i.brand.trim() !== "");
  const rows = new Map<string, BrandRow>();
  for (const item of branded) {
    const brand = item.brand!.trim();
    const row = rows.get(brand) ?? { brand, pieces: 0, spendCents: 0 };
    row.pieces += 1;
    row.spendCents += item.pricePaidCents ?? 0;
    rows.set(brand, row);
  }
  const value = [...rows.values()]
    .sort((a, b) => b.spendCents - a.spendCents || a.brand.localeCompare(b.brand))
    .slice(0, limit);

  return { value, base: branded.length, excluded: items.length - branded.length };
}

/** The purchase years present in the data, newest first — for the year filter. */
export function purchaseYears(items: FigureItem[]): number[] {
  const years = new Set<number>();
  for (const item of items) {
    const y = purchaseYear(item);
    if (y != null) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * The complementary view (VAL-FIG-11): every piece counted **exactly once**,
 * under the top-level category its *primary* category belongs to. Unlike
 * `collection`, these rows sum to the wardrobe size.
 *
 * Both views are true and answer different questions. `collection` answers
 * "how much do I have that counts as knitwear", which must include a piece
 * filed primarily under tops. This answers "what is the wardrobe made of",
 * where each piece must be one thing or the totals mean nothing.
 */
export function collectionByPrimary(items: FigureItem[]): CategoryCount[] {
  const rootOf = (slug: string): string => {
    let s = slug;
    for (let p = parentOf(s); p; p = parentOf(s)) s = p;
    return s;
  };

  const counts = new Map<string, number>();
  for (const item of items) {
    const root = rootOf(item.category);
    counts.set(root, (counts.get(root) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([slug, count]) => ({
      slug,
      label: CATEGORIES.find((c) => c.slug === slug)?.label ?? slug,
      count,
      isChild: false,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// --- Wear & value -----------------------------------------------------------

export type WearSummary = {
  /** Pieces whose wear history is known at all (VAL-FIG-12). */
  recorded: number;
  /** Pieces nobody has said anything about — the Gaps module's biggest row. */
  notRecorded: number;
  /** Recorded, and genuinely never worn. A finding, not a gap (#191). */
  neverWorn: number;
  /** Total wears across the recorded pieces. */
  wears: number;
};

export function wearSummary(items: FigureItem[]): WearSummary {
  const recorded = items.filter(wearRecorded);
  return {
    recorded: recorded.length,
    notRecorded: items.length - recorded.length,
    neverWorn: recorded.filter((i) => wearTotal(i) === 0).length,
    wears: recorded.reduce((n, i) => n + wearTotal(i), 0),
  };
}

export type WearRow = {
  id: string;
  name: string;
  brand: string | null;
  wears: number;
  pricePaidCents: number | null;
  costPerWearCents: number | null;
};

const toRow = (i: FigureItem): WearRow => ({
  id: i.id,
  name: i.name,
  brand: i.brand,
  wears: wearTotal(i),
  pricePaidCents: i.pricePaidCents,
  costPerWearCents: costPerWear(i),
});

/** The most-worn pieces, over those with a recorded history (VAL-FIG-03). */
export function mostWorn(items: FigureItem[], limit = 8): Derived<WearRow[]> {
  const recorded = items.filter(wearRecorded);
  const value = recorded
    .map(toRow)
    .sort((a, b) => b.wears - a.wears || a.name.localeCompare(b.name))
    .slice(0, limit);
  return { value, base: recorded.length, excluded: items.length - recorded.length };
}

/**
 * Cost-per-wear leaderboards, both directions.
 *
 * The base is pieces where cost-per-wear is *defined* — priced and worn at
 * least once (VAL-FIG-07). An unworn piece is not "infinitely expensive per
 * wear"; it has no cost per wear, and belongs in the never-worn count instead.
 */
export function costPerWearLeaders(
  items: FigureItem[],
  limit = 5,
): Derived<{ best: WearRow[]; worst: WearRow[] }> {
  const rows = items.map(toRow).filter((r) => r.costPerWearCents != null);
  const byCpw = [...rows].sort((a, b) => a.costPerWearCents! - b.costPerWearCents!);
  return {
    value: { best: byCpw.slice(0, limit), worst: [...byCpw].reverse().slice(0, limit) },
    base: rows.length,
    excluded: items.length - rows.length,
  };
}

// --- Gaps -------------------------------------------------------------------

export type Gap = {
  /** Matches the browse `?missing=` value, so the count and the list it links
   *  to are always the same definition. */
  kind: "wears" | "price" | "date" | "material" | "berth" | "photo";
  label: string;
  count: number;
};

/**
 * What is missing, and how much of it (SPEC-FIGURES-FUNC §2.5).
 *
 * Not a chart and not a scolding: every row is a task, and acting on one makes
 * some other module truer. `hasPhoto` is passed in because photos are a
 * separate table the metric layer deliberately does not know about.
 */
export function gaps(items: FigureItem[], hasPhoto: (id: string) => boolean): Gap[] {
  const blank = (s: string | null) => s == null || s.trim() === "";
  return [
    {
      kind: "wears",
      label: "No wear history recorded",
      count: items.filter((i) => !wearRecorded(i)).length,
    },
    { kind: "price", label: "No price", count: items.filter((i) => i.pricePaidCents == null).length },
    { kind: "date", label: "No purchase date", count: items.filter((i) => i.purchasedAt == null).length },
    { kind: "material", label: "No material", count: items.filter((i) => blank(i.material)).length },
    { kind: "berth", label: "No berth", count: items.filter((i) => blank(i.storageLocation)).length },
    { kind: "photo", label: "No photo", count: items.filter((i) => !hasPhoto(i.id)).length },
  ].filter((g) => g.count > 0) as Gap[];
}

// --- Colour & fabric --------------------------------------------------------

export type FamilyRow = { key: string; label: string; count: number; swatch?: string };

/**
 * Colour distribution by family, using the same keyword matching as the browse
 * colour filter (#105) — so a family here and the same family in browse always
 * agree. A colour matching no family is counted as unclassified rather than
 * forced into "other".
 */
export function colourFamilies(items: FigureItem[]): Derived<FamilyRow[]> {
  const classified = new Set<string>();
  const value = COLOR_FAMILIES.map((f) => {
    const matches = items.filter((i) => {
      // Through the shared rule (#211), so Figures and the browse filter can
      // never disagree about which family a colour is in.
      const hit = isInColorFamily(i.color, f.key);
      if (hit) classified.add(i.id);
      return hit;
    });
    return { key: f.key, label: f.label, count: matches.length, swatch: f.swatch };
  })
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { value, base: classified.size, excluded: items.length - classified.size };
}

/** Material families, matched on the free-text composition. */
const MATERIAL_FAMILIES: { key: string; label: string; keywords: string[] }[] = [
  { key: "wool", label: "Wool & cashmere", keywords: ["wool", "cashmere", "merino", "alpaca", "mohair"] },
  { key: "cotton", label: "Cotton", keywords: ["cotton", "denim"] },
  { key: "linen", label: "Linen", keywords: ["linen", "flax"] },
  { key: "silk", label: "Silk", keywords: ["silk"] },
  { key: "viscose", label: "Viscose & lyocell", keywords: ["viscose", "lyocell", "tencel", "modal", "rayon", "cupro"] },
  { key: "synthetic", label: "Synthetic", keywords: ["polyester", "polyamide", "nylon", "elastane", "spandex", "acrylic"] },
  { key: "leather", label: "Leather", keywords: ["leather", "suede", "shearling"] },
  { key: "down", label: "Down & feather", keywords: ["down", "feather"] },
];

/**
 * Material families parsed best-effort from the free-text composition.
 *
 * A blend counts in **every** family it names, so these **do not sum** to the
 * wardrobe (`VAL-FIG-05`) — a wool-silk piece is honestly both. Pieces with no
 * material recorded are excluded and counted, never filed under "other", which
 * would turn missing data into a finding.
 */
export function materialFamilies(items: FigureItem[]): Derived<FamilyRow[]> {
  const withMaterial = items.filter((i) => (i.material ?? "").trim() !== "");
  const value = MATERIAL_FAMILIES.map((f) => ({
    key: f.key,
    label: f.label,
    count: withMaterial.filter((i) => {
      const m = i.material!.toLowerCase();
      return f.keywords.some((kw) => m.includes(kw));
    }).length,
  }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { value, base: withMaterial.length, excluded: items.length - withMaterial.length };
}

// --- Care & season ----------------------------------------------------------

/** Counts for a fixed tag vocabulary, in the vocabulary's own order — care runs
 *  easy → demanding, seasons run spring → winter, and neither is re-sorted by
 *  size, because the order carries meaning. A piece may hold several tags from
 *  the group, so these do not sum (`VAL-FIG-05`). */
function tagCounts(items: FigureItem[], kind: string): Derived<FamilyRow[]> {
  const group = TAG_GROUPS.find((g) => g.kind === kind);
  const tags: readonly string[] = group?.tags ?? [];
  const tagged = items.filter((i) => i.tags.some((t) => tags.includes(t)));
  const value = tags.map((t) => ({
    key: t,
    label: t.replace(/-/g, " "),
    count: items.filter((i) => i.tags.includes(t)).length,
  }));
  return { value, base: tagged.length, excluded: items.length - tagged.length };
}

export const careSplit = (items: FigureItem[]) => tagCounts(items, "care");
export const seasonCoverage = (items: FigureItem[]) => tagCounts(items, "season");
