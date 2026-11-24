# Wear Tracking: Data Model Specification

- **Spec ID:** `SPEC-WEAR-DATA`
- **Part of set:** `SPEC-SET-WEAR` v0.1.0
- **Traceability:** `SPEC-WEAR-FUNC` (rules §4); [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md); extends [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md); implemented in [`src/db/schema.ts`](../../src/db/schema.ts); issue #42

## 1. Purpose and scope

Defines the one new entity this feature adds (`wear_events`), how it relates to `items`, and how the wear stats are derived rather than stored.

## 2. `wear_events`

One row per logged wear.

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| id | `id` | uuid | system | primary key, generated |
| item | `item_id` | uuid | **yes** | FK → `items(id)` **ON DELETE CASCADE** (`VAL-WEAR-04`) |
| worn on | `worn_at` | date | **yes** | valid date, **not in the future** (`VAL-WEAR-01`, `-02`) |
| occasion | `occasion` | text | no | the occasion **tag** (one of the occasion vocabulary), or none (`VAL-WEAR-06`) |
| note | `note` | text | no | free-text note for the particular occasion, ≤ 255; blank ⇒ null (`VAL-WEAR-03`) |
| created at | `created_at` | timestamptz | system | default now |

- **Index** on `item_id` (all reads are per-item); an index on `worn_at` is optional (small, single-user scale).
- No `updated_at`. `occasion` / `note` are editable in place (`OP-EDIT-WEAR` inline, or the edit-form reconcile `OP-EDIT-WEARS`); the `worn_at` date and row identity stay stable, so no separate modified timestamp is tracked.

## 3. Change to `items`

The reserved single-value columns are **superseded and dropped**. The wear stats are derived from `wear_events`, so keeping them would create a second source of truth:

- **Drop** `items.wear_count` (was `integer default 0`).
- **Drop** `items.last_worn_at` (was `date`).

(These were reserved/unused in Phase 1, so dropping them loses no data; see `SPEC-CATALOG-DATA`.)

## 4. Derived stats

Computed on read (never stored), per `SPEC-WEAR-FUNC` §3:

| Stat | Derivation |
|:--|:--|
| worn count | `items.prior_wears + count(wear_events where item_id = :id)` |
| last worn | `max(worn_at)` for the item (null ⇒ "never"); `prior_wears` carries no date |
| cost per wear | `price_paid_cents / worn_count`, only when `price_paid_cents` is set and worn_count > 0 (`VAL-WEAR-05`) |

`items.prior_wears` (`integer NOT NULL DEFAULT 0`, #69) is an owner-set estimate of wears before tracking began: a baseline added to the logged wears so long-owned pieces have a meaningful cost-per-wear from day one.

The item detail query loads the item's wears (ordered by `worn_at` desc) with the item; count / max / cost-per-wear are computed in the read layer.

## 5. Drizzle & migration

- Add a `wearEvents` table to `src/db/schema.ts` with a relation `items → wearEvents` (one-to-many); a wear belongs to one item.
- Generate a migration (`pnpm db:generate`) that **creates `wear_events`** and **drops** `items.wear_count` + `items.last_worn_at`; apply with `pnpm db:migrate`.
- Validation of inserts/updates uses Zod (ADR-0006), mirroring the `VAL-WEAR-*` rules.

## 6. Out of scope

- Denormalised counters, materialised views, or history of edits to a wear.
- Any wear linkage to outfits (Phase 4) or trips (Phase 3).
