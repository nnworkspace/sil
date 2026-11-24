import { describe, expect, it } from "vitest";

import {
  BERTH_NOTES,
  berthNote,
  describeBerth,
  parseBerth,
  positionLabel,
} from "@/lib/compendium/berth";

/**
 * The berth grammar (SPEC-COMPENDIUM-DATA §5). The load-bearing case is the
 * whole catalogue: every code in use must parse, because the Compendium claims
 * to document the convention the wardrobe actually follows (VAL-COMP-12).
 */

/** A representative set of berth codes covering every shape the grammar supports. */
const IN_USE = [
  "R1-W2R3-D1-LB",
  "R1-W2R3-D1-LF",
  "R1-W2R3-D2-L",
  "R1-W2R3-H1-L",
  "R1-W2R3-H1-M",
  "R1-W2R3-H1-R",
  "R1-W2R4-H1",
  "R1-W2R4-S2-B",
  "R1-W2R4-S2-F",
  "R1-W6R2-S3",
  "R1-W6R2-S3-L",
  "R1-W6R2-S4-L",
  "R1-W6R2-S4-R",
  "R1-W6R2-S6",
  "R1-W6R2-S6-L",
  "R1-W7R2-S3-B",
  "R1-W7R2-S3-F",
  "R1-W7R2-S4-B",
  "R1-W7R2-S4-F",
];

describe("parseBerth", () => {
  it("#213: every berth code in use parses", () => {
    const failed = IN_USE.filter((code) => parseBerth(code) === null);
    expect(failed).toEqual([]);
  });

  it("reads each segment by position, not by letter", () => {
    // The whole point: the first R is the room, the second is the rack.
    expect(parseBerth("R1-W6R2-S4-L")).toEqual({
      room: 1,
      unit: { kind: "wardrobe", index: 6, rack: 2 },
      place: { kind: "shelf", index: 4 },
      position: "L",
    });
  });

  it("distinguishes shelf, drawer and hanging rail", () => {
    expect(parseBerth("R1-W6R2-S3")?.place).toEqual({ kind: "shelf", index: 3 });
    expect(parseBerth("R1-W2R3-D2-L")?.place).toEqual({ kind: "drawer", index: 2 });
    expect(parseBerth("R1-W2R4-H1")?.place).toEqual({ kind: "rail", index: 1 });
  });

  it("treats the position as optional, not as a malformed code", () => {
    // Many pieces sit in codes with no position; reading them as broken would
    // report the largest berths in the wardrobe as errors.
    const whole = parseBerth("R1-W6R2-S3");
    expect(whole).not.toBeNull();
    expect(whole?.position).toBeUndefined();
  });

  it("reads LB as left-back rather than stopping at the L", () => {
    expect(parseBerth("R1-W2R3-D1-LB")?.position).toBe("LB");
  });

  it("#219: accepts any side-and-depth pair, not just the ones already filed", () => {
    // The grammar first listed the six positions then in use, and rejected
    // `LF` when the owner filed it. VAL-COMP-12 is explicit that the catalogue
    // is authoritative, so the rule composes a side with a depth rather than
    // enumerating examples, and the next new pairing needs no code change.
    for (const p of ["LF", "LB", "RF", "RB", "MF", "MB"]) {
      expect(parseBerth(`R1-W2R3-D1-${p}`)?.position, p).toBe(p);
    }
  });

  it("still refuses a depth-then-side pair, which is not the notation", () => {
    expect(parseBerth("R1-W2R3-D1-FL")).toBeNull();
    expect(parseBerth("R1-W2R3-D1-LM")).toBeNull();
  });

  it("is case- and whitespace-insensitive", () => {
    expect(parseBerth("  r1-w6r2-s4-l  ")).toEqual(parseBerth("R1-W6R2-S4-L"));
  });

  it("returns null rather than guessing at a code it does not know", () => {
    for (const bad of [
      "",
      "attic",
      "R1-W6R2",         // no place
      "R1-W6R2-S4-Z",    // unknown position
      "R1-W6R2-X4-L",    // unknown place kind
      "R1-W6R2-S4-LR",   // two sides is not a pair
      "R1-W6R2-S4-L-2",  // trailing segment
      "W6R2-S4-L",       // no room
    ]) {
      expect(parseBerth(bad), bad).toBeNull();
    }
  });
});

describe("positionLabel", () => {
  it("composes a side with a depth", () => {
    expect(positionLabel("LF")).toBe("left-front");
    expect(positionLabel("RB")).toBe("right-back");
    expect(positionLabel("MF")).toBe("middle-front");
  });

  it("reads a lone side or depth on its own", () => {
    expect(positionLabel("M")).toBe("middle");
    expect(positionLabel("B")).toBe("back");
  });
});

describe("describeBerth", () => {
  it("reads a code out in words, outermost first", () => {
    expect(describeBerth("R1-W6R2-S4-L")).toBe("room 1 · wardrobe 6, rack 2 · shelf 4 · left");
  });

  it("reads the owner's newest berth", () => {
    expect(describeBerth("R1-W2R3-D1-LF")).toBe(
      "room 1 · wardrobe 2, rack 3 · drawer 1 · left-front",
    );
  });

  it("omits the position when the code carries none", () => {
    expect(describeBerth("R1-W2R4-H1")).toBe("room 1 · wardrobe 2, rack 4 · hanging rail 1");
  });

  it("returns null for a code it cannot read, so callers can fall back", () => {
    expect(describeBerth("attic")).toBeNull();
  });
});


/**
 * A unit that is a cabinet rather than a wardrobe (#251).
 *
 * A piece was berthed in a cabinet, and the grammar could not
 * say so: a wardrobe carries a rack inside it, and a cabinet has none.
 */
describe("#251: cabinets, and room zero", () => {
  it("parses a cabinet, which has no rack", () => {
    expect(parseBerth("R0-C1-D4")).toEqual({
      room: 0,
      unit: { kind: "cabinet", index: 1 },
      place: { kind: "drawer", index: 4 },
    });
  });

  it("still parses every wardrobe code, unchanged", () => {
    expect(parseBerth("R1-W6R2-S4-L")?.unit).toEqual({
      kind: "wardrobe",
      index: 6,
      rack: 2,
    });
  });

  it("reads a cabinet that is divided into racks", () => {
    // A cabinet may have several banks of drawers or a single bank, so the
    // subdivision is optional on both kinds of furniture.
    expect(parseBerth("R0-C1R1-D4")?.unit).toEqual({
      kind: "cabinet",
      index: 1,
      rack: 1,
    });
  });

  it("omits rack entirely rather than defaulting it, where there is none", () => {
    // `rack: 1` would be a lie about furniture that has no subdivision, and it
    // would make two spellings of one berth compare unequal.
    expect(parseBerth("R0-C1-D4")?.unit).not.toHaveProperty("rack");
  });

  it("reads a wardrobe with a single rack, written without one", () => {
    expect(parseBerth("R1-W3-S2")?.unit).toEqual({ kind: "wardrobe", index: 3 });
  });

  it("describes a cabinet in words", () => {
    expect(describeBerth("R0-C1-D4")).toBe("room 0 · cabinet 1 · drawer 4");
    expect(describeBerth("R0-C1R1-D4")).toBe("room 0 · cabinet 1, rack 1 · drawer 4");
    expect(describeBerth("R1-W6R2-S4-L")).toBe(
      "room 1 · wardrobe 6, rack 2 · shelf 4 · left",
    );
  });

  it("accepts room zero, which is how a hallway is written", () => {
    // R0 needed no change (`R(\\d+)` already matched it), but it is pinned
    // here because a hallway berth depends on it and nothing else uses a zero.
    expect(parseBerth("R0-C1-D4")?.room).toBe(0);
  });
});

/**
 * What a berth is for (#254). The index derives what is *on* a shelf; only the
 * owner can say what it is *for*.
 */
describe("#254: berth notes", () => {
  it("returns the note for a berth that has one", () => {
    expect(berthNote("R1-W7R2-S6")).toMatch(/loungewear/i);
  });

  it("returns null for the great majority, which have none", () => {
    // The caller must render nothing at all rather than an empty line.
    expect(berthNote("R1-W2R3-D1-LB")).toBeNull();
    expect(berthNote("R9-W9R9-S9")).toBeNull();
  });

  it("matches however the code is cased or spaced", () => {
    expect(berthNote("  r1-w7r2-s6  ")).toBe(berthNote("R1-W7R2-S6"));
  });

  it("only annotates codes that parse, so a note cannot describe a typo", () => {
    for (const code of Object.keys(BERTH_NOTES)) {
      expect(parseBerth(code), code).not.toBeNull();
    }
  });
});
