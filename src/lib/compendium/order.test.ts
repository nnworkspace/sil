import { describe, expect, it } from "vitest";

import {
  COMPENDIUM_ENTRIES,
  byTerm,
  entriesForPiece,
  entriesInGroup,
} from "@/lib/compendium/entries";
import { ENTRY_GROUPS } from "@/lib/compendium/groups";
import { MATERIAL_KEYS } from "@/lib/materials";

/**
 * Two orders, and the line between them (#275).
 *
 * The glossary is *written* in a considered order — fibres run naturals, then
 * regenerated cellulose, then synthetics. That order is right wherever the list
 * is **reasoned** with, and wrong wherever it is **looked up in**. These tests
 * pin both halves, because making a page alphabetical is a one-line change that
 * can silently reorder three other things.
 */

describe("#275 — a group page is looked up in, so it is alphabetical", () => {
  it("sorts every group by term", () => {
    for (const g of ENTRY_GROUPS) {
      const terms = entriesInGroup(g.group).map((e) => e.term);
      expect(terms, g.label).toEqual([...terms].sort((a, b) => a.localeCompare(b, "en")));
    }
  });

  it("files an accented term under its base letter", () => {
    // Tested on the comparator rather than on the glossary, because **no pair
    // of terms in the glossary today tells the two apart**: `Crêpe de Chine`
    // sorts the same under `<` as under `localeCompare`, since nothing else
    // begins `Cr`. Asserting it through `entriesInGroup` therefore passed even
    // with the comparator replaced by `<` — a test that proved nothing.
    //
    // These pairs do tell them apart. `É` is code point 0xC9, well past `Z`, so
    // a naive compare files Écru after every unaccented term.
    expect(byTerm({ term: "Écru" }, { term: "Elastane" })).toBeLessThan(0);
    expect(byTerm({ term: "Crêpe" }, { term: "Crocodile" })).toBeLessThan(0);
  });

  it("returns every entry of the group and nothing else", () => {
    for (const g of ENTRY_GROUPS) {
      const got = entriesInGroup(g.group).map((e) => e.slug).sort();
      const want = COMPENDIUM_ENTRIES.filter((e) => e.group === g.group)
        .map((e) => e.slug)
        .sort();
      expect(got, g.label).toEqual(want);
    }
  });

  it("does not reorder the glossary itself", () => {
    // `.sort()` mutates in place, and sorting the result of a `.filter()` is
    // safe only because filter returns a new array. If that ever changes to a
    // shared reference, this fails instead of quietly scrambling the source.
    const before = COMPENDIUM_ENTRIES.map((e) => e.slug);
    for (const g of ENTRY_GROUPS) entriesInGroup(g.group);
    expect(COMPENDIUM_ENTRIES.map((e) => e.slug)).toEqual(before);
  });
});

describe("#275 — the orders that must stay as written", () => {
  it("keeps an item page reading as a sentence", () => {
    // What it is made of → how that became cloth → what was done to the cloth.
    // Alphabetical here would give "cotton, mercerised, poplin", which states
    // the finish before the weave that carries it.
    const found = entriesForPiece({
      material: "100% cotton (mercerised — silky sheen)",
      description: "poplin",
      notes: null,
    }).map((e) => e.slug);
    expect(found).toEqual(["cotton", "poplin", "mercerised"]);
  });

  it("keeps the material filter in the glossary's own order", () => {
    // Naturals, then regenerated cellulose, then synthetics — a fact about
    // fibres, and the reason the dropdown is not alphabetical either.
    expect(MATERIAL_KEYS.indexOf("cotton")).toBeLessThan(MATERIAL_KEYS.indexOf("viscose"));
    expect(MATERIAL_KEYS.indexOf("viscose")).toBeLessThan(MATERIAL_KEYS.indexOf("polyester"));
  });

  it("keeps the four groups in their taxonomy order, not alphabetically", () => {
    // Fibres, Constructions, Finishes, Cuts. Alphabetical would open the
    // Materials overview on "Constructions", which explains nothing first.
    expect(ENTRY_GROUPS.map((g) => g.slug)).toEqual([
      "fibres",
      "constructions",
      "finishes",
      "cuts",
    ]);
  });
});
