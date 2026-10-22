import { notFound } from "next/navigation";

import { getItemWithPhotos } from "@/lib/queries";
import { itemToFormValues } from "@/lib/item-form-values";
import { updateItem } from "@/app/items/actions";
import { ItemForm } from "@/components/item-form";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItemWithPhotos(id);
  if (!item) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-serif text-3xl font-normal tracking-tight">
        Edit item
      </h1>
      <ItemForm
        action={updateItem.bind(null, id)}
        values={itemToFormValues(item)}
        existingPhotos={item.photos}
        wears={item.wearEvents.map((w) => ({
          wornAt: w.wornAt,
          occasion: w.occasion,
          note: w.note,
        }))}
        submitLabel="Save changes"
      />
    </div>
  );
}
