"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

/**
 * What a failed page says (#308).
 *
 * There was no error boundary at all, so when production briefly could not
 * resolve its tables, every affected page showed Next.js's default: *"This page
 * couldn't load. A server error occurred."* To an owner away from her desk
 * that is indistinguishable from having lost her wardrobe.
 *
 * Three things this must do, and one it must not.
 *
 *   - **Keep the navigation.** A route-level boundary replaces the page, not
 *     the shell, so the rest of the app stays reachable. Half the fear in a
 *     failure is not knowing whether everything is gone.
 *   - **Say what is true and what is likely**, without pretending to know
 *     which. "Usually brief" is a hint, not a diagnosis.
 *   - **Offer `reset()` before a reload.** It re-renders the segment on the
 *     server, which is exactly what recovers from a transient fault, and it
 *     costs a fraction of a full document reload on a phone.
 *
 * What it must **not** do is make a real bug look like weather. The `digest` is
 * shown because it is the only handle the owner has when reading the server
 * logs, and the error still reaches those logs untouched: a boundary that quietly
 * absorbed a genuine crash is how a broken page survives unnoticed.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Server errors already reach the platform log; this catches the client
    // half, which otherwise leaves no trace anywhere.
    console.error("Page failed to render:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <AlertTriangle className="size-8 text-muted-foreground" />
      <h1 className="mt-4 font-serif text-2xl font-normal tracking-tight">
        This page didn’t load
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Something went wrong reaching your wardrobe. <strong>Nothing has been lost</strong>: this
        is a display problem, not a data one. It is usually brief, so trying again often works.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          <RotateCw className="size-4" />
          Try again
        </Button>
        <Link href="/browse" className={buttonVariants({ variant: "outline" })}>
          Go to Browse
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-muted-foreground">
          Reference {error.digest}
        </p>
      ) : null}
    </div>
  );
}
