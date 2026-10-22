/**
 * A trip's days (#270).
 *
 * The one place the date range becomes a list of days. The planner, the packing
 * list and the printable sheet all read it, for the reason `packingGroups`
 * exists (#259): three surfaces that derived the same thing independently would
 * eventually derive it differently, and a packing plan that changes depending on
 * which button you pressed is a quietly confusing bug.
 *
 * **Dates here are plain calendar days, never instants.** `start_date` and
 * `end_date` are Postgres `date` columns holding `YYYY-MM-DD`, and a trip that
 * starts on the 3rd starts on the 3rd in Copenhagen and in Kyoto alike. So
 * the arithmetic is done in UTC and the strings are sliced, never formatted
 * through a local-time `Date` — which is how a trip loses or gains a day for
 * anyone east or west of the server.
 */

export type TripDay = {
  /** `YYYY-MM-DD` — the value stored in `trip_item_days.day`. */
  iso: string;
  /** "Mon 3 Aug" — enough to plan by, short enough for a column heading. */
  label: string;
  /** "Day 1", for a trip whose dates say nothing about which day is which. */
  ordinal: number;
};

const MS_PER_DAY = 86_400_000;
/** How long a trip may be before this refuses to enumerate it. A packing plan
 *  is a per-day list; past a few weeks that is not a useful page, and an
 *  accidental year in the end date should not render 365 groups. */
export const MAX_TRIP_DAYS = 60;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Parse `YYYY-MM-DD` as a UTC midnight, or null if it is not a plain day. */
function utcDay(iso: string | null | undefined): number | null {
  if (!iso || !ISO.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Every day of the trip, inclusive of both ends.
 *
 * Empty when either date is missing, when the end precedes the start, or when
 * the range is longer than `MAX_TRIP_DAYS` — three cases the caller must be
 * able to tell apart from "a trip with no days", which is why the view asks
 * `tripDays(...).length === 0` and then says *why* rather than rendering an
 * empty frame.
 */
export function tripDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): TripDay[] {
  const start = utcDay(startDate);
  const end = utcDay(endDate);
  if (start === null || end === null || end < start) return [];

  const count = Math.round((end - start) / MS_PER_DAY) + 1;
  if (count > MAX_TRIP_DAYS) return [];

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start + i * MS_PER_DAY);
    return {
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      ordinal: i + 1,
    };
  });
}

/** Whether a day belongs to this trip. A stored assignment can outlive the
 *  dates that produced it — shortening a trip must not leave a piece filed
 *  under a day the trip no longer has, silently invisible. */
export function isTripDay(days: readonly TripDay[], iso: string): boolean {
  return days.some((d) => d.iso === iso);
}
