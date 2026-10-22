/**
 * Zod validation for item input (ADR-0006). Implements the VAL-ITEM rules from
 * specs/catalog/10-functional-spec.md §4. Server Actions coerce FormData into the
 * shape below, then validate it here before writing to the database.
 */

import { z } from "zod";

import {
  CATEGORIES,
  ALL_TAGS,
  TAG_GROUPS,
  normaliseSecondaries,
} from "@/lib/categories";

const CATEGORY_SLUGS: string[] = CATEGORIES.map((c) => c.slug);
const TAG_SET = new Set<string>(ALL_TAGS);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date (YYYY-MM-DD)");

const url = z
  .string()
  .max(2048)
  .refine((v) => {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }, "Must be a valid URL");

/** A brand-specific product-page section (VAL-ITEM-09). */
export const itemDetailSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().max(4000),
});

export const itemInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120), // VAL-ITEM-01
    category: z
      .string()
      .refine((s) => CATEGORY_SLUGS.includes(s), "Unknown category"), // VAL-ITEM-02
    secondaryCategories: z
      .array(z.string())
      .transform((a) => [...new Set(a)]) // de-duplicate
      .refine((a) => a.every((s) => CATEGORY_SLUGS.includes(s)), "Unknown category")
      .default([]), // #71: additional sections; primary is dropped below
    brand: z.string().trim().max(120).nullish(),
    productCode: z.string().trim().max(60).nullish(),
    color: z.string().trim().max(60).nullish(),
    size: z.string().trim().max(40).nullish(),
    productUrl: url.nullish(),
    listPriceCents: z.number().int().min(0).nullish(), // VAL-ITEM-04
    pricePaidCents: z.number().int().min(0).nullish(),
    currency: z.string().trim().length(3).default("EUR"),
    purchasedAt: isoDate.nullish(), // VAL-ITEM-06
    purchaseChannel: z.string().trim().max(120).nullish(),
    returnBy: isoDate.nullish(), // VAL-ITEM-07
    returnPolicy: z.string().max(2000).nullish(),
    storageLocation: z.string().trim().max(31).nullish(), // VAL-ITEM-12: "Berth" (#172)
    favorite: z.boolean().default(false),
    showFullCover: z.boolean().default(false), // #58: fit whole cover in thumbnails
    // #69, #191: wears before tracking began. Nullish, not defaulted — an
    // empty field means "not recorded", which is a different fact from a
    // recorded zero, and only the owner can say which one it is.
    priorWears: z.number().int().min(0).nullish(),

    tags: z
      .array(z.string())
      .transform((a) => [...new Set(a)]) // VAL-ITEM-05: de-duplicate
      .refine((a) => a.every((t) => TAG_SET.has(t)), "Unknown tag"),
    notes: z.string().max(4000).nullish(), // VAL-ITEM-08
    description: z.string().max(4000).nullish(),
    material: z.string().max(500).nullish(),
    // 4000, matching `notes` and `description` (#238). It was 1000, which is
    // too small for how a care note is actually written here: the maker's own
    // instruction quoted verbatim first, then separately-labelled advice below.
    // A real note hit 1099 and could not be saved — and because the value had
    // been written by SQL during filing, which never sees this schema, the row
    // held a string the UI could not save back.
    care: z.string().max(4000).nullish(),
    details: z.array(itemDetailSchema).max(30),
  })
  .refine(
    (d) => !(d.returnBy && d.purchasedAt) || d.returnBy >= d.purchasedAt,
    {
      message: "Return-by date cannot be before the purchase date",
      path: ["returnBy"],
    },
  ) // VAL-ITEM-07
  .refine(
    (d) => !d.purchasedAt || d.purchasedAt <= new Date().toISOString().slice(0, 10),
    { message: "Purchase date cannot be in the future", path: ["purchasedAt"] },
  ) // VAL-ITEM-06
  // Extra categories are normalised, not taken as given (#71, #206): a ticked
  // child brings its parent along, and the primary is never repeated here.
  // Doing it server-side means the rule holds however the form behaves, and
  // recomputing from the *current* primary is what stops a parent going stale
  // when a piece is re-filed. See `normaliseSecondaries`.
  .transform((d) => ({
    ...d,
    secondaryCategories: normaliseSecondaries(d.category, d.secondaryCategories),
  }));

export type ItemInput = z.infer<typeof itemInputSchema>;

const OCCASION_TAG_SET = new Set<string>(
  TAG_GROUPS.find((g) => g.kind === "occasion")?.tags ?? [],
);

/** A single logged wear (specs/wear-tracking, VAL-WEAR-*). */
export const wearEventInputSchema = z.object({
  wornAt: isoDate.refine(
    (d) => d <= new Date().toISOString().slice(0, 10),
    "A wear can't be in the future", // VAL-WEAR-02
  ),
  // The occasion tag — one of the occasion vocabulary, or none (VAL-WEAR-06).
  occasion: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || OCCASION_TAG_SET.has(v), "Unknown occasion"),
  // Free-text note for the particular occasion (VAL-WEAR-03).
  note: z
    .string()
    .trim()
    .max(255)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type WearEventInput = z.infer<typeof wearEventInputSchema>;

/** Why a piece left the wardrobe (specs/archive §5, VAL-ARCHIVE-02). Past
 *  tense: it records what happened. Free-form detail belongs in the note. */
export const ARCHIVE_REASONS = [
  "sold",
  "gifted",
  "returned",
  "worn-out",
  "lost",
  "other",
] as const;

export type ArchiveReason = (typeof ARCHIVE_REASONS)[number];

const ARCHIVE_REASON_SET = new Set<string>(ARCHIVE_REASONS);

/** Archiving a piece (specs/archive, VAL-ARCHIVE-01…03). */
export const archiveInputSchema = z.object({
  archivedAt: isoDate.refine(
    (d) => d <= new Date().toISOString().slice(0, 10),
    "A piece can't have left the wardrobe in the future", // VAL-ARCHIVE-01
  ),
  // Required, and one of the closed vocabulary (VAL-ARCHIVE-02).
  reason: z
    .string()
    .trim()
    .refine((v) => ARCHIVE_REASON_SET.has(v), "Choose a reason"),
  // Optional free text (VAL-ARCHIVE-03).
  note: z
    .string()
    .trim()
    .max(255)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type ArchiveInput = z.infer<typeof archiveInputSchema>;

/**
 * A trip's details (specs/trips, VAL-TRIP-*). The packing list (`trip_items`)
 * is managed by its own actions, not this schema.
 */
export const tripInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120), // VAL-TRIP-01
    type: z.enum(["business", "vacation"]).default("business"), // VAL-TRIP-02
    destination: z.string().trim().max(120).nullish(), // VAL-TRIP-03
    startDate: isoDate.nullish(), // VAL-TRIP-04
    endDate: isoDate.nullish(),
    notes: z.string().max(2000).nullish(), // VAL-TRIP-08
  })
  .refine((d) => !(d.startDate && d.endDate) || d.endDate >= d.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  }); // VAL-TRIP-04

export type TripInput = z.infer<typeof tripInputSchema>;

/** A Look's details (specs/looks, VAL-LOOK-*). Members are managed by their own
 *  actions, not this schema. */
export const lookInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120), // VAL-LOOK-01
  kind: z.enum(["set", "look"]).default("look"), // VAL-LOOK-02
  notes: z.string().max(2000).nullish(), // VAL-LOOK-03
});

export type LookInput = z.infer<typeof lookInputSchema>;

/** Why a look was retired (specs/looks, #170). Unlike items, a look isn't
 *  "sold" — these describe why a curation is no longer active. `piece-archived`
 *  is the value the item-archive reminder pre-fills. */
export const LOOK_ARCHIVE_REASONS = [
  "no-longer-wear",
  "piece-archived",
  "outdated",
  "other",
] as const;

export type LookArchiveReason = (typeof LOOK_ARCHIVE_REASONS)[number];

const LOOK_ARCHIVE_REASON_SET = new Set<string>(LOOK_ARCHIVE_REASONS);

/** Archiving a look (#170) — mirrors the item archive contract: a date, a
 *  reason from the closed vocabulary, and optional free text. */
export const lookArchiveInputSchema = z.object({
  archivedAt: isoDate.refine(
    (d) => d <= new Date().toISOString().slice(0, 10),
    "A look can't have been retired in the future",
  ),
  reason: z
    .string()
    .trim()
    .refine((v) => LOOK_ARCHIVE_REASON_SET.has(v), "Choose a reason"),
  note: z
    .string()
    .trim()
    .max(255)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type LookArchiveInput = z.infer<typeof lookArchiveInputSchema>;
