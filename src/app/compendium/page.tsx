import Link from "next/link";

import { COMPENDIUM_SECTIONS, compendiumHref } from "@/lib/compendium/sections";
import { Markdown } from "@/components/markdown";

/**
 * The Compendium's front page (SPEC-COMPENDIUM-INT §1). Not a redirect to the
 * first section: arriving without a section in mind is a legitimate way in, and
 * this is where the area says what it is for.
 */
export default function CompendiumPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-normal tracking-tight">Compendium</h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
        The knowledge this wardrobe runs on: what its pieces are made of, and how its own
        notation works. Everything here is anchored in the catalogue — an entry earns its
        place by explaining something you own.
      </p>

      <div className="mt-8 space-y-4">
        {COMPENDIUM_SECTIONS.map((s) => (
          <Link
            key={s.slug}
            href={compendiumHref(s.slug)}
            className="block border p-4 transition-colors hover:bg-muted/50"
          >
            <h2 className="flex items-baseline gap-2 font-serif text-xl font-normal">
              {s.label}
              {s.status === "planned" ? (
                <span className="text-xs text-muted-foreground">not written yet</span>
              ) : null}
            </h2>
            <Markdown className="mt-1 max-w-prose text-muted-foreground">{s.summary}</Markdown>
          </Link>
        ))}
      </div>
    </div>
  );
}
