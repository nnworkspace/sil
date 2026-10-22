import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, MapPin, CalendarRange, Download, Printer } from "lucide-react";

import { getTripWithItems, getBrowseItems } from "@/lib/queries";
import { NO_FILTERS } from "@/lib/browse";
import { addTripItems } from "@/app/trips/actions";
import { categoryMatcher } from "@/lib/categories";
import { packingGroups as groupForPacking } from "@/lib/trip-packing";
import { formatDate } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/markdown";
import { PackingList, type PackingGroup } from "@/components/packing-list";
import { CollapsibleSection } from "@/components/collapsible-section";
import { WardrobePicker, type PickerItem } from "@/components/wardrobe-picker";
import { PackingPlan } from "@/components/packing-plan";
import { PageHeader } from "@/components/page-header";
import { DayPlan, type DayRow } from "@/components/day-plan";
import { PlanModeTabs } from "@/components/plan-mode-tabs";
import { dayLabelsFor } from "@/lib/trip-day-plan";
import { tripDays } from "@/lib/trip-days";
import { TripForecast } from "@/components/trip-forecast";
import { TripPlanner } from "@/components/trip-planner";

export const dynamic = "force-dynamic";

function dateRange(start: string | null, end: string | null): string | null {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} → ${e}`;
  return s ?? e ?? null;
}

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  // Which plan view (#270). In the URL so it survives the Server-Action
  // round-trip that follows every add — otherwise placing a piece on Tuesday
  // would bounce the page back to the category view.
  const planParam = (await searchParams).plan;
  const planMode = planParam === "day" ? "day" : "category";
  const trip = await getTripWithItems(id);
  if (!trip) notFound();

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
  const addedIds = trip.tripItems.map((ti) => ti.itemId);

  // How many pieces fill each plan slot — rolled up over the slot's sub-categories.
  const filled: Record<string, number> = {};
  for (const slot of trip.plan ?? []) {
    const inSlot = categoryMatcher(slot.category);
    filled[slot.category] = trip.tripItems.filter((ti) =>
      inSlot(ti.item),
    ).length;
  }

  const total = trip.tripItems.length;
  const packed = trip.tripItems.filter((ti) => ti.packed).length;
  const allPacked = total > 0 && packed === total;

  const days = tripDays(trip.startDate, trip.endDate);

  // The packing list, through the **shared** helper (#286) — the printable
  // sheet and the Markdown export use it too, and this page had quietly kept a
  // second copy of the same twelve lines, which is exactly what extracting it
  // in #259 was meant to prevent.
  const packingGroups: PackingGroup[] = groupForPacking(
    trip.tripItems,
    days,
  ).map((g) => ({
    label: g.label,
    items: g.rows.map((ti) => ({
      itemId: ti.itemId,
      name: ti.item.name,
      brand: ti.item.brand,
      photoUrl: ti.item.photos[0]?.url ?? null,
      packed: ti.packed,
      // Repeat wear is the whole point: the trousers show under Monday *and*
      // Wednesday in the planner, but are one line here, ticked once (#270).
      days: dayLabelsFor(days, ti),
    })),
  }));

  // The same pieces, seen by day (#270).
  const dayRows: DayRow[] = trip.tripItems.map((ti) => ({
    itemId: ti.itemId,
    everyDay: ti.everyDay,
    days: ti.days.map((d) => ({ day: d.day })),
    name: ti.item.name,
    brand: ti.item.brand,
    photoUrl: ti.item.photos[0]?.url ?? null,
  }));

  const range = dateRange(trip.startDate, trip.endDate);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title={trip.name}
        meta={
          <>
            <Badge variant="secondary" className="shrink-0 capitalize">
              {trip.type}
            </Badge>
            {trip.destination ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {trip.destination}
              </span>
            ) : null}
            {range ? (
              <span className="flex items-center gap-1.5">
                <CalendarRange className="size-3.5" />
                <span className="tabular-nums">{range}</span>
              </span>
            ) : null}
          </>
        }
        actions={
          <Link
            href={`/trips/${trip.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Left panel — the packing list (what I'm taking), always in view. */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">Packing list</h2>
            <span className="text-xs">
              {total === 0 ? (
                <span className="text-muted-foreground">empty</span>
              ) : allPacked ? (
                <span className="font-medium text-primary">Packed ✓</span>
              ) : (
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{packed}</span>{" "}
                  / {total} packed
                </span>
              )}
            </span>
          </div>

          {total === 0 ? (
            <>
              <WardrobePicker
                action={addTripItems}
                contextField="tripId"
                contextId={trip.id}
                items={pickerItems}
                addedIds={addedIds}
              />
              <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                Nothing here yet — add pieces from your wardrobe.
              </div>
            </>
          ) : (
            <>
              <PackingList
                tripId={trip.id}
                groups={packingGroups}
                addControl={
                  <WardrobePicker
                    action={addTripItems}
                    contextField="tripId"
                    contextId={trip.id}
                    items={pickerItems}
                    addedIds={addedIds}
                  />
                }
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <a
                  href={`/trips/${trip.id}/export`}
                  download
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Download className="size-3.5" />
                  Export as Markdown
                </a>
                {/* The printable sheet (#259) — photos in a grid, to tick off
                    in pen and put in the case. */}
                <Link
                  href={`/trips/${trip.id}/print`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Printer className="size-3.5" />
                  Printable list
                </Link>
              </div>
            </>
          )}
        </aside>

        {/* Right — planning tools. */}
        <div className="min-w-0 space-y-6">
          {trip.destination ? (
            <TripForecast destination={trip.destination} />
          ) : null}

          <CollapsibleSection
            title="Packing plan"
            action={<PlanModeTabs mode={planMode} />}
          >
            {planMode === "day" ? (
              <DayPlan
                tripId={trip.id}
                startDate={trip.startDate}
                endDate={trip.endDate}
                rows={dayRows}
                pickerItems={pickerItems}
              />
            ) : (
              <PackingPlan
                tripId={trip.id}
                plan={trip.plan}
                hasDates={Boolean(trip.startDate && trip.endDate)}
                filled={filled}
                pickerItems={pickerItems}
                addedIds={addedIds}
                bare
              />
            )}
          </CollapsibleSection>

          <TripPlanner
            tripId={trip.id}
            initialBrief={trip.brief}
            addedIds={addedIds}
          />

          {trip.notes ? <Markdown>{trip.notes}</Markdown> : null}
        </div>
      </div>
    </div>
  );
}
