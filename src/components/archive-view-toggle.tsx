"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

import { cn } from "@/lib/utils";

/** Grid / list switch for the archive (specs/archive §7). URL-reflected, so a
 *  chosen view survives refresh and can be shared. Written generically enough to
 *  be reused on browse later — that reuse is out of scope here. */
export function ArchiveViewToggle({ view }: { view: "grid" | "list" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = (next: "grid" | "list") => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "grid") params.delete("view");
    else params.set("view", next);
    const s = params.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const btn = (active: boolean) =>
    cn(
      "flex h-9 items-center gap-1.5 border px-3 text-sm transition-colors",
      active
        ? "border-primary font-medium text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => set("grid")}
        aria-pressed={view === "grid"}
        className={btn(view === "grid")}
      >
        <LayoutGrid className="size-4" />
        Grid
      </button>
      <button
        type="button"
        onClick={() => set("list")}
        aria-pressed={view === "list"}
        className={btn(view === "list")}
      >
        <List className="size-4" />
        List
      </button>
    </div>
  );
}
