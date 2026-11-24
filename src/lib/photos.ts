/**
 * Pure helpers for browsing a set of photos (#195).
 *
 * Kept out of the viewer component so the navigation rule is testable at the
 * L1 tier: no DOM, no Next runtime (#183). The viewer's zoom and pan are
 * gesture-bound and stay manually verified.
 */

/**
 * Move `index` by `delta` within a list of `length`, wrapping at both ends.
 *
 * JavaScript's `%` keeps the sign of the dividend, so the naive form yields a
 * negative index when stepping back from the first photo, which would blank
 * the viewer. The double modulo normalises into `[0, length)`.
 */
export function stepIndex(index: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((index + delta) % length) + length) % length;
}

/** The subset of a photo the caption and ordering rules need (#244). */
export type Dated = {
  takenOn?: string | null;
  place?: string | null;
  sort?: number | null;
  isPrimary?: boolean | null;
};

/**
 * The one-line caption for a photo: when, where, or both (#244).
 *
 * Returns `null` when neither is recorded, which is the overwhelming majority:
 * retailer stills have no meaningful date or place. The caller renders
 * nothing at all rather than an empty line, for the same reason an item page
 * must not gain an empty section.
 *
 * The date is shown exactly as stored, `2015-10-31` (#249). Every other date in
 * the app is ISO ("Purchased", "Return by", the wear log), so a long English
 * date was the one inconsistency, and it dressed up values that are often
 * approximate anyway (see the owner's "18" proxy for a remembered month).
 *
 * Rendering the stored string also means **no `Date` is ever constructed**, so
 * the timezone hazard that came with formatting simply cannot occur: building a
 * date from an ISO string lands a day early west of Greenwich, and a photo
 * taken on the 7th was captioned the 6th. The bug is now absent rather than
 * guarded.
 */
export function photoCaption(photo: Dated): string | null {
  const when = photo.takenOn?.trim() || null;
  const where = photo.place?.trim() || null;
  if (!when && !where) return null;
  if (when && where) return `${where} · ${when}`;
  return (when ?? where) as string;
}

/**
 * Photos in the order they should be shown (#244).
 *
 * Three rules, in this order of authority:
 *
 *   1. **The cover leads.** It is a deliberate choice by the owner and outranks
 *      any date (#56).
 *   2. **Then oldest first, where a date is known.** A garment's gallery should
 *      read as a history: what it looked like new, then how it has been worn.
 *   3. **Undated photos keep their existing `sort`, and follow the dated ones.**
 *      Not "unknown date = very old": most undated photos here are retailer
 *      stills, and sinking them below real memories is wrong, but so is
 *      guessing where among them they belong.
 */
export function inPhotoOrder<T extends Dated>(photos: readonly T[]): T[] {
  return [...photos].sort((a, b) => {
    if (Boolean(a.isPrimary) !== Boolean(b.isPrimary)) return a.isPrimary ? -1 : 1;
    const ad = a.takenOn ?? null;
    const bd = b.takenOn ?? null;
    if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return (a.sort ?? 0) - (b.sort ?? 0);
  });
}
