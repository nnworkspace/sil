import Link from "next/link";
import { MapPin, ChevronLeft, Shirt } from "lucide-react";

import { getBerths, getItemsByBerth } from "@/lib/queries";
import { ItemCard } from "@/components/item-card";
import { CopyButton } from "@/components/copy-button";
import { formatBerthSummary } from "@/lib/berths";

export const dynamic = "force-dynamic";

/**
 * Browse by berth (#172): where pieces are physically kept. The index lists each
 * berth with a count; picking one shows the pieces stored there — so the everyday
 * "I want this, where is it?" (and its inverse, "what's in the attic?") are both
 * one click away.
 */
export default async function BerthsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.loc) ? sp.loc[0] : sp.loc;
  const loc = typeof raw === "string" ? raw.trim() : "";

  if (loc) {
    const items = await getItemsByBerth(loc);
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/berths"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          All berths
        </Link>
        <h1 className="flex items-center gap-2 font-serif text-3xl font-normal tracking-tight">
          <MapPin className="size-6 text-primary" />
          {loc}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "piece" : "pieces"} kept here
        </p>

        {items.length === 0 ? (
          <div className="border border-dashed py-16 text-center text-muted-foreground">
            Nothing is kept here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const berths = await getBerths();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-1 flex items-center gap-2">
        <MapPin className="size-6 text-primary" />
        <h1 className="font-serif text-3xl font-normal tracking-tight">Berths</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Where your pieces are kept — pick a berth to see what&apos;s stored there.
      </p>

      {berths.length === 0 ? (
        <div className="border border-dashed py-16 text-center">
          <Shirt className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No berths yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add a <strong>Berth</strong> to a piece (edit it) to record where it&apos;s kept — then
            it shows up here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {berths.map((b) => (
            // Stretched link (#217): the copy button has to sit inside the
            // card, and a <button> cannot live inside an <a>.
            <li key={b.location} className="group relative">
              <div className="rounded-lg border px-4 py-3 transition-colors group-hover:border-primary">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{b.location}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                    {b.count} {b.count === 1 ? "piece" : "pieces"}
                    <CopyButton
                      value={b.location}
                      label={`Copy berth code ${b.location}`}
                      className="relative z-10 border bg-background hover:bg-muted"
                    />
                  </span>
                </div>
                {/* What is actually in there (#219) — worked out from the pieces
                    on every render, so moving one updates this by itself. A
                    second line rather than beside the code: the summaries vary
                    in length and truncating one hides the very category that
                    makes it worth reading. */}
                {formatBerthSummary(b.categories) ? (
                  <p className="mt-0.5 truncate pl-6 text-sm text-muted-foreground">
                    {formatBerthSummary(b.categories)}
                  </p>
                ) : null}
              </div>
              <Link
                href={`/berths?loc=${encodeURIComponent(b.location)}`}
                aria-label={`${b.location}, ${b.count} ${b.count === 1 ? "piece" : "pieces"}`}
                className="absolute inset-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
