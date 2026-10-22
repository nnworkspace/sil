/**
 * Database schema (Drizzle ORM, PostgreSQL).
 *
 * Implements specs/catalog/30-data-model-spec.md. Structured columns for the
 * common/queryable fields, a JSONB `details` column for brand-specific sections,
 * and an `item_photos` child table for multiple photos per item. Tags are a
 * Postgres text[] column (ADR-0002). Trips have a many-to-many relationship with
 * items via `trip_items`.
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
  foreignKey,
  index,
} from "drizzle-orm/pg-core";

/** A brand-specific product-page section, captured as a label/value pair. */
export type ItemDetail = { label: string; value: string };

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** One of the CATEGORIES slugs (see src/lib/categories.ts) — the piece's main
   *  section, used for the home layout and its canonical grouping. */
  category: text("category").notNull(),
  /** Additional category slugs the piece also belongs to, so it appears under
   *  more than one section (e.g. a cardigan that is also an accessory). Excludes
   *  the primary `category`; defaults to none (#71). */
  secondaryCategories: text("secondary_categories").array().notNull().default([]),

  // Identity (from the product page)
  brand: text("brand"),
  productCode: text("product_code"),
  color: text("color"),
  size: text("size"),
  productUrl: text("product_url"),

  // Pricing (minor units, to avoid floating-point money bugs)
  listPriceCents: integer("list_price_cents"),
  pricePaidCents: integer("price_paid_cents"),
  currency: text("currency").default("EUR"),

  // Purchase & returns
  purchasedAt: date("purchased_at"),
  purchaseChannel: text("purchase_channel"),
  returnBy: date("return_by"),
  returnPolicy: text("return_policy"),

  /** Where the piece is physically kept — its "Berth" in the UI (#172). Free text, ≤ 31, so the owner can locate a piece quickly and browse by berth. */
  storageLocation: text("storage_location"),

  // Curation
  favorite: boolean("favorite").notNull().default(false),
  /** Show the cover photo whole (object-contain) in card thumbnails rather than
   *  cropping to fill (object-cover) — a per-piece display preference (#58). */
  showFullCover: boolean("show_full_cover").notNull().default(false),
  /** Free-text tags grouped by kind in the UI (occasion / feel / season). */
  tags: text("tags").array().notNull().default([]),
  /** Owner's own notes — Markdown, rendered sanitized on display. */
  notes: text("notes"),

  // Descriptive (verbatim from the product page; AI-fillable)
  /** Official product description — Markdown, rendered sanitized. */
  description: text("description"),
  material: text("material"),
  care: text("care"),
  /** Brand-specific sections as an ordered list of {label, value}. */
  details: jsonb("details").$type<ItemDetail[]>().notNull().default([]),

  // Wear tracking lives in the wear_events table (specs/wear-tracking);
  // worn-count / last-worn / cost-per-wear are derived from it.
  /** Estimated wears before tracking began — added to the logged wears for the
   *  worn count and cost-per-wear, so long-owned pieces read sensibly (#69). */
  /** Wears before tracking began (#69). **Nullable on purpose** (#191): NULL
   *  means "not recorded", 0 means "recorded, and genuinely never worn". The
   *  two are different facts — one is a gap to fill, the other a finding. */
  priorWears: integer("prior_wears"),

  // Archive (specs/archive, #142). A piece that has left the wardrobe is
  // archived, not deleted: everything above is kept, it simply stops counting
  // as part of the active wardrobe. `archived_at IS NULL` is the single
  // definition of "active" (VAL-ARCHIVE-04); the three move together
  // (VAL-ARCHIVE-07).
  /** The date the piece left the wardrobe; NULL ⇒ still owned. */
  archivedAt: date("archived_at"),
  /** Why it left: sold | gifted | returned | worn-out | lost | other. */
  archiveReason: text("archive_reason"),
  /** Free-text detail about the disposal (≤ 255). */
  archiveNote: text("archive_note"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [index("items_archived_at_idx").on(table.archivedAt)]);

/** Photos for an item (own shots + the official one). */
export const itemPhotos = pgTable("item_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  /** Public URL (Vercel Blob in prod, local filesystem in dev). */
  url: text("url").notNull(),
  /** Storage pathname, kept so we can delete the object. */
  path: text("path").notNull(),
  /** "official" (from the brand site) or "own" (owner wearing the piece). */
  kind: text("kind").notNull().default("own"),
  /** Display order, 0-based. */
  sort: integer("sort").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  /**
   * When and where the photograph was taken (#244).
   *
   * Both nullable, and staying that way: most photos here are retailer stills
   * with no meaningful date or place, and an empty value must read as "not
   * recorded" rather than invite a guess. Nothing is inferred from EXIF — such
   * dates are usually supplied by the owner from memory, and a
   * guessed date presented as fact is exactly what `VAL-COMP-11` warns against
   * elsewhere.
   *
   * `place` is free text ("Lyon, France"). No geocoding: the place is worth
   * having because it is what is remembered, not because it is a coordinate.
   */
  takenOn: date("taken_on"),
  place: text("place"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One logged wear of an item — a date and an optional occasion (specs/wear-tracking). */
export const wearEvents = pgTable(
  "wear_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    wornAt: date("worn_at").notNull(),
    /** The occasion tag (one of the occasion vocabulary), optional. */
    occasion: text("occasion"),
    /** Free-text note for the specific occasion, optional. */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("wear_events_item_id_idx").on(table.itemId)],
);

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** "business" | "vacation" */
  type: text("type").notNull().default("business"),
  destination: text("destination"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  /** The owner's natural-language planning prompt for the AI planner (#87). */
  brief: text("brief"),
  /** Packing-plan slots — editable per-category targets (#90). `null` = no plan
   *  yet, `[]` = an emptied plan. */
  plan: jsonb("plan").$type<{ category: string; target: number }[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Join table: which items are on a trip, and whether they're packed yet. */
export const tripItems = pgTable(
  "trip_items",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    packed: boolean("packed").notNull().default(false),
    /** Planned for the whole trip rather than a particular day (#270) — the
     *  shoes, the blazer, the earrings. Kept here and not in `trip_item_days`
     *  because it is a property of packing the piece, not of any one date. */
    everyDay: boolean("every_day").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.itemId] })],
);

/**
 * Which days a packed piece is planned for (#270).
 *
 * One row per piece per day, so the same trousers can be planned for Monday
 * *and* Wednesday while remaining **one pair packed and ticked once** —
 * `trip_items` stays the single membership, and `packed` stays there.
 *
 * The foreign key is to `trip_items`, not to `trips` and `items` separately:
 * a day assignment for a piece that is not on the trip is not a state worth
 * being able to represent, and the cascade means unpacking a piece takes its
 * days with it.
 */
export const tripItemDays = pgTable(
  "trip_item_days",
  {
    tripId: uuid("trip_id").notNull(),
    itemId: uuid("item_id").notNull(),
    day: date("day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.tripId, table.itemId, table.day] }),
    foreignKey({
      columns: [table.tripId, table.itemId],
      foreignColumns: [tripItems.tripId, tripItems.itemId],
    }).onDelete("cascade"),
  ],
);

/** A curated group of pieces that go together — a "set" (an intrinsic co-ord)
 *  or a "look" (a styled combination). Members via `look_items` (#95). */
export const looks = pgTable(
  "looks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** "set" | "look" */
    kind: text("kind").notNull().default("look"),
    notes: text("notes"),

    // Archive (specs/archive, #170). A look that is retired is archived, not
    // deleted: its members and photos are kept, it simply stops counting as an
    // active look. `archived_at IS NULL` ⇒ active. Archiving/deleting a look
    // never touches the pieces in it — only the look and its item links.
    /** The date the look was retired; NULL ⇒ still active. */
    archivedAt: date("archived_at"),
    /** Why it was retired: no-longer-wear | piece-archived | outdated | other. */
    archiveReason: text("archive_reason"),
    /** Free-text detail about retiring the look (≤ 255). */
    archiveNote: text("archive_note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("looks_archived_at_idx").on(table.archivedAt)],
);

/** Join table: which items belong to a Look. */
export const lookItems = pgTable(
  "look_items",
  {
    lookId: uuid("look_id")
      .notNull()
      .references(() => looks.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    /** Owner's manual order within the Look, 0-based (#100). New pieces append
     *  at the end; the owner drags to rearrange. */
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.lookId, table.itemId] })],
);

/** The owner's own photos of a Look — a styled shot of the outfit as worn.
 *  Mirrors item_photos (ADR-0003); a look photo is always the owner's, so there
 *  is no official/own kind. The cover is the row with is_primary = true. */
export const lookPhotos = pgTable("look_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  lookId: uuid("look_id")
    .notNull()
    .references(() => looks.id, { onDelete: "cascade" }),
  /** Public URL (Vercel Blob in prod, local filesystem in dev). */
  url: text("url").notNull(),
  /** Storage pathname, kept so we can delete the object. */
  path: text("path").notNull(),
  /** Display order, 0-based. */
  sort: integer("sort").notNull().default(0),
  /** The chosen cover (VAL-LOOK-08). */
  isPrimary: boolean("is_primary").notNull().default(false),
  /**
   * When and where the photograph was taken (#244).
   *
   * Both nullable, and staying that way: most photos here are retailer stills
   * with no meaningful date or place, and an empty value must read as "not
   * recorded" rather than invite a guess. Nothing is inferred from EXIF — such
   * dates are usually supplied by the owner from memory, and a
   * guessed date presented as fact is exactly what `VAL-COMP-11` warns against
   * elsewhere.
   *
   * `place` is free text ("Lyon, France"). No geocoding: the place is worth
   * having because it is what is remembered, not because it is a coordinate.
   */
  takenOn: date("taken_on"),
  place: text("place"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemsRelations = relations(items, ({ many }) => ({
  photos: many(itemPhotos),
  wearEvents: many(wearEvents),
  tripItems: many(tripItems),
  lookItems: many(lookItems),
}));

export const itemPhotosRelations = relations(itemPhotos, ({ one }) => ({
  item: one(items, { fields: [itemPhotos.itemId], references: [items.id] }),
}));

export const wearEventsRelations = relations(wearEvents, ({ one }) => ({
  item: one(items, { fields: [wearEvents.itemId], references: [items.id] }),
}));

export const tripsRelations = relations(trips, ({ many }) => ({
  tripItems: many(tripItems),
}));

export const tripItemsRelations = relations(tripItems, ({ one, many }) => ({
  trip: one(trips, { fields: [tripItems.tripId], references: [trips.id] }),
  item: one(items, { fields: [tripItems.itemId], references: [items.id] }),
  days: many(tripItemDays),
}));

export const tripItemDaysRelations = relations(tripItemDays, ({ one }) => ({
  tripItem: one(tripItems, {
    fields: [tripItemDays.tripId, tripItemDays.itemId],
    references: [tripItems.tripId, tripItems.itemId],
  }),
}));

export const looksRelations = relations(looks, ({ many }) => ({
  lookItems: many(lookItems),
  photos: many(lookPhotos),
}));

export const lookItemsRelations = relations(lookItems, ({ one }) => ({
  look: one(looks, { fields: [lookItems.lookId], references: [looks.id] }),
  item: one(items, { fields: [lookItems.itemId], references: [items.id] }),
}));

export const lookPhotosRelations = relations(lookPhotos, ({ one }) => ({
  look: one(looks, { fields: [lookPhotos.lookId], references: [looks.id] }),
}));

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemPhoto = typeof itemPhotos.$inferSelect;
export type NewItemPhoto = typeof itemPhotos.$inferInsert;
export type WearEvent = typeof wearEvents.$inferSelect;
export type NewWearEvent = typeof wearEvents.$inferInsert;
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripItem = typeof tripItems.$inferSelect;
export type Look = typeof looks.$inferSelect;
export type NewLook = typeof looks.$inferInsert;
export type LookItem = typeof lookItems.$inferSelect;
export type LookPhoto = typeof lookPhotos.$inferSelect;
export type NewLookPhoto = typeof lookPhotos.$inferInsert;
