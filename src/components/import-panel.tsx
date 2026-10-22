"use client";

import * as React from "react";
import { useActionState } from "react";
import { Sparkles } from "lucide-react";

import { extractFromScreenshot, extractFromHtml } from "@/app/items/import-actions";
import type { ItemFormValues } from "@/components/item-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, fileInputClass } from "@/lib/utils";
import { IMAGE_ACCEPT } from "@/lib/images";

/**
 * Import panel on the add-item page (specs/ai-import, §UI). Two tabs — from a
 * screenshot (1.5a) or from a saved product page (1.5b) — each running its
 * extraction Server Action and handing the result to the parent to prefill the
 * form (human-in-the-loop — nothing is saved here).
 */
export function ImportPanel({
  onImported,
}: {
  onImported: (values: ItemFormValues, officialPhotoUrls?: string[]) => void;
}) {
  return (
    <div className="mb-8 border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2 font-medium">
        <Sparkles className="size-4 text-primary" />
        Import to prefill
      </div>
      <Tabs defaultValue="page">
        <TabsList className="h-9 border bg-muted p-1">
          <TabsTrigger
            value="page"
            className="px-3 hover:bg-transparent data-active:bg-neutral-400 data-active:text-white data-active:hover:bg-neutral-400 data-active:hover:text-white"
          >
            From a saved page
          </TabsTrigger>
          <TabsTrigger
            value="screenshot"
            className="px-3 hover:bg-transparent data-active:bg-neutral-400 data-active:text-white data-active:hover:bg-neutral-400 data-active:hover:text-white"
          >
            From a screenshot
          </TabsTrigger>
        </TabsList>
        <TabsContent value="screenshot" className="pt-3">
          <ScreenshotImport onImported={onImported} />
        </TabsContent>
        <TabsContent value="page" className="pt-3">
          <HtmlImport onImported={onImported} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScreenshotImport({
  onImported,
}: {
  onImported: (values: ItemFormValues) => void;
}) {
  const [state, action, pending] = useActionState(extractFromScreenshot, null);

  React.useEffect(() => {
    if (state?.ok) onImported(state.values);
  }, [state, onImported]);

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label htmlFor="screenshot" className="font-medium">
          Upload a screenshot of the product page
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll read the details and prefill the form below for you to review.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          accept={IMAGE_ACCEPT}
          required
          className={cn(fileInputClass, "max-w-sm")}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Reading…" : "Extract"}
        </Button>
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}

function HtmlImport({
  onImported,
}: {
  onImported: (values: ItemFormValues, officialPhotoUrls?: string[]) => void;
}) {
  const [state, action, pending] = useActionState(extractFromHtml, null);

  React.useEffect(() => {
    if (state?.ok) onImported(state.values, state.officialPhotoUrls);
  }, [state, onImported]);

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label htmlFor="page" className="font-medium">
          Upload a saved product page (.html)
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">
          In your browser, open the product page,{" "}
          <span className="font-medium">expand any collapsed sections</span> (Details,
          Materials…), then choose{" "}
          <span className="font-medium">Save As → “Webpage, Complete”</span> and upload
          the file. We read its details <em>and</em> the official photos — no screenshot
          needed.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="page"
          name="page"
          type="file"
          accept="text/html,.html,.htm"
          required
          className={cn(fileInputClass, "max-w-sm")}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Reading…" : "Extract"}
        </Button>
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
