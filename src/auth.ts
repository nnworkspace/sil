/**
 * Authentication (Auth.js / NextAuth v5) — single-owner gate (#119, ADR-0012).
 *
 * Google OAuth, JWT sessions (no session table). Only the owner may sign in:
 * the `signIn` callback rejects any Google account whose verified email is not
 * in the `OWNER_EMAIL` allowlist. The `authorized` callback is the optimistic
 * check the proxy (Next 16 middleware) uses to redirect anonymous requests to
 * `/signin`; the real session is still read via `currentUser()` in server code.
 *
 * Env: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, OWNER_EMAIL (comma-list).
 * DEMO_MODE=1 bypasses all of this for local demos only (see `src/lib/demo.ts`).
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isAllowed, isDemoMode, resolveOwner, type OwnerUser } from "@/lib/demo";

const OWNERS = (process.env.OWNER_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    // Only the owner(s) may sign in — fail closed if the allowlist is unset.
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      return Boolean(email && profile?.email_verified && OWNERS.includes(email));
    },
    // Optimistic gate for the proxy: any signed-in (owner) session is allowed.
    // The proxy short-circuits demo mode before Auth.js runs; passing the flag
    // here as well keeps the one decision in `isAllowed`.
    authorized({ auth }) {
      return isAllowed(isDemoMode(), auth?.user);
    },
  },
});

/**
 * The owner the current request acts as, or `null` when nobody is signed in.
 *
 * In demo mode (local demos only) this is the fixed demo identity and Auth.js
 * is not consulted at all, because a demo runs without AUTH_SECRET or an OAuth
 * client. Otherwise it is the real session's user, exactly as `auth()` gives it.
 */
export async function currentUser(): Promise<OwnerUser | null> {
  if (isDemoMode()) return resolveOwner(true, null);
  const session = await auth();
  return resolveOwner(false, session?.user);
}
