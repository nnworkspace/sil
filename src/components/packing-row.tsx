"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Shirt, X } from "lucide-react";

import { setPacked, removeTripItem } from "@/app/trips/actions";
import { cn } from "@/lib/utils";

type Props = {
  tripId: string;
  itemId: string;
  name: string;
  brand: string | null;
  photoUrl: string | null;
  packed: boolean;
  /** Which days this piece is planned for, as short labels (#270). One line
   *  here however many days it appears under in the planner: the list is what
   *  goes in the suitcase, and a repeat wear is still one thing to pack. */
  days?: string[];
  /** Selection mode (#320): while on, the row's whole area toggles selection
   *  instead of navigating, and the packed/remove controls step aside. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (itemId: string) => void;
};

/** One packing-list row: a packed toggle, the piece (thumbnail + name), and a
 *  remove control. Both controls are progressive-enhancement forms posting to
 *  Server Actions; the toggle submits the negated `packed` value. */
export function PackingRow({
  tripId,
  itemId,
  name,
  brand,
  photoUrl,
  packed,
  days,
  selectable = false,
  selected = false,
  onSelect,
}: Props) {
  if (selectable) {
    return (
      <label className="flex cursor-pointer items-center gap-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect?.(itemId)}
          className="size-5 shrink-0 accent-primary"
          aria-label={`Select ${name}`}
        />
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            width={40}
            height={52}
            className="size-10 shrink-0 rounded object-cover"
          />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
            <Shirt className="size-4 text-muted-foreground" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{name}</span>
          {brand ? (
            <span className="block truncate text-xs text-muted-foreground">{brand}</span>
          ) : null}
        </span>
        {packed ? <Check className="size-4 shrink-0 text-primary" /> : null}
      </label>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <form action={setPacked}>
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="packed" value={(!packed).toString()} />
        <button
          type="submit"
          aria-label={packed ? `Mark ${name} not packed` : `Mark ${name} packed`}
          aria-pressed={packed}
          className={cn(
            "flex size-5 items-center justify-center rounded border transition-colors",
            packed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input hover:border-primary",
          )}
        >
          {packed ? <Check className="size-3.5" /> : null}
        </button>
      </form>

      <Link
        href={`/items/${itemId}`}
        className="flex min-w-0 flex-1 items-center gap-3 group"
      >
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
          <span className={cn("block truncate", packed && "text-muted-foreground line-through")}>
            {name}
          </span>
          {brand ? (
            <span className="block truncate text-sm text-muted-foreground">{brand}</span>
          ) : null}
          {days?.length ? (
            <span className="block truncate text-xs text-muted-foreground">
              {days.join(", ")}
            </span>
          ) : null}
        </span>
      </Link>

      <form action={removeTripItem} className="shrink-0">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="itemId" value={itemId} />
        <button
          type="submit"
          aria-label={`Remove ${name} from trip`}
          className="text-muted-foreground transition-colors hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      </form>
    </div>
  );
}
