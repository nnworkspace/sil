"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { trips, tripItems, items } from "@/db/schema";
import { tripInputSchema, type TripInput } from "@/lib/validation";

export type ActionResult = { ok: false; errors: Record<string, string[]> };

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function ids(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v !== "");
}

/** Coerce FormData into the trip shape and validate it (VAL-TRIP-*). */
function parseTrip(fd: FormData): TripInput | ActionResult {
  const raw = {
    name: text(fd, "name") ?? "",
    type: text(fd, "type") ?? "business",
    destination: text(fd, "destination"),
    startDate: text(fd, "startDate"),
    endDate: text(fd, "endDate"),
    notes: text(fd, "notes"),
  };
  const parsed = tripInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  return parsed.data;
}

// --- Trip CRUD --------------------------------------------------------------

export async function createTrip(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = parseTrip(formData);
  if ("ok" in input) return input;

  const [row] = await db.insert(trips).values(input).returning({ id: trips.id });
  revalidatePath("/trips");
  redirect(`/trips/${row.id}`);
}

export async function updateTrip(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = parseTrip(formData);
  if ("ok" in input) return input;

  await db.update(trips).set({ ...input, updatedAt: new Date() }).where(eq(trips.id, id));
  revalidatePath("/trips");
  revalidatePath(`/trips/${id}`);
  redirect(`/trips/${id}`);
}

export async function deleteTrip(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;
  await db.delete(trips).where(eq(trips.id, id)); // trip_items cascade (VAL-TRIP-06)
  revalidatePath("/trips");
  redirect("/trips");
}

// --- Packing list -----------------------------------------------------------

/** Add one or more pieces to a trip. Idempotent: re-adding is a no-op
 *  (`VAL-TRIP-05`, on-conflict-do-nothing). Only existing items are linked. */
export async function addTripItems(formData: FormData): Promise<void> {
  const tripId = text(formData, "tripId");
  if (!tripId) return;
  const itemIds = ids(formData, "itemIds");
  if (itemIds.length === 0) return;

  const existing = await db
    .select({ id: items.id })
    .from(items)
    .where(inArray(items.id, itemIds));
  const valid = existing.map((e) => e.id);
  if (valid.length > 0) {
    await db
      .insert(tripItems)
      .values(valid.map((itemId) => ({ tripId, itemId })))
      .onConflictDoNothing();
  }
  revalidatePath(`/trips/${tripId}`);
}

export async function removeTripItem(formData: FormData): Promise<void> {
  const tripId = text(formData, "tripId");
  const itemId = text(formData, "itemId");
  if (!tripId || !itemId) return;
  await db
    .delete(tripItems)
    .where(and(eq(tripItems.tripId, tripId), eq(tripItems.itemId, itemId)));
  revalidatePath(`/trips/${tripId}`);
}

export async function setPacked(formData: FormData): Promise<void> {
  const tripId = text(formData, "tripId");
  const itemId = text(formData, "itemId");
  if (!tripId || !itemId) return;
  const packed = formData.get("packed") === "true" || formData.get("packed") === "on";
  await db
    .update(tripItems)
    .set({ packed })
    .where(and(eq(tripItems.tripId, tripId), eq(tripItems.itemId, itemId)));
  revalidatePath(`/trips/${tripId}`);
}
