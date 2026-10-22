/**
 * Demo mode: a switch for **local demos only**.
 *
 * With `DEMO_MODE=1` the app skips Google sign-in and treats every request as
 * the single owner, under a fixed invented identity, so the whole app can be
 * shown from a laptop with seeded demo data and no OAuth client. Unset (or any
 * other value), the gate is exactly the fail-closed one from ADR-0012.
 *
 * Never set this on a deployment that holds real data: it removes the only
 * thing standing between the internet and the wardrobe.
 *
 * Kept pure (no Auth.js, no Next runtime) so the gate decision is testable at
 * the unit tier; `src/auth.ts` and `src/proxy.ts` are the only callers that
 * wire it to a real session.
 */

/** The owner identity used while demo mode is on. Invented, like the data. */
export const DEMO_USER = {
  name: "Demo",
  email: "demo@example.com",
  image: null,
} as const;

export type OwnerUser = { name?: string | null; email?: string | null; image?: string | null };

/** Whether demo mode is on. Only the exact value `1` counts, so a stray
 *  `DEMO_MODE=0`, `false` or empty line leaves the real gate in place. */
export function isDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEMO_MODE?.trim() === "1";
}

/**
 * Who the request is acting as: the demo owner when demo mode is on, otherwise
 * the signed-in session's user, otherwise nobody (`null`).
 */
export function resolveOwner(
  demo: boolean,
  sessionUser: OwnerUser | null | undefined,
): OwnerUser | null {
  if (demo) return DEMO_USER;
  return sessionUser ?? null;
}

/** The gate decision the proxy enforces: allowed iff there is an owner. */
export function isAllowed(demo: boolean, sessionUser: OwnerUser | null | undefined): boolean {
  return resolveOwner(demo, sessionUser) !== null;
}
