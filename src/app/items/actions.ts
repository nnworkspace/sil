"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { items, itemPhotos, wearEvents } from "@/db/schema";
import {
  itemInputSchema,
  wearEventInputSchema,
  type ItemInput,
  type WearEventInput,
} from "@/lib/validation";
import { putPhoto, deletePhoto } from "@/lib/storage";
import { downloadOfficialPhotos } from "@/lib/official-photos";
import { isAllowedImage } from "@/lib/images";
import { type PhotoKind } from "@/lib/categories";

export type ActionResult = { ok: false; errors: Record<string, string[]> };

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// --- FormData helpers -------------------------------------------------------

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function toCents(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function isFile(v: FormDataEntryValue): v is File {
  return v instanceof File && v.size > 0;
}

function err(field: string, message: string): ActionResult {
  return { ok: false, errors: { [field]: [message] } };
}

/** Coerce FormData into the validation shape and run the item schema. */
function parseInput(fd: FormData): ItemInput | ActionResult {
  let details: unknown = [];
  const rawDetails = fd.get("details");
  if (typeof rawDetails === "string" && rawDetails.trim() !== "") {
    try {
      details = JSON.parse(rawDetails);
    } catch {
      return err("details", "Details must be valid JSON");
    }
  }

  const raw = {
    name: text(fd, "name") ?? "",
    category: text(fd, "category") ?? "",
    secondaryCategories: fd
      .getAll("secondaryCategories")
      .filter((c): c is string => typeof c === "string"),
    brand: text(fd, "brand"),
    productCode: text(fd, "productCode"),
    color: text(fd, "color"),
    size: text(fd, "size"),
    productUrl: text(fd, "productUrl"),
    listPriceCents: toCents(text(fd, "listPrice")),
    pricePaidCents: toCents(text(fd, "pricePaid")),
    currency: text(fd, "currency") ?? "EUR",
    purchasedAt: text(fd, "purchasedAt"),
    purchaseChannel: text(fd, "purchaseChannel"),
    returnBy: text(fd, "returnBy"),
    returnPolicy: text(fd, "returnPolicy"),
    storageLocation: text(fd, "storageLocation"),
    favorite: fd.get("favorite") === "on" || fd.get("favorite") === "true",
    showFullCover:
      fd.get("showFullCover") === "on" || fd.get("showFullCover") === "true",
    // An empty field means "not recorded" (null), not zero (#191) — only the
    // owner can say a piece has genuinely never been worn.
    priorWears: (() => {
      const raw = text(fd, "priorWears");
      return raw === null ? null : Math.max(0, Math.floor(Number(raw) || 0));
    })(),
    tags: fd.getAll("tags").filter((t): t is string => typeof t === "string"),
    notes: text(fd, "notes"),
    description: text(fd, "description"),
    material: text(fd, "material"),
    care: text(fd, "care"),
    details,
  };

  const parsed = itemInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }
  return parsed.data;
}

/** Collect uploaded photos with their kind, validating type/size/count (VAL-ITEM-03). */
function collectPhotos(fd: FormData): { file: File; kind: PhotoKind }[] | ActionResult {
  const all = [
    ...fd.getAll("officialPhotos").filter(isFile).map((file) => ({ file, kind: "official" as const })),
    ...fd.getAll("ownPhotos").filter(isFile).map((file) => ({ file, kind: "own" as const })),
  ];
  if (all.length > MAX_PHOTOS) return err("photos", `At most ${MAX_PHOTOS} photos.`);
  for (const { file } of all) {
    if (!isAllowedImage(file)) return err("photos", `Unsupported image type: ${file.type || file.name}`);
    if (file.size > MAX_PHOTO_BYTES) return err("photos", "Each photo must be 10 MB or smaller.");
  }
  return all;
}

/** Parse the imported-official-photo URLs the form carries (1.5b, VAL-IMPORT-06). */
function officialPhotoUrls(fd: FormData): string[] {
  const raw = fd.get("officialPhotoUrls");
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((u): u is string => typeof u === "string")
      : [];
  } catch {
    return [];
  }
}

/** Parse the owner's drag-ordered photo sequence — an array of photo ids (#56). */
function photoOrder(fd: FormData): string[] {
  const raw = fd.get("photoOrder");
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

/** The photo the owner chose as the cover (primary), any kind (#56). */
function coverPhotoId(fd: FormData): string | null {
  const raw = fd.get("coverPhotoId");
  return typeof raw === "string" && raw.trim() !== "" ? raw : null;
}

/** Parse & validate the wear-log rows the form carries (specs/wear-tracking). */
function parseWearRows(fd: FormData): WearEventInput[] | ActionResult {
  const raw = fd.get("wearEvents");
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return err("wearEvents", "Wear log must be valid JSON");
  }
  if (!Array.isArray(arr)) return [];
  const out: WearEventInput[] = [];
  for (const row of arr) {
    const parsed = wearEventInputSchema.safeParse(row);
    if (!parsed.success) {
      return err("wearEvents", parsed.error.issues[0]?.message ?? "Invalid wear");
    }
    out.push(parsed.data);
  }
  return out;
}

// --- Actions ----------------------------------------------------------------

export async function createItem(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = parseInput(formData);
  if ("ok" in input) return input;

  const uploaded = collectPhotos(formData);
  if (!Array.isArray(uploaded)) return uploaded;

  const wearRows = parseWearRows(formData);
  if (!Array.isArray(wearRows)) return wearRows;

  // Imported official photos are downloaded now (not at import time → no orphans
  // if the draft is abandoned); they lead so the official shot becomes primary.
  const room = Math.max(0, MAX_PHOTOS - uploaded.length);
  const downloaded = await downloadOfficialPhotos(officialPhotoUrls(formData), room);
  const photos = [...downloaded, ...uploaded];

  // Store binaries first (official ordered before own → the official shot leads).
  const stored: { url: string; path: string; kind: PhotoKind }[] = [];
  try {
    for (const { file, kind } of photos) {
      const s = await putPhoto(file);
      stored.push({ ...s, kind });
    }
  } catch (e) {
    for (const s of stored) await deletePhoto(s.path);
    throw e;
  }

  let newId: string;
  try {
    newId = await db.transaction(async (tx) => {
      const [row] = await tx.insert(items).values(input).returning({ id: items.id });
      if (stored.length > 0) {
        await tx.insert(itemPhotos).values(
          stored.map((s, i) => ({
            itemId: row.id,
            url: s.url,
            path: s.path,
            kind: s.kind,
            sort: i,
            isPrimary: i === 0,
          })),
        );
      }
      if (wearRows.length > 0) {
        await tx.insert(wearEvents).values(
          wearRows.map((w) => ({ itemId: row.id, ...w })),
        );
      }
      return row.id;
    });
  } catch (e) {
    for (const s of stored) await deletePhoto(s.path);
    throw e;
  }

  revalidatePath("/");
  revalidatePath(`/category/${input.category}`);
  redirect(`/items/${newId}`);
}

export async function updateItem(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = parseInput(formData);
  if ("ok" in input) return input;

  const newPhotos = collectPhotos(formData);
  if (!Array.isArray(newPhotos)) return newPhotos;

  const wearRows = parseWearRows(formData);
  if (!Array.isArray(wearRows)) return wearRows;

  const removeIds = formData
    .getAll("removePhotoIds")
    .filter((v): v is string => typeof v === "string");

  // Store new binaries up front so a failure can be cleaned up.
  const stored: { url: string; path: string; kind: PhotoKind }[] = [];
  try {
    for (const { file, kind } of newPhotos) {
      const s = await putPhoto(file);
      stored.push({ ...s, kind });
    }
  } catch (e) {
    for (const s of stored) await deletePhoto(s.path);
    throw e;
  }

  const removedPaths: string[] = [];
  try {
    await db.transaction(async (tx) => {
      await tx.update(items).set({ ...input, updatedAt: new Date() }).where(eq(items.id, id));

      // Reconcile the wear log to exactly the submitted rows (VAL-WEAR-07).
      await tx.delete(wearEvents).where(eq(wearEvents.itemId, id));
      if (wearRows.length > 0) {
        await tx.insert(wearEvents).values(
          wearRows.map((w) => ({ itemId: id, ...w })),
        );
      }

      for (const photoId of removeIds) {
        const [gone] = await tx
          .delete(itemPhotos)
          .where(eq(itemPhotos.id, photoId))
          .returning({ path: itemPhotos.path });
        if (gone) removedPaths.push(gone.path);
      }

      // Apply the owner's drag-ordered sequence (#56): sort = position, and the
      // chosen cover (any kind) is primary. Any surviving photo the client did
      // not list falls in after, defensively.
      const surviving = (
        await tx
          .select({ id: itemPhotos.id })
          .from(itemPhotos)
          .where(eq(itemPhotos.itemId, id))
      ).map((r) => r.id);
      const wanted = photoOrder(formData).filter((pid) => surviving.includes(pid));
      const ordered = [...wanted, ...surviving.filter((pid) => !wanted.includes(pid))];
      const cover = coverPhotoId(formData);
      for (let i = 0; i < ordered.length; i++) {
        await tx
          .update(itemPhotos)
          .set({ sort: i, isPrimary: ordered[i] === cover })
          .where(eq(itemPhotos.id, ordered[i]));
      }

      // Newly-uploaded photos are appended after the ordered set.
      if (stored.length > 0) {
        await tx.insert(itemPhotos).values(
          stored.map((s, i) => ({
            itemId: id,
            url: s.url,
            path: s.path,
            kind: s.kind,
            sort: ordered.length + i,
            isPrimary: false,
          })),
        );
      }

      // Ensure exactly one primary (covers the all-removed-then-new-upload case).
      const all = await tx
        .select({ id: itemPhotos.id, isPrimary: itemPhotos.isPrimary })
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, id))
        .orderBy(asc(itemPhotos.sort));
      if (all.length > 0 && !all.some((p) => p.isPrimary)) {
        await tx
          .update(itemPhotos)
          .set({ isPrimary: true })
          .where(eq(itemPhotos.id, all[0].id));
      }
    });
  } catch (e) {
    for (const s of stored) await deletePhoto(s.path);
    throw e;
  }

  for (const p of removedPaths) await deletePhoto(p);

  revalidatePath("/");
  revalidatePath(`/category/${input.category}`);
  revalidatePath(`/items/${id}`);
  redirect(`/items/${id}`);
}

/** Flip a piece's favourite flag — the grid's quick-favourite heart (#117). */
export async function toggleFavorite(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;
  const [item] = await db
    .select({ favorite: items.favorite, category: items.category })
    .from(items)
    .where(eq(items.id, id));
  if (!item) return;
  await db
    .update(items)
    .set({ favorite: !item.favorite, updatedAt: new Date() })
    .where(eq(items.id, id));
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath(`/category/${item.category}`);
  revalidatePath(`/items/${id}`);
}

export async function deleteItem(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;

  const [row] = await db
    .select({ category: items.category })
    .from(items)
    .where(eq(items.id, id));
  const photos = await db
    .select({ path: itemPhotos.path })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, id));

  await db.delete(items).where(eq(items.id, id)); // item_photos cascade

  for (const p of photos) await deletePhoto(p.path);

  revalidatePath("/");
  if (row) revalidatePath(`/category/${row.category}`);
  redirect(row ? `/category/${row.category}` : "/");
}
