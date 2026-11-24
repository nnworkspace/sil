"use server";

import { generateObject, APICallError, RetryError } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import {
  extractedItemSchema,
  toFormValues,
  EXTRACTION_PROMPT,
  EXTRACTION_PROMPT_HTML,
  IMPORT_MODEL,
} from "@/lib/extraction";
import { parseProductPage } from "@/lib/html-import";
import { isAllowedImage } from "@/lib/images";
import type { ItemFormValues } from "@/components/item-form";

// Google AI Studio (free tier). Accept either env var name.
const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY,
});

export type ImportResult =
  | { ok: true; values: ItemFormValues }
  | { ok: false; error: string };

export type HtmlImportResult =
  | { ok: true; values: ItemFormValues; officialPhotoUrls: string[] }
  | { ok: false; error: string };

const MAX_BYTES = 10 * 1024 * 1024;

const AI_BUSY_MESSAGE =
  "The AI service is busy right now. Please wait a moment and try again.";

/** A transient AI failure (rate limit / overload / timeout), worth retrying,
 * vs. a genuine "can't read the input" failure. */
function isTransientAIError(err: unknown): boolean {
  const e = RetryError.isInstance(err) ? err.lastError : err;
  if (APICallError.isInstance(e)) {
    const s = e.statusCode;
    if (s === 408 || s === 409 || s === 429 || (s != null && s >= 500)) return true;
  }
  const msg = String((e as { message?: unknown })?.message ?? err).toLowerCase();
  return /rate limit|quota|too many requests|overloaded|unavailable|timeout|\b429\b|\b503\b/.test(
    msg,
  );
}

/**
 * Phase 1.5a: extract item fields from a product-page screenshot (vision LLM via
 * the AI Gateway), for review in the add-item form. Never writes to the DB.
 */
export async function extractFromScreenshot(
  _prev: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a screenshot to import." };
  }
  if (!isAllowedImage(file)) {
    return { ok: false, error: `Unsupported image type: ${file.type || file.name}.` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be 10 MB or smaller." };
  }

  try {
    const image = new Uint8Array(await file.arrayBuffer());
    const { object } = await generateObject({
      model: google(IMPORT_MODEL),
      schema: extractedItemSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            { type: "file", data: image, mediaType: file.type },
          ],
        },
      ],
    });
    return { ok: true, values: toFormValues(object) };
  } catch (err) {
    console.error("AI import (screenshot) failed:", err);
    return {
      ok: false,
      error: isTransientAIError(err)
        ? AI_BUSY_MESSAGE
        : "Couldn't read that screenshot. Try another image, or enter the details manually.",
    };
  }
}

const MAX_OFFICIAL_PHOTOS = 8;

/**
 * Phase 1.5b: extract item fields from a *saved* product page (an uploaded
 * `.html`), plus the official image URLs to preview. No network fetch of the
 * page (ADR-0009); photos are downloaded later by `createItem`. Never writes the
 * DB (VAL-IMPORT-01).
 */
export async function extractFromHtml(
  _prev: HtmlImportResult | null,
  formData: FormData,
): Promise<HtmlImportResult> {
  const file = formData.get("page");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a saved .html page to import." };
  }
  const isHtml =
    file.type === "text/html" || /\.html?$/i.test(file.name);
  if (!isHtml) {
    return { ok: false, error: "That doesn't look like a saved web page (.html)." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "The page file must be 10 MB or smaller." };
  }

  try {
    const html = await file.text();
    const page = parseProductPage(html);

    if (!page.jsonLd && page.text.length < 200) {
      return {
        ok: false,
        error:
          "Couldn't find product details in that file. Use Save As → “Webpage, Complete”, or import a screenshot instead.",
      };
    }

    // Include the title + meta description: some retailers render the product
    // copy client-side, so it lives in <meta> / JSON but not the visible text.
    const data = [
      page.jsonLd ? `JSON-LD:\n${JSON.stringify(page.jsonLd)}` : null,
      page.title ? `TITLE: ${page.title}` : null,
      page.ogDescription ? `META DESCRIPTION: ${page.ogDescription}` : null,
      // The retailer's own Details section with its bullets intact (#66); the
      // copy in the visible text has them run together. Passed to the model
      // rather than used directly, so it is still translated (VAL-IMPORT-08).
      page.facts?.description
        ? `PRODUCT DETAILS (Markdown, keep the bullet list):\n${page.facts.description}`
        : null,
      `PAGE TEXT:\n${page.text}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { object } = await generateObject({
      model: google(IMPORT_MODEL),
      schema: extractedItemSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT_HTML },
            { type: "text", text: data },
          ],
        },
      ],
    });

    // Composition, care and supplier are taken from the page's embedded JSON
    // when it carries them: structured data beats anything the model infers,
    // and costs no tokens (#66). Supplier rows are appended to whatever the
    // model found, never replacing a section it already labelled.
    const extracted = toFormValues(object);
    const details = [...(extracted.details ?? [])];
    for (const row of page.facts?.details ?? []) {
      if (!details.some((d) => d.label.toLowerCase() === row.label.toLowerCase())) {
        details.push(row);
      }
    }
    const values: ItemFormValues = {
      ...extracted,
      productUrl: page.productUrl ?? undefined,
      material: page.facts?.material ?? extracted.material,
      care: page.facts?.care ?? extracted.care,
      details: details.length > 0 ? details : extracted.details,
    };
    return {
      ok: true,
      values,
      officialPhotoUrls: page.imageUrls.slice(0, MAX_OFFICIAL_PHOTOS),
    };
  } catch (err) {
    console.error("AI import (saved page) failed:", err);
    return {
      ok: false,
      error: isTransientAIError(err)
        ? AI_BUSY_MESSAGE
        : "Couldn't read that saved page. Try re-saving it, or import a screenshot instead.",
    };
  }
}
