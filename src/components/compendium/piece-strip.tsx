import Link from "next/link";
import Image from "next/image";

import { Markdown } from "@/components/markdown";

/**
 * "In this wardrobe" — the pieces an entry describes
 * (SPEC-COMPENDIUM-INT §4.2, VAL-COMP-05 / VAL-COMP-10).
 *
 * The list is always derived, never stored, so it cannot go stale. When nothing
 * matches, this renders one honest line instead of an empty box: "nothing here
 * matches" is itself information, and hiding the entry would be worse.
 */

export type StripPiece = {
  id: string;
  name: string;
  brand?: string | null;
  photos: { url: string }[];
};

export function PieceStrip({
  pieces,
  emptyNote,
}: {
  pieces: StripPiece[];
  emptyNote: string;
}) {
  if (pieces.length === 0) {
    return <Markdown className="mt-2 text-muted-foreground">{emptyNote}</Markdown>;
  }

  return (
    <ul className="mt-3 flex flex-wrap gap-3">
      {pieces.map((p) => (
        <li key={p.id}>
          <Link href={`/items/${p.id}`} className="group block w-24" title={p.name}>
            <div className="relative aspect-[3/4] overflow-hidden border bg-muted">
              {p.photos[0] ? (
                <Image
                  src={p.photos[0].url}
                  alt={p.name}
                  fill
                  sizes="96px"
                  className="object-cover transition-opacity group-hover:opacity-80"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  no photo
                </span>
              )}
            </div>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{p.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
