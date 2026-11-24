"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GripVertical, Shirt, X } from "lucide-react";

import { removeLookItem, reorderLookItems } from "@/app/looks/actions";
import { cn } from "@/lib/utils";
import { ViewToggle, type ItemView } from "@/components/view-toggle";

export type LookPiece = {
  itemId: string;
  name: string;
  brand: string | null;
  photoUrl: string | null;
};

const seq = (ps: LookPiece[]) => ps.map((p) => p.itemId).join(",");

/** A Look's pieces in a single flat, horizontal-first grid the owner can drag to
 *  reorder (#100). List and grid views share the manual order; only the grid is
 *  drag-reorderable. Each piece links to the item and can be removed. */
export function LookPieces({ lookId, pieces }: { lookId: string; pieces: LookPiece[] }) {
  const router = useRouter();
  const [view, setView] = React.useState<ItemView>("grid");
  const [order, setOrder] = React.useState<LookPiece[]>(pieces);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  // Re-sync when the server sends a new order (add/remove/refresh): the React
  // "reset state during render" pattern, so we never setState in an effect.
  const incoming = seq(pieces);
  const [syncedSeq, setSyncedSeq] = React.useState(incoming);
  if (incoming !== syncedSeq) {
    setSyncedSeq(incoming);
    setOrder(pieces);
  }

  const persist = (next: LookPiece[]) => {
    if (seq(next) === seq(pieces)) return; // no change
    const fd = new FormData();
    fd.append("lookId", lookId);
    for (const p of next) fd.append("itemIds", p.itemId);
    startTransition(async () => {
      await reorderLookItems(fd);
      router.refresh();
    });
  };

  const onDragStart = (id: string) => setDragId(id);
  const onDragEnterOver = (overId: string) => {
    if (dragId == null || overId === dragId) return;
    setOrder((cur) => {
      const from = cur.findIndex((p) => p.itemId === dragId);
      const to = cur.findIndex((p) => p.itemId === overId);
      if (from === -1 || to === -1) return cur;
      const next = cur.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const onDragEnd = () => {
    setDragId(null);
    persist(order);
  };

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <div className="divide-y">
          {order.map((it) => (
            <LookRow key={it.itemId} lookId={lookId} {...it} />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {order.map((it) => (
            <li
              key={it.itemId}
              draggable
              onDragStart={() => onDragStart(it.itemId)}
              onDragEnter={() => onDragEnterOver(it.itemId)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={onDragEnd}
              className={cn(dragId === it.itemId && "opacity-40")}
            >
              <LookCard lookId={lookId} dragging={dragId === it.itemId} {...it} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RemoveButton({
  lookId,
  itemId,
  name,
  className,
}: {
  lookId: string;
  itemId: string;
  name: string;
  className?: string;
}) {
  return (
    <form action={removeLookItem} className={className}>
      <input type="hidden" name="lookId" value={lookId} />
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        aria-label={`Remove ${name} from look`}
        className="flex size-6 items-center justify-center rounded-full border border-input bg-background/85 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}

function LookRow({ lookId, itemId, name, brand, photoUrl }: { lookId: string } & LookPiece) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Link href={`/items/${itemId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} fill sizes="40px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <Shirt className="size-4" />
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm">{name}</span>
          {brand ? <span className="block truncate text-xs text-muted-foreground">{brand}</span> : null}
        </span>
      </Link>
      <RemoveButton lookId={lookId} itemId={itemId} name={name} className="shrink-0" />
    </div>
  );
}

function LookCard({
  lookId,
  itemId,
  name,
  brand,
  photoUrl,
  dragging,
}: { lookId: string; dragging?: boolean } & LookPiece) {
  return (
    <div className="relative">
      <RemoveButton lookId={lookId} itemId={itemId} name={name} className="absolute right-2 top-2 z-10" />
      <span
        aria-hidden
        className="absolute left-2 top-2 z-10 flex size-6 cursor-grab items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow-sm active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="size-3.5" />
      </span>
      <Link
        href={`/items/${itemId}`}
        draggable={false}
        className={cn(
          "block overflow-hidden rounded-lg border transition-colors hover:border-primary",
          dragging && "border-primary ring-2 ring-primary/40",
        )}
      >
        <div className="relative aspect-[3/4] bg-muted">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} fill sizes="(max-width: 640px) 50vw, 180px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <Shirt className="size-6" />
            </span>
          )}
          <div className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6")}>
            <div className="truncate text-xs font-medium text-white">{name}</div>
            {brand ? <div className="truncate text-[11px] text-white/80">{brand}</div> : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
