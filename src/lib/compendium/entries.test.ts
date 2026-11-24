import { describe, expect, it } from "vitest";

import { COMPENDIUM_ENTRIES, entriesForPiece } from "@/lib/compendium/entries";

/**
 * The link from a piece back to what it is made of
 * (`VAL-COMP-09`, #213 phase 3).
 *
 * The interesting cases are all about restraint: an item page must not gain an
 * empty section, must not repeat itself, and must not claim more than the
 * catalogue says.
 */

const piece = (p: { material?: string; description?: string; notes?: string }) => ({
  material: p.material ?? null,
  description: p.description ?? null,
  notes: p.notes ?? null,
});

const slugs = (p: Parameters<typeof entriesForPiece>[0]) =>
  entriesForPiece(p).map((e) => e.slug);

describe("VAL-COMP-09: entries for a piece", () => {
  it("names every fibre in a blend, not just the first", () => {
    expect(slugs(piece({ material: "72% cotton, 23% nylon, 5% elastane" }))).toEqual([
      "cotton",
      "polyamide",
      "elastane",
    ]);
  });

  it("returns nothing when the material says nothing it recognises", () => {
    // A page must not gain an empty row, so the caller needs a real empty here
    // rather than a placeholder entry.
    expect(entriesForPiece(piece({ material: "sterling silver" }))).toEqual([]);
    expect(entriesForPiece(piece({}))).toEqual([]);
  });

  it("reads construction from the description, where those words actually live", () => {
    // 'jersey' turns up constantly in product prose and almost never in a
    // composition label.
    expect(slugs(piece({ material: "100% cotton", description: "a soft jersey tee" }))).toEqual([
      "cotton",
      "jersey",
    ]);
  });

  it("keeps declaration order: fibre, then construction, then finish", () => {
    // So the line reads as a sentence (what it is made of, how that became
    // cloth, what was done to the cloth) rather than as an arbitrary list.
    const found = slugs(
      piece({ material: "100% cotton (mercerised, silky sheen)", description: "poplin" }),
    );
    expect(found).toEqual(["cotton", "poplin", "mercerised"]);
  });

  it("#213: does not file a cotton piece under Silk because it is 'silky'", () => {
    // A real-world label string on a cotton top. This is the case that
    // justifies both-sided token boundaries, and it is worth pinning here too
    // because it is now visible on an item page rather than buried in a count.
    expect(slugs(piece({ material: "100% cotton (mercerised, silky sheen)" }))).not.toContain(
      "silk",
    );
  });

  it("never lists the same entry twice", () => {
    // "cotton ... cotton" would look like a bug even though the piece really
    // does say it twice.
    const found = slugs(piece({ material: "shell 100% cotton, lining 100% cotton" }));
    expect(found).toEqual([...new Set(found)]);
    expect(found).toEqual(["cotton"]);
  });

  it("#213: recognises a double-faced knit however the phrase is written", () => {
    // The pieces that record it each write it differently, which is
    // why the entry carries the variants rather than trusting one spelling.
    for (const text of [
      "a fine-gauge double-faced knit, grey on the face and cobalt on the reverse",
      "outer layer 100% polyester, inner layer 100% cotton (double faced)",
      "a double-knit that neither curls nor runs",
    ]) {
      expect(slugs(piece({ description: text })), text).toContain("double-faced");
    }
  });

  it("only ever returns entries that exist in the glossary", () => {
    const known = new Set(COMPENDIUM_ENTRIES.map((e) => e.slug));
    const found = slugs(piece({ material: "100% cashmere", description: "ribbed hem" }));
    expect(found.length).toBeGreaterThan(0);
    for (const s of found) expect(known.has(s)).toBe(true);
  });
});

describe("#235: acetate, acrylic and metallic yarn", () => {
  it("reads acetate however the label spells it", () => {
    // Both are real strings in this catalogue; `Acetat` is what a German label
    // prints. Triacetate used to be asserted here too and deliberately is not
    // any more: it became its own entry in #261, because the two behave
    // differently in every way that matters to a wearer.
    expect(slugs(piece({ material: "Shell 100% Linen, Lining: 100% acetate" }))).toContain(
      "acetate",
    );
    expect(slugs(piece({ material: "Futter: 100% Acetat" }))).toContain("acetate");
  });

  it("reads acrylic under its German and long-form spellings", () => {
    for (const text of ["17% polyacrylic, 15% polyester", "50% Polyacryl, 50% Wolle", "100% acryl"]) {
      expect(slugs(piece({ material: text })), text).toContain("acrylic");
    }
  });

  it("finds metallic yarn in the label and in the description", () => {
    // The two pieces that have it declare it in different places: the knit top
    // names the fibre, a jacket's label omits it entirely and only
    // the description says so. Hence the entry reads both fields.
    expect(slugs(piece({ material: "65% polyester, 35% metallised fibre" }))).toContain(
      "metallic-yarn",
    );
    expect(
      slugs(piece({ description: "a cream cloth shot through with silver metallic yarn" })),
    ).toContain("metallic-yarn");
  });

  it("does not file a leather belt under metallic yarn for its metallic finish", () => {
    // The false positive this rule was actually caught by: a coating on leather
    // is the opposite of a thread woven in. This is why the bare word
    // `metallic` is not a token.
    expect(
      slugs(piece({ material: "Shell: leder, Lining: cotton", description: "- Metallic finish" })),
    ).not.toContain("metallic-yarn");
  });

  it("every see-also points at an entry that exists", () => {
    // Cheap, and it fails loudly the next time an entry is renamed: a slug is
    // a contract once an item page links to it (SPEC-COMPENDIUM-INT §1).
    const known = new Set(COMPENDIUM_ENTRIES.map((e) => e.slug));
    for (const entry of COMPENDIUM_ENTRIES) {
      for (const ref of entry.seeAlso ?? []) {
        expect(known.has(ref), `${entry.slug} → ${ref}`).toBe(true);
      }
    }
  });
});

/**
 * Triacetate, split out of Acetate (#261).
 *
 * They share a chemistry and almost nothing else in use: acetate creases
 * permanently and cannot be washed, triacetate resists creasing and goes in the
 * machine. The owner needed exactly that difference to judge a dress, which is
 * what made one entry covering both insufficient.
 */
/**
 * Chambray, and the distinction it exists to make (#273).
 *
 * A shirt dress was filed as denim on the strength of a photograph (the rolled
 * cuff looked two-tone) and turned out to be chambray once the cloth was in
 * hand. Same indigo warp and white weft; a
 * completely different weave. The Compendium existed for exactly that
 * distinction and could not make it.
 */
describe("#273: chambray is not denim", () => {
  it("files a chambray piece under Chambray", () => {
    expect(slugs(piece({ material: "100% cotton (chambray)" }))).toContain("chambray");
  });

  it("does not also file it under Denim", () => {
    // The two are told apart by the weave, not by the colour, and a piece must
    // land in one answer rather than two.
    expect(slugs(piece({ material: "100% cotton (chambray)" }))).not.toContain("denim");
  });

  it("reads the word from prose, where a weave is actually named", () => {
    // No composition label in this catalogue says "chambray"; a label lists
    // fibres. It is the description that ever mentions a weave.
    expect(
      slugs(piece({ material: "100% cotton", description: "a soft chambray shirt dress" })),
    ).toContain("chambray");
  });

  it("still finds cotton, because chambray is a weave and not a fibre", () => {
    expect(slugs(piece({ material: "100% cotton (chambray)" }))).toContain("cotton");
  });

  it("keeps the two cross-referenced, so neither is a dead end", () => {
    // This is the whole point of the entry: you arrive at one wanting the other.
    const cham = COMPENDIUM_ENTRIES.find((e) => e.slug === "chambray");
    const denim = COMPENDIUM_ENTRIES.find((e) => e.slug === "denim");
    expect(cham?.seeAlso).toContain("denim");
    expect(denim?.seeAlso).toContain("chambray");
  });

  it("carries the test that actually settles it", () => {
    // A `recognise` line that said "plain weave, indigo warp" would be true and
    // useless. The cuff test is what the owner used.
    const cham = COMPENDIUM_ENTRIES.find((e) => e.slug === "chambray");
    expect(cham?.recognise).toMatch(/cuff/i);
    expect(COMPENDIUM_ENTRIES.find((e) => e.slug === "denim")?.recognise).toMatch(/cuff/i);
  });
});

describe("#261: triacetate is its own entry", () => {
  it("files a triacetate piece under Triacetate", () => {
    expect(slugs(piece({ material: "70% triacetate, 30% polyester" }))).toContain("triacetate");
  });

  it("no longer files it under Acetate as well", () => {
    // The reason `triacetate` was removed from the acetate tokens: a piece must
    // land in exactly one entry, or an item page lists two answers.
    expect(slugs(piece({ material: "70% triacetate, 30% polyester" }))).not.toContain("acetate");
  });

  it("still files a plain acetate lining under Acetate", () => {
    expect(slugs(piece({ material: "Shell 100% Linen, Lining: 100% acetate" }))).toContain(
      "acetate",
    );
    expect(slugs(piece({ material: "Shell 100% Linen, Lining: 100% acetate" }))).not.toContain(
      "triacetate",
    );
  });

  it("reads the German spelling too", () => {
    expect(slugs(piece({ material: "100 % Triacetat" }))).toContain("triacetate");
  });

  it("keeps the two cross-referenced, so neither is a dead end", () => {
    const tri = COMPENDIUM_ENTRIES.find((e) => e.slug === "triacetate");
    const ace = COMPENDIUM_ENTRIES.find((e) => e.slug === "acetate");
    expect(tri?.seeAlso).toContain("acetate");
    expect(ace?.seeAlso).toContain("triacetate");
  });
});

/**
 * The silhouette vocabulary (#264).
 *
 * These eight words were already filterable tags in the app and explained
 * nowhere. Writing them exposed three tokens that cannot be bare words, which
 * is the point of these tests: the danger with a silhouette is that its name is
 * also an ordinary English word.
 */
describe("#264: silhouettes as Cuts", () => {
  it("reads a silhouette named outright", () => {
    expect(slugs(piece({ description: "A minimal sleeveless shift dress in a fluid fabric" }))).toContain(
      "shift",
    );
    expect(slugs(piece({ description: "a fitted black sheath dress" }))).toContain("sheath");
    expect(slugs(piece({ description: "Boxy, A-line swing shape with wide sleeves" }))).toContain(
      "a-line",
    );
  });

  it("does not read `column` from a trouser leg", () => {
    // Four real descriptions say a wide leg "falls in a straight column".
    // A bare token would have filed four pairs of trousers as column dresses.
    expect(
      slugs(piece({ description: "enough weight that the wide leg falls in a straight column" })),
    ).not.toContain("column");
    expect(
      slugs(piece({ description: "a clean, straight column silhouette" })),
    ).toContain("column");
  });

  it("does not read `wrap` from the verb", () => {
    // "ties that wrap around the body", "where trousers wrap and trap".
    expect(slugs(piece({ description: "long ties that wrap around the body" }))).not.toContain(
      "wrap",
    );
    expect(slugs(piece({ description: "this wrap dress has an adjustable tie" }))).toContain("wrap");
  });

  it("does not read `swing` from the verb", () => {
    expect(
      slugs(piece({ description: "the side slits letting the panels swing rather than wrap" })),
    ).not.toContain("swing");
    expect(slugs(piece({ description: "A sleeveless swing dress in cotton" }))).toContain("swing");
  });

  it("every silhouette the app can filter by is explained", () => {
    // The gap this closed: `shift` was a filterable tag with no entry behind
    // it. If a silhouette is added to TAG_GROUPS later, this fails until it is
    // also written up.
    const cuts = new Set(
      COMPENDIUM_ENTRIES.filter((e) => e.group === "cut").map((e) => e.slug),
    );
    for (const s of ["a-line", "fit-and-flare", "shift", "sheath", "wrap", "tunic", "swing", "column"]) {
      expect(cuts.has(s), s).toBe(true);
    }
  });
});

describe("#264: a-line and shift are not exclusive", () => {
  it("files a piece described as an A-line shift under both", () => {
    // A fitting-room correction, and a retailer's own words for two dresses:
    // "a straight A-line shift". Shift describes the waist, A-line the hem, so
    // a garment can be both; the first version of these entries implied it
    // could not.
    const found = slugs(
      piece({ description: "a straight, A-line shift falling to an above-knee hem" }),
    );
    expect(found).toContain("shift");
    expect(found).toContain("a-line");
  });
});

describe("#318: ramie", () => {
  it("is recognised in a composition, like its two relatives", () => {
    // Declaration order, not the order the label happens to list them in:
    // cotton is declared first in this file, so it comes first here.
    expect(slugs(piece({ material: "55% ramie, 45% cotton" }))).toEqual(["cotton", "ramie"]);
  });

  it("reads the accented spelling and the trade name", () => {
    // Italian labels write `ramié`, and nothing normalises accents away: the
    // spelling variant is the entry's job, as it is for elastane/elastan.
    expect(slugs(piece({ material: "100% ramié" }))).toEqual(["ramie"]);
    expect(slugs(piece({ material: "100% china grass" }))).toEqual(["ramie"]);
  });

  it("does not fire on `Made in China`, which care labels are full of", () => {
    // The token is the whole phrase, never the bare country: the same reason
    // `metallic` alone was rejected for metallic yarn.
    expect(slugs(piece({ material: "100% cotton, made in China" }))).toEqual(["cotton"]);
  });

  it("looks only at the composition, like every other fibre here", () => {
    // `fields` is unset, so prose is not searched. A dress *described* as
    // having a china-grass look is not a ramie dress.
    expect(slugs(piece({ material: "100% viscose", description: "a china grass look" })))
      .toEqual(["viscose"]);
  });

  it("is not confused with linen or hemp", () => {
    expect(slugs(piece({ material: "100% linen" }))).toEqual(["linen"]);
    expect(slugs(piece({ material: "100% hemp" }))).toEqual(["hemp"]);
  });
});

describe("#318: the bast fibres reach each other", () => {
  it("links all three ways, so no member of the family is a dead end", () => {
    // Before this, hemp named only linen and linen named only hemp: ramie was
    // unreachable from either, which is worse than not having the entry.
    const by = new Map(COMPENDIUM_ENTRIES.map((e) => [e.slug, e]));
    for (const [from, to] of [
      ["linen", "ramie"],
      ["hemp", "ramie"],
      ["ramie", "linen"],
      ["ramie", "hemp"],
    ]) {
      expect(by.get(from)?.seeAlso ?? []).toContain(to);
    }
  });

  it("every seeAlso on the new entry points at an entry that exists", () => {
    const slugsAll = new Set(COMPENDIUM_ENTRIES.map((e) => e.slug));
    for (const s of COMPENDIUM_ENTRIES.find((e) => e.slug === "ramie")?.seeAlso ?? []) {
      expect(slugsAll.has(s)).toBe(true);
    }
  });
});
