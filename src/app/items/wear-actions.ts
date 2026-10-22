"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { tripItems, wearEvents } from "@/db/schema";
import { describeBatch, packedToTick } from "@/lib/batch-wear";
import { wearEventInputSchema } from "@/lib/validation";

export type WearResult = { ok: true } | { ok: false; error: string };

/**
 * Quick "Log a wear" from the item detail page (specs/wear-tracking, OP-LOG-WEAR).
 * Appends one wear_event; never edits the item.
 */
export async function logWear(
  _prev: WearResult | null,
  formData: FormData,
): Promise<WearResult> {
  const itemId = formData.get("itemId");
  if (typeof itemId !== "string" || !itemId) {
    return { ok: false, error: "Missing item." };
  }

  const parsed = wearEventInputSchema.safeParse({
    wornAt: typeof formData.get("wornAt") === "string" ? formData.get("wornAt") : "",
    occasion: formData.get("occasion"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid wear." };
  }

  try {
    await db.insert(wearEvents).values({ itemId, ...parsed.data });
  } catch (e) {
    console.error("logWear failed:", e);
    return { ok: false, error: "Couldn't log that wear." };
  }

  revalidatePath(`/items/${itemId}`);
  return { ok: true };
}

/**
 * "Log a wear" from an item card in the grid. The card opens a small modal with
 * date (defaulting to the viewer's local today), occasion and note (#129 —
 * originally a one-tap instant log, #121). Appends a single wear_event and
 * returns the new id so the caller can offer Undo. Revalidates the grids and the
 * item page so wear counts stay fresh.
 */
export async function quickLogWear(
  itemId: string,
  input: { wornAt: string; occasion?: string | null; note?: string | null },
): Promise<{ ok: true; wearId: string } | { ok: false; error: string }> {
  if (!itemId) return { ok: false, error: "Missing item." };
  const parsed = wearEventInputSchema.safeParse({
    wornAt: input.wornAt,
    occasion: input.occasion ?? null,
    note: input.note ?? null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid wear." };
  }
  try {
    const [row] = await db
      .insert(wearEvents)
      .values({ itemId, ...parsed.data })
      .returning({ id: wearEvents.id });
    revalidatePath("/");
    revalidatePath("/browse");
    revalidatePath(`/items/${itemId}`);
    return { ok: true, wearId: row.id };
  } catch (e) {
    console.error("quickLogWear failed:", e);
    return { ok: false, error: "Couldn't log that wear." };
  }
}

/** Undo a quick-logged wear from the grid (#121) — deletes it and revalidates
 *  the same paths quickLogWear touched. */
export async function quickUnlogWear(wearId: string, itemId: string): Promise<void> {
  if (!wearId || !itemId) return;
  await db.delete(wearEvents).where(eq(wearEvents.id, wearId));
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath(`/items/${itemId}`);
}

/**
 * Edit an existing wear's occasion / note inline on the detail page
 * (OP-EDIT-WEAR). Plain form action — auto-submitted on change/blur.
 */
export async function updateWear(formData: FormData): Promise<void> {
  const itemId = formData.get("itemId");
  const wearId = formData.get("wearId");
  const wornAt = formData.get("wornAt");
  if (typeof itemId !== "string" || typeof wearId !== "string") return;

  const parsed = wearEventInputSchema.safeParse({
    wornAt: typeof wornAt === "string" ? wornAt : "",
    occasion: formData.get("occasion"),
    note: formData.get("note"),
  });
  if (!parsed.success) return; // constrained inputs; drop silently

  await db
    .update(wearEvents)
    .set({
      wornAt: parsed.data.wornAt,
      occasion: parsed.data.occasion,
      note: parsed.data.note,
    })
    .where(eq(wearEvents.id, wearId));
  revalidatePath(`/items/${itemId}`);
}

/** Remove a single logged wear (OP-REMOVE-WEAR). Plain form action. */
export async function removeWear(formData: FormData): Promise<void> {
  const id = formData.get("wearId");
  const itemId = formData.get("itemId");
  if (typeof id !== "string" || typeof itemId !== "string") return;

  await db.delete(wearEvents).where(eq(wearEvents.id, id));
  revalidatePath(`/items/${itemId}`);
}

/* ── Batch wear logging (#320) ─────────────────────────────────────────────
 *
 * A wear is stored per piece, but a day is worn as an outfit. See
 * `src/lib/batch-wear.ts` for the decisions; this file does the writing.
 */

export type BatchWearResult =
  | { ok: true; wearIds: string[]; packedTicked: string[]; message: string }
  | { ok: false; error: string };

/**
 * Log the same wear against several pieces at once.
 *
 * **One transaction.** A half-written batch is worse than a failed one: the
 * owner would have to work out which pieces landed before retrying, and a retry
 * would then duplicate them.
 *
 * `tripId` is what makes this a *trip-side* batch. Given one, pieces on that
 * trip that are not yet ticked as packed get ticked — wearing a piece on a trip
 * is evidence it was in the case, and the packing checklist is routinely left
 * half-filled. Without a `tripId` (the browse grid, a Look) nothing is inferred.
 */
export async function batchLogWear(
  itemIds: string[],
  input: { wornAt: string; occasion?: string | null; note?: string | null },
  tripId?: string | null,
): Promise<BatchWearResult> {
  const ids = [...new Set(itemIds.filter(Boolean))];
  if (ids.length === 0) return { ok: false, error: "Nothing selected." };

  const parsed = wearEventInputSchema.safeParse({
    wornAt: input.wornAt,
    occasion: input.occasion ?? null,
    note: input.note ?? null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid wear." };
  }

  try {
    const { wearIds, packedTicked } = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(wearEvents)
        .values(ids.map((itemId) => ({ itemId, ...parsed.data })))
        .returning({ id: wearEvents.id });

      let packedTicked: string[] = [];
      if (tripId) {
        // Only rows this trip actually holds, and only unticked ones — the
        // inference runs false → true and never the other way.
        const membership = await tx
          .select({ itemId: tripItems.itemId, packed: tripItems.packed })
          .from(tripItems)
          .where(eq(tripItems.tripId, tripId));
        packedTicked = packedToTick(ids, new Map(membership.map((m) => [m.itemId, m.packed])));
        if (packedTicked.length > 0) {
          await tx
            .update(tripItems)
            .set({ packed: true })
            .where(and(eq(tripItems.tripId, tripId), inArray(tripItems.itemId, packedTicked)));
        }
      }
      return { wearIds: rows.map((r) => r.id), packedTicked };
    });

    revalidatePath("/");
    revalidatePath("/browse");
    for (const id of ids) revalidatePath(`/items/${id}`);
    if (tripId) revalidatePath(`/trips/${tripId}`);

    return {
      ok: true,
      wearIds,
      packedTicked,
      message: describeBatch(wearIds.length, packedTicked.length),
    };
  } catch (e) {
    console.error("batchLogWear failed:", e);
    return { ok: false, error: "Couldn't log those wears." };
  }
}

/**
 * Undo a whole batch — **including any packed ticks it made**.
 *
 * An undo that removed the wears but left pieces marked packed would be lying
 * about what it reverted, which is worse than not offering undo at all.
 */
export async function batchUnlogWear(
  wearIds: string[],
  itemIds: string[],
  tripId?: string | null,
  packedTicked: string[] = [],
): Promise<void> {
  if (wearIds.length === 0) return;
  await db.transaction(async (tx) => {
    await tx.delete(wearEvents).where(inArray(wearEvents.id, wearIds));
    if (tripId && packedTicked.length > 0) {
      await tx
        .update(tripItems)
        .set({ packed: false })
        .where(and(eq(tripItems.tripId, tripId), inArray(tripItems.itemId, packedTicked)));
    }
  });
  revalidatePath("/");
  revalidatePath("/browse");
  for (const id of itemIds) revalidatePath(`/items/${id}`);
  if (tripId) revalidatePath(`/trips/${tripId}`);
}

/** Which of these pieces already have a wear on this date, so the dialog can
 *  warn before writing one that is probably an accident (#320). */
export async function wornOnDate(itemIds: string[], wornAt: string): Promise<string[]> {
  const ids = itemIds.filter(Boolean);
  if (ids.length === 0 || !wornAt) return [];
  const rows = await db
    .select({ itemId: wearEvents.itemId })
    .from(wearEvents)
    .where(and(inArray(wearEvents.itemId, ids), eq(wearEvents.wornAt, wornAt)));
  return [...new Set(rows.map((r) => r.itemId))];
}
