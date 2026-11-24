/**
 * Parse & validate the browse view's URL params (SPEC-BROWSE-INT §2).
 *
 * The `/browse` route carries all state in the query string so a filtered view
 * is shareable and survives refresh (`VAL-BROWSE-06`). Unknown tags and
 * malformed params are ignored, never an error (`VAL-BROWSE-02`).
 */

import { ALL_TAGS } from "@/lib/categories";
import { COLOR_FAMILY_KEYS } from "@/lib/colors";
import { MATERIAL_KEYS } from "@/lib/materials";
import { SORT_VALUES, DEFAULT_SORT } from "@/lib/sort";

const TAG_SET = new Set<string>(ALL_TAGS);
const COLOR_SET = new Set<string>(COLOR_FAMILY_KEYS);
const MATERIAL_SET = new Set<string>(MATERIAL_KEYS);
const SORT_SET = new Set<string>(SORT_VALUES);
/** Data gaps the Figures dashboard links to (#181): `?missing=price` lists the
 *  pieces with no price, so a gap is something to act on rather than a count to
 *  look at. */
export const MISSING_KINDS = ["price", "wears", "date", "material", "berth", "photo"] as const;
export type MissingKind = (typeof MISSING_KINDS)[number];
const MISSING_SET = new Set<string>(MISSING_KINDS);
const MAX_Q = 100;

export type BrowseParams = {
  tags: string[];
  q: string;
  colors: string[];
  /** Fibres selected from the Compendium's vocabulary (#263). */
  materials: string[];
  sort: string;
  /** "Favourites only" (#135): `?favorite=1`. */
  favorite: boolean;
  /** A data gap to list: `?missing=price` (#181). */
  missing: MissingKind | null;
};

/**
 * Every filter off: the whole active wardrobe, in default order.
 *
 * Four callers want this (the trip planner, the plan actions, the look and trip
 * pages) and each used to spell out all six fields. Adding the material facet
 * broke all four at once, which is the argument for naming it: a new facet is
 * now one line here rather than a compile error in five files.
 */
export const NO_FILTERS: BrowseParams = {
  tags: [],
  q: "",
  colors: [],
  materials: [],
  sort: DEFAULT_SORT,
  favorite: false,
  missing: null,
};

type RawParams = Record<string, string | string[] | undefined>;

function multi(raw: string | string[] | undefined, allowed: Set<string>): string[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return [...new Set(list.filter((t): t is string => typeof t === "string" && allowed.has(t)))];
}

/** Read `?tag=…&color=…&q=…` into a validated { tags, colors, q }. Unknown
 *  values are ignored, never an error (VAL-BROWSE-02). */
export function parseBrowseParams(sp: RawParams): BrowseParams {
  const tags = multi(sp.tag, TAG_SET);
  const colors = multi(sp.color, COLOR_SET);
  // Fibres, from the Compendium's own vocabulary (#263).
  const materials = multi(sp.material, MATERIAL_SET);

  const qraw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qraw ?? "").trim().slice(0, MAX_Q);

  const sraw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = sraw && SORT_SET.has(sraw) ? sraw : DEFAULT_SORT;

  const fraw = Array.isArray(sp.favorite) ? sp.favorite[0] : sp.favorite;
  const favorite = fraw === "1" || fraw === "true";

  const mraw = Array.isArray(sp.missing) ? sp.missing[0] : sp.missing;
  const missing = mraw && MISSING_SET.has(mraw) ? (mraw as MissingKind) : null;

  return { tags, q, colors, materials, sort, favorite, missing };
}
