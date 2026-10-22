import { COMPENDIUM_ENTRIES } from "@/lib/compendium/entries";

/**
 * Filtering the wardrobe by what a piece is made of (#263).
 *
 * `material` is free text — 189 distinct strings — so this cannot be an enum
 * over stored values. It does not need to be: the Compendium already holds a
 * curated, tested vocabulary of fibres, each carrying every spelling a label
 * might use (`polyamide` / `polyamid` / `nylon`). Deriving the filter from
 * those entries means the filter and the glossary **cannot disagree** — the
 * same discipline `colorFamiliesOf` enforces for colour (`VAL-BROWSE-17`).
 *
 * **Fibres only, deliberately.** A composition label lists fibres; *poplin* and
 * *denim* answer "how was it woven", which is a different question the
 * Compendium answers elsewhere. A control that meant both would mean neither.
 */

export type MaterialFacet = { key: string; label: string; tokens: readonly string[] };

/**
 * In the glossary's own order — naturals, then regenerated cellulose, then
 * synthetics — rather than by how many pieces match. That order is a fact about
 * fibres; a frequency order would reshuffle itself as the wardrobe changed.
 */
export const MATERIAL_FACETS: MaterialFacet[] = COMPENDIUM_ENTRIES.filter(
  (e) => e.group === "fibre" && (e.match?.tokens?.length ?? 0) > 0,
).map((e) => ({ key: e.slug, label: e.term, tokens: e.match!.tokens }));

export const MATERIAL_KEYS: string[] = MATERIAL_FACETS.map((f) => f.key);

const KNOWN = new Set(MATERIAL_KEYS);

/** Whether a URL parameter names a real facet; unknown keys are ignored, never
 *  an error (`VAL-BROWSE-02`). */
export function isMaterialKey(key: string): boolean {
  return KNOWN.has(key);
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * One Postgres regex per selected fibre, for `~*` against the `material` column.
 *
 * **Word-bounded**, because the alternative is the mistake this catalogue has
 * already made twice: `silk` is inside *silky* and `rib` is inside *ribbon*.
 *
 * The Compendium's matcher also skips negated mentions, pairing phrases and
 * Markdown links, none of which SQL can express. That is safe to lose **here
 * and only here**: those guards exist for prose, and this reads the composition
 * label.
 *
 * Re-measured 2026-08-02 across all 357 material strings: **zero links, zero
 * pairing phrases, and one negation** — *"Linen (exact composition not stated
 * on the saved page)"*, a parenthetical note rather than a composition, and
 * harmless because no fibre name follows the *not*. It is also the warning the
 * original note gave: if `material` starts carrying sentences, re-measure this
 * rather than trusting it.
 *
 * Returned as patterns for the caller to bind as parameters — never
 * interpolated. `~*` binds tighter than `||`, and building the pattern inside
 * the SQL string once made every keyword search return zero rows in silence.
 */
export function materialPatterns(keys: readonly string[]): string[] {
  return MATERIAL_FACETS.filter((f) => keys.includes(f.key)).map(
    (f) => `\\y(${f.tokens.map(escapeRegex).join("|")})\\y`,
  );
}
