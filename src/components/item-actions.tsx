"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, RotateCcw, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

import { deleteItem } from "@/app/items/actions";
import { archiveItem, restoreItem } from "@/app/items/archive-actions";
import { ARCHIVE_REASONS } from "@/lib/validation";
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

/** Human labels for the archive vocabulary (specs/archive §5). */
const REASON_LABELS: Record<string, string> = {
  sold: "Sold",
  gifted: "Gifted",
  returned: "Returned to the shop",
  "worn-out": "Worn out",
  lost: "Lost",
  other: "Other",
};

const pad = (n: number) => String(n).padStart(2, "0");
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * The item page's lifecycle actions (specs/archive). Archive and Delete live in
 * one component so the delete confirmation can hand straight over to the archive
 * modal (OP-ARCHIVE-INSTEAD): deleting a piece you really owned destroys its
 * history, so the destructive path stays possible but is no longer the obvious
 * one. An archived piece shows Restore instead of Archive.
 */
export function ItemActions({
  id,
  name,
  archived,
  looks = [],
}: {
  id: string;
  name: string;
  /** Whether the piece is archived, which drives Archive vs Restore. */
  archived: boolean;
  /** The active looks this piece is in. After archiving, they become
   *  "incomplete", so we remind the owner to edit them (#170). No cascade. */
  looks?: { id: string; name: string }[];
}) {
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [reminderOpen, setReminderOpen] = React.useState(false);
  const [today, setToday] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const openArchive = () => {
    setToday(localToday());
    setError(null);
    setDeleteOpen(false);
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
      const res = await archiveItem(id, { archivedAt, reason, note });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setArchiveOpen(false);
      toast.success("Archived", {
        description: `${name} is no longer in your wardrobe.`,
      });
      // The piece kept its look memberships (nothing cascades, #170); those
      // looks are now incomplete, so nudge the owner to edit them.
      if (looks.length > 0) setReminderOpen(true);
    });
  };

  const onRestore = () => {
    start(async () => {
      const res = await restoreItem(id);
      if (res.ok) toast.success("Restored", { description: `${name} is back in your wardrobe.` });
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

      <Button
        variant="destructive"
        onClick={() => setDeleteOpen(true)}
        className="gap-2"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>

      {/* Archive (OP-ARCHIVE) */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive this piece?</DialogTitle>
            <DialogDescription>
              It leaves your active wardrobe but keeps everything: photos, wear
              history, and the looks and trips it was part of.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onArchive} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`archivedAt-${id}`}>Date it left</Label>
              <Input
                id={`archivedAt-${id}`}
                name="archivedAt"
                type="date"
                defaultValue={today}
                max={today}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`reason-${id}`}>Reason</Label>
              {/* No default: an unconsidered "sold" would falsify the record. */}
              <select
                id={`reason-${id}`}
                name="reason"
                defaultValue=""
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Choose a reason…
                </option>
                {ARCHIVE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REASON_LABELS[r] ?? r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`archive-note-${id}`}>Note (optional)</Label>
              <Input
                id={`archive-note-${id}`}
                name="note"
                placeholder="e.g. sold on Vinted"
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

      {/* Delete, with the nudge towards archiving (OP-ARCHIVE-INSTEAD) */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this item?</DialogTitle>
            <DialogDescription>
              This permanently removes the item, its photos and its wear history.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {!archived ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Deleting is for pieces entered by mistake. If you really owned this
              and it&apos;s gone (sold, gifted, lost),{" "}
              <strong className="text-foreground">archive</strong> it instead to
              keep its history.
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline" })}>
              Cancel
            </DialogClose>
            {!archived ? (
              <Button type="button" variant="outline" onClick={openArchive}>
                <Archive className="size-4" />
                Archive instead
              </Button>
            ) : null}
            <form action={deleteItem}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="destructive">
                Delete
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* After archiving a piece that was in looks, remind (not cascade): the
          looks now contain a retired piece and may need editing (#170). */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>This piece was in {looks.length === 1 ? "a look" : "some looks"}</DialogTitle>
            <DialogDescription>
              {name} has left your wardrobe, so {looks.length === 1 ? "this look is" : "these looks are"}{" "}
              now incomplete. The {looks.length === 1 ? "look" : "looks"} kept their other pieces.
              Edit or retire {looks.length === 1 ? "it" : "them"} when you like.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-1">
            {looks.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/looks/${l.id}`}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary"
                >
                  <Layers className="size-4 text-muted-foreground" />
                  {l.name}
                </Link>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button type="button" onClick={() => setReminderOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
