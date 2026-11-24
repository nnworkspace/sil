# Browse, Filter & Search: Functional Specification

- **Spec ID:** `SPEC-BROWSE-FUNC`
- **Part of set:** `SPEC-SET-BROWSE` v0.5.0
- **Traceability:** [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md), [ADR-0006](../../_governance-local/decisions/ADR-0006-validation-library.md); consumes [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md), the `items` fields it reads (`tags`, `name`, `brand`, `material`, `color`, `category`, `created_at`) and `item_photos`, plus the catalog item-card; issues #38, #105, #109

## 1. Purpose and scope

Defines the browse view's behaviour: which items it lists, how the tag filters and the keyword search narrow that list, how they combine, and the rules the query obeys. It reads the existing item model; it never writes.

## 2. Operations

### 2.1 Browse the wardrobe: `OP-BROWSE`

- **Purpose:** show every item, across all categories, in the store-style grid.
- **Trigger:** the owner opens `/browse` (a nav entry).
- **Behaviour:** with no filters and no query, all items are listed in the catalog's default order (newest first). The filter bar exposes the tag groups and a search box.
- **Outcome:** a grid of item cards, each linking to its detail page (the same card used by the category grid).

### 2.2 Filter by tags: `OP-FILTER-TAGS`

- **Purpose:** narrow the list to items carrying the selected tags.
- **Trigger:** the owner picks tags from the per-facet dropdowns, grouped by kind: **occasion / feel / season / care** plus the style facets **neck / sleeve / silhouette / fit / length** (all from `TAG_GROUPS`, #106).
- **Behaviour:** selecting tags updates the result immediately (via the URL, §see interface). Semantics: **OR within a group, AND across groups** (`VAL-BROWSE-03`).
- **Outcome:** only items matching the tag selection remain.

### 2.3a Filter by colour: `OP-FILTER-COLOUR` (#105)
- **Behaviour:** the `color` field is free text, so the filter offers ~12 base **colour families**; selecting families keeps items whose `color` contains any keyword of a selected family (OR across families), combined (AND) with the other filters (`VAL-BROWSE-10`).
- **Material** (#263): `material` is free text as well, so the filter offers the Compendium's **fibre** entries. Selecting fibres keeps items whose `material` contains any spelling of a selected fibre, word-bounded (OR across fibres), AND-combined with everything else. Constructions and finishes are not offered: a composition label lists fibres.
- **A colour may declare its family (#211).** Retailers name colours poetically, and a name can contain another colour's word: COS's *blueberry milk* is a pale **pink**, and *primrose yellow* contains "rose". Such a colour is listed in an override, keyed by the whole colour string, and its declared families are used instead of the guess (`VAL-BROWSE-16`). Everything else still matches by substring, which is right for the ordinary cases.
- **Multi-family is normal, not a fault.** Of the 45 distinct colours in this catalogue, 10 match more than one family and **8 of them correctly**: *navy / white* genuinely is both. The override exists for the two that were wrong, not to force colours into a single family.

### 2.3c Filter to favourites: `OP-FILTER-FAVOURITE` (#135)

- **Purpose:** narrow the list to the pieces the owner has marked as favourites.
- **Trigger:** the **Favourites** entry in the navigation (which deep-links to browse with the filter on), or the heart toggle in the filter panel.
- **Behaviour:** keeps only items whose `favorite` is true, combined (AND) with every other filter and the query (`VAL-BROWSE-13`), so *favourites + summer* is a valid narrowing. It is a plain on/off toggle, counted in the panel's "n active" badge and reset by **Clear all**.
- **Outcome:** only favourited items remain; un-favouriting a piece drops it from the list on the next revalidation.

> Deliberately a **facet on browse** rather than a separate page, so favourites reuse the same grid, facets, sort, URL state and empty state.

### 2.3b Sort the results: `OP-SORT` (#109)
- **Behaviour:** a single sort option orders the (filtered) grid: newest added (default), purchase date (new/old), price paid (high/low), times worn, cost-per-wear, last worn, or name. Sorting is applied after filtering; `null` values (no price/date, never worn) sort **last** (`VAL-BROWSE-12`). Available on browse and category pages.

### 2.3 Search by keyword: `OP-SEARCH`

- **Purpose:** narrow the list to items whose text matches a typed query.
- **Trigger:** the owner types in the search box.
- **Behaviour:** a case-insensitive match against **name, brand, material, colour, berth and tags** (`VAL-BROWSE-04`). Matching tags here means a typed word like "summer" finds summer-tagged pieces without touching the chips: the box and the chips both reach the tags. Keyword only: no ranking, no stemming, no AI.

#### 2.4a Why the query must match a word *start* (#222)

The search was originally a substring match anywhere in the text, and it failed in both directions at once. The owner searched **red** in *tops* and a burgundy piece did not appear.

- **Too much.** "red" is inside the tag `collared`, which is on most shirts, and inside names like *Tapered* and *Structured*. It returned **35 pieces, 3 of them red**. That noise is what hid the answer.
- **Too little.** *burgundy*, *maroon* and *wine* contain no "red", so they were never candidates, although the colour **filter** had known they were Red since #105. The search box simply never asked it.

So: match at a **word start**, not anywhere (`VAL-BROWSE-04`); prefix rather than whole word, because whole-word matching breaks "trouser" → *Trousers*. Measured, "red" went 35 → 3.

That strict rule loses exactly one kind of match, a **compound tail**: *Boatneck*, *Crewneck*, *camelwool*, 9 pieces here. Hence `VAL-BROWSE-14`: a query of four characters or more may also match inside a word. Short queries are the fragment-prone ones, so the threshold buys back all 9 without readmitting any of the 96.

Finally `VAL-BROWSE-15` closes the second gap. Search and filter now agree exactly: **red 7 and 7, blue 78 and 78**.
- **Outcome:** only items whose name, brand, material, or a tag contains the query remain; combined with any active tag filters (`VAL-BROWSE-05`).

## 3. Filter & search semantics

The selection is a set of tags per group plus an optional query string. An item is shown when it satisfies **all** active constraints:

- For each tag group with a selection, the item's tags must include **at least one** of that group's selected tags (OR within the group).
- Across groups, **every** group with a selection must be satisfied (AND across groups).
- If a query is present, the item's name **or** brand **or** material **or** one of its tags must contain it (case-insensitive substring).

A group with no selection imposes no constraint; an empty query imposes no constraint. No filters and no query ⇒ all items.

## 4. Business validation rules

| Rule ID | Validation |
|:--|:--|
| `VAL-BROWSE-01` | Browse lists **all** items across categories in the catalog's default order; no filter/query ⇒ the full wardrobe. |
| `VAL-BROWSE-02` | Only tags from the defined vocabulary (`ALL_TAGS` / `TAG_GROUPS`) are honoured; unknown or malformed tag params are **ignored**, never an error. |
| `VAL-BROWSE-03` | Tag semantics: **OR within a group, AND across groups.** |
| `VAL-BROWSE-04` | Keyword search matches **name / brand / material / colour / berth (`storage_location`, #172) / tags**, case-insensitive, trimmed; an empty/whitespace query is no constraint. Tags are matched as text, so a typed tag word (e.g. "summer") finds tagged items without using the chips; typing a berth (e.g. "attic") surfaces everything stored there. **The query must match at the start of a word** (#222); see §2.4a. |
| `VAL-BROWSE-14` | A query of **4 characters or more** may additionally match *inside* a word; a shorter one may not (#222). |
| `VAL-BROWSE-15` | A query naming a **colour family** (its key or its label) also matches the colours in that family, so "red" finds burgundy (#222). Naming a member colour does **not** expand: "burgundy" stays burgundy. |
| `VAL-BROWSE-05` | Tag filters and search **combine (AND)**: the result satisfies both. |
| `VAL-BROWSE-06` | State is carried in **URL query params**; a shared/bookmarked URL reproduces the same result; unknown params are ignored gracefully (`VAL-BROWSE-02`). |
| `VAL-BROWSE-07` | When nothing matches, a clear **empty state** is shown with a **clear-all** affordance; the filter bar stays usable. |
| `VAL-BROWSE-08` | Filtering and search run **server-side** (Server Components + Drizzle); no client-side data fetching. The read path ships minimal JS. |
| `VAL-BROWSE-09` | Read-only: browse **never mutates** items; it only selects. |
| `VAL-BROWSE-10` | Colour filter (#105) uses base **families** over the free-text `color`: a piece matches a family when `color` contains any of the family's keywords (case-insensitive substring); families OR together, then AND with the other filters. Unknown family keys are ignored. |
| `VAL-BROWSE-16` | A colour listed in the **override map** takes its declared families and the substring guess is not consulted for it (#211). The override is keyed by the whole colour string, so it states a fact about one colour name rather than adding another guessing rule. An override that agrees with the guess is redundant and must be deleted; a test enforces this, so the map cannot silently become a list of no-ops. |
| `VAL-BROWSE-18` | **The material vocabulary is the Compendium's, not a copy of it.** `MATERIAL_FACETS` is derived from `COMPENDIUM_ENTRIES` at module load, so a fibre added, renamed or given a new spelling in the glossary reaches the filter with no second edit (#263). This is `VAL-BROWSE-17` applied to fibres. |
| `VAL-BROWSE-17` | **One rule, one place.** Whether a colour is in a family is decided by `colorFamiliesOf` and nowhere else. The browse filter, the Figures colour module and the trip picker all go through it; the SQL filter, which cannot call it per row, is handed the same rule as keywords-plus-exceptions. Before #211 the rule was re-implemented four times over, which is why an override could not simply be added in one of them. |
| `VAL-BROWSE-11` | The same filter/search panel is available on **category pages**, AND-combined with the category roll-up; it never widens beyond the category. A category's sub-category selection (`?sub=`) is independent of and preserved by the filters. |
| `VAL-BROWSE-13` | The **favourites** toggle (#135) is a plain on/off facet, AND-combined with every other filter and the query, counted in the panel's active badge and cleared by **Clear all**. |
| `VAL-BROWSE-12` | Sort (#109) is a single option carried in `?sort=` (unknown ⇒ default newest); it orders the filtered result, with `null` keys (no price/date, never worn) always **last**. Wear-derived keys combine `prior_wears` + `wear_events`. |

## 5. Error handling & performance

- Bad input degrades gracefully: unknown tags/params are dropped, a too-long query is truncated to a sane bound; the view always renders (`VAL-BROWSE-02`, `-06`).
- Single indexed query per view; tag membership uses the array column's overlap operator, text uses `ILIKE` (see interface spec). Fine for a personal wardrobe's scale.

## 6. Out of scope / future

- Search over **description / notes**, and **semantic / natural-language search**: a future **AI phase** (embeddings + pgvector, reusing ADR-0008's Gemini stack). Keyword search here is the non-AI baseline.
- Filtering by price or date **ranges**; saved searches. (Colour, style, category-scoped filters, sort and the favourites toggle all landed in #105/#106/#109/#135.)
