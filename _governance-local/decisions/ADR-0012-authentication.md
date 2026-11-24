# ADR-0012: Single-owner authentication with Auth.js (Google OAuth)

- **Status:** Accepted
- **Date:** 2026-07-22
- **Issue:** #119

## Context

The wardrobe is a single-owner personal app with **no authentication** so far: fine locally, but a public deployment would expose the whole wardrobe, including the owner's own photos, to anyone with the URL. Before deploying we need to gate the app so **only the owner** can access it.

Options considered:

- **Simple password gate**: one shared password + signed cookie. Minimal, but a single static secret and no real identity.
- **Host-level deployment protection**: gates the deployment behind the hosting platform's SSO or password. Quick, but plan-limited and not part of the app.
- **Auth provider (Auth.js / Clerk / Auth0)**: real OAuth identity.

The owner chose a real OAuth login via **Auth.js (NextAuth v5)** with **Google**.

## Decision

Authenticate with **Auth.js (NextAuth) v5** using the **Google** provider, restricted to the owner:

- **JWT sessions** (`strategy: "jwt"`): no session/user tables; the app has exactly one user, so a database adapter is unnecessary.
- **Single-owner allowlist**: the `signIn` callback admits a Google account only if its **verified** email is in `OWNER_EMAIL` (comma-separated). It **fails closed**: an unset allowlist admits nobody.
- **Route gating via the Next.js 16 `proxy`** (formerly middleware): `export { auth as proxy }` runs the `authorized` callback and redirects any anonymous request to `/signin`. Per the Next docs this is an **optimistic** check only; server components/actions remain the source of truth via `auth()`.
- **`/signin`** is the sole public page (plus `/api/auth/*`, uploaded photos, and Next internals, excluded in the proxy `matcher`).
- **Config:** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `OWNER_EMAIL` (in `.env.local` for dev and in the host's environment settings for prod).

## Consequences

- The deployed app is private to the owner; personal photos never sit on an open URL. (The photo files themselves can stay publicly served: the app gates access, and their URLs remain unguessable.)
- No user management, sign-up, or roles (deliberately). Adding a second user later is a `OWNER_EMAIL` entry, not a schema change.
- The Google OAuth client needs both the **localhost** and the **production** callback URLs (`/api/auth/callback/google`) registered.
- New dependency: `next-auth@5` (beta). Auth.js core is Edge-compatible for JWT sessions, so the `proxy` runs without a database.
- This realises the roadmap's **Authentication** backlog item.
