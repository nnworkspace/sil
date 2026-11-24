/**
 * The Compendium's section tree (SPEC-COMPENDIUM-INT §2, #213).
 *
 * One entry per section, and each section is its own route (VAL-COMP-07), not
 * an anchor on a long page. That is what lets an item link to *the entry for
 * lyocell*, and what keeps the back button meaningful inside the area.
 *
 * A section that is planned but not yet written stays in the tree (VAL-COMP-10):
 * "not written yet" is information, and hiding it would misrepresent the shape
 * of the thing.
 */

import { ENTRY_GROUPS } from "@/lib/compendium/groups";

export type CompendiumSection = {
  /** URL segment under /compendium: a contract once anything links to it. */
  slug: string;
  label: string;
  /** One line, shown on the area's front page. */
  summary: string;
  status: "ready" | "planned";
  /**
   * Sub-sections, each its own page (#265). Their URLs are siblings of the
   * parent's, not children of it (`/compendium/fibres`, not
   * `/compendium/materials/fibres`), because `/compendium/materials/<slug>` was
   * already taken by the entries themselves and is linked from item pages.
   * The nesting here is what a reader sees; it is not what the path says.
   */
  children?: { slug: string; label: string }[];
};

export const COMPENDIUM_SECTIONS: CompendiumSection[] = [
  {
    slug: "materials",
    label: "Materials",
    summary:
      "The fibres, weaves and finishes this wardrobe is actually made of: each term as the trade says it, explained in Chinese, and linked to the pieces that use it.",
    status: "ready",
    children: ENTRY_GROUPS.map((g) => ({ slug: g.slug, label: g.label })),
  },
  {
    slug: "berth-notation",
    label: "Berth notation",
    summary:
      "How a storage code such as R1-W7R2-S4-L is read and written, and every berth currently in use.",
    status: "ready",
  },
];

export const compendiumHref = (slug: string) => `/compendium/${slug}`;

export function findSection(slug: string): CompendiumSection | undefined {
  return COMPENDIUM_SECTIONS.find((s) => s.slug === slug);
}
