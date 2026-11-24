"use client";

import * as React from "react";
import { toast } from "sonner";

import { ImportPanel } from "@/components/import-panel";
import { ItemForm, type ItemFormValues } from "@/components/item-form";
import type { ActionResult } from "@/app/items/actions";

type CreateAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

/**
 * Add-item screen: the import panel plus the form. When an import succeeds, its
 * values seed the form, which is remounted (via `key`) so the extracted values
 * populate the fields; the owner reviews and saves.
 */
export function NewItemView({
  createAction,
  initialValues,
}: {
  createAction: CreateAction;
  initialValues?: ItemFormValues;
}) {
  const [values, setValues] = React.useState<ItemFormValues | undefined>(
    initialValues,
  );
  const [officialPhotoUrls, setOfficialPhotoUrls] = React.useState<string[]>();
  const [seed, setSeed] = React.useState(0);

  const onImported = React.useCallback(
    (v: ItemFormValues, urls?: string[]) => {
      setValues(v);
      setOfficialPhotoUrls(urls);
      setSeed((s) => s + 1);
      toast.success(
        urls?.length
          ? `Imported: ${urls.length} official photo${urls.length > 1 ? "s" : ""} found. Review below, then save.`
          : "Imported. Review the details below, then save.",
      );
    },
    [],
  );

  return (
    <>
      <ImportPanel onImported={onImported} />
      <ItemForm
        key={seed}
        action={createAction}
        values={values}
        officialPhotoUrls={officialPhotoUrls}
        submitLabel="Add item"
      />
    </>
  );
}
