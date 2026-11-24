"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";

import { addLookPhotos, deleteLookPhoto, setLookCover } from "@/app/looks/actions";
import { IMAGE_ACCEPT } from "@/lib/images";
import { Button, buttonVariants } from "@/components/ui/button";
import { PhotoViewer } from "@/components/photo-viewer";
import { inPhotoOrder, photoCaption, stepIndex } from "@/lib/photos";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type LookPhoto = {
  id: string;
  url: string;
  isPrimary: boolean;
  /** When and where it was taken, when the owner has said (#244). */
  takenOn?: string | null;
  place?: string | null;
  sort?: number | null;
};

/**
 * The owner's own photos of a Look (#98): a cover-first grid with set-cover (★)
 * and remove (✕) controls, plus an upload button. When empty, just the upload
 * control; the piece-collage stands in as the cover meanwhile.
 *
 * Each photo opens the shared full-screen viewer (#195), the same one item
 * pages use: a look photo is usually a full-length shot of the outfit as worn,
 * so it is precisely the photo worth looking at closely.
 *
 * Three targets sit in the same square, and each does exactly one thing: the
 * photo enlarges, ★ sets the cover, ✕ deletes. The controls are siblings of the
 * photo button rather than nested inside it, so a click on either cannot reach
 * the photo; they also stop propagation explicitly, so that stays true if the
 * markup is ever restructured. **Deleting always asks first**: it is
 * irreversible and the ✕ sits directly on top of the photo.
 */
export function LookPhotos({ lookId, photos: given }: { lookId: string; photos: LookPhoto[] }) {
  // Cover first, then oldest to newest where a date is known (#244), so a look
  // with several photographs reads as a record of when it was actually worn.
  const photos = React.useMemo(() => inPhotoOrder(given), [given]);
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [viewerAt, setViewerAt] = React.useState<number | null>(null);
  /** The photo awaiting delete confirmation, if any. */
  const [confirming, setConfirming] = React.useState<LookPhoto | null>(null);

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.append("lookId", lookId);
    for (const f of files) fd.append("photos", f);
    start(async () => {
      const res = await addLookPhotos(fd);
      if (res && "errors" in res) {
        toast.error(res.errors.photos?.[0] ?? "Could not add photos.");
      } else {
        toast.success(files.length === 1 ? "Photo added" : `${files.length} photos added`);
        router.refresh();
      }
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const setCover = (photoId: string) => {
    const fd = new FormData();
    fd.append("lookId", lookId);
    fd.append("photoId", photoId);
    start(async () => {
      await setLookCover(fd);
      toast.success("Cover updated");
      router.refresh();
    });
  };

  /** Only ever reached from the confirmation dialog. */
  const remove = (photoId: string) => {
    const fd = new FormData();
    fd.append("lookId", lookId);
    fd.append("photoId", photoId);
    start(async () => {
      await deleteLookPhoto(fd);
      setConfirming(null);
      // The viewer may be showing the photo that just went, and every index
      // behind it has shifted, so close rather than show the wrong one.
      setViewerAt(null);
      toast.success("Photo removed");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          {photos.length > 0 ? "Photos" : "Add a photo of this look"}
        </h2>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Upload
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photo yet. The collage of its pieces is used as the cover meanwhile.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="group relative">
              <button
                type="button"
                onClick={() => setViewerAt(i)}
                aria-label="Enlarge photo"
                className="block w-full cursor-zoom-in"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={p.url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover"
                  />
                </div>
              </button>
              {p.isPrimary ? (
                // pointer-events-none so the badge cannot swallow a click that
                // was meant for the photo underneath it.
                <span className="pointer-events-none absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  Cover
                </span>
              ) : null}
              <div className="absolute right-1.5 top-1.5 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {!p.isPrimary ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCover(p.id);
                    }}
                    aria-label="Set as cover"
                    title="Set as cover"
                    className="rounded-full bg-white/85 p-1.5 text-foreground shadow hover:bg-white disabled:opacity-50"
                  >
                    <Star className="size-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirming(p);
                  }}
                  aria-label="Remove photo"
                  title="Remove photo"
                  className="rounded-full bg-white/85 p-1.5 text-foreground shadow hover:bg-white disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              </div>
              {photoCaption(p) ? (
                <p className="mt-1 text-xs text-muted-foreground">{photoCaption(p)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {viewerAt !== null ? (
        <PhotoViewer
          photos={photos}
          index={viewerAt}
          onClose={() => setViewerAt(null)}
          onStep={(delta) =>
            setViewerAt((at) => (at === null ? at : stepIndex(at, delta, photos.length)))
          }
        />
      ) : null}

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this photo?</DialogTitle>
            <DialogDescription>
              The photo is deleted from this look and from storage. The look and its pieces are
              untouched. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline" })}>Cancel</DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => confirming && remove(confirming.id)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
