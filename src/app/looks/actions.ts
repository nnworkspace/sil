"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { looks, lookItems, lookPhotos, items } from "@/db/schema";
import { lookInputSchema, type LookInput } from "@/lib/validation";
import { putPhoto, deletePhoto } from "@/lib/storage";
import { isAllowedImage } from "@/lib/images";

export type ActionResult = { ok: false; errors: Record<string, string[]> };

/** Photo limits: identical to item photos (VAL-LOOK-07 mirrors VAL-ITEM-03). */
const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function ids(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v !== "");
}

/** Only keep item ids that exist (VAL-LOOK-04). */
async function existingItemIds(candidate: string[]): Promise<string[]> {
  if (candidate.length === 0) return [];
  const rows = await db.select({ id: items.id }).from(items).where(inArray(items.id, candidate));
  return rows.map((r) => r.id);
}

function parseLook(fd: FormData): LookInput | ActionResult {
  const raw = {
    name: text(fd, "name") ?? "",
    kind: text(fd, "kind") ?? "look",
    notes: text(fd, "notes"),
  };
  const parsed = lookInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  return parsed.data;
}

// --- Look CRUD --------------------------------------------------------------

export async function createLook(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = parseLook(formData);
  if ("ok" in input) return input;

  const [row] = await db.insert(looks).values(input).returning({ id: looks.id });

  // Optional pieces to seed the Look with (e.g. from an item page), in order.
  const valid = await existingItemIds(ids(formData, "itemIds"));
  if (valid.length > 0) {
    await db
      .insert(lookItems)
      .values(valid.map((itemId, i) => ({ lookId: row.id, itemId, sort: i })))
      .onConflictDoNothing();
    for (const itemId of valid) revalidatePath(`/items/${itemId}`);
  }

  revalidatePath("/looks");
  redirect(`/looks/${row.id}`);
}

export async function updateLook(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = parseLook(formData);
  if ("ok" in input) return input;

  await db.update(looks).set({ ...input, updatedAt: new Date() }).where(eq(looks.id, id));
  revalidatePath("/looks");
  revalidatePath(`/looks/${id}`);
  redirect(`/looks/${id}`);
}

export async function deleteLook(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;
  // The pieces themselves are never deleted (#170); only the look and its
  // link rows go (look_items cascade on look_id). Capture the members first so
  // we can refresh their "In these looks" after the links disappear.
  const members = await db
    .select({ itemId: lookItems.itemId })
    .from(lookItems)
    .where(eq(lookItems.lookId, id));
  await db.delete(looks).where(eq(looks.id, id)); // look_items cascade (VAL-LOOK-04)
  revalidatePath("/looks");
  for (const m of members) revalidatePath(`/items/${m.itemId}`);
  redirect("/looks");
}

// --- Members ----------------------------------------------------------------

/** Add pieces to a Look: idempotent (`VAL-LOOK-05`), appended after the
 *  current members so the owner's manual order is preserved (#100). */
export async function addLookItems(formData: FormData): Promise<void> {
  const lookId = text(formData, "lookId");
  if (!lookId) return;
  const valid = await existingItemIds(ids(formData, "itemIds"));
  if (valid.length > 0) {
    const [{ max }] = await db
      .select({ max: sql<number | null>`max(${lookItems.sort})` })
      .from(lookItems)
      .where(eq(lookItems.lookId, lookId));
    let next = (max ?? -1) + 1;
    await db
      .insert(lookItems)
      .values(valid.map((itemId) => ({ lookId, itemId, sort: next++ })))
      .onConflictDoNothing();
  }
  revalidatePath(`/looks/${lookId}`);
  for (const itemId of valid) revalidatePath(`/items/${itemId}`);
}

/** Persist the owner's manual order of a Look's pieces (#100): assign each
 *  listed item its position as `sort`. Items not in the list are left as-is. */
export async function reorderLookItems(formData: FormData): Promise<void> {
  const lookId = text(formData, "lookId");
  if (!lookId) return;
  const order = ids(formData, "itemIds");
  if (order.length === 0) return;
  await db.transaction(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      await tx
        .update(lookItems)
        .set({ sort: i })
        .where(and(eq(lookItems.lookId, lookId), eq(lookItems.itemId, order[i])));
    }
  });
  revalidatePath(`/looks/${lookId}`);
}

export async function removeLookItem(formData: FormData): Promise<void> {
  const lookId = text(formData, "lookId");
  const itemId = text(formData, "itemId");
  if (!lookId || !itemId) return;
  await db
    .delete(lookItems)
    .where(and(eq(lookItems.lookId, lookId), eq(lookItems.itemId, itemId)));
  revalidatePath(`/looks/${lookId}`);
  revalidatePath(`/items/${itemId}`);
}

// --- Own photos (#98) -------------------------------------------------------

function isFile(v: FormDataEntryValue): v is File {
  return v instanceof File && v.size > 0;
}

/** Add the owner's own photo(s) of a Look. The first photo a Look ever gains
 *  becomes its cover (`VAL-LOOK-08`); validates type/size/count (`VAL-LOOK-07`).
 *  Returns an ActionResult on rejection, otherwise void. */
export async function addLookPhotos(
  formData: FormData,
): Promise<ActionResult | void> {
  const lookId = text(formData, "lookId");
  if (!lookId) return;

  const files = formData.getAll("photos").filter(isFile);
  if (files.length === 0) return;

  const existing = await db
    .select({ id: lookPhotos.id, sort: lookPhotos.sort })
    .from(lookPhotos)
    .where(eq(lookPhotos.lookId, lookId));

  if (existing.length + files.length > MAX_PHOTOS) {
    return { ok: false, errors: { photos: [`At most ${MAX_PHOTOS} photos per look.`] } };
  }
  for (const file of files) {
    if (!isAllowedImage(file)) {
      return { ok: false, errors: { photos: [`Unsupported image type: ${file.type || file.name}`] } };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { ok: false, errors: { photos: ["Each photo must be 10 MB or smaller."] } };
    }
  }

  const hadNone = existing.length === 0;
  let nextSort = existing.reduce((m, p) => Math.max(m, p.sort), -1) + 1;

  const stored: string[] = [];
  try {
    const rows = [];
    for (let i = 0; i < files.length; i++) {
      const s = await putPhoto(files[i]);
      stored.push(s.path);
      rows.push({
        lookId,
        url: s.url,
        path: s.path,
        sort: nextSort++,
        isPrimary: hadNone && i === 0, // first photo ever → cover
      });
    }
    await db.insert(lookPhotos).values(rows);
  } catch (err) {
    for (const p of stored) await deletePhoto(p);
    throw err;
  }

  revalidatePath("/looks");
  revalidatePath(`/looks/${lookId}`);
}

/** Delete one Look photo; promote the next one to cover if it was the cover
 *  (`VAL-LOOK-08`). Best-effort object deletion (mirrors `VAL-ITEM-11`). */
export async function deleteLookPhoto(formData: FormData): Promise<void> {
  const lookId = text(formData, "lookId");
  const photoId = text(formData, "photoId");
  if (!lookId || !photoId) return;

  const [photo] = await db
    .select()
    .from(lookPhotos)
    .where(and(eq(lookPhotos.id, photoId), eq(lookPhotos.lookId, lookId)));
  if (!photo) return;

  await db.delete(lookPhotos).where(eq(lookPhotos.id, photoId));
  await deletePhoto(photo.path);

  if (photo.isPrimary) {
    const [next] = await db
      .select({ id: lookPhotos.id })
      .from(lookPhotos)
      .where(eq(lookPhotos.lookId, lookId))
      .orderBy(asc(lookPhotos.sort))
      .limit(1);
    if (next) {
      await db.update(lookPhotos).set({ isPrimary: true }).where(eq(lookPhotos.id, next.id));
    }
  }

  revalidatePath("/looks");
  revalidatePath(`/looks/${lookId}`);
}

/** Choose a Look's cover: mark one own photo primary, clear the rest
 *  (`VAL-LOOK-08`). */
export async function setLookCover(formData: FormData): Promise<void> {
  const lookId = text(formData, "lookId");
  const photoId = text(formData, "photoId");
  if (!lookId || !photoId) return;

  await db
    .update(lookPhotos)
    .set({ isPrimary: false })
    .where(eq(lookPhotos.lookId, lookId));
  await db
    .update(lookPhotos)
    .set({ isPrimary: true })
    .where(and(eq(lookPhotos.id, photoId), eq(lookPhotos.lookId, lookId)));

  revalidatePath("/looks");
  revalidatePath(`/looks/${lookId}`);
}
