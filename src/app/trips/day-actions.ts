"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { trips, tripItems, tripItemDays } from "@/db/schema";
import { tripDays, isTripDay } from "@/lib/trip-days";

/**
 * Planning a trip by day (#270).
 *
 * Every action here is **idempotent and additive**: assigning a piece to a day
 * it is already on is a no-op, and assigning one that is not yet on the trip
 * adds it first. That is what lets the picker be the same picker everywhere:
 * "add this to Tuesday" should not fail because the piece was not packed yet.
 *
 * The one invariant worth stating: `trip_items` remains the single membership.
 * A piece is packed once, `packed` lives there, and day assignments are a plan
 * *about* a packed piece. So taking a piece off Tuesday must never unpack it,
 * and unpacking it takes its days with it (the foreign key does that).
 */

function field(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** The picker posts `itemIds`; a single-row form posts `itemId`. Both are read
 *  here so one action serves the dialog and the inline controls alike. */
function itemIdsFrom(fd: FormData): string[] {
  return [...fd.getAll("itemIds"), ...fd.getAll("itemId")].filter(
    (v): v is string => typeof v === "string" && v !== "",
  );
}

const revalidate = (tripId: string) => revalidatePath(`/trips/${tripId}`);

/** Ensure the piece is on the trip, so a day can be planned for it. */
async function ensurePacked(tripId: string, itemId: string) {
  await db.insert(tripItems).values({ tripId, itemId }).onConflictDoNothing();
}

/** Only days the trip actually has may be written. A day outside the range is
 *  rejected rather than stored: the view can *show* an orphan left behind by
 *  a shortened trip, but it must never be able to create one. */
async function tripHasDay(tripId: string, day: string): Promise<boolean> {
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    columns: { startDate: true, endDate: true },
  });
  if (!trip) return false;
  return isTripDay(tripDays(trip.startDate, trip.endDate), day);
}

/** Plan one or more pieces for a day (from the picker, or from a single row). */
export async function assignToDay(formData: FormData) {
  const tripId = field(formData, "tripId");
  const day = field(formData, "day");
  const itemIds = itemIdsFrom(formData);
  if (!tripId || !day || itemIds.length === 0) return;
  if (!(await tripHasDay(tripId, day))) return;

  for (const itemId of itemIds) {
    await ensurePacked(tripId, itemId);
    await db.insert(tripItemDays).values({ tripId, itemId, day }).onConflictDoNothing();
  }
  revalidate(tripId);
}

/** Take a piece off a day. It stays packed. That is the whole point of
 *  keeping membership and planning apart. */
export async function unassignFromDay(formData: FormData) {
  const tripId = field(formData, "tripId");
  const itemId = field(formData, "itemId");
  const day = field(formData, "day");
  if (!tripId || !itemId || !day) return;

  await db
    .delete(tripItemDays)
    .where(
      and(
        eq(tripItemDays.tripId, tripId),
        eq(tripItemDays.itemId, itemId),
        eq(tripItemDays.day, day),
      ),
    );
  revalidate(tripId);
}

/**
 * Move a piece into, or out of, "Across all days".
 *
 * Turning it **on** clears the piece's individual days. Holding both would
 * mean the same piece showing under Monday *and* under a group that says it is
 * for every day, which reads as a contradiction rather than as extra detail.
 */
export async function setEveryDay(formData: FormData) {
  const tripId = field(formData, "tripId");
  const itemId = field(formData, "itemId");
  if (!tripId || !itemId) return;
  const on = formData.get("everyDay") === "1";

  await db
    .update(tripItems)
    .set({ everyDay: on })
    .where(and(eq(tripItems.tripId, tripId), eq(tripItems.itemId, itemId)));

  if (on) {
    await db
      .delete(tripItemDays)
      .where(and(eq(tripItemDays.tripId, tripId), eq(tripItemDays.itemId, itemId)));
  }
  revalidate(tripId);
}

/** Add pieces to the "Across all days" group straight from the picker. */
export async function addToEveryDay(formData: FormData) {
  const tripId = field(formData, "tripId");
  const itemIds = itemIdsFrom(formData);
  if (!tripId || itemIds.length === 0) return;

  for (const itemId of itemIds) {
    await ensurePacked(tripId, itemId);
    await db
      .update(tripItems)
      .set({ everyDay: true })
      .where(and(eq(tripItems.tripId, tripId), eq(tripItems.itemId, itemId)));
    await db
      .delete(tripItemDays)
      .where(and(eq(tripItemDays.tripId, tripId), eq(tripItemDays.itemId, itemId)));
  }
  revalidate(tripId);
}

/**
 * Drop the day assignments a shortened trip left behind.
 *
 * The pieces stay packed and land back in "Not scheduled yet", which is what
 * they now are. Offered as a deliberate action rather than done silently on
 * read: the owner shortened the trip, and losing plan detail should be their
 * decision, not a side effect of loading a page.
 */
export async function clearOrphanedDays(formData: FormData) {
  const tripId = field(formData, "tripId");
  if (!tripId) return;

  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    columns: { startDate: true, endDate: true },
  });
  if (!trip) return;
  const keep = new Set(tripDays(trip.startDate, trip.endDate).map((d) => d.iso));

  const rows = await db
    .select({ itemId: tripItemDays.itemId, day: tripItemDays.day })
    .from(tripItemDays)
    .where(eq(tripItemDays.tripId, tripId));

  for (const r of rows) {
    if (keep.has(r.day)) continue;
    await db
      .delete(tripItemDays)
      .where(
        and(
          eq(tripItemDays.tripId, tripId),
          eq(tripItemDays.itemId, r.itemId),
          eq(tripItemDays.day, r.day),
        ),
      );
  }
  revalidate(tripId);
}
