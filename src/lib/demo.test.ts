import { describe, expect, it } from "vitest";

import { DEMO_USER, isAllowed, isDemoMode, resolveOwner } from "@/lib/demo";

/**
 * Demo mode and the owner gate (local demos only).
 *
 * The negative cases matter most: the switch must never open the gate unless
 * it is set exactly, and with it off an anonymous request must be turned away
 * exactly as before (ADR-0012, fail closed).
 */

const owner = { name: "Owner", email: "owner@example.com" };

describe("demo mode: the switch", () => {
  it("is on only for DEMO_MODE=1", () => {
    expect(isDemoMode({ DEMO_MODE: "1" })).toBe(true);
    expect(isDemoMode({ DEMO_MODE: " 1 " })).toBe(true);
  });

  it("stays off when unset, empty or any other value", () => {
    for (const value of [undefined, "", "0", "true", "yes", "on"]) {
      expect(isDemoMode({ DEMO_MODE: value }), String(value)).toBe(false);
    }
    expect(isDemoMode({})).toBe(false);
  });
});

describe("demo mode: the gate", () => {
  it("demo on, no session: allowed, as the demo owner", () => {
    expect(isAllowed(true, null)).toBe(true);
    expect(isAllowed(true, undefined)).toBe(true);
    expect(resolveOwner(true, null)).toEqual(DEMO_USER);
  });

  it("demo on ignores any real session and always acts as the demo owner", () => {
    expect(resolveOwner(true, owner)).toEqual(DEMO_USER);
  });

  it("demo off, no session: rejected as before", () => {
    expect(isAllowed(false, null)).toBe(false);
    expect(isAllowed(false, undefined)).toBe(false);
    expect(resolveOwner(false, null)).toBeNull();
  });

  it("demo off, owner session: allowed, as that owner", () => {
    expect(isAllowed(false, owner)).toBe(true);
    expect(resolveOwner(false, owner)).toBe(owner);
  });

  it("the demo identity is the invented one", () => {
    expect(DEMO_USER).toMatchObject({ name: "Demo", email: "demo@example.com" });
  });
});
