/** Format minor units (cents) as a currency string. */
export function formatPrice(
  cents: number | null | undefined,
  currency: string | null | undefined = "EUR",
): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency ?? "EUR",
  }).format(cents / 100);
}

/**
 * Format a date-only value for display, year-first (`YYYY-MM-DD`).
 *
 * Stored dates are already `YYYY-MM-DD`, so we render them as-is rather than
 * round-tripping through `Date`, which would shift a date-only value across
 * timezones (e.g. midnight UTC rendered as the previous day).
 */
export function formatDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return d.slice(0, 10);
}
