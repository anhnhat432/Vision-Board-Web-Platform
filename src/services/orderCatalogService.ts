import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";
import type { CatalogItem } from "@/features/order/catalog/types";

const ENDPOINT = "/api/order-catalog";

export async function fetchOrderCatalog(): Promise<CatalogItem[]> {
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data: CatalogItem[] };
    return json.data;
  } catch (err) {
    console.warn("[orderCatalog] fallback to DEFAULT_CATALOG:", err);
    return DEFAULT_CATALOG;
  }
}
