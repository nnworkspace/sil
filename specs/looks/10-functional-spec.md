# Looks — Functional Specification

- **Spec ID:** `SPEC-LOOKS-FUNC`
- **Part of set:** `SPEC-SET-LOOKS` v0.4.0
- **Traceability:** [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md), [ADR-0003](../../_governance-local/decisions/ADR-0003-photo-storage.md), [ADR-0006](../../_governance-local/decisions/ADR-0006-validation-library.md); draws on [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md) and [`SPEC-ARCHIVE-FUNC`](../archive/10-functional-spec.md); issues #95, #98, #100, #170

## 1. Purpose and scope

Defines what a **Look** is, the operations that create/change Looks and their members, the per-piece views derived from them, and the rules they obey. A **Look** has a `name`, a `kind` (**set** or **look**), optional `notes`, and a set of member **items** (`look_items`). V1 is **curated** — the owner builds Looks; nothing is auto-suggested.

- **Set** (`kind = set`): pieces the owner treats as an inseparable co-ord (e.g. the navy jersey top + shorts, bought in one order; the white merino top + skirt).
- **Look** (`kind = look`): a styled combination of otherwise-independent pieces.

The distinction is about *how the owner treats the group*, not whether the pieces share a product code — the lime-green top + skirt are separate products worn as a set.

## 2. Operations

### 2.1 Create a Look — `OP-LOOK-CREATE`
- **Purpose:** capture a set or a styled combination.
- **Trigger:** the owner submits the **new-look** form (from `/looks`), or promotes a selection into a Look.
- **Behaviour:** validates (`VAL-LOOK-*`) and inserts a `look`. Starts empty (or pre-seeded with the pieces the owner selected).
- **Outcome:** the owner lands on the Look's page to add/confirm pieces.

### 2.2 Edit a Look — `OP-LOOK-EDIT`
- **Trigger:** the owner submits the **edit-look** form (`/looks/[id]/edit`).
- **Behaviour:** validates and updates `name` / `kind` / `notes`. Members are unaffected.

### 2.3 Delete a Look — `OP-LOOK-DELETE`
- **Behaviour:** deletes the `look`; its `look_items` **cascade-delete**. The **wardrobe items themselves are untouched** — a Look references pieces, it does not own them.
- **Outcome:** the Look is gone; the owner returns to `/looks`.

### 2.4 Add pieces to a Look — `OP-LOOK-ADD-ITEMS`
- **Trigger — two paths:** the **wardrobe picker** on the Look page ("Add pieces"), and an **"Add to Look"** action on an item's own page.
- **Behaviour:** inserts a `look_item` per (look, item). Adding a piece already in the Look is a **no-op** (idempotent, `VAL-LOOK-05`).
- **Outcome:** the pieces appear in the Look.

### 2.5 Remove a piece from a Look — `OP-LOOK-REMOVE-ITEM`
- **Behaviour:** deletes that `look_item`. The wardrobe item is untouched.

### 2.6 Add own photos to a Look — `OP-LOOK-ADD-PHOTOS`
- **Purpose:** attach the owner's own photo(s) of the outfit as worn — the thing that makes a Look recognisable at a glance.
- **Trigger:** the owner uploads one or more images from the Look page.
- **Behaviour:** validates each image (`VAL-LOOK-07`), stores it via the storage abstraction (ADR-0003), and appends a `look_photo`. The **first** photo a Look gains becomes its **cover** (`is_primary`) automatically (`VAL-LOOK-08`).
- **Outcome:** the photos appear on the Look; the cover replaces the piece-collage on the Looks list.

### 2.7 Remove a Look photo — `OP-LOOK-REMOVE-PHOTO`
- **Behaviour:** **asks for confirmation first** (`VAL-LOOK-13`), then deletes that `look_photo` row and best-effort deletes the stored object (mirrors `VAL-ITEM-11`). If it was the cover, the next photo (lowest `sort`) is promoted to cover (`VAL-LOOK-08`).

### 2.7a View a Look photo — `OP-LOOK-VIEW-PHOTO` (#195)
- **Purpose:** a Look photo is usually a full-length shot of the outfit as worn — the one photo most worth seeing closely.
- **Trigger:** the owner clicks a photo on the Look page.
- **Behaviour:** opens the **same full-screen viewer the item pages use** — enlarge, zoom, pan, step between the Look's photos, Esc to close (`VAL-LOOK-12`).
- **Outcome:** read-only; nothing is written.

### 2.8 Choose a Look cover — `OP-LOOK-SET-COVER`
- **Behaviour:** marks one of the Look's own photos as `is_primary`, clearing the flag on the others. Only meaningful when the Look has ≥ 1 own photo.

### 2.9 Reorder a Look's pieces — `OP-LOOK-REORDER` (#100)
- **Purpose:** let the owner arrange the pieces in the sequence they want to see them.
- **Trigger:** the owner drags a piece to a new position in the Look's grid.
- **Behaviour:** writes each piece's new position as its `look_items.sort` (`reorderLookItems`). New pieces are appended at the end; removing a piece leaves the rest in order.
- **Outcome:** the Look shows its pieces in the owner's order everywhere (list and grid).

### 2.10 Archive a Look — `OP-LOOK-ARCHIVE` (#170)
- **Purpose:** retire a look the owner no longer wears, without losing the record.
- **Trigger:** the **Archive** action on the Look's page.
- **Behaviour:** validates (`VAL-LOOK-10`) and records `archived_at` + `archive_reason` (a closed vocabulary — see `VAL-LOOK-10`) + optional `archive_note`. Soft and reversible: the look, its members and its photos are all kept; it simply stops counting as an active look (`archived_at IS NULL` ⇒ active). **No member piece is touched.**
- **Outcome:** the look drops out of active look views and out of each member's "In these Looks", but stays viewable by direct link, marked "Archived".

### 2.11 Restore a Look — `OP-LOOK-RESTORE` (#170)
- **Behaviour:** clears all three archive fields together (`VAL-LOOK-10`); the look is active again and its member links reappear in "In these Looks".

### 2.12 Archiving a member piece — the reminder (#170)
- A piece is **never** un-linked or a look **never** auto-archived when the *piece* is archived (`SPEC-ARCHIVE-FUNC` §7). Instead, archiving a piece that is in one or more active looks shows a **reminder** listing those looks (with links), so the owner can edit or retire them by choice. The looks become **incomplete** (§3) until edited.

## 3. Derived views (read-only)

Computed from `look_items` / archive fields, never stored:

| View | Definition |
|:--|:--|
| **piece count** | `count(look_items)` for a Look (shown on the Looks list). |
| **Look cover** | the Look's **own primary photo** if it has one; otherwise a collage of member pieces' primary photos (reusing the catalog cover-collage), or a placeholder when both are empty. |
| **incomplete** (#170) | a Look is **incomplete** when ≥ 1 member piece is archived — it can no longer be fully worn. Derived from members' `archived_at`, never stored, so it is always accurate; the Look stays visible, flagged with an "Incomplete" badge. |
| **In these Looks** (on a piece) | every **active** Look the piece belongs to — labelled by `kind` ("Part of the *X* set" / "In the *Y* look"). **Archived looks are excluded** (#170), so a retired look's link disappears from the piece's active view; the membership row survives for restore. |
| **Goes with** (on a piece) | the **distinct other pieces** across all the piece's **active** Looks — this is the piece's curated "matching pieces". Archived looks (and archived pieces) are excluded. |

**Members are shown in the owner's manual order** (`look_items.sort`, #100), set by dragging in the Look's grid; new pieces append at the end.

## 4. Business validation rules

| Rule ID | Validation |
|:--|:--|
| `VAL-LOOK-01` | `name` is **required**, trimmed, 1–120 chars. |
| `VAL-LOOK-02` | `kind` is **required** and one of **`set`** / **`look`** (default `look`). |
| `VAL-LOOK-03` | `notes` is optional, ≤ 2000 chars (plain text in v1). |
| `VAL-LOOK-04` | A `look_item` always references an **existing** look and item; deleting the look **or** the item cascades the link. Items are never deleted by removing them from a Look or deleting the Look. |
| `VAL-LOOK-05` | A piece appears in a Look **at most once** — `(look_id, item_id)` is unique; re-adding is a no-op, not an error. |
| `VAL-LOOK-06` | Every write is validated (Zod, ADR-0006) before it touches the database; invalid input is rejected with a field message. |
| `VAL-LOOK-07` | A Look photo is an **allowed image type** and **≤ 10 MB**; a Look holds **at most 10** own photos — same limits as item photos (`VAL-ITEM-03`). |
| `VAL-LOOK-08` | At most **one** own photo per Look is the cover (`is_primary`). The first photo added becomes the cover; deleting the cover promotes the next (lowest `sort`); choosing a cover clears the previous one. |
| `VAL-LOOK-09` | A Look's pieces have a per-look manual order (`look_items.sort`, 0-based). New pieces append at `max(sort) + 1`; reordering rewrites positions; members are read back in `sort` order. |
| `VAL-LOOK-10` (#170) | Archiving a Look requires a **date** (valid, not future) and a **reason** from the closed vocabulary **`no-longer-wear` / `piece-archived` / `outdated` / `other`**, plus an optional note (≤ 255). A Look is **active iff `archived_at IS NULL`**; every active look read applies this. Restoring **clears all three archive fields together** (no partial state). Values are validated (Zod, ADR-0006) before any write. |
| `VAL-LOOK-12` (#195) | A Look's own photos are **viewable full-screen**, through the *same* viewer as item photos — one implementation, not two. Stepping between photos **wraps** at both ends and never yields an index outside the set. |
| `VAL-LOOK-13` (#195) | **Deleting a Look photo asks for confirmation first**, and the deletion happens only on confirm. Setting the cover does **not** ask — it is immediate and reversible by choosing another. The photo, the ★ and the ✕ occupy the same square: each does exactly one thing, and neither control opens the viewer. |
| `VAL-LOOK-11` (#170) | Archiving or deleting a Look **never deletes the pieces in it** — only the look and its `look_items` links go (delete) or the look is flagged retired (archive). Symmetrically, archiving a *piece* never auto-archives or un-links its Looks; it flags them **incomplete** (§3) and reminds the owner (§2.12). |

## 5. Out of scope / future

- **Smart suggestions** (v2): pieces that might match (colour / tags / wear data / photos); AI-suggested Looks (reuses the trip-planner stack).
- **Looks × Trips** (v2): add a whole Look or Set to a trip's packing list in one action.
- Occasion/season tags on a Look; sharing. (Own photos + cover choice landed in v0.2.0, #98; manual piece ordering in v0.3.0, #100; **archive/delete a Look + the piece-archive reminder in v0.4.0, #170**.)
