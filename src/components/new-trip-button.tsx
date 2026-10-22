"use client";

import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TripForm } from "@/components/trip-form";

export function NewTripButton() {
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="size-4" />
        New trip
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New trip</DialogTitle>
        </DialogHeader>
        <TripForm />
      </DialogContent>
    </Dialog>
  );
}
