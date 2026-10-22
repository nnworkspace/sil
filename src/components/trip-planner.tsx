"use client";

import * as React from "react";
import { useActionState } from "react";
import Image from "next/image";
import { Sparkles, Shirt, Check, TriangleAlert } from "lucide-react";

import { planTrip, type PlanResult } from "@/app/trips/planner-actions";
import { addTripItems } from "@/app/trips/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ViewToggle, type ItemView } from "@/components/view-toggle";

type Piece = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  photoUrl: string | null;
  reason: string;
};

/**
 * "Plan my trip" — the AI planner panel (specs/trip-planner, ADR-0010). One model
 * call returns a proposal of real wardrobe pieces grouped by occasion, reviewed
 * as a list or a grid, which the owner adds. Nothing is committed until "Add
 * selected". Human-in-the-loop.
 */
export function TripPlanner({
  tripId,
  initialBrief,
  addedIds,
}: {
  tripId: string;
  initialBrief: string | null;
  addedIds: string[];
}) {
  const [state, formAction, pending] = useActionState<PlanResult | null, FormData>(
    planTrip,
    null,
  );
  const [discarded, setDiscarded] = React.useState<PlanResult | null>(null);
  // Pieces the owner un-picked (by id). Kept in state so switching list/grid view
  // preserves the choice. Ids from an old proposal simply don't match a new one.
  const [deselected, setDeselected] = React.useState<Set<string>>(new Set());
  const [view, setView] = React.useState<ItemView>("list");

  const added = React.useMemo(() => new Set(addedIds), [addedIds]);
  const proposal = state?.ok && state !== discarded ? state : null;

  const kept = (id: string) => !added.has(id) && !deselected.has(id);
  const toggle = (id: string) => {
    if (added.has(id)) return;
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const keptIds = proposal
    ? [...new Set(proposal.occasions.flatMap((o) => o.pieces.map((p) => p.id)))].filter(kept)
    : [];

  const listRow = (o: { label: string }, p: Piece) => {
    const isAdded = added.has(p.id);
    return (
      <label
        key={`${o.label}-${p.id}`}
        className={cn("flex items-center gap-3 py-2", !isAdded && "cursor-pointer")}
      >
        <input
          type="checkbox"
          checked={isAdded || kept(p.id)}
          onChange={() => toggle(p.id)}
          disabled={isAdded}
          className="size-4 shrink-0 accent-primary"
        />
        <span className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
          {p.photoUrl ? (
            <Image src={p.photoUrl} alt={p.name} fill sizes="40px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <Shirt className="size-4" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">
            {p.name}
            {p.brand ? ` · ${p.brand}` : ""}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{p.reason}</span>
        </span>
        {isAdded ? <span className="shrink-0 text-xs text-muted-foreground">Added</span> : null}
      </label>
    );
  };

  const gridCard = (o: { label: string }, p: Piece) => {
    const isAdded = added.has(p.id);
    const on = isAdded || kept(p.id);
    return (
      <label
        key={`${o.label}-${p.id}`}
        className={cn("relative block", !isAdded && "cursor-pointer")}
      >
        <input
          type="checkbox"
          checked={on}
          onChange={() => toggle(p.id)}
          disabled={isAdded}
          className="absolute left-2 top-2 z-10 size-4 accent-primary"
        />
        <div
          className={cn(
            "overflow-hidden rounded-lg border transition-colors",
            on && !isAdded && "border-primary ring-2 ring-primary",
            !on && "opacity-60",
          )}
        >
          <div className="relative aspect-[3/4] bg-muted">
            {p.photoUrl ? (
              <Image
                src={p.photoUrl}
                alt={p.name}
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-muted-foreground">
                <Shirt className="size-6" />
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6">
              <div className="truncate text-xs font-medium text-white">{p.name}</div>
              {p.brand ? (
                <div className="truncate text-[11px] text-white/80">{p.brand}</div>
              ) : null}
            </div>
            {isAdded ? (
              <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <Check className="size-3" /> Added
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{p.reason}</p>
      </label>
    );
  };

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-medium">Plan my trip</h2>
        <span className="text-xs text-muted-foreground">AI · beta</span>
      </div>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="tripId" value={tripId} />
        <Textarea
          name="brief"
          defaultValue={initialBrief ?? ""}
          rows={3}
          maxLength={2000}
          placeholder="e.g. a long weekend in Copenhagen with a client meeting, a formal dinner and an evening with a friend. Pack for me."
        />
        <div className="flex items-end justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Your brief and a text list of your wardrobe (no photos) are sent to the AI. You can
            leave out personal names.
          </p>
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? "Planning…" : proposal ? "Regenerate" : "Plan my trip"}
          </Button>
        </div>
      </form>

      {state && !state.ok ? (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {proposal ? (
        <form action={addTripItems} className="mt-4 space-y-4">
          <input type="hidden" name="tripId" value={tripId} />
          {keptIds.map((id) => (
            <input key={id} type="hidden" name="itemIds" value={id} />
          ))}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Proposed plan</span>
            <ViewToggle view={view} onChange={setView} />
          </div>

          {proposal.occasions.map((o, i) => (
            <div key={`${o.label}-${i}`}>
              <div className="text-sm font-medium">
                {o.label}{" "}
                <span className="font-normal text-muted-foreground">
                  · {o.formality}
                  {o.timeOfDay ? ` · ${o.timeOfDay}` : ""}
                </span>
              </div>
              {view === "list" ? (
                <div className="mt-1 divide-y">{o.pieces.map((p) => listRow(o, p))}</div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {o.pieces.map((p) => gridCard(o, p))}
                </div>
              )}
            </div>
          ))}

          {proposal.gaps.length > 0 ? (
            <div className="rounded-md bg-muted/50 p-2 text-sm">
              <span className="font-medium">Gaps:</span>{" "}
              <span className="text-muted-foreground">{proposal.gaps.join("; ")}</span>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDiscarded(state)}>
              Discard
            </Button>
            <Button type="submit" disabled={keptIds.length === 0}>
              Add selected{keptIds.length ? ` (${keptIds.length})` : ""}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
