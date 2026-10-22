/**
 * Colour families for the browse/category colour filter (#105).
 *
 * The `color` field is free text (dozens of distinct values — "cobalt blue",
 * "midnight blue", "flamingo", "off-white"…). Rather than a messy exact-value
 * list, the filter offers a small set of base **families**; a piece belongs to a
 * family when its `color` string contains any of the family's keywords (matched
 * case-insensitively as a substring in SQL). A colour can fall in more than one
 * family (e.g. "black / white" → Multi via "/"), which is fine for filtering.
 */

// `swatch` is a representative colour for the family, used on the Figures
// dashboard (#181). It is a *literal* encoding — the mark shows the thing it
// counts — not an assigned categorical palette, so every swatch is paired
// with its name and identity never rests on colour alone.
export const COLOR_FAMILIES = [
  { key: "black", label: "Black", swatch: "#1c1c1c", keywords: ["black"] },
  { key: "white", label: "White", swatch: "#f4f2ed", keywords: ["white", "ivory", "cream", "off white", "off-white"] },
  { key: "grey", label: "Grey", swatch: "#9a9a9a", keywords: ["grey", "gray", "silver", "charcoal"] },
  {
    key: "blue",
    label: "Blue",
    swatch: "#3b5a80",
    keywords: ["blue", "navy", "cobalt", "indigo", "ultramarine", "denim", "teal", "turquoise", "sky", "nocturne", "azure"],
  },
  { key: "green", label: "Green", swatch: "#5f7a52", keywords: ["green", "olive", "lime", "khaki", "mint", "sage", "emerald", "sea glass"] },
  { key: "red", label: "Red", swatch: "#9c2b2b", keywords: ["red", "burgundy", "crimson", "maroon", "scarlet", "wine", "poppy"] },
  {
    key: "pink",
    label: "Pink",
    swatch: "#d98da6",
    keywords: ["pink", "rose", "flamingo", "blush", "mauve", "fuchsia"],
  },
  { key: "yellow", label: "Yellow", swatch: "#d4a340", keywords: ["yellow", "mustard", "gold", "lemon"] },
  { key: "orange", label: "Orange", swatch: "#c2703d", keywords: ["orange", "coral", "rust", "terracotta", "apricot", "tangerine", "amber"] },
  { key: "purple", label: "Purple", swatch: "#7d5a8c", keywords: ["purple", "violet", "lilac", "plum", "lavender", "aubergine"] },
  {
    key: "neutral",
    label: "Neutral",
    swatch: "#b9a893",
    // `bronze` joins the browns rather than the yellows: it is a warm dark
    // metal, and a shoe colour such as "Lightbronce" reads closer to camel than to gold. Added
    // because the colour matched no family at all, so the piece was invisible
    // to the colour filter entirely.
    keywords: ["beige", "sand", "camel", "taupe", "nude", "brown", "bronze", "chocolate", "stone", "oat", "ecru", "tan"],
  },
  { key: "multi", label: "Multi", swatch: "#8a8f98", keywords: ["multi", "print", "pattern", "floral", "stripe", "check", "/"] },
] as const;

export type ColorFamilyKey = (typeof COLOR_FAMILIES)[number]["key"];

/**
 * Colours that **declare** their family instead of having it guessed (#211).
 *
 * Keyed by the whole `color` string, lower-cased — an exact statement about one
 * colour name, not another guessing rule. When a colour appears here its
 * families are used and substring matching is skipped entirely.
 *
 * Kept deliberately short. Measured across the distinct colours in a real catalogue, substring matching puts roughly a quarter of them in more than one family, and **almost all of those are right**: "navy / white" genuinely is both, and so is
 * "grey / pink". Multi-family is the norm, not the bug. Only these two are
 * actually wrong, and each is wrong for the same reason: one colour's name
 * contains another colour's word.
 */
export const COLOR_OVERRIDES: Record<string, readonly ColorFamilyKey[]> = {
  // COS named a pale pink shirt this. "blueberry" contains "blue".
  "blueberry milk": ["pink"],
  // "primrose" contains "rose", so it answered a search for Pink.
  "primrose yellow": ["yellow"],
};

/**
 * The families a colour string belongs to — **the single rule**, and the only
 * place it is decided.
 *
 * It had been re-implemented four times over (the SQL browse filter, the
 * Figures colour module, the trip picker, and the tests' own helper), which is
 * why an override could not simply be added in one place.
 */
export function colorFamiliesOf(color: string | null | undefined): ColorFamilyKey[] {
  const c = (color ?? "").trim().toLowerCase();
  if (!c) return [];
  const declared = COLOR_OVERRIDES[c];
  if (declared) return [...declared];
  return COLOR_FAMILIES.filter((f) => f.keywords.some((k) => c.includes(k))).map((f) => f.key);
}

/** Whether a colour belongs to a family, through `colorFamiliesOf`. */
export function isInColorFamily(color: string | null | undefined, key: string): boolean {
  return colorFamiliesOf(color).includes(key as ColorFamilyKey);
}

/**
 * What a SQL filter needs to honour the overrides, since it cannot call
 * `colorFamiliesOf` per row:
 *
 * - `keywords` — the ordinary substring match for the selected families
 * - `exactly`  — colour strings the override *puts into* a selected family
 * - `notExactly` — colour strings the override *keeps out*, which must be
 *   excluded even when a keyword would otherwise match them
 */
export function colorMatchSpec(keys: string[]): {
  keywords: string[];
  exactly: string[];
  notExactly: string[];
} {
  const selected = new Set(keys);
  const exactly: string[] = [];
  const notExactly: string[] = [];
  for (const [color, families] of Object.entries(COLOR_OVERRIDES)) {
    (families.some((f) => selected.has(f)) ? exactly : notExactly).push(color);
  }
  return { keywords: colorKeywords(keys), exactly, notExactly };
}

export const COLOR_FAMILY_KEYS: string[] = COLOR_FAMILIES.map((f) => f.key);

/** All keywords for the given family keys, flattened (for the SQL colour match). */
export function colorKeywords(keys: string[]): string[] {
  return COLOR_FAMILIES.filter((f) => keys.includes(f.key)).flatMap((f) => f.keywords);
}

/**
 * The colour keywords a *search query* should reach (#222).
 *
 * The owner searched "red" and her burgundy top did not appear: `burgundy`
 * contains no "red", so it was never a candidate — even though the colour
 * *filter* has known it is Red since #105. The search box simply never asked.
 *
 * Expansion happens only when the query names a **family** (its key or label),
 * never when it names a member keyword. Typing "red" should reach burgundy;
 * typing "burgundy" should not drag in every crimson and wine piece — that
 * would be answering a question the owner did not ask.
 *
 * Returns `[]` when the query names no family, which leaves the search
 * untouched.
 */
export function colorKeywordsForQuery(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const family = COLOR_FAMILIES.find(
    (f) => f.key === q || f.label.toLowerCase() === q,
  );
  return family ? [...family.keywords] : [];
}
