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
import { LookForm } from "@/components/look-form";

export function NewLookButton() {
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="size-4" />
        New look
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New look</DialogTitle>
        </DialogHeader>
        <LookForm />
      </DialogContent>
    </Dialog>
  );
}
