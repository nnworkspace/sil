# Archive: Data Model Specification

- **Spec ID:** `SPEC-ARCHIVE-DATA`
- **Part of set:** `SPEC-SET-ARCHIVE` v0.1.0
- **Traceability:** `SPEC-ARCHIVE-FUNC` (rules §8); [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md); extends [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md); implemented in [`src/db/schema.ts`](../../src/db/schema.ts); issue #142

## 1. Purpose and scope

Defines the change archiving makes to the data model. It adds **no new table** (only three nullable columns on `items`) and deliberately stores **no history** of archive events.

## 2. Change to `items`

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| archived on | `archived_at` | date | no | the date the piece left the wardrobe; **`NULL` ⇒ active** (`VAL-ARCHIVE-04`). Not in the future (`VAL-ARCHIVE-01`) |
| archive reason | `archive_reason` | text | no | one of `sold` \| `gifted` \| `returned` \| `worn-out` \| `lost` \| `other` (`VAL-ARCHIVE-02`); required **whenever** `archived_at` is set |
| archive note | `archive_note` | text | no | free text, ≤ 255, blank ⇒ null (`VAL-ARCHIVE-03`) |

**Invariant:** the three move together. Either all are `NULL` (active) or `archived_at` **and** `archive_reason` are set, with `archive_note` optional (`VAL-ARCHIVE-07`). This is enforced in the Server Action; a `CHECK` constraint (`archived_at IS NULL) = (archive_reason IS NULL`) may be added if the invariant ever proves fragile.

- **Index** on `archived_at`. Every active-wardrobe read filters on it, and the archive view selects its complement; at a few hundred rows this is comfort rather than necessity, but it costs nothing and states the intent.
- No `archived_by`: there is exactly one owner (`specs/auth/`).
- No `updated_at` of its own; `items.updated_at` already moves when the piece changes.

## 3. Why columns and not a table

Archiving is a **property of the piece's current state**, not a stream of events: a piece is either in the wardrobe or it isn't, and it happens at most once in practice. Three nullable columns keep "is this active?" a single indexed predicate that every query can apply, whereas an `archive_events` table would force a join or a subquery into **every** wardrobe read, the exact place where forgetting it causes the bug this feature must avoid.

The cost is that **restore forgets**: archiving, restoring and re-archiving leaves only the latest values (`VAL-ARCHIVE-07`, and `SPEC-ARCHIVE-FUNC` §10). That is accepted. If a genuine audit trail is ever wanted, it becomes an events table then, and the columns remain as the fast "current state" projection.

## 4. What archiving does *not* touch

Archiving writes only the three columns. Everything else is retained, which is the whole point (`VAL-ARCHIVE-05`):

| Data | Effect of archiving |
|:--|:--|
| `item_photos` | untouched: photos stay, and still render on the archived piece's page |
| `wear_events` and `prior_wears` | untouched: the wear history and derived stats survive, so cost-per-wear stays meaningful for a sold piece |
| `look_items`, `trip_items` | untouched: existing memberships remain, shown but marked (`SPEC-ARCHIVE-FUNC` §7) |
| tags, prices, `purchased_at`, material, notes | untouched |

By contrast **delete** still cascades (`item_photos`, `wear_events`, `look_items`, `trip_items` all go), which is precisely the difference the feature exists to draw.

## 5. Migration

A single additive migration (`pnpm db:generate` → `pnpm db:migrate`, ADR-0002):

```sql
ALTER TABLE items ADD COLUMN archived_at     date;
ALTER TABLE items ADD COLUMN archive_reason  text;
ALTER TABLE items ADD COLUMN archive_note    text;
CREATE INDEX items_archived_at_idx ON items (archived_at);
```

- **Backfill:** none. Every existing row gets `NULL`, i.e. **active**, which is correct: nothing in the catalogue has been archived yet.
- **Reversible:** dropping the three columns and the index restores the previous schema; no data outside them is involved.
- **Production:** the same migration runs against Neon; because it is additive and nullable it needs no downtime and does not rewrite the table.
