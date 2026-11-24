import Link from "next/link";
import { MapPin } from "lucide-react";

import { getBerths } from "@/lib/queries";
import { BERTH_GRAMMAR, berthNote, describeBerth, parseBerth } from "@/lib/compendium/berth";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Berth notation · Compendium · Sil",
  description: "How a storage code such as R1-W7R2-S4-L is read and written.",
};

const EXAMPLE = "R1-W7R2-S4-L";

/**
 * Berth notation (SPEC-COMPENDIUM-FUNC §2.1, #213) is the first Compendium
 * section, and the one with the strongest claim to exist: the convention is the
 * owner's own invention and was written down nowhere.
 *
 * The page is descriptive, not prescriptive (VAL-COMP-12). The list of codes in
 * use is derived from the catalogue on every render, and a code that does not
 * fit the grammar is still listed: flagged, not hidden. If a real code fails to
 * parse, the grammar is what is wrong.
 */
export default async function BerthNotationPage() {
  const berths = await getBerths();
  // `getBerths` already orders by the notation (#227), so both this table and
  // the Berths index cannot disagree about the order of the same list.
  const rows = berths.map((b) => ({ ...b, parsed: parseBerth(b.location) }));

  const unparsed = rows.filter((r) => !r.parsed);
  const pieces = rows.reduce((n, r) => n + r.count, 0);

  return (
    <div className="max-w-prose">
      <h1 className="font-serif text-3xl font-normal tracking-tight">Berth notation</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        A <strong className="font-medium text-foreground">berth</strong> is where a piece
        physically lives. It is recorded as a short code, and the code narrows from the
        building inwards, which is also the order you walk it.
      </p>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-normal">Reading a code</h2>
        <p className="mt-3 font-mono text-lg tracking-tight">{EXAMPLE}</p>
        <p className="mt-1 text-sm text-muted-foreground">{describeBerth(EXAMPLE)}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-2 pr-4 font-medium">Segment</th>
                <th className="py-2 pr-4 font-medium">Pattern</th>
                <th className="py-2 font-medium">Means</th>
              </tr>
            </thead>
            <tbody>
              {BERTH_GRAMMAR.map((g) => (
                <tr key={g.segment} className="border-b align-top last:border-0">
                  <td className="py-2 pr-4 whitespace-nowrap">{g.segment}</td>
                  <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{g.pattern}</td>
                  <td className="py-2 text-muted-foreground">{g.means}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          <strong className="font-medium text-foreground">R means two different things.</strong>{" "}
          It is the <em>room</em> in the first segment and the <em>rack</em> in the second, so a
          code is read by position, never by letter. <code className="font-mono">W7R2</code> is
          wardrobe 7, rack 2, not a second room.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The position is optional. <code className="font-mono">R1-W2R4-H1</code> is a whole
          hanging rail; <code className="font-mono">R1-W7R2-S3-L</code> is the left of one shelf.
          Leave it off when the piece is not kept to one side.
        </p>
      </section>

      <section className="mt-10">
        {/* Two conventions the grammar table cannot express, because they are
            about how a particular shelf is used rather than about the notation
            (#254). Both were discovered by the owner correcting a filing. */}
        <h2 className="font-serif text-xl font-normal">Two things the grammar does not say</h2>
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">A position can mean a layer, not a side.</strong>{" "}
            On a shelf where trousers are stacked first and tops laid on top of them, the side
            letter records the <em>layer</em>: <code className="font-mono">R1-W7R2-S6</code> is in
            the trouser stack, <code className="font-mono">R1-W7R2-S6-L</code> is resting on top of
            it. A shelf appearing under both a plain and a sided code is therefore not
            half-recorded: it is two layers, and collapsing them would lose that.
          </p>
          <p>
            <strong className="text-foreground">A shelf can be organised by purpose.</strong> Most
            hold one kind of thing, so the derived summary describes them well. One might be a
            loungewear shelf, where mixing trousers with tops is the point rather than a filing
            error, which no count of categories can show. Where a berth means something the
            catalogue cannot infer, it carries a note below.
          </p>
        </div>

        <h2 className="mt-8 font-serif text-xl font-normal">Codes in use</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Derived from the catalogue: {rows.length} {rows.length === 1 ? "berth" : "berths"}{" "}
          holding {pieces} {pieces === 1 ? "piece" : "pieces"}. Pieces with no berth recorded
          are simply absent.
        </p>

        {rows.length === 0 ? (
          <p className="mt-4 border border-dashed py-10 text-center text-sm text-muted-foreground">
            No berths recorded yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y border-y">
            {rows.map((r) => (
              // Stretched link (#217), so the copy button is a sibling of the
              // link rather than nested inside it.
              <li key={r.location} className="group relative">
                <div className="flex items-baseline gap-3 py-2 transition-colors group-hover:bg-muted/50">
                  <MapPin className="size-4 shrink-0 translate-y-0.5 text-primary" />
                  <span className="font-mono text-sm">{r.location}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {r.parsed ? describeBerth(r.location) : "does not follow the notation"}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{r.count}</span>
                  <CopyButton
                    value={r.location}
                    label={`Copy berth code ${r.location}`}
                    className="relative z-10 self-center border bg-background hover:bg-muted"
                  />
                </div>
                {/* What the berth is for, where the owner has said (#254).
                    Sits under the derived line because it explains it: a shelf
                    reading "activewear, trousers" may really be a loungewear shelf. */}
                {berthNote(r.location) ? (
                  <p className="pb-2 pl-7 text-xs leading-relaxed text-muted-foreground">
                    {berthNote(r.location)}
                  </p>
                ) : null}
                <Link
                  href={`/berths?loc=${encodeURIComponent(r.location)}`}
                  aria-label={`${r.location}, ${r.count} ${r.count === 1 ? "piece" : "pieces"}`}
                  className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
              </li>
            ))}
          </ul>
        )}

        {unparsed.length > 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {unparsed.length} {unparsed.length === 1 ? "code does" : "codes do"} not fit the
            grammar above. They are listed anyway: the catalogue is what is true, so a code
            that does not parse means the grammar needs extending, not that the code is wrong.
          </p>
        ) : null}
      </section>
    </div>
  );
}
