import { describe, expect, it } from "vitest";

import {
  defaultWearDate,
  describeBatch,
  packedToTick,
  planBatch,
} from "@/lib/batch-wear";

/**
 * Batch wear logging (#320).
 *
 * The cases are named after the kind of trip that produced the feature: ten days in Kyoto, well over a dozen wears entered one at a time, and several pieces of jewellery that never got logged at all.
 */

const piece = (itemId: string, name = itemId) => ({ itemId, name });

describe("#320 — what a batch writes", () => {
  it("writes one wear per selected piece", () => {
    const plan = planBatch([piece("dress"), piece("shoes"), piece("necklace")], []);
    expect(plan.itemIds).toEqual(["dress", "shoes", "necklace"]);
    expect(plan.duplicates).toEqual([]);
  });

  it("deduplicates within the selection", () => {
    // A piece can reach one batch twice — it may belong to two Looks, or be
    // both selected in the grid and part of the chosen day. Writing it twice
    // would record a wear that did not happen.
    const plan = planBatch([piece("culottes"), piece("shirt"), piece("culottes")], []);
    expect(plan.itemIds).toEqual(["culottes", "shirt"]);
  });

  it("keeps the selection's order, so the toast and the writes agree", () => {
    const plan = planBatch([piece("c"), piece("a"), piece("b")], []);
    expect(plan.itemIds).toEqual(["c", "a", "b"]);
  });

  it("ignores an empty id rather than writing a broken row", () => {
    expect(planBatch([piece(""), piece("real")], []).itemIds).toEqual(["real"]);
  });

  it("reports a piece already worn that day, but still writes it", () => {
    // Wearing one piece on two occasions in a day is real — the office, then
    // dinner. So this is a question for the owner, not a rule.
    const plan = planBatch([piece("denim", "V-Neck Denim Dress"), piece("shoes")], ["denim"]);
    expect(plan.duplicates).toEqual([{ itemId: "denim", name: "V-Neck Denim Dress" }]);
    expect(plan.itemIds).toContain("denim");
  });

  it("says nothing when the same piece was worn on a different day", () => {
    // The denim dress ran two days in Kyoto, 18th and 19th. Logging the 19th
    // must not be flagged because the 18th exists.
    expect(planBatch([piece("denim")], []).duplicates).toEqual([]);
  });
});

describe("#320 — ticking packed from a trip-side batch", () => {
  it("ticks a piece that is on the trip and not yet packed", () => {
    // The owner does not reliably tick while packing, so `false` here means
    // "not ticked" far more often than "not packed".
    expect(packedToTick(["a", "b"], new Map([["a", false], ["b", false]]))).toEqual(["a", "b"]);
  });

  it("leaves an already-packed piece alone", () => {
    expect(packedToTick(["a", "b"], new Map([["a", true], ["b", false]]))).toEqual(["b"]);
  });

  it("never unticks — the inference only runs one way", () => {
    // Un-packing stays a deliberate act. Nothing here can produce a false.
    const out = packedToTick(["a"], new Map([["a", true]]));
    expect(out).toEqual([]);
  });

  it("ticks nothing when there is no trip to infer from", () => {
    // A wear logged from the browse grid or a Look knows about no suitcase, so
    // the caller passes an empty membership and this must stay silent.
    expect(packedToTick(["a", "b"], new Map())).toEqual([]);
  });

  it("ignores a selected piece that is not on this trip", () => {
    expect(packedToTick(["a", "stranger"], new Map([["a", false]]))).toEqual(["a"]);
  });
});

describe("#320 — the batch names both of its effects", () => {
  it("names the packed ticks alongside the wears", () => {
    // The whole reason ticking `packed` from a wear log is acceptable: a hidden
    // second write is how a control stops being trusted, a stated one is not.
    expect(describeBatch(3, 2)).toBe("Logged 3 wears · 2 marked packed");
  });

  it("says nothing about packing when nothing was ticked", () => {
    expect(describeBatch(3, 0)).toBe("Logged 3 wears");
  });

  it("reads correctly for a single piece", () => {
    expect(describeBatch(1, 0)).toBe("Logged 1 wear");
    expect(describeBatch(1, 1)).toBe("Logged 1 wear · 1 marked packed");
  });
});

describe("#320 — which date the dialog opens on", () => {
  it("uses the trip day, not today", () => {
    // The case that matters on the road: catching up on the 25th for what was
    // worn on the 14th. Defaulting to today would record the wrong date.
    expect(defaultWearDate("2026-08-14", "2026-08-25")).toBe("2026-08-14");
  });

  it("falls back to today everywhere else", () => {
    expect(defaultWearDate(null, "2026-08-25")).toBe("2026-08-25");
    expect(defaultWearDate(undefined, "2026-08-25")).toBe("2026-08-25");
    expect(defaultWearDate("", "2026-08-25")).toBe("2026-08-25");
  });
});
