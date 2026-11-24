# Trips & Packing: Functional Specification

- **Spec ID:** `SPEC-TRIPS-FUNC`
- **Part of set:** `SPEC-SET-TRIPS` v0.4.0
- **Traceability:** [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md), [ADR-0006](../../_governance-local/decisions/ADR-0006-validation-library.md); draws on [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md); issue #74

## 1. Purpose and scope

Defines what a trip is, the operations that create/change trips and their packing lists, the progress derived from them, and the rules they obey. A **trip** has a `name`, a `type` (**business** or **vacation**), an optional `destination`, optional `start_date` / `end_date`, and optional `notes`. Its **packing list** is a set of wardrobe **items**, each flagged **packed** or not (`trip_items`). Since #270 a trip may also be planned **by day** (what to wear on the 3rd, the 4th) alongside the per-category plan; the two are views of the same pieces, not rival lists. V1 is manual: the owner chooses the pieces, and nothing is auto-suggested.

## 2. Operations

### 2.1 Create a trip: `OP-TRIP-CREATE`

- **Purpose:** start planning a trip.
- **Trigger:** the owner submits the **new-trip** form (from `/trips`).
- **Behaviour:** validates the fields (`VAL-TRIP-*`) and inserts a `trip`. The packing list starts empty.
- **Outcome:** the owner lands on the new trip's detail page, ready to add pieces.

### 2.2 Edit a trip: `OP-TRIP-EDIT`

- **Purpose:** correct or refine trip details (dates firmed up, destination added).
- **Trigger:** the owner submits the **edit-trip** form (`/trips/[id]/edit`).
- **Behaviour:** validates and updates the `trip`. The packing list is unaffected.
- **Outcome:** the trip reflects the edits.

### 2.3 Delete a trip: `OP-TRIP-DELETE`

- **Purpose:** remove a trip that's over or abandoned.
- **Trigger:** the owner confirms delete on the trip.
- **Behaviour:** deletes the `trip`; its `trip_items` **cascade-delete** (the wardrobe items themselves are untouched: a trip references items, it does not own them).
- **Outcome:** the trip is gone; the owner returns to `/trips`.

### 2.4 Add pieces to a trip: `OP-TRIP-ADD-ITEMS`

- **Purpose:** put wardrobe pieces onto a trip's packing list.
- **Trigger (two paths, both required):**
  - the **wardrobe picker** on the trip page ("Add from wardrobe"), where the owner selects one or more pieces at once; and
  - the **"Add to trip"** action on an item's own detail page, choosing which trip.
- **Behaviour:** inserts a `trip_item` per (trip, item), defaulting `packed = false`. Adding a piece already on the trip is a **no-op** (idempotent, `VAL-TRIP-05`), never a duplicate row.
- **Outcome:** the pieces appear in the packing list, unpacked.

### 2.5 Remove a piece from a trip: `OP-TRIP-REMOVE-ITEM`

- **Purpose:** drop a piece from the packing list.
- **Trigger:** the owner removes a row from the packing list.
- **Behaviour:** deletes that `trip_item`.
- **Outcome:** the piece leaves the list; progress recomputes. The wardrobe item is untouched.

### 2.6 Toggle packed: `OP-TRIP-SET-PACKED`

- **Purpose:** mark a piece packed (or unpack it).
- **Trigger:** the owner toggles the **packed** checkbox on a packing-list row.
- **Behaviour:** sets that `trip_item.packed`.
- **Outcome:** the row updates and the progress count moves.

### 2.7 Plan the packing: `OP-TRIP-PLAN-*`

The **packing plan** (v1.1) is a soft, editable scaffold on the trip: per-category **slots** with a *suggested* target count, so packing becomes a finite checklist instead of an open-ended browse. It never auto-adds pieces; it only guides and scopes the picker (v1 stays manual). Plan shape and defaults: [`SPEC-TRIPS-DATA §2.1`](30-data-model-spec.md).

- **`OP-TRIP-PLAN-SUGGEST`**: generate a starter plan. **Trigger:** the owner asks to suggest slots (from the trip page); when the trip has no dates, they give a day count first. **Behaviour:** computes default slots from the trip's length + type over the wardrobe's used top-level categories (`VAL-TRIP-11`) and **replaces** the plan. **Outcome:** editable slot cards appear.
- **`OP-TRIP-PLAN-SET-TARGET`**: raise/lower a slot's target (the ± handle, or a typed number). **Behaviour:** sets `target` for that slot (0–99); it is a suggestion, not a limit (`VAL-TRIP-11`, `VAL-TRIP-12`). **Outcome:** the slot's target updates; "slot met" recomputes.
- **`OP-TRIP-PLAN-ADD-SLOT`**: add a slot for a category not yet in the plan (default target 1). Adding an already-present category is a no-op (`VAL-TRIP-10`).
- **`OP-TRIP-PLAN-REMOVE-SLOT`**: drop a slot entirely. Removing the last slot leaves `plan = []` (an emptied plan), distinct from "no plan yet".

Editing the plan **never** touches `trip_items`: pieces already added stay; a slot is guidance, not a container.

## 3. Derived stats (read-only)

Computed from a trip's `trip_items`, never stored:

| Stat | Definition |
|:--|:--|
| **packed progress** | `count(packed) / count(*)` for the trip, shown as "N of M packed" |
| **all packed** | true when M > 0 and N = M (the list is complete) |
| **piece count** | `count(trip_items)` for the trip (shown on the trips list) |
| **slot filled** | per plan slot: how many of the trip's pieces fall in that slot's category (rolled up over its sub-categories), shown on the slot as "filled / target" |
| **plan complete** | true when the plan has ≥ 1 slot and every slot is met (`filled ≥ target`) |

**Plan** progress (are enough pieces picked per category?) and **packed** progress (are the picked pieces in the bag?) are separate meters (planning vs. packing), shown distinctly.

The **destination forecast** shown on the trip page is not a stored stat: it is fetched at view time from the weather lib (Open-Meteo, keyless, see `SPEC-SET-WEATHER`) using the trip's `destination`, and is **display-only** in v1.

## 4. Business validation rules

| Rule ID | Validation |
|:--|:--|
| `VAL-TRIP-01` | `name` is **required**, trimmed, 1–120 chars. |
| `VAL-TRIP-02` | `type` is **required** and one of **`business`** / **`vacation`** (default `business`). |
| `VAL-TRIP-03` | `destination` is optional, trimmed, ≤ 120 chars. |
| `VAL-TRIP-04` | `start_date` / `end_date` are optional valid dates; if both are set, **`end_date` ≥ `start_date`**. |
| `VAL-TRIP-05` | A piece appears on a trip **at most once**: `(trip_id, item_id)` is unique, and re-adding is a no-op, not an error. |
| `VAL-TRIP-06` | A `trip_item` always references an **existing** trip and item; deleting the trip **or** the item cascades the link. |
| `VAL-TRIP-07` | `packed` defaults to **false**; it is a plain boolean toggle. |
| `VAL-TRIP-08` | `notes` is optional, ≤ 2000 chars (plain text in v1; Markdown parity with item notes is a later nicety). |
| `VAL-TRIP-09` | Every write is validated (Zod, ADR-0006) before it touches the database; invalid input is rejected with a field message, never silently dropped. |
| `VAL-TRIP-10` | `plan` is optional (`null` = none). When set, it is an array of `{ category, target }` slots; each `category` is a known slug and appears **at most once**; adding a duplicate is a no-op. |
| `VAL-TRIP-11` | A slot `target` is an integer **0–99**. Suggested defaults derive from trip length (`end − start + 1` days, or an owner-supplied day count clamped **1–60**) and type, over categories the wardrobe uses. |
| `VAL-TRIP-12` | The plan is **guidance only**: it never blocks adding/removing pieces, and a trip may hold more or fewer pieces than any target. Slots never auto-add pieces (v1 is manual). |
| `VAL-TRIP-13` | A piece may be planned for **any number of days** (#270). It stays **one packed piece**: repeat wear shows under every day in the planner and as a single line, ticked once, on the packing list. |
| `VAL-TRIP-14` | Day assignment never changes membership in either direction: taking a piece off a day leaves it packed, and un-packing a piece removes its days (the composite foreign key does this, so no code has to remember). |
| `VAL-TRIP-15` | Only a day **inside the trip's current range** may be written. A stored day outside it (the residue of a shortened trip) is shown and labelled, never silently dropped; clearing it is an explicit action. |
| `VAL-TRIP-16` | `every_day` and individual days are **mutually exclusive**: setting *across all days* clears the piece's days, because a piece cannot both be for one day and for all of them. |
| `VAL-TRIP-17` | *"Not scheduled yet"* and *"across all days"* are **different states** and are never merged. Conflating them would make the second meaningless: it would simply be where unplaced pieces went. |

## 5. Out of scope / future

- **Smart suggestions** (v0.2): pieces proposed from trip type/length, season, and wear-tracking stats.
- **Weather-aware packing** (v0.2): the destination's 10-day forecast biasing the suggestions.
- **Outfits** (Phase 4): packing named outfits rather than individual pieces.
- Trip templates, recurring trips, sharing, reminders, and non-wardrobe checklist items.
