import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Pin, X } from "lucide-react";

import {
  assignToDay,
  addToEveryDay,
  unassignFromDay,
  setEveryDay,
  clearOrphanedDays,
} from "@/app/trips/day-actions";
import { dayPlan, type PlannableItem } from "@/lib/trip-day-plan";
import { MAX_TRIP_DAYS } from "@/lib/trip-days";
import { cn } from "@/lib/utils";
import { LogDayButton } from "@/components/log-day-button";
import { WardrobePicker, type PickerItem } from "@/components/wardrobe-picker";

/**
 * The trip planned by day (#270).
 *
 * The category plan answers *how much am I taking*; this answers *what am I
 * wearing on Tuesday*. Both are kept, switchable, because a suitcase is packed
 * by category and a trip is lived by day.
 *
 * Each day is a **plain list**, not a set of category slots. The owner was
 * explicit: "make each day's slots simple, do not need to be categorized,
 * simply let me pick pieces to add to the day". So there is no target, no
 * fill-count, and nothing to satisfy. A day is done when it looks done.
 *
 * A server component: every control is a Server-Action form, so the whole view
 * works before any JavaScript arrives.
 */

export type DayRow = PlannableItem<{
  name: string;
  brand: string | null;
  photoUrl: string | null;
}>;

const byName = (a: DayRow, b: DayRow) => a.name.localeCompare(b.name);

const NO_DAYS: Record<string, string> = {
  "no-dates": "This trip has no dates yet, so there are no days to plan.",
  "bad-range": "The end date is before the start date, so there are no days to plan.",
  "too-long": `This trip is longer than ${MAX_TRIP_DAYS} days, which is too long to plan a day at a time.`,
};

export function DayPlan({
  tripId,
  startDate,
  endDate,
  rows,
  pickerItems,
}: {
  tripId: string;
  startDate: string | null;
  endDate: string | null;
  rows: DayRow[];
  pickerItems: PickerItem[];
}) {
  const { days, groups, noDaysReason } = dayPlan({ startDate, endDate }, rows, byName);

  if (noDaysReason) {
    return (
      <div className="border border-dashed p-6 text-center">
        <CalendarDays className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{NO_DAYS[noDaysReason]}</p>
        <Link
          href={`/trips/${tripId}/edit`}
          className="mt-1 inline-block text-sm underline underline-offset-2"
        >
          Set the dates
        </Link>
      </div>
    );
  }

  const scheduled = rows.filter(
    (r) => r.everyDay || r.days.some((d) => days.some((x) => x.iso === d.day)),
  ).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {scheduled} of {rows.length} {rows.length === 1 ? "piece" : "pieces"} placed ·{" "}
        {days.length} {days.length === 1 ? "day" : "days"}
      </p>

      {groups.map((group) => {
        // An empty day is worth showing; an empty "not scheduled" or "orphaned"
        // group is not; those exist only to surface a problem.
        if (group.rows.length === 0 && group.kind !== "day" && group.kind !== "all") return null;

        return (
          <section
            key={group.key}
            className={cn("border p-3", group.kind === "orphan" && "border-dashed bg-muted/40")}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                {group.kind === "all" ? <Pin className="size-3.5 text-muted-foreground" /> : null}
                {group.label}
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  {group.rows.length || "—"}
                </span>
              </h3>

              {group.kind === "day" && group.rows.length > 0 ? (
                <LogDayButton
                  tripId={tripId}
                  day={group.day!}
                  label={group.label}
                  pieces={group.rows.map((r) => ({ itemId: r.itemId, name: r.name }))}
                />
              ) : null}

              {group.kind === "day" ? (
                <WardrobePicker
                  action={assignToDay}
                  contextField="tripId"
                  contextId={tripId}
                  extra={{ day: group.day! }}
                  items={pickerItems}
                  // Deliberately empty: a piece already on the trip can still be
                  // planned for another day, so nothing is "already added" here.
                  addedIds={[]}
                  triggerLabel="Add"
                  compact
                />
              ) : null}

              {group.kind === "all" ? (
                <WardrobePicker
                  action={addToEveryDay}
                  contextField="tripId"
                  contextId={tripId}
                  items={pickerItems}
                  addedIds={groups[0].rows.map((r) => r.itemId)}
                  triggerLabel="Add"
                  compact
                />
              ) : null}

              {group.kind === "orphan" ? (
                <form action={clearOrphanedDays}>
                  <input type="hidden" name="tripId" value={tripId} />
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Clear these
                  </button>
                </form>
              ) : null}
            </div>

            {group.rows.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                {group.kind === "day" ? "Nothing planned." : "Nothing here."}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {group.rows.map((r) => (
                  <li
                    key={`${group.key}-${r.itemId}`}
                    className="flex items-center gap-2 border bg-background py-1 pr-1 pl-2 text-sm"
                  >
                    {r.photoUrl ? (
                      <Image
                        src={r.photoUrl}
                        alt=""
                        width={24}
                        height={32}
                        className="size-6 shrink-0 object-cover"
                      />
                    ) : null}
                    <Link href={`/items/${r.itemId}`} className="max-w-52 truncate">
                      {r.name}
                    </Link>

                    {/* Remove from *this* group only. The piece stays packed:
                        taking it off Tuesday is not the same as not taking it. */}
                    <form
                      action={group.kind === "day" ? unassignFromDay : setEveryDay}
                      className="contents"
                    >
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="itemId" value={r.itemId} />
                      {group.kind === "day" ? (
                        <input type="hidden" name="day" value={group.day!} />
                      ) : (
                        <input type="hidden" name="everyDay" value="0" />
                      )}
                      <button
                        type="submit"
                        aria-label={`Remove ${r.name} from ${group.label}`}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            {/* From "not scheduled yet", the useful next move is usually
                "this one is for the whole trip", offered inline. */}
            {group.kind === "unscheduled" && group.rows.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Use <span className="font-medium">Add</span> on a day above to place these, or move
                one to <span className="font-medium">Across all days</span>.
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
