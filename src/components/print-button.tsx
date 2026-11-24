"use client";

import { Printer } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Opens the browser's print dialogue (#259).
 *
 * The whole PDF feature rests on this: every browser's print dialogue offers
 * **Save as PDF** as a destination, so one button gives both the paper copy and
 * the file, with no PDF library and no server-side image fetching.
 *
 * A client component for one reason: `window.print()` needs the browser. It is
 * kept apart from the page so the page itself stays a server component and the
 * list is rendered on the server, which matters when the list is long.
 */
export function PrintButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className={cn("shrink-0", className)}
    >
      <Printer className="size-4" />
      Print / Save as PDF
    </Button>
  );
}
