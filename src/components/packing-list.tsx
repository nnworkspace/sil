"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarPlus, Check, Shirt, X } from "lucide-react";

import { setPacked, removeTripItem } from "@/app/trips/actions";
import { cn } from "@/lib/utils";
import { PackingRow } from "@/components/packing-row";
import { SelectionBar, useSelection } from "@/components/selection-bar";
import { Button } from "@/components/ui/button";
import { ViewToggle, type ItemView } from "@/components/view-toggle";

export type PackingPiece = {
  itemId: string;
  name: string;
  brand: string | null;
  photoUrl: string | null;
  packed: boolean;
  /** Short day labels from the day plan (#270); absent when the trip has none. */
  days?: string[];
};

export type PackingGroup = { label: string; items: PackingPiece[] };

/** The trip's packing list, grouped by category, switchable between a **list**
 *  and a **grid** (cards with a bottom name overlay). Each piece keeps its packed
 *  toggle and remove. */
export function PackingList({
  tripId,
  groups,
  addControl,
}: {
  tripId: string;
  groups: PackingGroup[];
  /** The "Add from wardrobe" picker, rendered by the page. Passed in as a slot
   *  so it can sit beside "Log a wear" (#320): the two are the list's actions,
   *  and separating them left the wear path unfindable. */
  addControl?: React.ReactNode;
}) {
  const [view, setView] = React.useState<ItemView>("list");
  const sel = useSelection();

  // The list is grouped for reading; the batch needs it flat, and in the order
  // it is displayed so the count in the bar matches what the eye selected.
  const all = groups.flatMap((g) => g.items);
  const selected = all
    .filter((it) => sel.has(it.itemId))
    .map((it) => ({ itemId: it.itemId, name: it.name }));

  return (
    <div>
      {/* Named by outcome, not by mechanism (#320). "Select" described the mode
          and was therefore unfindable: the owner reached for the packed
          checkbox instead, because a checkbox is the universal "select this".
          Pressing this *starts* selection with the goal already stated. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {addControl}
        <Button
          type="button"
          variant={sel.active ? "default" : "outline"}
          onClick={() => (sel.active ? sel.stop() : sel.setActive(true))}
        >
          <CalendarPlus className="size-4" />
          {sel.active ? "Choose the pieces…" : "Log a wear"}
        </Button>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        {sel.active ? (
          <span className="text-xs text-muted-foreground">
            Tap the pieces you wore, then log them.
          </span>
        ) : (
          <span />
        )}
        <ViewToggle view={view} onChange={setView} />
      </div>
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.label}>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">{g.label}</h3>
            {view === "list" ? (
              <div className="divide-y">
                {g.items.map((it) => (
                  <PackingRow
                    key={it.itemId}
                    tripId={tripId}
                    itemId={it.itemId}
                    name={it.name}
                    brand={it.brand}
                    photoUrl={it.photoUrl}
                    packed={it.packed}
                    days={it.days}
                    selectable={sel.active}
                    selected={sel.has(it.itemId)}
                    onSelect={sel.toggle}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {g.items.map((it) => (
                  <PackingCard
                    key={it.itemId}
                    tripId={tripId}
                    {...it}
                    selectable={sel.active}
                    selected={sel.has(it.itemId)}
                    onSelect={sel.toggle}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {sel.active && selected.length > 0 ? (
        <SelectionBar
          pieces={selected}
          tripId={tripId}
          onDone={sel.stop}
          onCancel={sel.stop}
        />
      ) : null}
    </div>
  );
}

function PackingCard({
  tripId,
  itemId,
  name,
  brand,
  photoUrl,
  packed,
  selectable = false,
  selected = false,
  onSelect,
}: { tripId: string; selectable?: boolean; selected?: boolean; onSelect?: (id: string) => void } &
  PackingPiece) {
  if (selectable) {
    return (
      <label
        className={cn(
          "relative block cursor-pointer overflow-hidden rounded-lg border-2 transition-colors",
          selected ? "border-primary" : "border-transparent",
        )}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect?.(itemId)}
          className="absolute left-2 top-2 z-10 size-5 accent-primary"
          aria-label={`Select ${name}`}
        />
        {photoUrl ? (
          <Image src={photoUrl} alt="" width={300} height={400} className="aspect-[3/4] w-full object-cover" />
        ) : (
          <span className="flex aspect-[3/4] w-full items-center justify-center bg-muted">
            <Shirt className="size-6 text-muted-foreground" />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 truncate bg-background/85 px-2 py-1 text-xs">
          {name}
        </span>
      </label>
    );
  }

  return (
    <div className="relative">
      <form action={setPacked} className="absolute left-2 top-2 z-10">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="packed" value={(!packed).toString()} />
        <button
          type="submit"
          aria-label={packed ? `Mark ${name} not packed` : `Mark ${name} packed`}
          aria-pressed={packed}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border shadow-sm transition-colors",
            packed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background/85 text-transparent hover:text-muted-foreground",
          )}
        >
          <Check className="size-3.5" />
        </button>
      </form>

      <form action={removeTripItem} className="absolute right-2 top-2 z-10">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="itemId" value={itemId} />
        <button
          type="submit"
          aria-label={`Remove ${name} from trip`}
          className="flex size-6 items-center justify-center rounded-full border border-input bg-background/85 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </form>

      <Link
        href={`/items/${itemId}`}
        className="block overflow-hidden rounded-lg border transition-colors hover:border-primary"
      >
        <div className="relative aspect-[3/4] bg-muted">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, 160px"
              className={cn("object-cover", packed && "opacity-70")}
            />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <Shirt className="size-6" />
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6">
            <div className={cn("truncate text-xs font-medium text-white", packed && "line-through")}>
              {name}
            </div>
            {brand ? <div className="truncate text-[11px] text-white/80">{brand}</div> : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
