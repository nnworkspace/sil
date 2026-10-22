/**
 * Packing-plan helpers (specs/trips §2.1, VAL-TRIP-10..12). The plan is a soft,
 * editable scaffold: per-category target counts. Defaults are tunable here.
 */

import { z } from "zod";

import { CATEGORIES, TOP_LEVEL_CATEGORIES, parentOf } from "@/lib/categories";

const CATEGORY_SLUGS = new Set<string>(CATEGORIES.map((c) => c.slug));

export type TripPlanSlot = { category: string; target: number };

/** A packing plan — de-duplicated by category, each target 0–99 (VAL-TRIP-10/11). */
export const tripPlanSchema = z
  .array(
    z.object({
      category: z.string().refine((s) => CATEGORY_SLUGS.has(s), "Unknown category"),
      target: z.number().int().min(0).max(99),
    }),
  )
  .transform((slots) => {
    const seen = new Set<string>();
    return slots.filter((s) => (seen.has(s.category) ? false : (seen.add(s.category), true)));
  });

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The top-level category a slug rolls up to (walks `parent`, depth-safe). */
export function rootCategory(slug: string): string {
  let s = slug;
  for (let i = 0; i < 8; i++) {
    const p = parentOf(s);
    if (!p) break;
    s = p;
  }
  return s;
}

/** Default target for a top-level category given trip length + type; 0 = omit.
 *  Tunable — a sensible starting point only; the owner edits every target. */
const DEFAULT_TARGET: Record<string, (days: number, type: string) => number> = {
  tops: (d, t) => clamp(t === "business" ? d : Math.ceil(d * 0.75), 1, 7),
  knitwear: (d) => (d >= 4 ? 2 : 1),
  trousers: (d) => clamp(Math.ceil(d / 2), 1, 4),
  skirts: (d, t) => (t === "vacation" ? clamp(Math.ceil(d / 3), 1, 3) : 0),
  dresses: (d, t) =>
    t === "business" ? clamp(Math.ceil(d / 4), 0, 2) : clamp(Math.ceil(d / 2), 1, 4),
  outerwear: () => 1,
  shoes: () => 2,
  bags: () => 1,
};

/** Suggest a starter plan from trip length + type, over the top-level categories
 *  the wardrobe actually uses (`present`). Returned in CATEGORIES order. */
export function suggestPlan(days: number, type: string, present: Set<string>): TripPlanSlot[] {
  const d = clamp(Math.round(days) || 1, 1, 60);
  const slots: TripPlanSlot[] = [];
  for (const c of TOP_LEVEL_CATEGORIES) {
    if (!present.has(c.slug)) continue;
    const target = DEFAULT_TARGET[c.slug]?.(d, type) ?? 0;
    if (target > 0) slots.push({ category: c.slug, target });
  }
  return slots;
}
