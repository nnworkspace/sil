# ADR-0005: Adopt Conventional Commits with mandatory scope and issue footer

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-18 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`.
> Once a record is `Accepted`, only the status line of this table may change.
> Everything below is frozen at acceptance. To change the decision, write a new
> ADR that supersedes this one.

## Context and problem statement

The owner wants a disciplined, legible commit history: commits that read
consistently, group cleanly into a changelog, and trace to a recorded reason. The
project is built across many sessions (human and AI), so a machine-checkable
convention is worth more here than usual — it keeps every session's commits
uniform without relying on memory.

## Decision drivers

- **Legible, groupable history** — a convention that git-cliff can turn into a
  changelog.
- **Traceability** — every commit should link to an issue, so history explains not
  just *what* changed but *why* (mirrors established team practice).
- **Machine-enforced**, so the convention holds across sessions without vigilance.
- **Low friction for trivial changes** — the mandatory link must not force a fresh
  issue for every typo.

## Considered options

1. **Conventional Commits, unenforced** — a guideline only; drifts without a gate.
2. **Conventional Commits, enforced by commitlint** — a `commit-msg` hook rejects
   non-conforming messages.
3. Enforce, and additionally require **scope** and an **issue-reference footer**
   (a common team baseline).

## Decision

Adopt **Conventional Commits enforced by commitlint** via a husky `commit-msg`
hook (option 3), with these rules:

- **Type** from a small vocabulary: `feat`, `enhance`, `fix`, `refactor`, `style`,
  `chore`, `tech`, `revert` (`tech` is the umbrella for build/CI/test/perf/deps
  work, so there is never a choice to agonize over).
- **Scope mandatory**, from a `scope-enum`: `catalog`, `trips`, `ui`, `db`,
  `infra`, `governance`, `deps`, `release`. Extended by a follow-up ADR as the app
  grows.
- **Issue-reference footer mandatory** (`references-empty`): every commit carries a
  `Refs: #N` or `Closes: #N` footer. The **colon form is required** (a
  `footer-format` check), because git-cliff drops bare-hash footers from release
  notes.
- Trivial commits reference the standing **housekeeping umbrella issue (#2)** with
  `Refs: #2`, so the mandatory link never forces a fresh ticket for a typo.
- No body/footer line-length cap (bodies are free-flowing prose).

Release notes are generated from this history with **git-cliff** (`pnpm changelog`).

## Consequences

**Positive**

- History is uniform across every session and readable as a changelog.
- Every change traces to an issue; the umbrella keeps that cheap for trivia.
- The `commit-msg` hook enforces it locally with no human vigilance.

**Negative / accepted trade-offs**

- Every commit needs a scope and an issue reference — a small, deliberate friction.
- The local hook does not run on commits made through the GitHub web UI; if web
  editing ever becomes common, a CI-side commitlint check would be needed.

**Re-evaluation triggers**

- The `scope-enum` no longer fits the app's areas (extend it via a new ADR).
- Web-based commits become common and the local-only gate proves insufficient.

## Notes

Config: [`commitlint.config.mjs`](../../commitlint.config.mjs). Related: ADR-0004
(branching), which squash-merges PRs so the squash commit is the one that carries
`Closes: #N` onto `main`.
