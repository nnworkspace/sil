/**
 * A short list of currencies for the price fields (#34). The stored value is the
 * ISO 4217 code (validated as a 3-letter string in ADR-0006 / itemInputSchema);
 * `formatPrice` renders it via Intl, so any code works. This list just covers
 * common ones, with "Other" left to the schema.
 */

export type Currency = { code: string; label: string };

export const CURRENCIES: Currency[] = [
  { code: "EUR", label: "EUR: Euro (€)" },
  { code: "USD", label: "USD: US Dollar ($)" },
  { code: "GBP", label: "GBP: British Pound (£)" },
  { code: "CHF", label: "CHF: Swiss Franc" },
  { code: "JPY", label: "JPY: Japanese Yen (¥)" },
  { code: "CNY", label: "CNY: Chinese Yuan (¥)" },
  { code: "SEK", label: "SEK: Swedish Krona" },
  { code: "DKK", label: "DKK: Danish Krone" },
  { code: "NOK", label: "NOK: Norwegian Krone" },
  { code: "CAD", label: "CAD: Canadian Dollar" },
  { code: "AUD", label: "AUD: Australian Dollar" },
];

export const DEFAULT_CURRENCY = "EUR";

/**
 * The options to render for a given current value: the common list, plus the
 * current value if it isn't already in it (so an imported/edited code is never
 * silently dropped from the selector).
 */
export function currencyOptions(current?: string | null): Currency[] {
  if (current && !CURRENCIES.some((c) => c.code === current)) {
    return [{ code: current, label: current }, ...CURRENCIES];
  }
  return CURRENCIES;
}
