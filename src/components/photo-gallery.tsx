"use client";

import * as React from "react";
import Image from "next/image";

import { PHOTO_KINDS } from "@/lib/categories";
import type { ItemPhoto } from "@/db/schema";
import { PhotoViewer } from "@/components/photo-viewer";
import { inPhotoOrder, photoCaption, stepIndex } from "@/lib/photos";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type LightboxState = { photos: ItemPhoto[]; index: number } | null;

/**
 * Detail-page gallery: one Embla carousel per kind ("Official" / "Mine"), each
 * in the owner's chosen order with the cover (primary) leading its group (#56),
 * and ‹ › arrows when a group overflows. Clicking a photo opens the shared
 * full-screen viewer with zoom & pan ([`PhotoViewer`](photo-viewer.tsx)), which
 * looks now share (#195). The gallery decides *which* photos are in scope (its
 * own kind group), the viewer handles the rest.
 */
export function PhotoGallery({
  photos,
  fitWhole = false,
}: {
  photos: ItemPhoto[];
  /** Fit each thumbnail whole (object-contain) rather than cropping (#58). */
  fitWhole?: boolean;
}) {
  const [lightbox, setLightbox] = React.useState<LightboxState>(null);

  const step = React.useCallback(
    (delta: number) =>
      setLightbox((lb) =>
        lb ? { photos: lb.photos, index: stepIndex(lb.index, delta, lb.photos.length) } : lb,
      ),
    [],
  );

  if (photos.length === 0) return null;

  return (
    <div className="space-y-6">
      {PHOTO_KINDS.map(({ value, label }) => {
        const group = inPhotoOrder(photos.filter((p) => p.kind === value));
        if (group.length === 0) return null;
        const showArrows = group.length > 2;
        return (
          <div key={value} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
            <Carousel opts={{ align: "start", loop: true }} className="w-full px-1">
              <CarouselContent>
                {group.map((photo, i) => (
                  <CarouselItem key={photo.id} className="basis-1/2 sm:basis-1/3">
                    <button
                      type="button"
                      onClick={() => setLightbox({ photos: group, index: i })}
                      className="block w-full cursor-zoom-in"
                      aria-label="Enlarge photo"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                        <Image
                          src={photo.url}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          // The cover leads its group (#56) and is the page's LCP;
                          // load it eagerly so it never lazy-loads late (or stalls
                          // under concurrent optimization), instead of blank (#159).
                          priority={i === 0}
                          className={fitWhole ? "object-contain" : "object-cover"}
                        />
                      </div>
                    </button>
                    {/* When and where, when they are known (#244). Rendered
                        only if there is something to say: most photos here are
                        retailer stills, and an empty line under every one of
                        them would be worse than no line at all. */}
                    {photoCaption(photo) ? (
                      <p className="mt-1 text-xs text-muted-foreground">{photoCaption(photo)}</p>
                    ) : null}
                  </CarouselItem>
                ))}
              </CarouselContent>
              {showArrows ? (
                <>
                  <CarouselPrevious className="left-1" />
                  <CarouselNext className="right-1" />
                </>
              ) : null}
            </Carousel>
          </div>
        );
      })}

      {lightbox ? (
        <PhotoViewer
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onStep={step}
        />
      ) : null}
    </div>
  );
}
