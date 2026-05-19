import type { Metric } from "@/types/plan";

const TTL_MS = 30_000;

const cache = new Map<string, { metrics: Metric[]; cachedAt: number }>();

export function getCachedMetrics(weekId: string): Metric[] | null {
  const entry = cache.get(weekId);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(weekId);
    return null;
  }

  return entry.metrics;
}

export function setCachedMetrics(weekId: string, metrics: Metric[]): void {
  cache.set(weekId, { metrics, cachedAt: Date.now() });
}

export function invalidateMetricsCache(weekId?: string): void {
  if (weekId) {
    cache.delete(weekId);
    return;
  }

  cache.clear();
}
