import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { isRealMode, shouldEnable12WeekMutationSync, shouldEnable12WeekPullSync } from "@/app/utils/app-mode";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { readMutationQueueStore, summarizeMutationQueueStore } from "../persistence/mutationQueue";
import { type TwelveWeekManualCloudSyncResult, useTwelveWeekManualCloudSync } from "./useTwelveWeekManualCloudSync";

export interface AutoCloudSyncState {
  loading: boolean;
  lastResult: TwelveWeekManualCloudSyncResult | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  online: boolean;
  conflictPending: boolean;
  triggerSyncNow: () => Promise<TwelveWeekManualCloudSyncResult | null>;
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

export function useAutoCloudSync(): AutoCloudSyncState {
  const realMode = isRealMode();
  const autoSyncEnabled =
    realMode && shouldEnable12WeekMutationSync() && shouldEnable12WeekPullSync() && isApiBaseUrlConfigured();
  const { user, userProfile, userProfileLoading } = useAuthContext();
  const networkStatusInfo = useNetworkStatus();
  const {
    loading: manualSyncLoading,
    lastResult: manualSyncLastResult,
    syncNow: runManualSyncNow,
  } = useTwelveWeekManualCloudSync({ enabled: autoSyncEnabled });
  const ownerUid = user?.uid ?? null;
  const userProfileReady = Boolean(userProfile && !userProfileLoading);
  const [lastResult, setLastResult] = useState<TwelveWeekManualCloudSyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => (autoSyncEnabled ? getQueuePendingCount(ownerUid) : 0));
  const inFlightRef = useRef<Promise<TwelveWeekManualCloudSyncResult | null> | null>(null);
  const previousUserUidRef = useRef<string | null>(null);
  const triggeredUserUidRef = useRef<string | null>(null);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(autoSyncEnabled ? getQueuePendingCount(ownerUid) : 0);
  }, [autoSyncEnabled, ownerUid]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const triggerSyncNow = useCallback(async () => {
    if (!autoSyncEnabled || !ownerUid || !userProfileReady) {
      refreshPendingCount();
      return null;
    }

    if (inFlightRef.current) return inFlightRef.current;

    console.log("[auto-sync] starting", { ownerUid });
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
  }, [autoSyncEnabled, ownerUid, refreshPendingCount, runManualSyncNow, userProfileReady]);

  useEffect(() => {
    const previousUserUid = previousUserUidRef.current;

    if (!autoSyncEnabled || !ownerUid) {
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
  }, [autoSyncEnabled, ownerUid, triggerSyncNow, userProfileReady]);

  const effectiveLastResult = manualSyncLastResult ?? lastResult;

  return useMemo(
    () => ({
      loading: manualSyncLoading || autoLoading,
      lastResult: effectiveLastResult,
      lastSyncedAt,
      pendingCount,
      online: networkStatusInfo.isOnline,
      conflictPending: isBlockingResult(effectiveLastResult),
      triggerSyncNow,
    }),
    [
      effectiveLastResult,
      autoLoading,
      lastSyncedAt,
      manualSyncLoading,
      networkStatusInfo.isOnline,
      pendingCount,
      triggerSyncNow,
    ],
  );
}
