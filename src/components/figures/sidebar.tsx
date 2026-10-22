import Link from "next/link";

/**
 * The Figures sidebar (SPEC-FIGURES-INT §2): section navigation *and* the
 * global filters, so no module carries a private filter that could contradict
 * it (VAL-FIG-06).
 *
 * Filters are links, not form state — a filtered view is linkable, survives a
 * refresh and the back button behaves. Section links are plain anchors, so
 * navigation works with JavaScript disabled.
 */

export type Section = { id: string; label: string };

export function FiguresSidebar({
  sections,
  scope,
  year,
  years,
}: {
  sections: Section[];
  scope: "active" | "all";
  year: number | null;
  years: number[];
}) {
  /** Build a URL that changes one filter and leaves the other alone. */
  const href = (next: { scope?: "active" | "all"; year?: number | null }) => {
    const s = next.scope ?? scope;
    const y = next.year === undefined ? year : next.year;
    const params = new URLSearchParams();
    if (s === "all") params.set("scope", "all");
    if (y != null) params.set("year", String(y));
    const q = params.toString();
    return q ? `/figures?${q}` : "/figures";
  };

  const filterLink = (label: string, active: boolean, to: string) => (
    <Link
      key={label}
      href={to}
      className={`block py-1 text-sm transition-colors ${
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active ? "● " : "○ "}
      {label}
    </Link>
  );

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <nav className="mb-6 flex gap-x-4 gap-y-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {sections.map((s) => (
          <Link
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-4 border-t pt-4">
        <div>
          <h2 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Scope
          </h2>
          {filterLink("Active wardrobe", scope === "active", href({ scope: "active" }))}
          {filterLink("Including archived", scope === "all", href({ scope: "all" }))}
        </div>

        {years.length > 0 ? (
          <div>
            <h2 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Bought in
            </h2>
            <div className="max-h-56 overflow-y-auto pr-1">
              {filterLink("All time", year == null, href({ year: null }))}
              {years.map((y) => filterLink(String(y), year === y, href({ year: y })))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
