import { describe, expect, it } from "vitest";

import {
  COLOR_FAMILIES,
  COLOR_FAMILY_KEYS,
  COLOR_OVERRIDES,
  colorFamiliesOf,
  colorKeywords,
  colorMatchSpec,
} from "@/lib/colors";
import { OFF_WHITE } from "@/test/fixtures/catalogue";

/** How the SQL filter matches: the free-text colour contains a family keyword,
 *  case-insensitively (#105). Mirrored here so the rule is asserted without a
 *  database. */
const matchesFamily = (color: string | null, keys: string[]) =>
  colorKeywords(keys).some((kw) => (color ?? "").toLowerCase().includes(kw));

describe("#105 — colour families", () => {
  it("matches a free-text colour by keyword", () => {
    expect(matchesFamily(OFF_WHITE.color, ["white"])).toBe(true);
    expect(matchesFamily("Palace Blue", ["blue"])).toBe(true);
    expect(matchesFamily("dark green", ["green"])).toBe(true);
  });

  it("does not match an unrelated family", () => {
    expect(matchesFamily(OFF_WHITE.color, ["black"])).toBe(false);
  });

  it("unions the keywords of several selected families", () => {
    const kws = colorKeywords(["black", "white"]);
    expect(kws).toContain("black");
    expect(kws).toContain("ivory");
  });

  it("ignores unknown family keys", () => {
    expect(colorKeywords(["not-a-colour"])).toEqual([]);
    expect(colorKeywords([])).toEqual([]);
  });

  it("treats a missing colour as no match rather than throwing", () => {
    expect(matchesFamily(null, ["black"])).toBe(false);
  });

  it("keeps every family key unique and non-empty", () => {
    expect(new Set(COLOR_FAMILY_KEYS).size).toBe(COLOR_FAMILY_KEYS.length);
    for (const f of COLOR_FAMILIES) expect(f.keywords.length).toBeGreaterThan(0);
  });

  it("keeps keywords lowercase, since matching lowercases the colour", () => {
    for (const kw of colorKeywords(COLOR_FAMILY_KEYS)) {
      expect(kw).toBe(kw.toLowerCase());
    }
  });
});

describe("colour names that fight the substring matcher (#211)", () => {
  it("finds COS's *blueberry milk* under Pink, which is what it actually is", () => {
    expect(colorFamiliesOf("blueberry milk")).toContain("pink");
  });

  it("no longer reports Blue for it — #211 removed that limitation", () => {
    // This test previously asserted the opposite, and said so: "a known
    // limitation, not an oversight". The keyword hack made the piece findable
    // under Pink at the cost of it also answering Blue. Now the colour declares
    // its family, so the double match is gone.
    expect(colorFamiliesOf("blueberry milk")).not.toContain("blue");
  });

  it("has not broken genuine blues, nor pulled them into Pink", () => {
    expect(matchesFamily("midnight blue", ["blue"])).toBe(true);
    expect(matchesFamily("midnight blue", ["pink"])).toBe(false);
    expect(matchesFamily("cobalt blue", ["pink"])).toBe(false);
  });
});

/**
 * A colour declaring its family (#211).
 *
 * The rule had been re-implemented in four places — the SQL browse filter, the
 * Figures colour module, the trip picker, and this file's own helper. These
 * tests are written against `colorFamiliesOf` because it is now the only place
 * the question is answered.
 */
describe("#211 — one rule, and colours that declare their family", () => {
  it("puts a declared colour in exactly the family it declares", () => {
    // COS named a pale pink shirt "blueberry milk". "blueberry" contains "blue".
    expect(colorFamiliesOf("blueberry milk")).toEqual(["pink"]);
    // "primrose" contains "rose", so it answered a search for Pink.
    expect(colorFamiliesOf("primrose yellow")).toEqual(["yellow"]);
  });

  it("leaves ordinary colours to the substring rule", () => {
    expect(colorFamiliesOf("navy")).toEqual(["blue"]);
    expect(colorFamiliesOf("burgundy")).toEqual(["red"]);
    expect(colorFamiliesOf("olive")).toEqual(["green"]);
  });

  it("#211: keeps multi-family colours multi — that is not the bug", () => {
    // Roughly a quarter of a real catalogue's colours match more than one family, and almost all of
    // them are right. An override must not be reached for these.
    expect(colorFamiliesOf("navy / white")).toEqual(expect.arrayContaining(["blue", "white"]));
    expect(colorFamiliesOf("grey / pink")).toEqual(expect.arrayContaining(["grey", "pink"]));
  });

  it("classifies the colours that previously matched no family at all", () => {
    expect(colorFamiliesOf("amber")).toEqual(["orange"]);
    expect(colorFamiliesOf("light sea glass")).toEqual(["green"]);
    expect(colorFamiliesOf("poppy")).toEqual(["red"]);
  });

  it("is case- and whitespace-insensitive, and empty for no colour", () => {
    expect(colorFamiliesOf("  Blueberry Milk ")).toEqual(["pink"]);
    expect(colorFamiliesOf(null)).toEqual([]);
    expect(colorFamiliesOf("")).toEqual([]);
  });

  it("no override is redundant — each one changes the answer", () => {
    // An override that agrees with the guess is dead weight and should be
    // deleted rather than left to look like a rule.
    for (const [color, declared] of Object.entries(COLOR_OVERRIDES)) {
      const guessed = COLOR_FAMILIES.filter((f) =>
        f.keywords.some((k) => color.includes(k)),
      ).map((f) => f.key);
      expect([...guessed].sort(), color).not.toEqual([...declared].sort());
    }
  });
});

describe("#211 — the SQL filter honours the same overrides", () => {
  it("excludes a declared colour from the family it only looks like", () => {
    // Selecting Blue must not return the blueberry-milk shirt, even though a
    // keyword matches it.
    const blue = colorMatchSpec(["blue"]);
    expect(blue.notExactly).toContain("blueberry milk");
    expect(blue.exactly).not.toContain("blueberry milk");
  });

  it("includes it in the family it declares", () => {
    const pink = colorMatchSpec(["pink"]);
    expect(pink.exactly).toContain("blueberry milk");
    expect(pink.notExactly).not.toContain("blueberry milk");
  });

  it("still carries the ordinary keywords", () => {
    expect(colorMatchSpec(["blue"]).keywords).toContain("navy");
  });
});

describe("bronze", () => {
  it("lands in the neutrals, where brown and camel live", () => {
    // Added when a light bronze shoe matched no family at all and was therefore
    // invisible to the colour filter. Bronze is a warm dark metal — nearer
    // camel than gold — so it belongs with the browns rather than the yellows.
    expect(colorFamiliesOf("light bronze")).toEqual(["neutral"]);
    expect(colorFamiliesOf("bronze")).toContain("neutral");
  });

  it("does not also drag it into yellow", () => {
    expect(colorFamiliesOf("light bronze")).not.toContain("yellow");
  });
});
