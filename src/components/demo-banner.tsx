import { FlaskConical } from "lucide-react";

/** Shown on every page while DEMO_MODE=1 (local demos only, src/lib/demo.ts),
 *  so nobody mistakes the invented catalogue or the open door for the real app. */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="border-b bg-muted px-4 py-1.5 text-center text-xs text-muted-foreground"
    >
      <FlaskConical className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
      Demo mode: sign-in is off and all data is invented.
    </div>
  );
}
