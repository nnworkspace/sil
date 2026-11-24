/**
 * The image types the app accepts everywhere: uploads, the storage layer,
 * downloaded official photos, and screenshot import. Kept in one place so the
 * whitelist can't drift between the file input `accept`, server validation,
 * and the stored-file extension.
 *
 * Acceptance is by MIME type **or** filename extension: some browsers/OSes
 * report `.avif` (and occasionally `.webp`) as `application/octet-stream`, so a
 * MIME-only check would wrongly reject a perfectly good image.
 */

/** MIME types accepted for photos / screenshots. */
export const ALLOWED_IMAGE_TYPES: string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/** File extension for each accepted MIME type (for stored filenames / downloads). */
export const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

/** Value for a file input's `accept` attribute (MIME types + extensions). */
export const IMAGE_ACCEPT = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_EXTS].join(",");

/** Accept a file that's an allowed image by MIME type or by filename extension. */
export function isAllowedImage(file: { type: string; name: string }): boolean {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ALLOWED_EXTS.some((ext) => name.endsWith(ext));
}

/** The stored-file extension for an upload: from its MIME type, else its name. */
export function imageExt(file: { type: string; name: string }): string {
  if (IMAGE_EXT_BY_TYPE[file.type]) return IMAGE_EXT_BY_TYPE[file.type];
  const m = file.name.toLowerCase().match(/\.(jpe?g|png|webp|avif)$/);
  if (!m) return "";
  return m[0] === ".jpeg" ? ".jpg" : m[0];
}
