import { describe, expect, it } from "vitest";

import { formatBerthSummary, summariseBerth } from "@/lib/berths";

/**
 * What a berth holds (#219).
 *
 * Pure by design, so these tests describe **shapes, not inventory** — filing
 * another hundred garments must cost no test maintenance. The one place real
 * berths appear is the ordering case, because that is where a plausible
 * implementation goes quietly wrong.
 */

describe("summariseBerth", () => {
  it("names the commonest categories first", () => {
    const berth = ["trousers", "trousers", "trousers", "culottes", "culottes", "shorts"];
    expect(summariseBerth(berth)).toEqual({ parts: ["trousers", "culottes"], extra: 1 });
  });

  it("breaks ties alphabetically, so a summary does not shuffle between renders", () => {
    // An even split has no 'commonest'. Without a tie-break the order would
    // depend on insertion, and the line would change for no visible reason.
    const a = summariseBerth(["skirts", "t-shirts"]);
    const b = summariseBerth(["t-shirts", "skirts"]);
    expect(a).toEqual(b);
    expect(a.parts).toEqual(["skirts", "t-shirts"]);
  });

  it("says nothing at all for an empty berth, rather than '+0'", () => {
    expect(summariseBerth([])).toEqual({ parts: [], extra: 0 });
    expect(formatBerthSummary([])).toBeNull();
  });

  it("does not claim an overflow that is not there", () => {
    expect(summariseBerth(["skirts", "skirts"])).toEqual({ parts: ["skirts"], extra: 0 });
    expect(formatBerthSummary(["skirts", "skirts"])).toBe("skirts");
  });

  it("uses the category's label, not its slug", () => {
    // `underwear-and-pyjamas` would be unreadable; the label is the vocabulary
    // the owner actually files under.
    expect(summariseBerth(["underwear-and-pyjamas"]).parts).toEqual(["underwear and pyjamas"]);
  });

  it("passes an unknown slug through instead of dropping the piece", () => {
    // A category retired from CATEGORIES but still on a row must not silently
    // vanish from the count — that would make a berth look emptier than it is.
    expect(summariseBerth(["ghost-category"]).parts).toEqual(["ghost-category"]);
  });

  it("honours a different cap", () => {
    const berth = ["tops", "skirts", "trousers", "bags"];
    expect(summariseBerth(berth, 3).parts).toHaveLength(3);
    expect(summariseBerth(berth, 3).extra).toBe(1);
  });
});

describe("formatBerthSummary", () => {
  it("reads the way the owner approved", () => {
    expect(formatBerthSummary(["tops", "tops", "t-shirts"])).toBe("tops, t-shirts");
    expect(
      formatBerthSummary(["trousers", "trousers", "culottes", "shorts"]),
    ).toBe("trousers, culottes +1");
    expect(formatBerthSummary(["t-shirts"])).toBe("t-shirts");
  });

  it("#219: summarises primary categories only", () => {
    // The rule that makes the line worth reading. A shirt is also in `tops`
    // (#71, #206); if secondaries were counted, nearly every berth would say
    // "tops, shirts" and the summary would stop distinguishing anything.
    // Here the input is primaries alone — the caller must not pass secondaries.
    expect(formatBerthSummary(["shirts", "shirts", "jumpers"])).toBe("shirts, jumpers");
  });
});
