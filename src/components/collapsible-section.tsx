"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A bordered section with a fold/unfold header. Purely a view toggle — the state
 * is client-only and survives Server-Action revalidations (the component stays
 * mounted), so folding never touches any data. Resets to `defaultOpen` on a full
 * navigation. `action` (e.g. a Server-Action form) shows on the right when open.
 */
export function CollapsibleSection({
  title,
  meta,
  action,
  children,
  defaultOpen = true,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className="rounded-lg border p-4">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="font-medium">{title}</span>
          {meta ? (
            <span className="truncate text-xs font-normal text-muted-foreground">{meta}</span>
          ) : null}
        </button>
        {open ? action : null}
      </header>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}
