import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCompendiumItems } from "@/lib/queries";
import { COMPENDIUM_ENTRIES, entryHref, findEntry } from "@/lib/compendium/entries";
import { ENTRY_GROUPS, groupHref } from "@/lib/compendium/groups";
import { piecesFor } from "@/lib/compendium/match";
import { PieceStrip } from "@/components/compendium/piece-strip";
import { Markdown } from "@/components/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const entry = findEntry((await params).slug);
  if (!entry) return { title: "Not found · Compendium · Sil" };
  return { title: `${entry.term} · Materials · Sil` };
}

/**
 * One glossary entry (SPEC-COMPENDIUM-INT §4.2, #213).
 *
 * Blocks are omitted when empty rather than rendered hollow, except the piece
 * list, which always says something (VAL-COMP-10). An entry that matches nothing
 * is not a broken entry; it is an entry whose subject this wardrobe does not
 * currently contain, and saying so is the point.
 */
export default async function EntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = findEntry(slug);
  if (!entry) notFound();

  const group = ENTRY_GROUPS.find((g) => g.group === entry.group);
  const all = await getCompendiumItems();
  const matched = piecesFor(entry.match, all);

  const seeAlso = (entry.seeAlso ?? [])
    .map((s) => COMPENDIUM_ENTRIES.find((e) => e.slug === s))
    .filter((e) => e !== undefined);

  return (
    <div className="max-w-prose">
      {/* Back to the group this entry belongs to, not to the overview (#265):
          the page you came from, and the page whose siblings you might want. */}
      <Link
        href={group ? groupHref(group.slug) : "/compendium/materials"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {group ? `All ${group.label.toLowerCase()}` : "All materials"}
      </Link>

      <h1 className="font-serif text-3xl font-normal tracking-tight">{entry.term}</h1>
      {entry.alsoKnownAs?.length ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Also: {entry.alsoKnownAs.join(" · ")}
        </p>
      ) : null}
      {entry.origin ? (
        <p className="mt-1 text-sm text-muted-foreground italic">{entry.origin}</p>
      ) : null}

      {/* The prose is Chinese; marking it as such is what lets a screen reader
          announce it correctly and the browser pick a matching font. */}
      {/* Markdown, so an entry can carry a paragraph break or a comparison
          without it collapsing into one run-on line. `lang` stays on the
          wrapper so a screen reader still announces the Chinese correctly. */}
      <div lang="zh" className="mt-6 leading-loose">
        <Markdown className="text-base leading-loose">{entry.explanation}</Markdown>
      </div>

      {entry.recognise ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            How to recognise it
          </h2>
          <Markdown className="mt-1">{entry.recognise}</Markdown>
        </section>
      ) : null}

      {entry.wearing ? (
        <section className="mt-5">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            What it means to wear
          </h2>
          <Markdown className="mt-1">{entry.wearing}</Markdown>
        </section>
      ) : null}

      {entry.uncertain ? (
        <div className="mt-5 border-l-2 py-1 pl-3 text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Not certain</p>
          <Markdown className="mt-0.5">{entry.uncertain}</Markdown>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="font-serif text-xl font-normal">
          In this wardrobe
          {matched.length > 0 ? (
            <span className="ml-2 text-sm text-muted-foreground">
              {matched.length} {matched.length === 1 ? "piece" : "pieces"}
            </span>
          ) : null}
        </h2>
        <PieceStrip
          pieces={matched}
          emptyNote={
            entry.match
              ? "Nothing in the catalogue matches this yet, which is worth knowing in itself."
              : "This one is explained rather than counted: it leaves no reliable trace in the text, so no piece list is claimed."
          }
        />
      </section>

      {seeAlso.length > 0 ? (
        <section className="mt-8 border-t pt-4">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            See also
          </h2>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {seeAlso.map((e) => (
              <Link key={e.slug} href={entryHref(e.slug)} className="underline underline-offset-2">
                {e.term}
              </Link>
            ))}
          </p>
        </section>
      ) : null}
    </div>
  );
}
