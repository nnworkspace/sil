"use client";

import { List, LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";

export type ItemView = "list" | "grid";

/** A small segmented list/grid switch, reused by the packing list and the AI
 *  proposal. */
export function ViewToggle({
  view,
  onChange,
}: {
  view: ItemView;
  onChange: (v: ItemView) => void;
}) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {(["list", "grid"] as const).map((v) => {
        const Icon = v === "list" ? List : LayoutGrid;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-label={`${v} view`}
            aria-pressed={view === v}
            className={cn(
              "flex size-6 items-center justify-center rounded transition-colors",
              view === v
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
