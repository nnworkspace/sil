import { createItem } from "@/app/items/actions";
import { getItemWithPhotos } from "@/lib/queries";
import { itemToFormValues } from "@/lib/item-form-values";
import { NewItemView } from "@/components/new-item-view";
import type { ItemFormValues } from "@/components/item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  // "Duplicate" pre-fill: seed the form from an existing item (specs/catalog).
  let initialValues: ItemFormValues | undefined;
  let copiedFrom: string | undefined;
  if (from) {
    const source = await getItemWithPhotos(from);
    if (source) {
      initialValues = itemToFormValues(source);
      copiedFrom = source.name;
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-normal tracking-tight">
          {copiedFrom ? `Copy of ${copiedFrom}` : "Add a piece"}
        </h1>
        {copiedFrom ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Duplicated from an existing piece — change the colour and add photos,
            then save as a new item.
          </p>
        ) : null}
      </div>
      <NewItemView createAction={createItem} initialValues={initialValues} />
    </div>
  );
}
