import Link from "next/link";
import { Luggage, MapPin, CalendarRange, Pencil } from "lucide-react";

import { getTrips } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewTripButton } from "@/components/new-trip-button";
import { DeleteTripButton } from "@/components/delete-trip-button";
import { groupTripsByTime, todayISO } from "@/lib/trip-groups";

export const dynamic = "force-dynamic";

function dateRange(start: string | null, end: string | null): string | null {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} → ${e}`;
  return s ?? e ?? null;
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const trips = await getTrips();
  // Coming before past, nearest to today first in each (#290). The rule takes
  // `today` rather than reading the clock inside itself, so it is testable.
  const groups = groupTripsByTime(trips, todayISO());

  // Which tab (#292). In the URL, like the category page's `?sub=`, so the view
  // is shareable and survives a refresh — and so this page stays a server
  // component with no client JavaScript.
  const when = (await searchParams).when === "past" ? "past" : "coming";
  const count = (key: "coming" | "past") =>
    groups.find((g) => g.key === key)?.trips.length ?? 0;
  const shown = groups.find((g) => g.key === when)?.trips ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-normal tracking-tight">Trips</h1>
        <NewTripButton />
      </div>

      {trips.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Luggage className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            No trips yet. Plan one and build its packing list from your wardrobe.
          </p>
          <div className="mt-4 flex justify-center">
            <NewTripButton />
          </div>
        </div>
      ) : (
        <>
          {/* Both tabs always render, even at zero: one that vanished when
              empty could not be discovered, and "Past 0" is itself an answer. */}
          <nav aria-label="Which trips" className="mb-4 flex items-center gap-1">
            {(["coming", "past"] as const).map((key) => {
              const active = when === key;
              return (
                <Link
                  key={key}
                  href={key === "past" ? "/trips?when=past" : "/trips"}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm capitalize transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {key}
                  <span className="ml-1.5 tabular-nums">{count(key)}</span>
                </Link>
              );
            })}
          </nav>

          {shown.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {when === "past" ? "No trips have finished yet." : "No trips coming up."}
              </p>
              {when === "coming" ? (
                <div className="mt-3 flex justify-center">
                  <NewTripButton />
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {shown.map((trip) => {
                  const range = dateRange(trip.startDate, trip.endDate);
                  const allPacked = trip.pieceCount > 0 && trip.packedCount === trip.pieceCount;
                  return (
                    // The link is *stretched* over the card rather than wrapping
                    // it (#217, as on the item card). A card that is one big <a>
                    // cannot legally contain a button, and edit and delete have
                    // to sit on it. This keeps the whole card clickable and the
                    // markup valid, and gives the link a clean accessible name
                    // instead of "name + destination + dates + progress".
                    <li key={trip.id} className="group relative">
                      <Card className="transition-colors group-hover:border-primary">
                        <CardContent className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium">{trip.name}</span>
                            <Badge variant="secondary" className="shrink-0 capitalize">
                              {trip.type}
                            </Badge>
                          </div>
                          {trip.destination ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="size-3.5" />
                              {trip.destination}
                            </div>
                          ) : null}
                          {range ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <CalendarRange className="size-3.5" />
                              <span className="tabular-nums">{range}</span>
                            </div>
                          ) : null}
                          <div className="flex items-end justify-between gap-2 pt-1 text-sm">
                            <span>
                              {trip.pieceCount === 0 ? (
                                <span className="text-muted-foreground">No pieces yet</span>
                              ) : allPacked ? (
                                <span className="font-medium text-primary">
                                  Packed ✓ · {trip.pieceCount} pieces
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {trip.packedCount} of {trip.pieceCount} packed
                                </span>
                              )}
                            </span>
                            {/* Above the stretched link, so these are reachable
                                rather than swallowed by the card's own click. */}
                            <span className="relative z-10 flex items-center gap-0.5">
                              <Link
                                href={`/trips/${trip.id}/edit`}
                                aria-label={`Edit ${trip.name}`}
                                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <Pencil className="size-4" />
                              </Link>
                              <DeleteTripButton id={trip.id} name={trip.name} icon />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      <Link
                        href={`/trips/${trip.id}`}
                        aria-label={trip.name}
                        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      />
                    </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
