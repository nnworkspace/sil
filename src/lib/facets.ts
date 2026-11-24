import { containsToken } from "@/lib/compendium/match";

/**
 * Deriving the style facets from what a piece already says about itself (#229).
 *
 * Every value here comes from text the owner or the maker already wrote: a
 * description, a note, or the piece's own name. **Nothing is inferred from a
 * photograph**, because a photograph has been wrong about this catalogue
 * repeatedly: a rolled sleeve read as ¾, COS's own copy calling a ¾ sleeve
 * "short", one technical knit read as softer than its identically harsh sibling.
 *
 * The matcher is the Compendium's `containsToken`, reused rather than rewritten,
 * so this inherits both-sided token boundaries **and** the negation guard:
 * "not a jersey t-shirt", "no rib welt", "collarless" all behave correctly.
 *
 * Where the text does not say, **nothing is returned**. A missing tag is honest;
 * a guessed one is what made #229 necessary in the first place.
 */

export type FacetKind = "sleeve" | "neck" | "fit" | "length" | "silhouette";

export type FacetField = "name" | "description" | "notes";

export type FacetSource = {
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  category: string;
};

type Rule = {
  value: string;
  patterns: string[];
  /**
   * Proximity pairs: `["long", "sleeve"]` matches "long cuffed sleeves",
   * "long roll-up sleeves", "long, wide sleeves". This catalogue almost always
   * puts an adjective between the length word and the noun, so fixed phrases
   * alone found only a handful.
   */
  near?: [string, string][];
  /** Where this rule may read. Defaults to all three. */
  fields?: FacetField[];
  /** A hit on any of these vetoes the rule. */
  exclude?: string[];
};

/**
 * **Notes are deliberately excluded.** `description` describes the garment;
 * `notes` are the owner's thoughts about *wearing* it, and those talk about
 * other clothes. Reading notes produced a run of false positives that were all
 * the same shape (the piece tagged with a neighbour's facet):
 *
 *   "to wear under the cropped blazers"            → tee tagged cropped
 *   "wide beige culottes … cropped ones at that"   → top tagged cropped
 *   "COS styles it over slim black cropped trousers" → top tagged cropped
 *   "reads almost like a full A-line midi skirt"    → culottes tagged a-line
 *
 * There is no syntactic marker for that (it is not a denial, it is a sentence
 * about something else), so the fix is the field, not a smarter pattern.
 */
const ALL: FacetField[] = ["name", "description"];

/**
 * Ordered most-specific-first; the first rule that matches wins, because a
 * garment has exactly one sleeve length, one neckline, one fit.
 */

const SLEEVE: Rule[] = [
  {
    value: "sleeveless",
    patterns: [
      "sleeveless",
      "strappy",
      "spaghetti strap",
      "spaghetti straps",
      "vest top",
      "camisole",
      "tank top",
    ],
  },
  {
    value: "cap",
    patterns: ["cap sleeve", "cap sleeves", "cap-sleeve", "cap-sleeved"],
    near: [["cap", "sleeve"]],
  },
  // "elbow-length" is this catalogue's most common way of saying ¾.
  {
    value: "3/4",
    patterns: ["three-quarter", "three quarter", "elbow-length", "elbow length"],
    // Bare "3/4" only counts next to the noun: "Trousers (3/4)" is a leg length.
    near: [["3/4", "sleeve"], ["three-quarter", "sleeve"]],
  },
  {
    value: "half",
    patterns: ["half sleeve", "half sleeves", "half-sleeve", "half-sleeved"],
    near: [["half", "sleeve"]],
  },
  {
    value: "short",
    patterns: ["short sleeve", "short sleeves", "short-sleeve", "short-sleeved"],
    near: [["short", "sleeve"]],
  },
  {
    value: "long",
    patterns: ["long sleeve", "long sleeves", "long-sleeve", "long-sleeved"],
    near: [["long", "sleeve"]],
  },
];

const NECK: Rule[] = [
  { value: "grandad", patterns: ["grandad", "grandad collar"] },
  {
    value: "collared",
    patterns: ["collar", "collared", "pointed collar", "shirt collar", "polo"],
    // Several pieces are explicitly collarless; the negation guard catches "no
    // collar" but not the compound word, so it is excluded outright.
    exclude: ["collarless", "collar-less"],
  },
  { value: "boat", patterns: ["boat neck", "boat-neck", "boatneck", "bateau"] },
  { value: "v-neck", patterns: ["v-neck", "v neck", "vee neck", "v-neckline"] },
  { value: "square", patterns: ["square neck", "square-neck", "square neckline"] },
  { value: "cowl", patterns: ["cowl", "cowl neck"] },
  { value: "halter", patterns: ["halter", "halterneck", "halter neck"] },
  // A scoop is a deep round neck; both are round openings, so both map here.
  // Deliberately absent: funnel, mock and turtle necks. The vocabulary has no
  // term for a stand-up round neck, and calling one "round" would flatten a
  // real distinction; they are left untagged instead (see #229).
  {
    value: "round",
    patterns: ["round neck", "round-neck", "crew neck", "crew-neck", "crewneck", "scoop neck", "scoop-neck", "scooped neck"],
  },
];

const FIT: Rule[] = [
  { value: "oversized", patterns: ["oversized", "over-sized"] },
  { value: "boxy", patterns: ["boxy"] },
  {
    value: "relaxed",
    patterns: ["relaxed fit", "relaxed-fit", "loose fit", "loose-fitting", "lockere passform"],
  },
  {
    value: "slim",
    patterns: ["slim fit", "slim-fit", "close fit", "close-fitting", "body-skimming"],
  },
  {
    // Bare "fitted" is unusable in prose: this catalogue writes "fitted yoke",
    // "fitted bodice", "worn open over a fitted top". In a *name* it reliably
    // describes the garment itself, so the rule reads names only.
    value: "slim",
    patterns: ["fitted"],
    fields: ["name"],
    exclude: ["fitted waist", "fitted bodice", "fitted yoke"],
  },
  { value: "regular", patterns: ["regular fit", "regular-fit"] },
];

/**
 * Length is category-dependent, and this is the likeliest way a bulk backfill
 * goes quietly wrong: a top must never be tagged `midi`.
 */
const HEM_LENGTH: Rule[] = [
  { value: "maxi", patterns: ["maxi", "floor-length", "floor length", "ankle-length", "ankle length"] },
  { value: "midi", patterns: ["midi", "mid-length", "calf-length"] },
  { value: "knee", patterns: ["knee-length", "knee length", "to the knee", "at the knee"] },
  { value: "mini", patterns: ["mini", "above the knee"] },
];

const CROP_LENGTH: Rule[] = [
  { value: "cropped", patterns: ["cropped", "crop top", "kurzer", "kurz geschnitten"] },
];

/** Garments with no sleeves at all. Deriving a sleeve for these is how
 *  "High-Waist Wide-Leg Corduroy Trousers (3/4)" acquired a ¾ *sleeve*: the
 *  "(3/4)" is the leg length, and the German copy says 7/8-Länge. */
const SLEEVELESS_CATEGORIES = new Set([
  "trousers", "jeans", "culottes", "shorts", "skirts", "bags", "shoes",
]);

/** Categories measured on the mini→maxi scale; everything else can only crop. */
const HEM_CATEGORIES = new Set(["dresses", "shirt-dresses", "slip-dresses", "skirts"]);

const SILHOUETTE: Rule[] = [
  // Not "a line": the bare words match "a line of buttons" and "traces a line",
  // which put an a-line tag on a corduroy shirt and a boxy t-shirt.
  { value: "a-line", patterns: ["a-line"] },
  { value: "fit-and-flare", patterns: ["fit-and-flare", "fit and flare"] },
  { value: "wrap", patterns: ["wrap dress", "wrap front", "wrap-front", "wraparound", "wrap top"] },
  { value: "shift", patterns: ["shift dress", "shift shape", "shift silhouette"] },
  { value: "sheath", patterns: ["sheath"] },
  { value: "tunic", patterns: ["tunic"] },
  { value: "swing", patterns: ["swing"] },
  // Deliberately absent: `column`. In this catalogue the word is prose about
  // how cloth falls ("a straight column rather than flapping", "an elongating
  // column") and almost never the silhouette. Plenty of hits, at most one real.
];

function textFor(piece: FacetSource, fields: FacetField[]): string {
  return fields.map((f) => piece[f] ?? "").join(" \n ");
}

/** Longest gap allowed between the two halves of a proximity pair. Covers
 *  "kimono-style ", "roll-up ", ", wide ", and little else. */
const NEAR_GAP = 24;

/**
 * `a` followed by `b` within `NEAR_GAP` characters, without crossing a sentence
 * end or a line break, so "long sleeves. Short hem" never reads as one phrase,
 * and neither do two adjacent bullet points.
 */
function nearby(text: string, a: string, b: string): boolean {
  const hay = text.toLowerCase();
  const needle = a.toLowerCase();
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at === -1) return false;
    const before = hay[at - 1];
    const after = hay[at + needle.length];
    const bounded = !/\p{L}/u.test(before ?? "") && !/\p{L}/u.test(after ?? "");
    if (bounded) {
      const window = hay.slice(at + needle.length, at + needle.length + NEAR_GAP);
      const stop = window.search(/[.;:!?\n]/);
      const usable = stop === -1 ? window : window.slice(0, stop);
      // Word *start*, not a whole token: the noun is almost always plural
      // ("sleeves"), and `containsToken` requires a boundary on both sides.
      // Safe against "sleeveless" because that rule is matched first.
      if (startsWordWith(usable, b) && !isDenied(hay, at)) return true;
    }
    from = at + 1;
  }
}

/** Whether some word in `text` begins with `prefix`. */
function startsWordWith(text: string, prefix: string): boolean {
  const hay = text.toLowerCase();
  const needle = prefix.toLowerCase();
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at === -1) return false;
    if (!/\p{L}/u.test(hay[at - 1] ?? "")) return true;
    from = at + 1;
  }
}

/** Reuses the Compendium's denial vocabulary, looking just behind the match. */
const DENIAL = /\b(?:no|not|without|instead of|rather than|never)\b[^.;:!?]{0,24}$/;
const isDenied = (hay: string, at: number) => DENIAL.test(hay.slice(Math.max(0, at - 40), at));

function firstMatch(rules: Rule[], piece: FacetSource): string | undefined {
  for (const rule of rules) {
    const text = textFor(piece, rule.fields ?? ALL);
    if (!text.trim()) continue;
    if (rule.exclude?.some((x) => containsToken(text, x))) continue;
    if (rule.patterns.some((p) => containsToken(text, p))) return rule.value;
    if (rule.near?.some(([a, b]) => nearby(text, a, b))) return rule.value;
  }
  return undefined;
}

/**
 * The facets a piece's own text supports. Absent keys mean "the text does not
 * say", never "no". Callers add only what is returned and leave the rest alone.
 */
export function deriveFacets(piece: FacetSource): Partial<Record<FacetKind, string>> {
  const out: Partial<Record<FacetKind, string>> = {};

  if (!SLEEVELESS_CATEGORIES.has(piece.category)) {
    const sleeve = firstMatch(SLEEVE, piece);
    if (sleeve) out.sleeve = sleeve;
  }

  const neck = firstMatch(NECK, piece);
  if (neck) out.neck = neck;

  const fit = firstMatch(FIT, piece);
  if (fit) out.fit = fit;

  const length = firstMatch(
    HEM_CATEGORIES.has(piece.category) ? HEM_LENGTH : CROP_LENGTH,
    piece,
  );
  if (length) out.length = length;

  const silhouette = firstMatch(SILHOUETTE, piece);
  if (silhouette) out.silhouette = silhouette;

  return out;
}
