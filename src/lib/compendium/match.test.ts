import { describe, expect, it } from "vitest";

import { containsToken, matchesPiece, piecesFor } from "@/lib/compendium/match";
import { COMPENDIUM_ENTRIES, findEntry } from "@/lib/compendium/entries";

/**
 * The matcher (SPEC-COMPENDIUM-DATA §4, `VAL-COMP-04`).
 *
 * These tests exist because the failure mode is silent: a matcher that
 * over-matches produces a piece list that *looks* right, and the only way to
 * notice is to know the wardrobe. So the cases below are drawn from strings that
 * are really in the catalogue.
 */

describe("containsToken: boundaries", () => {
  it("matches a token surrounded by digits, punctuation or spaces", () => {
    expect(containsToken("95% viscose, 5% elastan.", "viscose")).toBe(true);
    expect(containsToken("95% viscose, 5% elastan.", "elastan")).toBe(true);
    expect(containsToken("100% cotton", "cotton")).toBe(true);
  });

  it("does not match inside a longer word", () => {
    // `ribbon` turns up in real product copy; `rib` must not find it.
    expect(containsToken("silk ribbon tie", "rib")).toBe(false);
    // `camelwool` is real too, which is why the wool entry lists it explicitly
    // rather than relying on `wool` to reach inside the word.
    expect(containsToken("52% camelwool, 48% polyester", "wool")).toBe(false);
    expect(containsToken("52% camelwool, 48% polyester", "camelwool")).toBe(true);
  });

  it("does not treat a shorter spelling as a match for a longer one", () => {
    // The catalogue writes both; the entry must list both (VAL-COMP-04).
    expect(containsToken("5% elastane", "elastan")).toBe(false);
  });

  it("is case-insensitive and tolerates odd whitespace", () => {
    expect(containsToken("96% TENCEL™  LYOCELL, 4% Elastane", "lyocell")).toBe(true);
  });

  it("treats a hyphen as a boundary", () => {
    expect(containsToken("lace-up boot", "lace")).toBe(true);
  });
});

describe("negation", () => {
  it("does not claim a material the text explicitly denies", () => {
    // The real case: a jumper whose hem is "left to roll instead of being
    // finished with a rib welt" was listed under Rib, the one construction it
    // does not have.
    expect(containsToken("left to roll instead of being finished with a rib welt", "rib")).toBe(
      false,
    );
    expect(containsToken("no visible rib at the cuff", "rib")).toBe(false);
    expect(containsToken("not lined in silk", "silk")).toBe(false);
    expect(containsToken("without a cotton lining", "cotton")).toBe(false);
  });

  it("still matches the same word used positively elsewhere", () => {
    // One denial must not suppress a genuine mention in the same text.
    expect(containsToken("no rib at the hem. The cuffs are rib.", "rib")).toBe(true);
  });

  it("stops at sentence punctuation, so a distant negative does not reach", () => {
    expect(containsToken("Not lined. A rib welt at the hem.", "rib")).toBe(true);
  });

  it("does not fire on an ordinary sentence that happens to contain 'no'", () => {
    // The guard looks just behind the match, not anywhere in the paragraph.
    expect(
      containsToken("there is no question this is the softest cashmere I own", "cashmere"),
    ).toBe(true);
  });
});

describe("matchesPiece: rules", () => {
  const cottonShirt = { material: "100% cotton poplin", description: null, notes: null };

  it("matches on the material field by default", () => {
    expect(matchesPiece({ tokens: ["cotton"] }, cottonShirt)).toBe(true);
  });

  it("ignores description and notes unless the entry asks for them", () => {
    const piece = { material: "100% cotton", description: "a soft jersey tee", notes: null };
    expect(matchesPiece({ tokens: ["jersey"] }, piece)).toBe(false);
    expect(
      matchesPiece({ tokens: ["jersey"], fields: ["material", "description"] }, piece),
    ).toBe(true);
  });

  it("lets an exclusion veto a hit", () => {
    const boot = { material: null, description: "lace-up ankle boot", notes: null };
    const rule = { tokens: ["lace"], exclude: ["lace-up"], fields: ["description"] as const };
    expect(matchesPiece({ ...rule, fields: ["description"] }, boot)).toBe(false);
  });

  it("matches nothing when the entry declares no rule (VAL-COMP-10)", () => {
    expect(matchesPiece(undefined, cottonShirt)).toBe(false);
    expect(piecesFor(undefined, [cottonShirt])).toEqual([]);
  });

  it("matches nothing when the piece has no text at all", () => {
    expect(matchesPiece({ tokens: ["cotton"] }, { material: null })).toBe(false);
  });
});

describe("tokens that earn their place", () => {
  it("#213: does not file a corded seam under Corduroy", () => {
    // A knitted top whose "tubular seams" are described as "a rolled cord".
    const piece = { material: "75% merino wool", description: "a rolled cord rather than a flat overlock" };
    expect(matchesPiece(findEntry("corduroy")!.match, piece)).toBe(false);
  });

  it("still finds every genuine corduroy piece", () => {
    // Every corduroy piece in this catalogue says the word somewhere in its
    // own text, which is exactly why the bare `cord` token was redundant.
    for (const text of [
      "100% cotton (fine-wale corduroy)",
      "the cord is a medium wale: pure cotton corduroy with real weight",
      "angenehm weicher, warmer cord (soft, warm corduroy)",
      "needlecord, finer than a classic wale",
    ]) {
      expect(matchesPiece(findEntry("corduroy")!.match, { material: text }), text).toBe(true);
    }
  });
});

describe("the entry set itself", () => {
  it("has unique slugs: a slug is a URL contract", () => {
    const slugs = COMPENDIUM_ENTRIES.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only points `seeAlso` at entries that exist", () => {
    const dangling = COMPENDIUM_ENTRIES.flatMap((e) =>
      (e.seeAlso ?? []).filter((s) => !findEntry(s)).map((s) => `${e.slug} → ${s}`),
    );
    expect(dangling).toEqual([]);
  });

  it("explains every entry in Chinese (VAL-COMP-03)", () => {
    const notChinese = COMPENDIUM_ENTRIES.filter((e) => !/[一-鿿]/.test(e.explanation));
    expect(notChinese.map((e) => e.slug)).toEqual([]);
  });

  it("#213: separates viscose, modal and lyocell rather than lumping them", () => {
    // The distinction is the single most useful thing in the fibre section, and
    // a well-meant tidy-up that merged them would pass every other test here.
    const piece = { material: "96% tencel™ lyocell, 4% elastane" };
    expect(matchesPiece(findEntry("lyocell")!.match, piece)).toBe(true);
    expect(matchesPiece(findEntry("viscose")!.match, piece)).toBe(false);
    expect(matchesPiece(findEntry("modal")!.match, piece)).toBe(false);
  });

  it("#213: reads real catalogue strings the way a reader would", () => {
    const cases: [string, string[], string[]][] = [
      // string                                        should match       should not
      ["72% cotton, 23% nylon, 5% elastane", ["cotton", "polyamide", "elastane"], ["polyester"]],
      ["100% mulberry silk", ["silk"], ["cotton"]],
      ["100% cotton (mercerised, silky sheen)", ["cotton", "mercerised"], ["silk"]],
      ["shell: 94% cotton, 6% elastane (120 gsm)", ["cotton", "elastane"], ["wool"]],
      ["sterling silver", [], ["cotton", "silk"]],
    ];

    for (const [material, expected, forbidden] of cases) {
      const piece = { material };
      for (const slug of expected) {
        expect(matchesPiece(findEntry(slug)!.match, piece), `${material} → ${slug}`).toBe(true);
      }
      for (const slug of forbidden) {
        expect(matchesPiece(findEntry(slug)!.match, piece), `${material} ✗ ${slug}`).toBe(false);
      }
    }
  });
});

/**
 * Two more ways a mention is not a property (#243), both found by sweeping the
 * live catalogue after three new entries were written.
 */
describe("#243: mentions that describe something else", () => {
  it("does not file a piece by a cross-reference to another piece", () => {
    // A note on a cardigan that links to another piece. The link names a *jacquard* jacket,
    // and the cardigan was being filed under Jacquard because of it.
    const notes =
      "Bought the same day as the [Linden & Co metallic jacquard jacket](/items/00000000-0000-4000-8000-000000000001).";
    expect(containsToken(notes.replace(/\[[^\]]*\]\(\/items\/[^)]*\)/g, " "), "jacquard")).toBe(
      false,
    );
    expect(
      matchesPiece({ tokens: ["jacquard"], fields: ["notes"] }, { notes }),
    ).toBe(false);
  });

  it("still reads a Compendium link, which is a claim about this piece", () => {
    // The deliberate asymmetry: "the back is [lace](…)" says what this garment
    // is, where an /items/ link says what another garment is.
    const description = "the whole back is [lace](/compendium/materials/lace)";
    expect(matchesPiece({ tokens: ["lace"], fields: ["description"] }, { description })).toBe(
      true,
    );
  });

  it("reads 'unlike' as a denial, the way it already reads 'instead of'", () => {
    const notes = "the architectural kind of volume, unlike the boxy satin one that was sold";
    expect(matchesPiece({ tokens: ["satin"], fields: ["notes"] }, { notes })).toBe(false);
  });
});

/**
 * The shape that filed half the Denim entry wrongly (#267).
 *
 * Every string below has the shape of a real one, from a catalogue sweep when
 * `/compendium/materials/denim` listed about half its pieces wrongly.
 */
describe("#267: a garment worn *with* this one is not this one's cloth", () => {
  const denim = (text: string) =>
    matchesPiece({ tokens: ["denim"], fields: ["description", "notes"] }, { notes: text });

  it("does not read a colour-pairing list as a composition", () => {
    // Colour notes of the kind an owner writes. "Denim" here is a
    // shade to sit beside, not a cloth this garment is made of.
    expect(denim("Cobalt is a cool, saturated blue: it sits with charcoal, ivory and denim")).toBe(
      false,
    );
    expect(denim("Pale blue is cool and quiet: it belongs with navy, charcoal, white and denim")).toBe(
      false,
    );
  });

  it("does not read a styling suggestion as a composition", () => {
    // Retailer copy of the kind found on tees and pumps.
    expect(denim("100% cotton (270 gsm) Style it with tailoring and denim.")).toBe(false);
    expect(denim("Dressed down with denim or suited up with an elegant jumpsuit")).toBe(false);
    expect(denim("Navy is a quiet neutral, so it goes with the denim and the greyed navy bottoms")).toBe(
      false,
    );
  });

  it("reads layering prepositions as naming another garment", () => {
    // This one is not even in the Denim entry: a *denim* jacket was being filed
    // under Jersey, because its note says what it goes over.
    expect(
      matchesPiece(
        { tokens: ["jersey"], fields: ["notes"] },
        { notes: "**How I wear it:** over a jersey vest, buttoned on a cold morning" },
      ),
    ).toBe(false);
    expect(denim("White sits under everything (the new denim jacket, the blazers)")).toBe(false);
  });

  it("reads 'a denim look' as the denial it is", () => {
    // A resemblance claim is the opposite of a composition claim. The shirt
    // dress is viscose; the tank dress is linen.
    expect(denim("An oversized button-through shirt dress in an indigo denim look.")).toBe(false);
    expect(denim("The fabric is breathable with a classic, denim-inspired look.")).toBe(false);
  });

  it("still finds every piece that really is denim", () => {
    // The other half of the entry, and the reason the guard is a lookbehind
    // rather than a blanket exclusion of the word.
    for (const text of [
      "this skirt is made from weighty cotton denim with a structured quality",
      "Pure-cotton rigid denim (non-stretch).",
      "Cut from a notably heavyweight, thick denim that holds its shape",
      "Cropped jacket in nubby, slub-textured denim.",
      "premium undyed cotton denim, heavier than the Linden & Co version",
      "A cape in pale bleached denim, cut as a true cape",
    ]) {
      expect(denim(text), text).toBe(true);
    }
  });

  it("does not read 'styled with' as pairing: it usually means 'features'", () => {
    // The case the catalogue sweep caught, and the reason `styled with` is not
    // in the guard: this is a true A-line, and the first draft hid it.
    const description =
      "A flattering wrap midi, it is crafted in linen-silk satin and styled with a surplice neckline and A-line skirt.";
    expect(matchesPiece({ tokens: ["a-line"], fields: ["description"] }, { description })).toBe(
      true,
    );
  });

  it("does not swallow a companion phrase from the sentence before", () => {
    // The guard stops at sentence punctuation, exactly like the negation guard.
    // Without that, one "goes with" would silence the rest of a note.
    expect(denim("Goes with everything. Made from a heavy cotton denim.")).toBe(true);
  });

  it("leaves 'over' alone when it is not about layering", () => {
    // `over` is the broadest token in the guard, and the lookbehind is only 44
    // characters: far enough back and the mention survives.
    expect(denim("Bought over the summer sale, this is a rigid cotton denim five-pocket")).toBe(
      true,
    );
  });
});

describe("#243: a link target is not prose", () => {
  it("does not match on the URL of a Compendium link", () => {
    // The wrap top: the sentence says it is *not* one, and the link address is
    // what filed it as one.
    const notes =
      "This is not a bolero, though Maison Verre file it as one; see [what makes something one](/compendium/materials/bolero)";
    expect(matchesPiece({ tokens: ["bolero"], fields: ["notes"] }, { notes })).toBe(false);
  });

  it("still matches on the label of a Compendium link", () => {
    const description = "the whole back is [lace](/compendium/materials/lace)";
    expect(matchesPiece({ tokens: ["lace"], fields: ["description"] }, { description })).toBe(true);
  });
});
