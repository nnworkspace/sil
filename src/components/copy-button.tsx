"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Copy a short string to the clipboard (#217).
 *
 * Used on cards whose whole surface navigates — a piece's card, a berth card —
 * which is the whole reason this is a component rather than three onClick
 * handlers.
 *
 * **A click here must not reach the card.** Both call sites use a *stretched
 * link* (`absolute inset-0`) with this button raised above it on `z-10`, so the
 * link never receives the click and `preventDefault` is, today, belt to the
 * braces — a mutation test proved as much by removing it with every test still
 * green. It stays because the alternative layout (nesting this inside an `<a>`)
 * is the obvious thing to reach for and would break silently: the copy would
 * still succeed while the page navigated away, which reads as "the app randomly
 * opens things" rather than as a broken button. `stopPropagation` *is* load-
 * bearing and is pinned by a test.
 *
 * Feedback is a check for a moment rather than a toast: these are controls you
 * may use several times in a row, and a stack of toasts is worse than none.
 *
 * `navigator.clipboard` needs a secure context. That holds on localhost and on
 * the deployed domain, but the failure would otherwise be silent — the icon
 * would sit there having done nothing — so a failure says so.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** What is being copied, e.g. "Copy name". A card grid renders dozens of
   *  these, so a bare "Copy" would leave a screen reader with no way to tell
   *  them apart. */
  label: string;
  className?: string;
}) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  React.useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(e: React.MouseEvent) {
    // Order matters little, but both are required: preventDefault stops the
    // link navigating, stopPropagation stops any parent handler reacting.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      // The label follows the state, so the confirmation is not purely visual:
      // a screen reader hears "Copied" rather than being told nothing happened.
      aria-label={
        state === "copied" ? "Copied" : state === "failed" ? `${label} — couldn't copy` : label
      }
      title={state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded p-1 text-muted-foreground transition-colors",
        "hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {state === "copied" ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy
          className={cn("size-3.5", state === "failed" && "text-destructive")}
          aria-hidden
        />
      )}
    </button>
  );
}
