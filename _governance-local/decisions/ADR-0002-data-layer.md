# ADR-0002: Adopt PostgreSQL + Drizzle ORM, with tags as an array column

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-18 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`.
> Once a record is `Accepted`, only the status line of this table may change.
> Everything below is frozen at acceptance. To change the decision, write a new
> ADR that supersedes this one.

## Context and problem statement

The app needs to persist items, trips, and the link between them, with photos
referenced by URL. It runs on Vercel's serverless/Fluid Compute, so the data layer
must behave well with pooled, short-lived connections. The owner uses Python often
but not its web/ORM stack, and wants a data layer that is type-safe and pleasant to
learn, showing the SQL rather than hiding it.

A secondary question: how to store the tag vocabulary (casual, office, warm,
breathable, …) that items carry.

## Decision drivers

- **Type safety end-to-end**: inferred row types flowing into the app, so the
  compiler catches schema drift (a long-term maintainability lever).
- **Serverless-friendly**: works with a connection pooler; no assumption of a
  long-lived process.
- **Portable dev/prod**: the same schema and migrations run locally and in
  production with only a connection string change.
- **Learnability**: SQL-forward, low magic.
- **Simplicity proportionate to a personal app**: avoid premature normalization.

## Considered options

- **ORM:** Drizzle (SQL-first, lightweight, great TS inference) vs Prisma
  (higher-level, heavier runtime/codegen).
- **Database:** PostgreSQL (portable, serverless options like Neon) vs SQLite
  (simplest, but awkward on serverless with no persistent filesystem).
- **Tags:** a Postgres `text[]` array column on `items` vs a normalized
  `tags` + `item_tags` join.

## Decision

Adopt **PostgreSQL + Drizzle ORM**, with the **`postgres` (postgres.js)** driver
configured for a pooler (`prepare: false`). Production uses **Neon** (serverless
Postgres on the Vercel Marketplace); local development uses **Postgres in Docker**
(`docker-compose.yml`). The schema and migrations are identical, only `DATABASE_URL`
differs. Schema changes are versioned as Drizzle migrations under `drizzle/`.

Tags are stored as a **Postgres `text[]` column** on `items`, not a normalized join
table. For a personal wardrobe with a small, mostly-fixed tag vocabulary this is
simpler and still filterable (array containment); it can be normalized later if
per-tag metadata or counts are ever needed.

## Consequences

**Positive**

- Inferred types from the schema reach the whole app; schema drift is a compile
  error, not a runtime surprise.
- One schema, two environments; contributors (and CI) run a real Postgres locally
  with no cloud dependency.
- Migrations give a reviewable, revertible history of schema evolution.

**Negative / accepted trade-offs**

- `text[]` tags trade referential integrity and easy per-tag metadata for
  simplicity; a future normalization would be a migration + an ADR.
- Drizzle is younger than Prisma, with a smaller (but sufficient) ecosystem.
- postgres.js on serverless requires the pooler + `prepare: false` nuance.

**Re-evaluation triggers**

- Tags need attributes, counts, renames, or user-defined vocabularies at scale
  (normalize into a `tags` table).
- Connection/latency issues on Vercel suggest a different driver (e.g. the Neon
  serverless driver) is warranted.

## Notes

Related: ADR-0001 (stack), ADR-0003 (photo storage). Commit scope `db` (ADR-0005)
covers schema and migration work.
