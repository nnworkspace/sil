"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Switching the packing plan between **by category** and **by day** (#270).
 *
 * The mode lives in the URL (`?plan=day`), not in component state, for the
 * reason every filter in this app does: it survives a refresh, a Server Action
 * round-trip and a shared link. Adding a piece to Tuesday re-renders the page,
 * and without this the view would snap back to categories every time.
 *
 * Rendered as tabs rather than a switch because both are destinations — neither
 * is the "off" state of the other.
 */
export function PlanModeTabs({ mode }: { mode: "category" | "day" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (next: "category" | "day") => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "day") params.set("plan", "day");
    else params.delete("plan");
    const s = params.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  return (
    <div role="tablist" aria-label="Plan by" className="flex items-center gap-1 text-xs">
      {(["category", "day"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => go(m)}
          className={cn(
            "border px-2 py-1 transition-colors",
            mode === m
              ? "border-foreground font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          By {m}
        </button>
      ))}
    </div>
  );
}
