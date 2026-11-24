"use server";

import { generateObject, APICallError, RetryError } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { trips } from "@/db/schema";
import { getBrowseItems } from "@/lib/queries";
import { NO_FILTERS } from "@/lib/browse";
import { geocodeCity, fetchForecast } from "@/lib/weather";
import {
  tripProposalSchema,
  buildCatalog,
  buildPlannerPrompt,
  PLANNER_MODEL,
  type CatalogItem,
} from "@/lib/trip-planner";

// Google AI Studio (free tier), same wiring as the import (ADR-0008).
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY,
});

export type ProposalPiece = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  photoUrl: string | null;
  reason: string;
};

export type ProposalOccasion = {
  label: string;
  formality: string;
  timeOfDay: string | null;
  pieces: ProposalPiece[];
};

export type PlanResult =
  | { ok: true; occasions: ProposalOccasion[]; gaps: string[] }
  | { ok: false; error: string };

const AI_BUSY_MESSAGE =
  "The AI planner is busy right now. Please wait a moment and try again.";

const AI_QUOTA_MESSAGE =
  "The AI planner has reached its usage limit: the free AI tier caps how many plans you can generate per minute and per day. Please wait a little and try again; if it keeps happening you've likely hit today's limit, which resets tomorrow. You can build the packing list manually in the meantime.";

/** The free-tier usage limit was hit (HTTP 429 / RESOURCE_EXHAUSTED). Kept
 *  distinct from a transient overload so the owner gets a clear message (an
 *  immediate retry won't help a daily cap). */
function isQuotaError(err: unknown): boolean {
  const e = RetryError.isInstance(err) ? err.lastError : err;
  const status = APICallError.isInstance(e) ? e.statusCode : undefined;
  const msg = String((e as { message?: unknown })?.message ?? err).toLowerCase();
  return (
    status === 429 ||
    /resource[ _]?exhausted|quota|exceeded your current quota|requests per (?:day|minute)/.test(msg)
  );
}

/** Transient AI failure (overload / timeout) worth retrying. Excludes quota. */
function isTransientAIError(err: unknown): boolean {
  const e = RetryError.isInstance(err) ? err.lastError : err;
  if (APICallError.isInstance(e)) {
    const s = e.statusCode;
    if (s === 408 || s === 409 || (s != null && s >= 500)) return true;
  }
  const msg = String((e as { message?: unknown })?.message ?? err).toLowerCase();
  return /overloaded|unavailable|timeout|\b503\b/.test(msg);
}

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

/**
 * Generate a packing proposal for a trip from the owner's brief (OP-PLAN-GENERATE).
 * Saves the brief, calls the model once, validates every proposed id against the
 * wardrobe (drops unknowns, so no hallucinated pieces), and returns an enriched
 * proposal for review. Writes NOTHING to the packing list (that is `addTripItems`
 * on accept). See specs/trip-planner + ADR-0010.
 */
export async function planTrip(
  _prev: PlanResult | null,
  formData: FormData,
): Promise<PlanResult> {
  const tripId = text(formData, "tripId");
  const brief = text(formData, "brief");
  if (!tripId) return { ok: false, error: "Missing trip." };
  if (!brief) return { ok: false, error: "Write a short brief first." };
  if (brief.length > 2000) return { ok: false, error: "Brief is too long (max 2000 characters)." };

  const [trip] = await db
    .select({
      type: trips.type,
      destination: trips.destination,
      startDate: trips.startDate,
      endDate: trips.endDate,
    })
    .from(trips)
    .where(eq(trips.id, tripId));
  if (!trip) return { ok: false, error: "Trip not found." };

  // Persist the brief so it can be regenerated without retyping (VAL-PLAN-01).
  await db.update(trips).set({ brief, updatedAt: new Date() }).where(eq(trips.id, tripId));

  const items = await getBrowseItems(NO_FILTERS);
  if (items.length === 0) {
    return { ok: false, error: "Your wardrobe is empty. Add some pieces first." };
  }
  const catalogItems: CatalogItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    color: i.color,
    brand: i.brand,
    tags: i.tags,
  }));

  // Destination forecast: best-effort, never blocks (SPEC-TRIPS §forecast).
  let forecast: string | null = null;
  if (trip.destination) {
    try {
      const loc = await geocodeCity(trip.destination);
      if (loc) {
        const days10 = await fetchForecast(loc.lat, loc.lon);
        if (days10.length > 0) {
          const hi = Math.max(...days10.map((d) => d.hi));
          const lo = Math.min(...days10.map((d) => d.lo));
          forecast = `${loc.name}: highs around ${hi}°C, lows around ${lo}°C over the coming days`;
        }
      }
    } catch {
      /* forecast unavailable; proceed without it */
    }
  }

  const prompt = buildPlannerPrompt({
    brief,
    type: trip.type,
    days: tripDays(trip.startDate, trip.endDate),
    destination: trip.destination,
    forecast,
    catalog: buildCatalog(catalogItems),
  });

  let object;
  try {
    ({ object } = await generateObject({
      model: google(PLANNER_MODEL),
      schema: tripProposalSchema,
      prompt,
    }));
  } catch (err) {
    console.error("AI planner failed:", err);
    const error = isQuotaError(err)
      ? AI_QUOTA_MESSAGE
      : isTransientAIError(err)
        ? AI_BUSY_MESSAGE
        : "The planner couldn't build a plan. Try rewording your brief, or add pieces manually.";
    return { ok: false, error };
  }

  // Validate ids against the wardrobe and enrich for display (VAL-PLAN-03).
  const byId = new Map(items.map((i) => [i.id, i]));
  const occasions: ProposalOccasion[] = object.occasions
    .map((o) => ({
      label: o.label,
      formality: o.formality,
      timeOfDay: o.timeOfDay ?? null,
      pieces: o.items
        .map((it): ProposalPiece | null => {
          const item = byId.get(it.id);
          if (!item) return null;
          return {
            id: item.id,
            name: item.name,
            brand: item.brand,
            category: item.category,
            photoUrl: item.photos[0]?.url ?? null,
            reason: it.reason,
          };
        })
        .filter((p): p is ProposalPiece => p !== null),
    }))
    .filter((o) => o.pieces.length > 0);

  revalidatePath(`/trips/${tripId}`);
  return { ok: true, occasions, gaps: object.gaps ?? [] };
}
