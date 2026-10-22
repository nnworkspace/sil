# specs

Per-feature **specification sets**. We work spec-first: a feature's spec is written and agreed before it is built, and kept truthful as the code evolves.

Each set is a folder with layered, single-concern files, numbered by reading order (intent → detail):

| File | Role |
|:--|:--|
| `README.md` | Purpose, scope (in/out), traceability, reading guide |
| `manifest.yaml` | Machine-readable inventory (id, version, artefacts) |
| `10-functional-spec.md` | Lifecycle, operations, business rules (`VAL-*`) |
| `20-interface-spec.md` | Routes / Server Actions / flows (Mermaid) |
| `30-data-model-spec.md` | Field-level data contract (when the feature has one) |

Not every set needs every file — the structure flexes to the feature.

## Spec sets

| Set | Feature |
|:--|:--|
| [catalog/](catalog/) | The Catalog: create/view/edit/delete items with photos, browse by category (Phase 1) |
| [ai-import/](ai-import/) | AI-assisted import from a screenshot or a saved product page (Phase 1.5) |
| [browse/](browse/) | Browse, filter (tags: occasion / feel / season / care + style facets; colour families) & keyword search the wardrobe; a collapsible dropdown panel, also on category pages (Phase 2, #105/#106) |
| [wear-tracking/](wear-tracking/) | Log wears (date + occasion); worn-count / last-worn / cost-per-wear |
| [trips/](trips/) | Trips & packing: build a packing list from the wardrobe, with a packing plan (Phase 3) |
| [trip-planner/](trip-planner/) | AI packing planner for a trip — one-shot, human-in-the-loop |
| [looks/](looks/) | Looks & sets: group pieces into styled combinations; "goes with" on a piece's page (Phase 4) |
| [archive/](archive/) | Retire a piece (or a look) with a reason instead of deleting it |
| [auth/](auth/) | Single-owner authentication (Auth.js, Google) gating the whole app |
| [weather/](weather/) | Concise 10-day forecast in the header (Open-Meteo, keyless) |
| [berths/](berths/) | **Berths** — where each piece physically lives: the index of storage locations, what each holds, and ordering by the notation (#172, #175, #219, #227) |
| [figures/](figures/) | **Figures** — the statistics tab: composition, spending, wear & value, and the data gaps (Phase 5, #181) |
| [compendium/](compendium/) | **Compendium** — the reference area: materials as a glossary (term as the trade says it, explanation in Chinese, linked to the pieces) and the berth notation (Phase 6, #213) |

Traceability: specs link to the ADRs ([`../_governance-local/decisions/`](../_governance-local/decisions/)) for decisions, and cite issue numbers (e.g. #105) as historical markers of the work.
