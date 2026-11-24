import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCompendiumItems } from "@/lib/queries";
import { entriesInGroup, entryHref } from "@/lib/compendium/entries";
import { findGroup } from "@/lib/compendium/groups";
import { piecesFor } from "@/lib/compendium/match";
import { Markdown } from "@/components/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }) {
  const group = findGroup((await params).group);
  if (!group) return { title: "Not found · Compendium · Sil" };
  return { title: `${group.label} · Materials · Sil`, description: group.blurb };
}

/**
 * One group of the Materials glossary (#265): Fibres, Constructions, Finishes
 * or Cuts, each with its own entries and their counts.
 *
 * This route is dynamic rather than four near-identical files, which means it
 * also stands in the way of every unrecognised path under `/compendium`. Hence
 * the `notFound()` on an unknown group. Without it, `/compendium/nonsense`
 * would render an empty but perfectly cheerful page.
 *
 * Static segments win over dynamic ones in the App Router, so `/compendium/
 * materials` and `/compendium/berth-notation` still reach their own files, and
 * every `/compendium/materials/<slug>` entry URL is untouched (VAL-COMP-07).
 */
export default async function GroupPage({ params }: { params: Promise<{ group: string }> }) {
  const group = findGroup((await params).group);
  if (!group) notFound();

  const entries = entriesInGroup(group.group);
  const pieces = await getCompendiumItems();
  const counts = new Map(entries.map((e) => [e.slug, piecesFor(e.match, pieces).length]));

  return (
    <div className="max-w-prose">
      <Link
        href="/compendium/materials"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Materials
      </Link>

      <h1 className="font-serif text-3xl font-normal tracking-tight">{group.label}</h1>
      <Markdown className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {group.blurb}
      </Markdown>

      <ul className="mt-6 divide-y border-y">
        {entries.map((e) => {
          const n = counts.get(e.slug) ?? 0;
          return (
            <li key={e.slug}>
              <Link
                href={entryHref(e.slug)}
                className="flex items-baseline gap-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{e.term}</span>
                {e.alsoKnownAs?.length ? (
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {e.alsoKnownAs.join(" · ")}
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {n === 0 ? "—" : n}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        The number beside each term is how many pieces in the catalogue it describes, worked out
        afresh every time this page loads. The counts do not add up to the size of the wardrobe
        and are not meant to: a 95% viscose, 5% elastane top belongs to two entries, and a cotton
        poplin shirt to three.
      </p>
    </div>
  );
}
