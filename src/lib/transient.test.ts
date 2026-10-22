import { describe, expect, it, vi } from "vitest";

import { isTransient, withRetry } from "@/lib/transient";

/**
 * Retrying only what is worth retrying (#308).
 *
 * The tests that matter here are the negative ones. A retry that swallows a
 * real error turns a loud bug into an intermittent one, and intermittent bugs
 * are the expensive kind — so most of this file is about what must *not* be
 * tried again.
 */

const pgError = (code: string) => Object.assign(new Error(`pg ${code}`), { code });
/** Drizzle wraps the driver error and re-throws, so the code moves to `cause`. */
const wrapped = (code: string) =>
  Object.assign(new Error("Failed query: select …"), { cause: pgError(code) });

describe("#308 — what counts as transient", () => {
  it("recognises the failure that actually happened", () => {
    // `relation "items" does not exist`, on a database where the table was
    // present and readable throughout.
    expect(isTransient(pgError("42P01"))).toBe(true);
  });

  it("finds the code through Drizzle's wrapper", () => {
    // The production log showed exactly this shape: a "Failed query" error with
    // the real one hanging off `cause`. Reading only `error.code` would miss it.
    expect(isTransient(wrapped("42P01"))).toBe(true);
  });

  it("recognises a server that is going away or full", () => {
    for (const code of ["57P01", "57P03", "53300", "08006"]) {
      expect(isTransient(pgError(code)), code).toBe(true);
    }
  });

  it("recognises a socket that died before Postgres saw it", () => {
    expect(isTransient(pgError("ECONNRESET"))).toBe(true);
  });

  it("does NOT retry a constraint violation", () => {
    // A unique violation is an answer, not an accident. Retrying it hides a
    // real conflict and returns the same error a beat later anyway.
    expect(isTransient(pgError("23505"))).toBe(false);
  });

  it("does NOT retry a syntax or permission error", () => {
    for (const code of ["42601", "42501", "22P02"]) {
      expect(isTransient(pgError(code)), code).toBe(false);
    }
  });

  it("does NOT retry an error with no code at all", () => {
    // A TypeError from render code has no business being run twice.
    expect(isTransient(new TypeError("x.map is not a function"))).toBe(false);
    expect(isTransient(undefined)).toBe(false);
    expect(isTransient("a string")).toBe(false);
  });
});

describe("#308 — withRetry", () => {
  it("does not call twice when the first attempt works", async () => {
    const read = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(read)).resolves.toBe("ok");
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("tries once more after a transient failure, and returns the second result", async () => {
    const read = vi.fn().mockRejectedValueOnce(pgError("42P01")).mockResolvedValue("ok");
    await expect(withRetry(read, 0)).resolves.toBe("ok");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("gives up after one retry rather than looping", async () => {
    // The fault this exists for clears in milliseconds or is not transient at
    // all. A page that hangs for eight seconds before failing is worse than one
    // that fails at once.
    const read = vi.fn().mockRejectedValue(pgError("42P01"));
    await expect(withRetry(read, 0)).rejects.toThrow();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("rethrows a non-transient error immediately, untouched", async () => {
    const boom = pgError("23505");
    const read = vi.fn().mockRejectedValue(boom);
    await expect(withRetry(read, 0)).rejects.toBe(boom);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
