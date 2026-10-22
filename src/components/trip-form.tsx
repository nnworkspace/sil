"use client";

import { useActionState } from "react";

import { createTrip, updateTrip, type ActionResult } from "@/app/trips/actions";
import type { Trip } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-destructive">{errors.join(" ")}</p>;
}

/** Create (no `trip`) or edit (with `trip`) a trip. On success the action
 *  redirects to the trip page; on failure it returns field errors. */
export function TripForm({ trip }: { trip?: Trip }) {
  const action = trip ? updateTrip.bind(null, trip.id) : createTrip;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" defaultValue={trip?.name ?? ""} required maxLength={120} />
        <FieldError errors={errors.name} />
      </div>

      <div>
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          defaultValue={trip?.type ?? "business"}
          className={inputCls}
        >
          <option value="business">Business</option>
          <option value="vacation">Vacation</option>
        </select>
        <FieldError errors={errors.type} />
      </div>

      <div>
        <Label htmlFor="destination">Destination</Label>
        <Input
          id="destination"
          name="destination"
          defaultValue={trip?.destination ?? ""}
          maxLength={120}
          placeholder="e.g. Copenhagen"
        />
        <FieldError errors={errors.destination} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={trip?.startDate ?? ""} />
          <FieldError errors={errors.startDate} />
        </div>
        <div>
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={trip?.endDate ?? ""} />
          <FieldError errors={errors.endDate} />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={trip?.notes ?? ""} rows={3} maxLength={2000} />
        <FieldError errors={errors.notes} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {trip ? "Save changes" : "Create trip"}
        </Button>
      </div>
    </form>
  );
}
