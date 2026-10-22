/**
 * Sort options for the browse / category overviews (#109).
 *
 * Each option is a single URL value encoding a key + direction, so the UI is one
 * single-select dropdown and the URL stays `?sort=price-desc`. Wear-derived keys
 * (times worn, cost-per-wear, last worn) combine `prior_wears` with the logged
 * `wear_events`; sorting runs in JS after the (small) result set is fetched.
 */

export const SORT_OPTIONS = [
  { value: "new", label: "Newest added" },
  { value: "purchased-desc", label: "Purchase date: newest" },
  { value: "purchased-asc", label: "Purchase date: oldest" },
  { value: "price-desc", label: "Price: high → low" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "wears-desc", label: "Most worn" },
  { value: "wears-asc", label: "Least worn" },
  { value: "cpw-asc", label: "Cost per wear: low → high" },
  { value: "worn-desc", label: "Recently worn" },
  { value: "name-asc", label: "Name: A → Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
export const SORT_VALUES: string[] = SORT_OPTIONS.map((o) => o.value);
export const DEFAULT_SORT: SortValue = "new";

export function sortLabel(value: string): string {
  return SORT_OPTIONS.find((o) => o.value === value)?.label ?? SORT_OPTIONS[0].label;
}

type Sortable = {
  name: string;
  createdAt: Date;
  purchasedAt: string | null;
  pricePaidCents: number | null;
  priorWears: number | null;
  wearEvents: { wornAt: string }[];
};

// An unrecorded prior count contributes nothing to the total (#191); for
// ordering that is the same as zero, which is why sorting need not
// distinguish the two the way the figures do.
const wearCount = (i: Sortable) => (i.priorWears ?? 0) + i.wearEvents.length;
const lastWorn = (i: Sortable) =>
  i.wearEvents.reduce<string | null>((m, w) => (m === null || w.wornAt > m ? w.wornAt : m), null);

/** Build a comparator over `key`, `null` **always last** (regardless of `dir`). */
function by<T>(key: (i: T) => number | string | null, dir: "asc" | "desc") {
  const sign = dir === "desc" ? -1 : 1;
  return (a: T, b: T): number => {
    const ka = key(a);
    const kb = key(b);
    if (ka == null && kb == null) return 0;
    if (ka == null) return 1; // nulls last
    if (kb == null) return -1;
    const c = ka < kb ? -1 : ka > kb ? 1 : 0;
    return sign * c;
  };
}

/** Return a new array sorted by the given option value (falls back to newest). */
export function sortItems<T extends Sortable>(items: T[], value: string): T[] {
  const arr = items.slice();
  const cpw = (i: T) => (i.pricePaidCents == null ? null : i.pricePaidCents / Math.max(1, wearCount(i)));
  switch (value) {
    case "purchased-desc":
      return arr.sort(by((i) => i.purchasedAt, "desc"));
    case "purchased-asc":
      return arr.sort(by((i) => i.purchasedAt, "asc"));
    case "price-desc":
      return arr.sort(by((i) => i.pricePaidCents, "desc"));
    case "price-asc":
      return arr.sort(by((i) => i.pricePaidCents, "asc"));
    case "wears-desc":
      return arr.sort(by(wearCount, "desc"));
    case "wears-asc":
      return arr.sort(by(wearCount, "asc"));
    case "cpw-asc":
      return arr.sort(by(cpw, "asc"));
    case "cpw-desc":
      return arr.sort(by(cpw, "desc"));
    case "worn-desc":
      return arr.sort(by(lastWorn, "desc"));
    case "name-asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "new":
    default:
      return arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
