import Link from "next/link";

import { getCompendiumItems } from "@/lib/queries";
import { entriesInGroup } from "@/lib/compendium/entries";
import { ENTRY_GROUPS, groupHref } from "@/lib/compendium/groups";
import { piecesFor } from "@/lib/compendium/match";
import { Markdown } from "@/components/markdown";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Materials · Compendium · Sil",
  description: "The fibres, constructions, finishes and cuts this wardrobe is made of.",
};

/**
 * The Materials overview (SPEC-COMPENDIUM-INT §4.2, split in #265).
 *
 * It used to list all forty-odd entries on one page, which was fine at a dozen
 * and had become a long scroll by the time Cuts arrived. It now names the four
 * groups and hands off to a page each; the entries themselves did **not** move,
 * because item pages have linked to `/compendium/materials/<slug>` since #213
 * and a slug is a contract (VAL-COMP-07).
 *
 * Two counts are shown per group and they mean different things: how many terms
 * are written, and how many pieces those terms describe between them. The
 * second is a set union, not a sum — a cotton poplin shirt is one piece under
 * Constructions however many entries within the group it matches (VAL-COMP-05).
 */
export default async function MaterialsPage() {
  const pieces = await getCompendiumItems();

  const groups = ENTRY_GROUPS.map((g) => {
    const entries = entriesInGroup(g.group);
    const described = new Set<string>();
    for (const e of entries) for (const p of piecesFor(e.match, pieces)) described.add(p.id);
    return { ...g, terms: entries.length, pieces: described.size };
  }).filter((g) => g.terms > 0);

  return (
    <div className="max-w-prose">
      <h1 className="font-serif text-3xl font-normal tracking-tight">Materials</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        What this wardrobe is made of, and what that means to wear. Each term is given as the
        trade uses it, explained in Chinese, and linked to the pieces it describes. There are
        four kinds of word here, and they answer different questions.
      </p>

      <div className="mt-8 space-y-4">
        {groups.map((g) => (
          <Link
            key={g.slug}
            href={groupHref(g.slug)}
            className="block border p-4 transition-colors hover:bg-muted/50"
          >
            <h2 className="flex items-baseline justify-between gap-3 font-serif text-xl font-normal">
              {g.label}
              <span className="text-xs tabular-nums text-muted-foreground">
                {g.terms} {g.terms === 1 ? "term" : "terms"} · {g.pieces}{" "}
                {g.pieces === 1 ? "piece" : "pieces"}
              </span>
            </h2>
            <Markdown className="mt-1 text-muted-foreground">{g.blurb}</Markdown>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Every count on these pages is worked out from the catalogue as the page loads, by reading
        the composition labels and the descriptions — nothing is written down twice. Across the
        groups the numbers overlap freely: a linen shirt is counted under Fibres and again under
        Constructions, because it is an answer to both questions.
      </p>
    </div>
  );
}
