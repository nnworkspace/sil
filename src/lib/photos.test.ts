import { describe, expect, it } from "vitest";

import { inPhotoOrder, photoCaption, stepIndex } from "@/lib/photos";

/**
 * The photo viewer's navigation rule (#195, `VAL-LOOK-12`).
 *
 * Only the pure part is covered here: the viewer's zoom and pan are DOM- and
 * gesture-bound and stay manually verified. What matters for correctness is
 * that stepping wraps in both directions and never yields an index outside the
 * list: an out-of-range index blanks the viewer mid-browse.
 */
describe("stepIndex", () => {
  it("advances and wraps past the end", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(1, 1, 3)).toBe(2);
    expect(stepIndex(2, 1, 3)).toBe(0);
  });

  it("goes back and wraps past the start, never a negative index", () => {
    expect(stepIndex(2, -1, 3)).toBe(1);
    expect(stepIndex(1, -1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
  });

  it("stays put for a single photo, in either direction", () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, -1, 1)).toBe(0);
  });

  it("yields 0 for an empty list rather than NaN or -1", () => {
    // Reachable if the last photo is deleted while the viewer is open.
    expect(stepIndex(0, 1, 0)).toBe(0);
    expect(stepIndex(3, -1, 0)).toBe(0);
  });

  it("wraps correctly for a step larger than the list", () => {
    expect(stepIndex(0, 5, 3)).toBe(2);
    expect(stepIndex(0, -5, 3)).toBe(1);
  });
});


/**
 * When and where a photograph was taken (#244).
 *
 * The rules worth pinning are the ones about *absence*: almost every photo in
 * this catalogue is a retailer still with neither, and the wrong behaviour is
 * to render an empty caption or to treat "no date" as "very old".
 */
describe("#244: photoCaption", () => {
  it("says nothing when neither is recorded", () => {
    // The common case by a wide margin. The caller renders nothing at all.
    expect(photoCaption({})).toBeNull();
    expect(photoCaption({ takenOn: null, place: null })).toBeNull();
    expect(photoCaption({ place: "   " })).toBeNull();
  });

  it("gives place and date together when both are known", () => {
    expect(photoCaption({ takenOn: "2019-05-12", place: "Lyon, France" })).toBe(
      "Lyon, France · 2019-05-12",
    );
  });

  it("gives whichever one is known on its own", () => {
    expect(photoCaption({ takenOn: "2019-05-18" })).toBe("2019-05-18");
    expect(photoCaption({ place: "Lyon, France" })).toBe("Lyon, France");
  });

  it("#249: shows the date exactly as stored, matching every other date in the app", () => {
    // Pinned so it cannot drift back to a long English date. Rendering the
    // stored string is also why no Date is constructed here any more, and why
    // the old off-by-one-day-west-of-Greenwich hazard cannot recur.
    expect(photoCaption({ takenOn: "2015-10-31" })).toBe("2015-10-31");
    expect(photoCaption({ takenOn: "2024-01-01" })).toBe("2024-01-01");
  });
});

describe("#244: inPhotoOrder", () => {
  const p = (id: string, over: Record<string, unknown> = {}) => ({ id, sort: 0, ...over });

  it("keeps the chosen cover first, whatever its date", () => {
    // The cover is a deliberate choice (#56) and outranks chronology: the look's
    // cover is the full-length shot even though a later photo exists.
    const out = inPhotoOrder([
      p("old", { takenOn: "2010-01-01" }),
      p("cover", { takenOn: "2020-01-01", isPrimary: true }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["cover", "old"]);
  });

  it("puts dated photos oldest first, so a gallery reads as a history", () => {
    const out = inPhotoOrder([
      p("later", { takenOn: "2019-05-18" }),
      p("earlier", { takenOn: "2019-05-12" }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["earlier", "later"]);
  });

  it("does not treat an undated photo as very old", () => {
    // The trap: most undated photos are retailer stills, and sorting them to the
    // front would bury the real memories behind them.
    const out = inPhotoOrder([p("undated", { sort: 5 }), p("dated", { takenOn: "2019-05-12" })]);
    expect(out.map((x) => x.id)).toEqual(["dated", "undated"]);
  });

  it("leaves undated photos in their existing order", () => {
    const out = inPhotoOrder([p("b", { sort: 2 }), p("a", { sort: 1 }), p("c", { sort: 3 })]);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate what it is given", () => {
    const input = [p("b", { sort: 2 }), p("a", { sort: 1 })];
    inPhotoOrder(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
