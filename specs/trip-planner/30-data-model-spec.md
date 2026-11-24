# AI Trip Planner: Data Model Specification

- **Spec ID:** `SPEC-PLANNER-DATA`
- **Part of set:** `SPEC-SET-TRIP-PLANNER` v0.1.0
- **Traceability:** `SPEC-PLANNER-FUNC` (rules §4); [ADR-0010](../../_governance-local/decisions/ADR-0010-ai-trip-planner.md), [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md); reuses [`SPEC-TRIPS-DATA`](../trips/30-data-model-spec.md); issue #87

## 1. Purpose and scope

The planner is mostly **stateless**: it reads existing data (wardrobe + trip), asks the model, and on accept writes to the **existing** `trip_items`. Only one small thing persists, the **brief**, so a plan can be regenerated without retyping. The **proposal itself is transient** (a review artefact, not stored).

## 2. Persisted change: `trips.brief`

| Field | Column | Type | Required | Constraint / notes |
|:--|:--|:--|:--|:--|
| brief | `brief` | text | no | the owner's natural-language planning prompt; ≤ 2000 chars (`VAL-PLAN-01`); plain text |

- One nullable column on `trips`; a migration adds it (`pnpm db:generate` / `db:migrate`). No other schema change: accepted picks reuse `trip_items` exactly as manual add does.

## 3. What is sent to the model (input)

A **compact, text-only** wardrobe catalog with **no photos** (ADR-0010 privacy posture), one line per item:

```
<id> | <name> | <category> | <colour> | <brand> | <tags…>
```

plus the trip context (`type`, `days` = `end − start + 1` when dated, `destination`) and, when available (non-blocking), a short **forecast** summary. The owner's **brief** is the instruction. Item ids are the join key back to the wardrobe.

## 4. Model output (transient proposal)

Validated by Zod (`generateObject`, ADR-0008), this is the shape the model must return:

```jsonc
{
  "occasions": [
    {
      "label": "Client workshop",
      "formality": "business-formal",
      "timeOfDay": "morning",           // nullable
      "items": [
        { "id": "<wardrobe item id>", "reason": "one-line why" }
      ]
    }
  ],
  "gaps": [ "No formal shoes for the dinner" ]
}
```

- The server **validates every `id` against the wardrobe** and **drops unknowns** (`VAL-PLAN-03`). A dropped id may be surfaced as a gap. It then **enriches** each valid id with the item's name / brand / category / **primary photo** for the review UI (the model never sees photos; the client does).
- The proposal is **not stored**. It lives for the review; regenerating replaces it.

## 5. Accept → `trip_items`

On accept, the kept item ids are inserted as `trip_items` (`packed = false`) with **on-conflict-do-nothing**, reusing `addTripItems` and `VAL-TRIP-05` exactly. The planner adds **no** new write path to the packing list.

## 6. Out of scope

- Persisting the proposal, the per-occasion grouping, or **outfits** (Phase 4 stores those).
- Any cached model response or embedding store (v1 recomputes on demand).
- Sending photos or embeddings to the model (text catalog only, ADR-0010).
