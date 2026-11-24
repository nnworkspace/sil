/**
 * Photo storage (docs/ARCHITECTURE.md §5).
 *
 * Writes photos to the local filesystem under public/uploads, which needs no
 * setup. Feature code calls putPhoto / deletePhoto and never touches the files
 * directly, so another store can replace this one without changing a feature.
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import { imageExt } from "@/lib/images";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOAD_SUBDIR = "uploads";

/** Quality floor for re-encoded photos: the owner's stated minimum (#153). */
const WEBP_QUALITY = 85;
/** Formats already efficient enough to store untouched. */
const ALREADY_EFFICIENT = new Set([".avif", ".webp"]);

export type StoredPhoto = { url: string; path: string };

/**
 * Re-encode an upload to WebP before it is stored (#153).
 *
 * A photo straight off a phone is several MB; re-encoded it is typically ~95%
 * smaller with no visible loss, which keeps both the store and every page that
 * shows the photo light. Resolution is deliberately **not** reduced: only the
 * encoding changes, and that is where nearly all of the saving comes from.
 *
 * WebP rather than AVIF, despite the rest of the library being AVIF: measured
 * on a 24 MP phone photo, sharp's AVIF takes **57s** at its default effort
 * (unusable while the owner waits, and a timeout risk), and at an effort low
 * enough to be interactive it produces files ~2x *larger* than WebP. WebP q85
 * did the same photo in 1.7s at 299 KB. Bulk/offline work still uses AVIF,
 * where encode time is free.
 *
 * Returns the original bytes unchanged when the input is already AVIF/WebP, or
 * when re-encoding would not actually be smaller (so a file is never made
 * worse), and falls back to the original if the encoder throws. A failed
 * optimisation must never cost the owner their photo.
 */
async function reencode(file: File): Promise<{ bytes: Buffer; ext: string }> {
  const original = Buffer.from(await file.arrayBuffer());
  const ext = imageExt(file);

  if (ALREADY_EFFICIENT.has(ext)) return { bytes: original, ext };

  try {
    // Loaded lazily (not a top-level import) so that merely importing this
    // module, which any page pulling in a photo Server Action does, never
    // triggers sharp's native binary load. In a runtime without `libvips` that
    // load fails, which previously crashed every page that transitively
    // imported storage, e.g. the look detail (#178). Now
    // sharp is only touched when a photo is actually re-encoded on upload, and
    // if it still can't load the catch below stores the original untouched.
    const sharp = (await import("sharp")).default;
    const encoded = await sharp(original).webp({ quality: WEBP_QUALITY }).toBuffer();
    if (encoded.length < original.length) return { bytes: encoded, ext: ".webp" };
  } catch (err) {
    console.error("Photo re-encode failed, storing the original:", err);
  }
  return { bytes: original, ext };
}

export async function putPhoto(file: File): Promise<StoredPhoto> {
  const { bytes, ext } = await reencode(file);
  const filename = `${randomUUID()}${ext}`;

  const dir = path.join(PUBLIC_DIR, UPLOAD_SUBDIR);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return { url: `/${UPLOAD_SUBDIR}/${filename}`, path: `${UPLOAD_SUBDIR}/${filename}` };
}

/**
 * Best-effort deletion of a stored path, relative to public/. Failures are
 * logged, not thrown (VAL-ITEM-11).
 */
export async function deletePhoto(storedPath: string): Promise<void> {
  try {
    await unlink(path.join(PUBLIC_DIR, storedPath));
  } catch (err) {
    console.error(`Failed to delete photo "${storedPath}":`, err);
  }
}
