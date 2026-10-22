import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { CATEGORIES, childrenOf, parentOf } from "@/lib/categories";
import {
  getItemsByCategory,
  getItemsDirectlyInCategory,
} from "@/lib/queries";
import { parseBrowseParams } from "@/lib/browse";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ItemCard } from "@/components/item-card";
import { BrowseFilters } from "@/components/browse-filters";
import { WardrobeSearch } from "@/components/wardrobe-search";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sub = typeof sp.sub === "string" ? sp.sub : undefined;
  const browse = parseBrowseParams(sp);
  const filtered = browse.tags.length > 0 || browse.colors.length > 0 || browse.q.length > 0;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  // Sub-category filter row (#78). A page belongs to a "family" when it either
  // has children (a parent like Tops/Jewellery) or has a parent (a leaf like
  // T-Shirts). We show the same dezent chip row on every page of the family:
  // "All <parent>" plus each sibling, with the current one marked — so you can
  // click between them. Leaf-less top-level categories show nothing.
  const familyRoot = childrenOf(slug).length > 0 ? slug : parentOf(slug);
  const rootCategory = familyRoot
    ? CATEGORIES.find((c) => c.slug === familyRoot)
    : undefined;
  const siblings = familyRoot ? childrenOf(familyRoot) : [];

  // A parent (a page with children) also gets a "Not categorised" chip via
  // `?sub=none`: the bucket of pieces filed directly at the parent with no
  // sub-type chosen yet. "All <parent>" stays the full roll-up.
  const isParent = childrenOf(slug).length > 0;
  const notCategorised = isParent && sub === "none";
  const items = notCategorised
    ? await getItemsDirectlyInCategory(slug, browse)
    : await getItemsByCategory(slug, browse);

  const chipClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1 text-sm transition-colors",
      active
        ? "bg-muted font-medium text-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Search sits in the header, before "Add a piece" (#240) — it was the
          most-used control on the page and it was hidden inside a collapsed
          panel. `flex-wrap` is what makes the phone case work: the search bar
          drops to its own full-width row once it is opened. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-normal tracking-tight">
          {category.label}
        </h1>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <Suspense>
            <WardrobeSearch q={browse.q} />
          </Suspense>
          <Link href="/items/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Add a piece
          </Link>
        </div>
      </div>

      {rootCategory && siblings.length > 0 && (
        <nav
          aria-label="Sub-categories"
          className="mb-6 -ml-3 flex flex-wrap items-center gap-1"
        >
          <Link
            href={`/category/${rootCategory.slug}`}
            className={chipClass(slug === rootCategory.slug && !notCategorised)}
          >
            All {rootCategory.label}
          </Link>
          {siblings.map((child) => (
            <Link
              key={child.slug}
              href={`/category/${child.slug}`}
              className={chipClass(slug === child.slug)}
            >
              {child.label}
            </Link>
          ))}
          <Link
            href={`/category/${rootCategory.slug}?sub=none`}
            className={chipClass(notCategorised)}
          >
            Not categorised
          </Link>
        </nav>
      )}

      <Suspense>
        <BrowseFilters
          selectedTags={browse.tags}
          colors={browse.colors}
          materials={browse.materials}
          q={browse.q}
          sort={browse.sort}
          favorite={browse.favorite}
          count={items.length}
        />
      </Suspense>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          {filtered ? (
            <p className="text-muted-foreground">No pieces match these filters.</p>
          ) : notCategorised ? (
            <p className="text-muted-foreground">
              Everything in {category.label} has a sub-category. Nothing left to
              sort.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                No {category.label.toLowerCase()} yet.
              </p>
              <Link
                href="/items/new"
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-4",
                })}
              >
                <Plus className="size-4" />
                Add your first piece
              </Link>
            </>
          )}
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
