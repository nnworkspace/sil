# Architecture Decision Records: process

This document defines how Architecture Decision Records (ADRs) are written,
reviewed, and maintained for the **wardrobe** repository.

The practice is adapted, deliberately scaled down, from a larger documentation-governance regime built for teams and auditors. This is a personal, single-owner project, so the ceremony is trimmed to what earns its keep here: **recording the "why" behind costly-to-reverse decisions, in the repository, readable later.**

## What an ADR is

An ADR is a short, self-contained Markdown document that captures one decision:
the context that forced it, the options weighed, the choice made, and the
consequences accepted. It records the reasoning *as it stood at decision time*.

Git history is the forensic substrate (who, when); the ADR is the navigable,
human-readable record. The two are complementary.

## Scope

Only one tier applies here: **`ADR-`**, local to this repository, in
`_governance-local/decisions/`. The wider group-level and programme-level
tiers of the source regime do not apply to a personal project and are not used.

Numbers are a single monotonic sequence, zero-padded to four digits, starting at
`0000`. Numbers are never reused or renumbered. `ADR-0000` records the
meta-decision to keep decision records at all.

## When to write an ADR

Write an ADR for a decision that is **costly to reverse** or where **a future
reader (including a future AI session) will not remember the "why"**. Examples:
the framework choice, the data layer, the branching model.

Do **not** write an ADR for routine or easily reversible choices. Over-production
is the main way this practice decays; expect a small, foundational set plus
occasional additions.

## Lifecycle

```
Proposed  ──►  Accepted  ──►  Superseded   (a newer ADR replaces it)
                          └─►  Deprecated  (no longer relevant, no replacement)
```

- **Proposed**: a draft on a feature branch, fully editable.
- **Accepted**: the decision is made. The body is now **immutable**.
- **Superseded / Deprecated**: set on a previously accepted ADR when a newer ADR
  replaces it, or when it ceases to apply. Record the superseding ADR number in
  both documents.

## Acceptance

Acceptance is the repository owner **merging the pull request** that introduces
the ADR. The PR review is the acceptance record. Because this is a solo project,
an ADR may be authored directly as `Accepted` in the PR that introduces it; the
PR discussion stands in for a separate proposal round.

## Immutability rule

Once an ADR is `Accepted`, its context, drivers, options, decision, and
consequences are frozen. You do not edit an accepted ADR to reflect a change of
mind. You write a **new** ADR that supersedes it, and update the old record's
`Status` and `Superseded by` fields only.

This lowers cost: writing fresh in today's context is cheaper than retrofitting
an old document, and the supersession chain stays readable as whole documents.

## Template

Use [`ADR-TEMPLATE.md`](./ADR-TEMPLATE.md) in this folder. Copy it, assign the
next free number, and name the file `ADR-NNNN-short-kebab-title.md`. Add it to the
index in this repository's `README.md`.
