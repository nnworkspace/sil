"use client";

import * as React from "react";
import Image from "next/image";
import { GripVertical, Star, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { PHOTO_KINDS } from "@/lib/categories";
import type { ItemPhoto } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Edit-form control to reorder a piece's existing photos and pick its cover
 * (specs/catalog; issue #56). Photos stay grouped by kind ("Official" / "Mine")
 * as in the gallery; drag reorders *within* a group. The cover can be any photo
 * from either group and becomes `is_primary`. The chosen order is submitted as
 * `photoOrder` (JSON array of ids), the cover as `coverPhotoId`, and drops as
 * `removePhotoIds`; `updateItem` maps these onto the `sort` / `is_primary`
 * columns. Newly-uploaded photos are appended after this set.
 */
function SortablePhoto({
  photo,
  isCover,
  onCover,
  onRemove,
}: {
  photo: ItemPhoto;
  isCover: boolean;
  onCover: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative w-24", isDragging && "z-10 opacity-80")}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
        <Image src={photo.url} alt="" fill sizes="96px" className="object-cover" />
        {isCover ? (
          <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Star className="size-3 fill-current" /> Cover
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(photo.id)}
          aria-label="Remove photo"
          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="flex cursor-grab touch-none items-center rounded border p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>
        {isCover ? (
          <span className="text-[10px] text-muted-foreground">Cover</span>
        ) : (
          <button
            type="button"
            onClick={() => onCover(photo.id)}
            className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
          >
            Make cover
          </button>
        )}
      </div>
    </div>
  );
}

export function PhotoReorder({ photos }: { photos: ItemPhoto[] }) {
  // dnd-kit derives its accessibility ids (`DndDescribedBy-<n>`) from a
  // module-level counter when a DndContext has no `id`. On the server that
  // module lives for the life of the process, so the counter climbs across
  // requests; on the client it starts at 0. The two renders then disagree and
  // React reports a hydration mismatch on every edit page (#209). useId is
  // stable across server and client, which is exactly what is needed.
  const dndId = React.useId();
  const [order, setOrder] = React.useState<ItemPhoto[]>(photos);
  const [removed, setRemoved] = React.useState<string[]>([]);
  const [coverId, setCoverId] = React.useState<string>(
    () => photos.find((p) => p.isPrimary)?.id ?? photos[0]?.id ?? "",
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const from = prev.findIndex((p) => p.id === active.id);
      const to = prev.findIndex((p) => p.id === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  }

  function remove(id: string) {
    setOrder((prev) => prev.filter((p) => p.id !== id));
    setRemoved((r) => (r.includes(id) ? r : [...r, id]));
  }

  // The effective cover: the chosen one while it survives, else the first photo.
  const cover = order.some((p) => p.id === coverId) ? coverId : order[0]?.id ?? "";

  return (
    <div className="space-y-3">
      <div>
        <Label>Current photos</Label>
        {order.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Drag to reorder within a group. Set any photo as the cover.
          </p>
        ) : null}
      </div>
      {PHOTO_KINDS.map(({ value, label }) => {
        const group = order.filter((p) => p.kind === value);
        if (group.length === 0) return null;
        return (
          <div key={value} className="space-y-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
            <DndContext
              // One context per photo kind, so the ids must differ within the
              // component as well as between renders.
              id={`${dndId}-${value}`}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={group.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="flex flex-wrap gap-3">
                  {group.map((photo) => (
                    <SortablePhoto
                      key={photo.id}
                      photo={photo}
                      isCover={photo.id === cover}
                      onCover={setCoverId}
                      onRemove={remove}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        );
      })}
      <input
        type="hidden"
        name="photoOrder"
        value={JSON.stringify(order.map((p) => p.id))}
      />
      <input type="hidden" name="coverPhotoId" value={cover} />
      {removed.map((id) => (
        <input key={id} type="hidden" name="removePhotoIds" value={id} />
      ))}
    </div>
  );
}
