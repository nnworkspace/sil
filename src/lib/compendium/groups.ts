/**
 * The four groups the Materials glossary is divided into (#265).
 *
 * Kept in their own module, apart from the entries themselves, for one blunt
 * reason: the section tree is a client component, and importing the glossary to
 * learn four labels would ship every entry's Chinese prose to the browser. This
 * file is the small part both sides need.
 *
 * Each group is also a page (`/compendium/fibres` and friends). The `slug` is
 * written out rather than derived from the label, because a URL that is a
 * lower-cased label is a URL that changes when someone rewords a heading,
 * and slugs here are a contract (VAL-COMP-07).
 *
 * Note the asymmetry that is deliberate: a *group* lives at `/compendium/cuts`,
 * but an *entry* stays at `/compendium/materials/<slug>`. Item pages have
 * linked to entry URLs since #213, so those cannot move; the group pages are
 * new and free to sit where they read best.
 */

export type EntryGroup = "fibre" | "construction" | "finish" | "cut";

export type CompendiumGroup = {
  group: EntryGroup;
  /** URL segment under /compendium. */
  slug: string;
  label: string;
  blurb: string;
};

export const ENTRY_GROUPS: CompendiumGroup[] = [
  {
    group: "fibre",
    slug: "fibres",
    label: "Fibres",
    blurb: "What the thread itself is made of. This is what the composition label lists.",
  },
  {
    group: "construction",
    slug: "constructions",
    label: "Constructions",
    blurb:
      "How the thread was turned into cloth: woven or knitted, and in what pattern. The same fibre behaves quite differently depending on this.",
  },
  {
    group: "finish",
    slug: "finishes",
    label: "Finishes",
    blurb: "What was done to the cloth afterwards.",
  },
  {
    // Added in #243. The first three groups all answer "what is this made of";
    // this one answers "what shape is it", a different question, and a kind of
    // word the owner meets just as often on a product page.
    group: "cut",
    slug: "cuts",
    label: "Cuts",
    blurb:
      "The shape a garment is cut to, independent of what it is made of. A name here can cover a knit and a woven alike.",
  },
];

export const groupHref = (slug: string) => `/compendium/${slug}`;

export function findGroup(slug: string): CompendiumGroup | undefined {
  return ENTRY_GROUPS.find((g) => g.slug === slug);
}
