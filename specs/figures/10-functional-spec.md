# Figures: Functional Specification

- **Spec ID:** `SPEC-FIGURES-FUNC`
- **Part of set:** `SPEC-SET-FIGURES` v0.1.0
- **Traceability:** [ADR-0001](../../_governance-local/decisions/ADR-0001-tech-stack.md), [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md), [ADR-0007](../../_governance-local/decisions/ADR-0007-design-system.md); issue #181

## 1. Purpose and scope

Defines what the Figures tab shows, what each module asserts, and the rules every number obeys. Metric definitions are in [30-data-model-spec.md](30-data-model-spec.md); the route, sidebar and rendering are in [20-interface-spec.md](20-interface-spec.md).

Figures is **read-only**. It creates, edits and deletes nothing; the only actions it offers are links into existing views.

## 2. Modules

Each module answers one question. A module that cannot answer its question from the current data **says so** rather than rendering an empty chart (`VAL-FIG-04`).

### 2.1 Overview: `OP-FIG-OVERVIEW`

- **Question:** what is the wardrobe, in one glance?
- **Shows:** stat tiles (active pieces, total value, categories in use, average price, pieces added this year, favourites), plus one plain-language summary line.
- **Phase:** 1.

### 2.2 Collection: `OP-FIG-COLLECTION`

- **Question:** what is it made of?
- **Shows two views**, because the question has two honest answers (`VAL-FIG-11`):
  - **"What it is made of"**: every piece counted **once**, under the top-level category its *primary* category belongs to. These rows **sum to the wardrobe size**, so proportions are meaningful.
  - **"How much counts as each"**: the **rolled-up, deduplicated** breakdown (`VAL-FIG-02`). A parent includes its descendants and a cross-filed piece counts under each of its categories. These rows deliberately **do not sum**.
- Both are labelled with which they are; each row links to its category page.
- **Why both.** "How much knitwear do I have?" must include a piece filed primarily under tops; that is the roll-up. "What is my wardrobe made of?" must count each piece once, or the proportions mean nothing. A single view would answer one question and quietly mislead on the other. (The roll-up also guards a real error: counting only primary categories reports 17 dresses where the wardrobe holds 24; summing sibling families reports 33 bottoms where it holds 30.)
- **Phase:** 1.

### 2.3 Spending & acquisition: `OP-FIG-SPEND`

- **Question:** what did it cost, and when did it arrive?
- **Shows:** pieces acquired per year, with spend as a second series; spend by brand, with pieces alongside so price-per-piece is legible.
- **Excludes:** pieces with no price from spend, and pieces with no purchase date from the timeline, stating both counts (`VAL-FIG-03`).
- **Phase:** 1.

### 2.4 Wear & value: `OP-FIG-WEAR`

- **Question:** what actually gets worn, and what earned its keep?
- **Shows:** most-worn pieces; best and worst **cost-per-wear** leaderboards; the count of pieces **recorded as never worn**, which is a finding, and distinct from the count whose history was never recorded (#191). The latter belongs to Gaps.
- **Scope statement is mandatory.** The module is computed over pieces with wear data, and says how many that is (`VAL-FIG-03`).
- **Phase:** 2.

### 2.5 Gaps: `OP-FIG-GAPS`

- **Question:** what is missing, and where do I fix it?
- **Shows:** a list of data gaps (pieces with no wear count, no price, no purchase date, no material, no berth), each with a count and a link to those pieces.
- **Not a chart.** It is a to-do list; its value is that acting on it improves every other module.
- **Phase:** 2.

### 2.6 Colour & fabric: `OP-FIG-TEXTURE`

- **Question:** what is the palette, and what is it made of?
- **Shows:** colour distribution by family (`specs/browse/`, #105), rendered as swatches sized by count; material families derived from the free-text `material` (wool / cotton / linen / silk / cashmere / synthetic / other).
- **Material parsing is best-effort and reported as such.** A piece may count in several families (a wool-silk blend), so family counts do not sum to the wardrobe (`VAL-FIG-05`).
- **Phase:** 3.

### 2.7 Care & season: `OP-FIG-CARE`

- **Question:** how demanding is this wardrobe, and what is it ready for?
- **Shows:** care split (easy-care / hand-wash / dry-clean / delicate) and season coverage, both from tags.
- **Phase:** 3.

## 3. Global filters

The sidebar carries filters that apply to **every** module, so no module carries its own (`VAL-FIG-06`):

| Filter | Values | Default |
|:--|:--|:--|
| Scope | Active wardrobe · Including archived | Active |
| Period | All time · a single purchase year | All time |

Period filters by **purchase date**, so it slices acquisition, not the collection: a piece bought in 2019 is not "in" 2026 however often it is worn. Pieces with no purchase date drop out of a period-filtered view and are counted as excluded (`VAL-FIG-03`).

## 4. Business rules

| Rule ID | Rule |
|:--|:--|
| `VAL-FIG-01` | **Active by default.** Every figure counts only pieces with no `archived_at`, unless the scope filter explicitly includes archived ones. Archived pieces are never silently mixed in. |
| `VAL-FIG-02` | **One category rule.** Category membership is decided solely by `categoryMatcher` ([`src/lib/categories.ts`](../../src/lib/categories.ts)): a piece is in a category when the slug **or any descendant** is its primary `category` **or** one of its `secondary_categories`. Counts across several families count a piece **once** (#180). No module re-derives this. |
| `VAL-FIG-03` | **Honest denominators.** Any metric computed over a subset states the size of that subset next to it ("across the 38 pieces with wear data"). A figure derived from partial data is never presented as describing the whole wardrobe. |
| `VAL-FIG-04` | **Empty is stated, not drawn.** A module with no data to show renders a short sentence saying so, never an axis with nothing on it, and never a zero presented as a measurement. |
| `VAL-FIG-05` | **Overlapping dimensions are labelled.** Where a piece can fall into several buckets (material families, tag groups, multi-category pieces), the module says the parts do not sum to the total. |
| `VAL-FIG-06` | **Filters live in one place.** The sidebar's scope and period apply to every module; a module never carries a private filter that could contradict the sidebar. |
| `VAL-FIG-07` | **Undefined stays undefined.** Cost-per-wear for a piece with no price, or no wears, is **not** rendered as `€0`, `∞` or a division by one; it is excluded and counted among the excluded. |
| `VAL-FIG-08` | **Money is `EUR` and shown in full.** Totals sum `price_paid_cents`; pieces priced in another currency (none today) would be excluded and counted, never converted silently. |
| `VAL-FIG-09` | **Read-only.** No module mutates data. Links lead to existing views (category pages, browse with a filter, an item page); nothing is edited in place. |
| `VAL-FIG-11` | **The Collection module shows both counting views**, each labelled: a *primary* view where every piece is counted once and the rows sum to the wardrobe size, and the *roll-up* view where a piece counts under each category it is filed in and the rows do not sum. Neither is presented without saying which it is. |
| `VAL-FIG-10` | **Wear total = recalled + logged.** A piece's wears are `prior_wears` plus its `wear_events`; neither source is used alone (#69, [`SPEC-WEAR-DATA`](../wear-tracking/30-data-model-spec.md)). |
| `VAL-FIG-12` | **A zero is only a measurement when it was recorded** (#191). `prior_wears IS NULL` with no events means *not recorded* and belongs to Gaps; `prior_wears = 0` means *never worn* and is a finding. No module may present the first as the second. |

## 5. Non-goals

- **Advice.** Figures reports; it does not recommend buying, selling or archiving. The judgement stays the owner's.
- **Trend prediction.** No forecasting of spend or wear.
- **Vanity metrics.** A number earns its tile by changing a decision. "Total photos" does not.
- **Real-catalogue data-quality assertions as tests.** Those belong in an audit script whose output feeds §2.5 (Gaps).
