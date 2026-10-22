import { describe, expect, it } from "vitest";

import { inferSeasons } from "@/lib/seasons";
import { LINEN_VEST, WOOL_COAT } from "@/test/fixtures/catalogue";

describe("#108 — season inference", () => {
  it("sends cold fabrics to autumn and winter", () => {
    expect(inferSeasons(WOOL_COAT)).toEqual(expect.arrayContaining(["autumn", "winter"]));
  });

  it("sends airy fabrics to spring and summer", () => {
    expect(inferSeasons(LINEN_VEST)).toEqual(expect.arrayContaining(["spring", "summer"]));
  });

  it("keeps genuinely heavy pieces out of spring", () => {
    // A padded coat spans the cold half only; a merino knit may reach spring.
    expect(inferSeasons({ material: "Down-filled, quilted" })).not.toContain("spring");
    expect(inferSeasons({ material: "100% merino wool" })).toContain("spring");
  });

  it("reads the name and description, not only the material", () => {
    expect(inferSeasons({ name: "Sleeveless Top" })).toEqual(
      expect.arrayContaining(["spring", "summer"]),
    );
    expect(inferSeasons({ description: "A chunky knit for the coldest days." })).toContain(
      "winter",
    );
  });

  it("is generous — a piece usually spans more than one season", () => {
    expect(inferSeasons({ material: "100% wool" }).length).toBeGreaterThan(1);
  });

  it("never returns nothing, even with no usable text", () => {
    expect(inferSeasons({}).length).toBeGreaterThan(0);
    expect(inferSeasons({ material: null, name: null, description: null }).length).toBeGreaterThan(0);
  });

  it("returns tags in canonical order", () => {
    const order = ["spring", "summer", "autumn", "winter"];
    const got = inferSeasons({ material: "wool and linen blend" });
    const indices = got.map((s) => order.indexOf(s));
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it("is case-insensitive", () => {
    expect(inferSeasons({ material: "100% LINEN" })).toEqual(inferSeasons({ material: "100% linen" }));
  });
});
