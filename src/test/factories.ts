/**
 * Test factories (#183).
 *
 * The governing rule for this suite: **tests describe shapes, never inventory.**
 * Filing another hundred pieces must require no change here. A factory returns a
 * valid piece with sane defaults so a test overrides only the field it is about:
 *
 *     makeItem({ category: "culottes", secondaryCategories: ["skirts"] })
 *
 * When a column is added to the schema — as `storageLocation` was — exactly one
 * default changes, instead of every fixture in the suite.
 */

/** The subset of an item the pure-logic layer actually reads. Deliberately not
 *  the Drizzle row type: L1 must not depend on the database schema, so adding a
 *  column that no rule consults cannot break these tests. */
export type TestItem = {
  id: string;
  name: string;
  category: string;
  secondaryCategories: string[];
  brand: string | null;
  color: string | null;
  material: string | null;
  description: string | null;
  size: string | null;
  tags: string[];
  pricePaidCents: number | null;
  purchasedAt: string | null;
  createdAt: Date;
  priorWears: number | null;
  wearEvents: { wornAt: string }[];
  favorite: boolean;
  archivedAt: string | null;
  storageLocation: string | null;
};

let seq = 0;

/** A valid, unremarkable piece. Pass only what the test is about. */
export function makeItem(overrides: Partial<TestItem> = {}): TestItem {
  seq += 1;
  return {
    id: `item-${seq}`,
    name: `Piece ${seq}`,
    category: "tops",
    secondaryCategories: [],
    brand: "Atelier Nord",
    color: "black",
    material: "100% cotton",
    description: null,
    size: "S",
    tags: [],
    pricePaidCents: 5000,
    purchasedAt: "2024-01-01",
    // Fixed, not `new Date()` — a clock in a fixture makes ordering tests flaky.
    createdAt: new Date("2024-01-01T00:00:00Z"),
    priorWears: null, // not recorded — the honest default (#191)
    wearEvents: [],
    favorite: false,
    archivedAt: null,
    storageLocation: null,
    ...overrides,
  };
}

/** Reset the id counter so ids are stable within a test file. */
export function resetFactories(): void {
  seq = 0;
}
