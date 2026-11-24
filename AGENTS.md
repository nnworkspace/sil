<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes: APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wardrobe: how to work in this repo

This file is loaded automatically each session (via `CLAUDE.md` → `@AGENTS.md`). It is the short operational digest for anyone, human or AI, working here. Read the linked documents for detail; do not restate them.

## Where the knowledge lives

- **Decisions (the *why*)**: Architecture Decision Records in [`_governance-local/decisions/`](_governance-local/decisions/). They are frozen at acceptance; to change one, write a new ADR that supersedes it. Process + template are in that folder.
- **Architecture (the *how it fits together*)**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Read this first for the whole-system picture (stack, data model, deployment, conventions).
- **Feature specs (the *what*, field-level)**: per-feature spec sets under [`specs/`](specs/) (README + functional + interface + data-model). Written before the feature is built.
- **How the repo is run (for humans)**: [`README.md`](README.md).

## How we work

- **Spec-driven.** Write/refresh the architecture doc and the feature's spec set *before* writing code. Keep specs truthful: if code and spec diverge, fix the spec.
- **Ticket-first, then pause.** Before starting any build phase, open a GitHub issue (with a checklist), then **pause for the maintainer's review**. Build only after approval. Do not run ahead.
- **Branching follows GitHub Flow** (ADR-0004): `main` is always deployable; every change goes on a short-lived branch (`feat/*`, `fix/*`, `chore/*`) → squash-merged PR. Releases are tags. Don't merge PRs yourself unless asked; open them and pause for review.
- **Commits follow Conventional Commits**, enforced by commitlint (ADR-0005): `type(scope): subject`, a **mandatory scope** from the `scope-enum`, and a **mandatory issue footer** in colon form (`Refs: #N` / `Closes: #N`). Trivial commits reference a standing housekeeping umbrella issue (#2 in the original tracker; use your own tracker's equivalent). `test` is a valid type (ADR-0014) **only** when a commit changes nothing but tests, fixtures or test config. A fix that ships with its regression test stays a `fix`. **Do not add an AI co-author trailer** to commit messages.
- **Prose formatting.** In Markdown and prose, **do not hard-wrap**: keep one long line per paragraph and let editors soft-wrap. **No em dashes** (U+2014) anywhere: docs, specs, ADRs, code comments, test names, UI copy, and Chinese text (no 破折号 either). Use a colon, a comma, parentheses, a semicolon or a new sentence instead, never a hyphen or an en dash. The only exceptions are a lone em dash placeholder for an empty value in the UI, and the applied migrations in `drizzle/`, whose bytes are hashed.
- **Verify before finishing.** Run `pnpm test`, `pnpm lint` and `pnpm build`; for anything with runtime behaviour, drive the actual flow (the dev server / browser) rather than trusting types alone.

## Quick start

See the README for local setup (`pnpm install`, `docker compose up -d`, `pnpm db:migrate`, `pnpm dev`).
