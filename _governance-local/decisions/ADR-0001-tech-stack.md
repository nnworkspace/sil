# ADR-0001: Adopt Next.js + React + TypeScript

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-18 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`.
> Once a record is `Accepted`, only the status line of this table may change.
> Everything below is frozen at acceptance. To change the decision, write a new
> ADR that supersedes this one.

## Context and problem statement

The wardrobe app is an image-heavy CRUD web app (catalog clothes, tag them, build
trip packing lists), deployed by a single owner who already has a personal account
with a managed hosting platform. The owner has prior experience with other frontend frameworks; Next.js/React is new to them and a deliberate learning goal. Speed to a running, deployed app matters. A framework had to be chosen for the first build.

## Decision drivers

- **Managed deployment**: zero-config deploy, image optimization, server
  functions, preview URLs on the owner's existing host.
- **Ecosystem density**: the richest supply of components, answers, and (relevant
  here) LLM training data, since the app is built largely with AI assistance.
- **Learning value**: the owner wants to meet the one modern idea they had not
  yet worked with: React Server Components.
- **Speed to ship** for a personal project.
- **Stack portability as a hedge**: the domain is captured in stack-agnostic
  specs, so the framework is a reversible choice, not a life sentence.

## Considered options

1. **Next.js (App Router) + React + TypeScript**: largest ecosystem, first-class
   managed hosting, Server Components; React is new to the owner.
2. **Nuxt + Vue**: leverages the owner's Vue familiarity; smaller ecosystem, less
   hosting mindshare.
3. **SvelteKit**: excellent DX and small bundles; smallest ecosystem of the three.
4. **Astro**: strongest for content-heavy sites, weaker for a highly interactive app.

## Decision

Adopt **Next.js 16 (App Router) + React 19 + TypeScript**, styled with
**Tailwind CSS 4** and **shadcn/ui** (the `base-nova` preset, built on Base UI).
Next.js wins on ecosystem + first-class managed hosting + the learning dividend
of Server Components; the density of prior art also makes
AI-assisted work more reliable. The owner's Vue knowledge remains a fallback, kept
open by writing the domain in portable specs (see ADR-0000 and the spec approach).

## Consequences

**Positive**

- Fastest path to a deployed, image-optimized app on the owner's existing host.
- Server Components + Server Actions are learned on a low-stakes project.
- Deep ecosystem and AI-answer density reduce time-to-unblock.

**Negative / accepted trade-offs**

- React's model (re-render + hooks, Server/Client component split) is new to the
  owner, a real learning curve.
- shadcn's `base-nova` preset uses Base UI, not Radix, so some copy-paste
  snippets from the wider shadcn/Radix ecosystem need small adaptation (e.g.
  `render` prop instead of `asChild`).
- Next.js has a fast major-version cadence; staying current is ongoing work.

**Re-evaluation triggers**

- Server Components friction outweighs the benefit for this app's needs.
- The specs mature enough that regenerating the app in another stack (e.g. Nuxt)
  becomes attractive; the portability hedge is deliberately exercisable.
- The managed host ceases to be the deployment target.

## Notes

Related: ADR-0002 (data layer). The commit `scope-enum`
(ADR-0005) includes `ui` for design-system work.
