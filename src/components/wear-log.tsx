"use client";

import * as React from "react";
import { useActionState } from "react";
import { Pencil, X } from "lucide-react";

import { logWear, removeWear, updateWear } from "@/app/items/wear-actions";
import type { WearEvent } from "@/db/schema";
import { TAG_GROUPS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { formatPrice, formatDate } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OCCASION_TAGS =
  TAG_GROUPS.find((g) => g.kind === "occasion")?.tags ?? [];

const fieldCls =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Occasion tag selector (from the occasion vocabulary), with a "none" option. */
function OccasionSelect({ id, defaultValue }: { id?: string; defaultValue: string }) {
  return (
    <select
      id={id}
      name="occasion"
      aria-label="Occasion"
      defaultValue={defaultValue}
      className={cn(fieldCls, "capitalize")}
    >
      <option value="">—</option>
      {OCCASION_TAGS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

/**
 * One wear in the history: read-only until "Edit" is clicked, then date /
 * occasion / note become editable with an explicit Save (OP-EDIT-WEAR).
 */
function WearRow({
  itemId,
  wear,
  today,
}: {
  itemId: string;
  wear: WearEvent;
  today: string;
}) {
  const [editing, setEditing] = React.useState(false);
  /** Deleting a wear asks first — it is destructive and irreversible (#197). */
  const [confirming, setConfirming] = React.useState(false);

  if (editing) {
    return (
      <li className="py-2">
        <form
          action={async (fd) => {
            await updateWear(fd);
            setEditing(false);
          }}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="wearId" value={wear.id} />
          <input
            type="date"
            name="wornAt"
            aria-label="Wear date"
            defaultValue={wear.wornAt}
            max={today}
            className={cn(fieldCls, "w-auto")}
            suppressHydrationWarning
          />
          <OccasionSelect defaultValue={wear.occasion ?? ""} />
          <input
            name="note"
            aria-label="Note"
            defaultValue={wear.note ?? ""}
            placeholder="Note (optional)"
            maxLength={255}
            className={cn(fieldCls, "min-w-40 flex-1")}
          />
          <Button type="submit" size="sm">
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
      <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
        {formatDate(wear.wornAt)}
      </span>
      {wear.occasion ? <span className="capitalize">· {wear.occasion}</span> : null}
      {wear.note ? <span className="text-muted-foreground">· {wear.note}</span> : null}
      {/* gap-4 with p-1 hit areas, not two bare 14px icons 12px apart: the
          realistic mis-tap was "edit" landing on "delete" (#197). */}
      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit this wear"
          className="-m-1 p-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Remove this wear"
          className="-m-1 p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* A wear is destroyed outright, and losing one silently moves the wear
          total, cost-per-wear and the never-worn count (VAL-WEAR-09). */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this wear?</DialogTitle>
            <DialogDescription>
              {formatDate(wear.wornAt)}
              {wear.occasion ? ` · ${wear.occasion}` : ""}
              {wear.note ? ` · ${wear.note}` : ""} will be deleted from the history, and the
              piece&rsquo;s wear count and cost-per-wear will change. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline" })}>Cancel</DialogClose>
            <form
              action={async (fd) => {
                await removeWear(fd);
                setConfirming(false);
              }}
            >
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="wearId" value={wear.id} />
              <Button type="submit" variant="destructive">
                Remove
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

/**
 * Wear log on the item detail page (specs/wear-tracking, SPEC-WEAR-INT §2.1):
 * a summary (worn N× · last worn · cost-per-wear), the editable history, and a
 * quick "Log a wear" form. Wears arrive ordered newest-first.
 */
export function WearLog({
  itemId,
  wears,
  pricePaidCents,
  currency,
  priorWears,
}: {
  itemId: string;
  wears: WearEvent[];
  pricePaidCents: number | null;
  currency: string | null;
  /** Estimated wears before tracking began (#69), added to the logged count.
   *  `null` means **not recorded**, which reads differently from a recorded
   *  zero — see below (#191). */
  priorWears?: number | null;
}) {
  const [logState, logAction] = useActionState(logWear, null);
  const today = new Date().toISOString().slice(0, 10);

  const logged = wears.length;
  const baseline = priorWears ?? 0;
  const count = logged + baseline; // total worn = baseline + logged (#69)
  // "Nobody has said" vs "said: never" (#191). Both show a total of 0, so the
  // copy has to carry the difference — one is a gap to fill, the other a fact
  // about the piece.
  const recorded = priorWears != null || logged > 0;
  const lastWorn = logged > 0 ? wears[0].wornAt : null; // a baseline has no date
  const costPerWear =
    pricePaidCents != null && count > 0
      ? formatPrice(Math.round(pricePaidCents / count), currency)
      : null;

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl font-normal">Worn</h2>

      {count === 0 ? (
        recorded ? (
          <p className="text-sm text-muted-foreground">Never worn.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No wear history recorded — log a wear, or set the prior count when editing.
          </p>
        )
      ) : (
        <p className="text-sm">
          Worn{" "}
          <strong>
            {baseline > 0 ? "~" : ""}
            {count}
          </strong>{" "}
          {count === 1 ? "time" : "times"}
          {lastWorn ? <> · last worn {formatDate(lastWorn)}</> : null}
          {costPerWear ? (
            <>
              {" · "}
              <strong>{costPerWear}</strong>/wear
            </>
          ) : null}
          {baseline > 0 ? (
            <span className="text-muted-foreground">
              {" "}
              (incl. ~{baseline} before tracking)
            </span>
          ) : null}
        </p>
      )}

      {logged > 0 ? (
        <ul className="divide-y border-y">
          {wears.map((w) => (
            <WearRow key={w.id} itemId={itemId} wear={w} today={today} />
          ))}
        </ul>
      ) : null}

      {/* Log a new wear. key on count → inputs reset after a successful log. */}
      <form
        key={count}
        action={logAction}
        className="flex flex-wrap items-end gap-2 pt-1"
      >
        <input type="hidden" name="itemId" value={itemId} />
        <div>
          <Label htmlFor="wornAt" className="text-xs">
            Date
          </Label>
          <Input
            id="wornAt"
            name="wornAt"
            type="date"
            defaultValue={today}
            max={today}
            className="w-auto"
            suppressHydrationWarning
          />
        </div>
        <div>
          <Label htmlFor="log-occasion" className="text-xs">
            Occasion
          </Label>
          <OccasionSelect id="log-occasion" defaultValue="" />
        </div>
        <div>
          <Label htmlFor="note" className="text-xs">
            Note (optional)
          </Label>
          <Input
            id="note"
            name="note"
            placeholder="e.g. team offsite or a friend's birthday party"
            maxLength={255}
            className="w-56"
          />
        </div>
        <Button type="submit" variant="outline">
          Log a wear
        </Button>
      </form>

      {logState && !logState.ok ? (
        <p className="text-sm text-destructive">{logState.error}</p>
      ) : null}
    </section>
  );
}
