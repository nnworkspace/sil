/**
 * Parse a *saved* product page (ADR-0009; specs/ai-import, OP-IMPORT-HTML).
 *
 * Server-only, dependency-free. We never fetch the retailer's page. The owner
 * saves it in their browser (Save As → Webpage, Complete) and uploads the file;
 * here we pull out the useful bits: the embedded JSON-LD `Product` (preferred),
 * `og:`/`<title>` fallbacks, the official image URLs, the source URL, and the
 * stripped visible text. Nothing here calls the network or the model.
 */

/**
 * Facts recovered from structured data the retailer embeds in the page for
 * sections it renders client-side (#66). COS keeps its Details, Care Guide and
 * Materials-and-Suppliers tabs as JSON in a script, so they are absent from the
 * visible text, but perfectly parseable, and deterministic enough that no model
 * call is needed for them.
 */
export type EmbeddedFacts = {
  /** The Details tab as Markdown, bullets intact. Fed to the model (so it is
   *  still translated), not written straight to the item. */
  description?: string;
  /** Composition, grouped by component: "Shell: 50% linen…; Lining: 100%…". */
  material?: string;
  /** Care instructions joined into one plain-text sentence. */
  care?: string;
  /** Supplier rows for `details` (Made in / Factory). */
  details: { label: string; value: string }[];
};

export type ParsedProductPage = {
  /** JSON-LD `Product` object if the page carried one (VAL-IMPORT-09). */
  jsonLd: Record<string, unknown> | null;
  /** Canonical page URL (`og:url` / JSON-LD offer url), for `product_url`. */
  productUrl: string | null;
  title: string | null;
  ogDescription: string | null;
  /** Official product image URLs (JSON-LD `image[]` → `og:image`), deduped. */
  imageUrls: string[];
  /** Visible page text, scripts/styles stripped, whitespace collapsed. */
  text: string;
  /** Client-rendered sections recovered from embedded JSON, when present (#66). */
  facts: EmbeddedFacts | null;
};

const MAX_TEXT_CHARS = 24_000;

/** Decode the handful of HTML entities that show up in meta/JSON content. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Read one attribute's value from a single tag's source. */
function attr(tag: string, name: string): string | null {
  const m = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"),
  );
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? "").trim();
}

/** Build a map of `<meta>` property/name → content. */
function metaMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = attr(tag, "property") ?? attr(tag, "name");
    const content = attr(tag, "content");
    if (key && content && !map.has(key.toLowerCase())) {
      map.set(key.toLowerCase(), content);
    }
  }
  return map;
}

/** Collect and parse every JSON-LD block, flattening `@graph` and arrays. */
function jsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const re =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue; // a malformed block is not fatal
    }
    const stack = [parsed];
    while (stack.length) {
      const node = stack.pop();
      if (Array.isArray(node)) {
        stack.push(...node);
      } else if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        if (Array.isArray(obj["@graph"])) stack.push(...obj["@graph"]);
        nodes.push(obj);
      }
    }
  }
  return nodes;
}

function isProduct(node: Record<string, unknown>): boolean {
  const t = node["@type"];
  return Array.isArray(t) ? t.includes("Product") : t === "Product";
}

/** Normalise JSON-LD `image` (string | string[] | ImageObject[]) to URLs. */
function imagesFromJsonLd(product: Record<string, unknown>): string[] {
  const raw = product.image;
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string") {
      out.push((v as { url: string }).url);
    }
  };
  if (Array.isArray(raw)) raw.forEach(push);
  else push(raw);
  return out;
}

function httpOnly(urls: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (u && /^https?:\/\//i.test(u) && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

const NON_PRODUCT_IMAGE = /thumbnail|swatch|sprite|icon|logo|placeholder|favicon/i;

/** The product key of a seed image URL: the longest digit run in its *path*.
 *  Used to keep sibling ("you may also like") products out of the harvested
 *  gallery. The query string is ignored: cache-busting stamps like
 *  `?ts=1616710855` are longer than the product id and would win. */
function productKey(url: string): string | null {
  const runs = url.split("?")[0].match(/\d{6,}/g);
  return runs ? runs.reduce((a, b) => (b.length >= a.length ? b : a)) : null;
}

/** Collapse one shot served at several sizes to a single key, e.g.
 *  `…-b-smmambra_normal.webp` and `…-b-smmambra.webp`. */
function variantKey(url: string): string {
  const file = (url.split("/").pop() ?? "").replace(/\?.*$/, "");
  return file
    .replace(/_(normal|thumbnail|small|medium|large|zoom)\b/gi, "")
    .replace(/\.(jpe?g|png|webp|avif)$/i, "")
    .toLowerCase();
}

/** Drop a CDN resize-transform path segment so the full-size original is used:
 *  `/small_light(dw=81,ch=158,of=webp)/pub/…` → `/pub/…`. Markup often only
 *  carries tiny thumbnails of the secondary shots, which are not worth storing.
 *  Applied to harvested images only, never to the seed, so the existing
 *  primary-photo behaviour cannot regress. */
function stripTransform(url: string): string {
  return url.replace(/\/[a-z_]+\([^)]*=[^)]*\)(?=\/)/gi, "");
}

/** How large a candidate is, so the best copy of a shot wins: an untransformed
 *  original beats any resized one; otherwise compare the CDN's width hint, e.g.
 *  `/small_light(dw=240,of=webp)/` or `?w=800`. */
function widthHint(url: string): number {
  const m = url.match(/\bdw=(\d+)/i) ?? url.match(/[?&](?:w|width)=(\d+)/i);
  if (m) return Number(m[1]);
  return /\/[a-z_]+\([^)]*=[^)]*\)\//i.test(url) ? 0 : Number.POSITIVE_INFINITY;
}

/**
 * Harvest the rest of the official gallery from the raw markup (#61).
 *
 * A page without a JSON-LD `Product` exposes only a single `og:image`, so the
 * import would otherwise capture one photo even though the saved file holds the
 * whole gallery. Collect same-host images carrying the same product key, skip
 * thumbnails/swatches, de-duplicate shots served at several sizes (preferring
 * the untransformed original), and exclude the seed itself.
 */
function galleryFromHtml(html: string, seed: string): string[] {
  let host: string;
  try {
    host = new URL(seed).host;
  } catch {
    return [];
  }
  const key = productKey(seed);
  if (!key) return [];

  const seedKey = variantKey(seed);
  // Some URLs live inside embedded JSON with escaped slashes.
  const source = html.replace(/\\\//g, "/");
  // Parentheses are allowed: some CDNs put resize transforms in the path, e.g.
  // `/small_light(dw=240,of=webp)/`. A trailing one from a CSS `url(...)`
  // wrapper is trimmed below.
  const found =
    source.match(
      /https?:\/\/[^\s"'<>\\]+\.(?:jpe?g|png|webp|avif)(?:\?[^\s"'<>\\]*)?/gi,
    ) ?? [];

  const best = new Map<string, string>();
  for (const raw of found) {
    let url = decodeEntities(raw).replace(/#.*$/, "");
    while (
      url.endsWith(")") &&
      (url.match(/\)/g) ?? []).length > (url.match(/\(/g) ?? []).length
    ) {
      url = url.slice(0, -1);
    }
    url = stripTransform(url);
    if (!url.includes(key) || NON_PRODUCT_IMAGE.test(url)) continue;
    try {
      if (new URL(url).host !== host) continue;
    } catch {
      continue;
    }
    const k = variantKey(url);
    if (k === seedKey) continue;
    const current = best.get(k);
    if (!current || widthHint(url) > widthHint(current)) best.set(k, url);
  }
  return [...best.values()];
}

/** Strip a saved HTML document down to its visible text. */
function visibleText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
}

/** Pull an embedded JSON payload following `"key":` by balancing brackets. A
 *  malformed or truncated payload yields null and never throws. */
function embeddedJson(src: string, key: string): unknown {
  const at = src.indexOf(`"${key}":`);
  if (at < 0) return null;
  const rel = src.slice(at).search(/[[{]/);
  if (rel < 0) return null;
  const from = at + rel;
  const open = src[from];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let i = from; i < src.length && i < from + 200_000; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close && --depth === 0) {
      try {
        return JSON.parse(src.slice(from, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Soften SHOUTED source values (COS stores factory and city upper-cased). */
const titleish = (s: string) =>
  s.replace(/[A-ZÄÖÜ]{2,}/g, (w) => w[0] + w.slice(1).toLowerCase());

/** Turn the Details tab's HTML into Markdown, keeping its `<li>` items as a list. */
function detailsHtmlToMarkdown(html: string): string {
  return html
    .replace(/<li>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/?(?:p|ul|ol|br\s*\/?)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Recover the client-rendered sections COS embeds as JSON (#66). Every step is
 * defensive: anything missing or malformed is skipped, so a page that does not
 * carry these payloads (any other retailer) simply yields null and the import
 * behaves exactly as before.
 */
function embeddedFacts(html: string): EmbeddedFacts | null {
  // The payloads sit inside a JSON string in a script, so unescape one level.
  const src = html
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, c: string) =>
      String.fromCharCode(parseInt(c, 16)),
    )
    .replace(/\\"/g, '"')
    .replace(/\\r\\n|\\n/g, "\n");

  const facts: EmbeddedFacts = { details: [] };

  const comp = embeddedJson(src, "var_material_composition_desc");
  if (Array.isArray(comp)) {
    const parts = comp
      .filter((g): g is { type: string; materials: { material: string; percentage: number }[] } =>
        !!g && typeof g === "object" && Array.isArray((g as { materials?: unknown }).materials))
      .map(
        (g) =>
          `${g.type}: ${g.materials
            .map((m) => `${m.percentage}% ${String(m.material).toLowerCase()}`)
            .join(", ")}`,
      );
    if (parts.length) facts.material = parts.join("; ");
  }

  const care = embeddedJson(src, "var_care_instruction");
  if (Array.isArray(care) && care.length) {
    // Join into one sentence: "Dry clean; medium iron; unwashable." Items that
    // carry their own sentence break ("Machine wash cold. Gentle cycle.") keep
    // their capital, so the result still reads correctly.
    const items = care.map((c) => String(c).trim()).filter(Boolean);
    facts.care =
      items
        .map((c, i) =>
          i === 0 || c.includes(".") ? c : c.charAt(0).toLowerCase() + c.slice(1),
        )
        .join("; ")
        .replace(/\.?$/, ".");
  }

  const supplier = embeddedJson(src, "var_supplier_info_desc");
  if (Array.isArray(supplier) && supplier[0] && typeof supplier[0] === "object") {
    const s = supplier[0] as {
      suppliername?: string;
      factoryName?: string;
      noOfWorkers?: string | number;
      address?: Record<string, string>;
    };
    const a = s.address ?? {};
    if (a.countryName) facts.details.push({ label: "Made in", value: a.countryName });
    const factory = s.factoryName || s.suppliername;
    if (factory) {
      const where = [a.addressStreetLine1, [a.postalCode, a.city].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ");
      const workers = s.noOfWorkers ? ` (${s.noOfWorkers} employees)` : "";
      facts.details.push({
        label: "Factory",
        value: titleish(`${factory}${where ? `, ${where}` : ""}`) + workers,
      });
    }
  }

  const desc = src.match(/"var_article_description_desc":"([\s\S]*?)","var_/);
  if (desc) {
    const md = detailsHtmlToMarkdown(desc[1]);
    if (md) facts.description = md;
  }

  return facts.material || facts.care || facts.description || facts.details.length
    ? facts
    : null;
}

export function parseProductPage(html: string): ParsedProductPage {
  const meta = metaMap(html);
  const product = jsonLdNodes(html).find(isProduct) ?? null;

  const offerUrl =
    product && typeof product.offers === "object" && product.offers
      ? (product.offers as { url?: unknown }).url
      : undefined;

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title =
    (product && typeof product.name === "string" && product.name) ||
    meta.get("og:title") ||
    (titleTag ? decodeEntities(titleTag[1]).trim() : null) ||
    null;

  // Prefer the JSON-LD image set; fall back to og:image only when it has none
  // (og:image usually duplicates the JSON-LD lead shot at a different size).
  const jsonLdImages = product ? imagesFromJsonLd(product) : [];
  const seeds = httpOnly(
    jsonLdImages.length ? jsonLdImages : [meta.get("og:image") ?? null],
  );
  // With no JSON-LD `Product` there is only one og:image, so harvest the rest of
  // the gallery from the markup rather than importing a single photo (#61).
  const imageUrls =
    seeds.length > 1
      ? seeds
      : httpOnly([
          ...seeds,
          ...(seeds[0] ? galleryFromHtml(html, seeds[0]) : []),
        ]);

  const productUrl = httpOnly([
    meta.get("og:url") ?? null,
    typeof offerUrl === "string" ? offerUrl : null,
  ])[0] ?? null;

  return {
    jsonLd: product,
    productUrl,
    title,
    ogDescription: meta.get("og:description") ?? null,
    imageUrls,
    text: visibleText(html),
    facts: embeddedFacts(html),
  };
}
