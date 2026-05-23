import { useEffect, useState } from "react";

import type { CatalogItem } from "@/features/order/catalog/types";
import { fetchOrderCatalog } from "@/services/orderCatalogService";

export interface UseOrderCatalogResult {
  catalog: CatalogItem[];
  isLoading: boolean;
  isFromFallback: boolean;
}

export function useOrderCatalog(): UseOrderCatalogResult {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isFromFallback, setFromFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOrderCatalog()
      .then((items) => {
        if (!cancelled) setCatalog(items);
      })
      .catch(() => {
        if (!cancelled) setFromFallback(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, isLoading, isFromFallback };
}
