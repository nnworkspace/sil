/**
 * Download official product photos at save time (ADR-0009; VAL-IMPORT-06).
 *
 * Server-only. Given the image URLs the owner kept from a saved-page import,
 * fetch each from the retailer's CDN, validate type/size, and return them as
 * `File`s (kind `official`) for the normal photo-storage path in `createItem`.
 * A failed image is skipped, never fatal.
 */

import { type PhotoKind } from "@/lib/categories";
import { ALLOWED_IMAGE_TYPES, IMAGE_EXT_BY_TYPE } from "@/lib/images";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

async function downloadOne(url: string): Promise<File | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0", accept: "image/*" },
    });
    if (!res.ok) return null;

    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(type)) return null;

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) return null;

    return new File([bytes], `official${IMAGE_EXT_BY_TYPE[type] ?? ""}`, { type });
  } catch {
    return null; // network / timeout / abort — skip this image
  }
}

/**
 * Download up to `limit` of the given image URLs, in order. Skips any that fail
 * validation. Returns `{ file, kind: "official" }` entries ready for storage.
 */
export async function downloadOfficialPhotos(
  urls: string[],
  limit: number,
): Promise<{ file: File; kind: PhotoKind }[]> {
  const wanted = urls.filter((u) => /^https?:\/\//i.test(u)).slice(0, limit);
  const files = await Promise.all(wanted.map(downloadOne));
  return files
    .filter((f): f is File => f !== null)
    .map((file) => ({ file, kind: "official" as const }));
}
