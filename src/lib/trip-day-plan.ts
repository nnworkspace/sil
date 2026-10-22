import { tripDays, type TripDay } from "@/lib/trip-days";

/**
 * A trip's pieces arranged by day (#270).
 *
 * The counterpart to `packingGroups`, which arranges the same pieces by
 * category. Both exist because they answer different questions: a suitcase is
 * *packed* by category and a trip is *lived* by day, and the owner wanted both
 * without one replacing the other.
 *
 * Four kinds of group come out, in this order, and each earns its place:
 *
 *   1. **Across all days** — the shoes, the blazer, the earrings. Things that
 *      serve the whole trip and would be silly to file under a date.
 *   2. **One group per day** of the trip, including the empty ones: an empty
 *      Thursday is the most useful thing this view can tell you.
 *   3. **Unscheduled** — packed, but not yet placed. Every piece in every trip
 *      that existed before this feature starts here, so it must be visible or
 *      they vanish without being gone.
 *   4. **Orphaned days** — assignments whose date is no longer inside the trip,
 *      which happens the moment someone shortens a trip. Shown, and labelled,
 *      rather than silently dropped: the piece is still packed and the plan
 *      still says something about it.
 */

export type DayAssigned = { day: string };
export type PlannableItem<T> = { itemId: string; everyDay: boolean; days: DayAssigned[] } & T;

export type DayGroup<T> = {
  /** `all` | an ISO day | `unscheduled` | `orphan` — stable, and used as a key. */
  key: string;
  label: string;
  /** The ISO day a piece would be assigned to by adding it here; null when the
   *  group is not a day (so the picker knows whether it can add). */
  day: string | null;
  kind: "all" | "day" | "unscheduled" | "orphan";
  rows: PlannableItem<T>[];
};

export type DayPlan<T> = {
  days: TripDay[];
  groups: DayGroup<T>[];
  /** Why there are no day groups, when there are none. `null` ⇒ there are. */
  noDaysReason: "no-dates" | "bad-range" | "too-long" | null;
};

/** Why `tripDays` came back empty — the view says which, rather than showing an
 *  empty frame and leaving the owner to guess what it wants from them. */
function reasonFor(start: string | null, end: string | null): DayPlan<never>["noDaysReason"] {
  if (!start || !end) return "no-dates";
  if (end < start) return "bad-range";
  return "too-long";
}

export function dayPlan<T>(
  trip: { startDate: string | null; endDate: string | null },
  rows: readonly PlannableItem<T>[],
  sortBy: (a: PlannableItem<T>, b: PlannableItem<T>) => number,
): DayPlan<T> {
  const days = tripDays(trip.startDate, trip.endDate);
  const dayKeys = new Set(days.map((d) => d.iso));
  const sorted = (list: PlannableItem<T>[]) => [...list].sort(sortBy);

  const groups: DayGroup<T>[] = [];

  groups.push({
    key: "all",
    label: "Across all days",
    day: null,
    kind: "all",
    rows: sorted(rows.filter((r) => r.everyDay)),
  });

  for (const d of days) {
    groups.push({
      key: d.iso,
      label: d.label,
      day: d.iso,
      kind: "day",
      rows: sorted(rows.filter((r) => r.days.some((x) => x.day === d.iso))),
    });
  }

  // Packed, but placed nowhere. Deliberately **not** merged into "Across all
  // days": "I haven't decided" and "this is for the whole trip" are different
  // states, and conflating them would make the second one meaningless.
  //
  // The test is "no day assignments at all", not "no assignment in range". A
  // piece whose only day fell outside a shortened trip has been placed — it is
  // an orphan, below — and listing it here as well would show it twice.
  groups.push({
    key: "unscheduled",
    label: "Not scheduled yet",
    day: null,
    kind: "unscheduled",
    rows: sorted(rows.filter((r) => !r.everyDay && r.days.length === 0)),
  });

  const orphans = rows.filter(
    (r) => r.days.length > 0 && r.days.some((x) => !dayKeys.has(x.day)),
  );
  if (orphans.length > 0 && days.length > 0) {
    groups.push({
      key: "orphan",
      label: "Planned for a day this trip no longer has",
      day: null,
      kind: "orphan",
      rows: sorted(orphans),
    });
  }

  return { days, groups, noDaysReason: days.length > 0 ? null : reasonFor(trip.startDate, trip.endDate) };
}

/**
 * Which days a piece is planned for, as short labels, for the packing list.
 *
 * The point of repeat-wear: the trousers appear under Monday *and* Wednesday in
 * the planner, but the packing list must show **one line, ticked once**, and
 * say "(Mon, Wed)" beside it. The list is what goes in the suitcase.
 */
export function dayLabelsFor(
  days: readonly TripDay[],
  row: { everyDay: boolean; days: DayAssigned[] },
): string[] {
  if (row.everyDay) return ["every day"];
  return days.filter((d) => row.days.some((x) => x.day === d.iso)).map((d) => d.label.split(" ")[0]);
}
