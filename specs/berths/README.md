# Berths: Specification Set

> **Set ID:** `SPEC-SET-BERTHS` · **Version:** `0.1.0` · **Status:** DRAFT · **Owner:** nnworkspace

Where each piece physically lives, and how to find it again.

## 1. Purpose

The catalogue answers "what do I own?" well. A **berth** answers the other question the owner actually asks in a hurry: *where is it?* and its inverse, *what is on that shelf?*

A berth is a short free-text storage location on the piece (`items.storage_location`), shown on the card, beside the brand on the detail page, and searchable. The **Berths** tab turns that field into a browsable index.

## 2. Written after the fact

This spec set was written **after** the feature shipped, which is a departure from the repo's spec-first rule and is recorded here rather than hidden. Berths grew in four increments: the field and the tab (#172, #175), the summary of what each berth holds (#219), and ordering by the notation (#227). Each was small enough on its own to skip a spec. The result was a shipped feature with no written contract, found by a documentation sweep on 2026-07-30.

The lesson is the one the repo already knows: a feature is the sum of its increments, and none of them individually looks big enough to need a spec.

## 3. Scope

| In scope | Out of scope |
|:--|:--|
| A `/berths` index: every berth in use, with a count and a summary of what it holds | Any validation of the code's shape (see `VAL-BERTH-01`) |
| `/berths?loc=…`: the pieces kept in one berth | A picker or dropdown of known berths: the owner tried this idea and rejected it ("the code reads too similar") |
| Ordering by the **notation**, not by how full a berth is | Storing a berth's contents, in any form (`VAL-BERTH-03`) |
| Copying a berth code to the clipboard (#217) | Multiple berths per piece; a piece is in exactly one place |
| Keyword search reaching the berth field | Anything about *why* a piece is where it is |

## 4. The notation lives elsewhere

A code such as `R1-W7R2-S4-L` reads *room 1 · wardrobe 7, rack 2 · shelf 4 · left*. That grammar is **documented in the Compendium**, not here: it is knowledge about the wardrobe rather than a property of this feature, and the owner reads it as prose at `/compendium/berth-notation`.

This set depends on the parser (`parseBerth`) only for **ordering** and for the Compendium's own index. The catalogue never requires a code to parse.

## 5. Traceability

| Anchor | Reference |
|:--|:--|
| The field itself | [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md) (`VAL-ITEM-12`, max 31 chars) |
| The notation, as prose | [`specs/compendium/`](../compendium/) (`SPEC-COMPENDIUM-DATA` §5) |
| Keyword search reaching berths | [`SPEC-BROWSE-FUNC`](../browse/10-functional-spec.md) (`VAL-BROWSE-04`) |
| Design system | [ADR-0007](../../_governance-local/decisions/ADR-0007-design-system.md) |
| Issues | #172, #175, #219, #227 |

## 6. Reading guide

| File | Read it for |
|:--|:--|
| [`10-functional-spec.md`](10-functional-spec.md) | The operations, and the `VAL-BERTH-*` rules, above all why nothing is stored and why an unrecognised code is still a berth |
| [`20-interface-spec.md`](20-interface-spec.md) | The two routes and how a berth card is built |
