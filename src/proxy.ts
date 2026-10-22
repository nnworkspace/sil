/**
 * Next.js 16 "proxy" (formerly middleware) — the optimistic auth gate (#119).
 *
 * Auth.js's `auth` wrapper runs the `authorized` callback and redirects any
 * request without an owner session to `/signin`. This is an optimistic check
 * only (proxy must stay light); server components still read the real session
 * via `currentUser()`. Runs on everything except the auth API, the sign-in
 * page, uploaded photos, and Next internals.
 *
 * DEMO_MODE=1 (local demos only, see `src/lib/demo.ts`) lets every request
 * through without consulting Auth.js, which a demo runs without configuring.
 */

import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { isDemoMode } from "@/lib/demo";

// Calling `auth(request, event)` is Auth.js's inline-middleware form, the same
// call `export { auth as proxy }` used to produce. Its public overloads do not
// spell that form out, hence the narrow cast.
const ownerGate = auth as unknown as (
  request: NextRequest,
  event: NextFetchEvent,
) => Promise<Response | undefined>;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isDemoMode()) return NextResponse.next();
  return ownerGate(request, event);
}

export const config = {
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|uploads|favicon.ico).*)"],
};
