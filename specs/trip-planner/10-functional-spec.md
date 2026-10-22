# AI Trip Planner — Functional Specification

- **Spec ID:** `SPEC-PLANNER-FUNC`
- **Part of set:** `SPEC-SET-TRIP-PLANNER` v0.1.0
- **Traceability:** [ADR-0010](../../_governance-local/decisions/ADR-0010-ai-trip-planner.md), [ADR-0008](../../_governance-local/decisions/ADR-0008-ai-stack.md), [ADR-0006](../../_governance-local/decisions/ADR-0006-validation-library.md); builds on [`SPEC-SET-TRIPS`](../trips/); issue #87

## 1. Purpose and scope

Defines what the AI planner does: from a trip and a natural-language **brief**, produce a **proposal** — real wardrobe pieces grouped by occasion — that the owner reviews and accepts into the trip's packing list. **V1 is one-shot and human-in-the-loop:** one model call per generate, and nothing reaches `trip_items` without the owner's accept. The planner **drafts**; the owner **decides**.

## 2. Operations

### 2.1 Generate a plan — `OP-PLAN-GENERATE`

- **Purpose:** turn a brief into a first draft packing list.
- **Trigger:** the owner writes a brief on the trip page and hits "Plan my trip".
- **Behaviour:** one call to the model (Gemini via the AI SDK, `generateObject` + Zod — ADR-0008) with **(a)** a compact **text** wardrobe catalog (id, name, category, colour, brand, tags — **no photos**), **(b)** the trip (type, dates → days, destination), and **(c)** the destination **forecast**. Returns a structured **proposal**: a list of **occasions** (label, inferred formality, time-of-day), each with chosen wardrobe **item ids** + a one-line **rationale**, plus **gaps** the wardrobe can't cover. Every id is validated against the wardrobe (`VAL-PLAN-03`).
- **Outcome:** the proposal is shown for review (§2.3). Nothing is committed yet.

### 2.2 Regenerate — `OP-PLAN-REGENERATE`

- **Purpose:** try again, optionally after tweaking the brief.
- **Trigger:** the owner edits the brief or hits "Regenerate".
- **Behaviour:** as `OP-PLAN-GENERATE` — **one** fresh call (mind the daily cap, `VAL-PLAN-07`). Replaces the current proposal; already-accepted pieces are untouched.
- **Outcome:** a new proposal to review.

### 2.3 Review & edit the proposal — `OP-PLAN-REVIEW`

- **Purpose:** curate the draft before it becomes the packing list.
- **Trigger:** the owner acts on the proposal.
- **Behaviour (all local, no model call):** **remove** a proposed piece, **swap** it (remove + pick another from the wardrobe picker, category-scoped), or mark pieces to keep. The owner's edits always win over the model's grouping/labels (`VAL-PLAN-05`).
- **Outcome:** a curated set ready to accept.

### 2.4 Accept into the packing list — `OP-PLAN-ACCEPT`

- **Purpose:** commit the draft.
- **Trigger:** the owner accepts — all, or the pieces they kept.
- **Behaviour:** the accepted item ids are inserted as `trip_items` (packed = false), **idempotent** (on-conflict-do-nothing, reuses `VAL-TRIP-05`). Accepting never removes pieces already on the trip. Optionally the accept can seed the trip's plan slot targets from the proposal's per-category counts.
- **Outcome:** the pieces join the packing list (the existing grouped-by-category view); the owner packs as normal.

## 3. Behaviour notes (read-only)

- The **proposal is transient** in v1 — it lives for the review, not as stored state. What persists is the **brief** (on the trip, so regenerating is easy) and, on accept, the `trip_items`.
- **Gaps** are shown as guidance ("no formal shoes for the dinner"), never as invented pieces or auto-purchases.
- The planner is **additive**: manual add, the picker, and the v1.1 plan slots all keep working; a trip never needs the AI.

## 4. Business validation rules

| Rule ID | Validation |
|:--|:--|
| `VAL-PLAN-01` | The **brief** is required to generate; trimmed, ≤ 2000 chars; persisted on the trip (`trips.brief`). A trip's dates/type/destination are read as available (a plan can still be generated without dates — the brief carries duration). |
| `VAL-PLAN-02` | Model output is validated by **Zod** (the proposal schema) before use; malformed output is rejected and surfaced (retry offered), never partially applied. |
| `VAL-PLAN-03` | Every proposed item id **must exist in the owner's wardrobe**; unknown ids are **dropped** (recorded as a gap). The model can only choose real pieces — never invent one. |
| `VAL-PLAN-04` | Nothing is written to `trip_items` except on the owner's explicit **accept** (human-in-the-loop). Accept is idempotent (`VAL-TRIP-05`). |
| `VAL-PLAN-05` | Occasion labels/formality are **informational**; the owner's edits (remove/swap/keep) always take precedence. |
| `VAL-PLAN-06` | Only a **text** catalog (no photos) + the brief are sent to the model; the UI discloses that the brief goes to the AI and that the owner may omit personal names (privacy, ADR-0010). |
| `VAL-PLAN-07` | **One** model call per generate/regenerate (free-tier daily cap, ADR-0010). A cap-hit or model error shows a friendly message; the manual planning flow stays fully usable. |

## 5. Out of scope / future

- **Multi-turn chat** refinement (v-next): keep talking to adjust the plan.
- **Outfits** (Phase 4): persist the per-occasion grouping as named outfits.
- **Photos / visual** matching; **weather-ranked** ordering within a category; learning the owner's packing ratios over time.
- Buying/renting to fill gaps; shopping links.
