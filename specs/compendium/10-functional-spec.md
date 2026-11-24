# Compendium: Functional Specification

- **Spec ID:** `SPEC-COMPENDIUM-FUNC`
- **Part of set:** `SPEC-SET-COMPENDIUM` v0.3.0
- **Traceability:** [ADR-0001](../../_governance-local/decisions/ADR-0001-tech-stack.md), [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md), [ADR-0007](../../_governance-local/decisions/ADR-0007-design-system.md), [ADR-0015](../../_governance-local/decisions/ADR-0015-component-test-tier.md); issue #213

## 1. Purpose and scope

Defines what the Compendium contains, what an entry must carry, and the rules the content obeys. The routes, the section tree and the rendering are in [20-interface-spec.md](20-interface-spec.md); the entry shape, the matching rule and the berth grammar are in [30-data-model-spec.md](30-data-model-spec.md).

The Compendium is **read-only**. It creates, edits and deletes nothing. Its only actions are links: into the catalogue, and between entries.

## 2. Sections

A **section** is one addressable page in the tree. Sections may nest one level (a group with children); the tree is the index.

### 2.1 Berth notation: `OP-COMP-BERTH`

- **Question:** what does `R1-W7R2-S4-L` mean, and how do I write one for a new piece?
- **Content kind:** prose, with a grammar table and worked examples.
- **Shows:** the segments of a code and what each one names; the vocabulary in use for each segment; how a piece is located from its code; how to compose a code for a berth not yet used; and (because it is derived, not written) the **list of codes currently in use with the number of pieces in each** (`OP-COMP-BERTH-INDEX`).
- **Why it leads:** the notation is the owner's invention and is documented nowhere. It needs no matching rules, so it proves the shell before harder content lands on it.
- **Phase:** 1.

### 2.2 Materials: `OP-COMP-MATERIALS`

- **Question:** what is this made of, and what does that mean for how it behaves?
- **Content kind:** glossary (many entries, grouped).
- **Groups:** **fibres** (cotton, silk, wool, cashmere, linen, viscose, modal, lyocell, cupro, polyester, polyamide, elastane…), **constructions** (jersey, rib, poplin, twill, satin, crêpe, jacquard, bouclé, knitted-to-shape…), **finishes and treatments** (mercerised, brushed, garment-dyed…), and **cuts** (#243). A cut is the shape a garment is cut to, independent of its cloth; that is a different question from the first three, and one the owner meets just as often.
- Each entry carries a term, an explanation in Chinese, and the pieces in the wardrobe it applies to (`VAL-COMP-05`).
- **Phase:** 2.

Later sections are expected (care symbols, sizing, colour vocabulary), and the shell must not assume there are only two.

## 3. What an entry must carry

| Part | Required | Notes |
|:--|:--|:--|
| **Term** | yes | In the language the trade actually uses (`VAL-COMP-02`) |
| **Origin** | no | Where the word came from, when it illuminates the thing: *poplin* ← Fr. *popeline*, *brocade* ← It. *broccato*, *taffeta* ← Pers. *tāfta* |
| **Explanation** | yes | In Chinese (`VAL-COMP-03`), rendered as Markdown |
| **How to recognise it** | no | The physical tell. A ribbed welt means knitted-to-shape; a dry, papery hand means viscose rather than modal |
| **What it means to wear** | no | Behaviour: drape, breathability, recovery, creasing, care |
| **Matching** | no | The tokens that find it in a `material` string (§4) |
| **Pieces** | derived | Never written by hand; always computed (`VAL-COMP-05`) |

## 4. Rules

| ID | Rule |
|:--|:--|
| `VAL-COMP-01` | **Every entry is anchored in this wardrobe.** An entry earns its place by appearing in the catalogue, or by explaining something that does. General fashion knowledge with no piece behind it does not belong here. |
| `VAL-COMP-02` | **The term is recorded in the language the trade uses** (*popeline*, *broccato*, *crêpe de Chine*), not forced into English for consistency. Where an English name is also current, both are given. |
| `VAL-COMP-03` | **The explanation is in Chinese.** Terms, brand names and fibre names stay in their own language; the prose around them is Chinese. |
| `VAL-COMP-04` | **Matching against `material` is best-effort, and says so.** The field is free text (about 70 distinct strings across 112 pieces), so an entry's piece list is a *find*, not a *fact*. Entries that would over-match must declare exclusions (§5). |
| `VAL-COMP-05` | **An entry's piece list is derived, never stored.** It is computed at read time from the current catalogue, through the shared active-wardrobe rule (archived pieces excluded). A piece may appear under several entries, so entry counts **do not sum** to the wardrobe. |
| `VAL-COMP-06` | **Read-only.** No entry may be created, edited or deleted from the app; content is versioned with the code. |
| `VAL-COMP-07` | **Each section is its own route.** Every section, and every glossary entry, has a stable URL that can be linked to from an item. |
| `VAL-COMP-08` | **The tree is the index.** Section navigation is present on every Compendium page and marks the current one. |
| `VAL-COMP-09` | **Links go both ways.** An entry lists its pieces; an item page names the entries its material matches. Neither direction is hand-maintained. |
| `VAL-COMP-10` | **A section with nothing to show says so.** An entry that currently matches no piece renders as an entry with no examples. It is not hidden, because "nothing here matches" is itself information. |
| `VAL-COMP-11` | **Uncertainty is written down, not smoothed over.** Where a claim is an inference rather than a known fact (a fibre read from a photograph, an origin story that is contested), the entry says so. The catalogue was built partly from inference and must not launder it into authority. |
| `VAL-COMP-12` | **The berth section is descriptive.** It documents the notation as actually used, and derives the in-use list from the catalogue rather than asserting one. If a code in the catalogue does not fit the grammar, the grammar is wrong, not the code. |

## 5. Matching, and where it goes wrong

`VAL-COMP-04` exists because naive substring matching is unsafe on this field. Eight failure modes, every one of them found in this catalogue rather than imagined:

1. **Substrings of other words**, and all three of these are real, not hypothetical:
   - `rib` is inside *ribbon*, which is in this catalogue **three times**.
   - `silk` is inside *silky*, and `100% cotton (mercerised, silky sheen)` is, punctuation aside, a real composition here. Loose matching files a cotton shirt under Silk.
   - `lace` is inside *lace-up*, a fastening rather than a fabric. The hyphen is a boundary, so this one needs an explicit exclusion.

   Matching is therefore on **token boundaries on both sides** (see [30-data-model-spec.md](30-data-model-spec.md) §4).
2. **Spelling variants.** *elastane* / *elastan*, *polyamide* / *nylon*, *viscose* / *viskose* / *rayon*, *lyocell* / *tencel*. Both-sided boundaries mean a shorter spelling does **not** match a longer one, so an entry must carry **all** the variants it wants; the catalogue is not normalised to suit it. `camelwool` is the sharpest case: a real string here that `wool` cannot reach into.
3. **Denials read as mentions.** Prose distinguishes as often as it describes: *"a fine-gauge knit, **not** a jersey t-shirt"*, *"woven satin, **not** jersey"*, *"knitted to shape, **not** cut from jersey"*. All three are real sentences in this catalogue, and plain matching files each of those pieces under Jersey. 5 pieces mention a material in the negative, so the matcher skips an occurrence preceded by a denial. It cannot understand prose and does not try; it removes the one shape that occurs often enough to be visibly wrong.
4. **Comparisons read as mentions**, the same way denials do: *"on a single jersey the same edge would roll"* said of a piece that is emphatically not jersey. Unlike a denial there is no reliable syntactic marker, so there is **no guard**: the remedy is to notice it when writing, and to prefer a word the glossary does not claim ("single-knit cloth"). Recorded here because it will happen again.
5. **One word for two different things: a fibre and a finish** (#235). *Metallic* names a yarn woven into the cloth, and also a coating applied to a surface; the Leather Belt's description lists a "Metallic finish", which is precisely what the Metallic yarn entry is not about. This is not a substring problem (the word is whole and correctly spelled), so boundaries do not help, and it is not a denial, so the negation guard does not fire. The remedy is to **make the token say which sense is meant**: the entry matches *metallic yarn*, *metallic thread*, *metallised* and *lurex*, and never the bare adjective. Prefer this to an `exclude` list, which grows one counter-example at a time and says nothing about intent.
6. **Terms that are not in the composition field at all.** Construction and finish live in `description` and `notes`. The word *jersey* appears **19 times** in this catalogue's prose and **not once** in a `material` string; *ribbed* 8, *poplin* 9, *satin* 4. Those entries declare the wider fields and accept the looser precision that comes with prose.

7. **A cross-reference read as a description** (#243). Notes link pieces to each other (`bought the same day as the [Atelier Nord metallic jacquard jacket](/items/…)`), and the label necessarily names the **other** garment. A Linden & Co cardigan was filed under **Jacquard** on the strength of a sentence about a coat. Markdown links whose target is `/items/` are therefore removed before matching. A `/compendium/` link is left in deliberately: `the whole back is [lace](/compendium/materials/lace)` is a claim about **this** piece, and the asymmetry is the whole point.
8. **Comparisons, again, now with `unlike`.** Failure mode 4 said this would happen again, and it did: *"unlike the boxy Maison Verre satin bolero"* filed a wool blouson under both **Satin** and **Bolero**. `unlike` joined the negation list, which fixed *satin*; *bolero* sat beyond the guard's 24-character window, so the note was **reworded** (the remedy mode 4 already prescribed). Widening the window was rejected: it would suppress real matches far more often than it would catch comparisons.

9. **A garment named as a *companion*, not as this one's cloth** (#267). `/compendium/materials/denim` listed **8 pieces, of which 4 were not denim**. Denim is the only term in this glossary that is also a colour and a wardrobe category, so it appears constantly in sentences about *other* clothes: *"it sits with charcoal, ivory and **denim**"*, *"Style it with tailoring and **denim**"*, *"dressed down with **denim**"*, *"white sits **under** everything: the new **denim** jacket"*. None is a claim about the piece it is written on.

   The remedy is a second lookbehind of the same shape as the negation guard: *goes with*, *sits with*, *belongs with*, *pairs with*, *style it with*, *wear it with*, *worn with*, *dressed up/down with*, and the layering prepositions *under*, *over*, *beneath*. Layering words are broad on purpose (layering is always about another garment), and they caught a case in a different entry: a **denim** jacket was filed under **Jersey** because its note says *"over a jersey vest"*.

   **`styled with` is deliberately not in the guard.** It was, until the catalogue sweep showed a wrap dress in the catalogue is *"styled with a surplice neckline and **A-line** skirt"*, where the phrase means *features*, not *wear it with*. Every phrase that survived can only mean pairing. This is failure mode 5's lesson in a new place: a token, or a guard, must say which sense it means.

10. **A resemblance claim read as a composition claim** (#267). *"An oversized shirt dress in an indigo **denim look**"* and *"a classic, **denim-inspired** look"* say, in as many words, that the cloth is **not** the thing named: one is viscose, the other linen. A token immediately followed by *look*, *-look*, *inspired*, *effect*, *style* or *wash* is therefore skipped.

11. **Comparisons, a third time** (#267). Mode 4 predicted it, mode 8 confirmed it, and the Pleated Poplin A-Line Skirt did it twice in one note: *"the light sibling of the **denim** pleated A-line"* and *"where the heavy **denim** stands out as sculpture"*. Both were **reworded into real `/items/` links**, which mode 7's guard already strips. So the fix improved the catalogue as well as the match, since a cross-reference should have been clickable anyway. Four occurrences now, every one of them written here rather than by a retailer. The standing remedy is unchanged: **link it, or name it by something the glossary does not claim.**

The rule is that the **catalogue is authoritative and the entry adapts to it**. Nothing in this feature rewrites a stored `material` string.

## 6. Coverage, measured

At the time of writing, across 120 active pieces:

| | |
|:--|--:|
| Pieces with a `material` string | 112 (93%) |
| Distinct `material` strings | 70 |
| Contain *cotton* | 63 |
| Contain *elastane* / *elastan* | 34 |
| Contain *polyamide* / *nylon* | 18 |
| Contain *polyester* | 16 |
| Contain *viscose* / *rayon* | 10 |
| Contain *silk* | 10 |
| Contain *linen* | 9 |
| Contain *wool* | 9 |
| Contain *cashmere* | 8 |
| Contain *lyocell* / *tencel* | 6 |
| Contain *modal* | 2 |
| Pieces with a berth code | 58 (48%), across 14 distinct codes |

Two consequences: the fibre entries that matter are a short list, not an encyclopaedia; and the berth section has enough real codes to document from.

## 7. Non-goals

- **No recommendation.** The Compendium explains what a thing is; it does not say what to buy, keep or discard.
- **No structured material model.** Splitting `material` into `{fibre, percentage}[]` is a different feature with its own migration; this one reads the text as it stands.
- **No search.** With two sections, the tree is faster than a search box. Revisit when the tree stops fitting on a screen.
- **No in-app authoring.** Content is prose in the repository, reviewed like code.

## 8. Testing surface

| Tier | What it covers |
|:--|:--|
| **L1 (unit)** | The matcher: token-boundary matching, spelling variants, declared exclusions, and the "no match" case. The berth-code parser: every code in §6 parses; a malformed code fails cleanly. |
| **L2 (component)** | The section tree marks the current section; a glossary entry with no pieces still renders with its "no examples" state (`VAL-COMP-10`). |

## 9. Change history

| Version | Change |
|:--|:--|
| 0.3.0 | Three failure modes added, all found on the Denim entry (#267): a garment named as a **companion** (*"sits with charcoal, ivory and denim"*), a **resemblance** claim (*"a denim look"*), and comparisons for the third time. Denim went from 8 pieces to 4. |
| 0.2.0 | A fourth entry group, **Cuts**: words for a garment's shape rather than its cloth, starting with *bolero* (#243). §5 gains two more failure modes: a cross-reference link read as a description, and `unlike` as a denial. |
| 0.1.1 | §5 gains a sixth failure mode: one word naming both a fibre and a finish (*metallic*), and the rule that a token should state which sense it means (#235). |
| 0.1.0 | Initial specification (#213). |
