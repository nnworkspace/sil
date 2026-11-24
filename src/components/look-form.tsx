"use client";

import { useActionState } from "react";

import { createLook, updateLook, type ActionResult } from "@/app/looks/actions";
import type { Look } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-destructive">{errors.join(" ")}</p>;
}

/** Create (no `look`) or edit (with `look`) a Look. On success the action
 *  redirects to the Look page; on failure it returns field errors. */
export function LookForm({ look }: { look?: Look }) {
  const action = look ? updateLook.bind(null, look.id) : createLook;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" defaultValue={look?.name ?? ""} required maxLength={120} />
        <FieldError errors={errors.name} />
      </div>

      <div>
        <Label htmlFor="kind">Kind</Label>
        <select id="kind" name="kind" defaultValue={look?.kind ?? "look"} className={inputCls}>
          <option value="look">Look: a styled combination</option>
          <option value="set">Set: a matching co-ord</option>
        </select>
        <FieldError errors={errors.kind} />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={look?.notes ?? ""} rows={3} maxLength={2000} />
        <FieldError errors={errors.notes} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {look ? "Save changes" : "Create look"}
        </Button>
      </div>
    </form>
  );
}
