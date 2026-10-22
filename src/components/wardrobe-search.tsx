"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const PLACEHOLDER = "Search name, brand, material, colour, tags…";
const LABEL = "Search the wardrobe";

/**
 * The wardrobe search field (#240).
 *
 * It used to live inside the collapsed "Search & filter" panel, which meant the
 * most-used control on the page was two clicks away and invisible until you
 * went looking. It now sits in the page header, beside **Add a piece** — one
 * implementation, used by the category pages, `/browse` and the home page.
 *
 * **Two modes, because the home page has nothing to filter.**
 *
 * - `live` (category pages, `/browse`) — a list is already on screen, so typing
 *   narrows it, debounced, through the URL. State stays in the URL so a
 *   filtered view is still shareable and survives a refresh.
 * - `submit` (home) — the home page shows category tiles, not pieces. There is
 *   nothing to narrow, so the field is an *entry point*: Enter goes to
 *   `/browse?q=…`. It deliberately does not navigate on each keystroke, which
 *   would send you to Browse after one letter.
 *
 * On a phone it collapses to its icon and opens to a full-width bar when
 * touched — a header holding a title, a search bar and a button does not fit,
 * and the bar is the one that can be summoned on demand.
 */
export function WardrobeSearch({
  q = "",
  mode = "live",
  className,
}: {
  /** The query currently in the URL. */
  q?: string;
  mode?: "live" | "submit";
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(q);
  // Open when there is already a query, so a shared link does not hide the term
  // that produced the result.
  const [open, setOpen] = React.useState(Boolean(q));
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounce = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * The last value this field itself put into the URL. Anything arriving in `q`
   * that differs came from somewhere else — "Clear all" in the filter panel, or
   * the back button — and must be adopted. Comparing against the *prop* alone
   * would fight the debounce: a keystroke landing inside the 300 ms window
   * would be reset to the older committed value.
   */
  const lastCommitted = React.useRef(q);

  React.useEffect(() => {
    if (q !== lastCommitted.current) {
      lastCommitted.current = q;
      setQuery(q);
    }
  }, [q]);

  React.useEffect(() => () => clearTimeout(debounce.current), []);

  /**
   * Focus the bar after it opens — but only when the *owner* opened it, never
   * on mount, which would steal focus on every page load that carries a query.
   *
   * This has to be an effect rather than a `focus()` inside the click handler:
   * while collapsed the field is `display:none`, and focusing a hidden element
   * silently does nothing. A `requestAnimationFrame` was not enough either — it
   * can run before the browser has applied the new layout. By the time an
   * effect runs the DOM is committed and the field is really there.
   */
  const openedByUser = React.useRef(false);
  React.useEffect(() => {
    if (open && openedByUser.current) {
      openedByUser.current = false;
      inputRef.current?.focus();
    }
  }, [open]);

  const commitLive = (value: string) => {
    const trimmed = value.trim();
    lastCommitted.current = trimmed;
    const next = new URLSearchParams(searchParams.toString());
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const onChange = (value: string) => {
    setQuery(value);
    if (mode !== "live") return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => commitLive(value), 300);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "live") {
      // Enter should not wait out the debounce.
      clearTimeout(debounce.current);
      commitLive(query);
      return;
    }
    const trimmed = query.trim();
    router.push(trimmed ? `/browse?q=${encodeURIComponent(trimmed)}` : "/browse");
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={cn("flex items-center", open && "w-full sm:w-auto", className)}
    >
      {/* Phone affordance: the icon alone until it is asked for. `sm:hidden`
          takes it away from `sm` up, where the bar is always shown — but once
          open it is not rendered at all, rather than merely hidden. A button
          left in the tree with `display:none` is a button a screen reader can
          still be walked onto in some engines, and it would announce a control
          that does nothing. */}
      {open ? null : (
        <button
          type="button"
          aria-label={LABEL}
          aria-expanded={false}
          onClick={() => {
            openedByUser.current = true;
            setOpen(true);
          }}
          className="grid size-9 place-items-center border border-input text-muted-foreground transition-colors hover:text-foreground sm:hidden"
        >
          <Search className="size-4" />
        </button>
      )}

      <div className={cn("relative", open ? "w-full sm:w-72" : "hidden sm:block sm:w-72")}>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          // Collapse again on a phone once it is empty and left alone, so the
          // header goes back to title + button.
          onBlur={() => {
            if (!query.trim()) setOpen(false);
          }}
          placeholder={PLACEHOLDER}
          aria-label={LABEL}
          className="h-9 w-full border border-input bg-transparent pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
    </form>
  );
}
