import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";

import { TOP_LEVEL_CATEGORIES } from "@/lib/categories";
import { getCategoryCounts, getCategoryCovers } from "@/lib/queries";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WardrobeSearch } from "@/components/wardrobe-search";

export const dynamic = "force-dynamic";

/** Category-tile cover: a 2×2 grid of 4 when there are enough, a single image
 *  for 1–3, and nothing (the muted placeholder) for 0 (#76). */
function CategoryCover({ covers }: { covers: string[] }) {
  if (covers.length >= 4) {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2">
        {covers.slice(0, 4).map((url, i) => (
          <div key={i} className="relative overflow-hidden bg-muted">
            <Image src={url} alt="" fill sizes="12vw" className="object-cover" />
          </div>
        ))}
      </div>
    );
  }
  if (covers.length >= 1) {
    return (
      <Image src={covers[0]} alt="" fill sizes="(max-width: 1024px) 33vw, 25vw" className="object-cover" />
    );
  }
  return null;
}

export default async function Home() {
  const [counts, covers] = await Promise.all([
    getCategoryCounts(),
    getCategoryCovers(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <section className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl font-normal tracking-tight">
            Sil · Silhouettes, Styled in Loop
          </h1>
          <p className="max-w-prose text-muted-foreground">
            A curated collection: every piece catalogued, styled, and stowed.
          </p>
        </div>
        {/* The home page lists categories, not pieces, so there is nothing here
            to narrow. This field is an entry point and submits to /browse
            (#240). Deliberately not live: navigating away after one keystroke
            would be worse than useless. */}
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          <Suspense>
            <WardrobeSearch mode="submit" />
          </Suspense>
          <Link href="/items/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Add a piece
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Browse by category
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {TOP_LEVEL_CATEGORIES.map((category) => {
            const count = counts[category.slug] ?? 0;
            const tileCovers = covers[category.slug] ?? [];
            const hasCover = tileCovers.length > 0;
            return (
              <Link key={category.slug} href={`/category/${category.slug}`}>
                <Card className="overflow-hidden py-0 transition-colors hover:border-primary">
                  <CardContent className="relative aspect-[4/3] p-0">
                    <CategoryCover covers={tileCovers} />
                    {hasCover ? (
                      // Label over the imagery, with a scrim for legibility.
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-3 pt-8">
                        <span className="text-lg font-medium text-white">{category.label}</span>
                        <span className="text-sm text-white/80">
                          {count} {count === 1 ? "piece" : "pieces"}
                        </span>
                      </div>
                    ) : (
                      // No imagery yet: the plain centred placeholder.
                      <div className="flex h-full flex-col items-center justify-center gap-1 bg-muted/40 p-4 text-center">
                        <span className="text-lg font-medium">{category.label}</span>
                        <span className="text-sm text-muted-foreground">
                          {count} {count === 1 ? "piece" : "pieces"}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
