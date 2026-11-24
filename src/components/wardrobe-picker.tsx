"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Shirt, Check, SlidersHorizontal, X } from "lucide-react";

import {
  CATEGORIES,
  TOP_LEVEL_CATEGORIES,
  TAG_GROUPS,
  categoryMatcher,
  childrenOf,
} from "@/lib/categories";
import { COLOR_FAMILIES, colorFamiliesOf } from "@/lib/colors";
import { MATERIAL_FACETS } from "@/lib/materials";
import { containsToken } from "@/lib/compendium/match";
import { sortItems } from "@/lib/sort";
import { rootCategory } from "@/lib/trips";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChoiceDropdown, FacetDropdown, SortDropdown } from "@/components/facet-dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type PickerItem = {
  id: string;
  name: string;
  category: string;
  secondaryCategories: string[];
  photoUrl: string | null;
  // For the picker's filters (#113) + sort, sourced from the browse rows.
  tags: string[];
  color: string | null;
  /** The composition label, for the material facet (#299). Its absence is why
   *  the picker had no material filter: #263 added the facet to Browse, and
   *  this type could not carry the question. */
  material: string | null;
  pricePaidCents: number | null;
  purchasedAt: string | null;
  createdAt: Date;
  priorWears: number | null;
  wearEvents: { wornAt: string }[];
};

const label = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

/** "Add from wardrobe": a multi-select picker rendered as a **thumbnail grid**,
 *  with a pinned **Selected** tray (removable chips) above the scrolling grid.
 *  Grouped by category, or filtered to one category (`scope`). Already-added
 *  pieces are disabled. Generic over the target: it posts the selected ids (as
 *  `itemIds`) plus a `contextField`=`contextId` hidden input to `action`. Used
 *  by both trips (addTripItems) and looks (addLookItems) (#90, #95). */
export function WardrobePicker({
  action,
  contextField,
  contextId,
  items,
  addedIds,
  scope,
  triggerLabel,
  compact,
  extra,
}: {
  action: (formData: FormData) => void | Promise<void>;
  contextField: string;
  contextId: string;
  items: PickerItem[];
  addedIds: string[];
  scope?: string;
  triggerLabel?: string;
  compact?: boolean;
  /** Extra hidden fields posted with the selection: the day a piece is being
   *  planned for (#270). Kept generic so the picker stays one component. */
  extra?: Record<string, string>;
}) {
  const added = React.useMemo(() => new Set(addedIds), [addedIds]);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = React.useState<Set<string>>(new Set());
  const [selectedMaterials, setSelectedMaterials] = React.useState<Set<string>>(new Set());
  const [sortValue, setSortValue] = React.useState("new");
  const [showFilters, setShowFilters] = React.useState(false);

  const openPicker = () => {
    setSelected(new Set());
    setQ("");
    setSelectedTags(new Set());
    setSelectedColors(new Set());
    setSelectedMaterials(new Set());
    setSortValue("new");
    setShowFilters(false);
    setCat(undefined);
    setSub(undefined);
    setOpen(true);
  };

  const toggleFrom = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (v: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const inScope = React.useMemo(
    () => (scope ? categoryMatcher(scope) : null),
    [scope],
  );

  /**
   * Browsing by chips rather than by scrolling (#284).
   *
   * `cat` is the chosen top-level category (undefined = All) and `sub` the
   * chosen child within it (undefined = the roll-up, `"none"` = filed at the
   * parent with no sub-type). One of each, because only one category is on
   * screen at a time now; #280 keyed the sub-choice per group because every
   * group was rendered at once, and that is exactly what changed.
   *
   * Local dialog state, not the URL: the picker is a modal, so its state is not
   * carried in the address bar the way the category page's `?sub=` is
   * (SPEC-TRIPS-INT §3.4). It resets when the dialog is reopened.
   */
  const [cat, setCat] = React.useState<string | undefined>(undefined);
  const [sub, setSub] = React.useState<string | undefined>(undefined);

  const term = q.trim().toLowerCase();
  // Through the shared rule (#211) rather than raw keyword substrings.
  const colorMatches = React.useMemo(
    () => (c: string | null | undefined) =>
      selectedColors.size === 0 ||
      colorFamiliesOf(c).some((f) => selectedColors.has(f)),
    [selectedColors],
  );
  const activeFilters = selectedTags.size + selectedColors.size + selectedMaterials.size;

  /**
   * Material, through the **same vocabulary** the browse filter uses (#299):
   * `MATERIAL_FACETS`, derived from the Compendium's fibre entries, so there is
   * no second token list to drift (`VAL-BROWSE-18`).
   *
   * The matching differs, and deliberately: browse hands SQL an approximation
   * because SQL cannot call the matcher per row, while the picker has the
   * pieces in memory and can use `containsToken` itself (boundaries, negation
   * guard and all). The same rule, applied more precisely, not a different one.
   */
  const matchesMaterial = (i: PickerItem) => {
    if (selectedMaterials.size === 0) return true;
    const text = i.material ?? "";
    if (!text) return false;
    return MATERIAL_FACETS.filter((f) => selectedMaterials.has(f.key)).some((f) =>
      f.tokens.some((t) => containsToken(text, t)),
    );
  };

  const matchesTags = (i: PickerItem) => {
    for (const g of TAG_GROUPS) {
      const sel = g.tags.filter((t) => selectedTags.has(t));
      if (sel.length > 0 && !sel.some((t) => i.tags.includes(t))) return false;
    }
    return true;
  };
  const matchesColor = (i: PickerItem) => colorMatches(i.color);
  const matchesSearch = (i: PickerItem) =>
    !term ||
    i.name.toLowerCase().includes(term) ||
    (i.color ?? "").toLowerCase().includes(term) ||
    i.tags.some((t) => t.toLowerCase().includes(term));

  const filtered = items.filter(
    (i) =>
      (!inScope || inScope(i)) &&
      matchesSearch(i) &&
      matchesTags(i) &&
      matchesColor(i) &&
      matchesMaterial(i),
  );
  const shown = sortItems(filtered, sortValue);

  /**
   * What the chips are pointing at (#284).
   *
   * `shown` has already been through search, tags, colour and sort. The chips
   * narrow it in two steps, and the counts on them are computed from the same
   * filtered set, so a chip reading `0` tells you not to click it, rather than
   * promising pieces the current search has already excluded.
   */
  const root = scope ?? cat;
  const inRoot = (i: PickerItem) =>
    !root || (scope ? true : rootCategory(i.category) === root);

  const narrow = (rows: PickerItem[]) => {
    if (!root || !sub) return rows;
    // `none` is the "Not categorised" bucket: filed at the parent itself, with
    // no sub-type chosen. It is the honest counterpart of the roll-up, and how
    // a piece missing its sub-type gets noticed at all.
    if (sub === "none") return rows.filter((i) => i.category === root);
    const inChild = categoryMatcher(sub);
    return rows.filter((i) => inChild(i));
  };

  const inCategory = shown.filter(inRoot);
  const visible = narrow(inCategory);

  const selectedItems = items.filter((i) => selected.has(i.id));

  /**
   * Category and sub-category, as dropdowns (#296).
   *
   * They were chips until the dialog showed what that costs: height is the
   * scarce resource here (`max-h-88vh`), and fourteen categories wrap to two
   * rows on a desktop and four or five on a phone, every one of them taken
   * from the pieces, which are the thing the picker exists to show. A dropdown
   * is one row on both, and matches the sort control already beside it.
   *
   * **No counts.** The owner asked for them gone; they made each option twice
   * as wide for a number she was not reading.
   */
  const categoryChooser = scope ? null : (
    <ChoiceDropdown
      label="Category"
      value={cat ?? "all"}
      onChange={(v) => {
        setCat(v === "all" ? undefined : v);
        // A sub-choice belongs to the category it was made in; carrying it
        // across would filter Tops by `slip-dresses` and show nothing.
        setSub(undefined);
      }}
      options={[
        { value: "all", label: "All categories" },
        // Only categories with something in them, after the current search and
        // filters: an option that leads to an empty grid is a dead end.
        ...TOP_LEVEL_CATEGORIES.filter(
          (c) => cat === c.slug || shown.some((i) => rootCategory(i.category) === c.slug),
        ).map((c) => ({ value: c.slug, label: c.label })),
      ]}
    />
  );

  const subChooser = (() => {
    if (!root) return null;
    const kids = childrenOf(root);
    if (kids.length === 0) return null;
    const hasDirect = inCategory.some((i) => i.category === root);

    return (
      <ChoiceDropdown
        label={`${label(root)} type`}
        value={sub ?? "all"}
        onChange={(v) => setSub(v === "all" ? undefined : v)}
        options={[
          { value: "all", label: `All ${label(root).toLowerCase()}` },
          ...kids.map((k) => ({ value: k.slug, label: k.label })),
          // Filed at the parent with no sub-type chosen: the honest
          // counterpart of the roll-up. Offered only when there are any.
          ...(hasDirect ? [{ value: "none", label: "Not categorised" }] : []),
        ]}
      />
    );
  })();

  const card = (item: PickerItem) => {
    const isAdded = added.has(item.id);
    const isSel = selected.has(item.id);
    return (
      <button
        type="button"
        key={item.id}
        disabled={isAdded}
        onClick={() => toggle(item.id)}
        className={cn("relative block text-left", isAdded && "cursor-default")}
      >
        <div
          className={cn(
            "overflow-hidden rounded-lg border bg-card transition-colors",
            isSel && "border-primary ring-2 ring-primary",
            isAdded ? "opacity-50" : "hover:border-primary",
          )}
        >
          <div className="relative aspect-[3/4] bg-muted">
            {item.photoUrl ? (
              <Image
                src={item.photoUrl}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 33vw, 180px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-muted-foreground">
                <Shirt className="size-6" />
              </span>
            )}
            {isAdded ? (
              <span className="absolute inset-x-0 bottom-0 bg-background/85 py-0.5 text-center text-[11px] text-muted-foreground">
                Added
              </span>
            ) : null}
          </div>
          <div className="p-1.5">
            <div className="truncate text-xs font-medium">{item.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {label(item.category)}
            </div>
          </div>
        </div>
        {isSel && !isAdded ? (
          <span className="pointer-events-none absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="size-3" />
          </span>
        ) : null}
      </button>
    );
  };

  const grid = "grid grid-cols-2 gap-2 sm:grid-cols-3";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={openPicker}
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            : buttonVariants()
        }
      >
        <Plus className={compact ? "size-3.5" : "size-4"} />
        {triggerLabel ?? "Add from wardrobe"}
      </button>
      {/* An explicit row template, so the child count here is load-bearing:
          six children, six tracks, and `1fr` must land on the scrolling grid.
          #284 added the category chooser without extending this and it
          inherited the `1fr` track, which, with the grid then on an implicit
          `auto` row and the dialog capped at 88vh, left it zero free space to
          occupy. It collapsed to its own scrollbar, silently: no error, and a
          component test cannot see it, because jsdom has no layout (#294).
          Hence the wrapper below: `subChooser` renders conditionally, and
          without it the tracks would shift with what was selected. */}
      <DialogContent className="grid max-h-[88vh] grid-rows-[auto_auto_auto_auto_1fr_auto] gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{scope ? `Add ${label(scope)}` : "Add from wardrobe"}</DialogTitle>
          <DialogDescription>
            Tap pieces to select them; they collect in “Selected” above the list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pieces…"
              aria-label="Search wardrobe pieces"
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <SortDropdown value={sortValue} onChange={setSortValue} />
            <button
              type="button"
              onClick={() => setShowFilters((o) => !o)}
              aria-expanded={showFilters}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs transition-colors",
                activeFilters > 0
                  ? "border-primary text-foreground"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {activeFilters}
                </span>
              ) : null}
            </button>
          </div>
          {showFilters ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
              {TAG_GROUPS.map((g) => (
                <FacetDropdown
                  key={g.kind}
                  label={g.label}
                  options={g.tags.map((t) => ({ value: t, label: t }))}
                  selected={[...selectedTags]}
                  onToggle={toggleFrom(setSelectedTags)}
                />
              ))}
              <FacetDropdown
                label="Colour"
                options={COLOR_FAMILIES.map((f) => ({ value: f.key, label: f.label }))}
                selected={[...selectedColors]}
                onToggle={toggleFrom(setSelectedColors)}
              />
              <FacetDropdown
                label="Material"
                options={MATERIAL_FACETS.map((f) => ({ value: f.key, label: f.label }))}
                selected={[...selectedMaterials]}
                onToggle={toggleFrom(setSelectedMaterials)}
              />
              {activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTags(new Set());
                    setSelectedColors(new Set());
                    setSelectedMaterials(new Set());
                  }}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" /> Clear
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {selectedItems.length > 0 ? (
          <div className="rounded-md border bg-muted/30 p-2">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Selected ({selectedItems.length})
            </div>
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              {selectedItems.map((i) => (
                <span
                  key={i.id}
                  className="flex items-center gap-1 rounded-md border bg-background py-0.5 pl-0.5 pr-1.5 text-xs"
                >
                  <span className="relative size-5 shrink-0 overflow-hidden rounded bg-muted">
                    {i.photoUrl ? (
                      <Image src={i.photoUrl} alt="" fill sizes="20px" className="object-cover" />
                    ) : null}
                  </span>
                  <span className="max-w-[8rem] truncate">{i.name}</span>
                  <button
                    type="button"
                    onClick={() => toggle(i.id)}
                    aria-label={`Remove ${i.name}`}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nothing selected yet.</p>
        )}

        {/* One grid child whatever the state. See the note on DialogContent. */}
        <div className="flex flex-wrap items-center gap-2">
          {categoryChooser}
          {subChooser}
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No pieces{term || activeFilters > 0 ? " match your filters" : ""}.
            </p>
          ) : (
            // A flat grid: the chips now say what you are looking at, and every
            // card already prints its own category beneath the name, so group
            // headings would repeat both.
            <div className={grid}>{visible.map(card)}</div>
          )}
        </div>

        <form action={action} onSubmit={() => setOpen(false)} className="flex justify-end gap-2 border-t pt-3">
          <input type="hidden" name={contextField} value={contextId} />
          {Object.entries(extra ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="itemIds" value={id} />
          ))}
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={selected.size === 0}>
            Add selected{selected.size ? ` (${selected.size})` : ""}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
