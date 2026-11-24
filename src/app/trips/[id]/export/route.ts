import { getTripWithItems, type TripWithItems } from "@/lib/queries";
import { CATEGORIES, categoryMatcher } from "@/lib/categories";
import { packingGroups } from "@/lib/trip-packing";
import { dayPlan, dayLabelsFor } from "@/lib/trip-day-plan";
import { tripDays } from "@/lib/trip-days";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const label = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

function dateRange(start: string | null, end: string | null): string | null {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} → ${e}`;
  return s ?? e ?? null;
}

/** Render a trip's packing list as a Markdown checklist (grouped by category),
 *  with the trip header and plan progress (#93). */
function tripMarkdown(trip: TripWithItems): string {
  const items = trip.tripItems;
  const total = items.length;
  const packed = items.filter((ti) => ti.packed).length;

  const out: string[] = [`# ${trip.name}`, ""];

  const meta = [`- **Type:** ${trip.type}`];
  if (trip.destination) meta.push(`- **Destination:** ${trip.destination}`);
  const range = dateRange(trip.startDate, trip.endDate);
  if (range) meta.push(`- **Dates:** ${range}`);
  meta.push(`- **Packed:** ${packed} of ${total}`);
  out.push(...meta, "");

  if (trip.plan && trip.plan.length > 0) {
    out.push("## Packing plan", "");
    for (const slot of trip.plan) {
      const inSlot = categoryMatcher(slot.category);
      const filled = items.filter((ti) => inSlot(ti.item)).length;
      out.push(`- ${label(slot.category)}: ${filled} / ${slot.target}`);
    }
    out.push("");
  }

  const days = tripDays(trip.startDate, trip.endDate);

  // The day plan, when there is one (#270): written before the packing list,
  // because it is the plan and the list is what it produces.
  if (days.length > 0) {
    const plan = dayPlan({ startDate: trip.startDate, endDate: trip.endDate }, items, (a, b) =>
      a.item.name.localeCompare(b.item.name),
    );
    const filled = plan.groups.filter((g) => g.rows.length > 0);
    if (filled.length > 0) {
      out.push("## By day", "");
      for (const g of filled) {
        out.push(`### ${g.label}`, "");
        for (const ti of g.rows) out.push(`- ${ti.item.name}`);
        out.push("");
      }
    }
  }

  out.push("## Packing list", "");
  // Shared with the printable sheet (#259), so the two never group differently.
  const groups = packingGroups(items, days);

  if (groups.length === 0) {
    out.push("_No pieces added yet._", "");
  } else {
    for (const { label: catLabel, rows } of groups) {
      out.push(`### ${catLabel}`, "");
      for (const ti of rows) {
        const brand = ti.item.brand ? ` · ${ti.item.brand}` : "";
        // Which days it is planned for, when there is a day plan (#270). One
        // line however many days it appears under: this is the list you pack
        // from, and a repeat wear is still one thing to pack.
        const when = dayLabelsFor(days, ti);
        const days_ = when.length > 0 ? ` _(${when.join(", ")})_` : "";
        out.push(`- [${ti.packed ? "x" : " "}] ${ti.item.name}${brand}${days_}`);
      }
      out.push("");
    }
  }

  out.push("_Exported from Wardrobe._");
  return out.join("\n");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const trip = await getTripWithItems(id);
  if (!trip) return new Response("Trip not found", { status: 404 });

  const slug =
    trip.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "trip";

  return new Response(tripMarkdown(trip), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-packing.md"`,
    },
  });
}
