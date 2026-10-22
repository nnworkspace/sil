# ADR-0014: Add a `test` commit type

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-27 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`. Once a record is `Accepted`, only the status line of this table may change. Everything below is frozen at acceptance. To change the decision, write a new ADR that supersedes this one.

## Context and problem statement

[ADR-0005](ADR-0005-commit-conventions.md) fixes the commit `type(scope): subject` vocabulary as `feat`, `enhance`, `fix`, `refactor`, `style`, `chore`, `tech`, `revert`, and states its reasoning plainly: "`tech` is the umbrella for build/CI/test/perf/deps work, **so there is never a choice to agonize over**." Excluding `test` was therefore a deliberate simplification, not an omission.

Two things have changed since.

1. **The repository now has a test suite** (#183, PR #185): vitest, a fixture strategy, and a stated intention to add a regression test for every fixed bug and to name tests after the spec rules they defend. Test-only commits stop being occasional and become a recurring, distinct kind of change.
2. **The changelog is already wired for it.** `cliff.toml` carries a `{ message = "^test", group = "🧪 Testing" }` parser, which today never matches. Test work is currently filed under whatever `tech` maps to, so it is invisible as testing in release notes.

The risk of extending the vocabulary is exactly the one ADR-0005 named: a contributor pausing to choose between `tech` and `test`. Any extension must keep the choice mechanical.

## Decision

Extend the ADR-0005 `type-enum` with **`test`**. The enum becomes:

`feat`, `enhance`, `fix`, `refactor`, `style`, `chore`, `tech`, `test`, `revert`.

**The selection rule is mechanical, and deliberately narrow:**

> Use `test` when the commit changes **only** test files, fixtures, or test configuration. If it also touches production code — including a fix that ships with its regression test — the type describes the production change (`fix`, `feat`, …), and the test rides along.

Everything else ADR-0005 specifies is unchanged: the scope stays mandatory and comes from the same `scope-enum`, so tests carry the scope of the area they exercise — `test(catalog)`, `test(trips)`, `test(infra)` — and the issue-reference footer remains mandatory.

Applied in `commitlint.config.mjs`. `tech` remains the umbrella for build/CI/perf/deps work.

## Consequences

- Test work appears under 🧪 Testing in the changelog instead of vanishing into a general bucket, which matters as the suite grows alongside the catalogue.
- The "never agonize" property is preserved by the only-test-files rule: the question is answerable by looking at the diff, not by judgement.
- One more type to remember. Mitigated by the rule above and by the fact that most testing arrives *with* production changes and so keeps that change's type.
- Precedent maintained: the commit vocabulary is extended by a short ADR plus a one-line config edit, as in [ADR-0011](ADR-0011-add-looks-commit-scope.md).

## Notes

Extends [ADR-0005](ADR-0005-commit-conventions.md), and consciously revisits its "no `test` type" rationale rather than ignoring it. Config: [`commitlint.config.mjs`](../../commitlint.config.mjs). Arises from the testing strategy in issue #183.
