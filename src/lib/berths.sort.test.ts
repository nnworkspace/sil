import { describe, expect, it } from "vitest";

import { compareBerths } from "@/lib/berths";

/**
 * Ordering berths by the notation (#227).
 *
 * The load-bearing test is the double-digit one. Every wardrobe, rack and shelf
 * number in the catalogue is a single digit today, so a plain string sort gives
 * the right answer by luck, and would go on giving it until the first shelf 10,
 * at which point nothing fails and the list is simply wrong.
 */

const sorted = (codes: string[]) => [...codes].sort(compareBerths);

describe("#227: berths read as a walk through the room", () => {
  it("compares numbers as numbers, not as text", () => {
    // Lexically this is S10, S2, S3; that is the bug this test exists for.
    expect(sorted(["R1-W6R2-S10", "R1-W6R2-S3", "R1-W6R2-S2"])).toEqual([
      "R1-W6R2-S2",
      "R1-W6R2-S3",
      "R1-W6R2-S10",
    ]);
    expect(sorted(["R1-W10R1-S1", "R1-W2R1-S1"])).toEqual(["R1-W2R1-S1", "R1-W10R1-S1"]);
  });

  it("orders outermost segment first: room, then wardrobe, then rack", () => {
    expect(
      sorted(["R2-W1R1-S1", "R1-W2R1-S1", "R1-W1R2-S1", "R1-W1R1-S1"]),
    ).toEqual(["R1-W1R1-S1", "R1-W1R2-S1", "R1-W2R1-S1", "R2-W1R1-S1"]);
  });

  it("groups a place kind before its number: shelves, then drawers, then rails", () => {
    expect(sorted(["R1-W1R1-H1", "R1-W1R1-D2", "R1-W1R1-S9", "R1-W1R1-D1"])).toEqual([
      "R1-W1R1-S9",
      "R1-W1R1-D1",
      "R1-W1R1-D2",
      "R1-W1R1-H1",
    ]);
  });

  it("puts the whole shelf before any part of it", () => {
    expect(sorted(["R1-W1R1-S1-R", "R1-W1R1-S1", "R1-W1R1-S1-L"])).toEqual([
      "R1-W1R1-S1",
      "R1-W1R1-S1-L",
      "R1-W1R1-S1-R",
    ]);
  });

  it("lists a code it cannot parse last, rather than dropping it (VAL-COMP-12)", () => {
    // The catalogue is authoritative: a berth that does not follow the notation
    // is still a berth, and must still appear.
    expect(sorted(["attic", "R1-W1R1-S1", "box under the bed"])).toEqual([
      "R1-W1R1-S1",
      "attic",
      "box under the bed",
    ]);
  });

  it("is a total order, so sorting is stable and reversible", () => {
    const codes = ["R1-W6R2-S2-R", "R1-W2R3-D1-LF", "attic", "R1-W6R2-S2", "R1-W2R4-H1"];
    const once = sorted(codes);
    expect(sorted([...codes].reverse())).toEqual(once);
    expect(sorted(once)).toEqual(once);
  });

  it("orders a realistic set of berths as the owner would walk them", () => {
    expect(
      sorted([
        "R1-W7R2-S3-F",
        "R1-W2R3-H1-M",
        "R1-W6R2-S2-L",
        "R1-W2R3-D1-LF",
        "R1-W6R2-S2-R",
        "R1-W2R4-H1",
      ]),
    ).toEqual([
      "R1-W2R3-D1-LF",
      "R1-W2R3-H1-M",
      "R1-W2R4-H1",
      "R1-W6R2-S2-L",
      "R1-W6R2-S2-R",
      "R1-W7R2-S3-F",
    ]);
  });
});

describe("#251: sorting a cabinet beside the wardrobes", () => {
  it("puts room 0 first, such as a hallway you walk through", () => {
    expect(["R1-W6R2-S4", "R0-C1-D4"].sort(compareBerths)).toEqual([
      "R0-C1-D4",
      "R1-W6R2-S4",
    ]);
  });

  it("orders wardrobes before cabinets within the same room", () => {
    // Comparing the kind before the number is what keeps this total: a
    // wardrobe 1 and a cabinet 1 have no shared numbering to compare.
    expect(["R1-C1-D1", "R1-W1R1-S1"].sort(compareBerths)).toEqual([
      "R1-W1R1-S1",
      "R1-C1-D1",
    ]);
  });

  it("puts an undivided unit before its own subdivided form", () => {
    // A cabinet written without a rack sorts as rack 0, so it leads rather than
    // landing unpredictably among the numbered ones.
    expect(["R0-C1R1-D1", "R0-C1-D1"].sort(compareBerths)).toEqual([
      "R0-C1-D1",
      "R0-C1R1-D1",
    ]);
  });

  it("orders cabinets among themselves by number, then by place", () => {
    expect(["R0-C2-D1", "R0-C1-D4", "R0-C1-D2"].sort(compareBerths)).toEqual([
      "R0-C1-D2",
      "R0-C1-D4",
      "R0-C2-D1",
    ]);
  });

  it("is still a total order, so sorting stays stable", () => {
    const codes = ["R0-C1-D4", "R1-W6R2-S4-L", "R1-C1-D1", "R0-C1-D2", "R1-W6R2-S4"];
    const once = [...codes].sort(compareBerths);
    expect([...once].sort(compareBerths)).toEqual(once);
  });
});
