import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";
import type { CatalogItem } from "@/features/order/catalog/types";
import { getApiBaseUrl } from "@/lib/api/apiClient";

const ENDPOINT = "/order-catalog";
const CACHE_KEY = "vb:order-catalog";
const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

interface CachedCatalog {
  data: CatalogItem[];
  cachedAt: number;
}

/** Read catalog from localStorage cache. Returns null if missing or expired. */
function readCache(): CatalogItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCatalog;
    if (!Array.isArray(parsed.data) || parsed.data.length === 0) return null;
    if (Date.now() - parsed.cachedAt > CACHE_MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Write catalog to localStorage cache. */
function writeCache(data: CatalogItem[]): void {
  try {
    const entry: CachedCatalog = { data, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — ignore silently.
  }
}

/**
 * Return the best instantly-available catalog: cached data first,
 * then the hardcoded DEFAULT_CATALOG as last resort.
 */
export function getInstantCatalog(): { items: CatalogItem[]; source: "cache" | "default" } {
  const cached = readCache();
  if (cached) return { items: cached, source: "cache" };
  return { items: DEFAULT_CATALOG, source: "default" };
}

/**
 * Fetch fresh catalog from the backend.
 * On success the result is written to localStorage cache.
 * On failure the promise rejects (caller decides fallback strategy).
 */
export async function fetchOrderCatalog(): Promise<CatalogItem[]> {
  const res = await fetch(`${getApiBaseUrl()}${ENDPOINT}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data: CatalogItem[] };
  const items = json.data;
  writeCache(items);
  return items;
}
