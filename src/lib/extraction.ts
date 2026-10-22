/**
 * AI-import extraction schema, prompt, and mapping (ADR-0008; specs/ai-import).
 * Server-only helpers: the Zod schema the model fills, and a mapper from the
 * extracted object to the add-item form's values.
 */

import { z } from "zod";

import { CATEGORIES } from "@/lib/categories";
import { deriveFacets } from "@/lib/facets";
import { inferSeasons } from "@/lib/seasons";
import type { ItemFormValues } from "@/components/item-form";

/** Gemini vision model via Google AI Studio (free tier). Swappable (see ADR-0008);
 * `gemini-flash-latest` is an alias if you'd rather auto-track the newest Flash. */
export const IMPORT_MODEL = "gemini-3.5-flash";

/** Target language for imported text — the model translates into it so the
 * wardrobe reads uniformly, regardless of the product page's language. A UI
 * setting later; for now a single constant. */
export const IMPORT_LANGUAGE = "English";

const CATEGORY_SLUGS: string[] = CATEGORIES.map((c) => c.slug);

/** What the model returns from a product page. Everything optional — blanks are fine. */
export const extractedItemSchema = z.object({
  name: z.string().nullish().describe("Product name / title"),
  category: z
    .string()
    .nullish()
    .describe(`Single best match from: ${CATEGORY_SLUGS.join(", ")}`),
  brand: z.string().nullish(),
  productCode: z.string().nullish().describe("Style / article / look number"),
  color: z.string().nullish().describe("Official colour name"),
  size: z.string().nullish(),
  listPrice: z
    .number()
    .nullish()
    .describe("Original / retail price in major units, e.g. 435.00"),
  pricePaid: z
    .number()
    .nullish()
    .describe("Current / sale price in major units, if shown"),
  currency: z.string().nullish().describe("ISO 4217, e.g. EUR"),
  material: z.string().nullish().describe("Composition, e.g. 54% linen, 43% viscose"),
  care: z.string().nullish(),
  description: z.string().nullish(),
  details: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .nullish()
    .describe("Any other labelled sections: fit, sustainability, traceability, etc."),
});

export type ExtractedItem = z.infer<typeof extractedItemSchema>;

export const EXTRACTION_PROMPT = `You are helping catalog a piece of clothing. Read this product-page screenshot and extract the fields you can clearly see. Leave a field blank if it is not clearly present — do not guess. Prices are numbers in major units (e.g. 305.00), no currency symbol. For "category", pick the single best match from: ${CATEGORY_SLUGS.join(", ")}. Put any additional labelled sections (fit, size & fit, sustainability, traceability, etc.) into "details" as label/value pairs. If the page names a product "Collection" or sub-line (e.g. a "Kollektion:" label — Max Mara names lines such as "Max Mara", "Weekend Max Mara", "MaxMara Accessori", "Max Mara Studio"), add it to "details" as {label: "Collection", value: …}. If the style/article code includes an alphabetic model name alongside the numeric code (e.g. Max Mara prints "Produktcode: 1000000000001 - DEMOCODE", where DEMOCODE is the model name store staff use to look up a piece), keep the numeric code in "productCode" and add the model name to "details" as {label: "Model", value: "DEMOCODE"}. The "description" is Markdown: preserve the official description in full — its prose, and any bulleted feature/detail list (fabric, collar, sleeves, closure, hem, lining, etc.) kept as a Markdown bulleted list, one "- item" per line. Never drop or flatten a bullet list. Write all text you produce — name, colour, material, care, description, and the details labels and values — in ${IMPORT_LANGUAGE}; if the page is in another language, translate them into natural ${IMPORT_LANGUAGE}. Leave language-neutral values (product code, prices, currency, size) exactly as shown. Render "name" in Title Case whatever casing the page uses — retailers ship ALL CAPS or sentence case: capitalise each significant word, keep minor words (with, in, and, of, the, on, for, to) lowercase unless they come first, and capitalise both halves of a hyphenated compound. So "SHAWL-COLLAR BELTED LINEN WAISTCOAT" becomes "Shawl-Collar Belted Linen Waistcoat", and "Belted t-shirt dress" becomes "Belted T-Shirt Dress". Leave proper nouns, model names, and established multi-word terms as they are (e.g. Aurelia, Crêpe de Chine).`;

/** Prompt for the saved-page (HTML) import: the model gets the page's JSON-LD
 * (when present) plus its visible text, not an image (OP-IMPORT-HTML). */
export const EXTRACTION_PROMPT_HTML = `You are helping catalog a piece of clothing from a saved product web page. Below is the page's structured data (JSON-LD, if any) followed by its visible text. Extract the fields you can determine. Prefer the structured JSON-LD for name, brand, price, currency, and product code; use the visible text for material, care, fit, and other detail sections. Leave a field blank if it is not present — do not guess. Prices are numbers in major units (e.g. 305.00), no currency symbol. For "category", pick the single best match from: ${CATEGORY_SLUGS.join(", ")}. Put any additional labelled sections (fit, size & fit, sustainability, traceability, etc.) into "details" as label/value pairs. If the page names a product "Collection" or sub-line (e.g. a "Kollektion:" label — Max Mara names lines such as "Max Mara", "Weekend Max Mara", "MaxMara Accessori", "Max Mara Studio"), add it to "details" as {label: "Collection", value: …}. If the style/article code includes an alphabetic model name alongside the numeric code (e.g. Max Mara prints "Produktcode: 1000000000001 - DEMOCODE", where DEMOCODE is the model name store staff use to look up a piece), keep the numeric code in "productCode" and add the model name to "details" as {label: "Model", value: "DEMOCODE"}. The "description" is Markdown: preserve the official description in full — its prose, and any bulleted feature/detail list (fabric, collar, sleeves, closure, hem, lining, etc.) kept as a Markdown bulleted list, one "- item" per line. Never drop or flatten a bullet list. Write all text you produce — name, colour, material, care, description, and the details labels and values — in ${IMPORT_LANGUAGE}; if the page is in another language, translate them into natural ${IMPORT_LANGUAGE}. Leave language-neutral values (product code, prices, currency, size) exactly as shown. Render "name" in Title Case whatever casing the page uses — retailers ship ALL CAPS or sentence case: capitalise each significant word, keep minor words (with, in, and, of, the, on, for, to) lowercase unless they come first, and capitalise both halves of a hyphenated compound. So "SHAWL-COLLAR BELTED LINEN WAISTCOAT" becomes "Shawl-Collar Belted Linen Waistcoat", and "Belted t-shirt dress" becomes "Belted T-Shirt Dress". Leave proper nouns, model names, and established multi-word terms as they are (e.g. Aurelia, Crêpe de Chine).`;

/**
 * Free text from the model, with escaped line breaks repaired (#60).
 *
 * Model responses sometimes double-escape their newlines, so the JSON string
 * carries the two characters `\` + `n` instead of a real break — which flattens
 * the Markdown bullet list the extraction contract requires into one paragraph.
 * Product copy never legitimately contains such a sequence, so converting them
 * back is safe.
 */
function text(s: string | null | undefined): string | undefined {
  if (typeof s !== "string") return undefined;
  return s.replace(/\\r\\n|\\n/g, "\n").replace(/\\t/g, "\t");
}

/**
 * Tags for an imported piece — season and the style facets (#107).
 *
 * **Derived from the extracted text, not asked of the model**, and that is a
 * deliberate departure from how #107 was originally scoped. Three reasons:
 *
 * 1. **A model reading a product photograph is exactly the thing that has been
 *    wrong repeatedly here** — a rolled sleeve read as ¾, a maker's own copy
 *    calling a ¾ sleeve "short", one technical knit read as softer than its
 *    identically harsh sibling. The deterministic rules cannot invent a facet;
 *    they only repeat what the page says.
 * 2. **It costs no quota.** The Gemini free tier allows 20 requests a day, and
 *    this adds none: the extraction already returns a full description with the
 *    feature list preserved, and the facets are read out of that.
 * 3. **A piece filed by hand and a piece filed by import get the same rule** —
 *    `deriveFacets` and `inferSeasons`, the same functions the backfill used.
 *
 * The language problem solves itself: extraction translates the description
 * into English first (`IMPORT_LANGUAGE`), so a German page saying
 * "Rundhalsausschnitt" arrives as "round neck" and the English patterns match.
 *
 * Everything here is a *proposal*. The importer prefills the add form and the
 * owner reviews it, so every tag arrives as a ticked checkbox she can untick.
 */
export function inferTags(e: ExtractedItem, category: string | undefined): string[] {
  const description = text(e.description);
  const facets = deriveFacets({
    name: e.name,
    description,
    // No category yet means no hem scale, so length can only be `cropped` —
    // the conservative side of the rule that stops a top being tagged `midi`.
    category: category ?? "",
  });
  const seasons = inferSeasons({ material: text(e.material), name: e.name, description });
  return [...new Set([...Object.values(facets), ...seasons])];
}

/** Map an extracted object onto the add-item form's (string-based) values. */
export function toFormValues(e: ExtractedItem): ItemFormValues {
  const category =
    e.category && CATEGORY_SLUGS.includes(e.category) ? e.category : undefined;
  const num = (n: number | null | undefined) => (n == null ? undefined : String(n));
  return {
    name: e.name ?? undefined,
    category,
    brand: e.brand ?? undefined,
    productCode: e.productCode ?? undefined,
    color: e.color ?? undefined,
    size: e.size ?? undefined,
    listPrice: num(e.listPrice),
    pricePaid: num(e.pricePaid),
    currency: e.currency ?? "EUR",
    material: text(e.material),
    care: text(e.care),
    description: text(e.description),
    details:
      e.details?.map((d) => ({ label: d.label, value: text(d.value) ?? "" })) ??
      undefined,
    tags: inferTags(e, category),
  };
}
