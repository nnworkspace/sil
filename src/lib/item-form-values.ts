/**
 * Map a stored item onto the add/edit form's (string-based) values. Shared by
 * the edit page and the "duplicate" pre-fill (`/items/new?from=…`). Photos and
 * wear history are intentionally not included — they are per-item.
 */

import type { Item } from "@/db/schema";
import type { ItemFormValues } from "@/components/item-form";

const centsToInput = (cents: number | null): string | undefined =>
  cents == null ? undefined : (cents / 100).toString();

export function itemToFormValues(item: Item): ItemFormValues {
  return {
    name: item.name,
    category: item.category,
    secondaryCategories: item.secondaryCategories,
    brand: item.brand ?? undefined,
    productCode: item.productCode ?? undefined,
    color: item.color ?? undefined,
    size: item.size ?? undefined,
    productUrl: item.productUrl ?? undefined,
    listPrice: centsToInput(item.listPriceCents),
    pricePaid: centsToInput(item.pricePaidCents),
    currency: item.currency ?? "EUR",
    purchasedAt: item.purchasedAt ?? undefined,
    purchaseChannel: item.purchaseChannel ?? undefined,
    returnBy: item.returnBy ?? undefined,
    returnPolicy: item.returnPolicy ?? undefined,
    storageLocation: item.storageLocation ?? undefined,
    notes: item.notes ?? undefined,
    description: item.description ?? undefined,
    material: item.material ?? undefined,
    care: item.care ?? undefined,
    favorite: item.favorite,
    showFullCover: item.showFullCover,
    priorWears: item.priorWears,
    tags: item.tags,
    details: item.details,
  };
}
