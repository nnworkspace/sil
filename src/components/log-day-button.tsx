"use client";

import * as React from "react";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BatchWearDialog,
  type BatchWearPiece,
} from "@/components/batch-wear-dialog";

/**
 * "Log this day" on a planned trip day (#320).
 *
 * The set already exists as data, so there is nothing to select: the day holds
 * its pieces and one tap records them. This is the case selection UI would only
 * get in the way of.
 *
 * **The date comes from the day, not from today.** Catching up on the 25th for
 * what was worn on the 14th is the normal case on the road; a trip log is clustered rather than daily, which is exactly what that looks like.
 */
export function LogDayButton({
  tripId,
  day,
  label,
  pieces,
}: {
  tripId: string;
  /** ISO date of the day, which becomes the wear date. */
  day: string;
  /** The day's display label, for the button's accessible name. */
  label: string;
  pieces: BatchWearPiece[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Log a wear for ${label}`}
      >
        <CalendarPlus className="size-3.5" />
        Log
      </Button>
      <BatchWearDialog
        open={open}
        onOpenChange={setOpen}
        pieces={pieces}
        tripId={tripId}
        day={day}
      />
    </>
  );
}
