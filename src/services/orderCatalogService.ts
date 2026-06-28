import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";
import type { CatalogItem } from "@/features/order/catalog/types";
import { getApiBaseUrl } from "@/lib/api/apiClient";

const ENDPOINT = "/order-catalog";
const CACHE_KEY = "vb:order-catalog";
const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_THUMBNAIL_BY_ITEM_ID = new Map(
  DEFAULT_CATALOG.flatMap((item) => (item.thumbnail ? [[item.itemId, item.thumbnail] as const] : [])),
);

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
    return withDefaultThumbnails(parsed.data);
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

function withDefaultThumbnails(items: CatalogItem[]): CatalogItem[] {
  let changed = false;
  const hydrated = items.map((item) => {
    if (item.thumbnail?.trim()) return item;
    const thumbnail = DEFAULT_THUMBNAIL_BY_ITEM_ID.get(item.itemId);
    if (!thumbnail) return item;
    changed = true;
    return { ...item, thumbnail };
  });

  return changed ? hydrated : items;
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
  const items = withDefaultThumbnails(json.data);
  writeCache(items);
  return items;
}
