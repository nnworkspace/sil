"use client";

import * as React from "react";
import { CalendarPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BatchWearDialog,
  type BatchWearPiece,
} from "@/components/batch-wear-dialog";

/**
 * Choosing several pieces, then doing one thing to them (#320).
 *
 * Selection is deliberately **a mode**, not an always-on affordance: the common
 * act on a card is still opening it, and putting a checkbox on every card would
 * tax every visit to save a few taps on some. So `Select` turns the mode on,
 * and while it is on the surface behaves differently and says so.
 */
export function useSelection() {
  const [active, setActive] = React.useState(false);
  const [ids, setIds] = React.useState<string[]>([]);

  const toggle = React.useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const clear = React.useCallback(() => setIds([]), []);

  const stop = React.useCallback(() => {
    setActive(false);
    setIds([]);
  }, []);

  return { active, setActive, ids, toggle, clear, stop, has: (id: string) => ids.includes(id) };
}

/**
 * The bar that appears once something is selected.
 *
 * Fixed to the bottom of the viewport rather than placed in the flow: on a
 * phone the selection usually happens further up a long list, and a bar that
 * scrolled away with it would leave the mode with no visible exit.
 */
export function SelectionBar({
  pieces,
  tripId,
  onDone,
  onCancel,
}: {
  pieces: BatchWearPiece[];
  tripId?: string | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const n = pieces.length;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-sm font-medium">
            {n} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={n === 0} onClick={() => setOpen(true)}>
              <CalendarPlus className="size-4" />
              Log a wear
            </Button>
          </div>
        </div>
      </div>
      {/* Clears the bar's own height so the last row is never trapped behind it. */}
      <div aria-hidden className="h-16" />

      <BatchWearDialog
        open={open}
        onOpenChange={setOpen}
        pieces={pieces}
        tripId={tripId}
        onLogged={onDone}
      />
    </>
  );
}
