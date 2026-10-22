"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { trips } from "@/db/schema";
import { getBrowseItems } from "@/lib/queries";
import { NO_FILTERS } from "@/lib/browse";
import {
  tripPlanSchema,
  suggestPlan,
  rootCategory,
  type TripPlanSlot,
} from "@/lib/trips";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Whole days between two YYYY-MM-DD dates, inclusive; null if either missing. */
function tripDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const a = new Date(`${start}T12:00:00`).getTime();
  const b = new Date(`${end}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

async function readPlan(tripId: string): Promise<TripPlanSlot[]> {
  const [t] = await db.select({ plan: trips.plan }).from(trips).where(eq(trips.id, tripId));
  return t?.plan ?? [];
}

async function writePlan(tripId: string, plan: TripPlanSlot[]): Promise<void> {
  const parsed = tripPlanSchema.safeParse(plan);
  await db
    .update(trips)
    .set({ plan: parsed.success ? parsed.data : plan, updatedAt: new Date() })
    .where(eq(trips.id, tripId));
  revalidatePath(`/trips/${tripId}`);
}

/** Generate a starter plan from the trip's length + type (OP-TRIP-PLAN-SUGGEST). */
export async function suggestTripPlan(formData: FormData): Promise<void> {
  const tripId = text(formData, "tripId");
  if (!tripId) return;
  const [trip] = await db
    .select({ type: trips.type, startDate: trips.startDate, endDate: trips.endDate })
    .from(trips)
    .where(eq(trips.id, tripId));
  if (!trip) return;

  let days = tripDays(trip.startDate, trip.endDate);
  if (days == null) {
    const d = parseInt(text(formData, "days") ?? "", 10);
    days = Number.isFinite(d) && d > 0 ? Math.min(60, d) : 3;
  }

  const items = await getBrowseItems(NO_FILTERS);
  const present = new Set(items.map((i) => rootCategory(i.category)));
  await writePlan(tripId, suggestPlan(days, trip.type, present));
}

/** Set (or add) a slot's target — the ± handle (OP-TRIP-PLAN-SET-TARGET). */
export async function setSlotTarget(formData: FormData): Promise<void> {
  const tripId = text(formData, "tripId");
  const category = text(formData, "category");
  if (!tripId || !category) return;
  const target = Math.max(0, Math.min(99, parseInt(text(formData, "target") ?? "", 10) || 0));
  const plan = await readPlan(tripId);
  const i = plan.findIndex((s) => s.category === category);
  if (i >= 0) plan[i] = { category, target };
  else plan.push({ category, target });
  await writePlan(tripId, plan);
}

/** Add a slot for a category not yet in the plan (OP-TRIP-PLAN-ADD-SLOT). */
export async function addSlot(formData: FormData): Promise<void> {
  const tripId = text(formData, "tripId");
  const category = text(formData, "category");
  if (!tripId || !category) return;
  const plan = await readPlan(tripId);
  if (!plan.some((s) => s.category === category)) plan.push({ category, target: 1 });
  await writePlan(tripId, plan);
}

/** Remove a slot entirely (OP-TRIP-PLAN-REMOVE-SLOT). */
export async function removeSlot(formData: FormData): Promise<void> {
  const tripId = text(formData, "tripId");
  const category = text(formData, "category");
  if (!tripId || !category) return;
  const plan = (await readPlan(tripId)).filter((s) => s.category !== category);
  await writePlan(tripId, plan);
}
