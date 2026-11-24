# Compendium: Interface Specification

- **Spec ID:** `SPEC-COMPENDIUM-INT`
- **Part of set:** `SPEC-SET-COMPENDIUM` v0.3.0
- **Traceability:** [ADR-0007](../../_governance-local/decisions/ADR-0007-design-system.md), [ADR-0015](../../_governance-local/decisions/ADR-0015-component-test-tier.md); issues #213, #265

## 1. Routes

| Route | Renders |
|:--|:--|
| `/compendium` | The area's front page: what this is, and the sections as cards. Not a redirect: arriving with no section in mind is a legitimate entry (`VAL-COMP-08`). |
| `/compendium/berth-notation` | The Berth notation section (phase 1) |
| `/compendium/materials` | The Materials overview: the four groups, each with how many terms it holds and how many pieces those describe |
| `/compendium/fibres`, `/compendium/constructions`, `/compendium/finishes`, `/compendium/cuts` | One group and its entries (#265) |
| `/compendium/materials/<slug>` | One glossary entry (phase 2) |

One route per section (`VAL-COMP-07`), not anchors on a single page. That is what makes an item page able to link to *the entry for lyocell*, and what keeps the browser's back button meaningful inside the area.

**The groups are siblings of `/compendium/materials`, not children of it** (#265). That looks backwards beside the tree, which shows them nested, and it is the deliberate consequence of the rule above: `/compendium/materials/<slug>` has meant *an entry* since #213 and is linked from item pages, so the group pages could not be put there without either breaking those links or introducing two kinds of thing at one depth. The nesting a reader sees is in the navigation, not in the path.

Served by a dynamic `[group]` segment, which therefore also stands in front of every unrecognised path under `/compendium`: an unknown group is a 404, not an empty page. A group slug may never collide with a section slug: the static route would silently win and the group page would become unreachable. That is asserted in `sections.test.ts` rather than left to care.

Entry slugs are stable, lower-case and derived from the English term where one exists (`lyocell`, `poplin`, `mercerised-cotton`). A slug is part of the contract: once an item links to it, renaming it breaks the link. Group slugs are the plural label (`fibres`), written out rather than derived from the heading: a URL computed from a label is a URL that moves when someone rewords the label.

## 2. Navigation

**Top nav.** A `Compendium` entry joins the existing set (Browse, Favourites, Looks, Berths, Trips, Figures, Archive) in `site-header.tsx`, using the `BookOpen` icon. It highlights for every path under `/compendium`, matching the existing `pathname.startsWith` rule.

**Section tree.** A persistent left column on every Compendium page:

- Lists all sections. A section not yet written stays in the tree, badged *soon* (`VAL-COMP-10`): the shape of the thing is itself information.
- The current page is marked, visually and with `aria-current="page"`.
- **One level of nesting** (#265): the four Materials groups sit under *Materials*, indented and rule-marked. They are **always shown, not expanded on arrival**: there are four of them, each a single word, and a disclosure would hide the very choice the split exists to offer. Deeper nesting (a group expanding to its forty entries) remains unbuilt; the group pages are that index now.
- An entry page marks **nothing** as current. `/compendium/materials/linen` is inside Materials without being it, and `aria-current` on the parent would tell a screen reader the wrong page is open. The phone disclosure still names *Materials*, because a label is a hint and not a claim.
- On phones the tree becomes a disclosure above the content, labelled with the **current section** so it is useful shut.

**No right-hand table of contents.** Deliberately out of scope for this iteration (README §3). Sections are short enough that the left tree is the only index needed; when one grows long enough to want in-page anchors, that is the moment to build it.

## 3. Layout

```
┌──────────────────────────────────────────────────────────┐
│  Sil    Browse  Looks  Berths  Trips  Figures  Compendium│
├───────────────┬──────────────────────────────────────────┤
│  Materials    │  Poplin                                  │
│  │ Fibres     │  ← popeline (Fr.)                        │
│  │ Construct… │                                          │
│  │ Finishes   │  紧密平纹织物，经密远高于纬密 …            │
│  │ Cuts       │                                          │
│  Berth        │  ── In this wardrobe ────────────────    │
│  notation     │                                          │
│               │  [thumb] [thumb] [thumb]   6 pieces      │
└───────────────┴──────────────────────────────────────────┘
```

Two columns, not three. The content column takes the same measure as the rest of the app's prose (`markdown.tsx`'s container), because this *is* prose and should read like it.

**Responsive.** Below the `md` breakpoint the tree collapses above the content as a disclosure, the same treatment the header already uses for its own nav. The content is never pushed off-screen by navigation.

## 4. The two content kinds

Both live in the same shell; only the body differs (README §4).

### 4.1 Prose section (Berth notation)

- The **berth notation** section is written as components rather than Markdown: it needs real links (each berth to its pieces) and a table that can scroll on a narrow screen.
- **Every prose field of a glossary entry renders as Markdown**: `explanation`, `recognise`, `wearing`, `uncertain`, plus the group blurbs and section summaries. Entries outgrew one flat paragraph the moment one of them carried a comparison table, and plain text rendered the emphasis as literal asterisks. `markdown.tsx` is sanitised, so this costs nothing in safety.
- The grammar is a table: segment · pattern · what it means, sourced from `BERTH_GRAMMAR` so the page and the parser cannot drift apart.
- Worked examples read a real code left to right.
- Ends with **Codes in use**, derived: each code, its piece count, linked to `/berths` so the code is one click from the pieces in it (`OP-COMP-BERTH-INDEX`).

### 4.2 Glossary entry (Materials)

Stacked blocks, each omitted when empty:

1. **Term**: as a heading, in its own language, with the origin as a quiet line beneath (*← popeline, Fr.*).
2. **Explanation**: the Chinese prose.
3. **How to recognise it** / **What it means to wear**: when the entry has them.
4. **In this wardrobe**: matched pieces as covers in a row, with the count and a link to the filtered list. When nothing matches, one line saying so (`VAL-COMP-10`), never an empty box.
5. **See also**: sibling entries, as links.

**Where the entry lists live** (#265). The Materials page is an overview: four cards, one per group, each with its blurb and two numbers (how many terms are written, and how many pieces those terms describe between them). The second is a **set union within the group**, not a sum of the entry counts, because a cotton poplin shirt is one piece under Constructions however many entries there it matches (`VAL-COMP-05`).

The entry lists themselves are on the group pages: term, its other names, and its piece count, so each group page is a map of that much of the wardrobe. This is where the single long index used to be. It was right at a dozen entries and had become a scroll by the time Cuts arrived; the counts are the useful part, and they were below the fold.

An entry's back link returns to **its own group**, not to the overview: that is the page it was reached from, and the page whose siblings are worth another look.

## 5. The link back from an item

Phase 3. On an item's page, beneath the material line, the entries that piece matches appear as links (`VAL-COMP-09`). Presented as reference, not decoration: a short row of terms, no chips competing with the tags already there. If nothing matches, nothing is shown: an item page must not gain an empty section.

## 6. States

| State | Behaviour |
|:--|:--|
| Section or group not found | The area's own not-found, with the tree still present so the reader can get somewhere. `/compendium/anything-else` lands here, because the group route is dynamic |
| Entry matches no piece | Renders fully, with a single line where the pieces would be (`VAL-COMP-10`) |
| A group with no entries yet | Listed in the tree, page says the section is not written yet: honest, and shows the shape to come |
| No `material` recorded on a piece | It simply appears in no entry; the Compendium does not report gaps (that is Figures' Gaps module) |

## 7. Accessibility

- The tree is a `<nav>` with an accessible name; the current page carries `aria-current="page"`.
- Chinese prose is inside `lang="zh"` so it is announced and font-matched correctly; the terms around it keep the page language.
- Piece thumbnails carry the piece name as alternative text; they are links to garments, not ornament.
- Every collapsible group is operable by keyboard; the tree is reachable before the content in DOM order.

## 8. Testing surface

Component tier (ADR-0015):

- The tree marks the current section and only that one, including on a group page, where the parent must **not** also be marked.
- Every group is reachable from the tree without opening anything first.
- An entry with no matched pieces renders its "no examples" line rather than an empty region.
- The mobile disclosure opens and closes without hiding the content, and names the parent section from inside an entry page.

Unit tier: the URL contract itself (`sections.test.ts`), covering entry URLs unmoved, no group slug colliding with a section slug, a page for every group an entry claims, and the tree's own copy of the group list agreeing with the glossary.

## 9. Change history

| Version | Change |
|:--|:--|
| 0.3.0 | The Materials index becomes an **overview** and each group gains a page of its own (#265). The tree nests one level. Entry URLs deliberately unchanged, which is why the group routes are siblings rather than children. |
| 0.1.0 | Initial specification (#213). Right-hand table of contents excluded from scope at the owner's direction. |
