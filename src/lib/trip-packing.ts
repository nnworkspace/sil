import { TOP_LEVEL_CATEGORIES } from "@/lib/categories";
import { rootCategory } from "@/lib/trips";
import type { TripDay } from "@/lib/trip-days";

/**
 * Grouping a trip's pieces for a packing list (#259).
 *
 * Extracted because the Markdown export and the printable sheet had grown the
 * same twelve lines independently, and a packing list that groups differently
 * depending on which button you pressed would be a quietly confusing bug.
 *
 * Two decisions worth stating, because both are choices rather than defaults:
 *
 *   - **Grouped by the roll-up of the piece's primary category** (#286). A
 *     shirt dress appears under Dresses, a bolero under Tops.
 *
 *     This is the reverse of what #259 decided, and that decision was reasoned
 *     wrongly. It argued that "a piece must appear exactly once, and its
 *     primary category is the one place it certainly belongs" — but that risk
 *     belongs to **secondary** categories, which really would duplicate a
 *     piece. Rolling the **primary** up cannot: every piece has exactly one
 *     primary, so it lands in exactly one top-level group.
 *
 *     And the fine grouping cost something real. A wardrobe of a few hundred pieces
 *     wants precision; a suitcase of twelve wants to know it holds four
 *     dresses, not one dress and three shirt dresses with the shoes between
 *     them.
 *   - **In `TOP_LEVEL_CATEGORIES` order, not alphabetically.** That order is roughly how
 *     a wardrobe is walked — dresses, tops, trousers, outerwear, shoes — so the
 *     sheet reads in the order things are actually picked up.
 *   - **Inside a group, by the day a piece is first worn** (#288), falling back
 *     to name when the trip has no day plan. See `dayOrder`.
 */

export type PackableItem = { category: string; name: string };

/** What a row optionally carries about *when* it is worn (#270). Every field is
 *  optional, so a caller with no day plan passes exactly what it always did. */
export type Scheduled = {
  everyDay?: boolean;
  days?: readonly { day: string }[];
};

export type PackingRow<T> = { item: PackableItem } & T;

export type PackingGroup<T> = {
  slug: string;
  label: string;
  rows: PackingRow<T>[];
};

/**
 * A trip's pieces, grouped by category and sorted by name within each.
 *
 * Empty groups are dropped: a heading with nothing under it is noise on screen
 * and wasted paper in print.
 */
/**
 * Where a piece sits in the trip's sequence — the index of the **first** day it
 * is worn, or `null` if it has no day (#288).
 *
 * An **every-day** piece keys on day 1, because that is literally its first
 * wear day. The owner's rule was "order it based on its first wear-day", and
 * taking that at its word beats inventing a special case: the pumps land beside
 * whatever else starts on Monday, and the name tie-break settles the rest.
 *
 * A stored day **outside the trip's range** is ignored rather than treated as
 * day zero — shortening a trip strands assignments (#270), and a stranded one
 * must not silently drag a piece to the top of the list.
 */
function dayOrder(row: Scheduled, days: readonly TripDay[]): number | null {
  if (days.length === 0) return null;
  if (row.everyDay) return 0;
  const idx = (row.days ?? [])
    .map((d) => days.findIndex((x) => x.iso === d.day))
    .filter((i) => i >= 0);
  return idx.length > 0 ? Math.min(...idx) : null;
}

/**
 * @param days the trip's days, when it has a plan. Empty ⇒ name order, which is
 *   the only sensible sequence for a trip that has not been planned by day.
 */
export function packingGroups<T extends Scheduled>(
  rows: readonly PackingRow<T>[],
  days: readonly TripDay[] = [],
): PackingGroup<T>[] {
  const compare = (a: PackingRow<T>, b: PackingRow<T>) => {
    const da = dayOrder(a, days);
    const db = dayOrder(b, days);
    // Undated pieces go last: they have no place in the sequence yet, and
    // leading with them would hide the sequence the rest of the list is in.
    if (da !== db) {
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    }
    return a.item.name.localeCompare(b.item.name);
  };

  return TOP_LEVEL_CATEGORIES.map((cat) => ({
    slug: cat.slug,
    label: cat.label,
    rows: rows.filter((r) => rootCategory(r.item.category) === cat.slug).sort(compare),
  })).filter((g) => g.rows.length > 0);
}
