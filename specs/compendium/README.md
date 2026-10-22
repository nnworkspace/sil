# Compendium — Specification Set

> **Set ID:** `SPEC-SET-COMPENDIUM` · **Version:** `0.1.0` · **Status:** DRAFT · **Owner:** nnworkspace

A root-level reference area for the knowledge the wardrobe runs on. Named for its dictionary definition — *a concise but comprehensive collection of information on a subject* — which is the feature specification.

## 1. Purpose

Two days of filing turned into fibre forensics. Why one 100% viscose top stifles and another does not; why a neckline with three times the elastane holds worse; why a cotton shirt can look like satin. Every one of those findings was argued out from a real garment, and **every one of them is currently buried in the notes of a single item**, where it will never be found again.

The Compendium is where that knowledge lives instead. Its second job is the wardrobe's own conventions — beginning with the berth notation, which is presently documented nowhere at all and understood only by the person who invented it.

The test of every entry is whether it is **anchored in this wardrobe**. "Modal is soft" is worth little. "Modal is soft — and it is why the Atelier Nord off-shoulder top's neckline will not stay put, on 6% elastane, while the Studio Kaze scoop-back holds on 2%" is worth a great deal, because both garments are in the next room.

## 2. Why a documentation layout and not a report

[`Figures`](../figures/) is a report: one page, read top to bottom, scroll-spy anchors down the side. That is right for a dashboard and wrong here.

A compendium is **consulted**, not read. You arrive knowing what you want. So each section is **its own route**, the section tree persists beside the content, and every entry has a URL — which is also what makes the two-way linking possible: an item page cannot link to *the entry for modal* unless that entry has an address.

The model is the familiar documentation-site layout: area in the top nav, section tree on the left, content in the middle.

## 3. Scope

| In scope | Out of scope |
|:--|:--|
| A `/compendium` area with **one route per section** | A right-hand in-page table of contents — built when a section grows long enough to need it, not before |
| A persistent, collapsible **section tree**, current-page highlighting | Any new table, column or migration — entries are content in the repository |
| **Materials**: fibres, constructions and finishes | Editing entries in the app; they are versioned with the code |
| **Berth notation**: how a storage code is read and written | Free-text search across entries (a later idea, once there is enough to search) |
| Entries **matched at read time** against stored `material` strings | Rewriting `material` into structured fields — the free text stays authoritative |
| **Two-way links**: entry → pieces, item → entries | Advice on what to buy; the Compendium explains, it does not recommend |
| The term in the language the trade uses; explanation in Chinese | Translating every term into three languages |

## 4. The two content kinds

The set deliberately holds two different sorts of writing, and the interface must not blur them:

- **Glossary entries** (Materials) — many short records, each with a term, an explanation, and the pieces that use it. Repetitive by design, and partly derived.
- **Prose sections** (Berth notation) — one continuous explanation with worked examples. Not a list of anything.

Both live in the same tree and share the same shell. Only the body differs.

## 5. Traceability

| Anchor | Reference |
|:--|:--|
| Stack | [ADR-0001](../../_governance-local/decisions/ADR-0001-tech-stack.md) |
| Data layer | [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md) |
| Design system (restraint, serif headings, sharp edges) | [ADR-0007](../../_governance-local/decisions/ADR-0007-design-system.md) |
| Component test tier | [ADR-0015](../../_governance-local/decisions/ADR-0015-component-test-tier.md) |
| The `material` field it reads | [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md) |
| The `storage_location` field the notation section documents | [`SPEC-CATALOG-DATA`](../catalog/30-data-model-spec.md) (`VAL-ITEM-12`, #172) |
| Issue | #213 |

## 6. Reading guide

| File | Read it for |
|:--|:--|
| [`10-functional-spec.md`](10-functional-spec.md) | What the sections are, what an entry must contain, and the `VAL-COMP-*` rules — including the one that keeps entries honest about matching |
| [`20-interface-spec.md`](20-interface-spec.md) | The routes, the section tree, and how the two content kinds render |
| [`30-data-model-spec.md`](30-data-model-spec.md) | The entry shape, the matching rule against `material`, and the berth-code grammar as actually used |

## 7. Phasing

- **Phase 1 — shipped** (#215): the shell — `/compendium`, the section tree, and **Berth notation**. Small, self-contained, and immediately useful because that notation existed nowhere else.
- **Phase 2 — shipped** (#216, extended by #226, #235, #243, #261, #264, #273): **Materials** — 45 entries across fibres, constructions, finishes and **cuts**, matched against the catalogue. The fourth group arrived with *bolero* (#245): the first three all answer *what is this made of*, and a cut answers *what shape is it*.
- **Phase 3 — shipped** (#224): two-way linking. An item page names the entries its material matches, beneath the material line.
- **Phase 4 — shipped** (#265): Materials splits by group. One page each for fibres, constructions, finishes and cuts, with `/compendium/materials` reduced to an overview — the single index had been right at a dozen entries and was a scroll at forty-five. The entry URLs did not move, which is why the group pages sit beside `/compendium/materials` rather than inside it.

Berth notation led deliberately. It was the smaller section, needed no matching rules, and proved the shell before the harder content landed on it.
