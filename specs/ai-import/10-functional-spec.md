# AI-Assisted Import: Functional Specification

- **Spec ID:** `SPEC-AIIMPORT-FUNC`
- **Part of set:** `SPEC-SET-AI-IMPORT` v0.2.0
- **Traceability:** [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md), [ADR-0006](../../_governance-local/decisions/ADR-0006-validation-library.md); consumes [specs/catalog/30-data-model-spec.md](../catalog/30-data-model-spec.md); issue #11

## 1. Purpose and scope

Defines what the import extracts and the rules it obeys. The feature is a convenience layer in front of the existing create flow: it produces a set of candidate field values (and, in 1.5b, candidate photos) and hands them to the add-item form. The owner always reviews before anything is persisted.

## 2. Operations

### 2.1 Import from screenshot: `OP-IMPORT-SCREENSHOT` (Phase 1.5a)

- **Purpose:** extract item fields from a screenshot/photo of a product page.
- **Trigger:** the owner selects an image in the "Import → From a screenshot" control on `/items/new`.
- **Behaviour:** the image is sent to a vision LLM (Gemini via the AI SDK, ADR-0008) with a structured-output request; the returned fields are validated and used to **prefill** the add-item form. The screenshot itself is **not** added as a photo (a page screenshot is not a wardrobe photo).
- **Outcome:** the form is populated; the owner reviews, edits, and saves via the normal `createItem`. On failure, the form is left for manual entry with a non-blocking notice.

### 2.2 Import from a saved page: `OP-IMPORT-HTML` (Phase 1.5b)

- **Purpose:** extract item fields **and official photos** from a saved copy of a product page.
- **Trigger:** the owner uploads an `.html` file (saved in their browser via *Save As → Webpage, Complete*) in the "Import → From a saved page" control. **Not a URL fetch**: retail pages are bot-protected, so the app never requests the page itself. It reads the file the owner supplies (ADR-0009).
- **Behaviour:** the server parses the uploaded HTML (preferring the embedded **JSON-LD `Product`** block, falling back to `og:`/`<title>` tags and the page's visible text) to obtain the fields, the source `product_url`, and the **official image URLs**. The visible text + JSON-LD are sent to the LLM to fill and translate the fields. The official image URLs are returned to the form for preview; the ones the owner keeps are **downloaded and stored as `official` photos at save time** by `createItem` (not at import time).
- **Outcome:** a prefilled form with previewed official photos, pending review and save. If the file can't be parsed, it fails gracefully (`VAL-IMPORT-03`) and the owner falls back to screenshot or manual entry.

## 3. Extraction contract

The LLM is asked for a structured object mirroring the item fields it can plausibly read from a product page: `name`, `brand`, `productCode`, `color`, `size`, `listPrice`, `pricePaid`, `currency`, `material`, `care`, `description`, and `details` (label/value sections such as fit, sustainability, traceability). Two brand-specific `details` sections are captured explicitly when the page exposes them: a **Collection** / sub-line (e.g. Max Mara names lines like *Max Mara*, *Weekend Max Mara*, *MaxMara Accessori*, *Max Mara Studio*), and a **Model** name, the alphabetic model code printed alongside the numeric article code (e.g. Max Mara's `Produktcode: 1000000000001 - DEMOCODE`, where `DEMOCODE` is how store staff look a piece up). The numeric code stays in `productCode`; the model name goes to `details` as `{label: "Model"}`. Purchase-specific fields (`purchasedAt`, `purchaseChannel`, `returnBy`, `pricePaid`, favourite) are the owner's to fill; the model may leave them blank or infer conservatively.

### 3.1a Tags are derived, not asked for (#107)

The model is **not** asked to choose tags. Season and the five style facets (sleeve, neck, fit, length, silhouette) are computed from the text it already returned, by the same `inferSeasons` and `deriveFacets` a hand-filed piece goes through (`VAL-IMPORT-09`).

This was scoped the other way round: #107 originally proposed extending the prompt and schema so the model produced the tags. Three things argue against it.

- **A model judging a garment from a product photograph is precisely what has misled this catalogue**: a rolled sleeve read as ¾, a maker's own copy calling a ¾ sleeve "short", one technical knit read as softer than its identically harsh sibling. Deterministic rules cannot invent a facet; they only repeat what the page says.
- **It costs no quota.** The Gemini free tier allows 20 requests a day and this adds none: the extraction already returns the description with its feature list preserved, which is where the facts are.
- **One rule for both doors.** A piece filed by hand and a piece filed by import get their tags from the same functions, so the two cannot drift.

Translation makes it work across languages without extra effort: the description is normalised to English (`VAL-IMPORT-08`) *before* the facets are read, so a German page saying *Rundhalsausschnitt* arrives as "round neck".

**The known gap:** a facet stated only in the page's title, and absent from both the name and the feature list, is not recovered. The tags are a proposal on a form the owner reviews, so a miss costs a tick rather than a wrong record.

`description` is **Markdown**: the model preserves the official description in full, both its prose *and* any bulleted feature/detail list (fabric, collar, sleeves, closure, hem, …), kept as a Markdown bulleted list so it survives extraction and renders as a list (many product pages put key details in bullets; flattening or dropping them loses information). Model output sometimes **double-escapes** its line breaks (carrying the two characters `\` + `n` instead of a real newline, which would flatten the list into a single paragraph), so escaped breaks in the free-text fields are normalised before the values reach the form.

For the saved-page operation, structured **JSON-LD** (when present) is the preferred source for the core fields and the official image URLs, since it is given data rather than a guess; the model reconciles it with the page's visible text and supplies the sections JSON-LD omits (material composition, care, fit). When JSON-LD is absent, `og:` tags and visible text are used.

`name` is normalised to the catalogue's **Title Case** style regardless of how the retailer cases it (COS ships ALL CAPS, others sentence case): significant words capitalised, minor words (*with, in, and, of, the, on, for, to*) lowercase unless first, and both halves of a hyphenated compound capitalised (*Shawl-Collar Belted Linen Waistcoat*, *Rib-Knit Stretch Cotton Boatneck T-Shirt*). Proper nouns, model names, and established multi-word terms keep their own form (*Luisa*, *Crêpe de Chine*). This keeps imported names readable in the card grid and consistent with hand-entered ones.

Every extracted value is passed through the **item Zod schema** (ADR-0006, the `VAL-ITEM-*` rules) before it reaches the form; values that fail are dropped, not surfaced as errors (`VAL-IMPORT-05`). Text fields are normalised to a single target language (English by default): the model translates from the page's language so the wardrobe reads uniformly, while language-neutral values (product code, prices, currency, size) pass through unchanged (`VAL-IMPORT-08`).

## 4. Business validation rules

| Rule ID | Validation |
|:--|:--|
| `VAL-IMPORT-01` | Extraction **never auto-saves**. It only prefills the form; the owner must review and submit. |
| `VAL-IMPORT-02` | A screenshot input must be an image (`image/jpeg`, `image/png`, `image/webp`, `image/avif`; by MIME type or extension) within the upload size limit. |
| `VAL-IMPORT-03` | A saved-page input must be an HTML file (`text/html`, or an `.html`/`.htm` name) within the upload size limit. Unparseable or empty files fail **gracefully**: a clear message, no crash, manual entry still available. |
| `VAL-IMPORT-04` | Extracted values are **best-effort**. Uncertain or absent fields are left blank rather than guessed; the owner edits freely. |
| `VAL-IMPORT-05` | Extracted values are validated against the item schema before prefill; invalid values are dropped silently (never block the flow). |
| `VAL-IMPORT-06` | (1.5b) Official photos are downloaded **at save time** from the URLs the owner keeps, validated (type/size, max count), and stored as `kind = official`; a failed image is skipped, not fatal. |
| `VAL-IMPORT-07` | Only the file the owner supplies is sent to the model; no wardrobe data or PII is included. Inputs are public product pages; note that the Gemini free tier may use data for product improvement (ADR-0008). |
| `VAL-IMPORT-08` | Extracted text is normalised to one target language (default English): name, colour, material, care, description, and `details` are translated into it; product code, prices, currency, and size pass through unchanged. |
| `VAL-IMPORT-09` | (1.5b) When the saved page contains a JSON-LD `Product` block, it is the preferred source for the core fields and official image URLs; `og:`/`<title>`/visible text are the fallback when JSON-LD is missing or partial. |
| `VAL-IMPORT-10` | (1.5b) A page without a JSON-LD `Product` exposes only a single `og:image`, so the rest of the official gallery is **harvested from the markup**: images on the same CDN host carrying the same product key (so other products' shots are excluded), skipping thumbnails and colour swatches, one entry per shot at the largest available size. Harvested URLs drop any CDN resize transform to fetch the full-size original; the seed image is left untouched. Galleries rendered only client-side remain out of reach (see #49). |
| `VAL-IMPORT-11` | (1.5b) Sections a retailer renders **client-side but embeds as structured JSON** (COS: *Details*, *Care Guide*, *Materials and Suppliers*) are recovered **deterministically, with no model call and no tokens**. Composition fills `material`, grouped by component ("Shell: 50% linen…; Lining: 100% viscose"); care instructions fill `care` as one plain-text sentence; supplier facts are appended to `details` as `Made in` / `Factory` rows, never replacing a section the model already labelled. The Details tab is handed to the model as Markdown so its bullet list survives *and* is still translated (`VAL-IMPORT-08`), and the article number is left out of the description since it already lives in `productCode`. A page without these payloads is unaffected, and a malformed payload degrades to the previous behaviour rather than failing the import. |
| `VAL-IMPORT-12` | Tags are **derived from the extracted text, never requested from the model**: season via `inferSeasons`, style facets via `deriveFacets`, the same functions a hand-filed piece uses. They are proposals: every one arrives as a ticked checkbox the owner can clear, and none is written until she saves (`VAL-IMPORT-01`). |
| `VAL-IMPORT-13` | A derived tag is **only ever added**, never used to clear or replace a choice already on the form. |

## 5. Error handling & cost

- Any extraction error surfaces as a toast and leaves the form usable for manual entry (`VAL-IMPORT-03`). **Transient** AI failures (rate limit / overload / timeout; the free tier caps requests-per-minute) are distinguished from genuine "can't read the input" failures, so the message reads *"the AI service is busy. Wait a moment and try again"* rather than blaming the file.
- One model call per import (on demand); no background or bulk calls. Model + cost controls live in the AI-stack ADR (ADR-0008).

## 6. Out of scope / future

- Bulk import, non-clothing recognition, and auto-tagging from photos.
- Re-import / refresh of an existing item from its `product_url`.
- Server-side URL fetch and headless-browser scraping: rejected in ADR-0009 (bot protection). The saved-page upload replaces it.
