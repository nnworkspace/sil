# Catalog — Data Model Specification

- **Spec ID:** `SPEC-CATALOG-DATA`
- **Part of set:** `SPEC-SET-CATALOG` v0.1.0
- **Traceability:** `SPEC-CATALOG-FUNC` (rules in §4); [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md); implemented by [`src/db/schema.ts`](../../src/db/schema.ts); issue #6

## 1. Purpose and scope

Defines the `item` data contract for the Catalog: every field, its type, whether it is required, and its constraints. It maps to the Drizzle schema on PostgreSQL. Product pages vary by brand, so the model is a **structured core plus a flexible extension**: common, queryable fields are columns; brand-specific sections go into a JSONB `details` field.

## 2. Storage approach

All item text lives in the **database**, not in Markdown files — items are runtime user data (created and edited from the app), and Vercel's filesystem is read-only in production. The model combines relational columns for the core with a JSONB column for brand-variable data, and a child table for photos (see the SQL-plus-JSONB rationale in [ADR-0002](../../_governance-local/decisions/ADR-0002-data-layer.md) and [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)). Two long free-text fields, `notes` and `description`, hold **Markdown** and are rendered with a sanitized renderer on display (§8); all other text is plain.

## 3. `items` fields

**Identity & classification**

| Field | Column | Type | Required | Constraint / notes | Phase |
|:--|:--|:--|:--|:--|:--|
| id | `id` | uuid | system | primary key, generated | 1 |
| name | `name` | text | **yes** | trimmed, 1–120 chars | 1 |
| category | `category` | text | **yes** | the piece's **primary** category — one of the category slugs (§6) | 1 |
| also in | `secondary_categories` | text[] | no | additional category slugs the piece also appears under (excludes the primary); default `[]` (#71) | 1 |
| brand | `brand` | text | no | ≤ 120 (e.g. "Atelier Nord") | 1 |
| product code | `product_code` | text | no | ≤ 60 (e.g. `AN-24-0117`) | 1 |
| colour | `color` | text | no | official colour name, ≤ 60 (e.g. "Ink Blue") | 1 |
| size | `size` | text | no | free text, ≤ 40 (e.g. "EU M") | 1 |
| product URL | `product_url` | text | no | valid URL, ≤ 2048; hook for AI import | 1 |

**Pricing**

| Field | Column | Type | Required | Constraint / notes | Phase |
|:--|:--|:--|:--|:--|:--|
| list price | `list_price_cents` | integer | no | ≥ 0, minor units; retail / original (e.g. 18900) | 1 |
| price paid | `price_paid_cents` | integer | no | ≥ 0, minor units; what you paid (e.g. 14900) | 1 |
| currency | `currency` | text | no | ISO 4217; default `EUR` | 1 |

**Purchase & returns**

| Field | Column | Type | Required | Constraint / notes | Phase |
|:--|:--|:--|:--|:--|:--|
| purchase date | `purchased_at` | date | no | valid date, not future | 1 |
| purchase channel | `purchase_channel` | text | no | where bought, ≤ 120 (e.g. "Atelier Nord online") | 1 |
| return by | `return_by` | date | no | return deadline; if set, ≥ `purchased_at` (may be future) | 1 |
| return policy | `return_policy` | text | no | free text, ≤ 2000 | 1 |
| berth | `storage_location` | text | no | where the piece is physically kept — labelled **"Berth"** in the UI; free text, ≤ 31; searchable and browsable at `/berths` (#172) | 1 |

**Curation**

| Field | Column | Type | Required | Constraint / notes | Phase |
|:--|:--|:--|:--|:--|:--|
| favourite | `favorite` | boolean | no | default `false` | 1 |
| show whole cover | `show_full_cover` | boolean | no | default `false`; when `true`, thumbnails (card grids **and** the detail-page gallery) fit the photo whole (`object-contain`) instead of cropping to fill (#58) | 1 |
| tags | `tags` | text[] | no | subset of the tag vocabulary (§7), de-duplicated; default `[]` | 1 (capture) / 2 (filter) |
| notes | `notes` | text (Markdown) | no | your own notes, ≤ 4000; rendered (§8) | 1 |

**Descriptive (verbatim from the product page; AI-fillable)**

| Field | Column | Type | Required | Constraint / notes | Phase |
|:--|:--|:--|:--|:--|:--|
| description | `description` | text (Markdown) | no | official description, ≤ 4000; rendered (§8) | 1 |
| material | `material` | text | no | composition, ≤ 500 (e.g. "54% linen, 43% viscose, 3% elastane") | 1 |
| care | `care` | text | no | care instructions, Markdown, ≤ 4000 | 1 |

**Flexible extension**

| Field | Column | Type | Required | Constraint / notes | Phase |
|:--|:--|:--|:--|:--|:--|
| details | `details` | jsonb | no | ordered list of `{label, value}` for brand-specific sections (§5); ≤ 30 entries | 1 |

**Wear tracking** — `prior_wears` (wears before tracking began, #69) is **nullable** (#191): `NULL` means the history was never recorded, `0` means recorded as genuinely never worn. The distinction matters wherever a zero would otherwise be read as a measurement. Otherwise moved to its own feature. The originally-reserved `wear_count` and `last_worn_at` columns were **removed** in favour of a dedicated `wear_events` table; wear stats (count, last-worn, cost-per-wear) are derived from it. See [`SPEC-WEAR-DATA`](../wear-tracking/30-data-model-spec.md).

**System**

| Field | Column | Type | Required | Constraint / notes | Phase |
|:--|:--|:--|:--|:--|:--|
| created at | `created_at` | timestamptz | system | default now | 1 |
| updated at | `updated_at` | timestamptz | system | default now; set on edit | 1 |

Money is stored in **minor units** (integer cents) to avoid floating-point errors; the UI converts to/from a decimal for entry and display.

## 4. `item_photos` (child table)

Each item has zero or more photos (your own plus the official shot).

| Field | Column | Type | Notes |
|:--|:--|:--|:--|
| id | `id` | uuid | primary key |
| item | `item_id` | uuid | FK → `items.id`, `on delete cascade` |
| url | `url` | text | public URL (Vercel Blob / local dev) |
| path | `path` | text | storage pathname, for deletion |
| kind | `kind` | text | `official` (from the brand site) or `own` (owner wearing the piece); default `own` |
| order | `sort` | integer | display order, 0-based; owner-arranged by drag-and-drop within each kind group (#56) |
| primary | `is_primary` | boolean | exactly one `true` per item that has photos — the **cover** (drives the card thumbnail and leads its gallery group); the owner may set it to **any** photo of either kind. Defaults to the first `official` photo, else the first `own` |
| taken on | `taken_on` | date | when the photograph was taken, when the owner has said (#244). **Nullable and staying so** — most photos here are retailer stills with no meaningful date, and an empty value reads as *not recorded*, never as *unknown* or *old* |
| place | `place` | text | free text, e.g. `Lyon, France` (#244). No geocoding: the place is worth keeping because it is what is remembered |

**Neither is ever inferred.** Nothing reads EXIF: the dates the catalogue holds were supplied by the owner from memory, and a date guessed from file metadata and shown as fact is the same laundering `VAL-COMP-11` forbids in the Compendium. Both fields exist so that a fact the owner states has somewhere to live other than prose — before #244, "Lyon, 12 May 2019" could only be written into an item's notes, where nothing could sort, filter or count it.

**Display.** The caption reads `place · date`, with the date **exactly as stored** (`2019-05-12`, #249) — every other date in the app is ISO, and these values are often approximate, so a long English date would dress them up. Either part alone renders on its own; neither present renders nothing at all.

**Ordering.** A gallery shows the cover first (the owner's deliberate choice, #56), then dated photos **oldest first** so a piece reads as a history, then undated ones in their existing `sort`. Undated is explicitly *not* treated as very old — that would bury real memories behind retailer stills.

Photos are grouped by `kind` in the detail-page gallery ("Official" / "Mine"). The vocabulary lives in [`src/lib/categories.ts`](../../src/lib/categories.ts) (`PHOTO_KINDS`).

This supersedes the single `image_url` / `image_path` columns on the baseline `items` table (§10).

## 5. `details` JSONB shape

An ordered array of label/value pairs — captures any brand section not covered by a named field, so the model needs no change per brand:

```json
[
  { "label": "Fit", "value": "True to size; fit-and-flare, sleeveless; short length; model 1.80 m wears EU S" },
  { "label": "Sustainability & traceability", "value": "Responsibly woven in Italy from certified flax and viscose; garment made in Vietnam; fabric knitted, dyed and finished in Italy" }
]
```

## 6. Category vocabulary

Canonical list in [`src/lib/categories.ts`](../../src/lib/categories.ts). Top-level slugs: `dresses`, `tops`, `blazers`, `knitwear`, `trousers`, `skirts`, `outerwear`, `underwear-and-pyjamas`, `activewear`, `shoes`, `bags`, `accessories`, `jewellery`.

Categories form a **tree** (#78): an entry may declare a `parent` slug, making it a sub-category. `jewellery` has children — `earrings`, `necklaces`, `rings`, `brooches` — and `tops` has children `shirts`, `t-shirts`, `vests`, `jumpers`, `cardigans`, `boleros`; the model supports any depth so other roots can nest later. An item is filed under **any node**: a leaf (e.g. `rings`) when the type is known, or the parent (`jewellery`) otherwise. The tree lives in config, not the database — items store category **slugs** in `category` / `secondary_categories` as before, so multi-category (§ above) and hierarchy compose with **no schema change**. A parent's category page, count, and cover collage **roll up** all its descendants (distinct items); a leaf's cover its own. The home grid shows **top-level** categories only.

## 7. Tag vocabulary

Grouped by kind (from [`src/lib/categories.ts`](../../src/lib/categories.ts)); `tags` stores the flat strings:

| Kind | Tags |
|:--|:--|
| occasion | `casual`, `office`, `occasion`, `occasion-only`, `sport`, `loungewear` |
| feel | `cool`, `warm`, `breathable`, `cozy`, `lightweight`, `heavyweight` |
| season | `spring`, `summer`, `autumn`, `winter` |
| care | `easy-care`, `hand-wash`, `dry-clean`, `delicate` |
| neck (#106) | `round`, `boat`, `v-neck`, `square`, `cowl`, `halter`, `collared`, `grandad` |
| sleeve (#106) | `sleeveless`, `cap`, `short`, `half`, `3/4`, `long` |
| silhouette (#106) | `a-line`, `fit-and-flare`, `shift`, `sheath`, `wrap`, `tunic`, `swing`, `column` |
| fit (#106) | `slim`, `regular`, `relaxed`, `boxy`, `oversized` |
| length (#106) | `cropped`, `mini`, `knee`, `midi`, `maxi` |

The `care` group records how demanding a piece is to look after — the wardrobe splits sharply between machine-washable cottons and dry-clean-only silks and linens, so it answers "what can I actually throw in the machine?" (#65). The **style groups** (neck / sleeve / silhouette / fit / length, #106) describe a garment's shape, so the owner can filter "V-neck midi dresses". They filter like any tag; values are populated at add-time / by keyword-backfill from the description, and (later) AI-inferred from the photo where the text is silent.

**Secondary categories are normalised, never taken as given (#206).** On every write:

```
secondary_categories = (ticked ∪ parents-of-ticked ∪ parent-of-primary) − primary
```

Two consequences, both deliberate:

- **A sub-category stores its family.** A piece filed under `shirts` carries `tops`; one also ticked `jeans` carries `trousers`. The stored row says what is true rather than leaving it to be derived, at the owner's decision.
- **A sub-category may be a cut rather than a construction** (#243). `boleros` is the first: Shirts, Jumpers and Cardigans all name how a piece is made, while a bolero names its shape and spans knit, lace, satin and lined jacquard alike. It earns a node because a filter could not replace it — they were scattered across Outerwear, Blazers and Cardigans, so no single view gathered them, and `cropped` covers 16 pieces including trousers.
- **The dividing line is two tests, both required** (#245): the **hem sits above the waist** (or optically does), and the **neckline is clean** — round, V or stand, never a notch lapel. Whether the front fastens is deliberately irrelevant; that was the rule in #243 and the owner replaced it. Being a layer is typical but not required — a cropped poplin shirt qualifies. This is the owner's definition, adopted knowingly in place of the trade one, which *does* require an open front; both are recorded in the Compendium's `bolero` entry so the category and the glossary cannot quietly disagree.
- **The length test is owner-assigned and cannot be derived** (#245). Where a hem falls is a fact about the wearer, not the garment, and no product shot shows it: cropped blazers can be rejected on sight once moved in, and the descriptions of the pieces *kept* and the ones *rejected* can use the same phrase — *"at the natural waist"* — on both sides of the line. Treat that wording as unreliable; several such descriptions were written from photographs. Only the neckline test can be applied from the record.
- **The primary is never repeated** as a secondary — `categoryMatcher` already matches on it.

Recomputing from the **current** primary on every save is what keeps this honest: re-file a piece from `shirts` to `trousers` and `tops` is simply not re-derived, so it disappears instead of lingering and keeping the piece in Tops for ever. The rule lives in `normaliseSecondaries` ([`src/lib/categories.ts`](../../src/lib/categories.ts)) and is applied by `itemInputSchema`, so it holds however the form behaves.

Backfilled across the catalogue (36 rows). **Category counts were identical before and after** — the roll-up already produced these memberships; the backfill only made the stored data agree with what was already reported.

**`occasion` vs `occasion-only` (#204).** `occasion` says a piece is **fit for** a dressed occasion; `occasion-only` says it is fit for **nothing else**. They **compose** — a piece keeps `occasion` and gains the narrowing — so existing filters and the ~30 pieces already tagged are unaffected.

The test is **not formality**. It is whether the piece asks something of the wearer that an ordinary day will not pay: uncomfortable beyond an hour or two, needs constant adjusting, demands particular underwear, or cannot be layered. Worked examples:

| Piece | Tagged | Because |
|:--|:--|:--|
| Sheer Fine-Knit Boat-Neck Top (Linden & Co, plum) | yes | 100% viscose shell stops breathing — **uncomfortable** |
| Off-Shoulder Band Top (Atelier Nord) | yes | cotton-modal band creeps and needs resetting — **impractical** |
| Off-the-Shoulder Scoop-Back Top (Studio Kaze) | **no** | lyocell-cotton breathes and stays put; bare shoulders limit *where* it goes, not *how long* it can be worn |
| V-Back Satin Boat-Neck Top (Maison Verre, teal) | **no** | also 100% viscose — but the deep open back ventilates and the boxy cut hangs away from the skin |

**Fibre does not decide it.** The first and last rows are both **100% viscose** and land on opposite sides, for two independent reasons:

1. **Ventilation** — the plum top is closed and close, so it seals and stifles; the teal has a cut-away back and a loose body, so air moves.
2. **Yarn and construction** — the plum is **knitted from spun staple yarn**, whose twisted fibre ends meet the skin as thousands of small friction points; the teal is **woven satin** in filament viscose, whose long floats give a slippery face with almost nothing standing proud.

The same split decides **creasing**, in the opposite direction: the knitted piece barely creases, because its loops absorb a fold and spring back, while the woven satin holds packed folds and wants a steamer. So the knit is rougher but travels better, and the satin is silkier but needs pressing.

So a composition line tells you very little on its own. **Judge the garment: how it is spun, how it is made, and how it lets air move** — never the fibre percentages alone.

The tag is applied **only to pieces the owner has actually worn and judged** — a blind sweep of the catalogue would be guesswork, so it is populated during filing rather than backfilled.

**Season inference (#108).** Every piece should carry `season` tags so the season filter is useful. When the owner does not choose them, seasons are **inferred** from the material / name / description by [`src/lib/seasons.ts`](../../src/lib/seasons.ts) (`inferSeasons`) — generous by design (a piece usually spans 2–3 seasons): cold fabrics (wool, cashmere, down…) → autumn/winter; light fabrics or construction (linen, chiffon, sleeveless…) → spring/summer; silk → spring/summer/autumn; mid-weight cottons/denims → the transitional spring/autumn. This applies on every new filing (existing pieces were backfilled, preserving any seasons already set); the in-app AI import will adopt the same fallback (#107).

## 8. Text format

`notes` and `description` are stored as **Markdown** strings and rendered with a sanitized Markdown renderer (e.g. `react-markdown` + `rehype-sanitize`, chosen at build time) so raw HTML/scripts never execute. All other text fields are plain text. Nothing is stored as files — see §2.

## 9. Derived data

- **Category counts** (home page): a piece is counted under its primary `category` **and** each of its `secondary_categories` — `count` grouped over `category` unioned with `unnest(secondary_categories)` (#71).
- **Cost-per-wear**: `price_paid_cents ÷ wear count`, where wear count is derived from `wear_events` ([`SPEC-WEAR-DATA`](../wear-tracking/30-data-model-spec.md)).
- **Return-window reminders** *(future)*: driven by `return_by`.

## 9.1 Timestamps, and who maintains them

Every table except `wear_events` carries `created_at` and `updated_at`. The join tables gained theirs in #301, so that a change can be detected on **every** table, and the join tables are where edits are most frequent: taking a piece off a trip, reordering a look, adding a photo.

**They are maintained by a database trigger, not by the application.** `updated_at` was previously set by hand in ten action files, which every direct SQL write bypassed — including repairs run by hand during an earlier incident. That was harmless while nothing read the column. It stops being harmless the moment anything relies on it to detect changes: a row whose timestamp was not bumped looks unchanged, for ever.

The trigger has one subtlety worth stating (#311):

```sql
IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
  NEW.updated_at := now();
END IF;
```

The timestamp is refreshed **only when the writer did not set it**. A tool that copies rows with their `updated_at` verbatim therefore keeps the source's value instead of stamping the row as freshly changed; otherwise every copied row would look newer than its origin.

`wear_events` is deliberately excluded: a wear is an immutable fact with a date of its own, and it is never edited.

## 10. Change history

v0.1.0 extends the baseline `items` table (which currently has `name`, `category`, `brand`, `color`, `price_cents`, `currency`, `purchased_at`, `image_url`, `image_path`, `tags`, `notes`, `last_worn_at`, `wear_count`, timestamps) as follows:

- **Add:** `product_code`, `size`, `product_url`, `list_price_cents`, `price_paid_cents`, `purchase_channel`, `return_by`, `return_policy`, `favorite`, `description`, `material`, `care`, `details`.
- **Replace:** the single `price_cents` is split into `list_price_cents` + `price_paid_cents`; the single `image_url` / `image_path` are replaced by the `item_photos` child table.
- **Keep:** the system fields. (`wear_count` / `last_worn_at` were kept in Phase 1 as reserved, then **dropped** by the wear-tracking feature — superseded by the `wear_events` table, [`SPEC-WEAR-DATA`](../wear-tracking/30-data-model-spec.md).)

These additive changes are applied via a **new Drizzle migration during the Phase 1 build** (not yet migrated). The app has no production data, so the split/replace are clean.
