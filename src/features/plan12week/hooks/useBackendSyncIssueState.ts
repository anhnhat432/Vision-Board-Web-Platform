import { useEffect, useMemo, useRef, useState } from "react";

import type { BackendConnectionStatus } from "@/app/components/twelve-week/TwelveWeekSettingsShared";
import type { BackendPlanHydrationResult } from "@/app/hooks/useBackendPlanHydration";
import { hasBackendSyncIssue, getBackendSyncIssueMessage } from "../pages/12WeekSystem/helpers";

/** After this elapsed ms, a non-conflict sync error is promoted from transient → visible */
const TRANSIENT_THRESHOLD_MS = 60_000;
/** After this many consecutive failed items, promote immediately */
const TRANSIENT_RETRY_THRESHOLD = 3;

export interface BackendSyncIssueState {
  /** Whether the red banner should be visible */
  visible: boolean;
  /** Translated Vietnamese message */
  message: string;
  /** Number of consecutive queue retries attempted */
  retriesAttempted: number;
  /** ISO timestamp of when the first failure was detected */
  firstFailedAt: string | null;
  /** True when there's an issue but we're silently retrying (no banner) */
  isTransient: boolean;
  /** True when there's a 409 conflict (always show banner) */
  isConflict: boolean;
}

export interface UseBackendSyncIssueStateInput {
  backendConnectionStatus: BackendConnectionStatus;
  lastBackendHydrationResult: BackendPlanHydrationResult | null;
  /** Number of failed/retryable items in the mutation queue */
  failedOrRetryableCount: number;
  /** Latest sync error, if any */
  error: { message?: string; status?: number } | null;
}

function detectConflict(
  backendConnectionStatus: BackendConnectionStatus,
  lastBackendHydrationResult: BackendPlanHydrationResult | null,
  error: { message?: string; status?: number } | null,
): boolean {
  if (error?.status === 409) return true;
  if (backendConnectionStatus.syncMessage?.includes("409")) return true;
  if (backendConnectionStatus.syncMessage?.toLowerCase().includes("conflict")) return true;
  if (lastBackendHydrationResult?.conflicts && lastBackendHydrationResult.conflicts.length > 0) return true;
  return false;
}

export function useBackendSyncIssueState(input: UseBackendSyncIssueStateInput): BackendSyncIssueState {
  const { backendConnectionStatus, lastBackendHydrationResult, failedOrRetryableCount, error } = input;

  const [firstFailedAt, setFirstFailedAt] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [now, setNow] = useState(Date.now());

  const hasIssue = hasBackendSyncIssue(backendConnectionStatus, lastBackendHydrationResult);
  const isConflict = detectConflict(backendConnectionStatus, lastBackendHydrationResult, error);

  // Track firstFailedAt
  useEffect(() => {
    if (hasIssue && !firstFailedAt) {
      setFirstFailedAt(new Date().toISOString());
    } else if (!hasIssue && firstFailedAt) {
      setFirstFailedAt(null);
    }
  }, [hasIssue, firstFailedAt]);

  // Tick timer while there's an issue to re-evaluate visibility
  useEffect(() => {
    if (hasIssue && firstFailedAt && !isConflict) {
      intervalRef.current = setInterval(() => {
        setNow(Date.now());
      }, 5_000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasIssue, firstFailedAt, isConflict]);

  const state = useMemo((): BackendSyncIssueState => {
    if (!hasIssue) {
      return {
        visible: false,
        message: "",
        retriesAttempted: 0,
        firstFailedAt: null,
        isTransient: false,
        isConflict: false,
      };
    }

    const message = getBackendSyncIssueMessage(backendConnectionStatus, lastBackendHydrationResult);

    // 409 conflict — always show immediately
    if (isConflict) {
      return {
        visible: true,
        message,
        retriesAttempted: failedOrRetryableCount,
        firstFailedAt,
        isTransient: false,
        isConflict: true,
      };
    }

    // Check time threshold
    const elapsedMs = firstFailedAt ? now - new Date(firstFailedAt).getTime() : 0;
    const exceededTimeThreshold = elapsedMs > TRANSIENT_THRESHOLD_MS;

    // Check retry count threshold
    const exceededRetryThreshold = failedOrRetryableCount > TRANSIENT_RETRY_THRESHOLD;

    const visible = exceededTimeThreshold || exceededRetryThreshold;

    return {
      visible,
      message: visible ? message : "Đang thử đồng bộ lại tự động…",
      retriesAttempted: failedOrRetryableCount,
      firstFailedAt,
      isTransient: !visible,
      isConflict: false,
    };
  }, [hasIssue, isConflict, backendConnectionStatus, lastBackendHydrationResult, failedOrRetryableCount, firstFailedAt, now]);

  return state;
}