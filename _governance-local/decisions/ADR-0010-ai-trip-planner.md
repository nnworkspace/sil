# ADR-0010: AI-assisted trip packing planner (reuse Gemini, one-shot & human-in-the-loop first)

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-21 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`. Once a record is `Accepted`, only the status line of this table may change. Everything below is frozen at acceptance. To change the decision, write a new ADR that supersedes this one.

## Context and problem statement

Trips (Phase 3, #74, merged in #86) let the owner build a packing list manually, and the drafted v1.1 "packing plan" (`SPEC-SET-TRIPS` v0.2.0) adds editable per-category target slots. Both are deterministic: the owner still picks every piece.

The owner wants a genuinely **smart** planner: brief it in natural language ("next week I'm in Vienna 3 days / 2 nights for a conference, with a formal dinner and an evening get-together with a friend. Pack for me"), and have it **propose real pieces from the wardrobe** as a first draft, which the owner then edits or refines by continuing the conversation.

This needs an LLM that reads the wardrobe **and** the trip context (occasions, formality, weather, duration) and returns picks that (a) are real wardrobe items, (b) suit each occasion's formality, and (c) fit the forecast. [ADR-0008](ADR-0008-ai-stack.md) already adopted **Google Gemini via the Vercel AI SDK** (`generateObject` + Zod) for AI features (the import). The open questions for the planner: which model/provider, the interaction model, the data/privacy posture, and the guardrails against hallucinated picks.

## Decision drivers

- **Reuse the AI stack** (ADR-0008): one SDK, no new provider or bill unless justified.
- **Cost / quota**: single-user hobby app; the Gemini free tier has a small daily request cap ([[gemini-free-tier-daily-cap]]), so the design must be frugal.
- **Privacy**: the planner's input is **personal** (the wardrobe plus a trip brief that may name a friend), unlike the **public** product pages the import sends. ADR-0008 explicitly named "private inputs" as a re-evaluation trigger.
- **Quality**: occasion/formality reasoning, and **only real pieces** (never invent an item the owner doesn't own).
- **Human-in-the-loop**: nothing is committed to the packing list without the owner's explicit accept (mirror the import's HITL).
- **Provider-swappable**: keep switching to Claude / the AI Gateway a provider swap, not a rewrite, if quota or quality demands it.

## Considered options

**Model / provider**
1. **Reuse Gemini free tier** (ADR-0008): `$0`, but free-tier data-use applies and the daily request cap constrains chat loops; input is personal.
2. **Anthropic Claude (pay-per-use)**: strongest reasoning, no training on API data; cents per plan.
3. **Vercel AI Gateway**: unified routing/observability, `$5` credits; adds a middleman.

**Interaction model**
- **A. One-shot generate-then-edit**: a brief box → one structured proposal → accept / remove / swap / regenerate.
- **B. Multi-turn chat**: a running conversation that refines the plan each turn.

## Decision

**Reuse Gemini via the AI SDK (model option 1)**, per the owner, and start with **one-shot generate-then-edit (interaction A)**, with chat-refinement (B) as the next iteration.

- **Structured, validated output.** Use `generateObject` + a Zod schema (the ADR-0008 pattern) to return a **plan proposal**: occasions, each with the chosen wardrobe **item ids**, a one-line rationale, and any **gaps** ("no formal shoes"). Every proposed id is checked against the owner's wardrobe; **unknown ids are dropped**, so the model can only choose pieces that exist.
- **Human-in-the-loop.** The proposal is shown for review; it becomes `trip_items` only when the owner **accepts** (whole or per piece). Regenerating or editing never auto-commits.
- **Frugal by design (the daily cap).** One-shot keeps it to **one model call per generate/regenerate**; the wardrobe is sent as a **compact text catalog** (name, category, colour, brand, tags, but **no photos** in v1) to keep tokens and latency down; the forecast (already fetched) is passed as a few numbers.
- **Privacy posture.** Only the text catalog + the trip brief go to the model, no images. The owner is advised in-UI that the brief is sent to the AI and that they may omit personal names. Recorded as an **accepted trade-off**: a clothing list plus a short trip brief is low-sensitivity, and text-only avoids sending photos.
- **Provider-swappable.** The `ai` SDK keeps Gemini behind one call site; moving to Claude or the Gateway later (a re-evaluation trigger below) is a provider swap.

## Consequences

**Positive**

- **`$0`** and reuses the existing AI stack (one SDK, one pattern).
- Typed, **validated** picks that plug into the trips data model; **no hallucinated items**.
- HITL keeps the owner in control; the planner drafts, the owner decides.
- Occasion-grouped picks are **proto-outfits**, a natural on-ramp to Phase 4 (outfits).

**Negative / accepted trade-offs**

- **Free-tier data-use on personal-ish input**: mitigated by text-only (no photos) and advising the owner they can omit names; revisit if sensitivity grows.
- **Daily request cap** bites a chat loop, mitigated by one-shot first, caching the wardrobe context, and one call per generate.
- **Gemini reasoning** on nuanced formality may trail Claude, accepted for now; a swap trigger.

**Re-evaluation triggers**

- The daily cap or reasoning quality proves insufficient → move to **Claude / the AI Gateway**.
- Private sensitivity grows (e.g. sending photos, richer personal context) → paid tier / different provider.
- Sustained chat-loop usage changes the cost calculus.

## Notes

Extends [ADR-0008](ADR-0008-ai-stack.md) (AI stack) and [ADR-0006](ADR-0006-validation-library.md) (Zod). Implements `specs/trip-planner/`. Related: trips (#74); outfits (Phase 4). Model ids come from the provider / Gateway model list, not from memory.
