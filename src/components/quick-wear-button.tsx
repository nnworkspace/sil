"use client";

import * as React from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import { quickLogWear, quickUnlogWear } from "@/app/items/wear-actions";
import { TAG_GROUPS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OCCASION_TAGS = TAG_GROUPS.find((g) => g.kind === "occasion")?.tags ?? [];

const pad = (n: number) => String(n).padStart(2, "0");
/** The viewer's local date, computed on open, so no server/client mismatch. */
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** "Log a wear" control on a grid card (#121, modal since #129). Opens a small
 *  dialog pre-filled with today's date, plus optional occasion and note, so the
 *  fast path stays two taps while still capturing the detail the wear model
 *  supports. Sits over the card (sibling of its link) so it never navigates. */
export function QuickWearButton({
  id,
  name,
  className,
}: {
  id: string;
  name?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [today, setToday] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const openDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setToday(localToday());
    setError(null);
    setOpen(true);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const wornAt = String(fd.get("wornAt") ?? "");
    const occasion = String(fd.get("occasion") ?? "") || null;
    const note = String(fd.get("note") ?? "").trim() || null;
    setError(null);
    start(async () => {
      const res = await quickLogWear(id, { wornAt, occasion, note });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      toast.success("Logged a wear", {
        action: {
          label: "Undo",
          onClick: () => {
            void quickUnlogWear(res.wearId, id);
          },
        },
      });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Log a wear"
        title="Log a wear"
        className={cn(
          "absolute left-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-foreground",
          className,
        )}
      >
        <CalendarPlus className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log a wear</DialogTitle>
            <DialogDescription>
              {name ? name : "Record that you wore this piece."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`wornAt-${id}`}>Date</Label>
              <Input
                id={`wornAt-${id}`}
                name="wornAt"
                type="date"
                defaultValue={today}
                max={today}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`occasion-${id}`}>Occasion</Label>
              <select
                id={`occasion-${id}`}
                name="occasion"
                defaultValue=""
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm capitalize outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">—</option>
                {OCCASION_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`note-${id}`}>Note (optional)</Label>
              <Input
                id={`note-${id}`}
                name="note"
                placeholder="e.g. team offsite"
                maxLength={255}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Log a wear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
