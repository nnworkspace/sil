"use client";

import * as React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { toast } from "sonner";

import { addLookItems } from "@/app/looks/actions";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** "Add to Look" on an item page — pick a Look/Set to add this piece to.
 *  Idempotent (`VAL-LOOK-05`): re-adding is a no-op, confirmed with a toast. */
export function AddToLook({
  itemId,
  itemName,
  looks,
}: {
  itemId: string;
  itemName: string;
  looks: { id: string; name: string; kind: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  const add = (lookId: string, lookName: string) => {
    const fd = new FormData();
    fd.append("lookId", lookId);
    fd.append("itemIds", itemId);
    start(async () => {
      await addLookItems(fd);
      setOpen(false);
      toast.success(`Added “${itemName}” to ${lookName}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>
        <Layers className="size-4" />
        Add to look
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to look</DialogTitle>
          <DialogDescription>Add “{itemName}” to a look or set.</DialogDescription>
        </DialogHeader>
        {looks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No looks yet.{" "}
            <Link href="/looks" className="underline">
              Create one
            </Link>{" "}
            first.
          </p>
        ) : (
          <ul className="space-y-1">
            {looks.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => add(l.id, l.name)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span className="truncate">{l.name}</span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">{l.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
