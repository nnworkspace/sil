"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { items } from "@/db/schema";
import { archiveInputSchema } from "@/lib/validation";

export type ArchiveResult = { ok: true } | { ok: false; error: string };

/** Paths that change when a piece enters or leaves the wardrobe: the home
 *  counts, the grids, the archive list, and the piece itself. */
function revalidateArchivePaths(itemId: string) {
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/archive");
  revalidatePath(`/items/${itemId}`);
}

/**
 * Archive a piece (specs/archive, OP-ARCHIVE). Records why and when it left the
 * wardrobe; nothing else about the piece is touched (VAL-ARCHIVE-05), so its
 * photos, wears, prices and look/trip membership all survive. Re-archiving an
 * already-archived piece updates the values rather than erroring
 * (VAL-ARCHIVE-06).
 */
export async function archiveItem(
  itemId: string,
  input: { archivedAt: string; reason: string; note?: string | null },
): Promise<ArchiveResult> {
  if (!itemId) return { ok: false, error: "Missing item." };

  const parsed = archiveInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid archive details." };
  }

  try {
    await db
      .update(items)
      .set({
        archivedAt: parsed.data.archivedAt,
        archiveReason: parsed.data.reason,
        archiveNote: parsed.data.note,
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId));
  } catch (e) {
    console.error("archiveItem failed:", e);
    return { ok: false, error: "Couldn't archive that piece." };
  }

  revalidateArchivePaths(itemId);
  return { ok: true };
}

/**
 * Restore an archived piece to the active wardrobe (OP-RESTORE). Clears all
 * three archive fields together so no partial state can exist (VAL-ARCHIVE-07);
 * the previous reason/note/date are not kept as history.
 */
export async function restoreItem(itemId: string): Promise<ArchiveResult> {
  if (!itemId) return { ok: false, error: "Missing item." };

  try {
    await db
      .update(items)
      .set({
        archivedAt: null,
        archiveReason: null,
        archiveNote: null,
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId));
  } catch (e) {
    console.error("restoreItem failed:", e);
    return { ok: false, error: "Couldn't restore that piece." };
  }

  revalidateArchivePaths(itemId);
  return { ok: true };
}
