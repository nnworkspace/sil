"use client";

import * as React from "react";
import { ArrowDownUp, ChevronDown } from "lucide-react";

import { SORT_OPTIONS, sortLabel } from "@/lib/sort";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

export type FacetOption = { value: string; label: string };

/** One facet = a dropdown button (label + active-count badge) opening a
 *  multi-select checkbox list. Stays open while toggling (`closeOnClick`).
 *  Shared by the browse/category filter panel (#105) and the wardrobe picker (#113). */
export function FacetDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const count = options.filter((o) => selected.includes(o.value)).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm transition-colors",
          count > 0
            ? "border-primary text-foreground"
            : "border-input text-muted-foreground hover:border-foreground hover:text-foreground",
        )}
      >
        {label}
        {count > 0 ? (
          <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {count}
          </span>
        ) : null}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 min-w-40 overflow-auto">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            closeOnClick={false}
            onCheckedChange={() => onToggle(o.value)}
            className="capitalize"
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Sort control (#109): single-select. Shared by the filter panel and the
 *  wardrobe picker (#113). */
export function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center gap-1.5 border border-input px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowDownUp className="size-3.5" />
        <span className="hidden sm:inline">{sortLabel(value)}</span>
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {SORT_OPTIONS.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A single-select dropdown, for a choice with too many options to show at once
 * (#296).
 *
 * The same mechanics as `SortDropdown` (a radio group in a scrollable menu),
 * generalised, because the wardrobe picker needs two of them and neither is
 * about sorting.
 *
 * It exists instead of a row of chips because the dialog it lives in is capped
 * at `88vh`: **height is the scarce resource there**, and fourteen categories of
 * chips wrap to two rows on a desktop and four or five on a phone. A dropdown
 * is one row on both. The trade is one tap to see the options, which is worth
 * it at fourteen and would not be at four.
 */
export function ChoiceDropdown({
  label,
  value,
  options,
  onChange,
}: {
  /** Announced to a screen reader; the trigger itself shows the chosen option,
   *  which is the useful thing to read at a glance. */
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="inline-flex min-w-0 shrink items-center gap-1.5 border border-input px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="truncate">{current?.label ?? label}</span>
        <ChevronDown className="size-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
