import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  sendPending12WeekMutations,
  type MutationQueueSyncResult,
  type SendPending12WeekMutationsOptions,
} from "../persistence/mutationQueueSender";

interface UseMutationQueueSyncOptions extends Omit<SendPending12WeekMutationsOptions, "ownerUid" | "authenticated"> {
  autoStart?: boolean;
  enabled?: boolean;
}

export function useMutationQueueSync(options: UseMutationQueueSyncOptions = {}) {
  const {
    autoStart = false,
    enabled = true,
    featureEnabled,
    realMode,
    apiConfigured,
    online,
    storage,
    now,
    batchSize,
    postMutations,
  } = options;
  const { user, userProfile, userProfileLoading } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<MutationQueueSyncResult | null>(null);
  const inFlightRef = useRef<Promise<MutationQueueSyncResult> | null>(null);

  const canUseAuthenticatedBackend = Boolean(user?.uid && userProfile && !userProfileLoading);
  const syncNow = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    setLoading(true);
    const request = sendPending12WeekMutations({
      featureEnabled,
      realMode,
      apiConfigured,
      online,
      storage,
      now,
      batchSize,
      postMutations,
      ownerUid: user?.uid ?? null,
      authenticated: enabled && canUseAuthenticatedBackend,
    });
    inFlightRef.current = request;

    try {
      const result = await request;
      setLastResult(result);
      return result;
    } finally {
      inFlightRef.current = null;
      setLoading(false);
    }
  }, [
    apiConfigured,
    batchSize,
    canUseAuthenticatedBackend,
    enabled,
    featureEnabled,
    now,
    online,
    postMutations,
    realMode,
    storage,
    user?.uid,
  ]);

  useEffect(() => {
    if (!autoStart) return;
    if (!enabled) return;
    if (!canUseAuthenticatedBackend) return;

    void syncNow();
  }, [autoStart, canUseAuthenticatedBackend, enabled, syncNow]);

  return useMemo(
    () => ({
      loading,
      lastResult,
      syncNow,
    }),
    [lastResult, loading, syncNow],
  );
}
