import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { BackendConnectionStatus } from "@/app/components/twelve-week/TwelveWeekSettingsShared";
import type { BackendPlanHydrationResult } from "@/app/hooks/useBackendPlanHydration";
import { useBackendSyncIssueState, type UseBackendSyncIssueStateInput } from "./useBackendSyncIssueState";

function makeOkStatus(overrides?: Partial<BackendConnectionStatus>): BackendConnectionStatus {
  return {
    authConfigured: true,
    authLoading: false,
    signedIn: true,
    profileReady: true,
    displayName: "User",
    email: "u@x.com",
    syncing: false,
    syncStatus: "success",
    lastSyncedAt: new Date().toISOString(),
    syncMessage: null,
    failedSyncCount: 0,
    ...overrides,
  };
}

function makeErrorStatus(overrides?: Partial<BackendConnectionStatus>): BackendConnectionStatus {
  return makeOkStatus({
    syncStatus: "error",
    syncMessage: "Network error",
    failedSyncCount: 1,
    ...overrides,
  });
}

const nullHydration: BackendPlanHydrationResult | null = null;

function makeInput(overrides?: Partial<UseBackendSyncIssueStateInput>): UseBackendSyncIssueStateInput {
  return {
    backendConnectionStatus: makeOkStatus(),
    lastBackendHydrationResult: nullHydration,
    failedOrRetryableCount: 0,
    error: null,
    ...overrides,
  };
}

describe("useBackendSyncIssueState", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns not visible when there is no issue", () => {
    const { result } = renderHook(() => useBackendSyncIssueState(makeInput()));

    expect(result.current.visible).toBe(false);
    expect(result.current.message).toBe("");
    expect(result.current.isTransient).toBe(false);
    expect(result.current.isConflict).toBe(false);
  });

  it("marks a non-conflict error as transient initially", () => {
    const { result } = renderHook(() =>
      useBackendSyncIssueState(
        makeInput({
          backendConnectionStatus: makeErrorStatus(),
          failedOrRetryableCount: 1,
        }),
      ),
    );

    expect(result.current.isTransient).toBe(true);
    expect(result.current.visible).toBe(false);
  });

  it("promotes to visible when retry count exceeds threshold", () => {
    const { result } = renderHook(() =>
      useBackendSyncIssueState(
        makeInput({
          backendConnectionStatus: makeErrorStatus(),
          failedOrRetryableCount: 5,
        }),
      ),
    );

    expect(result.current.visible).toBe(true);
    expect(result.current.isTransient).toBe(false);
    expect(result.current.message).toBeTruthy();
  });

  it("promotes to visible after time threshold", () => {
    const { result, rerender } = renderHook((props: UseBackendSyncIssueStateInput) => useBackendSyncIssueState(props), {
      initialProps: makeInput({
        backendConnectionStatus: makeErrorStatus(),
        failedOrRetryableCount: 1,
      }),
    });

    // Initially transient
    expect(result.current.isTransient).toBe(true);
    expect(result.current.visible).toBe(false);

    // Advance past 60s threshold + a tick
    act(() => {
      vi.advanceTimersByTime(65_000);
    });

    // Re-render with same props to trigger re-evaluation
    rerender(
      makeInput({
        backendConnectionStatus: makeErrorStatus(),
        failedOrRetryableCount: 1,
      }),
    );

    expect(result.current.visible).toBe(true);
    expect(result.current.isTransient).toBe(false);
  });

  it("shows 409 conflict immediately without transient phase", () => {
    const { result } = renderHook(() =>
      useBackendSyncIssueState(
        makeInput({
          backendConnectionStatus: makeErrorStatus({ syncMessage: "409 conflict detected" }),
          failedOrRetryableCount: 0,
          error: { status: 409, message: "Conflict" },
        }),
      ),
    );

    expect(result.current.visible).toBe(true);
    expect(result.current.isConflict).toBe(true);
    expect(result.current.isTransient).toBe(false);
  });

  it("detects conflict from hydration result with conflicts array", () => {
    const hydrationWithConflict = {
      status: "partial" as const,
      conflicts: [{ goalId: "g1", field: "tasks", localValue: "a", remoteValue: "b" }],
      message: "conflict",
    } as unknown as BackendPlanHydrationResult;

    const { result } = renderHook(() =>
      useBackendSyncIssueState(
        makeInput({
          backendConnectionStatus: makeErrorStatus(),
          lastBackendHydrationResult: hydrationWithConflict,
          failedOrRetryableCount: 0,
        }),
      ),
    );

    expect(result.current.isConflict).toBe(true);
    expect(result.current.visible).toBe(true);
  });

  it("clears issue state when status returns to success", () => {
    const { result, rerender } = renderHook((props: UseBackendSyncIssueStateInput) => useBackendSyncIssueState(props), {
      initialProps: makeInput({
        backendConnectionStatus: makeErrorStatus(),
        failedOrRetryableCount: 5,
      }),
    });

    expect(result.current.visible).toBe(true);

    // Now status returns to success
    rerender(makeInput());

    expect(result.current.visible).toBe(false);
    expect(result.current.message).toBe("");
    expect(result.current.firstFailedAt).toBeNull();
  });

  it("tracks retriesAttempted from failedOrRetryableCount", () => {
    const { result } = renderHook(() =>
      useBackendSyncIssueState(
        makeInput({
          backendConnectionStatus: makeErrorStatus(),
          failedOrRetryableCount: 7,
        }),
      ),
    );

    expect(result.current.retriesAttempted).toBe(7);
  });
});
