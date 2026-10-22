# ADR-0006: Adopt Zod for input validation

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-18 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`. Once a record is `Accepted`, only the status line of this table may change. Everything below is frozen at acceptance. To change the decision, write a new ADR that supersedes this one.

## Context and problem statement

The Catalog feature (Phase 1) enforces business validation rules (`VAL-ITEM-01..11` in `specs/catalog/10-functional-spec.md`) inside Server Actions before writing to the database: required fields, length caps, enum membership (category, tags), non-negative prices, date sanity (return-by not before purchase), and the shape of the `details` label/value array. The architecture doc flagged that the validation-library choice should be recorded as an ADR when Phase 1 needed it. It now does.

## Decision drivers

- **Runtime validation of untrusted input** — Server Actions receive `FormData` from the browser; TypeScript types alone do not validate at runtime.
- **Type inference** — the parsed result should carry precise TypeScript types with no duplicated hand-written interfaces.
- **Composability** — nested/array shapes (the `details` field) and cross-field rules (return-by ≥ purchased-at) must be expressible.
- **Ecosystem fit** — first-class TypeScript support and strong AI-answer density (the project is built with AI assistance).
- **Low overhead** — one small, well-known dependency.

## Considered options

1. **Zod** — schema-first runtime validation with static type inference; the de-facto standard in the TS ecosystem.
2. **Valibot** — similar model, smaller bundle via modular imports; smaller ecosystem.
3. **Hand-rolled validation** — no dependency, but verbose, error-prone, and duplicates type definitions.

## Decision

Adopt **Zod** for input validation. Validation schemas live alongside the feature (e.g. `src/lib/` domain schemas), are the single source of truth for both runtime checks and inferred input types, and are invoked by the Server Actions to enforce the `VAL-ITEM-*` rules. Bundle size is not a concern here because validation runs server-side in Server Actions, not in the client bundle.

## Consequences

**Positive**

- One schema yields both runtime validation and static types.
- Cross-field and nested rules (return-by vs purchased-at, the `details` array) are expressed directly.
- Large ecosystem and AI-answer density make it low-friction to work with.

**Negative / accepted trade-offs**

- A dependency to keep current.
- If any validation ever needs to run in the browser bundle, Zod's size would matter (not the case for server-side validation).

**Re-evaluation triggers**

- Client-side bundle size becomes a concern for validation that must run in the browser (reconsider Valibot).
- Drizzle-generated schema validation (`drizzle-zod`) or a different approach proves a better fit.

## Notes

Implements the validation rules in `specs/catalog/10-functional-spec.md` §4. Related: ADR-0002 (data layer), ADR-0001 (stack).
