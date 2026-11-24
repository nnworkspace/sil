# Figures: Specification Set

> **Set ID:** `SPEC-SET-FIGURES` · **Version:** `0.1.0` · **Status:** DRAFT · **Owner:** nnworkspace

A root-level tab that shows the wardrobe as **figures**: what it is made of, what it cost and when it arrived, and what actually gets worn. The name is literal in both senses (a *figure* is a body and its silhouette, *figures* are numbers), which is why it sits beside *Berths* in the nav rather than a generic "Stats".

## 1. Purpose

The catalogue answers questions about **one piece** well and questions about **the whole** not at all. With over a hundred pieces, the interesting questions have become aggregate ones: how much of this is black, how much did 2026 cost, which pieces have earned their keep, how much winter clothing is there really. Every one of those is answerable from data already recorded; the feature adds no table and no column. It is a read surface, and its value is entirely in choosing *which* numbers deserve a screen.

It also has a second, quieter purpose the owner named: seeing the acquisition curve and the total spend in one place is a more persuasive argument than a resolution.

## 2. The constraint that shapes it

Field coverage across the active catalogue is **uneven, and that is a design input, not a footnote**:

| Field | Coverage |
|:--|--:|
| Category, colour, tags | 100% |
| Price | ~95% |
| Purchase date | ~93% |
| Material | ~91% |
| **Wear data** | **~32%** |
| Berth | <1% |

A dashboard led by wear analytics would therefore be mostly empty and quietly misleading. Three consequences follow, and they are the spine of this spec:

1. **Dense modules lead.** Composition, spending and fabric come first because they rest on complete data.
2. **Every partial-data metric states its base** (`VAL-FIG-03`). No figure averaged over a third of the wardrobe may be presented as describing the wardrobe.
3. **The gaps are a feature.** A *Gaps* module lists what is missing and links to the pieces, so the dashboard improves itself with use instead of pretending to be complete.

## 3. Scope

| In scope | Out of scope |
|:--|:--|
| A `/figures` route with a **sidebar** carrying section navigation and the global filters | Any new table, column or migration; every number is derived |
| **Overview** tiles, **Collection** composition, **Spending & acquisition** (phase 1) | Charting libraries; inline SVG/CSS only (ADR-0007 restraint) |
| **Wear & value** and **Gaps** (phase 2) | Predictions, recommendations or "you should buy/sell this" |
| **Colour & fabric**, **Care & season** (phase 3) | Editing data from the dashboard; Gaps links to the existing edit forms |
| Counting through the shared category rule (`categoryMatcher`, #180) | Exports (CSV/PDF), a later idea if it earns its place |
| Money shown in full, at the owner's request | Multi-currency conversion; totals are `EUR`, the catalogue's default |
| A **query-layer test tier** landing with this feature (#183 L2) | Real-catalogue data-quality checks as *tests*; those are an audit script |

## 4. Traceability

| Anchor | Reference |
|:--|:--|
| Stack | [ADR-0001](../../_governance-local/decisions/ADR-0001-tech-stack.md) |
| Data layer | [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md) |
| Design system (restraint, type, sharp edges) | [ADR-0007](../../_governance-local/decisions/ADR-0007-design-system.md) |
| The item model it reads | [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md) |
| Wear events behind every wear metric | [`SPEC-WEAR-DATA`](../wear-tracking/30-data-model-spec.md) |
| "Active wardrobe" = not archived | [`SPEC-ARCHIVE-FUNC`](../archive/10-functional-spec.md) |
| Category membership rule | [`src/lib/categories.ts`](../../src/lib/categories.ts) (`categoryMatcher`, #180) |
| Issue | #181 |

## 5. Reading guide

| File | Read it for |
|:--|:--|
| [`10-functional-spec.md`](10-functional-spec.md) | The modules, what each one asserts, and the `VAL-FIG-*` rules, including the honest-denominator rule |
| [`20-interface-spec.md`](20-interface-spec.md) | The route, the sidebar, the filter contract, and how each module renders |
| [`30-data-model-spec.md`](30-data-model-spec.md) | Every derived metric defined precisely: what it counts, what it excludes, and what it returns when the data isn't there |

## 6. Phasing

- **Phase 1**: sidebar shell, Overview, Collection, Spending & acquisition. All from dense data; useful the day it ships.
- **Phase 2**: Wear & value, Gaps. They reinforce each other: the gap list is what makes the wear module worth reading.
- **Phase 3**: Colour & fabric, Care & season, and any insight cards that earn their place.
