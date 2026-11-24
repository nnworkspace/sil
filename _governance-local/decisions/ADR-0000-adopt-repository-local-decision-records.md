# ADR-0000: Adopt repository-local decision records for wardrobe

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

The wardrobe app is a personal project, but it is built to last and to be worked
on across many sessions, by its owner and by AI assistants who arrive with no
memory of earlier reasoning. Decisions made early (framework, data layer, storage,
branching) are costly to reverse, and their rationale otherwise lives only in
chat logs and Git diffs, neither of which a future reader navigates.

Mature documentation-governance regimes exist for team settings, built around layered decision records (repository, group and programme level). Such regimes are designed for teams, regulated publications, and auditors. Applying one wholesale to a solo hobby
app would be ceremony without payoff. The question: keep decision records at all,
and if so, at what weight?

## Decision drivers

- **A readable "why" that survives sessions.** The main value: any future
  session opens `_governance-local/decisions/` and inherits the reasoning instead
  of re-deriving or contradicting it.
- **Friction calibrated to risk.** A personal project must not carry team-scale
  ceremony. Only decisions that are costly to reverse get a record.
- **Consistency with established team practice**, so the habit transfers.
- **Low overhead**, or the practice will not be followed.

## Considered options

1. **No decision records.** Rely on Git history and memory. Cheapest; the "why"
   is lost the moment it leaves working memory.
2. **A full layered regime** (repository, group and programme records). Faithful to team-scale practice; far too heavy for one person and one repository.
3. **A single ADR tier, scaled down.** Repository-local ADRs only, no group or
   programme tiers, no artefact frontmatter, acceptance by PR merge.

## Decision

The wardrobe repository adopts **repository-local Architecture Decision Records**
(option 3), in `_governance-local/decisions/`, following the process and template
in that folder (`ADR-PROCESS.md`, `ADR-TEMPLATE.md`).

The scaling-down from the source regime is deliberate and recorded here so it is
not mistaken for an oversight: **ADR tier only** (no group- or programme-level records; there is no group
or programme); **no artefact-classification frontmatter** (it serves audited
content repositories, not a personal codebase); **acceptance is the owner merging
the PR** rather than a separate review body. Everything else (the record anatomy,
the freeze-at-acceptance rule, supersession instead of editing, monotonic
numbering from `ADR-0000`) is kept, because it is cheap and it is what makes the
records trustworthy.

## Consequences

**Positive**

- The project's costly decisions are recorded where the work happens, readable in
  place by any future human or AI session.
- The habit matches established team practice, scaled to fit.
- New feature specs (see the spec-set approach) have stable anchors to trace to.

**Negative / accepted trade-offs**

- A small discipline cost per significant decision; the "is this ADR-worthy?"
  judgement has to be made case by case.
- The scaled-down form diverges from the team-scale regime it is adapted from, so the two are not identical; this ADR documents why.

**Re-evaluation triggers**

- The project grows collaborators, at which point group-level records or heavier
  review may become worthwhile.
- The records start accumulating routine decisions (a sign the granularity has
  drifted toward over-production).

## Notes

Process and template: [`ADR-PROCESS.md`](./ADR-PROCESS.md) and
[`ADR-TEMPLATE.md`](./ADR-TEMPLATE.md) in this folder. The index of accepted ADRs
is in the repository `README.md`.
