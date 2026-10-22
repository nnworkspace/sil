import { notFound } from "next/navigation";
import Image from "next/image";
import { Shirt } from "lucide-react";

import { getTripWithItems } from "@/lib/queries";
import { CATEGORIES, categoryMatcher } from "@/lib/categories";
import { packingGroups } from "@/lib/trip-packing";
import { dayPlan } from "@/lib/trip-day-plan";
import { tripDays } from "@/lib/trip-days";
import { formatDate } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

/**
 * A packing list built to be printed and put in the suitcase (#259).
 *
 * The owner wants one sheet that works in two places at once: read on a phone
 * while packing, and printed on A4 to tick off in pen. That is the constraint
 * that shapes everything here — two columns on a phone, four on paper, and a
 * checkbox that is a **drawn square rather than a control**.
 *
 * The square is deliberate. The trip page already owns packed/unpacked state;
 * this page is a snapshot *of* it. A box that looked tappable but changed
 * nothing would be worse than one that plainly does not, so it is a border and
 * nothing else, in both media.
 *
 * The photo leads because the owner asked to recognise a piece at a glance —
 * the name is confirmation, not identification.
 */

const label = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

function dateRange(start: string | null, end: string | null): string | null {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} → ${e}`;
  return s ?? e ?? null;
}

export default async function TripPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const trip = await getTripWithItems(id);
  if (!trip) notFound();

  const items = trip.tripItems;
  const packed = items.filter((ti) => ti.packed).length;
  const range = dateRange(trip.startDate, trip.endDate);

  // Two sheets, one page (#270). **By category** is how a suitcase is packed
  // and stays the default; **by day** is the sheet for the hotel, where the
  // question is what to put on rather than what to bring.
  const days = tripDays(trip.startDate, trip.endDate);
  const wantsDays = (await searchParams).by === "day" && days.length > 0;

  const groups = wantsDays
    ? dayPlan({ startDate: trip.startDate, endDate: trip.endDate }, items, (a, b) =>
        a.item.name.localeCompare(b.item.name),
      )
        .groups.filter((g) => g.rows.length > 0)
        .map((g) => ({ slug: g.key, label: g.label, rows: g.rows }))
    : packingGroups(items, days);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      {/* The established header shape (#240, and the Archive page): `flex-wrap`
          so the action drops to its own line rather than squeezing the title,
          and `min-w-0` on the text so it can shrink instead of forcing a
          three-line heading. Without both, "Copenhagen Business Trip" wrapped onto
          three lines beside the button. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:mb-4">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-normal tracking-tight print:text-2xl">
            {trip.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[trip.destination, range].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {packed} of {items.length} packed
          </p>
        </div>
        {/* Hidden in print — a button on paper is just a grey rectangle. */}
        <div className="flex items-center gap-3 print:hidden">
          {days.length > 0 ? (
            <a
              href={`/trips/${trip.id}/print${wantsDays ? "" : "?by=day"}`}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {wantsDays ? "By category" : "By day"}
            </a>
          ) : null}
          <PrintButton />
        </div>
      </div>

      {!wantsDays && trip.plan && trip.plan.length > 0 ? (
        <section className="mb-6 break-inside-avoid border-y py-3 print:mb-4">
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Plan
          </h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {trip.plan.map((slot) => {
              const inSlot = categoryMatcher(slot.category);
              const filled = items.filter((ti) => inSlot(ti.item)).length;
              return (
                <li key={slot.category}>
                  {label(slot.category)}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    {filled} / {slot.target}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nothing packed yet — add pieces from the wardrobe.
        </p>
      ) : (
        // Photos are the point of this sheet, but nine categories of one piece
        // each is mostly whitespace at four columns. Five columns with a
        // slightly shorter photo roughly halves the page count without making a
        // garment unrecognisable — measured on a real trip, below.
        <div className="space-y-6 print:space-y-3">
          {groups.map(({ slug, label: catLabel, rows }) => (
            // A category never splits across a page: a heading stranded at the
            // foot of a sheet is the classic print failure.
            <section key={slug} className="break-inside-avoid">
              <h2 className="mb-2 border-b pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {catLabel}
                <span className="ml-2 tabular-nums normal-case">{rows.length}</span>
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-5 print:gap-1.5">
                {rows.map((ti) => {
                  const photo = ti.item.photos[0];
                  return (
                    <li key={ti.item.id} className="break-inside-avoid">
                      <div className="relative aspect-[3/4] overflow-hidden border bg-muted print:aspect-[4/5]">
                        {photo ? (
                          // A real <img>, never a CSS background: browsers drop
                          // background images when printing, and a packing list
                          // without photos defeats the point.
                          <Image
                            src={photo.url}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 50vw, 20vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Shirt className="size-6" />
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex items-start gap-1.5">
                        {/* Drawn, not an <input>: this sheet is for a pen. A
                            piece already packed prints ticked, so the sheet
                            reflects the plan as it stands. */}
                        <span
                          aria-hidden
                          className="mt-0.5 grid size-3.5 shrink-0 place-items-center border border-foreground text-[10px] leading-none"
                        >
                          {ti.packed ? "✓" : ""}
                        </span>
                        <span className="min-w-0 text-[11px] leading-snug">
                          <span className="block font-medium">{ti.item.name}</span>
                          {ti.item.brand ? (
                            <span className="block text-muted-foreground">{ti.item.brand}</span>
                          ) : null}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
