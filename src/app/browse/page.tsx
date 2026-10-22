import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { getBrowseItems } from "@/lib/queries";
import { parseBrowseParams } from "@/lib/browse";
import { buttonVariants } from "@/components/ui/button";
import { BrowseFilters } from "@/components/browse-filters";
import { SelectableGrid } from "@/components/selectable-grid";
import { WardrobeSearch } from "@/components/wardrobe-search";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tags, q, colors, materials, sort, favorite, missing } = parseBrowseParams(await searchParams);
  const items = await getBrowseItems({ tags, q, colors, materials, sort, favorite, missing });
  const active =
    tags.length > 0 || colors.length > 0 || materials.length > 0 || q.length > 0 || favorite;

  // Arriving from a Gaps row on Figures (#181). Say so plainly, and offer the
  // way back — otherwise a filtered wardrobe looks like a missing one.
  const MISSING_LABEL: Record<string, string> = {
    wears: "no wear history recorded",
    price: "no price",
    date: "no purchase date",
    material: "no material",
    berth: "no berth",
    photo: "no photo",
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Same header treatment as a category page (#240) — `/browse` renders the
          same filter panel, so moving the field out of it had to land here too
          or Browse would simply have lost its search. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-normal tracking-tight">Browse</h1>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <Suspense>
            <WardrobeSearch q={q} />
          </Suspense>
          <Link href="/items/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Add a piece
          </Link>
        </div>
      </div>

      {missing ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 border bg-muted/40 px-4 py-3 text-sm">
          <span className="font-medium">{items.length}</span>
          <span>
            {items.length === 1 ? "piece has" : "pieces have"} {MISSING_LABEL[missing]}.
          </span>
          <Link href="/figures#gaps" className="text-muted-foreground underline">
            back to Gaps
          </Link>
          <Link href="/browse" className="text-muted-foreground underline">
            clear
          </Link>
        </div>
      ) : null}

      <Suspense>
        <BrowseFilters
          selectedTags={tags}
          colors={colors}
          materials={materials}
          q={q}
          sort={sort}
          favorite={favorite}
          count={items.length}
        />
      </Suspense>

      {items.length === 0 ? (
        <div className="border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {active
              ? "No pieces match these filters."
              : "Your wardrobe is empty."}
          </p>
          {active ? (
            <Link
              href="/browse"
              className={buttonVariants({ variant: "outline", className: "mt-4" })}
            >
              Clear filters
            </Link>
          ) : (
            <Link
              href="/items/new"
              className={buttonVariants({ variant: "outline", className: "mt-4" })}
            >
              <Plus className="size-4" />
              Add your first piece
            </Link>
          )}
        </div>
      ) : (
        <SelectableGrid items={items} />
      )}
    </div>
  );
}
