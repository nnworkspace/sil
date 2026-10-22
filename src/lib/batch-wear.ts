/**
 * Logging one day's outfit across several pieces at once (#320).
 *
 * A wear is stored per piece, but a **day is worn as an outfit**. Ten days in Kyoto made the gap plain: well over a dozen wear events, every one entered separately, most days two or three pieces sharing a date, an occasion and a note. The cost is not the typing; it is that the marginal piece stops getting logged. Several pieces of jewellery travelled on that trip and **not one was recorded**.
 *
 * This module holds the decisions, so they can be tested without a database or
 * a browser: what a batch resolves to, which of its pieces are duplicates, and
 * what the result should say out loud.
 */

/** A piece already worn on the target date, so the caller can warn. */
export type Duplicate = { itemId: string; name: string };

export type BatchPlan = {
  /** Ids to write, in a stable order, each appearing once. */
  itemIds: string[];
  /** Pieces that already have a wear on this date. */
  duplicates: Duplicate[];
};

/**
 * What a batch will actually write.
 *
 * **Deduplicates within the selection.** A piece can reach one batch twice —
 * it may sit in two Looks, or be selected in the grid and also belong to the
 * chosen day — and writing it twice would record a wear that did not happen.
 *
 * **Duplicates against the day are reported, not removed.** Wearing the same
 * piece on two separate occasions in one day is real (the office, then dinner),
 * so this is a question for the owner rather than a rule. The caller warns and
 * lets a confirmed batch through.
 */
export function planBatch(
  selected: readonly { itemId: string; name: string }[],
  alreadyWornOnDate: readonly string[],
): BatchPlan {
  const seen = new Set<string>();
  const already = new Set(alreadyWornOnDate);
  const itemIds: string[] = [];
  const duplicates: Duplicate[] = [];

  for (const piece of selected) {
    if (!piece.itemId || seen.has(piece.itemId)) continue;
    seen.add(piece.itemId);
    itemIds.push(piece.itemId);
    if (already.has(piece.itemId)) duplicates.push({ itemId: piece.itemId, name: piece.name });
  }

  return { itemIds, duplicates };
}

/**
 * Which pieces a trip-side batch should additionally tick as packed.
 *
 * **Wearing a piece on a trip is evidence it was in the case.** The owner does
 * not reliably tick things off while packing, so `packed = false` usually means
 * *not ticked* rather than *not packed* — which makes this inference a gap being
 * filled with a fact, not a side effect on unrelated data.
 *
 * Two limits keep it predictable. It only ever goes **false → true**, because
 * un-packing must stay deliberate. And it applies **only where there is a trip
 * to infer from**: a wear logged from the browse grid or a Look knows nothing
 * about any suitcase, and the caller passes no membership there.
 */
export function packedToTick(
  itemIds: readonly string[],
  tripMembership: ReadonlyMap<string, boolean>,
): string[] {
  return itemIds.filter((id) => tripMembership.get(id) === false);
}

/**
 * What the toast says.
 *
 * The batch has two effects and **both are named**. A hidden second write is
 * how a control stops being trusted; a stated one is simply what the button
 * does. This is the whole reason ticking `packed` from a wear log is acceptable.
 */
export function describeBatch(wears: number, packed: number): string {
  const w = `Logged ${wears} ${wears === 1 ? "wear" : "wears"}`;
  return packed > 0 ? `${w} · ${packed} marked packed` : w;
}

/**
 * The date a batch should open on.
 *
 * **A trip day defaults to that day, never to today.** Catching up on Thursday
 * for what was worn on Monday is the normal case on the road (a trip log is clustered, not daily), so defaulting to today would quietly record the wrong
 * date every time. Everywhere else, today is the sensible guess.
 */
export function defaultWearDate(dayIso: string | null | undefined, todayIso: string): string {
  return dayIso || todayIso;
}
