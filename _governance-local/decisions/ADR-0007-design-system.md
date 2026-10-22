# ADR-0007: Design system — Assistant body, EB Garamond headings, sharp edges

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-18 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`. Once a record is `Accepted`, only the status line of this table may change. Everything below is frozen at acceptance. To change the decision, write a new ADR that supersedes this one.

## Context and problem statement

The Phase 1 UI shipped with create-next-app defaults: the Geist font and rounded corners (shadcn's `--radius`). The owner wants a distinct, elegant visual identity for the wardrobe app: an editorial, low-ornament style that pairs a serif display face with a clean sans.

## Decision drivers

- A cohesive, elegant look-and-feel that suits a fashion/wardrobe app.
- A classic serif for headings and the brand, a quiet sans for everything else.
- Low setup: no font accounts, kits or licences to manage.
- Good loading behaviour on Vercel.

## Considered options

- **Body sans:** Assistant vs Hanken Grotesk vs Geist (default).
- **Heading serif:** EB Garamond (a free Garamond revival on Google Fonts) vs a commercial Garamond served from a hosted font kit.
- **Corners:** keep shadcn's rounded `--radius` vs set it to `0` (sharp).

## Decision

- **Body font: Assistant**, self-hosted via `next/font/google` (variable font), exposed as `--font-sans`.
- **Heading and brand font: EB Garamond at weight 400 (normal, not bold)**; the regular weight reads as the most elegant. Self-hosted via `next/font/google` (regular and italic), exposed as `--font-eb-garamond`. `--font-serif` is `var(--font-eb-garamond), Georgia, serif`. Applied to the main page titles and the brand, keeping small UI labels in the sans.
- **Sharp edges: `--radius: 0`** in `globals.css`, so all shadcn-derived corners (inputs, cards, buttons, photo frames) render square.

## Consequences

**Positive**

- A distinctive, elegant editorial identity.
- Both faces are open-licensed and self-hosted by `next/font` at build time: no external font request, no account dependency, no new provisioning.
- `next/font` generates size-adjusted fallbacks, which keeps layout shift low while the web fonts load.

**Negative / accepted trade-offs**

- EB Garamond is slightly less refined than the best commercial Garamond cuts at large display sizes; accepted for the zero-setup, open-licence benefit.
- Corner-radius is now a single global `0`; a component that ever wants rounding must opt in explicitly.

**Re-evaluation triggers**

- A commercial heading face becomes worth the licence and the external dependency.
- Loading or FOUT of the serif proves objectionable.

## Notes

Config: `src/app/layout.tsx` (Assistant + EB Garamond via `next/font/google`), `src/app/globals.css` (`--font-serif`, `--radius: 0`). Related: ADR-0001 (stack). Tracked in the design-feedback collector (#12); implemented under #15.
