import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Archive, Shirt, Layers } from "lucide-react";

import { getArchivedItems, getArchivedLooks } from "@/lib/queries";
import { CATEGORIES } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { ItemCard } from "@/components/item-card";
import { ArchiveViewToggle } from "@/components/archive-view-toggle";

export const dynamic = "force-dynamic";

type Archived = Awaited<ReturnType<typeof getArchivedItems>>[number];

/** One compact row in the list view — easier to scan a long history than cards. */
function ArchiveRow({ item }: { item: Archived }) {
  const photo = item.photos[0];
  return (
    <Link
      href={`/items/${item.id}`}
      className="flex items-center gap-3 border-b py-2 transition-colors hover:bg-muted/40"
    >
      <div className="relative size-14 shrink-0 overflow-hidden bg-muted">
        {photo ? (
          <Image src={photo.url} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <Shirt className="size-5" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.name}</div>
        <div className="truncate text-sm text-muted-foreground">
          {[item.brand, item.size && `Size ${item.size}`].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="shrink-0 text-right text-sm">
        {item.archiveReason ? (
          <div className="capitalize">{item.archiveReason.replace("-", " ")}</div>
        ) : null}
        <div className="text-muted-foreground">{formatDate(item.archivedAt)}</div>
      </div>
    </Link>
  );
}

type ArchivedLook = Awaited<ReturnType<typeof getArchivedLooks>>[number];

/** An archived look on the unified archive (#170) — its cover (own photo or the
 *  member collage) with the reason/date, clickable through to the look. */
function ArchivedLookCard({ look }: { look: ArchivedLook }) {
  const cover = look.coverUrls[0];
  return (
    <Link href={`/looks/${look.id}`} className="group block space-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted transition-colors group-hover:opacity-90">
        {cover ? (
          <Image src={cover} alt="" fill sizes="(max-width: 640px) 50vw, 300px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <Layers className="size-8" />
          </span>
        )}
      </div>
      <div className="px-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{look.name}</span>
          <span className="shrink-0 text-xs capitalize text-muted-foreground">{look.kind}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {look.archiveReason ? (
            <span className="capitalize">{look.archiveReason.replace(/-/g, " ")} · </span>
          ) : null}
          {formatDate(look.archivedAt)}
        </p>
      </div>
    </Link>
  );
}

/**
 * The archive (specs/archive, OP-VIEW-ARCHIVE; looks added in #170): everything
 * that has left the wardrobe — pieces grouped by category, then retired looks —
 * ordered newest-gone-first, so it reads as a timeline. Everything stays
 * clickable; an archived piece or look opens and edits (or restores) normally.
 */
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view = raw === "list" ? "list" : "grid"; // unknown values ignored

  const archived = await getArchivedItems();
  const archivedLooks = await getArchivedLooks();
  const nothing = archived.length === 0 && archivedLooks.length === 0;

  // Group by primary category, in the catalogue's own order.
  const groups = CATEGORIES.map((c) => ({
    slug: c.slug,
    label: c.label,
    items: archived.filter((i) => i.category === c.slug),
  })).filter((g) => g.items.length > 0);

  const summaryParts = [];
  if (archived.length > 0)
    summaryParts.push(`${archived.length} ${archived.length === 1 ? "piece" : "pieces"}`);
  if (archivedLooks.length > 0)
    summaryParts.push(`${archivedLooks.length} ${archivedLooks.length === 1 ? "look" : "looks"}`);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight">Archive</h1>
          <p className="text-sm text-muted-foreground">
            {nothing
              ? "Pieces and looks that have left your wardrobe."
              : `${summaryParts.join(" and ")} retired.`}
          </p>
        </div>
        {archived.length > 0 ? (
          <Suspense>
            <ArchiveViewToggle view={view} />
          </Suspense>
        ) : null}
      </div>

      {nothing ? (
        <div className="border border-dashed py-16 text-center">
          <Archive className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Nothing archived yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Archiving retires a piece you no longer own — sold, gifted, lost or
            worn out — while keeping its photos and wear history. Deleting is only
            for pieces entered by mistake.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.slug}>
              <h2 className="mb-3 flex items-baseline gap-2 font-serif text-xl font-normal">
                {g.label}
                <span className="text-sm text-muted-foreground">
                  {g.items.length}
                </span>
              </h2>

              {view === "list" ? (
                <div className="border-t">
                  {g.items.map((item) => (
                    <ArchiveRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {g.items.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <ItemCard item={item} overlays={false} />
                      <p className="px-1 text-xs text-muted-foreground">
                        {item.archiveReason ? (
                          <span className="capitalize">
                            {item.archiveReason.replace("-", " ")} ·{" "}
                          </span>
                        ) : null}
                        {formatDate(item.archivedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

          {archivedLooks.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-baseline gap-2 font-serif text-xl font-normal">
                Looks
                <span className="text-sm text-muted-foreground">{archivedLooks.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {archivedLooks.map((look) => (
                  <ArchivedLookCard key={look.id} look={look} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
