import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/db";
import { TripForm } from "@/components/trip-form";
import { DeleteTripButton } from "@/components/delete-trip-button";

export const dynamic = "force-dynamic";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await db.query.trips.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!trip) notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link
        href={`/trips/${trip.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to trip
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-normal tracking-tight">Edit trip</h1>
        <DeleteTripButton id={trip.id} />
      </div>

      <TripForm trip={trip} />
    </div>
  );
}
