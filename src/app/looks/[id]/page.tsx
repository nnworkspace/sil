import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Archive, AlertTriangle } from "lucide-react";

import { getLookWithItems, getBrowseItems } from "@/lib/queries";
import { NO_FILTERS } from "@/lib/browse";
import { addLookItems } from "@/app/looks/actions";
import { formatDate } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogLookButton } from "@/components/log-look-button";
import { PageHeader } from "@/components/page-header";
import { Markdown } from "@/components/markdown";
import { WardrobePicker, type PickerItem } from "@/components/wardrobe-picker";
import { LookPieces, type LookPiece } from "@/components/look-pieces";
import { LookPhotos } from "@/components/look-photos";
import { LookActions } from "@/components/look-actions";

export const dynamic = "force-dynamic";

export default async function LookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const look = await getLookWithItems(id);
  if (!look) notFound();

  const wardrobe = await getBrowseItems(NO_FILTERS);
  const pickerItems: PickerItem[] = wardrobe.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    secondaryCategories: i.secondaryCategories,
    photoUrl: i.photos[0]?.url ?? null,
    material: i.material,
    tags: i.tags,
    color: i.color,
    pricePaidCents: i.pricePaidCents,
    purchasedAt: i.purchasedAt,
    createdAt: i.createdAt,
    priorWears: i.priorWears,
    wearEvents: i.wearEvents,
  }));
  const addedIds = look.lookItems.map((li) => li.itemId);
  const total = look.lookItems.length;

  // "Incomplete" ⇒ at least one member piece has been archived (#170). Derived,
  // not stored: the look stays visible, just flagged as no longer fully wearable.
  const archivedMembers = look.lookItems.filter((li) => li.item.archivedAt);
  const incomplete = archivedMembers.length > 0;

  // Flat list in the owner's manual order (the query returns look_items by sort).
  const pieces: LookPiece[] = look.lookItems.map((li) => ({
    itemId: li.itemId,
    name: li.item.name,
    brand: li.item.brand,
    photoUrl: li.item.photos[0]?.url ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        className="mb-4"
        title={look.name}
        badge={
          <Badge variant="secondary" className="shrink-0 capitalize">
            {look.kind}
          </Badge>
        }
        actions={
          <>
            <LogLookButton
              pieces={pieces.map((p) => ({ itemId: p.itemId, name: p.name }))}
            />
            <Link
              href={`/looks/${look.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Pencil className="size-4" />
              Edit
            </Link>
            <LookActions
              id={look.id}
              name={look.name}
              archived={Boolean(look.archivedAt)}
            />
          </>
        }
      />

      {/* An archived look stays viewable but says plainly it has been retired
          (#170), mirroring the archived-item banner. */}
      {look.archivedAt ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 border bg-muted/40 px-4 py-3 text-sm">
          <Archive className="size-4 text-muted-foreground" />
          <span className="font-medium">Archived</span>
          {look.archiveReason ? (
            <span className="capitalize text-muted-foreground">
              · {look.archiveReason.replace(/-/g, " ")}
            </span>
          ) : null}
          <span className="text-muted-foreground">
            · {formatDate(look.archivedAt)}
          </span>
          {look.archiveNote ? (
            <span className="w-full text-muted-foreground">
              {look.archiveNote}
            </span>
          ) : null}
        </div>
      ) : incomplete ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 text-amber-600" />
          <span className="font-medium">Incomplete</span>
          <span className="text-muted-foreground">
            · contains {archivedMembers.length}{" "}
            {archivedMembers.length === 1 ? "piece" : "pieces"} that left the
            wardrobe — edit the look to keep it wearable.
          </span>
        </div>
      ) : null}

      {look.notes ? (
        <div className="mb-6">
          <Markdown>{look.notes}</Markdown>
        </div>
      ) : null}

      <div className="mb-8">
        <LookPhotos
          lookId={look.id}
          photos={look.photos.map((p) => ({
            id: p.id,
            url: p.url,
            isPrimary: p.isPrimary,
            takenOn: p.takenOn,
            place: p.place,
            sort: p.sort,
          }))}
        />
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          {total} {total === 1 ? "piece" : "pieces"}
        </span>
        <WardrobePicker
          action={addLookItems}
          contextField="lookId"
          contextId={look.id}
          items={pickerItems}
          addedIds={addedIds}
          triggerLabel="Add pieces"
        />
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            This look is empty — add the pieces that make it up.
          </p>
        </div>
      ) : (
        <LookPieces lookId={look.id} pieces={pieces} />
      )}
    </div>
  );
}
