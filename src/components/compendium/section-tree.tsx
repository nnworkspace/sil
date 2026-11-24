"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { COMPENDIUM_SECTIONS, compendiumHref } from "@/lib/compendium/sections";
import { cn } from "@/lib/utils";

/**
 * The Compendium's section navigation (SPEC-COMPENDIUM-INT §2, VAL-COMP-08).
 *
 * Present on every page in the area and marking the current one. It nests one
 * level as of #265, which is when a section first had children: Materials is an
 * overview, and Fibres, Constructions, Finishes and Cuts are pages of their own.
 *
 * The children are always shown rather than expanded on arrival. There are four
 * of them, each one word long, and a disclosure would hide the very thing the
 * split was meant to make visible: you cannot pick a group you cannot see.
 *
 * On phones the whole tree collapses above the content as a disclosure rather
 * than eating the screen, so the content is never pushed out of reach by
 * navigation.
 */
export function SectionTree() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  /** The section whose *name* the phone disclosure should show when shut. An
   *  entry page (`/compendium/materials/linen`) is inside Materials without
   *  being it, so this is a prefix test and not equality. */
  const current =
    COMPENDIUM_SECTIONS.flatMap((s) => [s, ...(s.children ?? [])]).find(
      (s) => pathname === compendiumHref(s.slug),
    ) ??
    COMPENDIUM_SECTIONS.find((s) => pathname.startsWith(`${compendiumHref(s.slug)}/`));

  const link = (s: { slug: string; label: string; status?: "ready" | "planned" }) => {
    const active = pathname === compendiumHref(s.slug);
    return (
      <Link
        key={s.slug}
        href={compendiumHref(s.slug)}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(false)}
        className={cn(
          "block py-1 text-sm transition-colors",
          active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {s.label}
        {/* The space is not decoration: without it the accessible name reads
            "Materialssoon", and the badge is part of what a reader is told. */}
        {s.status === "planned" ? (
          <span className="ml-2 text-xs text-muted-foreground"> soon</span>
        ) : null}
      </Link>
    );
  };

  const links = COMPENDIUM_SECTIONS.map((s) => (
    <div key={s.slug}>
      {link(s)}
      {s.children?.length ? (
        <div className="ml-3 border-l pl-3">{s.children.map((c) => link(c))}</div>
      ) : null}
    </div>
  ));

  return (
    <nav aria-label="Compendium sections" className="md:sticky md:top-6 md:self-start">
      {/* Phone: a disclosure naming where you are, so the label is useful shut. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-b py-2 text-left text-sm md:hidden"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            !open && "-rotate-90",
          )}
        />
        <span className="font-medium">{current?.label ?? "Sections"}</span>
      </button>

      <div className={cn("py-2 md:block md:py-0", open ? "block" : "hidden")}>
        <h2 className="mb-1 hidden text-xs font-medium tracking-wide text-muted-foreground uppercase md:block">
          Sections
        </h2>
        {links}
      </div>
    </nav>
  );
}
