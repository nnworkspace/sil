"use client";

import * as React from "react";

import type { Item, ItemPhoto } from "@/db/schema";
import { cn } from "@/lib/utils";
import { ItemCard } from "@/components/item-card";
import { SelectionBar, useSelection } from "@/components/selection-bar";
import { Button } from "@/components/ui/button";

type Piece = Item & { photos: ItemPhoto[] };

/**
 * The browse grid, with a selection mode for batch wear logging (#320).
 *
 * A thin client shell around the existing server-rendered cards: off, this is
 * the grid exactly as it was, and `ItemCard` is untouched. On, each card is
 * covered by a selection layer instead of gaining a checkbox of its own,
 * which keeps the change out of a component used by four other pages
 * (`/browse`, `/berths`, `/category/[slug]`, `/archive`).
 *
 * There is no trip here, so no `tripId` is passed and nothing is inferred about
 * packing. That is the difference between logging from the grid and logging
 * from a trip.
 */
export function SelectableGrid({ items }: { items: Piece[] }) {
  const sel = useSelection();
  const selected = items
    .filter((i) => sel.has(i.id))
    .map((i) => ({ itemId: i.id, name: i.name }));

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => (sel.active ? sel.stop() : sel.setActive(true))}
        >
          {sel.active ? "Done" : "Select"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="relative">
            {/* Overlays off while selecting: the favourite and log-a-wear
                controls sit on the card and would swallow the tap. */}
            <ItemCard item={item} overlays={!sel.active} />
            {sel.active ? (
              <button
                type="button"
                onClick={() => sel.toggle(item.id)}
                aria-pressed={sel.has(item.id)}
                aria-label={`Select ${item.name}`}
                className={cn(
                  "absolute inset-0 z-20 rounded-xl border-2 transition-colors",
                  sel.has(item.id)
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "absolute left-2 top-2 flex size-5 items-center justify-center rounded border bg-background text-xs",
                    sel.has(item.id) && "border-primary bg-primary text-primary-foreground",
                  )}
                  aria-hidden
                >
                  {sel.has(item.id) ? "✓" : ""}
                </span>
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {sel.active && selected.length > 0 ? (
        <SelectionBar pieces={selected} onDone={sel.stop} onCancel={sel.stop} />
      ) : null}
    </div>
  );
}
