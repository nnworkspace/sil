"use client";

import * as React from "react";
import { useActionState } from "react";
import { Heart, Loader2, MapPin, Plus, Save, X } from "lucide-react";

import {
  CATEGORIES,
  TOP_LEVEL_CATEGORIES,
  TAG_GROUPS,
  childrenOf,
  parentOf,
} from "@/lib/categories";

// Category options in tree order: each top-level category followed by its
// sub-categories (depth 1), so the picker reflects the hierarchy (#78).
const CATEGORY_TREE = TOP_LEVEL_CATEGORIES.flatMap((c) => [
  { slug: c.slug, label: c.label, depth: 0 },
  ...childrenOf(c.slug).map((ch) => ({ slug: ch.slug, label: ch.label, depth: 1 })),
]);
import { currencyOptions, DEFAULT_CURRENCY } from "@/lib/currencies";
import { cn, fileInputClass } from "@/lib/utils";
import { IMAGE_ACCEPT } from "@/lib/images";
import type { ActionResult } from "@/app/items/actions";
import type { ItemDetail, ItemPhoto } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoReorder } from "@/components/photo-reorder";

export type ItemFormValues = {
  name?: string;
  category?: string;
  secondaryCategories?: string[];
  brand?: string;
  productCode?: string;
  color?: string;
  size?: string;
  productUrl?: string;
  listPrice?: string;
  pricePaid?: string;
  currency?: string;
  purchasedAt?: string;
  purchaseChannel?: string;
  returnBy?: string;
  returnPolicy?: string;
  storageLocation?: string;
  notes?: string;
  description?: string;
  material?: string;
  care?: string;
  favorite?: boolean;
  showFullCover?: boolean;
  priorWears?: number | null;
  tags?: string[];
  details?: ItemDetail[];
};

type FormAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-destructive">{errors.join(" ")}</p>;
}

/**
 * Human labels for the error summary, so it can name a field the form has no
 * inline slot for. Anything missing here falls back to the schema key, which is
 * ugly but still tells the owner where to look: the rule is that a rejected
 * save is never silent, not that every key has been prettified.
 */
const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  category: "Main category",
  secondaryCategories: "Also in",
  brand: "Brand",
  productCode: "Product code",
  color: "Colour",
  size: "Size",
  productUrl: "Product URL",
  listPrice: "List price",
  listPriceCents: "List price",
  pricePaid: "Price paid",
  pricePaidCents: "Price paid",
  currency: "Currency",
  purchasedAt: "Purchased",
  purchaseChannel: "Channel",
  returnBy: "Return by",
  returnPolicy: "Return policy",
  storageLocation: "Berth",
  priorWears: "Wears before tracking",
  tags: "Tags",
  notes: "Your notes",
  description: "Description",
  material: "Material",
  care: "Care",
  details: "Extra details",
  photos: "Photos",
  wearEvents: "Wear log",
};

/**
 * Everything the action rejected, in one place (#238).
 *
 * The form previously rendered an inline message for ten fields and nothing at
 * all for the rest, so a validation error on, say, `care` discarded the whole
 * edit while the page re-rendered looking untouched. The owner's berth change
 * was thrown away with no message.
 *
 * This summary is deliberately keyed off the *returned errors* rather than off
 * a list of fields someone remembered to wire up, which is what makes it
 * complete by construction: a field added to the schema tomorrow is covered
 * without anyone touching this component.
 */
function ErrorSummary({ errors }: { errors: Record<string, string[]> }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors).filter(([, msgs]) => msgs?.length);

  // Pull focus to it on failure: the offending field is often far off-screen,
  // and "nothing happened" is exactly how this bug presented.
  React.useEffect(() => {
    if (entries.length > 0) ref.current?.focus();
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/5 p-4 outline-none"
    >
      <p className="text-sm font-medium text-destructive">
        {entries.length === 1
          ? "This change was not saved."
          : `This change was not saved: ${entries.length} fields need attention.`}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-destructive">
        {entries.map(([field, msgs]) => (
          <li key={field}>
            <span className="font-medium">{FIELD_LABELS[field] ?? field}</span>
            {": "}
            {msgs.join(" ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ItemForm({
  action,
  values = {},
  existingPhotos = [],
  officialPhotoUrls,
  wears = [],
  submitLabel,
}: {
  action: FormAction;
  values?: ItemFormValues;
  existingPhotos?: ItemPhoto[];
  officialPhotoUrls?: string[];
  wears?: { wornAt: string; occasion: string | null; note: string | null }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  const [details, setDetails] = React.useState<ItemDetail[]>(
    values.details ?? [],
  );
  const [wearLog, setWearLog] = React.useState(
    wears.map((w) => ({
      wornAt: w.wornAt,
      occasion: w.occasion ?? "",
      note: w.note ?? "",
    })),
  );
  const today = new Date().toISOString().slice(0, 10);
  const occasionTags =
    TAG_GROUPS.find((g) => g.kind === "occasion")?.tags ?? [];
  // Official photos found by a saved-page import, previewed here and downloaded
  // by createItem at save time (VAL-IMPORT-06). The owner can drop any before saving.
  const [officialUrls, setOfficialUrls] = React.useState<string[]>(
    officialPhotoUrls ?? [],
  );
  const [category, setCategory] = React.useState(values.category ?? "");
  const [secondary, setSecondary] = React.useState<string[]>(
    values.secondaryCategories ?? [],
  );

  /**
   * Families that are ticked *because* a sub-category is, mapped to the label
   * that implies them (#206). Ticking Jeans means the piece is in Trousers,
   * so Trousers shows ticked, marked "via Jeans", and is not editable: it is a
   * consequence, not a choice.
   *
   * Derived on every render from the current primary and ticks, so changing the
   * primary updates it immediately and a family stops being implied the moment
   * nothing implies it. The server applies the same rule on save
   * (`normaliseSecondaries`), so the stored data agrees with what is shown.
   */
  const impliedParents = React.useMemo(() => {
    const map = new Map<string, string>();
    const mark = (child: string) => {
      const parent = parentOf(child);
      if (!parent || parent === category) return;
      if (!map.has(parent)) {
        map.set(parent, CATEGORIES.find((c) => c.slug === child)?.label ?? child);
      }
    };
    if (category) mark(category);
    for (const s of secondary) mark(s);
    return map;
  }, [category, secondary]);

  return (
    <form action={formAction} className="space-y-8">
      <ErrorSummary errors={errors} />

      {/* Basics */}
      <section className="space-y-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" defaultValue={values.name} required />
          <FieldError errors={errors.name} />
        </div>
        {/* Categories (#206). Two controls, clearly separated: one required
            primary, and the extras. The primary is NOT repeated in the extras
            list: it is set here, and offering it there as a locked tick box
            was a dead end the owner reasonably tried to use. */}
        <div>
          <Label htmlFor="category">Main category *</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Where this piece lives. Every piece has exactly one. Change it here to move it.
          </p>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className={cn(inputCls, "mt-1")}
          >
            <option value="" disabled>
              Choose a category…
            </option>
            {CATEGORY_TREE.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.depth ? `    ${c.label}` : c.label}
              </option>
            ))}
          </select>
          <FieldError errors={errors.category} />
        </div>
        <div>
          <Label>Also in</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Extra categories this piece also belongs to. Ticking a sub-category ticks its
            family too: a pair of jeans is also in Trousers.
          </p>
          {/* Families flow into columns rather than forming one long list
              (#206). An explicit count, not a column *width*: the owner wants
              four columns on a wide screen, and a width-based rule cannot
              promise a number. It depends on the viewport, which is how this
              ended up showing three. `break-inside-avoid` on each family keeps
              a parent with its sub-types; a break between "Tops" and "T-Shirts"
              would destroy the hierarchy the indentation conveys. The original
              layout (one wrapping flex row) overflowed horizontally and
              pushed items off the right edge, unreachable.

              Sized by column *width* with tight spacing rather than a fixed
              count, so the browser fits as many as the space allows at every
              width, with no breakpoints to keep in sync. */}
          <div className="mt-2 gap-x-3" style={{ columnWidth: "7.5rem" }}>
            {TOP_LEVEL_CATEGORIES.map((top) => {
              const kids = childrenOf(top.slug);
              const rows = [
                { slug: top.slug, label: top.label, child: false },
                ...kids.map((k) => ({ slug: k.slug, label: k.label, child: true })),
              ].filter((r) => r.slug !== category); // the primary is set above
              if (rows.length === 0) return null;
              return (
                <fieldset key={top.slug} className="mb-2 break-inside-avoid">
                  <legend className="sr-only">{top.label}</legend>
                  <div className="space-y-0.5">
                    {rows.map((r) => {
                      const impliedBy = impliedParents.get(r.slug);
                      const checked = impliedBy !== undefined || secondary.includes(r.slug);
                      return (
                        <label
                          key={r.slug}
                          className={cn(
                            // items-start, not items-center: a long label like
                            // "Underwear and Pyjamas" wraps in a narrow column,
                            // and the box should sit against its first line.
                            "flex items-start gap-1.5 text-sm leading-snug",
                            r.child && "pl-3",
                            impliedBy !== undefined && "text-muted-foreground",
                          )}
                        >
                          <input
                            type="checkbox"
                            // An implied family is ticked and not editable: it
                            // is a consequence of the sub-category, not a
                            // choice. It carries no name: the server re-derives
                            // it, so nothing depends on it being submitted.
                            name={impliedBy === undefined ? "secondaryCategories" : undefined}
                            value={r.slug}
                            checked={checked}
                            disabled={impliedBy !== undefined}
                            onChange={(e) =>
                              setSecondary((prev) =>
                                e.target.checked
                                  ? [...prev, r.slug]
                                  : prev.filter((x) => x !== r.slug),
                              )
                            }
                            className="mt-0.5 size-4 shrink-0"
                          />
                          <span>{r.label}</span>
                          {impliedBy !== undefined ? (
                            <span className="shrink-0 text-xs">via {impliedBy}</span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
          <FieldError errors={errors.secondaryCategories} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="favorite"
            defaultChecked={values.favorite}
            className="size-4"
          />
          <Heart className="size-4 text-rose-500" />
          Mark as favourite
        </label>
      </section>

      {/* Product identity */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" name="brand" defaultValue={values.brand} />
          <FieldError errors={errors.brand} />
        </div>
        <div>
          <Label htmlFor="productCode">Product code</Label>
          <Input id="productCode" name="productCode" defaultValue={values.productCode} />
          <FieldError errors={errors.productCode} />
        </div>
        <div>
          <Label htmlFor="color">Colour</Label>
          <Input id="color" name="color" defaultValue={values.color} />
          <FieldError errors={errors.color} />
        </div>
        <div>
          <Label htmlFor="size">Size</Label>
          <Input id="size" name="size" defaultValue={values.size} placeholder="EU M" />
          <FieldError errors={errors.size} />
        </div>
        {/* Berth belongs here, not with the purchase fields (#202): price, date
            and return terms are fixed at the moment of buying, while the berth
            is where the piece lives *now* and changes whenever a shelf is
            reorganised. It is also the field edited most often after filing, so
            it must not sit two thirds down the form. The pin matches the detail
            page and the card, so it can be found by shape rather than by
            reading every label. */}
        <div className="sm:col-span-2">
          <Label htmlFor="storageLocation" className="gap-1.5">
            <MapPin className="size-4 text-muted-foreground" aria-hidden />
            Berth
          </Label>
          <Input
            id="storageLocation"
            name="storageLocation"
            defaultValue={values.storageLocation}
            placeholder="e.g. R1-W7R2-S4-R"
            maxLength={31}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Where it&apos;s kept, so you can find it fast.
          </p>
          <FieldError errors={errors.storageLocation} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="productUrl">Product URL</Label>
          <Input id="productUrl" name="productUrl" type="url" defaultValue={values.productUrl} />
          <FieldError errors={errors.productUrl} />
        </div>
      </section>

      {/* Pricing & purchase */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="listPrice">List price</Label>
          <Input id="listPrice" name="listPrice" type="number" step="0.01" min="0" defaultValue={values.listPrice} />
          <FieldError errors={errors.listPriceCents} />
        </div>
        <div>
          <Label htmlFor="pricePaid">Price paid</Label>
          <Input id="pricePaid" name="pricePaid" type="number" step="0.01" min="0" defaultValue={values.pricePaid} />
          <FieldError errors={errors.pricePaidCents} />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            name="currency"
            defaultValue={values.currency ?? DEFAULT_CURRENCY}
            className={inputCls}
          >
            {currencyOptions(values.currency).map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="purchasedAt">Purchase date</Label>
          <Input id="purchasedAt" name="purchasedAt" type="date" defaultValue={values.purchasedAt} />
          <FieldError errors={errors.purchasedAt} />
        </div>
        <div>
          <Label htmlFor="purchaseChannel">Purchase channel</Label>
          <Input id="purchaseChannel" name="purchaseChannel" defaultValue={values.purchaseChannel} placeholder="e.g. Atelier Nord online" />
          <FieldError errors={errors.purchaseChannel} />
        </div>
        <div>
          <Label htmlFor="priorWears">Prior wears</Label>
          <Input id="priorWears" name="priorWears" type="number" min="0" step="1" defaultValue={values.priorWears ?? ""} placeholder="not recorded" />
          <FieldError errors={errors.priorWears} />
          <p className="mt-1 text-xs text-muted-foreground">Estimated wears before tracking. Counts toward cost-per-wear.</p>
        </div>
        <div>
          <Label htmlFor="returnBy">Return by</Label>
          <Input id="returnBy" name="returnBy" type="date" defaultValue={values.returnBy} />
          <FieldError errors={errors.returnBy} />
        </div>
        <div className="sm:col-span-3">
          <Label htmlFor="returnPolicy">Return policy</Label>
          <Textarea id="returnPolicy" name="returnPolicy" defaultValue={values.returnPolicy} rows={2} />
          <FieldError errors={errors.returnPolicy} />
        </div>
      </section>

      {/* Tags */}
      <section className="space-y-3">
        <Label>Tags</Label>
        {TAG_GROUPS.map((group) => (
          <div key={group.kind} className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </div>
            <div className="flex flex-wrap gap-3">
              {group.tags.map((tag) => (
                <label key={tag} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="tags"
                    value={tag}
                    defaultChecked={values.tags?.includes(tag)}
                    className="size-4"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
        ))}
        <FieldError errors={errors.tags} />
      </section>

      {/* Descriptive */}
      <section className="space-y-4">
        <div>
          <Label htmlFor="material">Material</Label>
          <Input id="material" name="material" defaultValue={values.material} placeholder="54% linen, 43% viscose, 3% elastane" />
          <FieldError errors={errors.material} />
        </div>
        <div>
          <Label htmlFor="care">Care</Label>
          <Textarea id="care" name="care" defaultValue={values.care} rows={2} />
          <FieldError errors={errors.care} />
        </div>
        <div>
          <Label htmlFor="description">Description (Markdown)</Label>
          <Textarea id="description" name="description" defaultValue={values.description} rows={4} />
          <FieldError errors={errors.description} />
        </div>
        <div>
          <Label htmlFor="notes">Your notes (Markdown)</Label>
          <Textarea id="notes" name="notes" defaultValue={values.notes} rows={3} />
          <FieldError errors={errors.notes} />
        </div>
      </section>

      {/* Brand-specific details */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Extra details</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDetails((d) => [...d, { label: "", value: "" }])}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
        {details.map((row, i) => (
          <div key={i} className="flex gap-2">
            <Input
              aria-label="Detail label"
              placeholder="Label (e.g. Fit)"
              value={row.label}
              onChange={(e) =>
                setDetails((d) => d.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))
              }
              className="max-w-[12rem]"
            />
            <Input
              aria-label="Detail value"
              placeholder="Value"
              value={row.value}
              onChange={(e) =>
                setDetails((d) => d.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
              }
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => setDetails((d) => d.filter((_, j) => j !== i))}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <input
          type="hidden"
          name="details"
          value={JSON.stringify(details.filter((r) => r.label.trim() !== ""))}
        />
        <FieldError errors={errors.details} />
      </section>

      {/* Wear log */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Wear log</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setWearLog((w) => [...w, { wornAt: today, occasion: "", note: "" }])
            }
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
        {wearLog.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <Input
              type="date"
              aria-label="Wear date"
              value={row.wornAt}
              max={today}
              onChange={(e) =>
                setWearLog((w) =>
                  w.map((r, j) => (j === i ? { ...r, wornAt: e.target.value } : r)),
                )
              }
              className="w-auto"
            />
            <select
              aria-label="Occasion"
              value={row.occasion}
              onChange={(e) =>
                setWearLog((w) =>
                  w.map((r, j) => (j === i ? { ...r, occasion: e.target.value } : r)),
                )
              }
              className={cn(inputCls, "w-auto capitalize")}
            >
              <option value="">Occasion…</option>
              {occasionTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Input
              aria-label="Note"
              placeholder="Note (optional)"
              maxLength={255}
              value={row.note}
              onChange={(e) =>
                setWearLog((w) =>
                  w.map((r, j) => (j === i ? { ...r, note: e.target.value } : r)),
                )
              }
              className="min-w-40 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setWearLog((w) => w.filter((_, j) => j !== i))}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <input
          type="hidden"
          name="wearEvents"
          value={JSON.stringify(wearLog.filter((w) => w.wornAt))}
        />
      </section>

      {/* Photos */}
      <section className="space-y-4">
        {officialUrls.length > 0 ? (
          <div className="space-y-2">
            <Label>Official photos found (imported)</Label>
            <p className="text-sm text-muted-foreground">
              These are downloaded and saved with the item. Remove any you
              don&apos;t want.
            </p>
            <div className="flex flex-wrap gap-3">
              {officialUrls.map((url) => (
                <div key={url} className="w-24">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
                    {/* External retailer CDN: plain img (arbitrary hosts, no next/image config) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOfficialUrls((u) => u.filter((x) => x !== url))
                    }
                    className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" /> Remove
                  </button>
                </div>
              ))}
            </div>
            <input
              type="hidden"
              name="officialPhotoUrls"
              value={JSON.stringify(officialUrls)}
            />
          </div>
        ) : null}
        {existingPhotos.length > 0 ? (
          <PhotoReorder photos={existingPhotos} />
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="officialPhotos">Official photos</Label>
            <input id="officialPhotos" name="officialPhotos" type="file" accept={IMAGE_ACCEPT} multiple className={cn(fileInputClass, "mt-1")} />
          </div>
          <div>
            <Label htmlFor="ownPhotos">My photos</Label>
            <input id="ownPhotos" name="ownPhotos" type="file" accept={IMAGE_ACCEPT} multiple className={cn(fileInputClass, "mt-1")} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="showFullCover"
            defaultChecked={values.showFullCover}
            className="size-4"
          />
          Show the whole photo in the thumbnail (don&apos;t crop)
        </label>
        <FieldError errors={errors.photos} />
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>

      {/* Floating save (#103): reachable without scrolling to the bottom. A
          submit button inside the form; the browser Back button serves as cancel. */}
      <button
        type="submit"
        disabled={pending}
        aria-label={pending ? "Saving…" : submitLabel}
        title={submitLabel}
        className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70 disabled:hover:scale-100 sm:right-8 sm:bottom-8"
      >
        {pending ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <Save className="size-6" />
        )}
      </button>
    </form>
  );
}
