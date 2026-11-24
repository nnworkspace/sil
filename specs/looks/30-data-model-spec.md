# Looks: Data Model Specification

- **Spec ID:** `SPEC-LOOKS-DATA`
- **Part of set:** `SPEC-SET-LOOKS` v0.4.0
- **Traceability:** `SPEC-LOOKS-FUNC` (rules §4); [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md), [ADR-0003](../../_governance-local/decisions/ADR-0003-photo-storage.md); implemented in [`src/db/schema.ts`](../../src/db/schema.ts); issues #95, #98, #100, #170

## 1. Purpose and scope

Defines the entities (`looks`, `look_items`, and `look_photos`) and how they relate to `items`. A Look is a **named group** of pieces with a **kind** (`set` / `look`) and optional **own photos** of the outfit as worn; the group is a **many-to-many** association with `items`, exactly like `trip_items` associates trips with items. New tables → one migration each (v0.1.0 added `looks` + `look_items`; v0.2.0 adds `look_photos`).

## 2. `looks`

One row per Look.

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| id | `id` | uuid | system | primary key, generated |
| name | `name` | text | **yes** | trimmed, 1–120 (`VAL-LOOK-01`) |
| kind | `kind` | text | **yes** | `set` \| `look`, default `look` (`VAL-LOOK-02`) |
| notes | `notes` | text | no | ≤ 2000, plain text in v1 (`VAL-LOOK-03`) |
| archived at | `archived_at` | date | no | NULL ⇒ active; set ⇒ the look is retired (#170, `VAL-LOOK-10`). Indexed. |
| archive reason | `archive_reason` | text | no | `no-longer-wear` \| `piece-archived` \| `outdated` \| `other` (#170) |
| archive note | `archive_note` | text | no | ≤ 255, optional free text (#170) |
| created at | `created_at` | timestamptz | system | default now |
| updated at | `updated_at` | timestamptz | system | default now; bumped on edit |

- **`kind`** is a plain string (validated in the app, not a DB enum; same approach as `items.category` and `trips.type`), so adding a kind later needs no migration.
- **Archive (#170):** a look is **active iff `archived_at IS NULL`**, mirroring `items` (`SPEC-ARCHIVE-DATA`). The three archive fields move together (set on archive, cleared on restore). Archiving/deleting a look **never touches the member pieces**: only the look and its `look_items` links. A look is **incomplete** (derived, never stored) when ≥ 1 member piece is archived.
- **Cover:** a Look's own uploaded photos live in `look_photos` (§4). The cover **prefers the look's own primary photo**; when a look has no own photos it falls back to a **collage derived** from member pieces' primary photos at read time (reusing the catalog cover-collage). No cover column is stored on `looks`; the choice is the `is_primary` flag on `look_photos`.

## 3a. `look_photos`

The owner's own photos of the outfit: a styled shot of the set/look as worn. An exact mirror of `item_photos` (ADR-0003), minus the `official`/`own` kind (a look photo is always the owner's).

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| id | `id` | uuid | system | primary key, generated |
| look | `look_id` | uuid | **yes** | FK → `looks(id)` **ON DELETE CASCADE** |
| url | `url` | text | **yes** | public URL (Vercel Blob in prod, filesystem in dev) |
| path | `path` | text | **yes** | storage pathname, kept so the object can be deleted |
| sort | `sort` | integer | **yes** | display order, 0-based, default 0 |
| is primary | `is_primary` | boolean | **yes** | the chosen cover; default false |
| taken on | `taken_on` | date | no | when it was taken, when the owner has said (#244); nullable, never inferred |
| place | `place` | text | no | free text, e.g. `Lyon, France` (#244) |

- **A look's photos carry a date and a place** on the same terms as an item's (#244); see [`SPEC-CATALOG-DATA` §4](../catalog/30-data-model-spec.md). The Lotus/lime look is why: two photographs six days apart in the same outfit say something neither says alone, and that could only be written in prose before.
- Stored via the existing storage abstraction (`putPhoto` / `deletePhoto`), so no new storage code (`VAL-LOOK-07`).
- **At most one** row per look has `is_primary = true` (`VAL-LOOK-08`); it is the cover. Deleting the cover promotes the next photo (lowest `sort`) to primary; setting a new cover clears the old.
- The FK cascades: deleting a look removes its photos' rows (the stored objects are best-effort deleted by the action, mirroring `VAL-ITEM-11`).

## 3. `look_items` (join table)

Which wardrobe pieces are in a Look.

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| look | `look_id` | uuid | **yes** | FK → `looks(id)` **ON DELETE CASCADE** |
| item | `item_id` | uuid | **yes** | FK → `items(id)` **ON DELETE CASCADE** |
| sort | `sort` | integer | **yes** | owner's manual order, 0-based, default 0 (`VAL-LOOK-09`, #100) |

- **Primary key** `(look_id, item_id)`: the uniqueness guarantee for `VAL-LOOK-05` (a piece is in a Look at most once). Inserts use **on-conflict-do-nothing** so re-adding is a no-op.
- Both FKs cascade (`VAL-LOOK-04`): deleting a **look** removes its links; deleting an **item** removes it from every Look. The link owns neither entity.
- **`sort`** (#100) is the owner's manual order within the Look. New pieces are **appended** at `max(sort) + 1`; the owner drags to rearrange (`reorderLookItems`). Members are read back **ordered by `sort`**; the earlier category-order grouping is gone.

## 4. Derived data

Computed on read (never stored), per `SPEC-LOOKS-FUNC` §3:

| Datum | Derivation |
|:--|:--|
| piece count | `count(look_items where look_id = :id)` |
| Look cover | the look's **own primary photo** if any (`look_photos where look_id = :id and is_primary`); **else** member pieces' primary photos → collage (catalog cover-collage) |
| incomplete (#170) | `true` when any member has `items.archived_at IS NOT NULL` (the look can't be fully worn); flagged, not stored |
| In these Looks (piece) | active `looks` joined via `look_items where item_id = :id`; **archived looks excluded** (#170) so a retired look's link disappears from the piece |
| Goes with (piece) | distinct `item_id`s sharing any **active** Look with `:id`, excluding `:id` (and excluding archived pieces) |

The Look-detail query loads the look with its `look_photos` (primary first, then `sort`), its `look_items` **ordered by `look_items.sort`** (the owner's manual order, #100), and each linked item's **primary photo**.

## 5. Drizzle & migration

- Add `looks`, `lookItems`, and `lookPhotos` tables + relations to `src/db/schema.ts` (mirroring `trips` / `tripItems` and `itemPhotos`), with `lookItems` declaring the composite primary key `(look_id, item_id)` **plus a `sort` column** and both FKs `ON DELETE CASCADE`, and `lookPhotos` its `look_id` FK `ON DELETE CASCADE`.
- Generate the migration with `pnpm db:generate`; apply with `pnpm db:migrate`. The `sort` migration **backfills** existing members with a deterministic order (by piece name) so current Looks stay stable (#100).
- **#170:** add `archived_at` (date), `archive_reason` (text), `archive_note` (text) to `looks` + index `looks_archived_at_idx`, mirroring the item archive columns; additive migration (nullable columns, existing looks stay active).
- Validation of writes uses Zod (ADR-0006) and the storage abstraction (ADR-0003), mirroring the `VAL-LOOK-*` rules.

## 6. Out of scope

- Any denormalised piece-count or cover column (the cover is the `is_primary` flag on `look_photos`, not a column on `looks`).
- Occasion/season columns on a Look (v2).
- Linking Looks to trips or outfits-as-worn-events (v2).
