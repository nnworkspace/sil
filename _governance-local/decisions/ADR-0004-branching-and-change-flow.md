# ADR-0004: Adopt GitHub Flow (main + short-lived branches + PR)

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

The repository needs a branching model. A common team-scale choice is a `main` + `dev` model with tiered change paths (trivial edits pushed straight to `dev`, substantive changes via feature branch + merge request). That model exists to solve two problems a team
publication has: **separating a release rhythm from a continuous-integration
rhythm**, and **integrating concurrent work from many authors**.

The wardrobe app has neither problem. It has one author, no publication cadence,
and no concurrent editorial streams. The question is whether to carry the full
two-branch tiered model or adopt something lighter.

## Decision drivers

- **No concurrent authors**: the integration problem `dev` solves does not exist.
- **No publication cadence**: there is no "released" state distinct from "latest"
  that a separate `main` must protect.
- **Keep a review surface**: even solo, a PR is a useful self-review checkpoint,
  a home for CI, and the natural place to link an issue.
- **Friction calibrated to risk**: a solo hobby app should carry less ceremony than a regulated team publication.
- **Traceability preserved**: every change still links to an issue (ADR-0005).

## Considered options

1. **`main` + `dev` + tiered change paths**: a typical team model, carried as-is. Correct for a team; redundant machinery for one author.
2. **Trunk-based, commit straight to `main`**: lightest possible; loses the PR
   review surface and the clean issue-linking checkpoint.
3. **GitHub Flow (`main` + short-lived feature branches + PR)**: one long-lived
   branch, every change via a branch and a squash-merged PR, releases as tags.

## Decision

Adopt **GitHub Flow** (option 3). `main` is the single long-lived branch and is
always deployable. Every change is made on a **short-lived branch**
(`feat/*`, `fix/*`, `chore/*`), opened as a **pull request** into `main`, and
**squash-merged** so `main` keeps one clean commit per change. Releases are **tags**
on `main`. `main` is protected against direct pushes; changes arrive only via PR.

This is a deliberate, recorded **divergence** from the common team-scale
`main`/`dev` tiered model: the `dev` integration branch and the Tier-1/Tier-2 split
are dropped because their justifying conditions (concurrent authors, a distinct
publication rhythm) are absent here. The parts that carry over (a PR review
surface, squash-merge cleanliness, mandatory issue links, tags as releases) are
kept.

## Consequences

**Positive**

- Minimal branch overhead: one mental model, no `dev`↔`main` back-merge discipline.
- Every change still gets a PR (self-review, CI home, issue link) and lands as one
  clean squash commit.
- `main` is always deployable, matching Vercel's per-branch preview + production
  model.

**Negative / accepted trade-offs**

- No separate integration branch, so there is no staging surface between a change
  and `main`; mitigated by PR review + CI + Vercel preview deployments.
- Diverges from the usual team model with a `dev` integration branch; this ADR records why, so the difference is intentional, not accidental.

**Re-evaluation triggers**

- The project gains collaborators or concurrent work streams (reconsider a `dev`
  integration branch).
- A need arises to distinguish a "released" state from "latest" beyond what tags
  provide.

## Notes

Related: ADR-0005 (commit conventions), which defines the issue-reference footer
every branch's commits carry. Trivial commits may reference the standing
housekeeping umbrella issue (#2) rather than a dedicated issue.
