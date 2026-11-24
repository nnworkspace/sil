import { describe, expect, it } from "vitest";

import { allowsInsideWord, escapeLike, escapeRegex, wordPrefixPattern } from "@/lib/search";
import { colorKeywordsForQuery } from "@/lib/colors";

/**
 * The keyword-search rule (`VAL-BROWSE-04`, #222).
 *
 * The owner searched "red" in *tops* and her burgundy piece did not appear.
 * Two faults, pulling opposite ways (matching far too much, and too little),
 * and these tests pin both, because either could be undone by a plausible
 * simplification.
 *
 * The SQL itself has no test tier yet, so the rule lives here as pure functions
 * and the query composes them.
 */

/** A stand-in for Postgres `~*` with `\y`, so the rule can be exercised in JS. */
const matchesPrefix = (haystack: string, query: string) =>
  new RegExp(wordPrefixPattern(query).replace(/\\y/g, "\\b"), "i").test(haystack);

describe("VAL-BROWSE-04: matching at a word start", () => {
  it("does not find a short query inside a longer word", () => {
    // The fault the owner hit: `collared` is on most shirts, and it contains
    // "red". A bare substring returned dozens of pieces for "red", only a handful of them red.
    expect(matchesPrefix("collared", "red")).toBe(false);
    expect(matchesPrefix("Tapered Turn-Up Wool Trousers", "red")).toBe(false);
    expect(matchesPrefix("Draped-Front Structured Top", "red")).toBe(false);
  });

  it("still finds a query that is a prefix of a longer word", () => {
    // Whole-word matching would have been the obvious stricter rule, and it
    // would break the way people actually type.
    expect(matchesPrefix("Tapered Turn-Up Wool Trousers", "trouser")).toBe(true);
    expect(matchesPrefix("Cashmere Boat-Neck Jumper", "jump")).toBe(true);
  });

  it("treats a hyphen as a word start, so a berth or a facet is reachable", () => {
    expect(matchesPrefix("R1-W6R2-S4-L", "S4")).toBe(true);
    expect(matchesPrefix("Boat-Neck Fine-Knit Jumper", "neck")).toBe(true);
  });

  it("matches a genuinely red piece", () => {
    expect(matchesPrefix("poppy red", "red")).toBe(true);
  });
});

describe("the compound-tail threshold", () => {
  it("keeps short queries strict", () => {
    // Three characters is where the collisions live.
    expect(allowsInsideWord("red")).toBe(false);
  });

  it("lets a longer query reach inside a compound", () => {
    // Boatneck, Crewneck, camelwool: real matches in a catalogue that the
    // strict rule alone would lose.
    expect(allowsInsideWord("neck")).toBe(true);
    expect(allowsInsideWord("wool")).toBe(true);
  });

  it("ignores surrounding whitespace when deciding", () => {
    expect(allowsInsideWord("  red  ")).toBe(false);
    expect(allowsInsideWord("  neck  ")).toBe(true);
  });
});

describe("escaping", () => {
  it("matches a typed berth code literally, not as a pattern", () => {
    // `S4-L` and `3/4` are things the owner really types. Unescaped, the
    // hyphen and the metacharacters would change what the regex means.
    expect(matchesPrefix("R1-W6R2-S4-L", "S4-L")).toBe(true);
    expect(matchesPrefix("sleeve 3/4 cropped", "3/4")).toBe(true);
  });

  it("does not let a query act as a wildcard", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeRegex("a.b*c")).toBe("a\\.b\\*c");
  });

  it("does not match everything when the query is regex-special", () => {
    // Unescaped, "." would match any character and return the whole wardrobe.
    expect(matchesPrefix("Silk Top", ".")).toBe(false);
  });
});

describe("#222: a query that names a colour family", () => {
  it("reaches the colours in that family, so 'red' finds burgundy", () => {
    const kws = colorKeywordsForQuery("red");
    expect(kws).toContain("burgundy");
    expect(kws).toContain("maroon");
    expect(kws).toContain("wine");
  });

  it("works from the family's label as well as its key", () => {
    expect(colorKeywordsForQuery("Blue")).toContain("cobalt");
    expect(colorKeywordsForQuery("blue")).toContain("navy");
  });

  it("does not expand a query that merely names one member colour", () => {
    // Typing "burgundy" should not drag in every crimson and wine piece. That
    // answers a question the owner did not ask.
    expect(colorKeywordsForQuery("burgundy")).toEqual([]);
    expect(colorKeywordsForQuery("navy")).toEqual([]);
  });

  it("leaves an ordinary query alone", () => {
    expect(colorKeywordsForQuery("cashmere")).toEqual([]);
    expect(colorKeywordsForQuery("")).toEqual([]);
  });
});
