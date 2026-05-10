import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { USER_DATA_UPDATED_EVENT_NAME } from "@/app/utils/storage-constants";
import { isRealMode, shouldEnable12WeekMutationSync, shouldEnable12WeekPullSync } from "@/app/utils/app-mode";
import { getUserData, saveUserData } from "@/app/utils/storage";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type DataMutationItem,
  readMutationQueueStore,
  summarizeMutationQueueStore,
  writeMutationQueueStore,
} from "../persistence/mutationQueue";
import { clearPullCursor } from "../persistence/pullCursorStore";
import { applyPulledWorkspaceToUserData } from "../persistence/pulledWorkspaceApply";
import {
  sendPending12WeekMutations,
  type MutationQueueSyncResult,
} from "../persistence/mutationQueueSender";
import { type TwelveWeekManualCloudSyncResult, useTwelveWeekManualCloudSync } from "./useTwelveWeekManualCloudSync";

const DEFAULT_INTERVAL_MS = 5 * 60_000;
const DEFAULT_MIN_SYNC_INTERVAL_MS = 30_000;
const DEFAULT_MUTATION_DEBOUNCE_MS = 2_000;
const RECONNECT_DEBOUNCE_MS = 3_000;
const VISIBILITY_SYNC_STALE_MS = 60_000;
const VISIBILITY_SYNC_DEBOUNCE_MS = 300;

export interface AutoCloudSyncState {
  loading: boolean;
  lastResult: TwelveWeekManualCloudSyncResult | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  online: boolean;
  conflictPending: boolean;
  triggerSyncNow: () => Promise<TwelveWeekManualCloudSyncResult | null>;
  triggerDrainOnly: () => Promise<MutationQueueSyncResult | null>;
  resolveConflictKeepLocal: () => Promise<void>;
  resolveConflictUseCloud: () => Promise<void>;
}

export interface UseAutoCloudSyncOptions {
  intervalMs?: number;
  minSyncIntervalMs?: number;
  mutationDebounceMs?: number;
}

function getQueuePendingCount(ownerUid: string | null): number {
  if (!ownerUid) return 0;
  return summarizeMutationQueueStore(readMutationQueueStore(ownerUid)).pendingCount;
}

function isBlockingResult(result: TwelveWeekManualCloudSyncResult | null): boolean {
  return result?.status === "conflict" || result?.status === "unsafe";
}

function shouldWarnForResult(result: TwelveWeekManualCloudSyncResult | null): boolean {
  if (!result) return false;
  return result.status === "drain_failed" || result.status === "error" || isBlockingResult(result);
}

function isDocumentVisible(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState !== "hidden";
}

function hasElapsedSince(timestamp: number | null, minimumMs: number): boolean {
  return timestamp === null || Date.now() - timestamp >= minimumMs;
}

function shouldWarnForDrainResult(result: MutationQueueSyncResult | null): boolean {
  return result?.status === "partial" || result?.status === "error";
}

function getConflictMutationIds(result: TwelveWeekManualCloudSyncResult | null): Set<string> {
  return new Set(
    (result?.mergeReport?.conflicts ?? [])
      .map((conflict) => conflict.mutationId)
      .filter((mutationId): mutationId is string => Boolean(mutationId)),
  );
}

function isConflictMutation(item: DataMutationItem, conflictMutationIds: ReadonlySet<string>): boolean {
  if (conflictMutationIds.has(item.id)) return true;
  return conflictMutationIds.size === 0 && item.status === "blocked_conflict";
}

function markConflictMutationsForLocalResolution(
  ownerUid: string,
  result: TwelveWeekManualCloudSyncResult | null,
): boolean {
  const store = readMutationQueueStore(ownerUid);
  const conflictMutationIds = getConflictMutationIds(result);
  let changed = false;
  const now = new Date().toISOString();

  const items = store.items.map((item) => {
    if (item.ownerUid !== ownerUid || !isConflictMutation(item, conflictMutationIds)) return item;
    changed = true;
    return {
      ...item,
      status: "pending" as const,
      error: undefined,
      nextRetryAt: undefined,
      updatedAt: now,
    };
  });

  if (!changed) return false;
  return writeMutationQueueStore(
    {
      ...store,
      updatedAt: now,
      items,
    },
  );
}

function archiveConflictMutations(ownerUid: string, result: TwelveWeekManualCloudSyncResult | null): boolean {
  const store = readMutationQueueStore(ownerUid);
  const conflictMutationIds = getConflictMutationIds(result);
  let changed = false;
  const now = new Date().toISOString();

  const items = store.items.map((item) => {
    if (item.ownerUid !== ownerUid || !isConflictMutation(item, conflictMutationIds)) return item;
    changed = true;
    return {
      ...item,
      status: "archived" as const,
      error: undefined,
      nextRetryAt: undefined,
      updatedAt: now,
    };
  });

  if (!changed) return false;
  return writeMutationQueueStore(
    {
      ...store,
      updatedAt: now,
      items,
    },
  );
}

export function useAutoCloudSync(options: UseAutoCloudSyncOptions = {}): AutoCloudSyncState {
  const {
    intervalMs = DEFAULT_INTERVAL_MS,
    minSyncIntervalMs = DEFAULT_MIN_SYNC_INTERVAL_MS,
    mutationDebounceMs = DEFAULT_MUTATION_DEBOUNCE_MS,
  } = options;
  const realMode = isRealMode();
  const mutationSyncEnabled = shouldEnable12WeekMutationSync();
  const pullSyncEnabled = shouldEnable12WeekPullSync();
  const apiConfigured = isApiBaseUrlConfigured();
  const fullSyncEnabled = realMode && mutationSyncEnabled && pullSyncEnabled && apiConfigured;
  const drainSyncEnabled = realMode && mutationSyncEnabled && apiConfigured;
  const { user, userProfile, userProfileLoading } = useAuthContext();
  const triggerSyncNowRef = useRef<(() => Promise<TwelveWeekManualCloudSyncResult | null>) | null>(null);
  const handleReconnect = useCallback(() => {
    void triggerSyncNowRef.current?.();
  }, []);
  const networkStatusInfo = useNetworkStatus({
    onReconnect: handleReconnect,
    reconnectDebounceMs: RECONNECT_DEBOUNCE_MS,
  });
  const {
    loading: manualSyncLoading,
    lastResult: manualSyncLastResult,
    syncNow: runManualSyncNow,
  } = useTwelveWeekManualCloudSync({ enabled: fullSyncEnabled });
  const ownerUid = user?.uid ?? null;
  const userProfileReady = Boolean(userProfile && !userProfileLoading);
  const [documentVisible, setDocumentVisible] = useState(isDocumentVisible);
  const [lastResult, setLastResult] = useState<TwelveWeekManualCloudSyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [drainLoading, setDrainLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => (drainSyncEnabled ? getQueuePendingCount(ownerUid) : 0));
  const inFlightRef = useRef<Promise<TwelveWeekManualCloudSyncResult | null> | null>(null);
  const drainInFlightRef = useRef<Promise<MutationQueueSyncResult | null> | null>(null);
  const previousUserUidRef = useRef<string | null>(null);
  const triggeredUserUidRef = useRef<string | null>(null);
  const lastSyncStartedAtRef = useRef<number | null>(null);
  const lastDrainStartedAtRef = useRef<number | null>(null);
  const mutationDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullSyncBaseReady = fullSyncEnabled && Boolean(ownerUid) && userProfileReady && networkStatusInfo.isOnline;
  const drainSyncBaseReady = drainSyncEnabled && Boolean(ownerUid) && userProfileReady && networkStatusInfo.isOnline;
  const drainSyncReady = drainSyncBaseReady && documentVisible;

  const refreshPendingCount = useCallback(() => {
    setPendingCount(drainSyncEnabled ? getQueuePendingCount(ownerUid) : 0);
  }, [drainSyncEnabled, ownerUid]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const triggerSyncNow = useCallback(async () => {
    if (!fullSyncBaseReady || !isDocumentVisible() || !ownerUid) {
      refreshPendingCount();
      return null;
    }

    if (inFlightRef.current) return inFlightRef.current;
    if (drainInFlightRef.current) return null;
    if (!hasElapsedSince(lastSyncStartedAtRef.current, minSyncIntervalMs)) return null;

    console.log("[auto-sync] starting", { ownerUid });
    lastSyncStartedAtRef.current = Date.now();
    setAutoLoading(true);

    const request = runManualSyncNow()
      .then((result) => {
        setLastResult(result);
        setLastSyncedAt(new Date().toISOString());
        refreshPendingCount();

        if (shouldWarnForResult(result)) {
          console.warn("[auto-sync] finished with attention needed", {
            status: result.status,
            message: result.message,
          });
        }

        return result;
      })
      .finally(() => {
        inFlightRef.current = null;
        setAutoLoading(false);
      });

    inFlightRef.current = request;
    return request;
  }, [fullSyncBaseReady, minSyncIntervalMs, ownerUid, refreshPendingCount, runManualSyncNow]);

  triggerSyncNowRef.current = triggerSyncNow;

  const triggerDrainOnly = useCallback(async () => {
    if (!drainSyncBaseReady || !isDocumentVisible() || !ownerUid) {
      refreshPendingCount();
      return null;
    }

    if (inFlightRef.current) return null;
    if (drainInFlightRef.current) return drainInFlightRef.current;

    const currentPendingCount = getQueuePendingCount(ownerUid);
    setPendingCount(currentPendingCount);
    if (currentPendingCount <= 0) return null;
    if (!hasElapsedSince(lastDrainStartedAtRef.current, minSyncIntervalMs)) return null;

    console.log("[auto-sync] drain-only starting", { ownerUid, pendingCount: currentPendingCount });
    lastDrainStartedAtRef.current = Date.now();
    setDrainLoading(true);

    const request = sendPending12WeekMutations({
      ownerUid,
      authenticated: true,
      featureEnabled: mutationSyncEnabled,
      realMode,
      apiConfigured,
      online: networkStatusInfo.isOnline,
    })
      .then((result) => {
        refreshPendingCount();
        console.log("[auto-sync] drain-only finished", {
          status: result.status,
          attemptedCount: result.attemptedCount,
          pendingCount: result.pendingCount,
        });

        if (shouldWarnForDrainResult(result)) {
          console.warn("[auto-sync] drain-only finished with attention needed", {
            status: result.status,
            failedCount: result.failedCount,
            pendingCount: result.pendingCount,
          });
        }

        return result;
      })
      .finally(() => {
        drainInFlightRef.current = null;
        setDrainLoading(false);
      });

    drainInFlightRef.current = request;
    return request;
  }, [
    apiConfigured,
    drainSyncBaseReady,
    minSyncIntervalMs,
    mutationSyncEnabled,
    networkStatusInfo.isOnline,
    ownerUid,
    realMode,
    refreshPendingCount,
  ]);

  const effectiveLastResult = manualSyncLastResult ?? lastResult;

  const resolveConflictKeepLocal = useCallback(async () => {
    if (!ownerUid) return;

    markConflictMutationsForLocalResolution(ownerUid, effectiveLastResult);
    refreshPendingCount();
    lastDrainStartedAtRef.current = null;
    await triggerDrainOnly();
  }, [effectiveLastResult, ownerUid, refreshPendingCount, triggerDrainOnly]);

  const resolveConflictUseCloud = useCallback(async () => {
    if (!ownerUid) return;
    const pullResponse = effectiveLastResult?.pullResponse;
    if (!pullResponse?.workspace) return;

    const localData = getUserData();
    const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, {});
    const didWrite = saveUserData(nextData);
    if (!didWrite) return;

    archiveConflictMutations(ownerUid, effectiveLastResult);
    clearPullCursor(ownerUid);
    refreshPendingCount();
    lastSyncStartedAtRef.current = null;
    await triggerSyncNow();
  }, [effectiveLastResult, ownerUid, refreshPendingCount, triggerSyncNow]);

  useEffect(() => {
    const previousUserUid = previousUserUidRef.current;

    if (!fullSyncEnabled || !ownerUid) {
      previousUserUidRef.current = ownerUid;
      triggeredUserUidRef.current = null;
      return;
    }

    if (!userProfileReady) {
      previousUserUidRef.current = ownerUid;
      return;
    }

    const isNewUserSession = previousUserUid !== ownerUid || triggeredUserUidRef.current !== ownerUid;
    previousUserUidRef.current = ownerUid;

    if (!isNewUserSession) return;

    triggeredUserUidRef.current = ownerUid;
    void triggerSyncNow();
  }, [fullSyncEnabled, ownerUid, triggerSyncNow, userProfileReady]);

  useEffect(() => {
    if (!fullSyncBaseReady || !documentVisible || !isDocumentVisible()) return;

    const intervalId = window.setInterval(() => {
      void triggerSyncNow();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [documentVisible, fullSyncBaseReady, intervalMs, triggerSyncNow]);

  useEffect(() => {
    if (!fullSyncEnabled || !ownerUid || !userProfileReady || !networkStatusInfo.isOnline) return;

    const clearVisibilityTimer = () => {
      if (visibilityDebounceTimerRef.current !== null) {
        window.clearTimeout(visibilityDebounceTimerRef.current);
        visibilityDebounceTimerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      const visible = isDocumentVisible();
      setDocumentVisible(visible);
      clearVisibilityTimer();

      if (!visible) return;
      if (!hasElapsedSince(lastSyncStartedAtRef.current, VISIBILITY_SYNC_STALE_MS)) return;

      visibilityDebounceTimerRef.current = window.setTimeout(() => {
        visibilityDebounceTimerRef.current = null;
        void triggerSyncNowRef.current?.();
      }, VISIBILITY_SYNC_DEBOUNCE_MS);
    };

    setDocumentVisible(isDocumentVisible());
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearVisibilityTimer();
    };
  }, [fullSyncEnabled, networkStatusInfo.isOnline, ownerUid, userProfileReady]);

  useEffect(() => {
    if (!drainSyncReady || !ownerUid) return;

    const clearMutationDebounceTimer = () => {
      if (mutationDebounceTimerRef.current !== null) {
        window.clearTimeout(mutationDebounceTimerRef.current);
        mutationDebounceTimerRef.current = null;
      }
    };

    const handleUserDataUpdated = () => {
      clearMutationDebounceTimer();
      mutationDebounceTimerRef.current = window.setTimeout(() => {
        mutationDebounceTimerRef.current = null;
        void triggerDrainOnly();
      }, mutationDebounceMs);
    };

    window.addEventListener(USER_DATA_UPDATED_EVENT_NAME, handleUserDataUpdated);

    return () => {
      window.removeEventListener(USER_DATA_UPDATED_EVENT_NAME, handleUserDataUpdated);
      clearMutationDebounceTimer();
    };
  }, [drainSyncReady, mutationDebounceMs, ownerUid, triggerDrainOnly]);

  return useMemo(
    () => ({
      loading: manualSyncLoading || autoLoading || drainLoading,
      lastResult: effectiveLastResult,
      lastSyncedAt,
      pendingCount,
      online: networkStatusInfo.isOnline,
      conflictPending: isBlockingResult(effectiveLastResult),
      triggerSyncNow,
      triggerDrainOnly,
      resolveConflictKeepLocal,
      resolveConflictUseCloud,
    }),
    [
      effectiveLastResult,
      autoLoading,
      drainLoading,
      lastSyncedAt,
      manualSyncLoading,
      networkStatusInfo.isOnline,
      pendingCount,
      resolveConflictKeepLocal,
      resolveConflictUseCloud,
      triggerDrainOnly,
      triggerSyncNow,
    ],
  );
}
