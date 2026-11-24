import { CATEGORIES } from "@/lib/categories";
import { parseBerth, type PlaceKind, type Unit } from "@/lib/compendium/berth";

/**
 * What a berth holds, in a few words (#219).
 *
 * The summary is **derived on every render**, never stored: a written-down
 * blurb would be wrong the first time a piece moved shelf, and nobody would
 * notice. This function is pure so that rule is cheap to keep and cheap to test.
 *
 * It reads **primary categories only**, and that is deliberate. A piece also
 * carries secondary categories (#71, #206): a shirt is filed under `tops` as
 * well, so summarising over both would make almost every berth read "tops,
 * shirts". The parent adds no information once the child is named. Anyone
 * "fixing" this to use `categoryMatcher` would be making the line useless.
 */

const LABELS = new Map(CATEGORIES.map((c) => [c.slug as string, c.label as string]));

export type BerthSummary = {
  /** The commonest categories, at most `max`, already in display form. */
  parts: string[];
  /** How many further distinct categories were left out. */
  extra: number;
};

/**
 * Summarise a berth from the primary categories of the pieces in it.
 *
 * Ordered by how many pieces each category holds, then alphabetically. The tie
 * break matters: without it the two halves of an even split would swap places
 * between renders for no reason a reader could see.
 */
export function summariseBerth(
  categories: readonly string[],
  max = 2,
): BerthSummary {
  const counts = new Map<string, number>();
  for (const slug of categories) {
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .map(([slug, n]) => ({ label: LABELS.get(slug) ?? slug, n }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));

  return {
    // Lower case: this is a quiet second line under the code, not a heading.
    parts: ranked.slice(0, max).map((r) => r.label.toLowerCase()),
    extra: Math.max(0, ranked.length - max),
  };
}

/** The summary as one string, or `null` when there is nothing to say, so a
 *  caller renders no line at all rather than an empty one or a bare "+0". */
export function formatBerthSummary(categories: readonly string[], max = 2): string | null {
  const { parts, extra } = summariseBerth(categories, max);
  if (parts.length === 0) return null;
  return extra > 0 ? `${parts.join(", ")} +${extra}` : parts.join(", ");
}

/**
 * Order berths the way the notation reads: room, then wardrobe, then rack, then
 * place, then position (#227), so the list is a walk through the room rather
 * than a leaderboard.
 *
 * **Numeric, not lexical, and that is the whole point.** Every wardrobe, rack
 * and shelf number in the catalogue is a single digit today, so a plain string
 * compare happens to give the right answer:
 *
 *     lexical:   R1-W7R2-S10   R1-W7R2-S2   R1-W7R2-S3
 *     correct:   R1-W7R2-S2    R1-W7R2-S3   R1-W7R2-S10
 *
 * The first double-digit shelf makes the lexical version wrong, and nothing
 * would fail: the list would simply be in the wrong order, quietly.
 *
 * A code that does not parse sorts last but is never dropped: `VAL-COMP-12`
 * says such a code is still a berth, and the catalogue is what is true.
 */

/** Kind order as the grammar table documents it: shelf, drawer, hanging rail. */
const PLACE_ORDER: Record<PlaceKind, number> = { shelf: 0, drawer: 1, rail: 2 };

/** Wardrobes before cabinets: the order the grammar table lists them in. */
const UNIT_ORDER: Record<Unit["kind"], number> = { wardrobe: 0, cabinet: 1 };

/** Furniture with no subdivision sorts as though it were rack 0, so an
 *  undivided cabinet comes before C1R1 rather than ordering unpredictably. */
const rackNumber = (u: Unit) => u.rack ?? 0;

export function compareBerths(a: string, b: string): number {
  const pa = parseBerth(a);
  const pb = parseBerth(b);

  // Unparsed codes keep their own alphabetical order, after everything else.
  if (!pa || !pb) return !pa && !pb ? a.localeCompare(b) : pa ? -1 : 1;

  return (
    pa.room - pb.room ||
    // Wardrobes before cabinets, then by number within each (#251). Comparing
    // the kind first is what keeps the order total once a room holds both: two
    // different kinds of unit have no shared numbering to compare.
    UNIT_ORDER[pa.unit.kind] - UNIT_ORDER[pb.unit.kind] ||
    pa.unit.index - pb.unit.index ||
    rackNumber(pa.unit) - rackNumber(pb.unit) ||
    PLACE_ORDER[pa.place.kind] - PLACE_ORDER[pb.place.kind] ||
    pa.place.index - pb.place.index ||
    // No position means the whole shelf, which comes before any part of it.
    (pa.position ? 1 : 0) - (pb.position ? 1 : 0) ||
    (pa.position ?? "").localeCompare(pb.position ?? "") ||
    // A box inside the place sorts after the loose contents of it (#277):
    // walking a drawer, you meet what is lying in it before what is boxed in it.
    (pa.container ? 1 : 0) - (pb.container ? 1 : 0) ||
    (pa.container ?? "").localeCompare(pb.container ?? "") ||
    // Same berth by every segment: fall back to the raw text so the order is
    // total, and sorting therefore stable and reversible.
    a.localeCompare(b)
  );
}
