# Wear Tracking — Functional Specification

- **Spec ID:** `SPEC-WEAR-FUNC`
- **Part of set:** `SPEC-SET-WEAR` v0.1.0
- **Traceability:** [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md), [ADR-0006](../../_governance-local/decisions/ADR-0006-validation-library.md); extends [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md); issue #42

## 1. Purpose and scope

Defines what a wear is, the operations that create/remove wears, the stats derived from them, and the rules they obey. A **wear event** belongs to one item and records a **date** (`worn_at`), an optional **occasion tag** (chosen from the occasion vocabulary), and an optional free-text **note**.

## 2. Operations

### 2.1 Log a wear — `OP-LOG-WEAR`

- **Purpose:** record that a piece was worn.
- **Trigger:** the owner uses the quick **"Log a wear"** control on the item detail page.
- **Behaviour:** captures a `worn_at` date (**defaults to today**), an optional `occasion` tag, and an optional free-text `note`; appends one `wear_event` for the item. No full item edit needed.
- **Outcome:** the wear appears in the item's history and the derived stats update immediately.

### 2.1a Log a wear from the grid — `OP-QUICK-LOG-WEAR`

- **Purpose:** log a wear while browsing, without opening the piece.
- **Trigger:** the owner clicks the small **calendar** control overlaid on an item card in any grid (Wardrobe home, category, Browse).
- **Behaviour:** opens a small **modal** pre-filled with the viewer's local **today**, plus an **occasion** (the occasion vocabulary, or none) and an optional **note** — so the fast path stays two taps while still capturing what the wear model supports. Submitting appends one `wear_event`; a toast confirms and offers **Undo** (which deletes the just-logged wear). Validation is shared with `OP-LOG-WEAR`, so a **future date is rejected** (`VAL-WEAR-02`). The detail page keeps its inline form.
- **Outcome:** the wear is recorded with its occasion and note, and the item's stats update; Undo removes it cleanly.

> Originally a one-tap instant log dated today (#121); a date/occasion/note modal since #129, because wears are often recalled a day or more later and the occasion/note are worth keeping.

### 2.2 Remove a wear — `OP-REMOVE-WEAR`

- **Purpose:** delete a logged wear (mistake, duplicate).
- **Trigger:** the owner removes a row from the wear history (detail page) or the edit form.
- **Behaviour:** **asks for confirmation first** (`VAL-WEAR-09`), then deletes that `wear_event`.
- **Outcome:** the wear is gone; stats update.

### 2.3 Edit a wear — `OP-EDIT-WEAR`

- **Purpose:** correct a logged wear (its date, occasion tag, or note) from the item page.
- **Trigger:** the owner clicks **Edit** on a wear row (detail page); the row's fields become editable.
- **Behaviour:** the owner edits the date / occasion / note and clicks **Save** → `updateWear` persists all three; **Cancel** discards without saving. The row is **read-only** until Edit is clicked.
- **Outcome:** the wear reflects the edits (stats recompute if the date changed).

### 2.4 Edit wears in the form — `OP-EDIT-WEARS`

- **Purpose:** add, correct, or remove several wears while editing the item.
- **Trigger:** the owner edits the **Wear log** section of the edit form (repeatable date + occasion rows).
- **Behaviour:** on save, the item's `wear_events` are **reconciled** to the submitted set (`updateItem`) — the edit form is the authoritative list at save time.
- **Outcome:** the item's wear log matches what was entered; stats update.

## 3. Derived stats (read-only)

Computed from an item's `wear_events`, never stored (single source of truth — `SPEC-WEAR-DATA`):

| Stat | Definition |
|:--|:--|
| **worn count** | `items.prior_wears` + number of `wear_events` for the item |
| **last worn** | the most recent `worn_at` (or "never" when none) — from logged events only; `prior_wears` carries no date |
| **cost per wear** | `price_paid_cents ÷ worn count`, shown only when **price paid is set** and **worn count > 0** (`VAL-WEAR-05`) |

`prior_wears` is an owner-set **estimate** of wears before tracking began (default 0), so cost-per-wear reads sensibly for long-owned pieces added to the app years later. It has no dates and does not appear in the history list. When it is set, the count is shown as approximate ("Worn ~82 times") with a note ("incl. ~80 before tracking"). Cost-per-wear is formatted in the item's currency (reusing `formatPrice`).

## 4. Business validation rules

| Rule ID | Validation |
|:--|:--|
| `VAL-WEAR-01` | A wear's `worn_at` is **required** and a valid date. |
| `VAL-WEAR-02` | `worn_at` **may not be in the future** (you can't have worn it yet). |
| `VAL-WEAR-03` | `note` is **optional**, trimmed, ≤ 255 chars; blank ⇒ stored as none. |
| `VAL-WEAR-04` | A wear always belongs to an existing item; deleting the item **cascades** its wears. |
| `VAL-WEAR-05` | Cost-per-wear is shown only when `price_paid_cents` is set **and** worn count > 0; otherwise it is omitted (no divide-by-zero, no guess). |
| `VAL-WEAR-06` | `occasion` is **optional** and, when set, must be one of the **occasion tags** (casual / office / occasion / sport / loungewear) — chosen from a selector; free-form detail goes in `note`, not here (`SPEC-WEAR-INT`). |
| `VAL-WEAR-07` | Edit-form save **reconciles** the item's wears to exactly the submitted rows; the quick action only **appends** (or removes) one. |
| `VAL-WEAR-09` (#197) | **Removing a wear asks for confirmation first**, and the deletion happens only on confirm. The dialog names the wear (date, and occasion/note when present) and says the wear count and cost-per-wear will change. A wear is destroyed outright, and losing one silently moves every figure derived from it (`VAL-FIG-10`, `VAL-FIG-12`) — so it is never a single click, in line with the app-wide rule that nothing destructive happens without asking. |
| `VAL-WEAR-08` | Values are validated (Zod, ADR-0006) before any write; invalid rows are rejected with a message, never silently dropped mid-save. |

## 5. Out of scope / future

- Wear reminders, streaks, and trend charts.
- Inferring wears automatically; importing wear history.
- Destination-forecast suggestions and packing (Phase 3), and per-outfit wear (Phase 4).
