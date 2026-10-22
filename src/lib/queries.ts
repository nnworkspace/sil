/**
 * Server-side read queries for the Catalog. Imported only by Server Components.
 */

import {
  and,
  type AnyColumn,
  arrayOverlaps,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  not,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import { withRetry } from "@/lib/transient";
import { itemPhotos, items, wearEvents } from "@/db/schema";
import {
  CATEGORIES,
  TAG_GROUPS,
  categoryMatcher,
  descendantSlugs,
} from "@/lib/categories";
import { colorKeywordsForQuery, colorMatchSpec } from "@/lib/colors";
import { materialPatterns } from "@/lib/materials";
import { type BrowseParams } from "@/lib/browse";
import { allowsInsideWord, escapeLike, wordPrefixPattern } from "@/lib/search";
import { compareBerths } from "@/lib/berths";
import { sortItems } from "@/lib/sort";

/**
 * The active wardrobe (specs/archive, VAL-ARCHIVE-04). A piece is active exactly
 * when it has no archive date. Defined once and applied inside the helpers
 * below rather than at each call site, so a new page cannot forget it and quietly
 * start showing pieces that have been sold or given away.
 *
 * Deliberately **not** applied to `getItemWithPhotos` (an archived piece must
 * still open and be editable) nor to the look/trip readers (an existing
 * reference is history, shown but marked — SPEC-ARCHIVE-FUNC §7).
 */
const notArchived = () => isNull(items.archivedAt);

/** One item with its photos, primary first then by sort order. */
export async function getItemWithPhotos(id: string) {
  return withRetry(async () => {
    return db.query.items.findFirst({
      where: (i, { eq }) => eq(i.id, id),
      with: {
        photos: {
          orderBy: (p, { asc, desc }) => [desc(p.isPrimary), asc(p.sort)],
        },
        wearEvents: {
          orderBy: (w, { desc }) => [desc(w.wornAt)],
        },
      },
    });
  });
}

/** Items in a category — matched on its primary category OR one of its extras
 *  (#71), and **rolled up over sub-categories** (#78): a parent (e.g. jewellery)
 *  includes all its descendants (rings, …), a leaf just itself. Newest first,
 *  each with its primary photo (if any). */
export async function getItemsByCategory(category: string, filters?: BrowseParams) {
  return withRetry(async () => {
    const slugs = descendantSlugs(category);
    const categoryCond = or(
      inArray(items.category, slugs),
      arrayOverlaps(items.secondaryCategories, slugs),
    );
    const extra = filters ? browseFilterConditions(filters) : [];
    const rows = await db.query.items.findMany({
      where: and(categoryCond, notArchived(), ...extra),
      with: {
        photos: {
          where: (p, { eq }) => eq(p.isPrimary, true),
          limit: 1,
        },
        wearEvents: { columns: { wornAt: true } },
      },
    });
    return sortItems(rows, filters?.sort ?? "new");
  });
}

/** Items filed **directly** under a category with no sub-type chosen — a
 *  parent's "not categorised" bucket (#78). A piece qualifies when its primary
 *  category is exactly this slug (e.g. `tops`) **and** it is not cross-filed
 *  (via `secondary_categories`) into any of its sub-categories: a piece whose
 *  primary is `tops` but which is also marked `jumpers` *has* been given a
 *  sub-type, so it belongs to the sub-category, not this bucket. Newest first,
 *  each with its primary photo. */
export async function getItemsDirectlyInCategory(category: string, filters?: BrowseParams) {
  return withRetry(async () => {
    const subSlugs = descendantSlugs(category).filter((s) => s !== category);
    const base =
      subSlugs.length === 0
        ? eq(items.category, category)
        : and(
            eq(items.category, category),
            not(arrayOverlaps(items.secondaryCategories, subSlugs)),
          );
    const extra = filters ? browseFilterConditions(filters) : [];
    const rows = await db.query.items.findMany({
      where: and(base, notArchived(), ...extra),
      with: {
        photos: {
          where: (p, { eq }) => eq(p.isPrimary, true),
          limit: 1,
        },
        wearEvents: { columns: { wornAt: true } },
      },
    });
    return sortItems(rows, filters?.sort ?? "new");
  });
}


/**
 * Browse the whole wardrobe with tag filters and a keyword search
 * (SPEC-BROWSE-FUNC). Tags: OR within a group, AND across groups
 * (`VAL-BROWSE-03`). Keyword: case-insensitive substring on name / brand /
 * material (`VAL-BROWSE-04`). Both AND-combined (`VAL-BROWSE-05`); no
 * constraint ⇒ the full wardrobe. Newest first, each with its primary photo.
 */
/** Tag / colour / keyword filter conditions shared by browse and the category
 *  pages (#39, #105). Returns an array to AND together (possibly empty). */
function browseFilterConditions({ tags, q, colors, materials, favorite, missing }: BrowseParams) {
  const conditions = [];

  // "Favourites only" (#135) — combines with every other facet.
  if (favorite) conditions.push(eq(items.favorite, true));

  for (const group of TAG_GROUPS) {
    const selected = group.tags.filter((t) => tags.includes(t));
    if (selected.length > 0) conditions.push(arrayOverlaps(items.tags, selected));
  }

  // Colour families (#105, #211). SQL cannot call `colorFamiliesOf` per row, so
  // `colorMatchSpec` hands over the same rule in three parts: the ordinary
  // keyword match, the colours an override *puts into* a selected family, and
  // the colours it *keeps out* — which must be excluded even though a keyword
  // matches them, because that is the whole point of an override.
  if (colors.length > 0) {
    const { keywords, exactly, notExactly } = colorMatchSpec(colors);
    const normalised = sql`lower(btrim(${items.color}))`;
    const byKeyword =
      keywords.length > 0
        ? or(...keywords.map((kw) => ilike(items.color, `%${escapeLike(kw)}%`)))
        : undefined;
    const guessed =
      byKeyword && notExactly.length > 0
        ? and(byKeyword, not(inArray(normalised, notExactly)))
        : byKeyword;
    const declared = exactly.length > 0 ? inArray(normalised, exactly) : undefined;
    const both = [guessed, declared].filter((c) => c !== undefined);
    if (both.length > 0) conditions.push(or(...both));
  }

  // Material (#263). OR within the facet, like colour: "linen or cotton" is what
  // a wardrobe question sounds like, and AND would almost always mean a blend
  // the owner did not have in mind.
  //
  // The pattern is built in `materialPatterns` and **bound as a parameter**, not
  // interpolated. `~*` binds tighter than `||`, so composing the regex inside
  // the SQL string is a trap that fails silently — every row simply stops
  // matching, with no error to notice.
  if (materials.length > 0) {
    const patterns = materialPatterns(materials);
    if (patterns.length > 0) {
      conditions.push(or(...patterns.map((re) => sql`${items.material} ~* ${re}`)));
    }
  }

  // A data gap the Figures dashboard links to (#181). Each is the SQL form of
  // one row in the Gaps module, so a count there and the list here can never
  // disagree — the definition lives in exactly one place per gap.
  if (missing) {
    const noWearEvents = sql`not exists (select 1 from ${wearEvents} w where w.item_id = ${items.id})`;
    const blank = (col: AnyColumn) => or(isNull(col), eq(sql`btrim(${col})`, ""));
    switch (missing) {
      case "price":
        conditions.push(isNull(items.pricePaidCents));
        break;
      case "wears":
        // Not recorded, which is not the same as recorded-never-worn (#191).
        conditions.push(and(isNull(items.priorWears), noWearEvents));
        break;
      case "date":
        conditions.push(isNull(items.purchasedAt));
        break;
      case "material":
        conditions.push(blank(items.material));
        break;
      case "berth":
        conditions.push(blank(items.storageLocation));
        break;
      case "photo":
        conditions.push(sql`not exists (select 1 from ${itemPhotos} p where p.item_id = ${items.id})`);
        break;
    }
  }

  const query = q.trim();
  if (query) {
    const searched = [
      items.name,
      items.brand,
      items.material,
      items.color,
      // Berth (#172) — typing "attic" surfaces everything stored there.
      items.storageLocation,
      // Tags are an array; flatten to text so a typed word (e.g. "summer")
      // matches a tag without using the chips (VAL-BROWSE-04).
      sql`array_to_string(${items.tags}, ' ')`,
    ];

    // Match at a word *start*, not anywhere in the string (#222). A bare
    // substring made "red" find every `collared` shirt and every Tapered
    // trouser: dozens of hits, a handful of them red — which is what buried the burgundy top
    // the owner was looking for.
    //
    // Prefix rather than whole word, deliberately: whole-word matching would
    // break "trouser" → Trousers, which is how people type.
    // Bound as one parameter, not built with SQL `||`: `~*` binds tighter than
    // `||`, so `col ~* '\y' || $1` parses as `(col ~* '\y') || $1` and silently
    // matches nothing at all. That cost a debugging round when it shipped as
    // zero results for every query.
    const prefixPattern = wordPrefixPattern(query);
    const clauses = searched.map((col) => sql`${col} ~* ${prefixPattern}`);

    // …but a long enough query may also match inside a word, because the only
    // matches the prefix rule loses are **compound tails**: Boatneck, Crewneck,
    // camelwool, a handful of pieces. Short queries are the fragment-prone ones
    // ("red" inside collared), so the threshold buys back every real loss
    // without letting any of the false positives return.
    if (allowsInsideWord(query)) {
      const like = `%${escapeLike(query)}%`;
      clauses.push(
        ...[
          ilike(items.name, like),
          ilike(items.brand, like),
          ilike(items.material, like),
          ilike(items.color, like),
          ilike(items.storageLocation, like),
          ilike(sql`array_to_string(${items.tags}, ' ')`, like),
        ].map((c) => sql`${c}`),
      );
    }

    // Typing a colour family reaches the colours in it, so "red" finds
    // burgundy and "blue" finds cobalt (#222).
    for (const kw of colorKeywordsForQuery(query)) {
      clauses.push(sql`${items.color} ilike ${`%${escapeLike(kw)}%`}`);
    }

    conditions.push(or(...clauses));
  }

  return conditions;
}

export async function getBrowseItems(params: BrowseParams) {
  return withRetry(async () => {
    const conditions = browseFilterConditions(params);
    const rows = await db.query.items.findMany({
      where: and(notArchived(), ...conditions),
      with: {
        photos: {
          where: (p, { eq }) => eq(p.isPrimary, true),
          limit: 1,
        },
        wearEvents: { columns: { wornAt: true } },
      },
    });
    return sortItems(rows, params.sort);
  });
}

/**
 * Distinct berths (storage locations) across the active wardrobe, with a count
 * of pieces in each — for the /berths index (#172). Most-populated first.
 *
 * Also carries the **primary category of each piece** so the index can say what
 * a berth holds (#219). Raw slugs, one per piece: summarising is a pure
 * function's job (`src/lib/berths.ts`), and doing it here would make it
 * untestable without a database. One scan either way.
 *
 * Ordered **by the notation** rather than by how full a berth is (#227), so the
 * list reads as a walk through the room. The comparator parses each code and
 * compares numerically — a plain string sort would put shelf 10 before shelf 2
 * and nothing would fail.
 */
export async function getBerths(): Promise<
  { location: string; count: number; categories: string[] }[]
> {
  // Only the read is retried; the grouping below is pure and cannot fail.
  const rows = await withRetry(() =>
    db.query.items.findMany({
      where: and(notArchived(), isNotNull(items.storageLocation)),
      columns: { storageLocation: true, category: true },
    }),
  );
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const loc = (r.storageLocation ?? "").trim();
    if (!loc) continue;
    const bucket = map.get(loc) ?? [];
    bucket.push(r.category);
    map.set(loc, bucket);
  }
  return [...map.entries()]
    .map(([location, categories]) => ({ location, count: categories.length, categories }))
    .sort((a, b) => compareBerths(a.location, b.location));
}

/** Active pieces kept in a given berth (exact match), each with its primary
 *  photo — for /berths?loc=… (#172). Alphabetical. */
export async function getItemsByBerth(location: string) {
  return withRetry(async () => {
    return db.query.items.findMany({
      where: and(notArchived(), eq(items.storageLocation, location)),
      orderBy: (i, { asc }) => [asc(i.name)],
      with: {
        photos: { where: (p, { eq }) => eq(p.isPrimary, true), limit: 1 },
        wearEvents: { columns: { wornAt: true } },
      },
    });
  });
}

/** Item count per category, as a { slug: count } map. A piece is counted under
 *  its primary category and each of its extras (#71), and **rolled up over
 *  sub-categories** (#78): a parent's count is the number of *distinct* items in
 *  it or any descendant (so a multi-sub-type piece is not double-counted). */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  return withRetry(async () => {
    const rows = await db.query.items.findMany({
      where: notArchived(),
      columns: { category: true, secondaryCategories: true },
    });
    const map: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      const inCat = categoryMatcher(cat.slug);
      const n = rows.filter(inCat).length;
      if (n > 0) map[cat.slug] = n;
    }
    return map;
  });
}

/**
 * Up to 4 cover-photo URLs per category for the home-page tiles (#76). The order
 * is **random per request** (#77 follow-up), so each home load shows a fresh
 * sample; the home page is `force-dynamic`, so it re-samples every visit. Covers
 * are **rolled up over sub-categories** (#78): a parent (jewellery) samples from
 * itself and all descendants. A piece contributes to its primary category and
 * each secondary (#71). Only pieces with a primary photo are included.
 */
export async function getCategoryCovers(): Promise<Record<string, string[]>> {
  return withRetry(async () => {
    const rows = await db.query.items.findMany({
      where: notArchived(),
      columns: { category: true, secondaryCategories: true },
      orderBy: () => sql`random()`,
      with: {
        photos: {
          where: (p, { eq }) => eq(p.isPrimary, true),
          columns: { url: true },
          limit: 1,
        },
      },
    });
    const map: Record<string, string[]> = {};
    for (const cat of CATEGORIES) {
      const inCat = categoryMatcher(cat.slug);
      const urls: string[] = [];
      for (const row of rows) {
        if (urls.length >= 4) break;
        const url = row.photos[0]?.url;
        if (url && inCat(row)) urls.push(url);
      }
      if (urls.length > 0) map[cat.slug] = urls;
    }
    return map;
  });
}

export type ItemWithPhotos = NonNullable<
  Awaited<ReturnType<typeof getItemWithPhotos>>
>;

// --- Trips (specs/trips) ----------------------------------------------------

/** All trips with derived packing counts (SPEC-TRIPS-DATA §4). Ordered
 *  upcoming/most-recent first: `start_date` desc (nulls last), then newest. The
 *  set is small, so the roll-up + ordering is done in memory. */
export async function getTrips() {
  return withRetry(async () => {
    const rows = await db.query.trips.findMany({
      with: { tripItems: { columns: { packed: true } } },
    });
    return rows
      .map((t) => ({
        ...t,
        pieceCount: t.tripItems.length,
        packedCount: t.tripItems.filter((ti) => ti.packed).length,
      }))
      .sort((a, b) => {
        if (a.startDate && b.startDate)
          return a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0;
        if (a.startDate) return -1; // dated trips before undated (nulls last)
        if (b.startDate) return 1;
        return a.createdAt < b.createdAt ? 1 : -1;
      });
  });
}

/** One trip with its packing list — each `trip_item` carries its wardrobe item
 *  and that item's primary photo (for the thumbnail). Grouping/ordering by
 *  category is applied by the page. */
export async function getTripWithItems(id: string) {
  return withRetry(async () => {
    return db.query.trips.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      with: {
        tripItems: {
          with: {
            // Which days each packed piece is planned for (#270). Loaded with
            // the membership rather than separately, so the day view and the
            // packing list are two readings of one query.
            days: true,
            item: {
              with: {
                photos: {
                  where: (p, { eq }) => eq(p.isPrimary, true),
                  limit: 1,
                },
              },
            },
          },
        },
      },
    });
  });
}

/** Lightweight trip list (id + name) for the item-page "Add to trip" menu. */
export async function getTripOptions() {
  return withRetry(async () => {
    return db.query.trips.findMany({
      columns: { id: true, name: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  });
}

export type TripWithItems = NonNullable<
  Awaited<ReturnType<typeof getTripWithItems>>
>;

// --- Looks (specs/looks) ----------------------------------------------------

/** All Looks with a derived piece count and cover urls (up to 4) for the card.
 *  The cover **prefers the Look's own photos** (its cover first); a Look with no
 *  own photos falls back to the member pieces' collage (#95, #98). Newest first. */
export async function getLooks() {
  return withRetry(async () => {
    const rows = await db.query.looks.findMany({
      where: (l, { isNull }) => isNull(l.archivedAt), // active looks only (#170)
      orderBy: (l, { desc }) => [desc(l.createdAt)],
      with: {
        photos: { orderBy: (p, { asc, desc }) => [desc(p.isPrimary), asc(p.sort)] },
        lookItems: {
          orderBy: (li, { asc }) => [asc(li.sort)],
          with: {
            item: {
              with: { photos: { where: (p, { eq }) => eq(p.isPrimary, true), limit: 1 } },
            },
          },
        },
      },
    });
    return rows.map((l) => {
      const ownUrls = l.photos.map((p) => p.url);
      const collageUrls = l.lookItems
        .map((li) => li.item.photos[0]?.url)
        .filter((u): u is string => Boolean(u));
      return {
        ...l,
        pieceCount: l.lookItems.length,
        // Prefer the owner's own photos; fall back to the piece collage.
        coverUrls: (ownUrls.length > 0 ? ownUrls : collageUrls).slice(0, 4),
        hasOwnCover: ownUrls.length > 0,
        // "Incomplete" ⇒ a member piece has been archived (#170); derived, not
        // stored, so it is always accurate. The look stays visible, just flagged.
        incomplete: l.lookItems.some((li) => li.item.archivedAt != null),
      };
    });
  });
}

/** Archived looks for the unified `/archive` page (#170) — the complement of
 *  the active looks. Ordered by archive date, newest first, each with a cover
 *  (own primary photo, else member collage) and piece count. */
export async function getArchivedLooks() {
  return withRetry(async () => {
    const rows = await db.query.looks.findMany({
      where: (l, { isNotNull }) => isNotNull(l.archivedAt),
      orderBy: (l, { desc }) => [desc(l.archivedAt), desc(l.updatedAt)],
      with: {
        photos: { orderBy: (p, { asc, desc }) => [desc(p.isPrimary), asc(p.sort)] },
        lookItems: {
          orderBy: (li, { asc }) => [asc(li.sort)],
          with: {
            item: {
              with: { photos: { where: (p, { eq }) => eq(p.isPrimary, true), limit: 1 } },
            },
          },
        },
      },
    });
    return rows.map((l) => {
      const ownUrls = l.photos.map((p) => p.url);
      const collageUrls = l.lookItems
        .map((li) => li.item.photos[0]?.url)
        .filter((u): u is string => Boolean(u));
      return {
        ...l,
        pieceCount: l.lookItems.length,
        coverUrls: (ownUrls.length > 0 ? ownUrls : collageUrls).slice(0, 4),
      };
    });
  });
}

/** One Look with its own photos (cover first) and its members — each carrying
 *  its wardrobe item and primary photo. */
export async function getLookWithItems(id: string) {
  return withRetry(async () => {
    return db.query.looks.findFirst({
      where: (l, { eq }) => eq(l.id, id),
      with: {
        photos: { orderBy: (p, { asc, desc }) => [desc(p.isPrimary), asc(p.sort)] },
        lookItems: {
          orderBy: (li, { asc }) => [asc(li.sort)],
          with: {
            item: {
              with: { photos: { where: (p, { eq }) => eq(p.isPrimary, true), limit: 1 } },
            },
          },
        },
      },
    });
  });
}

/** The Looks a piece belongs to (id, name, kind) — the item page's "In these
 *  Looks". Archived looks are excluded, so a retired look's link disappears from
 *  the piece's active view (#170); the membership row survives for restore. */
export async function getLooksForItem(itemId: string) {
  return withRetry(async () => {
    const rows = await db.query.lookItems.findMany({
      where: (li, { eq }) => eq(li.itemId, itemId),
      with: { look: { columns: { id: true, name: true, kind: true, archivedAt: true } } },
    });
    return rows
      .filter((r) => !r.look.archivedAt)
      .map((r) => ({ id: r.look.id, name: r.look.name, kind: r.look.kind }));
  });
}

/** The distinct other pieces sharing any Look with this piece — its curated
 *  "Goes with" (each with a primary photo). */
export async function getGoesWith(itemId: string) {
  return withRetry(async () => {
    const memberships = await db.query.lookItems.findMany({
      where: (li, { eq }) => eq(li.itemId, itemId),
      columns: { lookId: true },
      with: { look: { columns: { archivedAt: true } } },
    });
    // An archived look is history, so its pairings shouldn't drive "Goes with" (#170).
    const lookIds = memberships.filter((m) => !m.look.archivedAt).map((m) => m.lookId);
    if (lookIds.length === 0) return [];
    const rows = await db.query.lookItems.findMany({
      where: (li, { and, inArray, ne }) => and(inArray(li.lookId, lookIds), ne(li.itemId, itemId)),
      with: {
        item: { with: { photos: { where: (p, { eq }) => eq(p.isPrimary, true), limit: 1 } } },
      },
    });
    const seen = new Set<string>();
    const out: (typeof rows)[number]["item"][] = [];
    for (const r of rows) {
      if (seen.has(r.itemId)) continue;
      // "Goes with" suggests what to wear, so a piece that has left the wardrobe
      // is noise here — unlike the look itself, which keeps it as history
      // (specs/archive §7).
      if (r.item.archivedAt) continue;
      seen.add(r.itemId);
      out.push(r.item);
    }
    return out;
  });
}

/**
 * Archived pieces for `/archive` (OP-VIEW-ARCHIVE) — the complement of the
 * active wardrobe. Ordered by archive date, newest first, so the list reads as a
 * timeline of what left; grouping by category happens in the page.
 */
export async function getArchivedItems() {
  return withRetry(async () => {
    return db.query.items.findMany({
      where: isNotNull(items.archivedAt),
      orderBy: [desc(items.archivedAt), desc(items.updatedAt)],
      with: {
        photos: {
          where: (p, { eq }) => eq(p.isPrimary, true),
          limit: 1,
        },
        wearEvents: { columns: { wornAt: true } },
      },
    });
  });
}

/** Lightweight Look list (id + name + kind) for the item-page "Add to Look" menu.
 *  Archived looks are excluded — you can't add a piece to a retired look (#170). */
export async function getLookOptions() {
  return withRetry(async () => {
    return db.query.looks.findMany({
      where: (l, { isNull }) => isNull(l.archivedAt),
      columns: { id: true, name: true, kind: true },
      orderBy: (l, { desc }) => [desc(l.createdAt)],
    });
  });
}

export type LookWithItems = NonNullable<
  Awaited<ReturnType<typeof getLookWithItems>>
>;

/**
 * The active catalogue as the Compendium reads it (SPEC-COMPENDIUM-DATA §6,
 * #213): one read, then every entry is matched against it in memory. Querying
 * per entry would be ~29 scans of the same few hundred rows to answer one page.
 *
 * `description` and `notes` come along because construction and finish terms
 * live there rather than in the composition label — *jersey* appears 58 times in
 * this catalogue's prose and not once in a `material` string.
 */
export async function getCompendiumItems() {
  return withRetry(async () => {
    return db.query.items.findMany({
      where: notArchived(),
      columns: {
        id: true,
        name: true,
        brand: true,
        material: true,
        description: true,
        notes: true,
      },
      orderBy: (i, { asc }) => [asc(i.name)],
      with: {
        photos: { where: (p, { eq }) => eq(p.isPrimary, true), limit: 1 },
      },
    });
  });
}

/** Every piece the Figures dashboard needs, in one read (SPEC-FIGURES-DATA §5).
 *  Archived rows are fetched too — the sidebar's scope filter decides whether
 *  they count (VAL-FIG-01), and filtering here would make that impossible. Only
 *  the columns the metrics consult are selected; photos are not among them. */
export async function getFigureItems() {
  return withRetry(async () => {
    return db.query.items.findMany({
      columns: {
        id: true,
        name: true,
        brand: true,
        category: true,
        secondaryCategories: true,
        color: true,
        material: true,
        tags: true,
        pricePaidCents: true,
        purchasedAt: true,
        priorWears: true,
        favorite: true,
        archivedAt: true,
        storageLocation: true,
        createdAt: true,
      },
      with: {
        wearEvents: { columns: { wornAt: true } },
        // Only whether one exists — the Gaps module counts pieces without a
        // photo, and loading the rows themselves would be wasted bytes.
        photos: { columns: { id: true }, limit: 1 },
      },
    });
  });
}
