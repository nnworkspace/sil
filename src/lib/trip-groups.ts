/**
 * Splitting the trips list into **coming** and **past** (#290).
 *
 * A pure function taking `today`, rather than reading the clock itself: a rule
 * that depends on the current date is otherwise testable only by freezing time,
 * and this one has boundaries worth pinning exactly.
 *
 * Two decisions that are choices, not defaults:
 *
 *   - **A trip happening right now is Coming.** The split is on the *end* date,
 *     so a trip that started yesterday and ends tomorrow is not filed with the
 *     finished ones. You are still on it, and it is still the card you want.
 *   - **An undated trip is Coming**, and sorts last within it. A trip with no
 *     dates is one you have not planned yet, not one you have finished.
 *
 * "Nearest to furthest" reads in opposite directions on either side of today:
 * Coming ascends (soonest first) and Past descends (most recent first). Both
 * put the trip nearest to today at the top, which is the same rule seen from
 * two sides.
 */

export type TimedTrip = { startDate: string | null; endDate: string | null };

/** Today as a plain calendar day. The one place the clock is read, so the rule
 *  above stays pure and testable. */
export const todayISO = () => new Date().toISOString().slice(0, 10);

export type TripGroup<T> = { key: "coming" | "past"; label: string; trips: T[] };

/** The date a trip is judged by: when it ends, or when it starts if it has no
 *  end, or nothing at all. Plain `YYYY-MM-DD` strings compare correctly as
 *  text, which is why no Date is constructed (see `trip-days.ts` for why a
 *  calendar day must never become an instant). */
const lastDay = (t: TimedTrip) => t.endDate ?? t.startDate;
const firstDay = (t: TimedTrip) => t.startDate ?? t.endDate;

export function groupTripsByTime<T extends TimedTrip>(
  trips: readonly T[],
  today: string,
): TripGroup<T>[] {
  const past: T[] = [];
  const coming: T[] = [];

  for (const t of trips) {
    const end = lastDay(t);
    if (end && end < today) past.push(t);
    else coming.push(t);
  }

  // Undated trips have no place in a sequence, so they go last rather than
  // first: leading with them would hide the order the rest are in.
  coming.sort((a, b) => {
    const x = firstDay(a);
    const y = firstDay(b);
    if (!x && !y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    return x.localeCompare(y);
  });

  past.sort((a, b) => (lastDay(b) ?? "").localeCompare(lastDay(a) ?? ""));

  return [
    { key: "coming", label: "Coming", trips: coming },
    { key: "past", label: "Past", trips: past },
  ].filter((g) => g.trips.length > 0) as TripGroup<T>[];
}
