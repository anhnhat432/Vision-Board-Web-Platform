import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type MutationQueueSyncResult,
  type SendPending12WeekMutationsOptions,
  sendPending12WeekMutations,
} from "../persistence/mutationQueueSender";

interface UseMutationQueueSyncOptions extends Omit<SendPending12WeekMutationsOptions, "ownerUid" | "authenticated"> {
  autoStart?: boolean;
  enabled?: boolean;
  /**
   * When true, the hook listens for browser `online` events and retries
   * the queue drain after a short debounce (3 s) once the browser comes
   * back online.  Requires real mode, authenticated, feature enabled, and
   * API configured — otherwise the reconnect listener is a no-op.
   *
   * Default: false.
   */
  retryOnReconnect?: boolean;
  /** Debounce delay (ms) after an `online` event before retrying.  Default 3000. */
  reconnectDebounceMs?: number;
}

export function useMutationQueueSync(options: UseMutationQueueSyncOptions = {}) {
  const {
    autoStart = false,
    enabled = true,
    retryOnReconnect = false,
    reconnectDebounceMs = 3000,
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

  // ── Online-reconnect retry ─────────────────────────────────────
  // When `retryOnReconnect` is true and all preconditions are met,
  // the hook calls `syncNow` 3 s after the browser fires `online`.
  const shouldRetryOnReconnect =
    retryOnReconnect &&
    enabled &&
    canUseAuthenticatedBackend &&
    (featureEnabled ?? true) &&
    (realMode ?? true) &&
    (apiConfigured ?? true);

  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;

  const handleReconnect = useCallback(() => {
    if (!shouldRetryOnReconnect) return;
    void syncNowRef.current();
  }, [shouldRetryOnReconnect]);

  useNetworkStatus({
    onReconnect: retryOnReconnect ? handleReconnect : undefined,
    reconnectDebounceMs,
  });

  return useMemo(
    () => ({
      loading,
      lastResult,
      syncNow,
    }),
    [lastResult, loading, syncNow],
  );
}
