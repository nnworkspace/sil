"use client";

import { Trash2 } from "lucide-react";

import { deleteTrip } from "@/app/trips/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * @param icon render as a bare icon, for a trip card (#290). The **dialog is
 *   unconditional**: an icon that deleted a trip and its packing list on one
 *   click would be the smallest control in the app doing the most damage. A
 *   destructive action asks first, whatever it looks like (ADR-0015).
 * @param name shown in the confirmation, because on a list of cards the icon
 *   alone does not say *which* trip is about to go.
 */
export function DeleteTripButton({
  id,
  name,
  icon = false,
}: {
  id: string;
  name?: string;
  icon?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label={icon ? `Delete ${name ?? "trip"}` : undefined}
        className={cn(
          icon
            ? "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            : buttonVariants({ variant: "destructive" }),
        )}
      >
        <Trash2 className="size-4" />
        {icon ? null : "Delete"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name ? `Delete “${name}”?` : "Delete this trip?"}</DialogTitle>
          <DialogDescription>
            This removes the trip and its packing list. Your wardrobe items are
            untouched. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: "outline" })}>
            Cancel
          </DialogClose>
          <form action={deleteTrip}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="destructive">
              Delete
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
