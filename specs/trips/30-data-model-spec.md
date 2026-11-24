# Trips & Packing: Data Model Specification

- **Spec ID:** `SPEC-TRIPS-DATA`
- **Part of set:** `SPEC-SET-TRIPS` v0.4.0
- **Traceability:** `SPEC-TRIPS-FUNC` (rules §4); [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md); implemented in [`src/db/schema.ts`](../../src/db/schema.ts); issue #74

## 1. Purpose and scope

Defines the two entities this feature uses (`trips` and `trip_items`), how they relate to `items`, and the one constraint change v1 needs. Both tables **already exist** in the schema (reserved since Phase 1); v1 puts them to use.

## 2. `trips`

One row per trip.

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| id | `id` | uuid | system | primary key, generated |
| name | `name` | text | **yes** | trimmed, 1–120 (`VAL-TRIP-01`) |
| type | `type` | text | **yes** | `business` \| `vacation`, default `business` (`VAL-TRIP-02`) |
| destination | `destination` | text | no | ≤ 120; feeds the display-only forecast (`VAL-TRIP-03`) |
| start date | `start_date` | date | no | valid date (`VAL-TRIP-04`) |
| end date | `end_date` | date | no | valid date; ≥ `start_date` when both set (`VAL-TRIP-04`) |
| notes | `notes` | text | no | ≤ 2000, plain text in v1 (`VAL-TRIP-08`) |
| plan | `plan` | jsonb | no | packing-plan slots, ordered `[{ category, target }]`; `null` = no plan yet, `[]` = a plan the owner emptied (`VAL-TRIP-10`..`12`) |
| created at | `created_at` | timestamptz | system | default now |
| updated at | `updated_at` | timestamptz | system | default now; bumped on edit |

### 2.1 Packing plan (`plan`)

The **packing plan** is a soft, owner-editable scaffold that turns "browse the whole wardrobe" into a finite, guided task (v1.1). It is stored inline on the trip as a small JSONB array (the same shape-in-a-column approach items use for `details`) because it is a short, ordered, per-trip list with no independent identity.

```json
[
  { "category": "tops", "target": 4 },
  { "category": "trousers", "target": 2 },
  { "category": "outerwear", "target": 1 },
  { "category": "shoes", "target": 2 }
]
```

- Each **slot** is `{ category, target }`: `category` is a known category slug (§ [SPEC-CATALOG-DATA §6]) and `target` an integer **0–99**, a *suggested* count, never a cap (`VAL-TRIP-11`).
- **At most one slot per category** in a plan (`VAL-TRIP-10`); adding a slot for a category already present is a no-op.
- `plan = null` means **no plan yet** (a fresh trip, or one without dates); `plan = []` means the owner deliberately **emptied** it. Both are valid; the two states let the UI tell "not started" from "cleared".
- **Suggested defaults** (`OP-TRIP-PLAN-SUGGEST`) are generated from the trip's **length** (`end_date − start_date + 1` days, or a day count the owner supplies when the trip has no dates; clamped 1–60) and its **type**, and only for **top-level categories the wardrobe actually uses** (≥ 1 item). The default targets are a small, tunable table keyed by category and scaled by days/type, e.g. `tops ≈ days` (cap 7), `trousers ≈ ⌈days∕2⌉`, `outerwear 1`, `shoes 2`, vacation biasing dresses/skirts up and business biasing tops up. The exact constants live in `src/lib/trips.ts` (tunable like the category list); defaults need only be a sensible starting point because the owner edits every target afterward (`OP-TRIP-PLAN-SET-TARGET` / `-ADD-SLOT` / `-REMOVE-SLOT`).
- The plan is **guidance only**. It never gates adding or removing pieces; a trip may hold more or fewer pieces than any slot's target (`VAL-TRIP-12`). Auto-adding pieces to fill a slot is out of scope (v1 stays manual); a slot's **+ Add** opens the picker scoped to that category (`SPEC-TRIPS-INT §3.4`).

## 3. `trip_items` (join table)

Which wardrobe pieces are on a trip, and whether each is packed.

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| trip | `trip_id` | uuid | **yes** | FK → `trips(id)` **ON DELETE CASCADE** |
| item | `item_id` | uuid | **yes** | FK → `items(id)` **ON DELETE CASCADE** |
| packed | `packed` | boolean | **yes** | default **false** (`VAL-TRIP-07`) |
| across all days | `every_day` | boolean | **yes** | default **false** (#270) |

- **Primary key** `(trip_id, item_id)`: already the table's composite PK, which **is** the uniqueness guarantee for `VAL-TRIP-05` (a piece appears on a trip at most once). No separate unique index is needed; inserts use **on-conflict-do-nothing** so re-adding is a no-op.
- Both FKs cascade (`VAL-TRIP-06`): deleting a **trip** removes its links; deleting an **item** removes it from every trip. The item and the trip are independent entities: a link owns neither.
- No surrogate id and no timestamps: a `trip_item` is a lightweight association whose only mutable state is `packed` and `every_day`.
- **`every_day` lives here, not in `trip_item_days`** (#270). "This is for the whole trip" is a property of *packing the piece*, not of any one date, and a row per day would have to be rewritten every time the trip's dates changed.

## 3.1 `trip_item_days` (#270)

Which days a packed piece is planned for.

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| trip | `trip_id` | uuid | **yes** | part of the FK below |
| item | `item_id` | uuid | **yes** | part of the FK below |
| day | `day` | date | **yes** | a calendar day inside the trip's range |

- **Primary key** `(trip_id, item_id, day)`, so one piece may be planned for **any number of days**. That is what makes repeat wear work: the trousers appear under Monday *and* Wednesday in the planner while remaining **one pair packed and ticked once** on the list.
- **The foreign key is composite, to `trip_items(trip_id, item_id)`**, not two separate keys to `trips` and `items`. A day assignment for a piece that is not on the trip is not a state worth being able to represent, and the cascade means un-packing a piece takes its days with it: a database guarantee rather than a rule the application must remember.
- **`trip_items` remains the single membership.** A piece is packed once, `packed` stays there, and a day assignment is a plan *about* a packed piece. So removing a piece from Tuesday never unpacks it.
- Days are stored as **plain calendar days** (`date`, never a timestamp). A trip that starts on the 3rd starts on the 3rd in Berlin and in Kyoto alike; `src/lib/trip-days.ts` does its arithmetic in UTC and slices ISO strings for exactly this reason.
- **An assignment can outlive the dates that produced it.** Shortening a trip leaves rows for days the trip no longer has. They are neither deleted on read nor hidden: the day view groups them under *"Planned for a day this trip no longer has"* and offers to clear them. Losing plan detail is the owner's decision, not a side effect of loading a page. Writes are still validated against the current range, so the view can *show* an orphan but nothing can *create* one.

## 4. Derived stats

Computed on read (never stored), per `SPEC-TRIPS-FUNC` §3:

| Stat | Derivation |
|:--|:--|
| packed progress | `count(*) filter (where packed) / count(*)` over the trip's `trip_items` |
| all packed | `count(*) > 0 and count(*) = count(*) filter (where packed)` |
| piece count | `count(trip_items where trip_id = :id)` |
| slot filled | per plan slot: number of the trip's pieces whose category is in `descendantSlugs(slot.category)`, i.e. a slot rolls up its sub-categories (a shirt fills a `tops` slot) |
| slot met | `slot filled ≥ slot.target` |
| plan complete | plan has ≥ 1 slot and every slot is met |
| the trip's days (#270) | `start_date … end_date` inclusive, in UTC, empty when either is missing, the end precedes the start, or the range exceeds 60 days |
| pieces placed (#270) | pieces with `every_day` or at least one `trip_item_days` row inside the range, **counted once**, however many days they appear under |

The trip detail query loads the trip with its `trip_items` and each linked item's **primary photo** (for the thumbnail), ordered for grouping by the catalog's category order. **Plan** stats (slot filled/met) and **packed** stats are two independent meters (planning vs. packing) and are labelled distinctly in the UI. If a plan holds both a parent slot and one of its child slots, a piece may count toward both; the owner controls the slots, so this overlap is accepted, not resolved.

## 5. Drizzle & migration

- The `trips` and `tripItems` tables and their relations already exist in `src/db/schema.ts`; `tripItems` already declares the composite primary key `(trip_id, item_id)`.
- The base v1 (trips CRUD + packing list) needed **no new column**: the composite PK already gives `VAL-TRIP-05`, and the FKs already cascade.
- **v1.2 (#270) adds one column and one table:** `every_day boolean not null default false` on `trip_items`, and `trip_item_days`. Both are **purely additive**: every existing trip reads as "no piece scheduled yet", which is exactly what is true of it. Migration `0016`.
- **v1.1 (packing plan) adds one column:** `plan jsonb` (nullable) on `trips`. Generate the migration with `pnpm db:generate` and apply with `pnpm db:migrate`. No other schema change: the plan is validated in the app (Zod), not by DB constraints.
- Validation of inserts/updates uses Zod (ADR-0006), mirroring the `VAL-TRIP-*` rules.

## 6. Out of scope

- Any denormalised progress counter (packed and plan progress are both derived).
- **Ranking pieces within a slot** (favourite / destination-weather / least-worn). The plan gives target *counts*, not ordered *picks*; ranking stays v0.2 (needs no new column).
- Columns for smart suggestions / weather (deferred: v0.2 may add a cached forecast or suggestion metadata).
- Linking trips to outfits (Phase 4).
