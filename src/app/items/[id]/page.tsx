import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Copy, Pencil, Heart, Shirt, Archive, MapPin } from "lucide-react";

import {
  getItemWithPhotos,
  getTripOptions,
  getLooksForItem,
  getGoesWith,
  getLookOptions,
} from "@/lib/queries";
import { CATEGORIES, parentOf } from "@/lib/categories";
import { entriesForPiece, entryHref } from "@/lib/compendium/entries";
import { formatPrice, formatDate } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Separator } from "@/components/ui/separator";
import { Markdown } from "@/components/markdown";
import { PhotoGallery } from "@/components/photo-gallery";
import { ItemActions } from "@/components/item-actions";
import { AddToTrip } from "@/components/add-to-trip";
import { AddToLook } from "@/components/add-to-look";
import { WearLog } from "@/components/wear-log";

export const dynamic = "force-dynamic";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  if (children == null || children === "") return null;
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItemWithPhotos(id);
  if (!item) notFound();

  // Derived, never stored (VAL-COMP-05): the piece is already loaded, so this
  // costs one pass over ~28 entries and no extra query.
  const compendium = entriesForPiece(item);

  const trips = await getTripOptions();
  const looks = await getLookOptions();
  const inLooks = await getLooksForItem(id);
  const goesWith = await getGoesWith(id);

  const paid = formatPrice(item.pricePaidCents, item.currency);
  const list = formatPrice(item.listPriceCents, item.currency);

  // Group the assigned categories (primary + secondaries) under their top-level
  // parent, so the line reads "Trousers › Shorts, Culottes · Skirts" — the
  // parent shown once even when several sub-categories share it (#168).
  const catLabel = (slug: string) =>
    CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
  const rootOf = (slug: string) => {
    let s = slug;
    for (let p = parentOf(s); p; p = parentOf(s)) s = p;
    return s;
  };
  const categoryGroups: { root: string; children: string[] }[] = [];
  for (const slug of [item.category, ...item.secondaryCategories]) {
    const root = rootOf(slug);
    let group = categoryGroups.find((g) => g.root === root);
    if (!group) {
      group = { root, children: [] };
      categoryGroups.push(group);
    }
    if (slug !== root) group.children.push(slug);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* The title keeps a sensible minimum width (basis-72) and grows to fill;
          when the title plus the six-button toolbar don't fit, the toolbar wraps
          to its own line and the title takes the full width — so the name is
          never crushed to one word per line at narrow widths (#157). On wide
          screens flex-1 pushes the toolbar to the right, as before. */}
      <PageHeader
        title={item.name}
        badge={
          item.favorite ? (
            <Heart className="size-5 shrink-0 fill-rose-500 text-rose-500" />
          ) : null
        }
        meta={
          item.brand || item.storageLocation ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
              {item.brand ? <span>{item.brand}</span> : null}
              {item.brand && item.storageLocation ? (
                <span aria-hidden>·</span>
              ) : null}
              {item.storageLocation ? (
                <span className="inline-flex items-center gap-1 font-mono text-sm">
                  <MapPin className="size-4" />
                  {item.storageLocation}
                </span>
              ) : null}
            </p>
          ) : null
        }
        actions={
          <>
            <Link
              href={`/items/${item.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Pencil className="size-4" />
              Edit
            </Link>
            <Link
              href={`/items/new?from=${item.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Copy className="size-4" />
              Duplicate
            </Link>
            <AddToLook itemId={item.id} itemName={item.name} looks={looks} />
            <AddToTrip itemId={item.id} itemName={item.name} trips={trips} />
            <ItemActions
              id={item.id}
              name={item.name}
              archived={Boolean(item.archivedAt)}
              looks={inLooks}
            />
          </>
        }
      />

      {/* An archived piece stays fully viewable and editable, but says plainly
          that it has left the wardrobe (specs/archive, OP-EDIT-ARCHIVED). */}
      {item.archivedAt ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 border bg-muted/40 px-4 py-3 text-sm">
          <Archive className="size-4 text-muted-foreground" />
          <span className="font-medium">Archived</span>
          {item.archiveReason ? (
            <span className="capitalize text-muted-foreground">
              · {item.archiveReason.replace("-", " ")}
            </span>
          ) : null}
          <span className="text-muted-foreground">
            · {formatDate(item.archivedAt)}
          </span>
          {item.archiveNote ? (
            <span className="w-full text-muted-foreground">
              {item.archiveNote}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <PhotoGallery photos={item.photos} fitWhole={item.showFullCover} />

        <div className="space-y-6">
          {item.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}

          <dl className="space-y-2">
            <Field label="Category">
              {categoryGroups.map((g, gi) => (
                <span key={g.root}>
                  {gi > 0 ? " · " : null}
                  <Link href={`/category/${g.root}`} className="underline">
                    {catLabel(g.root)}
                  </Link>
                  {g.children.length > 0 ? (
                    <>
                      {" › "}
                      {g.children.map((child, ci) => (
                        <span key={child}>
                          {ci > 0 ? ", " : null}
                          <Link
                            href={`/category/${child}`}
                            className="underline"
                          >
                            {catLabel(child)}
                          </Link>
                        </span>
                      ))}
                    </>
                  ) : null}
                </span>
              ))}
            </Field>
            <Field label="Colour">{item.color}</Field>
            <Field label="Size">{item.size}</Field>
            <Field label="Product code">{item.productCode}</Field>
            <Field label="Price paid">
              {paid ? (
                <span>
                  {paid}
                  {list && list !== paid ? (
                    <span className="ml-2 text-muted-foreground line-through">
                      {list}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </Field>
            <Field label="Purchased">{formatDate(item.purchasedAt)}</Field>
            <Field label="Channel">{item.purchaseChannel}</Field>
            <Field label="Return by">{formatDate(item.returnBy)}</Field>
            <Field label="Return policy">{item.returnPolicy}</Field>
            <Field label="Material">{item.material}</Field>
            {/* The other half of the two-way link (VAL-COMP-09, #213): what
                this piece is made of, explained. Directly under Material, and
                only when something matches — `Field` renders nothing for an
                empty child, so a piece with no recognised material simply does
                not gain a row. Reference, not decoration: plain links, no chips
                competing with the tags below. */}
            <Field label="Compendium">
              {compendium.length > 0 ? (
                <span className="flex flex-wrap gap-x-2 gap-y-1">
                  {compendium.map((e, i) => (
                    <span key={e.slug}>
                      <Link
                        href={entryHref(e.slug)}
                        className="underline underline-offset-2"
                      >
                        {e.term}
                      </Link>
                      {i < compendium.length - 1 ? (
                        <span className="text-muted-foreground" aria-hidden>
                          {" ·"}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </span>
              ) : null}
            </Field>
            {/* Care is prose, not a scalar (#237). It carries the maker's own
                instruction quoted verbatim, then separately-labelled advice
                below, and that separation is held entirely by the emphasis and
                the bullets — so rendering it flat destroyed the one thing the
                field is for. It stays in the field list rather than moving out
                to its own section: the value column is already `col-span-2` and
                wraps, so a block renders comfortably here, and Care belongs
                beside Material where it is read. The first `[&_p]` margin is
                dropped so the first line still sits level with its label. */}
            <Field label="Care">
              {item.care ? (
                <Markdown className="[&>*:first-child]:mt-0">
                  {item.care}
                </Markdown>
              ) : null}
            </Field>
            <Field label="Link">
              {item.productUrl ? (
                <a
                  href={item.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Product page
                </a>
              ) : null}
            </Field>
          </dl>

          {item.description ? (
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">
                Description
              </h2>
              <Markdown>{item.description}</Markdown>
            </div>
          ) : null}

          {item.notes ? (
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">
                Notes
              </h2>
              <Markdown>{item.notes}</Markdown>
            </div>
          ) : null}

          {item.details.length > 0 ? (
            <div className="space-y-3">
              <Separator />
              {item.details.map((d, i) => (
                <div key={i}>
                  <h3 className="text-sm font-medium">{d.label}</h3>
                  <p className="text-sm text-muted-foreground">{d.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {inLooks.length > 0 ? (
            <div className="space-y-3">
              <Separator />
              <div>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  In these looks
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {inLooks.map((l) => (
                    <Link
                      key={l.id}
                      href={`/looks/${l.id}`}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors hover:border-primary"
                    >
                      {l.name}
                      <span className="text-xs capitalize text-muted-foreground">
                        · {l.kind}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              {goesWith.length > 0 ? (
                <div>
                  <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                    Goes with
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {goesWith.map((p) => (
                      <Link key={p.id} href={`/items/${p.id}`} className="w-16">
                        <span className="relative block aspect-[3/4] overflow-hidden rounded border bg-muted transition-colors hover:border-primary">
                          {p.photos[0]?.url ? (
                            <Image
                              src={p.photos[0].url}
                              alt={p.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-muted-foreground">
                              <Shirt className="size-4" />
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                          {p.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <Separator />
          <WearLog
            itemId={item.id}
            wears={item.wearEvents}
            pricePaidCents={item.pricePaidCents}
            currency={item.currency}
            priorWears={item.priorWears}
          />
        </div>
      </div>
    </div>
  );
}
