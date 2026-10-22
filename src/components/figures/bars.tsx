import Link from "next/link";

/**
 * Chart primitives for Figures (SPEC-FIGURES-INT §3).
 *
 * CSS, not SVG and not a charting library: the marks needed are bars, and a
 * dependency would add weight plus a visual dialect the app does not otherwise
 * speak (ADR-0007). Every bar is a labelled row whose value is present as text,
 * so the figure reads without the graphic — and to a screen reader.
 */

/** A labelled horizontal bar, optionally linking somewhere. Used where labels
 *  are long (category names), since horizontal keeps them readable. */
export function BarRow({
  label,
  value,
  display,
  max,
  href,
  hint,
  indent,
}: {
  label: string;
  /** The magnitude driving the bar's width. */
  value: number;
  /** How that magnitude is written — "24", "€9,800". Kept separate from the
   *  number so formatting never has to be parsed back out of a string. */
  display: string;
  max: number;
  href?: string;
  hint?: string;
  indent?: boolean;
}) {
  const width = max > 0 ? Math.max(value > 0 ? 1 : 0, Math.round((value / max) * 100)) : 0;
  const inner = (
    <>
      <span className={`truncate ${indent ? "pl-4 text-muted-foreground" : ""}`}>{label}</span>
      <span className="relative h-2 flex-1 bg-muted">
        <span className="absolute inset-y-0 left-0 bg-primary/70" style={{ width: `${width}%` }} />
      </span>
      <span className="w-16 shrink-0 text-right tabular-nums">{display}</span>
    </>
  );

  const className =
    "flex items-center gap-3 py-1.5 text-sm transition-colors hover:text-primary";

  return href ? (
    <Link href={href} className={className} title={hint}>
      {inner}
    </Link>
  ) : (
    <div className={className} title={hint}>
      {inner}
    </div>
  );
}

/** A vertical column chart for a timeline: bars left-to-right, the way a
 *  reader scans years. Empty years render as an empty slot, not a gap, so the
 *  shape of the run is truthful. */
export function ColumnChart({
  rows,
}: {
  rows: { key: string; height: number; label: string; caption: string; title: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-end gap-1.5">
        {rows.map((r) => (
          <div key={r.key} className="flex w-10 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">{r.label}</span>
            <span
              className="w-full bg-primary/70"
              style={{ height: `${Math.max(r.height, r.height > 0 ? 2 : 0)}px` }}
              title={r.title}
            />
            <span className="text-[10px] tabular-nums text-muted-foreground">{r.caption}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The base a partial figure was computed over (VAL-FIG-03). Rendered next to
 *  the figure, never omitted — a number without its denominator is a claim the
 *  data may not support. */
export function Base({ base, excluded, noun }: { base: number; excluded: number; noun: string }) {
  if (excluded === 0) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Across the {base} {noun} with this recorded — {excluded} excluded for want of it.
    </p>
  );
}

/** A module with nothing to show says so, rather than drawing an empty axis
 *  (VAL-FIG-04). */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-sm text-muted-foreground">{children}</p>;
}

/**
 * A colour-family row: the swatch **is** the datum, so this is literal
 * encoding rather than an assigned palette. The name always sits beside it —
 * identity never rests on colour alone — and the swatch carries a hairline
 * ring so a near-white family stays visible against the page.
 */
export function SwatchRow({
  label,
  swatch,
  value,
  max,
  href,
}: {
  label: string;
  swatch?: string;
  value: number;
  max: number;
  href?: string;
}) {
  const width = max > 0 ? Math.max(value > 0 ? 1 : 0, Math.round((value / max) * 100)) : 0;
  const inner = (
    <>
      <span
        aria-hidden
        className="size-3.5 shrink-0 rounded-full ring-1 ring-foreground/20"
        style={{ background: swatch ?? "transparent" }}
      />
      <span className="w-24 shrink-0 truncate">{label}</span>
      <span className="relative h-2 flex-1 bg-muted">
        <span className="absolute inset-y-0 left-0 bg-primary/70" style={{ width: `${width}%` }} />
      </span>
      <span className="w-10 shrink-0 text-right tabular-nums">{value}</span>
    </>
  );
  const className = "flex items-center gap-3 py-1.5 text-sm transition-colors hover:text-primary";
  return href ? (
    <Link href={href} className={className} title={`${value} pieces`}>
      {inner}
    </Link>
  ) : (
    <div className={className} title={`${value} pieces`}>
      {inner}
    </div>
  );
}
