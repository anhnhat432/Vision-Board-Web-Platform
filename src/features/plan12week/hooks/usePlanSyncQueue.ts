import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { isDemoMode } from "@/app/utils/app-mode";
import { isRateLimitError } from "@/lib/api/apiClient";
import {
  cleanupOldSyncs,
  enqueueSync,
  getSyncQueueSummary,
  listPendingSyncs,
  markSyncFailed,
  markSyncInFlight,
  markSyncSucceeded,
  readSyncQueueStore,
  type SyncQueueItem,
  type SyncQueueStore,
  type SyncType,
  shouldProcessNow,
  writeSyncQueueStore,
} from "../persistence/syncQueueStore";

export interface UsePlanSyncQueueOptions {
  goalId?: string | null;
  enabled?: boolean;
  /** Current time for testing */
  now?: Date;
  /** Called when a sync operation needs to be executed */
  executeSync?: (item: SyncQueueItem) => Promise<unknown>;
}

export interface SyncQueueStatus {
  loading: boolean;
  goalId: string | null;
  queueSummary: {
    totalCount: number;
    pendingCount: number;
    inFlightCount: number;
    failedOrRetryableCount: number;
    succeededCount: number;
  };
  lastError: { message: string; code: string } | null;
  retryInSeconds: number | null;
}

interface ProcessQueueResult {
  attemptedCount: number;
  succeededCount: number;
  failedCount: number;
}

const PROCESS_QUEUE_THROTTLE_MS = 1000;
const AUTO_RETRY_DEBOUNCE_MS = 3000;
const RETRY_BACKOFF_BASE_MS = 5_000;
const RETRY_BACKOFF_MAX_MS = 60_000;

function getBackoffDelayMs(attemptCount: number): number {
  return Math.min(RETRY_BACKOFF_BASE_MS * 2 ** Math.max(0, attemptCount), RETRY_BACKOFF_MAX_MS);
}

export function usePlanSyncQueue(options: UsePlanSyncQueueOptions = {}) {
  const { goalId: propGoalId, enabled = true, now: propNow, executeSync = async () => undefined } = options;

  const [syncQueueStore, setSyncQueueStore] = useState<SyncQueueStore | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<{ message: string; code: string } | null>(null);
  const [lastProcessResult, setLastProcessResult] = useState<ProcessQueueResult | null>(null);

  const goalId = propGoalId ?? null;

  const processingRef = useRef(false);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const batchHasFailuresRef = useRef(false);

  // Load queue for current goalId
  useEffect(() => {
    if (!goalId) {
      setSyncQueueStore(null);
      return;
    }

    const store = readSyncQueueStore(goalId);
    setSyncQueueStore(store);
  }, [goalId]);

  // Build status from store
  const queueStatus: SyncQueueStatus = useMemo(() => {
    if (!syncQueueStore) {
      return {
        loading: false,
        goalId: null,
        queueSummary: {
          totalCount: 0,
          pendingCount: 0,
          inFlightCount: 0,
          failedOrRetryableCount: 0,
          succeededCount: 0,
        },
        lastError: null,
        retryInSeconds: null,
      };
    }

    const summary = getSyncQueueSummary(syncQueueStore);

    // Calculate retryInSeconds from nextRetryAt of first retry_scheduled item
    let retryInSeconds: number | null = null;
    const nextRetryItem = syncQueueStore.items.find((item) => item.status === "retry_scheduled" && item.nextRetryAt);
    if (nextRetryItem?.nextRetryAt) {
      const nextRetryTime = new Date(nextRetryItem.nextRetryAt).getTime();
      const currentNow = propNow ?? new Date();
      const nowMs = currentNow.getTime();
      const seconds = Math.max(0, Math.floor((nextRetryTime - nowMs) / 1000));
      retryInSeconds = seconds;
    }

    return {
      loading,
      goalId: syncQueueStore.goalId,
      queueSummary: {
        totalCount: summary.totalCount,
        pendingCount: summary.pendingCount,
        inFlightCount: summary.inFlightCount,
        failedOrRetryableCount: summary.failedOrRetryableCount,
        succeededCount: summary.succeededCount,
      },
      lastError,
      retryInSeconds,
    };
  }, [syncQueueStore, loading, lastError, propNow]);

  // Process the queue
  const processQueue = useCallback(async (): Promise<ProcessQueueResult> => {
    if (processingRef.current) {
      return lastProcessResult ?? { attemptedCount: 0, succeededCount: 0, failedCount: 0 };
    }

    if (!goalId || !enabled || isDemoMode()) {
      return { attemptedCount: 0, succeededCount: 0, failedCount: 0 };
    }

    const nowMs = Date.now();
    if (nowMs - lastProcessTimeRef.current < PROCESS_QUEUE_THROTTLE_MS) {
      return lastProcessResult ?? { attemptedCount: 0, succeededCount: 0, failedCount: 0 };
    }

    const currentNow = propNow ?? new Date();

    processingRef.current = true;
    setLoading(true);
    setLastError(null);
    batchHasFailuresRef.current = false;
    lastProcessTimeRef.current = nowMs;

    let attemptedCount = 0;
    let succeededCount = 0;
    let failedCount = 0;

    try {
      let store: SyncQueueStore = {
        ...readSyncQueueStore(goalId),
        lastDrainStartedAt: new Date().toISOString(),
      };
      writeSyncQueueStore(store);
      setSyncQueueStore(store);

      const pending = listPendingSyncs(store);

      if (pending.length === 0) {
        return { attemptedCount: 0, succeededCount: 0, failedCount: 0 };
      }

      for (const item of pending) {
        if (!shouldProcessNow(item, currentNow)) continue;

        store = markSyncInFlight(store, item.id, { now: currentNow.toISOString() });
        writeSyncQueueStore(store);
        setSyncQueueStore(store);

        try {
          await executeSync(item);
          store = markSyncSucceeded(store, item.id, { now: currentNow.toISOString() });
          writeSyncQueueStore(store);
          setSyncQueueStore(store);

          succeededCount += 1;
          attemptedCount += 1;

          // Show success toast if we had failures earlier in the batch
          if (failedCount > 0 && succeededCount === 1) {
            toast.success("Đã đồng bộ dữ liệu 12-week", {
              description: `${succeededCount} thay đổi đã được đồng bộ.`,
              duration: 4500,
            });
          }
        } catch (error: unknown) {
          const err = error as { message?: string; status?: number; retryAfterMs?: number };
          const rateLimited = isRateLimitError(error);
          const retryable = !err.status || err.status >= 500 || err.status === 408 || rateLimited;

          const failure = {
            code: err.status?.toString() ?? "sync_error",
            message: err.message ?? "Không thể đồng bộ",
            retryable,
            lastSeenAt: currentNow.toISOString(),
          };

          const exponentialBackoffMs = getBackoffDelayMs(item.attemptCount);
          const retryAfterMs = rateLimited && typeof err.retryAfterMs === "number" ? err.retryAfterMs : 0;
          const nextRetryAt = retryable
            ? new Date(
                currentNow.getTime() +
                  (rateLimited ? Math.max(retryAfterMs, exponentialBackoffMs) : exponentialBackoffMs),
              )
            : undefined;
          store = markSyncFailed(store, item.id, failure, {
            now: currentNow.toISOString(),
            nextRetryAt: nextRetryAt?.toISOString(),
          });
          writeSyncQueueStore(store);
          setSyncQueueStore(store);

          attemptedCount += 1;

          if (!rateLimited) {
            failedCount += 1;
            batchHasFailuresRef.current = true;

            // Show error toast on first persistent failure in batch
            if (failedCount === 1) {
              setLastError({ code: failure.code, message: failure.message });
              toast.error("Đồng bộ chưa thành công, sẽ thử lại sau", {
                description: failure.message,
                duration: 4500,
              });
            }
          }

          if (rateLimited) {
            break;
          }
        }
      }

      // Cleanup old succeeded items on successful drain
      const cleanupResult = cleanupOldSyncs(store, new Date());
      store = {
        ...(cleanupResult.removedCount > 0 ? cleanupResult.store : store),
        lastDrainFinishedAt: new Date().toISOString(),
      };
      writeSyncQueueStore(store);
      setSyncQueueStore(store);
      if (cleanupResult.removedCount > 0) {
        console.debug(`[SyncQueue] Cleaned ${cleanupResult.removedCount} old sync item(s).`);
      }
    } finally {
      processingRef.current = false;
      setLoading(false);
      setLastProcessResult({ attemptedCount, succeededCount, failedCount });
    }

    return { attemptedCount, succeededCount, failedCount };
  }, [goalId, enabled, propNow, executeSync, lastProcessResult]);

  // Enqueue a sync action
  const enqueueSyncAction = useCallback(
    <T>(
      syncType: SyncType,
      payload: unknown,
      entityId?: string,
      entityType?: "task" | "checkin" | "review" | "plan",
      maxAttempts?: number,
    ): Promise<T | null> => {
      if (!goalId || !enabled || isDemoMode()) {
        return Promise.resolve(null);
      }

      const currentStore = readSyncQueueStore(goalId);
      const { store } = enqueueSync(currentStore, {
        goalId,
        syncType,
        payload,
        entityId,
        entityType,
        maxAttempts: maxAttempts ?? 5,
      });

      setSyncQueueStore(store);
      writeSyncQueueStore(store);

      // Schedule immediate processing
      if (scheduledRef.current) {
        clearTimeout(scheduledRef.current);
      }
      scheduledRef.current = setTimeout(() => {
        void processQueue();
      }, 100);

      return Promise.resolve(null as T);
    },
    [goalId, enabled, processQueue],
  );

  // Manual sync trigger
  const syncNow = useCallback(async (): Promise<ProcessQueueResult> => {
    return processQueue();
  }, [processQueue]);

  // Auto-process on reconnect
  const { isOnline } = useNetworkStatus({
    onReconnect: enabled
      ? () => {
          if (scheduledRef.current) {
            clearTimeout(scheduledRef.current);
          }
          scheduledRef.current = setTimeout(() => {
            if (enabled) {
              void processQueue();
            }
          }, AUTO_RETRY_DEBOUNCE_MS);
        }
      : undefined,
    reconnectDebounceMs: AUTO_RETRY_DEBOUNCE_MS,
  });

  // Auto-process on window focus
  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => {
      if (scheduledRef.current) {
        clearTimeout(scheduledRef.current);
      }
      scheduledRef.current = setTimeout(() => {
        if (enabled && isOnline) {
          void processQueue();
        }
      }, 500);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [enabled, isOnline, processQueue]);

  // Auto-process when items become available (polling)
  useEffect(() => {
    if (!enabled || !goalId || loading) return;

    const store = readSyncQueueStore(goalId);
    const hasPending = listPendingSyncs(store).length > 0;

    if (hasPending && isOnline) {
      // Small delay to batch up rapid changes
      if (scheduledRef.current) {
        clearTimeout(scheduledRef.current);
      }
      scheduledRef.current = setTimeout(() => {
        if (enabled) {
          void processQueue();
        }
      }, 500);
    }
  }, [goalId, enabled, loading, isOnline, processQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scheduledRef.current) {
        clearTimeout(scheduledRef.current);
      }
    };
  }, []);

  return {
    loading,
    queueStatus,
    enqueueSyncAction,
    processQueue: syncNow,
    lastProcessResult,
  };
}
