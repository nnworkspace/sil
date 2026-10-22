import { describe, expect, it } from "vitest";

import { deriveFacets } from "@/lib/facets";

/**
 * Deriving style facets from a piece's own text (#229).
 *
 * The cases below are drawn from phrasings that are really in this catalogue.
 * The rule these tests defend is negative: **where the text does not say, no tag
 * is produced.** A partly-filled facet reads as an answer, which is how "do I
 * own a short-sleeved shirt?" came back wrong twice.
 */

const piece = (p: Partial<Parameters<typeof deriveFacets>[0]>) =>
  deriveFacets({ category: "tops", ...p });

describe("sleeve", () => {
  it("reads the phrasings this catalogue actually uses", () => {
    expect(piece({ description: "a sleeveless shell top" }).sleeve).toBe("sleeveless");
    expect(piece({ name: "Short-Sleeved Jersey Top" }).sleeve).toBe("short");
    expect(piece({ description: "slim long sleeves" }).sleeve).toBe("long");
    expect(piece({ description: "elbow-length sleeves" }).sleeve).toBe("3/4");
    expect(piece({ description: "three-quarter sleeves" }).sleeve).toBe("3/4");
    expect(piece({ name: "Cap-Sleeve Sheath Dress", category: "dresses" }).sleeve).toBe("cap");
  });

  it("treats a strappy or vest top as sleeveless", () => {
    expect(piece({ description: "a strappy camisole" }).sleeve).toBe("sleeveless");
    expect(piece({ name: "Fitted Vest Top" }).sleeve).toBe("sleeveless");
  });

  it("says nothing when the text says nothing", () => {
    expect(piece({ description: "a soft cotton top in navy" }).sleeve).toBeUndefined();
    expect(piece({}).sleeve).toBeUndefined();
  });

  it("is not fooled by a denial", () => {
    // Inherited from the Compendium matcher, which had to learn this.
    expect(piece({ description: "not sleeveless — it has proper long sleeves" }).sleeve).toBe(
      "long",
    );
  });
});

describe("neck", () => {
  it("distinguishes boat from round, which a photograph often cannot", () => {
    expect(piece({ name: "Boat-Neck Fine-Knit Jumper" }).neck).toBe("boat");
    expect(piece({ description: "a wide round neck" }).neck).toBe("round");
    expect(piece({ description: "a deep scoop neck" }).neck).toBe("round");
  });

  it("does not call a collarless piece collared", () => {
    // Several pieces are explicitly collarless; the compound word would slip
    // past the negation guard, so the rule excludes it outright.
    expect(piece({ name: "Collarless Crepe Blazer" }).neck).toBeUndefined();
    expect(piece({ name: "Cropped Collarless Blazer" }).neck).toBeUndefined();
  });

  it("leaves a funnel, mock or turtle neck untagged rather than calling it round", () => {
    // The vocabulary has no term for a stand-up round neck. Flattening them
    // into `round` would destroy a real distinction (#229).
    expect(piece({ name: "Funnel-Neck Patch-Pocket Top" }).neck).toBeUndefined();
    expect(piece({ name: "Mock-Neck Knitted Top" }).neck).toBeUndefined();
  });
});

describe("fit", () => {
  it("reads an explicit fit statement", () => {
    expect(piece({ description: "regular fit" }).fit).toBe("regular");
    expect(piece({ description: "a relaxed fit through the body" }).fit).toBe("relaxed");
    expect(piece({ description: "slim-fit, close to the body" }).fit).toBe("slim");
    expect(piece({ description: "Lockere Passform" }).fit).toBe("relaxed");
  });

  it("#229: takes bare 'fitted' from a name but never from prose", () => {
    // The catalogue writes "fitted yoke", "fitted bodice", "worn open over a
    // fitted top" — none of which describe the garment's own fit.
    expect(piece({ name: "Fitted Shirt" }).fit).toBe("slim");
    expect(piece({ description: "long pleats from a fitted yoke" }).fit).toBeUndefined();
    expect(piece({ description: "worn open over a fitted top it traces the figure" }).fit)
      .toBeUndefined();
  });

  it("prefers the more specific word when several appear", () => {
    expect(piece({ description: "an oversized, boxy shape" }).fit).toBe("oversized");
  });
});

describe("length — the category rule", () => {
  it("puts a dress on the mini→maxi scale", () => {
    expect(deriveFacets({ category: "dresses", name: "Midi Shirt Dress" }).length).toBe("midi");
    expect(deriveFacets({ category: "skirts", description: "knee-length" }).length).toBe("knee");
    expect(deriveFacets({ category: "dresses", name: "Silk Slip Mini Dress" }).length).toBe("mini");
    expect(
      deriveFacets({ category: "dresses", description: "a floor-length gown" }).length,
    ).toBe("maxi");
  });

  it("#229: never puts a top on that scale, however the word appears", () => {
    // The likeliest way a bulk backfill goes quietly wrong.
    expect(piece({ name: "Top for a Midi Skirt" }).length).toBeUndefined();
    expect(piece({ description: "wears well with a maxi skirt" }).length).toBeUndefined();
  });

  it("crops tops, jackets and trousers instead", () => {
    expect(piece({ name: "Cropped Knit Bolero" }).length).toBe("cropped");
    expect(deriveFacets({ category: "trousers", description: "cropped leg" }).length).toBe(
      "cropped",
    );
    expect(deriveFacets({ category: "outerwear", name: "Kurzer Strickcardigan" }).length).toBe(
      "cropped",
    );
  });

  it("does not crop a dress", () => {
    expect(deriveFacets({ category: "dresses", description: "a cropped jacket over it" }).length)
      .toBeUndefined();
  });
});

describe("silhouette", () => {
  it("takes only silhouettes that are named outright", () => {
    expect(deriveFacets({ category: "dresses", name: "A-Line Cotton-Poplin Dress" }).silhouette)
      .toBe("a-line");
    expect(deriveFacets({ category: "dresses", name: "Belted Wrap Dress" }).silhouette).toBe("wrap");
    expect(deriveFacets({ category: "dresses", description: "a shift dress" }).silhouette).toBe(
      "shift",
    );
  });

  it("#229: never reads 'column' as a silhouette", () => {
    // Plenty of hits in a real catalogue, and the word is prose about how cloth
    // falls in almost every one of them.
    expect(piece({ description: "the wide leg falls in a straight column" }).silhouette)
      .toBeUndefined();
    expect(piece({ description: "a full monochrome elongating column" }).silhouette)
      .toBeUndefined();
  });
});

describe("the whole derivation", () => {
  it("reads several facets from one name in a single pass", () => {
    expect(
      deriveFacets({ category: "dresses", name: "Short-Sleeved Jersey Midi Dress" }),
    ).toEqual({ sleeve: "short", length: "midi" });
  });

  it("returns an empty object when a piece says nothing about itself", () => {
    expect(deriveFacets({ category: "tops", name: "Top", description: null, notes: null }))
      .toEqual({});
  });
});

describe("#229 — the three faults the first dry run exposed", () => {
  it("reads a length word separated from 'sleeve' by an adjective", () => {
    // This catalogue almost never writes "long sleeves" plainly. Fixed phrases
    // alone found only a handful of pieces.
    expect(piece({ description: "long cuffed sleeves, in a slim shape" }).sleeve).toBe("long");
    expect(piece({ description: "long roll-up sleeves with a lighter cuff" }).sleeve).toBe("long");
    expect(piece({ description: "short kimono-style sleeves with a logo" }).sleeve).toBe("short");
    expect(piece({ description: "long, wide sleeves" }).sleeve).toBe("long");
  });

  it("does not let a proximity match cross a sentence or a bullet", () => {
    expect(piece({ description: "cut short. Sleeves are set in." }).sleeve).toBeUndefined();
    expect(piece({ description: "- cropped and short\n- sleeves are cuffed" }).sleeve)
      .toBeUndefined();
  });

  it("does not read a trouser leg length as a sleeve length", () => {
    // "High-Waist Wide-Leg Corduroy Trousers (3/4)" — the German copy says
    // 7/8-Länge. Trousers have no sleeves.
    expect(
      deriveFacets({ category: "trousers", name: "High-Waist Wide-Leg Corduroy Trousers (3/4)" })
        .sleeve,
    ).toBeUndefined();
    expect(deriveFacets({ category: "skirts", description: "3/4 length" }).sleeve).toBeUndefined();
  });

  it("still reads ¾ when it is genuinely about a sleeve", () => {
    expect(piece({ description: "3/4 sleeves" }).sleeve).toBe("3/4");
    expect(piece({ description: "elbow-length sleeves" }).sleeve).toBe("3/4");
  });

  it("does not read the ordinary words 'a line' as an A-line silhouette", () => {
    // This put a-line on a corduroy shirt and a boxy t-shirt.
    expect(piece({ description: "a line of buttons down the front" }).silhouette).toBeUndefined();
    expect(piece({ description: "worn open it traces a line down the body" }).silhouette)
      .toBeUndefined();
    expect(deriveFacets({ category: "dresses", name: "A-Line Cotton-Poplin Dress" }).silhouette)
      .toBe("a-line");
  });
});

describe("#229 — notes describe other garments, not this one", () => {
  it("ignores a facet word that belongs to a different piece", () => {
    // Every one of these is real, and each tagged the wrong garment.
    const styling = (notes: string) => deriveFacets({ category: "tops", notes });
    expect(styling("the ideal fine layer to wear under the cropped blazers").length)
      .toBeUndefined();
    expect(styling("COS styles it over slim black cropped trousers").length).toBeUndefined();
    expect(styling("wide beige culottes — and cropped ones at that").length).toBeUndefined();
    expect(styling("reads almost like a full A-line midi skirt on the body").silhouette)
      .toBeUndefined();
  });

  it("still reads the garment's own description", () => {
    expect(
      deriveFacets({ category: "tops", description: "boxy and faintly A-line through the body" })
        .silhouette,
    ).toBe("a-line");
  });
});
