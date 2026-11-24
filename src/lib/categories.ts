/**
 * Shared domain constants for the wardrobe.
 *
 * Categories mirror how a fashion store groups items. Tags are grouped by
 * "kind" so we can offer nicer filtering later (e.g. show all occasion tags
 * together). Keeping these in one place means the DB, forms, and filters all
 * agree on the same vocabulary.
 */

// Categories form a tree: an entry with a `parent` slug is a sub-category of it
// (#78). Currently only Jewellery has children; the model supports any depth so
// other roots can nest later. An item is filed under any node: a leaf (e.g.
// `rings`) or a parent (`jewellery`). A parent's page/count/covers roll up all
// its descendants.
export const CATEGORIES = [
  { slug: "dresses", label: "Dresses" },
  { slug: "tops", label: "Tops" },
  // Structured tailoring, kept separate from Outerwear so that tile isn't a
  // catch-all for coats, trenches and blazers alike; placed by Tops on the
  // grid at the owner's request (#148).
  { slug: "blazers", label: "Blazers" },
  { slug: "knitwear", label: "Knitwear" },
  { slug: "trousers", label: "Trousers" },
  { slug: "skirts", label: "Skirts" },
  { slug: "outerwear", label: "Outerwear" },
  { slug: "underwear-and-pyjamas", label: "Underwear and Pyjamas" },
  // Sport / outdoor / gym pieces, kept out of Trousers and Tops so workout
  // and technical gear doesn't mix into everyday-wear browsing (#163).
  { slug: "activewear", label: "Activewear" },
  { slug: "shoes", label: "Shoes" },
  { slug: "bags", label: "Bags" },
  { slug: "accessories", label: "Accessories" },
  { slug: "shirts", label: "Shirts", parent: "tops" },
  { slug: "t-shirts", label: "T-Shirts", parent: "tops" },
  { slug: "vests", label: "Vests", parent: "tops" },
  { slug: "jumpers", label: "Jumpers", parent: "tops" },
  { slug: "cardigans", label: "Cardigans", parent: "tops" },
  // Boleros (#243, widened in #245). A bolero is a *cut*, not a construction,
  // which makes it the odd one out beside Shirts and Jumpers: it spans knit
  // and woven, and holds a lace knit, a satin evening piece, a lined jacquard
  // jacket and several cropped blazers. It earns a bucket for the reason a
  // filter cannot solve: they were scattered across Outerwear, Blazers and
  // Cardigans, so there was no single place to see them, and `cropped` covers dozens of
  // pieces including trousers.
  //
  // **Two tests, both required** (#245, refined after the owner reviewed the
  // first pass):
  //
  //   1. **The hem sits above the waist**, or optically does. This is the one
  //      that "cropped" does not settle: several genuinely cropped blazers
  //      land *on* the waist and are not boleros.
  //   2. **A clean neckline**: round, V or stand. A notch lapel disqualifies
  //      it: a short blazer with lapels is still a blazer.
  //
  // Whether the front fastens is deliberately irrelevant; that was the rule in
  // #243 and the owner replaced it. Being a layer is typical but *not*
  // required: a cropped poplin shirt qualifies.
  //
  // Note this is not the trade definition, which does require an open front.
  // The Compendium's `bolero` entry carries both so the app and the glossary
  // cannot quietly disagree.
  //
  // **Test 1 cannot be automated or read from a photograph.** Where a hem
  // falls is a fact about the wearer, not the garment; the category is owner-
  // assigned, and a description reading "ends at the natural waist" is not
  // evidence, several having been written from product shots.
  { slug: "boleros", label: "Boleros", parent: "tops" },
  // Trousers sub-types (#166): garment types/cuts that roll up into the
  // Trousers tile, and /category/<slug> filters to just those. Fabric (corduroy,
  // wool…) and pure silhouette (wide-leg, tapered) are deliberately NOT
  // sub-categories: those are the material field and the #106 style filters.
  { slug: "jeans", label: "Jeans", parent: "trousers" },
  { slug: "culottes", label: "Culottes", parent: "trousers" },
  { slug: "shorts", label: "Shorts", parent: "trousers" },
  // Dress sub-types (#166): genuine garment types, not silhouettes (which are
  // the #106 filters). Roll up into the Dresses tile.
  { slug: "shirt-dresses", label: "Shirt Dresses", parent: "dresses" },
  { slug: "slip-dresses", label: "Slip Dresses", parent: "dresses" },
  // British throughout, slug included (#282). #279 changed only the label and
  // left the slug, on the grounds that a slug is a URL and a stored value.
  // Then the measurement came back: zero pieces filed at the parent, six
  // carrying it as a secondary, no trip-plan slot. Cheap enough to do properly,
  // and `/category/jewelry` redirects permanently so no bookmark breaks.
  { slug: "jewellery", label: "Jewellery" },
  { slug: "earrings", label: "Earrings", parent: "jewellery" },
  { slug: "necklaces", label: "Necklaces", parent: "jewellery" },
  { slug: "rings", label: "Rings", parent: "jewellery" },
  { slug: "brooches", label: "Brooches", parent: "jewellery" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

/** The parent slug of a category, or undefined for a top-level one (#78). */
export function parentOf(slug: string): string | undefined {
  const c = CATEGORIES.find((x) => x.slug === slug);
  return c && "parent" in c ? c.parent : undefined;
}

/** Direct children of a category (empty for a leaf). */
export function childrenOf(slug: string) {
  return CATEGORIES.filter((c) => "parent" in c && c.parent === slug);
}

/** Top-level categories (no parent): what the home grid shows. */
export const TOP_LEVEL_CATEGORIES = CATEGORIES.filter((c) => !("parent" in c));

/** A slug plus every descendant slug (any depth), for roll-up (#78). A leaf
 *  returns just itself. */
export function descendantSlugs(slug: string): string[] {
  const out = [slug];
  for (let i = 0; i < out.length; i++) {
    for (const c of CATEGORIES) {
      if ("parent" in c && c.parent === out[i] && !out.includes(c.slug)) {
        out.push(c.slug);
      }
    }
  }
  return out;
}

/** The parts of a piece that decide which categories it belongs to. */
export type Categorised = {
  category: string;
  secondaryCategories?: readonly string[] | null;
};

/**
 * The secondary categories a piece should actually carry (#206).
 *
 * Two rules, both the owner's:
 *
 *   1. **A ticked child implies its parent.** Tick `jeans` and the piece is in
 *      `trousers` too, so the parent is stored, not merely derived at read
 *      time, because the owner wants the stored data to say what is true.
 *   2. **The primary is never a secondary.** It is set by its own control and
 *      would be redundant here; `categoryMatcher` already matches on it.
 *
 * Ancestors are recomputed from the *current* primary and the *current* ticks
 * on every save. That is what keeps stored parents from going stale: move a
 * piece from `shirts` to `trousers` and `tops` is simply not re-derived, so it
 * disappears instead of lingering.
 *
 * Note the tree is two levels deep, so "ancestors" and "parent" coincide; the
 * walk below is written for depth anyway, since the model allows it.
 */
export function normaliseSecondaries(primary: string, ticked: readonly string[]): string[] {
  const out = new Set<string>();
  const addWithAncestors = (slug: string) => {
    for (let s: string | undefined = slug; s; s = parentOf(s)) out.add(s);
  };
  for (const t of ticked) addWithAncestors(t);
  // The primary's own parent comes along for the same reason a ticked child's
  // does: the piece genuinely is in it.
  const p = parentOf(primary);
  if (p) addWithAncestors(p);
  out.delete(primary);
  return [...out];
}

/**
 * The single rule for "is this piece in that category" (#180).
 *
 * A piece belongs to a category when the slug, **or any of its descendants**
 * (#78), is either its **primary** `category` or one of its
 * `secondary_categories` (#71). Counting on the primary alone silently drops
 * cross-filed pieces; summing sibling categories double-counts the ones filed
 * in two. Both mistakes are easy to make by hand, so every count, filter and
 * roll-up in the app goes through this rule instead of re-deriving it.
 *
 * Use `categoryMatcher` when testing many pieces against one slug: it hoists
 * the descendant set out of the loop.
 */
export function categoryMatcher(slug: string): (piece: Categorised) => boolean {
  const subtree = new Set(descendantSlugs(slug));
  return (piece) =>
    subtree.has(piece.category) ||
    (piece.secondaryCategories ?? []).some((s) => subtree.has(s));
}

/** Whether a single piece belongs to a category (see `categoryMatcher`). */
export function isInCategory(piece: Categorised, slug: string): boolean {
  return categoryMatcher(slug)(piece);
}

/** Distinct pieces across several category families, so a piece filed in two of
 *  them (e.g. culottes, which are both trousers and skirts) counts **once**. */
export function countAcrossCategories(
  pieces: readonly Categorised[],
  slugs: readonly string[],
): number {
  const matchers = slugs.map(categoryMatcher);
  return pieces.filter((p) => matchers.some((m) => m(p))).length;
}

/** Tags grouped by kind. Free to extend; used for tagging and filtering. */
export const TAG_GROUPS = [
  {
    kind: "occasion",
    label: "Occasion",
    // `occasion` says a piece is *fit for* a dressed occasion; `occasion-only`
    // says it is fit for nothing else (#204). The two compose: a piece keeps
    // `occasion` and gains the narrowing. The test is not formality but cost:
    // the piece asks something an ordinary day will not pay, because it is
    // uncomfortable beyond an hour or two, needs constant adjusting, demands
    // particular underwear, or cannot be layered.
    tags: ["casual", "office", "occasion", "occasion-only", "sport", "loungewear"],
  },
  {
    kind: "feel",
    label: "Feel",
    tags: ["cool", "warm", "breathable", "cozy", "lightweight", "heavyweight"],
  },
  {
    kind: "season",
    label: "Season",
    tags: ["spring", "summer", "autumn", "winter"],
  },
  {
    // How demanding a piece is to look after. The wardrobe splits sharply
    // between machine-washable cottons and dry-clean-only silks and linens.
    kind: "care",
    label: "Care",
    tags: ["easy-care", "hand-wash", "dry-clean", "delicate"],
  },
  // Style facets (#106): the garment's shape, filtered like any other tag.
  // Populated from the description at add-time / backfill and (later) AI-inferred.
  {
    kind: "neck",
    label: "Neck",
    tags: ["round", "boat", "v-neck", "square", "cowl", "halter", "collared", "grandad"],
  },
  {
    kind: "sleeve",
    label: "Sleeve",
    tags: ["sleeveless", "cap", "short", "half", "3/4", "long"],
  },
  {
    kind: "silhouette",
    label: "Silhouette",
    tags: ["a-line", "fit-and-flare", "shift", "sheath", "wrap", "tunic", "swing", "column"],
  },
  {
    kind: "fit",
    label: "Fit",
    tags: ["slim", "regular", "relaxed", "boxy", "oversized"],
  },
  {
    kind: "length",
    label: "Length",
    tags: ["cropped", "mini", "knee", "midi", "maxi"],
  },
] as const;

export type TagKind = (typeof TAG_GROUPS)[number]["kind"];

/** Flattened list of every known tag, handy for validation. */
export const ALL_TAGS = TAG_GROUPS.flatMap((group) => group.tags);

/** Photos are grouped by where they came from. */
export const PHOTO_KINDS = [
  { value: "official", label: "Official" },
  { value: "own", label: "Mine" },
] as const;

export type PhotoKind = (typeof PHOTO_KINDS)[number]["value"];

export const PHOTO_KIND_VALUES = PHOTO_KINDS.map((k) => k.value);

