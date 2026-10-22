# ADR-0011: Add a `looks` commit scope

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-21 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`. Once a record is `Accepted`, only the status line of this table may change. Everything below is frozen at acceptance. To change the decision, write a new ADR that supersedes this one.

## Context and problem statement

[ADR-0005](ADR-0005-commit-conventions.md) fixes the commit `type(scope): subject` convention with a mandatory `scope-enum`, and names — as a re-evaluation trigger — "the `scope-enum` no longer fits the app's areas (extend it via a new ADR)." The **Looks** feature (`SPEC-SET-LOOKS`, issue #95) is a new top-level area (like `catalog` and `trips`) with no fitting scope; its commits would otherwise be mislabelled under `catalog`.

## Decision

Extend the ADR-0005 `scope-enum` with **`looks`**. The enum becomes:

`catalog`, `looks`, `trips`, `ui`, `db`, `infra`, `governance`, `deps`, `release`.

Applied in `commitlint.config.mjs`. ADR-0005 otherwise stands unchanged.

## Consequences

- Looks commits are labelled by their real area; `git log --grep` / changelog grouping stay meaningful.
- Precedent: future top-level features add their scope the same way (a short ADR + a one-line config edit).

## Notes

Extends [ADR-0005](ADR-0005-commit-conventions.md). Implements the governance follow-up noted in the `SPEC-SET-LOOKS` draft (#95).
