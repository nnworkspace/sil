"use client";

import { Trash2 } from "lucide-react";

import { deleteLook } from "@/app/looks/actions";
import { Button, buttonVariants } from "@/components/ui/button";
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

export function DeleteLookButton({ id }: { id: string }) {
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "destructive" })}>
        <Trash2 className="size-4" />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this look?</DialogTitle>
          <DialogDescription>
            This removes the look. Your wardrobe pieces are untouched. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: "outline" })}>Cancel</DialogClose>
          <form action={deleteLook}>
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
