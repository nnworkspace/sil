# Figures — Data Model Specification

- **Spec ID:** `SPEC-FIGURES-DATA`
- **Part of set:** `SPEC-SET-FIGURES` v0.1.0
- **Traceability:** `SPEC-FIGURES-FUNC` (rules in §4); [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md), [`SPEC-WEAR-DATA`](../wear-tracking/30-data-model-spec.md); issue #181

## 1. Purpose and scope

Figures **adds no table, no column and no migration**. Every number is derived from the existing catalogue. This document is therefore not a storage contract but a **metric contract**: for each figure, what it counts, what it excludes, and what it yields when the data is absent.

That precision is the point. A metric with a vague definition is one that quietly changes meaning between the dashboard, a test and a conversation — and this feature exists to be trusted.

## 2. Base sets

Every metric is computed over one of these, and names which:

| Set | Definition |
|:--|:--|
| **Active** | `archived_at IS NULL` — the default for every figure (`VAL-FIG-01`) |
| **All** | active plus archived, only when the sidebar scope says so |
| **Priced** | Active ∩ `price_paid_cents IS NOT NULL` |
| **Dated** | Active ∩ `purchased_at IS NOT NULL` |
| **Worn** | Active ∩ wear total > 0 (§3.1) |

Each module reports the size of the set it used whenever that set is smaller than Active (`VAL-FIG-03`).

## 3. Derived metrics

### 3.1 Wear total

```
wearTotal(piece) = piece.prior_wears + count(piece.wear_events)
```

Both sources always, never one alone (`VAL-FIG-10`). `prior_wears` is the owner's recalled count from before tracking began (#69); `wear_events` are logged wears. An unrecorded prior count contributes nothing to the arithmetic.

**Never worn and never recorded are different facts, and the schema now carries the difference** (#191):

```
wearRecorded(piece) = piece.prior_wears IS NOT NULL OR piece has wear_events
```

| State | Meaning |
|:--|:--|
| `prior_wears IS NULL`, no events | **Not recorded** — nobody has said. A gap to fill. |
| `prior_wears = 0`, no events | **Never worn** — recorded, and a genuine finding. |
| otherwise | Worn, `wearTotal` times |

Both of the first two give `wearTotal = 0`, which is precisely why no wear figure may read a zero as a measurement without asking `wearRecorded` first.

### 3.2 Cost per wear

```
costPerWear(piece) = price_paid_cents / wearTotal(piece)     when price is known and wearTotal > 0
                   = undefined                                otherwise
```

**Undefined stays undefined** (`VAL-FIG-07`). It is not `€0`, not infinity, and — unlike the browse sort, which divides by `max(1, wears)` so that an unworn piece still orders sensibly — Figures does **not** substitute 1. A leaderboard that ranked a €400 unworn coat as "€400 per wear" would be asserting something the data does not say. Excluded pieces are counted and reported.

### 3.3 Total value

```
totalValue = Σ price_paid_cents over Priced
```

Reported with the count of pieces excluded for having no price. Currency is `EUR` (`VAL-FIG-08`).

### 3.4 Category counts

```
countIn(slug)      = |{ p ∈ base : categoryMatcher(slug)(p) }|
countAcross(slugs) = |{ p ∈ base : any matcher matches }|      -- each piece once
```

Delegated entirely to `categoryMatcher` / `countAcrossCategories` (`VAL-FIG-02`, #180). Consequences that must be surfaced wherever the numbers appear:

- Sub-category counts **roll up** into the parent: `dresses` includes `shirt-dresses` and `slip-dresses`.
- A piece filed in two families is counted **once** across them (culottes are trousers *and* skirts).
- Therefore **category counts do not sum to the wardrobe size** — a multi-category piece appears under each of its categories (`VAL-FIG-05`).

The complementary count (`VAL-FIG-11`) files each piece **once**, under the top-level ancestor of its **primary** category only:

```
primaryRoot(piece) = the top-level ancestor of piece.category
countPrimary(root) = |{ p ∈ base : primaryRoot(p) = root }|
```

Secondary categories are ignored here by design, and these rows **do** sum to the size of the base. The two counts answer different questions and are shown side by side, each labelled.

### 3.5 Acquisition by year

```
year(piece)  = extract(year from purchased_at)
piecesIn(y)  = |{ p ∈ Dated : year(p) = y }|
spendIn(y)   = Σ price_paid_cents over { p ∈ Dated ∩ Priced : year(p) = y }
```

Years with no acquisitions are rendered as gaps in the axis, not omitted, so the shape of the timeline is truthful.

### 3.6 Material families

Parsed best-effort from the free-text `material` by keyword: wool (incl. cashmere, merino, alpaca), cotton, linen, silk, viscose/lyocell, synthetic (polyester, polyamide, elastane), leather, other. A blend counts in **every** family it names, so family counts **do not sum** to the wardrobe (`VAL-FIG-05`). Pieces with no material are counted as unparsed and reported, never as "other".

### 3.7 Colour families

Reuses `colorKeywords` from [`src/lib/colors.ts`](../../src/lib/colors.ts) (#105) — the same keyword matching the browse colour filter uses, so a family on Figures and the same family in browse always agree. A colour matching no family is counted as unclassified.

## 4. Data-quality counters (the Gaps module)

Each is a count over Active, with a link to the matching filtered view:

| Gap | Definition |
|:--|:--|
| No wear data | `prior_wears IS NULL` and no `wear_events` — a recorded zero is **not** a gap (#191) |
| No price | `price_paid_cents IS NULL` |
| No purchase date | `purchased_at IS NULL` |
| No material | `material IS NULL` or blank |
| No berth | `storage_location IS NULL` or blank |
| No photo | no rows in `item_photos` |

These are **counters, not assertions**: a non-zero value is a task, never a failure. They are computed in the app, not the test suite ([`SPEC-FIGURES-FUNC`](10-functional-spec.md) §5).

## 5. Performance

The catalogue is in the low hundreds of pieces, so every figure is computed by reading the active rows once per request and aggregating in memory — the same approach the category counts already take. This keeps the metric definitions in TypeScript where they can be unit-tested, rather than split across hand-written SQL. Should the wardrobe reach a size where that matters, the aggregation moves into SQL behind the same helper signatures, and the tests stay valid.

## 6. Change history

v0.1.0 — first draft (#181). No schema change: Figures reads `items`, `item_photos` and `wear_events` as they stand.
