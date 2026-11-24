/**
 * Matching a Compendium entry to the pieces it describes
 * (SPEC-COMPENDIUM-DATA §4, VAL-COMP-04 / VAL-COMP-05).
 *
 * The catalogue's `material` is free text (a couple of hundred distinct strings across a few hundred pieces), so an entry's piece list is a **find, not a fact**, and this module
 * is written to fail towards saying nothing rather than towards saying
 * something wrong.
 *
 * Two rules do most of the work:
 *
 *   1. **Token boundaries on both sides.** `rib` must not match *ribbon* (which
 *      really turns up in product copy), and `wool` must not match
 *      inside an unrelated word. A boundary is any non-letter or the end of the
 *      string, so `95% viscose, 5% elastan.` yields both fibres.
 *   2. **Spelling variants are the entry's job, not the catalogue's.** Nothing
 *      here rewrites what is stored. `elastane` and `elastan` are two tokens;
 *      so are `lyocell` and `tencel`, `polyamide` and `nylon`, `wool` and
 *      `camelwool` (a real string here that both-sided boundaries would
 *      otherwise miss).
 */

export type MatchField = "material" | "description" | "notes";

export type MatchRule = {
  /** Every spelling that should match. Case-insensitive. */
  tokens: string[];
  /** A hit on any of these vetoes the match, however the tokens fared. */
  exclude?: string[];
  /** Where to look. Defaults to `material` alone, the precise field. */
  fields?: MatchField[];
};

/** The parts of a piece an entry may consult. */
export type Matchable = {
  material?: string | null;
  description?: string | null;
  notes?: string | null;
};

const DEFAULT_FIELDS: MatchField[] = ["material"];

/** Lower-case and collapse whitespace. Deliberately does **not** fix spellings. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

/** A letter for boundary purposes: digits, %, punctuation and spaces all end a
 *  token, which is what makes `5% elastane,` parse the same as ` elastane `. */
const isLetter = (ch: string | undefined) => ch !== undefined && /\p{L}/u.test(ch);

/**
 * Words that turn a mention into a denial (#213 phase 3).
 *
 * Found the moment the feature met real prose: a cashmere jumper was listed
 * under **Rib** because its description says the hem is *"left to roll instead
 * of being finished with a rib welt"*, the one thing the garment does not
 * have. More than a dozen pieces in a typical catalogue mention a material in the negative.
 *
 * Deliberately narrow. It looks only just behind the match and stops at
 * sentence punctuation, so "a rib welt. Not lined." does not suppress the rib.
 * It cannot understand prose, and is not meant to; it removes the one shape
 * that occurs often enough to be visibly wrong.
 *
 * `unlike` joined the list in #243, from *"unlike the boxy Studio Kaze satin bolero"*, the same shape as "instead of", and the same mistake: the
 * sentence is about a garment this one is not.
 */
const NEGATOR = /\b(?:no|not|without|instead of|rather than|unlike|never)\b[^.;:!?]{0,24}$/;

/**
 * Words that mean *the thing named next is something else you wear with this*
 * (#267).
 *
 * **Denim** is what forced this, and it is the only entry with the problem in
 * an acute form, because it is the one fabric name here that is also a colour
 * and a wardrobe category. Nobody writes "it goes with poplin". Everybody
 * writes "it sits with charcoal, ivory and denim", a sentence about which
 * *other* garments this one lives beside. Several pieces were filed under Denim
 * on the strength of such a sentence, including a pair of pumps ("dressed down
 * with denim") and a linen tank dress.
 *
 * `under`, `over` and `beneath` are the broad entries and they are here on
 * purpose: layering is *always* about another garment. They caught another
 * case in a different entry: a denim jacket filed under **Jersey** because its
 * note says "over a jersey vest". The cost is that "a mesh under a denim shell",
 * describing one piece's own construction, would be suppressed wrongly. No such
 * sentence exists in this catalogue; if one is ever written, this is the comment
 * that explains why it went missing.
 *
 * **`styled with` is deliberately absent.** It was in the first draft and the
 * catalogue sweep threw it straight out: a wrap dress is "styled with a
 * surplice neckline and **A-line** skirt", where the phrase means *features*,
 * not *wear it with*, and the guard was suppressing a true A-line. Every
 * phrase left below can only mean pairing. `style it with`, imperative, is a
 * different sentence and stays.
 *
 * Same shape as `NEGATOR`: a short lookbehind that stops at sentence
 * punctuation. It cannot read prose and is not trying to.
 */
const COMPANION =
  /\b(?:goes? with|sits? with|belongs? with|pairs? with|style it with|wear it with|worn with|dressed (?:up|down) with|under|over|beneath)\b[^.;:!?]{0,44}$/;

/**
 * A resemblance claim, which is the opposite of a composition claim (#267).
 *
 * "An indigo **denim look**" and "a classic, **denim-inspired** look" both say,
 * in as many words, that the cloth is not the thing named. One is a viscose
 * shirt dress, the other linen, and both were listed under Denim.
 */
const LOOKALIKE = /^[-\s]?(?:look|inspired|effect|style|wash)\b/;

/** Whether `token` occurs in `text` bounded by non-letters on both sides, and
 *  is not denied by the words around it. */
export function containsToken(text: string, token: string): boolean {
  const haystack = normalise(text);
  const needle = normalise(token);
  if (!needle) return false;

  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return false;
    const before = haystack[at - 1];
    const after = haystack[at + needle.length];
    const end = at + needle.length;
    if (
      !isLetter(before) &&
      !isLetter(after) &&
      !isDenied(haystack, at) &&
      !LOOKALIKE.test(haystack.slice(end, end + 12))
    ) {
      return true;
    }
    from = at + 1;
  }
}

/** Whether the match at `at` is denied by the words just before it: either a
 *  denial that this piece has the thing, or a mention of something worn with
 *  it. Both are sentences about a garment that is not this one. */
function isDenied(haystack: string, at: number): boolean {
  const before = haystack.slice(Math.max(0, at - 44), at);
  return NEGATOR.test(before) || COMPANION.test(before);
}

/**
 * Markdown links that point at **another piece**: `[label](/items/<id>)`.
 *
 * A cross-reference is a pointer, not a description (#243). Notes here link
 * pieces to each other freely, and the label necessarily names the *other*
 * garment: a cardigan whose note says it was bought the same day as the
 * "[Linden & Co metallic jacquard jacket]" was being filed under **Jacquard** on
 * the strength of a sentence about a different coat.
 *
 * Only `/items/` links are removed. A `/compendium/` link is the opposite case:
 * "the whole back is [lace](…)" is a claim about *this* piece, so those are
 * left in the text deliberately.
 */
const ITEM_LINK = /\[[^\]]*\]\(\/items\/[^)]*\)/g;

/**
 * Every other Markdown link, reduced to its label.
 *
 * A URL is never prose, and a Compendium URL contains the very word the entry
 * is looking for: `[what makes something one](/compendium/materials/bolero)`
 * filed a wrap top under **Bolero** through the link *target*, in a sentence
 * whose whole point was that the piece is not one. The label stays: that is
 * the part a reader sees, and "the whole back is [lace](…)" really does
 * describe the piece. But the address is dropped.
 */
const LINK_TO_LABEL = /\[([^\]]*)\]\([^)]*\)/g;

/** The text an entry is allowed to read, given its declared fields. */
function haystackFor(piece: Matchable, fields: MatchField[]): string {
  return fields
    .map((f) => (piece[f] ?? "").replace(ITEM_LINK, " ").replace(LINK_TO_LABEL, "$1"))
    .join(" \n ");
}

/**
 * Whether an entry describes a piece. An entry with no rule matches nothing.
 * That is a design position, not an oversight (VAL-COMP-10): better an entry
 * with no examples than an example list that is wrong.
 */
export function matchesPiece(rule: MatchRule | undefined, piece: Matchable): boolean {
  if (!rule) return false;
  const text = haystackFor(piece, rule.fields ?? DEFAULT_FIELDS);
  if (!text.trim()) return false;
  if (rule.exclude?.some((x) => containsToken(text, x))) return false;
  return rule.tokens.some((t) => containsToken(text, t));
}

/**
 * The pieces an entry describes. Callers pass the already-loaded active
 * catalogue and match every entry against it, rather than querying per entry
 * (SPEC-COMPENDIUM-DATA §6).
 */
export function piecesFor<T extends Matchable>(
  rule: MatchRule | undefined,
  pieces: readonly T[],
): T[] {
  if (!rule) return [];
  return pieces.filter((p) => matchesPiece(rule, p));
}
