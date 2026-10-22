"use client";

import * as React from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLook } from "@/app/looks/actions";
import { archiveLook, restoreLook } from "@/app/looks/archive-actions";
import { LOOK_ARCHIVE_REASONS } from "@/lib/validation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Human labels for the look archive vocabulary (specs/looks, #170). */
const REASON_LABELS: Record<string, string> = {
  "no-longer-wear": "No longer wear it",
  "piece-archived": "A piece in it was archived",
  outdated: "Outdated",
  other: "Other",
};

const pad = (n: number) => String(n).padStart(2, "0");
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * A look's lifecycle actions (#170), mirroring the item ones. Archive (soft,
 * reversible) retires the look but keeps it and its pieces; Delete (hard) removes
 * the look and its item links only — the pieces themselves always stay in the
 * wardrobe. An archived look shows Restore instead of Archive.
 */
export function LookActions({
  id,
  name,
  archived,
}: {
  id: string;
  name: string;
  /** Whether the look is archived — drives Archive vs Restore. */
  archived: boolean;
}) {
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [today, setToday] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const openArchive = () => {
    setToday(localToday());
    setError(null);
    setArchiveOpen(true);
  };

  const onArchive = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const archivedAt = String(fd.get("archivedAt") ?? "");
    const reason = String(fd.get("reason") ?? "");
    const note = String(fd.get("note") ?? "").trim() || null;
    setError(null);
    start(async () => {
      const res = await archiveLook(id, { archivedAt, reason, note });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setArchiveOpen(false);
      toast.success("Archived", { description: `${name} is no longer an active look.` });
    });
  };

  const onRestore = () => {
    start(async () => {
      const res = await restoreLook(id);
      if (res.ok) toast.success("Restored", { description: `${name} is active again.` });
      else toast.error(res.error);
    });
  };

  return (
    <>
      {archived ? (
        <Button variant="outline" onClick={onRestore} disabled={pending}>
          <RotateCcw className="size-4" />
          Restore
        </Button>
      ) : (
        <Button variant="outline" onClick={openArchive}>
          <Archive className="size-4" />
          Archive
        </Button>
      )}

      <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="gap-2">
        <Trash2 className="size-4" />
        Delete
      </Button>

      {/* Archive (soft) */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive this look?</DialogTitle>
            <DialogDescription>
              It leaves your active looks but is kept — its pieces, photos and
              notes all stay. The pieces themselves are untouched.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onArchive} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`look-archivedAt-${id}`}>Date retired</Label>
              <Input
                id={`look-archivedAt-${id}`}
                name="archivedAt"
                type="date"
                defaultValue={today}
                max={today}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`look-reason-${id}`}>Reason</Label>
              <select
                id={`look-reason-${id}`}
                name="reason"
                defaultValue=""
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Choose a reason…
                </option>
                {LOOK_ARCHIVE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REASON_LABELS[r] ?? r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`look-archive-note-${id}`}>Note (optional)</Label>
              <Input
                id={`look-archive-note-${id}`}
                name="note"
                placeholder="e.g. swap in a replacement piece"
                maxLength={255}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Archive
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete (hard) — pieces always survive (#170) */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this look?</DialogTitle>
            <DialogDescription>
              This permanently removes the look and its own photos. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            The pieces in this look <strong className="text-foreground">stay in
            your wardrobe</strong> — only the look and its links to them are
            removed. To keep the look as a record instead,{" "}
            <strong className="text-foreground">archive</strong> it.
          </div>

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline" })}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                openArchive();
              }}
            >
              <Archive className="size-4" />
              Archive instead
            </Button>
            <form action={deleteLook}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="destructive">
                Delete
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
