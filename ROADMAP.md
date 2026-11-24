# Roadmap

The phased plan for the wardrobe app. This is the single place the roadmap lives; it's kept in sync as phases land. Detail for each feature lives in its spec set under [`specs/`](specs/); decisions live in the [ADRs](_governance-local/decisions/); work was tracked in issues (labelled `phase::*`) in the private tracker where the app was built, so issue numbers below are historical markers.

Built iteratively: each phase is usable on its own.

## Phases

| Phase | Feature | Status |
|:--|:--|:--|
| **1** | **Catalog MVP**: add / view / edit / delete clothing items with photos and rich detail; browse in a store-like grid by category | ✅ Done |
| **1.5** | **AI-assisted import**: prefill the add-item form from a screenshot (1.5a) or a saved product page `.html` (1.5b, incl. official photos) via an LLM; human-in-the-loop | ✅ Done (1.5a #32, 1.5b #33) ([spec](specs/ai-import/)) |
| **2** | **Tags & filtering**: a global browse view with tag filters (occasion / feel / season / care + style facets), a colour-family filter, sort, and keyword search; a collapsible dropdown panel, also on category pages | ✅ Done (#39; enhanced #105/#106/#108/#109) ([spec](specs/browse/)) |
| **3** | **Trips & packing**: create a trip (business / vacation) and build a packing list from the wardrobe (**v1 manual**), with an **AI packing planner** that proposes a plan for review | ✅ Done (#74; planner ADR-0010) ([spec](specs/trips/), [planner](specs/trip-planner/)) |
| **4** | **Looks**: group pieces into **sets** (co-ords) & **looks** (styled combinations); a piece's page shows its Looks and what it "goes with"; each Look takes its own photos and a drag-ordered piece grid | ✅ Done (#97, #99, #100) ([spec](specs/looks/)) |
| **5** | **Figures**: a root-level statistics tab showing what the wardrobe is made of, what it cost and when it arrived, and what actually gets worn. A sidebar carries section navigation and global filters; charts are lightweight inline SVG. Wear-derived metrics state their denominator, since only a third of the catalogue carries wear data, and a **Gaps** module turns that into a to-do list | ✅ Done, all three phases (#181, #194) ([spec](specs/figures/)) |
| **6** | **Compendium**: a root-level reference area, laid out as a documentation site (section tree, one route per section), covering the wardrobe's **materials** as a glossary (term in the language the trade uses, explanation in Chinese, linked to the pieces that use it) and the **berth notation**, which was documented nowhere else | ✅ Done, all three phases (#213; #215, #216, #224) ([spec](specs/compendium/)) |

## Cross-cutting / backlog

Not tied to a single phase; picked up when they earn their place:

- **Wear tracking**: log each wear (date + occasion tag + note), with worn-count / last-worn / cost-per-wear; ✅ Done (#44) ([spec](specs/wear-tracking/)).
- **Archive**: retire a piece with a reason and a date instead of deleting it; archived pieces stay viewable but leave every active-wardrobe read. Extended to looks; ✅ Done (#142, #170) ([spec](specs/archive/)).
- **Berth**: a short free-text storage location per piece ("R1-W1R1-S1-F"), shown on the card and beside the brand, searchable, with a browse-by-berth view; ✅ Done (#172, #175).
- **Return-window reminders**: driven by each item's `return_by`.
- **Weather strip**: a concise 10-day forecast in the header (Open-Meteo, keyless); ✅ Done (#47) ([spec](specs/weather/)). A stepping stone to:
- **Weather-aware packing**: a trip's destination forecast is shown beside its packing list and feeds the AI planner's prompt ([spec](specs/trips/)).
- **Authentication**: single-owner gating with Auth.js (Google OAuth) and a fail-closed allowlist; ✅ Done (ADR-0012) ([spec](specs/auth/)).
- **Maintainability track** (🚧 partly done): vitest with tests tied to the `VAL-*` rules and a regression test per fixed bug (#183, ADR-0014), and a **component tier** in jsdom for the guarantees that are not functions (#198, ADR-0015). Still open: a query-layer tier against a disposable Postgres, CI (lint + typecheck + build + tests), and Dependabot.

## How this stays honest

When a phase ships, its row is updated here, its spec is marked accordingly, and the "out of scope / future" notes in the specs and the architecture doc's non-goals should agree with this file.
