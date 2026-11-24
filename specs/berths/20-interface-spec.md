# Berths: Interface Specification

- **Spec ID:** `SPEC-BERTHS-INT`
- **Part of set:** `SPEC-SET-BERTHS` v0.2.0
- **Traceability:** [ADR-0007](../../_governance-local/decisions/ADR-0007-design-system.md); issues #172, #175, #219, #227, #217

## 1. Routes

| Route | Renders |
|:--|:--|
| `/berths` | The index: every berth in use, ordered by the notation (`OP-BERTH-INDEX`) |
| `/berths?loc=<code>` | The pieces kept in that berth, as ordinary item cards (`OP-BERTH-VIEW`) |

One route with a query parameter rather than `/berths/[code]`: a berth code contains characters that would need escaping in a path segment, and the index is the only way in. Nothing links to a berth that is not in the list.

**Berths** sits in the top nav with a pin icon, the same mark used beside the berth on an item card and on the detail page, so the three surfaces read as one idea.

## 2. A berth card

```
┌──────────────────────────────────────┐
│ 📍 R1-W7R2-S2-R        7 pieces  ⧉  │
│    tops                              │
└──────────────────────────────────────┘
```

Three parts, in this order:

1. **The code**, with the pin, truncating if it must.
2. **The count**, plus a **copy control** (#217): theme-aware fill, icon in the same grey as the count, always visible rather than revealed on hover, because a code is something you copy deliberately.
3. **The summary**, on its own second line in the same grey.

**The summary is a second line, not a continuation of the first.** The card is about 330px at `lg:grid-cols-3`, and the summaries vary from `t-shirts` to `trousers, culottes +1`; on one line the longer ones truncate, and what gets cut is exactly the second category that made the line worth reading.

## 3. The stretched link

The whole card navigates, but it carries a button, and an `<a>` may not contain interactive content. So the card is plain markup with an `absolute inset-0` anchor over it and the copy control raised above on `z-10` (#217).

Consequences worth knowing:

- `hover:` on the card body no longer fires, because the overlay is what the pointer is over. The hover style hangs off `group-hover:` on the list item instead.
- The link needs its own accessible name (the code and the count), since it no longer wraps the text that would have named it.

## 4. States

| State | Behaviour |
|:--|:--|
| No berths recorded at all | The index shows a prompt explaining that a berth is set by editing a piece |
| A berth with no summary to give | The code and count render; no second line (`VAL-BERTH-07`) |
| `?loc=` for a berth that no longer exists | "Nothing is kept here", with a link back to the index |
| A code that does not follow the notation | Listed like any other, in its alphabetical place after the parseable ones (`VAL-BERTH-10`) |

## 5. Where else a berth appears

- **Item card**: beside the brand and size, in a smaller monospace, so a grid can be scanned for location.
- **Item detail**: under the name with the pin, beside the brand.
- **Compendium → Berth notation**: the same list of codes, derived from the same query and ordered by the same comparator, so the two pages cannot disagree. That page adds what each code *means*; this one adds what is *in* it.

## 6. Change history

| Version | Change |
|:--|:--|
| 0.1.0 | Written after the fact (#172, #175, #219, #227), during a documentation sweep on 2026-07-30. |
