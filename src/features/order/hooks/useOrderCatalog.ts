import { useEffect, useRef, useState } from "react";

import type { CatalogItem } from "@/features/order/catalog/types";
import { fetchOrderCatalog, getInstantCatalog } from "@/services/orderCatalogService";

export interface UseOrderCatalogResult {
  catalog: CatalogItem[];
  isLoading: boolean;
  isFromFallback: boolean;
}

/**
 * Stale-while-revalidate hook for the order catalog.
 *
 * 1. Immediately returns cached data (localStorage) or DEFAULT_CATALOG
 *    so the UI renders without waiting for the network.
 * 2. Kicks off a background fetch to get fresh data from the backend.
 * 3. When the fetch completes, the catalog is updated seamlessly and
 *    the result is persisted to localStorage for next time.
 */
export function useOrderCatalog(): UseOrderCatalogResult {
  const { items: instant, source } = getInstantCatalog();

  const [catalog, setCatalog] = useState<CatalogItem[]>(instant);
  const [isLoading, setLoading] = useState(false);
  const [isFromFallback, setFromFallback] = useState(source === "default");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Background revalidation — don't block UI
    fetchOrderCatalog()
      .then((items) => {
        setCatalog(items);
        setFromFallback(false);
      })
      .catch(() => {
        // Network/backend unavailable — keep showing instant data.
        // isFromFallback stays true if we started from DEFAULT_CATALOG.
      });
  }, []);

  return { catalog, isLoading, isFromFallback };
}
