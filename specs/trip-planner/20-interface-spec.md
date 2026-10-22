# AI Trip Planner — Interface Specification

- **Spec ID:** `SPEC-PLANNER-INT`
- **Part of set:** `SPEC-SET-TRIP-PLANNER` v0.1.0
- **Traceability:** `SPEC-PLANNER-FUNC` (rules §4); [ADR-0010](../../_governance-local/decisions/ADR-0010-ai-trip-planner.md), [ADR-0008](../../_governance-local/decisions/ADR-0008-ai-stack.md); reuses [`SPEC-TRIPS-INT`](../trips/20-interface-spec.md); issue #87

## 1. Purpose and scope

How the planner is exposed and wired: no new route — a **"Plan my trip"** panel on the trip page, one **Server Action** that calls the model, and the review UI that turns a proposal into `trip_items`. Reads/writes stay in Server Components + Server Actions (ADR-0008 pattern), consistent with the import feature.

## 2. Surface

No new route. On **`/trips/[id]`**, a **Plan my trip** panel:

- a **brief** textarea (seeded from `trips.brief`) + a **"Plan my trip"** button (and **Regenerate** once a proposal exists);
- a short **privacy note**: the brief and a text list of your wardrobe (no photos) are sent to the AI; you may omit personal names (`VAL-PLAN-06`);
- the **proposal review** (§4) once generated.

## 3. Server Actions

| Action | Input | Result |
|:--|:--|:--|
| `planTrip(formData)` | trip id + `brief` | saves `brief`; builds the text catalog + trip context (+ forecast if available); one `generateObject` call (Gemini, `IMPORT_MODEL`); validates ids vs. wardrobe; returns `{ ok, proposal }` (enriched) or `{ ok:false, error }`. **Writes nothing to `trip_items`.** |
| `addTripItems(formData)` | trip id + item id(s) | **reused** from trips: accept = insert `trip_item`s, on-conflict-do-nothing (`VAL-TRIP-05`); revalidates the trip |

`planTrip` mirrors the import actions: `createGoogleGenerativeAI` + `generateObject` + Zod, transient errors → a friendly "AI busy / try again" message, one call per generate (`VAL-PLAN-07`). It never writes the packing list — only `addTripItems` does, on accept.

## 4. Review UI

The proposal renders **grouped by occasion** (label · formality · time-of-day). Each piece is a row: **cover thumbnail** + name + brand + the model's one-line **reason**, with a **keep** checkbox (checked by default) and a link to the item. Below: any **gaps** as plain guidance. Controls: **Add selected to packing list** (→ `addTripItems` with the kept ids), **Regenerate** (→ `planTrip` again), and **Discard**.

- Pieces already on the trip are shown as already-added (so re-accepting is safe/idempotent).
- Accepting is **explicit and partial-able** — the owner keeps what they want; nothing is committed until they do (`VAL-PLAN-04`).

## 5. Flow — `STEP-PLAN-*`

```mermaid
sequenceDiagram
    participant O as Owner (trip page)
    participant A as planTrip (Server Action)
    participant M as Gemini (AI SDK)
    participant D as Drizzle / Postgres
    O->>A: brief + tripId
    A->>D: save trips.brief; read wardrobe + trip
    A->>M: generateObject(catalog + trip + forecast, Zod schema)
    M-->>A: proposal (occasions x ids + reasons + gaps)
    A->>A: validate ids vs wardrobe (drop unknowns), enrich
    A-->>O: proposal for review
    O->>O: keep / remove pieces
    O->>D: Add selected → addTripItems (on conflict do nothing)
    D-->>O: revalidate packing list + progress
```

- `STEP-PLAN-01` brief → `02` generate (1 call) → `03` review/curate → `04` add selected → `05` pieces join the packing list; nothing committed before `04`.

## 6. UI states

- **No brief:** the button is disabled until there's text.
- **Generating:** a busy state; the button is disabled (prevents double-spend against the daily cap).
- **AI busy / error:** a friendly message; the brief and the manual flows stay fully usable (`VAL-PLAN-07`).
- **Empty proposal / all ids dropped:** show the gaps + a prompt to refine the brief or add manually.
- **Accepted:** the kept pieces appear in the packing list (grouped by category, as usual); the proposal clears.
- The planner is **additive** — a trip is fully usable without ever opening it.
