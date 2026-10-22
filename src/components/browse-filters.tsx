"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Heart, SlidersHorizontal, X } from "lucide-react";

import { TAG_GROUPS } from "@/lib/categories";
import { COLOR_FAMILIES } from "@/lib/colors";
import { MATERIAL_FACETS } from "@/lib/materials";
import { cn } from "@/lib/utils";
import { FacetDropdown, SortDropdown } from "@/components/facet-dropdown";

/**
 * Browse / category filter panel (SPEC-BROWSE-INT §4, #105). A collapsible
 * "Filter & sort" panel — collapsed by default, auto-open when any filter is
 * active — holding one compact multi-select **dropdown per facet** (occasion /
 * feel / season / care / colour / material). All state lives in the URL, so a filtered
 * view is shareable and survives refresh. On a category page the category path
 * is preserved; only tag/colour/q are cleared by "Clear all".
 *
 * **The keyword box is no longer here** (#240). It moved to the page header,
 * beside "Add a piece", because a collapsed panel hid the control used most.
 * The query is still one of this panel's filters — it counts towards the
 * "n active" badge and "Clear all" still clears it — it is simply rendered
 * somewhere else. See `wardrobe-search.tsx`.
 */
export function BrowseFilters({
  selectedTags,
  colors,
  materials = [],
  q,
  sort,
  count,
  favorite = false,
}: {
  selectedTags: string[];
  colors: string[];
  /** Fibre facets (#263), derived from the Compendium's own vocabulary. */
  materials?: string[];
  q: string;
  sort: string;
  count: number;
  /** "Favourites only" (#135). */
  favorite?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCount =
    selectedTags.length + colors.length + materials.length + (q ? 1 : 0) + (favorite ? 1 : 0);
  const [open, setOpen] = React.useState(activeCount > 0);

  const commit = React.useCallback(
    (next: URLSearchParams) => {
      const s = next.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const toggleValue = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const set = new Set(next.getAll(name));
    if (set.has(value)) set.delete(value);
    else set.add(value);
    next.delete(name);
    for (const v of set) next.append(name, v);
    commit(next);
  };

  const toggleFavorite = () => {
    const next = new URLSearchParams(searchParams.toString());
    if (favorite) next.delete("favorite");
    else next.set("favorite", "1");
    commit(next);
  };

  const setSort = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value && value !== "new") next.set("sort", value);
    else next.delete("sort");
    commit(next);
  };

  // Still clears `q` even though the field lives in the header now (#240): the
  // query is one of the active filters and "Clear all" must mean all. The
  // header field adopts the change because it watches the `q` it is given.
  const clearAll = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("tag");
    next.delete("color");
    next.delete("material");
    next.delete("q");
    next.delete("favorite");
    commit(next);
  };

  return (
    <div className="mb-8 border bg-muted/30">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-sm font-medium"
        >
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          Filter &amp; sort
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeCount} active
            </span>
          ) : null}
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {count} {count === 1 ? "piece" : "pieces"}
        </span>
        <SortDropdown value={sort} onChange={setSort} />
      </div>

      {open ? (
        <div className="space-y-3 border-t p-4">
          <div className="flex flex-wrap items-center gap-2">
            {TAG_GROUPS.map((group) => (
              <FacetDropdown
                key={group.kind}
                label={group.label}
                options={group.tags.map((t) => ({ value: t, label: t }))}
                selected={selectedTags}
                onToggle={(v) => toggleValue("tag", v)}
              />
            ))}
            <FacetDropdown
              label="Colour"
              options={COLOR_FAMILIES.map((f) => ({ value: f.key, label: f.label }))}
              selected={colors}
              onToggle={(v) => toggleValue("color", v)}
            />
            {/* Material (#263). The options are the Compendium's fibre entries,
                so the filter and the glossary cannot drift apart — the same
                discipline `colorMatchSpec` enforces for colour. */}
            <FacetDropdown
              label="Material"
              options={MATERIAL_FACETS.map((f) => ({ value: f.key, label: f.label }))}
              selected={materials}
              onToggle={(v) => toggleValue("material", v)}
            />
            {/* Favourites-only toggle (#135) — combines with every other facet. */}
            <button
              type="button"
              onClick={toggleFavorite}
              aria-pressed={favorite}
              className={cn(
                "flex h-9 items-center gap-1.5 border px-3 text-sm transition-colors",
                favorite
                  ? "border-primary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart
                className={cn("size-4", favorite && "fill-rose-500 text-rose-500")}
              />
              Favourites
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" /> Clear all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
