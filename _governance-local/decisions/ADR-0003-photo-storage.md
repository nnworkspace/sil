# ADR-0003: Store photos in Vercel Blob, with a local filesystem fallback in dev

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

The app is photo-centric: each item has one or more photos, typically large images
straight from a phone. These binaries must be stored somewhere durable and served
efficiently. Vercel's runtime filesystem is read-only in production, so photos
cannot be written into the deployed app. Local development, however, benefits from
not needing any cloud credentials to iterate.

## Decision drivers

- **Durable, production-grade object storage** served over a CDN, resizable via
  `next/image`.
- **No write access to the app filesystem in production** on Vercel.
- **Frictionless local dev**: building and testing uploads without cloud setup.
- **Vercel-native** to keep the deployment story simple.
- **Portability**: the storage choice should sit behind a small interface so it
  can change without touching feature code.

## Considered options

1. **Vercel Blob**: native to the platform, public/private support, minimal setup.
2. **Cloudflare R2 / AWS S3**: S3-compatible, cheap egress (R2), but extra
   accounts/config and not Vercel-native.
3. **Store bytes in Postgres**: one datastore, but bloats the DB and is poor for
   CDN delivery.
4. **Local filesystem only**: trivial in dev, impossible in production on Vercel.

## Decision

Store photos in **Vercel Blob** in production. Access goes through a small
**storage abstraction** so feature code never calls the provider directly: when
`BLOB_READ_WRITE_TOKEN` is present the abstraction uses Vercel Blob; in local
development, with no token, it falls back to the **local filesystem**
(`public/uploads/`, git-ignored) so uploads work with zero cloud setup. Only the
photo's URL (and blob pathname, for deletion) is persisted in the database
(ADR-0002).

## Consequences

**Positive**

- Production photos are durable and CDN-served, resized by `next/image`.
- Local development needs no cloud credentials; uploads just work.
- The abstraction keeps the provider swappable (portability hedge).

**Negative / accepted trade-offs**

- Two code paths (Blob vs filesystem) to keep behaviorally aligned; the dev path
  is not exercised in production.
- Local-uploaded files are not shared between machines (acceptable for dev).
- Vercel Blob is another platform-coupled dependency, mitigated by the abstraction.

**Re-evaluation triggers**

- Storage cost or egress at scale favors R2/S3.
- A need for image transforms/variants beyond what `next/image` provides.

## Notes

Related: ADR-0001 (stack), ADR-0002 (data layer). Provisioning Vercel Blob is a
deploy-time step done together with the owner. Commit scope `infra` (ADR-0005)
covers storage wiring.
