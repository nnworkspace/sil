import { describe, expect, it } from "vitest";

import { inferTags, toFormValues } from "@/lib/extraction";

/**
 * Tags on an imported piece (#107).
 *
 * The importer prefills the add form and the owner reviews it, so every tag
 * here is a *proposal* she can untick. What these tests defend is that the
 * proposal is **read out of the page** rather than invented — the same rule a
 * hand-filed piece gets, from the same functions.
 */

const extracted = (o: Record<string, unknown>) => ({ name: null, ...o });

describe("#107 — facets come from the extracted text", () => {
  it("reads the facets a product page states", () => {
    const tags = inferTags(
      extracted({
        name: "Short-Sleeved Jersey Dress",
        description: "- Regular fit\n- V-neck\n- Short sleeves",
      }),
      "dresses",
    );
    expect(tags).toContain("short");
    expect(tags).toContain("v-neck");
    expect(tags).toContain("regular");
  });

  it("reads a facet that only the feature list mentions", () => {
    // The extraction contract preserves the bulleted feature list precisely so
    // this works — "Never drop or flatten a bullet list".
    const tags = inferTags(
      extracted({ name: "Poplin Shirt", description: "- Grandad collar\n- Long cuffed sleeves" }),
      "shirts",
    );
    expect(tags).toContain("long");
    expect(tags).toContain("grandad");
  });

  it("proposes nothing the page does not say", () => {
    const tags = inferTags(extracted({ name: "Cotton Top", description: "A soft cotton top." }), "tops");
    for (const invented of ["long", "short", "sleeveless", "round", "v-neck", "slim", "boxy"]) {
      expect(tags, invented).not.toContain(invented);
    }
  });

  it("still proposes seasons, which are inferred rather than stated", () => {
    // Seasons are the one facet a page never states; `inferSeasons` reads the
    // material and is deliberately generous.
    const tags = inferTags(extracted({ name: "Cashmere Jumper", material: "100% cashmere" }), "jumpers");
    expect(tags).toEqual(expect.arrayContaining(["autumn", "winter"]));
  });

  it("#107: does not put a top on the hem scale when no category was extracted", () => {
    // An unrecognised category must fall to the conservative side of the length
    // rule, not the permissive one.
    expect(inferTags(extracted({ name: "Top", description: "wears well with a midi skirt" }), undefined))
      .not.toContain("midi");
  });

  it("returns no duplicates", () => {
    const tags = inferTags(
      extracted({ name: "Long-Sleeved Wool Top", description: "Long sleeves. Long cuffed sleeves." }),
      "tops",
    );
    expect(tags).toEqual([...new Set(tags)]);
  });
});

describe("the prefilled form", () => {
  it("arrives with the tags already ticked", () => {
    const values = toFormValues(
      extracted({
        name: "Boat-Neck Linen Top",
        category: "tops",
        material: "100% linen",
        description: "- Relaxed fit\n- Boat neck\n- Short sleeves",
      }),
    );
    expect(values.tags).toEqual(expect.arrayContaining(["boat", "short", "relaxed", "summer"]));
  });

  it("leaves the rest of the mapping alone", () => {
    const values = toFormValues(extracted({ name: "A Thing", category: "not-a-category" }));
    expect(values.name).toBe("A Thing");
    expect(values.category).toBeUndefined();
    expect(values.currency).toBe("EUR");
  });
});
