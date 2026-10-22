import { describe, expect, it } from "vitest";

import { CONTAINER_LABELS, describeBerth, parseBerth } from "@/lib/compendium/berth";
import { compareBerths } from "@/lib/berths";

/**
 * The container segment (#277).
 *
 * The owner boxed two silk pieces and filed `R1-W2R3-D1-L-BB`. It did not
 * parse, the Compendium said so, and `VAL-COMP-12` decides what happens next:
 * the catalogue is authoritative, so the grammar is what needed fixing — the
 * same conclusion `LF` forced in #213.
 *
 * The distinction these tests protect is that a container is **not a position**.
 * `L`/`R`/`M`/`F`/`B` answer *where on the shelf*; a box answers *what is it
 * in*. They compose rather than compete.
 */

describe("#277 — parsing a container", () => {
  it("reads a box on a side", () => {
    expect(parseBerth("R1-W2R3-D1-L-BB")).toEqual({
      room: 1,
      unit: { kind: "wardrobe", index: 2, rack: 3 },
      place: { kind: "drawer", index: 1 },
      position: "L",
      container: "BB",
    });
  });

  it("reads a box with no side, because a box may fill the place", () => {
    // The two segments are independently optional. Requiring a position first
    // would force a fictional `L` onto a drawer that holds one box.
    const b = parseBerth("R1-W2R3-D1-BT");
    expect(b?.container).toBe("BT");
    expect(b?.position).toBeUndefined();
  });

  it("still reads a side with no box", () => {
    const b = parseBerth("R1-W2R3-D1-LF");
    expect(b?.position).toBe("LF");
    expect(b?.container).toBeUndefined();
  });

  it("leaves every existing code exactly as it was", () => {
    // The regression that would matter most: every berth already in use.
    for (const code of [
      "R1-W6R2-S4-L",
      "R1-W2R3-D1-LB",
      "R1-W2R4-H1",
      "R1-W7R1-S3-F",
      "R0-C1-D2",
    ]) {
      expect(parseBerth(code), code).not.toBeNull();
    }
    expect(describeBerth("R1-W6R2-S4-L")).toBe("room 1 · wardrobe 6, rack 2 · shelf 4 · left");
  });

  it("rejects a container it does not know", () => {
    // The vocabulary is a closed table on purpose. A typo must fail loudly —
    // the Compendium lists an unparsed code and says it does not follow the
    // notation, which is how `BB` itself came to light.
    expect(parseBerth("R1-W2R3-D1-L-XX")).toBeNull();
    expect(parseBerth("R1-W2R3-D1-L-BB-BT")).toBeNull();

    // And a depth is still written joined to its side, never as its own
    // segment: left-back is `LB`. `L-B` was never valid and must not become so
    // by accident now that a fifth segment exists.
    expect(parseBerth("R1-W2R3-D1-LB")?.position).toBe("LB");
    expect(parseBerth("R1-W2R3-D1-L-B")).toBeNull();
  });
});

describe("#277 — describing a container", () => {
  it("puts it last, after the position", () => {
    expect(describeBerth("R1-W2R3-D1-L-BB")).toBe(
      "room 1 · wardrobe 2, rack 3 · drawer 1 · left · bottom box",
    );
    expect(describeBerth("R1-W2R3-D1-L-BT")).toBe(
      "room 1 · wardrobe 2, rack 3 · drawer 1 · left · top box",
    );
  });

  it("names every container the vocabulary holds", () => {
    // A container that parsed but had no label would describe itself as "BB",
    // which is the raw code the sentence exists to translate.
    for (const [code, label] of Object.entries(CONTAINER_LABELS)) {
      expect(describeBerth(`R1-W2R3-D1-${code}`), code).toContain(label);
    }
  });
});

describe("#277 — sorting a container", () => {
  it("no longer dumps the code at the very bottom", () => {
    // What the owner actually saw: the box sorted after every other berth,
    // rooms away from the drawer it is in.
    expect(compareBerths("R1-W2R3-D1-L-BB", "R1-W7R2-H1")).toBeLessThan(0);
  });

  it("sorts a box after the loose contents of the same place", () => {
    // Walking a drawer, you meet what is lying in it before what is boxed in it.
    expect(compareBerths("R1-W2R3-D1-L", "R1-W2R3-D1-L-BB")).toBeLessThan(0);
  });

  it("orders the boxes among themselves", () => {
    expect(compareBerths("R1-W2R3-D1-L-BB", "R1-W2R3-D1-L-BT")).toBeLessThan(0);
  });

  it("keeps its place beside its neighbours", () => {
    // `L` sorts before `LB` for the same reason a bare place sorts before a
    // position: broader location first. So the box on the left comes before
    // left-back, and all three stay in drawer 1 where they belong — which is
    // the whole point, since the code used to land after everything.
    const codes = ["R1-W7R2-H1", "R1-W2R3-D1-L-BB", "R1-W2R3-D1-LB", "R1-W2R3-D1-LF"];
    expect([...codes].sort(compareBerths)).toEqual([
      "R1-W2R3-D1-L-BB",
      "R1-W2R3-D1-LB",
      "R1-W2R3-D1-LF",
      "R1-W7R2-H1",
    ]);
  });

  it("stays a total order, so sorting is stable and reversible", () => {
    const codes = ["R1-W2R3-D1-L-BT", "R1-W2R3-D1-L-BB", "R1-W2R3-D1-BB", "R1-W2R3-D1"];
    const once = [...codes].sort(compareBerths);
    expect([...once].sort(compareBerths)).toEqual(once);
    expect([...codes].reverse().sort(compareBerths)).toEqual(once);
  });
});
