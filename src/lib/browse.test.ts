import { describe, expect, it } from "vitest";

import { NO_FILTERS, parseBrowseParams } from "@/lib/browse";
import { MATERIAL_KEYS } from "@/lib/materials";

/**
 * Reading the URL into a filter state (`VAL-BROWSE-02`, #263).
 *
 * All browse state lives in the URL, which means the URL is an input the owner
 * can type, bookmark and share, so it is parsed defensively. An unknown value
 * is **ignored, never an error**: a shared link that has outlived a renamed
 * facet should still show a wardrobe.
 */

describe("#263: the material facet", () => {
  it("reads one fibre and a repeated parameter alike", () => {
    expect(parseBrowseParams({ material: "linen" }).materials).toEqual(["linen"]);
    expect(parseBrowseParams({ material: ["linen", "silk"] }).materials).toEqual(["linen", "silk"]);
  });

  it("drops a fibre the glossary does not know", () => {
    expect(parseBrowseParams({ material: ["linen", "kryptonite"] }).materials).toEqual(["linen"]);
    expect(parseBrowseParams({ material: "kryptonite" }).materials).toEqual([]);
  });

  it("does not accept a construction, which is a different question", () => {
    // `denim` and `poplin` are real Compendium slugs, deliberately not facets.
    expect(parseBrowseParams({ material: ["denim", "poplin"] }).materials).toEqual([]);
  });

  it("de-duplicates, so a doubled link does not count twice in the badge", () => {
    expect(parseBrowseParams({ material: ["linen", "linen"] }).materials).toEqual(["linen"]);
  });

  it("is empty when the parameter is absent", () => {
    expect(parseBrowseParams({}).materials).toEqual([]);
  });

  it("accepts every key the panel can offer", () => {
    // The dropdown renders MATERIAL_FACETS and writes `?material=<key>`; if a
    // key were unparseable the control would silently do nothing.
    expect(parseBrowseParams({ material: MATERIAL_KEYS }).materials).toEqual(MATERIAL_KEYS);
  });
});

describe("NO_FILTERS", () => {
  it("carries every facet, so a new one cannot be forgotten by a caller", () => {
    // Four callers pass this to mean "the whole wardrobe". The reason it exists
    // is that adding the material facet broke all four at once.
    expect(Object.keys(NO_FILTERS).sort()).toEqual(
      ["colors", "favorite", "materials", "missing", "q", "sort", "tags"].sort(),
    );
    expect(NO_FILTERS.materials).toEqual([]);
  });
});
