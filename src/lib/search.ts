/**
 * The keyword-search rule (`VAL-BROWSE-04`, #222).
 *
 * Pure, and separate from `queries.ts`, because the rule is the interesting
 * part and SQL is only how it is executed. There is no query-layer test tier
 * yet, so anything left inside the `sql` template is verified by hand or not at
 * all.
 *
 * The rule earns its complexity. Matching the query as a substring *anywhere*
 * made a search for "red" return dozens of pieces, only a handful of them red: the rest came from
 * the tag `collared` (colla**red**) and names like *Tapered* Trousers. That
 * noise is what hid the burgundy top the owner was looking for.
 */

/** Escape LIKE wildcards so a query is matched literally (default `\` escape). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Escape POSIX-regex metacharacters, so a typed `S4-L` or `3/4` is matched as
 *  written rather than compiled as a pattern. */
export function escapeRegex(value: string): string {
  return value.replace(/[.^$*+?()[\]{}|\\-]/g, (c) => `\\${c}`);
}

/**
 * Below this length a query must match the **start** of a word; at or above it
 * it may also match inside one.
 *
 * Four, because the only matches the strict rule loses are compound tails
 * (*Boatneck*, *Crewneck*, *camelwool*), and every one of them is reached by a
 * query of four characters or more, while the false positives that prompted the
 * fix came from three ("red" inside *collared*). Nine real matches bought back,
 * ninety-six false ones kept out.
 */
export const COMPOUND_QUERY_MIN = 4;

/**
 * A Postgres regex matching the query at the **start of a word**.
 *
 * Prefix rather than whole word, deliberately: whole-word matching would break
 * "trouser" → *Trousers*, which is how people actually type.
 */
export function wordPrefixPattern(query: string): string {
  return `\\y${escapeRegex(query.trim())}`;
}

/** Whether this query may also match inside a word (see `COMPOUND_QUERY_MIN`). */
export function allowsInsideWord(query: string): boolean {
  return query.trim().length >= COMPOUND_QUERY_MIN;
}
