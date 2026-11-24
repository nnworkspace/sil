import { describe, expect, it } from "vitest";

import {
  MATERIAL_FACETS,
  MATERIAL_KEYS,
  isMaterialKey,
  materialPatterns,
} from "@/lib/materials";
import { COMPENDIUM_ENTRIES } from "@/lib/compendium/entries";

/**
 * The material filter's vocabulary (#263).
 *
 * The point of these tests is that the filter is **derived** from the
 * Compendium rather than restated beside it. A second hand-written list of
 * fibres would drift, and the drift would be silent: a filter that quietly
 * stopped finding lyocell looks exactly like a wardrobe with no lyocell in it.
 */

/** Applies a generated pattern the way Postgres `~*` would. */
const matches = (pattern: string, material: string) =>
  new RegExp(pattern.replace(/\\y/g, "\\b"), "i").test(material);

describe("#263: the vocabulary comes from the Compendium", () => {
  it("offers exactly the glossary's fibre entries", () => {
    const fibres = COMPENDIUM_ENTRIES.filter(
      (e) => e.group === "fibre" && (e.match?.tokens?.length ?? 0) > 0,
    );
    expect(MATERIAL_KEYS).toEqual(fibres.map((e) => e.slug));
  });

  it("offers no constructions or finishes", () => {
    // Deliberate: a composition label lists fibres. `poplin` and `denim` answer
    // "how was it woven", which is a different question.
    expect(MATERIAL_KEYS).not.toContain("poplin");
    expect(MATERIAL_KEYS).not.toContain("denim");
    expect(MATERIAL_KEYS).not.toContain("bolero");
  });

  it("keeps the glossary's order rather than sorting by frequency", () => {
    // Naturals, then regenerated cellulose, then synthetics: a fact about
    // fibres. A frequency order would reshuffle as the wardrobe changed.
    expect(MATERIAL_KEYS.indexOf("cotton")).toBeLessThan(MATERIAL_KEYS.indexOf("viscose"));
    expect(MATERIAL_KEYS.indexOf("viscose")).toBeLessThan(MATERIAL_KEYS.indexOf("polyester"));
  });

  it("ignores an unknown key rather than erroring", () => {
    expect(isMaterialKey("linen")).toBe(true);
    expect(isMaterialKey("kryptonite")).toBe(false);
  });
});

describe("#263: the patterns SQL is given", () => {
  it("finds a fibre inside a blend", () => {
    const [linen] = materialPatterns(["linen"]);
    expect(matches(linen, "54% linen, 43% viscose, 3% elastane")).toBe(true);
    expect(matches(linen, "85% flax linen, 15% silk")).toBe(true);
  });

  it("does not match a fibre inside another word", () => {
    // The mistake this catalogue has already made twice: `silk` is inside
    // *silky*, and `100% cotton (mercerised, silky sheen)` is, punctuation
    // aside, a real string.
    const [silk] = materialPatterns(["silk"]);
    expect(matches(silk, "100% cotton (mercerised, silky sheen)")).toBe(false);
    expect(matches(silk, "55% silk, 45% linen")).toBe(true);
  });

  it("carries every spelling the glossary knows", () => {
    const [polyamide] = materialPatterns(["polyamide"]);
    for (const label of ["68% polyamide, 32% elastane", "100 % Polyamid", "23% nylon"]) {
      expect(matches(polyamide, label), label).toBe(true);
    }
  });

  it("keeps triacetate and acetate apart, as the glossary now does", () => {
    const [acetate] = materialPatterns(["acetate"]);
    const [triacetate] = materialPatterns(["triacetate"]);
    expect(matches(acetate, "70% triacetate, 30% polyester")).toBe(false);
    expect(matches(triacetate, "70% triacetate, 30% polyester")).toBe(true);
    expect(matches(acetate, "lining 100% acetate")).toBe(true);
  });

  it("returns one pattern per selected fibre, and none for none", () => {
    expect(materialPatterns(["linen", "silk"])).toHaveLength(2);
    expect(materialPatterns([])).toEqual([]);
    expect(materialPatterns(["kryptonite"])).toEqual([]);
  });

  it("escapes a token that contains regex punctuation", () => {
    // Nothing in the vocabulary needs it today; the guard is here so that
    // adding a fibre with a bracket or a dot cannot quietly break the pattern.
    for (const f of MATERIAL_FACETS) {
      expect(() => new RegExp(materialPatterns([f.key])[0].replace(/\\y/g, "\\b"))).not.toThrow();
    }
  });
});
