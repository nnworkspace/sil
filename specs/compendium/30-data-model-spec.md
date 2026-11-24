# Compendium: Data Model Specification

- **Spec ID:** `SPEC-COMPENDIUM-DATA`
- **Part of set:** `SPEC-SET-COMPENDIUM` v0.3.0
- **Traceability:** [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md); issue #213

## 1. Purpose and scope

Defines the entry shape, the rule that matches an entry to pieces, and the berth-code grammar. Everything here is either **content in the repository** or **derived at read time** (see §2).

## 2. No schema change

The Compendium adds **no table, no column and no migration**. Two sources feed it:

| Source | Where it lives | Changed by |
|:--|:--|:--|
| Entry content | TypeScript modules under `src/lib/compendium/` | A pull request |
| The four groups | `src/lib/compendium/groups.ts`: label, blurb and URL slug, apart from the entries | A pull request |
| Piece lists, counts, code index | `items.material`, `items.storage_location` | Filing a garment |

Content as code rather than rows is deliberate: entries are prose that wants review, diffs and history (exactly what the repository already gives), and there is no second author to coordinate with. If that changes, a table is a later ADR, not a hidden refactor.

**The groups live apart from the entries** (#265). `groups.ts` holds the four labels, blurbs and slugs and nothing else; `entries.ts` re-exports them so callers see one module. The reason is size, not tidiness: the section tree is a client component, and importing the glossary to learn four labels would ship every entry's Chinese prose to the browser. The tree keeps its own list of the four, and a unit test asserts the two agree: a small duplication, paid for openly, in preference to a large bundle.

## 3. The entry

```ts
export type CompendiumEntry = {
  slug: string;            // stable URL segment, a contract once linked to
  term: string;            // as the trade says it: "poplin", "crêpe de Chine"
  alsoKnownAs?: string[];  // other current names
  origin?: string;         // "← popeline (Fr.)"
  group: "fibre" | "construction" | "finish" | "cut";  // "cut" added in #243
  explanation: string;     // Chinese prose, Markdown (VAL-COMP-03)
  recognise?: string;      // the physical tell
  wearing?: string;        // drape, breathability, recovery, creasing, care
  match?: MatchRule;       // omitted ⇒ the entry matches nothing, by design
  seeAlso?: string[];      // slugs
  uncertain?: string;      // what in this entry is inference (VAL-COMP-11)
};

export type MatchRule = {
  tokens: string[];        // every spelling variant: ["elastane", "elastan"]
  exclude?: string[];      // tokens that veto a match despite a hit
  fields?: ("material" | "description" | "notes")[]; // default: ["material"]
};
```

`match` is optional and its absence is meaningful: a construction entry such as *knitted-to-shape* has no reliable textual signature, so it explains without claiming examples (`VAL-COMP-10`). Better an entry with no piece list than a piece list that is wrong.

## 4. Matching

```
matches(entry, piece) ⇔
  ∃ t ∈ entry.match.tokens :
      t occurs in normalise(piece[field]) at token boundaries, for some declared field
  ∧ ∄ x ∈ entry.match.exclude : x occurs likewise
```

- **`normalise`** lower-cases and collapses whitespace. It does **not** rewrite spellings; variants are the entry's job (`VAL-COMP-04`).
- **Token boundaries**, not raw substrings. `wool` must not match inside a longer unrelated word, and `rib` must not match *ribbon*. A boundary is any non-letter, or the ends of the string; percentages, commas and slashes all qualify, which is how `95% viscose, 5% elastan` yields both.
- **Fields default to `material` alone.** An entry that needs `description` or `notes` declares it, and accepts the looser precision that comes with prose.
- **Base set:** active pieces only (`archived_at IS NULL`), consistent with every other read surface.
- **A negated mention does not count.** Text just before the match is checked for a denial (*no*, *not*, *without*, *instead of*, *rather than*, *never*), and the occurrence is skipped if one is found. The window is short and stops at sentence punctuation, so a denial in the previous sentence does not reach; a word denied once and used positively elsewhere in the same text still matches.
- **A mention of what this is *worn with* does not count** (#267). The same short lookbehind also checks for pairing (*goes with*, *sits with*, *belongs with*, *pairs with*, *style it with*, *wear it with*, *worn with*, *dressed up/down with*) and for the layering prepositions *under*, *over*, *beneath*. All of them introduce a **different garment**. `styled with` is excluded from the list because in retail copy it means *features*, not *wear it with*.
- **A resemblance is not a composition** (#267). A token immediately followed by *look*, *inspired*, *effect*, *style* or *wash* is skipped: "a denim look" is a statement that the cloth is not denim.
- **Counts do not sum** (`VAL-COMP-05`). A 95/5 viscose-elastane top is in both entries. Any total presented alongside them says what it counts.

### 4.1 Worked cases

| `material` | Matches | Note |
|:--|:--|:--|
| `95% viscose, 5% elastan` | viscose, elastane | `elastan` is a declared variant of `elastane` |
| `100% cotton` | cotton | |
| `72% cotton, 23% nylon, 5% elastane` | cotton, polyamide, elastane | Three entries, one piece; `nylon` is a declared variant of `polyamide` |
| `100% mulberry silk` | silk | |
| `100% cotton (mercerised, silky sheen)` | cotton, mercerised (**not silk**) | The case that justifies both-sided boundaries |
| `52% camelwool, 48% polyester` | wool, polyester | Only because `camelwool` is a declared token; `wool` cannot reach inside the word |
| `96% tencel™ lyocell, 4% elastane` | lyocell, elastane (**not viscose, not modal**) | The three regenerated celluloses stay distinct |
| `sterling silver` | none | Nothing claims it, and that is correct |
| *(empty)* | none | Not a gap the Compendium reports |

## 5. Berth notation

### 5.1 What is stored

One free-text field, `items.storage_location`, at most 31 characters (`VAL-ITEM-12`, #172). Nothing validates its shape (by design, so a berth can be described before it is codified). The Compendium **documents** the convention; it does not enforce it (`VAL-COMP-12`).

### 5.2 The grammar, as observed

Every one of the 14 codes in use (58 pieces at the time of writing) fits:

```
code     := room "-" unit "-" place [ "-" position ] [ "-" container ]
room     := "R" digit+
unit     := "W" digit+ "R" digit+
place    := ( "S" | "D" | "H" ) digit+
position  := side depth? | depth
container := "BB" | "BT"
side     := "L" | "R" | "M"
depth    := "F" | "B"
```

| Segment | In use | Means |
|:--|:--|:--|
| `room` | `R1` | **Room** 1 |
| `unit` | `W2R3`, `W7R2`, `C1`, `C1R1` | The furniture and which part of it: **W** wardrobe or **C** cabinet, numbered, then an **optional Rack** *n* (#251). `W7R2` is wardrobe 7, rack 2; `C1` is cabinet 1, undivided |
| `place` | `S2`–`S6`, `D1`–`D2`, `H1` | **S**helf, **D**rawer, **H**anging rail |
| `position` | `L`, `R`, `M`, `F`, `B`, `LB`, `LF` | A **side** (**L**eft, **R**ight, **M**iddle) or a **depth** (**F**ront, **B**ack), or the two together: `LB` left-back, `LF` left-front |
| `container` | `BB`, `BT` | A **box inside the place** (#277): `BB` the bottom box, `BT` the top |

**The position composes; it is not a closed list.** The rule was first written as the six values then in use, and rejected `R1-W2R3-D1-LF` when the owner filed it. `VAL-COMP-12` decides that case: the catalogue is authoritative, so the grammar was what needed correcting. Side-and-depth is what the notation *is*; the six values were only the examples that happened to exist. A future `RF` or `MB` needs no code change.

**The container is a fifth segment, not a sixth position** (#277). The owner boxed two silk pieces and filed `R1-W2R3-D1-L-BB`; it did not parse, the Compendium said so, and `VAL-COMP-12` decided it the same way `LF` was decided. The distinction that shapes the grammar: `L`/`R`/`M`/`F`/`B` answer *where on the shelf*, and a box answers *what is it in*. Different questions, so they **compose** (`D1-L-BB` is the bottom box on the left of drawer 1), and each is independently optional, because a box may also fill a place (`D1-BB`) and a place may have a side with no box (`D1-LF`).

Unlike the position, the container **is** a closed list, held in `CONTAINER_LABELS` so a third value costs one line. That is deliberate rather than inconsistent: a side-and-depth composition is a rule that generalises, whereas each container is a physical object with a name only the owner can supply, and a typo must fail loudly, which is exactly how `BB` came to light.

Confirmed by the owner. Note that `R` carries two meanings by position (**room** in the first segment, **rack** in the second), so a parser must read segments positionally rather than by letter.

Read left to right, `R1-W7R2-S4-L` is: room 1 → wardrobe 7, rack 2 → shelf 4 → left side. The code narrows from the building inwards, which is also the order you walk it.

**The rack is optional, and left off where the furniture has only one** (#251). Furniture varies: one cabinet may have several banks of drawers, another a single bank, and a wardrobe a single rack. So a subdivision is a property of the individual piece of furniture, not of its kind. Omitting it where there is none keeps **one spelling per berth**: `R0-C1-D4` and `R0-C1R1-D4` would otherwise be two codes for one drawer, and the berths index would list it twice.

Note the parser stores no `rack` at all in that case rather than defaulting it to 1. A default would be a claim about furniture that has no subdivision, and it would make the two spellings compare equal when the whole point is that only one of them is correct.

**On the word.** `R` is the owner's *rack*, and English would call a column of drawers a **bank**. It stays `R` regardless: in this notation the letter means *the subdivision inside the furniture*, which is the same idea whichever furniture it is. A different letter per kind would make a code harder to read in order to satisfy a dictionary.

**A berth may carry a note** (#254). The index derives what is *on* a shelf; only the owner can say what it is *for*. A shelf whose contents read as "activewear, trousers" may in fact be a dedicated loungewear shelf, where mixing categories is the point rather than a filing error. Notes are content as code, keyed by code, and a note for a berth no piece uses simply never renders: the map cannot invent a berth, because the index stays derived from the catalogue.

**The position segment can mean a layer rather than a side** (#254). Where trousers are stacked first and tops laid on top of them, the side letter records which layer: `R1-W7R2-S6` is in the stack, `R1-W7R2-S6-L` is on top of it. So a shelf appearing under both a plain and a sided code is **not half-recorded**: it is two layers, and collapsing them loses information. Recorded because the opposite was very nearly done.

**`R0` is the hallway** (#251). It is numbered zero because it is the first space inside the door, a corridor rather than a room, so zero records that it is the threshold rather than pretending otherwise. It needed no change: `R<n>` already matched, and because ordering compares numbers as numbers (`VAL-BERTH-09`), room 0 sorts before room 1, which is the order you physically walk them.

`position` is optional and genuinely so: `R1-W2R4-H1` (4 pieces) and `R1-W7R2-S3` (9 pieces) carry none, while `R1-W7R2-S3-L` (1 piece) does. The parser must accept both rather than treating the shorter form as malformed.

### 5.3 The derived index

`OP-COMP-BERTH-INDEX` groups active pieces by exact `storage_location`, ordered by code, with counts: the same grouping `/berths` already performs. It is derived on every render; nothing is cached. If a code appears that the grammar does not parse, it is **listed anyway**, flagged as unparsed. The catalogue is authoritative (`VAL-COMP-12`).

## 6. Performance

Both reads are whole-catalogue scans over a few hundred rows: the same shape as Figures, and well under the cost of the page it renders. No index, no cache, no materialised view. Matching runs in memory over the already-loaded set; entry pages fetch pieces once and match all entries against them rather than querying per entry.

## 7. Change history

| Version | Change |
|:--|:--|
| 0.2.1 | The matcher gains a companion guard and a look-alike guard (#267). Swept across all 44 entries × 120 active pieces: 5 (entry, piece) pairs removed, every one a false positive, nothing genuine lost. |
| 0.2.0 | The four groups move to `groups.ts`, so the client-side tree can name them without importing the glossary (#265). The `group` union recorded here had been missing `cut` since #243. |
| 0.1.0 | Initial specification (#213). Berth grammar recorded from the 12 codes then in use; segment meanings confirmed by the owner. |
| 0.1.2 | Negated mentions excluded from matching, after a jumper was filed under Rib for a description saying it has none (#213 phase 3). Item pages link back to their entries. |
| 0.1.1 | Position generalised from a closed list to *side + depth* after `LF` (left-front) was filed and rejected: the case `VAL-COMP-12` exists for. |
