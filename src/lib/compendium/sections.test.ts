import { describe, expect, it } from "vitest";

import { COMPENDIUM_ENTRIES, entryHref } from "@/lib/compendium/entries";
import { ENTRY_GROUPS, findGroup, groupHref } from "@/lib/compendium/groups";
import { COMPENDIUM_SECTIONS, compendiumHref } from "@/lib/compendium/sections";

/**
 * The URL shape of the Compendium after the Materials page was split (#265).
 *
 * All of this is a contract rather than a preference: item pages link to entry
 * URLs, so those cannot move (VAL-COMP-07), and the group pages are served by a
 * dynamic `[group]` segment that sits alongside the static section routes. A
 * slug collision between the two would not fail loudly (the static route would
 * simply win and the group page would become unreachable), so it is checked.
 */

describe("#265: the group routes", () => {
  it("keeps every entry where item pages already link to it", () => {
    // The whole reason the groups are siblings of `materials` rather than
    // children: this URL predates the split and is linked from the catalogue.
    expect(entryHref("linen")).toBe("/compendium/materials/linen");
    for (const e of COMPENDIUM_ENTRIES) {
      expect(entryHref(e.slug)).toBe(`/compendium/materials/${e.slug}`);
    }
  });

  it("gives every group a slug that no section has already taken", () => {
    // `/compendium/materials` and `/compendium/berth-notation` are static
    // routes and would shadow the dynamic one.
    const sections = new Set(COMPENDIUM_SECTIONS.map((s) => s.slug));
    for (const g of ENTRY_GROUPS) expect(sections.has(g.slug), g.slug).toBe(false);
  });

  it("gives every group a distinct slug", () => {
    const slugs = ENTRY_GROUPS.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has a page for every group an entry claims", () => {
    // An entry filed under a group with no page would vanish from the
    // Compendium entirely, reachable only by typing its URL.
    const groups = new Set(ENTRY_GROUPS.map((g) => g.group));
    for (const e of COMPENDIUM_ENTRIES) expect(groups.has(e.group), e.slug).toBe(true);
  });

  it("has entries for every group, so no page is born empty", () => {
    for (const g of ENTRY_GROUPS) {
      expect(COMPENDIUM_ENTRIES.some((e) => e.group === g.group), g.slug).toBe(true);
    }
  });

  it("resolves a known group and refuses an unknown one", () => {
    expect(findGroup("fibres")?.group).toBe("fibre");
    // Singular is the internal name, not a URL. Getting this wrong would give
    // two spellings of the same page, only one of which works.
    expect(findGroup("fibre")).toBeUndefined();
    expect(findGroup("materials")).toBeUndefined();
    expect(findGroup("../items")).toBeUndefined();
  });

  it("puts group pages at the same level as sections", () => {
    expect(groupHref("cuts")).toBe("/compendium/cuts");
    expect(compendiumHref("materials")).toBe("/compendium/materials");
  });
});

describe("#265: the tree agrees with the glossary", () => {
  it("lists exactly the four groups under Materials", () => {
    // The tree is a client component and keeps its own list so the glossary's
    // prose stays out of the browser bundle. This is what stops the two lists
    // drifting apart.
    const materials = COMPENDIUM_SECTIONS.find((s) => s.slug === "materials");
    expect(materials?.children?.map((c) => c.slug)).toEqual(ENTRY_GROUPS.map((g) => g.slug));
    expect(materials?.children?.map((c) => c.label)).toEqual(ENTRY_GROUPS.map((g) => g.label));
  });

  it("leaves the other sections flat", () => {
    const berth = COMPENDIUM_SECTIONS.find((s) => s.slug === "berth-notation");
    expect(berth?.children).toBeUndefined();
  });
});
