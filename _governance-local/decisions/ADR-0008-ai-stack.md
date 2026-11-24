# ADR-0008: Adopt Google Gemini (AI Studio free tier) via the AI SDK for AI features

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-18 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`. Once a record is `Accepted`, only the status line of this table may change. Everything below is frozen at acceptance. To change the decision, write a new ADR that supersedes this one.

## Context and problem statement

The AI-assisted import feature (Phase 1.5, `specs/ai-import/`, issue #11) needs an LLM to read a product page, either a screenshot (1.5a) or a URL (1.5b), and return the item fields as structured data (vision + structured output). We need an SDK, a provider/model, and an auth path. The owner is cost-conscious and already holds consumer subscriptions (Anthropic, Google), but **consumer subscriptions do not cover programmatic API usage**: that is billed separately regardless of provider.

## Decision drivers

- **Cost**: a personal, single-user app; ideally $0.
- **Vision + structured output**: read an image, return a typed object matching our item fields.
- **Type safety**: reuse our Zod approach (ADR-0006).
- **Simplicity**: minimal setup and dependencies.

## Considered options

1. **Anthropic API (Claude)**: strong quality, no training on API data, but **no ongoing free tier**; pay-per-use (cents).
2. **Vercel AI Gateway**: unified routing/observability and $5 free credits, but adds Vercel billing and a middleman not needed for one model.
3. **Google Gemini via Google AI Studio**: a **genuinely free tier** ample for single-user usage; strong vision + structured output.

## Decision

Adopt **option 3: Google Gemini via the AI Studio free tier**, called through the **Vercel AI SDK** (`ai`) with the **`@ai-sdk/google`** provider, using **`generateObject`** + a **Zod schema** for structured extraction. Initial model: **`gemini-2.5-flash`** (vision-capable, free-tier eligible), swappable via a single constant.

- **Auth:** `GOOGLE_GENERATIVE_AI_API_KEY` (free AI Studio key, no card) in `.env.local`; server-only.
- **Where it runs:** inside Server Actions, so the key never reaches the client.
- **Validation:** model output is validated by Zod and re-checked against the item schema (ADR-0006) before it prefills the form (human-in-the-loop, `VAL-IMPORT-*`).

The `ai` SDK keeps this provider-agnostic: switching to Anthropic or the Gateway later is a provider swap, not a rewrite.

## Consequences

**Positive**

- **Zero cost** for the owner's usage: no card, no subscription surcharge.
- Capable vision + structured extraction; typed output plugging into existing validation.
- One SDK (`generateObject`) for any future AI feature; provider is swappable.

**Negative / accepted trade-offs**

- On the **free tier, Google may use the data for product improvement.** Acceptable here: imports are **public product-page** screenshots/URLs, not private data. If private inputs ever arise, revisit (paid tier / different provider).
- Free-tier **rate limits** apply (fine for single-user, on-demand imports).
- Provider-specific package (`@ai-sdk/google`) rather than the Gateway's unified routing: a deliberate simplicity/cost trade.

**Re-evaluation triggers**

- Usage outgrows the free-tier limits.
- Private data ever needs to be sent to the model (free-tier data usage becomes unacceptable).
- Extraction quality proves insufficient (swap the model, or move to Anthropic/Gateway).

## Notes

Implements `specs/ai-import/`. Related: ADR-0001 (stack), ADR-0006 (Zod). Model ids come from the provider (`@ai-sdk/google`) / the Gateway model list, not from memory.
