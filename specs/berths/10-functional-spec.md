# Berths — Functional Specification

- **Spec ID:** `SPEC-BERTHS-FUNC`
- **Part of set:** `SPEC-SET-BERTHS` v0.2.0
- **Traceability:** [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md) (`VAL-ITEM-12`), [`specs/compendium/`](../compendium/); issues #172, #175, #219, #227

## 1. Purpose and scope

Defines what the Berths tab does and the rules it obeys. Routes and rendering are in [20-interface-spec.md](20-interface-spec.md). The berth **field** is specified with the item; the berth **notation** is documented in the Compendium.

Berths are **read-only here**. A berth is set by editing the piece; this feature only reads.

## 2. Operations

### 2.1 The index — `OP-BERTH-INDEX`

- **Question:** what berths exist, and what is in each?
- **Shows:** every distinct berth across the active wardrobe, each with the number of pieces and a short summary of what it holds, ordered by the notation.
- Each berth links to its own contents.

### 2.2 One berth — `OP-BERTH-VIEW`

- **Question:** what is on that shelf?
- **Shows:** the active pieces whose berth matches exactly, alphabetically, as ordinary item cards.
- An empty berth is reachable only by a stale link, and says plainly that nothing is kept there.

### 2.3 Finding a piece by where it lives — `OP-BERTH-SEARCH`

Handled by keyword search (`VAL-BROWSE-04`): typing a code, or part of one, reaches the berth field. Typing `S4` finds everything on any shelf 4, because the search matches at word starts and a hyphen is a word boundary.

## 3. Rules

| ID | Rule |
|:--|:--|
| `VAL-BERTH-01` | **A berth is free text and is never validated.** Deliberately: a place can be described before it is codified, and a code the app does not recognise is still where the piece is. `VAL-ITEM-12` caps it at 31 characters and does nothing else. |
| `VAL-BERTH-02` | **The index counts the active wardrobe only** — `archived_at IS NULL`, through the shared query helpers. A sold piece does not still occupy a shelf. |
| `VAL-BERTH-03` | **Nothing about a berth's contents is stored.** The count, the summary and the ordering are computed on every render. A stored summary is wrong the moment a piece moves, and nobody would notice; a derived one cannot go stale. |
| `VAL-BERTH-04` | **The summary names categories, commonest first, at most two, then `+n`.** Factual and obviously derived. No "mostly", which is a judgement that misleads on an even split. |
| `VAL-BERTH-05` | **The summary reads primary categories only.** A piece also carries secondaries — a shirt is filed under `tops` as well — so counting both would make almost every berth read "tops, shirts"; the parent adds nothing once the child is named. |
| `VAL-BERTH-06` | **Ties in the summary break alphabetically.** An even split has no commonest category, and without a tie-break the order would follow insertion, so the line would change between renders for no visible reason. |
| `VAL-BERTH-07` | **A berth with nothing to summarise renders no summary line** — not an empty one, and not a bare `+0`. |
| `VAL-BERTH-12` | **A box sorts after the loose contents of the same place** (#277). Walking a drawer, you meet what is lying in it before what is boxed in it. A bare place still leads any part of it, so `D1` precedes `D1-L`, which precedes `D1-L-BB`. |
| `VAL-BERTH-08` | **The index is ordered by the notation**, outermost segment first: room, then unit, then place, then position, then container — so the list reads as a walk through the room rather than a leaderboard. Within the unit, **wardrobes sort before cabinets** (#251), then by number; comparing the kind first is what keeps the order total once a room holds both, since a wardrobe 1 and a cabinet 1 share no numbering. An undivided unit sorts as rack 0, so `C1` leads `C1R1` rather than landing unpredictably. |
| `VAL-BERTH-09` | **Ordering compares numbers as numbers.** Every wardrobe, rack and shelf number in the catalogue is a single digit today, so a plain string sort gives the right answer by luck and would put shelf 10 before shelf 2 the first time one exists — silently, since nothing would fail. |
| `VAL-BERTH-10` | **A code that does not parse sorts last and is never dropped.** The catalogue is authoritative: an unrecognised code means the notation needs extending, not that the berth is invalid. Consistent with `VAL-COMP-12`. |
| `VAL-BERTH-11` | **A category slug no longer in the vocabulary passes through as itself** rather than being dropped, so a retired slug on an old row cannot make a berth look emptier than it is. |

## 4. What the rules are defending

Three of these exist because of a specific near-miss, and are worth keeping for that reason:

- **`VAL-BERTH-09`** — the lexical sort was correct on the day it was written and would have stayed correct until the first shelf 10, at which point the list would simply have been wrong.
- **`VAL-BERTH-05`** — summarising over secondaries as well was the obvious "consistency fix", and it would have made every berth read the same.
- **`VAL-BERTH-10`** — `R1-W2R3-D1-LF` was filed after the grammar had been recorded, and the grammar rejected it. The code was right and the grammar was incomplete.
- **The same thing happened again with the unit** (#251). `R0-C1-D4`, a cabinet drawer, could not be written, because the unit segment demanded a wardrobe *and* a rack. The unit now reads `(W|C)<n>` with an **optional** `R<n>`, which is *simpler* than what it replaced: the first attempt made cabinets a rack-less special case, until it became clear that a cabinet can have several banks of drawers **and** a wardrobe can have only one rack. The subdivision belongs to the individual piece of furniture, not to its kind. Twice now the grammar has been the thing that was wrong, which is the pattern `VAL-COMP-12` predicts: the notation describes real rooms, and real rooms keep having furniture the notation has not met.

## 5. Coverage, measured

At the time of writing: **14 distinct berths holding 82 of 120 active pieces (68%)**, after a session of filing that took dresses from 15 unberthed to 2. The remainder are mostly tops, underwear and shirts, which have not been walked through yet. An unberthed piece is a gap the Figures dashboard reports, not an error.

## 6. Testing surface

| Tier | What it covers |
|:--|:--|
| **L1 (unit)** | The summariser: commonest first, cap plus overflow, deterministic ties, empty input, unknown slug. The comparator: numeric not lexical, segment precedence, unpositioned before positioned, unparsed last, total order. |

## 7. Change history

| Version | Change |
|:--|:--|
| 0.1.0 | Written after the fact (#172, #175, #219, #227), during a documentation sweep on 2026-07-30. |
