# ADR-0009: Import from a saved product page (HTML upload) instead of server-side URL fetch

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-19 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`. Once a record is `Accepted`, only the status line of this table may change. Everything below is frozen at acceptance. To change the decision, write a new ADR that supersedes this one.

## Context and problem statement

Phase 1.5b of AI-assisted import (`specs/ai-import/`, issue #11) was specified as "paste a product URL → fetch the page server-side → extract fields and official photos". Before building, we probed the mechanism against a representative premium fashion retailer that the owner actually buys from, and found the fetch step is not viable:

- **Server-side `fetch`** of the product page returns **HTTP 403** — a Cloudflare bot-block page (~527 bytes, no product markup).
- **Gemini's own `urlContext` tool** (letting Google's infrastructure fetch the URL) also fails — `urlRetrievalStatus: URL_RETRIEVAL_STATUS_ERROR` — and the model then **hallucinated** fields from the URL slug (e.g. reported the style code `L5C` as the "colour"), which is worse than returning nothing.

Fashion retailers commonly sit behind bot protection (Cloudflare, Akamai) and/or render via client-side JavaScript, so this is not specific to that retailer. The only way to make URL fetch work would be a **headless browser that defeats bot-detection** — heavy, serverless-hostile, fragile against every anti-bot update, and in tension with the sites' terms of service. Disproportionate for a personal, single-user app.

Meanwhile the owner proposed an alternative: open the page in their own browser and **Save As → Webpage, Complete**, then upload the saved `.html` to the app. Inspecting a real saved file confirmed it is both feasible and *richer* than a screenshot:

- The saved page carries a clean **JSON-LD `Product`** block — `name`, an English `description`, `brand`, `offers.price` + `priceCurrency`, `sku`, and the list of official `image` URLs — machine-readable and reliable.
- It also contains the fully-rendered detail sections (material, care, fit, sustainability) that a screenshot would miss unless expanded, as ~19 KB of visible text (~5 K tokens) — trivial to hand to the model.
- The retailer's image CDN (a separate media subdomain) is **not** bot-blocked, so the official photos referenced in the page are downloadable server-side (HTTP 200).

## Decision drivers

- **Feasibility** — must actually work against Cloudflare-protected retail pages.
- **Reliability** — prefer given, structured data over pixel- or slug-guessing; no hallucination.
- **Simplicity / cost** — no headless browser, no scraping infrastructure, still the free Gemini tier (ADR-0008).
- **Human-in-the-loop** — unchanged; the owner reviews before anything is saved.
- **ToS posture** — no bot-detection evasion; the app only reads a file the owner supplies.

## Considered options

1. **Server-side URL fetch** (the original 1.5b) — blocked by bot protection (403). Rejected.
2. **Gemini `urlContext` tool** — also blocked; hallucinates from the URL. Rejected.
3. **Headless browser scraper** — could render the page but must fight bot-detection; heavy, fragile, ToS-fraught. Rejected for a personal app (revisit only if a real need appears).
4. **Upload a saved page (`.html`)** — the owner's browser renders past Cloudflare; the app parses the saved DOM. Feasible, reliable (JSON-LD), no scraping. **Chosen.**

## Decision

Implement Phase 1.5b as **"import from a saved product page"**: the owner uploads an `.html` file (saved via *Save As → Webpage, Complete*); a server-side parser extracts the **JSON-LD `Product`** data (preferred), `og:`/`<title>` fallbacks, the official image URLs, the source `product_url`, and the stripped visible text; the visible text + JSON-LD are sent to **Gemini** (`generateObject`, ADR-0008) to fill the item fields, translated to English (`VAL-IMPORT-08`). The official image URLs are previewed in the form and **downloaded and stored at save time** (via the existing photo-storage abstraction, ADR-0003) as `kind = official`.

- **No server-side fetch of the product page.** The app never requests the retailer's HTML; it only reads the uploaded file. It *does* download the referenced images (from the page the owner already loaded) at save time.
- **JSON-LD preferred, not required.** When a page lacks JSON-LD, fall back to `og:` tags and visible text; the model still extracts what it can.
- The screenshot path (1.5a) remains as the universal, zero-save-needed fallback.

## Consequences

**Positive**

- **Works** against bot-protected, JS-rendered retail pages — the failure mode that killed URL fetch.
- **More complete and more reliable** than a screenshot: structured JSON-LD fields, all detail sections, and the official photos.
- No scraping infrastructure, no bot-detection evasion, still $0 (ADR-0008).

**Negative / accepted trade-offs**

- **Manual step for the owner** — they must Save As the page and upload the file (vs pasting a URL). Acceptable for a single-user app; it is the price of bypassing bot protection cleanly. (Note: *Save As → Webpage, HTML Only* can be blocked by the page's own scripts; **Complete** is the reliable mode.)
- Parsing relies on the page having usable JSON-LD/`og:` markup or legible text; sparse pages yield sparser prefill (the owner completes the rest — unchanged human-in-the-loop).
- Image download still touches the retailer's CDN at save time; a blocked or failed image is skipped, not fatal (`VAL-IMPORT-06`).

**Re-evaluation triggers**

- A future need to import at scale, or from sites without saveable/legible markup, that would justify a headless-browser or official-API approach.
- CDNs begin blocking server-side image downloads (fall back to owner-uploaded photos).

## Notes

Refines the 1.5b mechanism of `specs/ai-import/` (issue #11); the provider decision (Gemini via the AI SDK) is unchanged (ADR-0008). Related: ADR-0002 (item model), ADR-0003 (photo storage), ADR-0006 (Zod).
