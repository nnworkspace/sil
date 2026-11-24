"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { looks, lookItems } from "@/db/schema";
import { lookArchiveInputSchema } from "@/lib/validation";

export type ArchiveResult = { ok: true } | { ok: false; error: string };

/** The member item ids of a look: their item pages show "In these looks", which
 *  changes when the look is archived/restored (an archived look drops out). */
async function memberItemIds(lookId: string): Promise<string[]> {
  const rows = await db
    .select({ itemId: lookItems.itemId })
    .from(lookItems)
    .where(eq(lookItems.lookId, lookId));
  return rows.map((r) => r.itemId);
}

function revalidateLookPaths(lookId: string, itemIds: string[]) {
  revalidatePath("/looks");
  revalidatePath(`/looks/${lookId}`);
  for (const itemId of itemIds) revalidatePath(`/items/${itemId}`);
}

/**
 * Archive a look (#170). Soft, reversible: the look, its members and its photos
 * are all kept, it simply stops counting as an active look (archived_at IS NULL
 * ⇒ active). The pieces inside are untouched; only the look leaves active
 * views, and it drops out of each member's "In these looks". Re-archiving
 * updates the values rather than erroring.
 */
export async function archiveLook(
  lookId: string,
  input: { archivedAt: string; reason: string; note?: string | null },
): Promise<ArchiveResult> {
  if (!lookId) return { ok: false, error: "Missing look." };

  const parsed = lookArchiveInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid archive details." };
  }

  const itemIds = await memberItemIds(lookId);
  try {
    await db
      .update(looks)
      .set({
        archivedAt: parsed.data.archivedAt,
        archiveReason: parsed.data.reason,
        archiveNote: parsed.data.note,
        updatedAt: new Date(),
      })
      .where(eq(looks.id, lookId));
  } catch (e) {
    console.error("archiveLook failed:", e);
    return { ok: false, error: "Couldn't archive that look." };
  }

  revalidateLookPaths(lookId, itemIds);
  return { ok: true };
}

/** Restore an archived look to the active set. Clears all three archive fields
 *  together so no partial state can exist. */
export async function restoreLook(lookId: string): Promise<ArchiveResult> {
  if (!lookId) return { ok: false, error: "Missing look." };

  const itemIds = await memberItemIds(lookId);
  try {
    await db
      .update(looks)
      .set({
        archivedAt: null,
        archiveReason: null,
        archiveNote: null,
        updatedAt: new Date(),
      })
      .where(eq(looks.id, lookId));
  } catch (e) {
    console.error("restoreLook failed:", e);
    return { ok: false, error: "Couldn't restore that look." };
  }

  revalidateLookPaths(lookId, itemIds);
  return { ok: true };
}
