/**
 * AI trip planner (specs/trip-planner, ADR-0010). Builds the compact text
 * catalog and prompt sent to the model, and the Zod schema the model must
 * return. Reuses the AI stack (ADR-0008) — the call itself lives in the
 * Server Action. No photos are sent (privacy posture, ADR-0010).
 */

import { z } from "zod";

import { IMPORT_MODEL } from "@/lib/extraction";

/** Reuse the import model — one Gemini model constant for all AI features. */
export const PLANNER_MODEL = IMPORT_MODEL;

/** The structured proposal the model must return (validated by `generateObject`).
 *  Items reference wardrobe **ids**; the server validates them and enriches with
 *  names/photos for display (`VAL-PLAN-03`). */
export const tripProposalSchema = z.object({
  occasions: z.array(
    z.object({
      label: z.string().describe("Short occasion name, e.g. 'Board meeting' or 'Everyday'"),
      formality: z
        .string()
        .describe("e.g. business-formal, formal, smart-casual, casual"),
      timeOfDay: z.string().nullish().describe("morning / afternoon / evening, if known"),
      items: z.array(
        z.object({
          id: z.string().describe("An item id copied EXACTLY from the wardrobe list"),
          reason: z.string().describe("Why this piece suits the occasion (<= 12 words)"),
        }),
      ),
    }),
  ),
  gaps: z
    .array(z.string())
    .describe("Anything the wardrobe can't cover for an occasion — never invent an item"),
});

export type TripProposal = z.infer<typeof tripProposalSchema>;

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  brand: string | null;
  tags: string[];
};

/** One line per item: `id | name | category | colour | brand | tags`. */
export function buildCatalog(items: CatalogItem[]): string {
  return items
    .map((i) =>
      [i.id, i.name, i.category, i.color ?? "-", i.brand ?? "-", i.tags.join("/") || "-"].join(
        " | ",
      ),
    )
    .join("\n");
}

/** Assemble the planner prompt from the trip context + wardrobe catalog. */
export function buildPlannerPrompt(opts: {
  brief: string;
  type: string;
  days: number | null;
  destination: string | null;
  forecast: string | null;
  catalog: string;
}): string {
  const trip = [
    `- Type: ${opts.type}`,
    opts.days ? `- Duration: ${opts.days} day(s)` : `- Duration: not given (infer from the brief)`,
    opts.destination ? `- Destination: ${opts.destination}` : null,
    opts.forecast ? `- Forecast: ${opts.forecast}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a packing assistant for a personal wardrobe app. Build a packing plan for the trip using ONLY the items in the wardrobe below.

TRIP
${trip}

WARDROBE (one item per line: id | name | category | colour | brand | tags)
${opts.catalog}

OWNER'S BRIEF
"${opts.brief}"

INSTRUCTIONS
- Read the brief for occasions/events and their formality (e.g. board meeting = business-formal; formal dinner = formal; casual evening = smart-casual).
- For each occasion, choose suitable pieces from the wardrobe. Copy each item's exact id from the list. NEVER invent an item or an id that is not in the wardrobe.
- Also add an "Everyday" occasion with day-to-day basics sized to the trip length (tops, bottoms, a layer, shoes).
- Give a short reason (<= 12 words) per item. Prefer versatile pieces; don't over-pack; respect the forecast.
- If the wardrobe genuinely lacks something important for an occasion or formality, add a short note to "gaps" — do NOT invent a piece to fill it.`;
}
