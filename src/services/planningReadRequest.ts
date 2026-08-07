import { apiClient, isRateLimitError } from "@/lib/api/apiClient";

const MAX_RATE_LIMIT_RETRIES = 1;
const MAX_JITTER_MS = 250;
const DEFAULT_RETRY_AFTER_MS = 5_000;
const inFlightPlanningReads = new Map<string, Promise<unknown>>();

function normalizePlanningPath(path: string): string {
  const trimmedPath = path.trim();
  return trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
}

async function runPlanningRead<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await apiClient.get<T>(path);
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= MAX_RATE_LIMIT_RETRIES) throw error;

      const retryAfterMs =
        typeof error.retryAfterMs === "number" && Number.isFinite(error.retryAfterMs) && error.retryAfterMs > 0
          ? error.retryAfterMs
          : DEFAULT_RETRY_AFTER_MS;
      const jitterMs = Math.floor(Math.random() * (MAX_JITTER_MS + 1));
      await wait(retryAfterMs + jitterMs);
    }
  }
}

export function getPlanningResource<T>(path: string): Promise<T> {
  const normalizedPath = normalizePlanningPath(path);
  const key = `GET:${normalizedPath}`;
  const existing = inFlightPlanningReads.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const request = runPlanningRead<T>(normalizedPath).finally(() => {
    inFlightPlanningReads.delete(key);
  });
  inFlightPlanningReads.set(key, request);
  return request;
}
