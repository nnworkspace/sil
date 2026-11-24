"use client";

import * as React from "react";
import { Heart } from "lucide-react";

import { toggleFavorite } from "@/app/items/actions";
import { cn } from "@/lib/utils";

/** Quick-favourite heart overlay for a grid card (#117). Outline when not a
 *  favourite, filled rose when it is; toggles optimistically via a server
 *  action. Sits over the card (a sibling of its link), so clicking it favourites
 *  the piece without navigating. */
export function FavoriteButton({
  id,
  favorite,
  className,
}: {
  id: string;
  favorite: boolean;
  className?: string;
}) {
  const [fav, setFav] = React.useState(favorite);
  const [prevFavorite, setPrevFavorite] = React.useState(favorite);
  const [pending, start] = React.useTransition();

  // Sync to the server value when it changes (e.g. after revalidation): the
  // React "reset state during render" pattern, so we never setState in an effect.
  if (favorite !== prevFavorite) {
    setPrevFavorite(favorite);
    setFav(favorite);
  }

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFav((f) => !f); // optimistic
    const fd = new FormData();
    fd.append("id", id);
    start(() => {
      void toggleFavorite(fd);
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={fav}
      aria-label={fav ? "Remove from favourites" : "Add to favourites"}
      title={fav ? "Favourite" : "Mark as favourite"}
      className={cn(
        "absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur transition-colors hover:bg-background",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          fav ? "fill-rose-500 text-rose-500" : "text-muted-foreground",
        )}
      />
    </button>
  );
}
