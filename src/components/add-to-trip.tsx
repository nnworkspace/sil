"use client";

import * as React from "react";
import Link from "next/link";
import { Luggage } from "lucide-react";
import { toast } from "sonner";

import { addTripItems } from "@/app/trips/actions";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** "Add to trip" on an item page — pick a trip to add this piece to. Idempotent
 *  (`VAL-TRIP-05`): re-adding is a no-op, confirmed gently with a toast. */
export function AddToTrip({
  itemId,
  itemName,
  trips,
}: {
  itemId: string;
  itemName: string;
  trips: { id: string; name: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  const add = (tripId: string, tripName: string) => {
    const fd = new FormData();
    fd.append("tripId", tripId);
    fd.append("itemIds", itemId);
    start(async () => {
      await addTripItems(fd);
      setOpen(false);
      toast.success(`Added “${itemName}” to ${tripName}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>
        <Luggage className="size-4" />
        Add to trip
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to trip</DialogTitle>
          <DialogDescription>
            Add “{itemName}” to a trip&apos;s packing list.
          </DialogDescription>
        </DialogHeader>
        {trips.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No trips yet.{" "}
            <Link href="/trips" className="underline">
              Create one
            </Link>{" "}
            first.
          </p>
        ) : (
          <ul className="space-y-1">
            {trips.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => add(t.id, t.name)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
