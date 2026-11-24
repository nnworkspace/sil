import { cn } from "@/lib/utils";

/**
 * The heading block every page shares: title, an optional badge beside it, an
 * optional line of metadata, and optional actions (#305).
 *
 * It exists because the same layout problem had been solved **four times, in
 * four different ways**: `looks/[id]`, `items/[id]` and the printable sheet
 * each grew their own patch on the day a long name was first filed, and the
 * trip page never got one. Then "Autumn Design Week Workshops and Studio Visits in Copenhagen" arrived and wrapped to seven lines
 * with its badge floating in the middle of them.
 *
 * Four decisions live here so that no page has to remember them:
 *
 *   1. **The row wraps.** Actions drop to their own line rather than squeezing
 *      the title into a column two words wide. `basis-72` is what makes the
 *      text column claim a sensible width before it yields.
 *   2. **`min-w-0` on the text column.** Without it a flex item refuses to
 *      shrink below its content, and a long title pushes the actions off the
 *      screen instead of wrapping.
 *   3. **`break-words`**, so a long unbroken string (a product code, a URL)
 *      cannot overflow the viewport.
 *   4. **The badge aligns to the first line, not the middle.** `items-baseline`
 *      rather than `items-center`: centring a small badge against a seven-line
 *      title leaves it stranded halfway down the sentence, which was the exact
 *      ugliness in the bug report.
 *
 * The title is `text-2xl` on phones and `text-3xl` from `sm` up. That is not
 * cosmetic tuning: sixty characters at 30px on a 360px screen genuinely *is*
 * seven lines, and no amount of flexbox changes it. The alternatives were a
 * smaller mobile size or truncation, and truncation would hide the one thing
 * you opened the page to read.
 */
export function PageHeader({
  title,
  badge,
  meta,
  actions,
  className,
}: {
  title: React.ReactNode;
  /** Sits beside the title, on its first line. */
  badge?: React.ReactNode;
  /** A line beneath: destination, dates, counts. */
  meta?: React.ReactNode;
  /** Buttons and links; they wrap to their own line before the title suffers. */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start gap-3", className)}>
      <div className="min-w-0 flex-1 basis-72">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="font-serif text-2xl font-normal tracking-tight break-words sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {meta ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>
      {actions ? (
        // **Not `shrink-0`.** It was, and the item page (which has six buttons)
        // then overflowed a phone by 228px: a `shrink-0` wrapper cannot fall
        // below its content width, so its own `flex-wrap` never gets the chance
        // to act. Letting it shrink is what lets the buttons stack.
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
