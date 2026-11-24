import Link from "next/link";
import Image from "next/image";
import { Shirt } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { FavoriteButton } from "@/components/favorite-button";
import { QuickWearButton } from "@/components/quick-wear-button";
import type { Item, ItemPhoto } from "@/db/schema";

export function ItemCard({
  item,
  overlays = true,
}: {
  item: Item & { photos: ItemPhoto[] };
  /** Favourite / log-a-wear overlays. Off in the archive, where both are
   *  meaningless for a piece that has left the wardrobe (specs/archive). */
  overlays?: boolean;
}) {
  const photo = item.photos[0];
  return (
    // The link is *stretched* over the card (`absolute inset-0`) rather than
    // wrapping it (#217). A card that is one big <a> cannot legally contain a
    // button, and the copy control has to sit on the name row. This keeps the
    // whole card clickable, keeps the markup valid, and gives the link a clean
    // accessible name instead of "photo alt + name + brand + size".
    <div className="group relative">
      <Card className="overflow-hidden py-0 transition-colors group-hover:border-primary">
        <div className="relative aspect-[3/4] bg-muted">
          {photo ? (
            <Image
              src={photo.url}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={item.showFullCover ? "object-contain" : "object-cover"}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Shirt className="size-10" />
            </div>
          )}
        </div>
        <CardContent className="p-3">
          {/* Its own hover group: the owner asked for the icon to appear on
                hovering *the name*, not anywhere on the card. */}
          <div className="group/name flex items-center gap-1">
            <span className="truncate font-medium">{item.name}</span>
            <CopyButton
              value={item.name}
              label="Copy name"
              className={cn(
                "relative z-10 opacity-0 transition-opacity",
                "group-hover/name:opacity-100 focus-visible:opacity-100",
                // No hover on a phone, which is where copying a name is most
                // useful, so there it simply stays put.
                "[@media(hover:none)]:opacity-100",
              )}
            />
          </div>
          {item.brand || item.size || item.storageLocation ? (
            <div className="flex items-baseline gap-1.5 text-sm text-muted-foreground">
              {item.brand || item.size ? (
                <span className="truncate">
                  {[item.brand, item.size && `Size ${item.size}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : null}
              {item.storageLocation ? (
                <>
                  {item.brand || item.size ? <span aria-hidden>·</span> : null}
                  {/* Its own hover group, like the name above (#240): the icon
                      appears on hovering *the berth*, not anywhere on the card.
                      The button is always in the layout and only its opacity
                      changes, so the row does not shift on hover. */}
                  <span className="group/berth flex shrink-0 items-center gap-0.5">
                    <span className="text-[11px]">{item.storageLocation}</span>
                    <CopyButton
                      value={item.storageLocation}
                      // Named apart from "Copy name": a grid renders dozens of
                      // both, and a screen reader would otherwise hear the same
                      // control twice per card.
                      label="Copy berth"
                      className={cn(
                        "relative z-10 opacity-0 transition-opacity",
                        "group-hover/berth:opacity-100 focus-visible:opacity-100",
                        "[@media(hover:none)]:opacity-100",
                      )}
                    />
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
      {/* The stretched link. It sits above the card but below the z-10
          overlays, so the card is clickable everywhere the controls are not. */}
      <Link
        href={`/items/${item.id}`}
        aria-label={item.name}
        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
      {overlays ? (
        <>
          <FavoriteButton id={item.id} favorite={item.favorite} />
          <QuickWearButton id={item.id} name={item.name} />
        </>
      ) : null}
    </div>
  );
}
