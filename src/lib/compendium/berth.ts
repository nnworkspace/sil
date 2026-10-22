/**
 * The berth notation — reading a storage code such as `R1-W7R2-S4-L`
 * (SPEC-COMPENDIUM-DATA §5, #213).
 *
 * The catalogue is authoritative: `items.storage_location` is free text and
 * nothing validates its shape, deliberately, so a berth can be described before
 * it is codified (VAL-ITEM-12). This module *reads* the convention; it never
 * enforces it. A code that does not parse is still a berth — the Compendium
 * lists it and says so (VAL-COMP-12).
 *
 * Confirmed by the owner on 2026-07-29:
 *
 *     R1-W7R2-S4-L  →  room 1 · wardrobe 7, rack 2 · shelf 4 · left
 *
 * Note that `R` means two different things depending on **where** it appears —
 * *room* in the first segment, *rack* in the second — so the grammar is read
 * positionally, never by letter.
 */

export type PlaceKind = "shelf" | "drawer" | "rail";

/**
 * Where on the shelf or rail. A side (`L`/`R`/`M`), a depth (`F`/`B`), or a
 * side and a depth together (`LB`, `LF`, …).
 *
 * It was first written as a closed list of the six values then in use. The
 * owner filed `R1-W2R3-D1-LF` — left-front — which that list rejected, and
 * `VAL-COMP-12` says what to do about it: the catalogue is authoritative, so the
 * grammar was what needed fixing. Composing side and depth is what the notation
 * evidently *is*, rather than the six examples of it that happened to exist.
 */
export type Side = "L" | "R" | "M";
export type Depth = "F" | "B";
export type Position = Side | Depth | `${Side}${Depth}`;

export type UnitKind = "wardrobe" | "cabinet";

/**
 * The piece of furniture a berth sits in (#251).
 *
 * One shape for both kinds, because the grammar has one shape: `(W|C)<n>` with
 * an optional `R<n>` after it. A cabinet may have several banks of drawers *or* just one, and a wardrobe may have a single rack, so the subdivision is optional on both rather than being a property of the kind.
 *
 * `rack` is the owner's word and stays, even though English would call a
 * column of drawers a *bank*: in this notation `R` means "the subdivision
 * inside the furniture", which is the same idea whichever furniture it is.
 * Giving it a different letter per kind would make the code harder to read to
 * satisfy a dictionary.
 */
export type Unit = { kind: UnitKind; index: number; rack?: number };

/**
 * A container sitting *inside* the place (#277).
 *
 * The owner filed `R1-W2R3-D1-L-BB` — a box, left side of drawer 1 — and it did
 * not parse. `VAL-COMP-12` again: the catalogue is authoritative and the grammar
 * is what needed fixing, exactly as with `LF` in #213.
 *
 * It is a **fifth segment rather than a new position**, and the distinction is
 * the whole point. `L`/`R`/`M` are sides and `F`/`B` depths — both answer *where
 * on the shelf*. A box answers *what is it in*, which is a different question,
 * and one that composes with the first: `D1-L-BB` is the bottom box, on the
 * left, of drawer 1.
 *
 * A table rather than a regex alternation so that a third container costs one
 * line here and nothing anywhere else.
 */
export const CONTAINER_LABELS: Record<string, string> = {
  BB: "bottom box",
  BT: "top box",
};

export type Berth = {
  room: number;
  unit: Unit;
  place: { kind: PlaceKind; index: number };
  /** Absent on the shorter form: `R1-W2R4-H1` carries no side, and plenty of pieces are filed that way. */
  position?: Position;
  /** A box inside the place (#277). Independent of `position` — a box may sit
   *  on a side (`D1-L-BB`) or fill the place (`D1-BB`). */
  container?: string;
};

const PLACE_KINDS: Record<string, PlaceKind> = {
  S: "shelf",
  D: "drawer",
  H: "rail",
};

export const PLACE_LABELS: Record<PlaceKind, string> = {
  shelf: "shelf",
  drawer: "drawer",
  rail: "hanging rail",
};

const SIDE_LABELS: Record<Side, string> = { L: "left", R: "right", M: "middle" };
const DEPTH_LABELS: Record<Depth, string> = { F: "front", B: "back" };

/** A position in words: `LF` → "left-front", `M` → "middle", `B` → "back". */
export function positionLabel(position: string): string {
  if (position.length === 2) {
    const [side, depth] = position;
    return `${SIDE_LABELS[side as Side]}-${DEPTH_LABELS[depth as Depth]}`;
  }
  return SIDE_LABELS[position as Side] ?? DEPTH_LABELS[position as Depth] ?? position;
}

// The two-letter alternative is listed first for readability. As with `LB`
// before it, the trailing `$` means order is not actually load-bearing here —
// the engine backtracks out of a premature single-letter match — but it would
// be the moment anything followed this group.
// Unit: a wardrobe or a cabinet, numbered, optionally subdivided (#251).
// Optional on both kinds because either can come without a subdivision (a single-rack cabinet or a single-rack wardrobe), and forcing
// `R1` onto those would mean inventing a number for furniture that has none.
// The container group is built from CONTAINER_LABELS rather than written out,
// so the vocabulary has exactly one home. It is anchored between hyphens and
// listed after the position group, both of which are independently optional —
// `D1-L-BB`, `D1-BB` and `D1-L` all parse.
const CONTAINERS = Object.keys(CONTAINER_LABELS).join("|");
const BERTH_RE = new RegExp(
  `^R(\\d+)-([WC])(\\d+)(?:R(\\d+))?-([SDH])(\\d+)(?:-([LRM][FB]|[LRM]|[FB]))?(?:-(${CONTAINERS}))?$`,
);

const UNIT_KINDS: Record<string, UnitKind> = { W: "wardrobe", C: "cabinet" };

/** Parse a berth code, or `null` if it does not follow the convention. */
export function parseBerth(code: string): Berth | null {
  const m = BERTH_RE.exec(code.trim().toUpperCase());
  if (!m) return null;
  const [, room, unitLetter, unitIndex, rack, kind, index, position, container] = m;
  return {
    room: Number(room),
    unit: {
      kind: UNIT_KINDS[unitLetter],
      index: Number(unitIndex),
      ...(rack ? { rack: Number(rack) } : {}),
    },
    place: { kind: PLACE_KINDS[kind], index: Number(index) },
    ...(position ? { position: position as Position } : {}),
    ...(container ? { container } : {}),
  };
}

/**
 * A code in words: `R1-W7R2-S4-L` → "room 1 · wardrobe 7, rack 2 · shelf 4 ·
 * left". Returns `null` for a code that does not parse, so a caller can show
 * the raw string rather than a half-sentence.
 */
export function describeBerth(code: string): string | null {
  const b = parseBerth(code);
  if (!b) return null;
  const parts = [
    `room ${b.room}`,
    b.unit.rack
      ? `${b.unit.kind} ${b.unit.index}, rack ${b.unit.rack}`
      : `${b.unit.kind} ${b.unit.index}`,
    `${PLACE_LABELS[b.place.kind]} ${b.place.index}`,
  ];
  if (b.position) parts.push(positionLabel(b.position));
  if (b.container) parts.push(CONTAINER_LABELS[b.container] ?? b.container);
  return parts.join(" · ");
}

/**
 * What a berth is *for* — a short line the owner writes, keyed by code (#254).
 *
 * The index derives everything from the codes on items, so it can say what is
 * on a shelf but never what the shelf is *for*. A shelf such as `R1-W7R2-S6` might read as "activewear, trousers" when it is really a loungewear shelf, and the mixing is the point rather than a filing error.
 *
 * Content as code (SPEC-COMPENDIUM-DATA §2), like the glossary entries: this is
 * prose that wants review and history, and there is no second author. A note
 * for a code no piece uses simply never renders — the index stays derived from
 * the catalogue, and this map cannot invent a berth.
 */
export const BERTH_NOTES: Record<string, string> = {
  "R1-W7R2-S6": "Example note: loungewear for home. Mixed on purpose, because the shelf is organised by what it is for, not by category.",
  "R1-W7R2-S6-L": "Example note: tops resting on the trouser stack, left side. Same shelf as R1-W7R2-S6, a layer above it.",
};

/** The note for a berth, or `null` — most berths have none, and a caller must
 *  render nothing at all rather than an empty line. */
export function berthNote(code: string): string | null {
  return BERTH_NOTES[code.trim().toUpperCase()] ?? null;
}

/** The grammar, as documentation renders it (SPEC-COMPENDIUM-DATA §5.2). */
export const BERTH_GRAMMAR = [
  {
    segment: "Room",
    pattern: "R<n>",
    means:
      "Which room the piece is in. R0 can stand for a hallway or entrance: the threshold rather than a room, and numbered zero so it sorts before everything you walk past it to reach.",
  },
  {
    segment: "Unit",
    pattern: "W<n> | C<n>, then an optional R<n>",
    means:
      "The piece of furniture, and which part of it. W is a wardrobe, C a cabinet — W7R2 is wardrobe 7, rack 2; C1 is cabinet 1, undivided. The rack is left off where the furniture has only one, so each berth has a single spelling.",
  },
  {
    segment: "Place",
    pattern: "S<n> | D<n> | H<n>",
    means: "Shelf, Drawer or Hanging rail, numbered.",
  },
  {
    segment: "Position",
    pattern: "L | R | M · F | B · or both",
    means:
      "Where on that shelf or rail. A side — L left, R right, M middle — or a depth — F front, B back — or the two together: LB is left-back, LF left-front. Optional.",
  },
  {
    segment: "Container",
    pattern: "BB | BT",
    means:
      "A box sitting inside that place, when a piece is boxed rather than laid on the shelf — BB the bottom box, BT the top. It answers a different question from Position (*what is it in*, not *where on the shelf*) so it is its own segment and composes with one: D1-L-BB is the bottom box on the left of drawer 1. Optional, and independent — a box may also fill the place, as D1-BB.",
  },
] as const;
