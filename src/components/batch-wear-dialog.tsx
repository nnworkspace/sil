"use client";

import * as React from "react";
import { toast } from "sonner";

import { batchLogWear, batchUnlogWear, wornOnDate } from "@/app/items/wear-actions";
import { defaultWearDate } from "@/lib/batch-wear";
import { TAG_GROUPS } from "@/lib/categories";
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

export type BatchWearPiece = { itemId: string; name: string };

/**
 * The dialog behind every batch wear log (#320): a selection in the grid or
 * the packing list, a whole Look, or a planned trip day.
 *
 * It carries the same three fields as the single-piece dialog, written
 * identically to every piece. Three things are particular to a batch:
 *
 *   - **`day` overrides the date default.** On a trip day the dialog opens on
 *     *that* day rather than today, because catching up on the 25th for what
 *     was worn on the 14th is the normal case on the road.
 *   - **A duplicate check runs before writing**, since logging the same piece
 *     twice for one date is nearly always an accident, but wearing something
 *     to the office and then to dinner is real, so it warns rather than blocks.
 *   - **Undo reverts the whole batch**, including any `packed` ticks. An undo
 *     that left those behind would be lying about what it undid.
 */
export function BatchWearDialog({
  open,
  onOpenChange,
  pieces,
  tripId,
  day,
  onLogged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pieces: BatchWearPiece[];
  /** Present only on the trip surfaces; it is what makes packed inference possible. */
  tripId?: string | null;
  /** ISO day for a trip-day batch; the dialog opens on it. */
  day?: string | null;
  onLogged?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Mounted only while open, so every field starts fresh from its own
            initialiser rather than being reset by an effect. */}
        {open ? (
          <BatchWearForm
            pieces={pieces}
            tripId={tripId}
            day={day}
            onClose={() => onOpenChange(false)}
            onLogged={onLogged}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BatchWearForm({
  pieces,
  tripId,
  day,
  onClose,
  onLogged,
}: {
  pieces: BatchWearPiece[];
  tripId?: string | null;
  day?: string | null;
  onClose: () => void;
  onLogged?: () => void;
}) {
  // Read once at mount. `localToday` touches the client clock, so it cannot run
  // during server render; mounting on open is what makes that safe.
  const [today] = React.useState(localToday);
  const [date, setDate] = React.useState(() => defaultWearDate(day, localToday()));
  const [error, setError] = React.useState<string | null>(null);
  // Keyed by the date it was checked for, so a stale answer can never describe
  // a different date than the one about to be written.
  const [dupes, setDupes] = React.useState<{ date: string; ids: string[] }>({ date: "", ids: [] });
  const [confirmedFor, setConfirmedFor] = React.useState("");
  const [pending, start] = React.useTransition();

  // Re-check whenever the date moves: the warning must describe the date about
  // to be written, not the one the dialog opened on.
  const ids = pieces.map((p) => p.itemId).join(",");
  React.useEffect(() => {
    if (!date || !ids) return;
    let live = true;
    void wornOnDate(ids.split(","), date).then((found) => {
      if (live) setDupes({ date, ids: found });
    });
    return () => {
      live = false;
    };
  }, [date, ids]);

  // Only trust the answer that belongs to the current date.
  const dupeIds = dupes.date === date ? dupes.ids : [];
  const dupeNames = pieces.filter((p) => dupeIds.includes(p.itemId)).map((p) => p.name);
  const blocked = dupeNames.length > 0 && confirmedFor !== date;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (blocked) {
      setConfirmedFor(date);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const wornAt = String(fd.get("wornAt") ?? "");
    const occasion = String(fd.get("occasion") ?? "") || null;
    const note = String(fd.get("note") ?? "").trim() || null;
    const itemIds = pieces.map((p) => p.itemId);
    setError(null);

    start(async () => {
      const res = await batchLogWear(itemIds, { wornAt, occasion, note }, tripId ?? null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      onLogged?.();
      toast.success(res.message, {
        action: {
          label: "Undo",
          onClick: () => {
            void batchUnlogWear(res.wearIds, itemIds, tripId ?? null, res.packedTicked);
          },
        },
      });
    });
  };

  const n = pieces.length;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log a wear</DialogTitle>
        <DialogDescription>
          {n === 1 ? pieces[0]?.name : `${n} pieces, same date and occasion.`}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="batch-wornAt">Date</Label>
          <Input
            id="batch-wornAt"
            name="wornAt"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="batch-occasion">Occasion</Label>
          <select
            id="batch-occasion"
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
          <Label htmlFor="batch-note">Note (optional)</Label>
          <Input
            id="batch-note"
            name="note"
            placeholder="e.g. holiday in Kyoto"
            maxLength={255}
          />
        </div>

        {dupeNames.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {dupeNames.length === 1
                ? `${dupeNames[0]} already has`
                : `${dupeNames.length} pieces already have`}
            </span>{" "}
            a wear on this date. {blocked ? "Press again to log anyway." : "Logging anyway."}
          </p>
        ) : null}

        {tripId ? (
          <p className="text-xs text-muted-foreground">
            Pieces on this trip that aren’t ticked yet will be marked packed.
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || n === 0}>
            {blocked ? "Log anyway" : n === 1 ? "Log a wear" : `Log ${n} wears`}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
