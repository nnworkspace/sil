"use client";

import * as React from "react";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BatchWearDialog,
  type BatchWearPiece,
} from "@/components/batch-wear-dialog";

/**
 * "Wore this today" on a Look (#320).
 *
 * A Look **is** a set of pieces that go together, so logging one is the case
 * batch wear logging exists for, and it needs no selection at all.
 *
 * This is also why the looks *list* deliberately has no selection mode: picking
 * two rows there could log eight pieces with the count invisible at the moment
 * of choosing. Logging from the Look's own page removes that problem rather
 * than guarding it, because the pieces are on screen when the button is pressed.
 *
 * No `tripId`: a Look knows nothing about any suitcase, so nothing is inferred
 * about packing here.
 */
export function LogLookButton({ pieces }: { pieces: BatchWearPiece[] }) {
  const [open, setOpen] = React.useState(false);
  if (pieces.length === 0) return null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" />
        Wore this today
      </Button>
      <BatchWearDialog open={open} onOpenChange={setOpen} pieces={pieces} />
    </>
  );
}
