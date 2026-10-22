import { Minus, Plus, X, Sparkles } from "lucide-react";

import {
  suggestTripPlan,
  setSlotTarget,
  addSlot,
  removeSlot,
} from "@/app/trips/plan-actions";
import { addTripItems } from "@/app/trips/actions";
import { CATEGORIES, TOP_LEVEL_CATEGORIES } from "@/lib/categories";
import type { TripPlanSlot } from "@/lib/trips";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/collapsible-section";
import { WardrobePicker, type PickerItem } from "@/components/wardrobe-picker";

const label = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

const stepBtn =
  "flex size-6 items-center justify-center rounded border border-input text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40";

/**
 * The packing plan (#90, specs/trips §3.5): editable per-category slots. Each has
 * a ± target, a remove, and a "+ Add" that opens the picker scoped to that
 * category. A server component — the controls are Server-Action forms.
 */
export function PackingPlan({
  tripId,
  plan,
  hasDates,
  filled,
  pickerItems,
  addedIds,
  bare = false,
}: {
  tripId: string;
  plan: TripPlanSlot[] | null;
  hasDates: boolean;
  filled: Record<string, number>;
  pickerItems: PickerItem[];
  addedIds: string[];
  /** Render the body only. The trip page owns the surrounding section since it
   *  gained a second plan view to switch between (#270). */
  bare?: boolean;
}) {
  const slots = plan ?? [];
  const inPlan = new Set(slots.map((s) => s.category));
  const available = TOP_LEVEL_CATEGORIES.filter((c) => !inPlan.has(c.slug));
  const met = slots.filter((s) => (filled[s.category] ?? 0) >= s.target).length;

  const meta = slots.length > 0 ? `${met} of ${slots.length} slots filled` : undefined;

  const resuggest =
    plan !== null ? (
      <form action={suggestTripPlan}>
        <input type="hidden" name="tripId" value={tripId} />
        <button type="submit" className="text-xs text-muted-foreground hover:text-foreground">
          Re-suggest
        </button>
      </form>
    ) : null;

  const body = (
    <>
      {bare && (meta || resuggest) ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{meta}</span>
          {resuggest}
        </div>
      ) : null}
      {plan === null ? (
        <form action={suggestTripPlan} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="text-sm text-muted-foreground">
            Plan how much to pack per category — a guided way to fill the list.
          </p>
          {!hasDates ? (
            <label className="text-sm text-muted-foreground">
              Days
              <input
                name="days"
                type="number"
                min={1}
                max={60}
                defaultValue={3}
                className="ml-1 h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
          ) : null}
          <Button type="submit" size="sm" className="ml-auto">
            <Sparkles className="size-4" />
            Suggest slots
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No slots yet — add a category below, or re-suggest.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {slots.map((s) => {
                const f = filled[s.category] ?? 0;
                const isMet = f >= s.target;
                return (
                  <li
                    key={s.category}
                    className="flex items-center gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{label(s.category)}</div>
                      <div
                        className={cn(
                          "text-xs tabular-nums",
                          isMet ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {f} / {s.target}
                        {isMet ? " ✓" : ""}
                      </div>
                    </div>

                    <form action={setSlotTarget}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="category" value={s.category} />
                      <input type="hidden" name="target" value={s.target - 1} />
                      <button
                        type="submit"
                        className={stepBtn}
                        aria-label={`Fewer ${label(s.category)}`}
                        disabled={s.target <= 0}
                      >
                        <Minus className="size-3.5" />
                      </button>
                    </form>
                    <form action={setSlotTarget}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="category" value={s.category} />
                      <input type="hidden" name="target" value={s.target + 1} />
                      <button
                        type="submit"
                        className={stepBtn}
                        aria-label={`More ${label(s.category)}`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </form>

                    <WardrobePicker
                      action={addTripItems}
                      contextField="tripId"
                      contextId={tripId}
                      items={pickerItems}
                      addedIds={addedIds}
                      scope={s.category}
                      triggerLabel="Add"
                      compact
                    />

                    <form action={removeSlot}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="category" value={s.category} />
                      <button
                        type="submit"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Remove ${label(s.category)} slot`}
                      >
                        <X className="size-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          {available.length > 0 ? (
            <form action={addSlot} className="flex items-center gap-2">
              <input type="hidden" name="tripId" value={tripId} />
              <select
                name="category"
                defaultValue=""
                required
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Add a category…
                </option>
                {available.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Add slot
              </button>
            </form>
          ) : null}
        </div>
      )}
    </>
  );

  if (bare) return body;

  return (
    <CollapsibleSection title="Packing plan" meta={meta} action={resuggest}>
      {body}
    </CollapsibleSection>
  );
}
