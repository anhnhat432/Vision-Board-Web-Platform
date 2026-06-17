import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { USER_DATA_UPDATED_EVENT_NAME } from "@/app/utils/storage-constants";
import { useAutoCloudSync } from "./useAutoCloudSync";
import type { TwelveWeekManualCloudSyncResult } from "./useTwelveWeekManualCloudSync";

const authContextMock = vi.hoisted(() => ({
  state: {
    user: null as { uid: string } | null,
    userProfile: null as { id: string } | null,
    userProfileLoading: false,
  },
  useAuthContext: vi.fn(),
}));

const appModeMock = vi.hoisted(() => ({
  isRealMode: vi.fn(() => true),
  shouldEnable12WeekMutationSync: vi.fn(() => true),
  shouldEnable12WeekPullSync: vi.fn(() => true),
}));

const apiClientMock = vi.hoisted(() => ({
  isApiBaseUrlConfigured: vi.fn(() => true),
}));

const manualSyncMock = vi.hoisted(() => ({
  syncNow: vi.fn(),
  useTwelveWeekManualCloudSync: vi.fn(),
}));

const mutationSenderMock = vi.hoisted(() => ({
  sendPending12WeekMutations: vi.fn(),
}));

const storageMock = vi.hoisted(() => ({
  getUserData: vi.fn(),
  saveUserData: vi.fn(),
}));

const pulledWorkspaceApplyMock = vi.hoisted(() => ({
  applyPulledWorkspaceToUserData: vi.fn(),
}));

const pullCursorStoreMock = vi.hoisted(() => ({
  clearPullCursor: vi.fn(),
}));

const networkStatusMock = vi.hoisted(() => ({
  state: {
    status: "online",
    isOnline: true,
    isOffline: false,
  },
  lastOptions: null as { onReconnect?: () => void; reconnectDebounceMs?: number } | null,
  useNetworkStatus: vi.fn((options?: { onReconnect?: () => void; reconnectDebounceMs?: number }) => {
    networkStatusMock.lastOptions = options ?? null;
    return networkStatusMock.state;
  }),
}));

const queueMock = vi.hoisted(() => ({
  pendingCount: 0,
  store: {
    version: 1,
    ownerUid: "firebase_uid_1",
    deviceId: "device_1",
    updatedAt: "2026-05-10T10:00:00.000Z",
    items: [] as Array<Record<string, unknown>>,
  },
  readMutationQueueStore: vi.fn(() => queueMock.store),
  writeMutationQueueStore: vi.fn((store: typeof queueMock.store) => {
    queueMock.store = store;
    return true;
  }),
  summarizeMutationQueueStore: vi.fn(() => ({
    totalCount: 0,
    pendingCount: queueMock.pendingCount,
    inFlightCount: 0,
    failedOrRetryableCount: 0,
    succeededCount: 0,
    lastDrainStartedAt: null,
    lastDrainFinishedAt: null,
  })),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/app/utils/app-mode", () => ({
  isRealMode: appModeMock.isRealMode,
  shouldEnable12WeekMutationSync: appModeMock.shouldEnable12WeekMutationSync,
  shouldEnable12WeekPullSync: appModeMock.shouldEnable12WeekPullSync,
}));

vi.mock("@/lib/api/apiClient", () => ({
  isApiBaseUrlConfigured: apiClientMock.isApiBaseUrlConfigured,
}));

vi.mock("@/app/utils/storage", () => ({
  getUserData: storageMock.getUserData,
  saveUserData: storageMock.saveUserData,
}));

vi.mock("@/app/hooks/useNetworkStatus", () => ({
  useNetworkStatus: networkStatusMock.useNetworkStatus,
}));

vi.mock("./useTwelveWeekManualCloudSync", () => ({
  useTwelveWeekManualCloudSync: manualSyncMock.useTwelveWeekManualCloudSync,
}));

vi.mock("../persistence/mutationQueueSender", () => ({
  sendPending12WeekMutations: mutationSenderMock.sendPending12WeekMutations,
}));

vi.mock("../persistence/pulledWorkspaceApply", () => ({
  applyPulledWorkspaceToUserData: pulledWorkspaceApplyMock.applyPulledWorkspaceToUserData,
}));

vi.mock("../persistence/pullCursorStore", () => ({
  clearPullCursor: pullCursorStoreMock.clearPullCursor,
}));

vi.mock("../persistence/mutationQueue", () => ({
  readMutationQueueStore: queueMock.readMutationQueueStore,
  summarizeMutationQueueStore: queueMock.summarizeMutationQueueStore,
  writeMutationQueueStore: queueMock.writeMutationQueueStore,
}));

const appliedResult: TwelveWeekManualCloudSyncResult = {
  status: "applied",
  message: "Synced safely.",
};

const conflictResult: TwelveWeekManualCloudSyncResult = {
  status: "conflict",
  message: "Needs review.",
};

const conflictResultWithMutation = {
  status: "conflict",
  message: "Needs review.",
  mergeReport: {
    safeToApply: false,
    localOnlyChanges: [],
    cloudOnlyChanges: [],
    conflicts: [
      {
        kind: "task",
        source: "local",
        clientId: "task_1",
        path: "goals.goal_1.tasks.task_1",
        message: "Cloud record changed after an unresolved local mutation for the same entity.",
        mutationId: "mutation_conflict_1",
        reason: "pending_local_mutation_cloud_newer",
        winner: "cloud",
        winnerSource: "timestamp",
        clockSkewMs: 1000,
      },
    ],
    missingClientIds: [],
    unsupportedFields: [],
    autoResolvable: false,
    summary: {
      localEntityCount: 1,
      cloudEntityCount: 1,
      localOnlyCount: 0,
      cloudOnlyCount: 0,
      conflictCount: 1,
      missingClientIdCount: 0,
      unsupportedFieldCount: 0,
    },
  },
  pullResponse: {
    serverTime: "2026-05-10T10:00:00.000Z",
    mode: "full",
    cursor: null,
    nextCursor: "cursor_cloud",
    hasMore: false,
    cursorStatus: "not_provided",
    warnings: [],
    workspace: {
      goals: [],
      plans: [],
      weeks: [],
      tasks: [],
      leadMetrics: [],
      dailyCheckIns: [],
      weeklyReviews: [],
    },
    changes: {
      goals: [],
      plans: [],
      weeks: [],
      tasks: [],
      leadMetrics: [],
      dailyCheckIns: [],
      weeklyReviews: [],
    },
    tombstones: {
      goals: [],
      plans: [],
      weeks: [],
      tasks: [],
      leadMetrics: [],
      dailyCheckIns: [],
      weeklyReviews: [],
    },
    counts: {
      goals: 0,
      plans: 0,
      weeks: 0,
      tasks: 0,
      leadMetrics: 0,
      dailyCheckIns: 0,
      weeklyReviews: 0,
    },
  },
} as TwelveWeekManualCloudSyncResult;

const drainSuccessResult = {
  status: "success",
  attemptedCount: 1,
  succeededCount: 1,
  duplicateCount: 0,
  failedCount: 0,
  pendingCount: 0,
};

let visibilityState = "visible";

function setSignedIn(uid = "firebase_uid_1") {
  authContextMock.state.user = { uid };
  authContextMock.state.userProfile = { id: `profile_${uid}` };
  authContextMock.state.userProfileLoading = false;
}

function setSignedOut() {
  authContextMock.state.user = null;
  authContextMock.state.userProfile = null;
  authContextMock.state.userProfileLoading = false;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useAutoCloudSync", () => {
  beforeEach(() => {
    setSignedOut();
    visibilityState = "visible";
    queueMock.pendingCount = 0;
    queueMock.store = {
      version: 1,
      ownerUid: "firebase_uid_1",
      deviceId: "device_1",
      updatedAt: "2026-05-10T10:00:00.000Z",
      items: [],
    };
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });

    authContextMock.useAuthContext.mockImplementation(() => ({
      ...authContextMock.state,
      authLoading: false,
      userProfileError: null,
      error: null,
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      isConfigured: true,
    }));
    appModeMock.isRealMode.mockReturnValue(true);
    appModeMock.shouldEnable12WeekMutationSync.mockReturnValue(true);
    appModeMock.shouldEnable12WeekPullSync.mockReturnValue(true);
    apiClientMock.isApiBaseUrlConfigured.mockReturnValue(true);
    networkStatusMock.state = {
      status: "online",
      isOnline: true,
      isOffline: false,
    };
    networkStatusMock.lastOptions = null;
    manualSyncMock.syncNow.mockResolvedValue(appliedResult);
    manualSyncMock.useTwelveWeekManualCloudSync.mockImplementation(() => ({
      loading: false,
      lastResult: null,
      syncNow: manualSyncMock.syncNow,
    }));
    mutationSenderMock.sendPending12WeekMutations.mockResolvedValue(drainSuccessResult);
    storageMock.getUserData.mockReturnValue({ goals: [] });
    storageMock.saveUserData.mockReturnValue(true);
    pulledWorkspaceApplyMock.applyPulledWorkspaceToUserData.mockReturnValue({ goals: [{ id: "cloud_goal" }] });
  });

  it("skips when not in real mode", () => {
    appModeMock.isRealMode.mockReturnValue(false);
    setSignedIn();

    const { result } = renderHook(() => useAutoCloudSync());

    expect(result.current.lastResult).toBeNull();
    expect(result.current.pendingCount).toBe(0);
    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("does not run background or drain triggers in demo mode", async () => {
    vi.useFakeTimers();
    appModeMock.isRealMode.mockReturnValue(false);
    queueMock.pendingCount = 2;
    setSignedIn("firebase_uid_demo");

    renderHook(() => useAutoCloudSync({ intervalMs: 1_000, mutationDebounceMs: 500 }));

    window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      networkStatusMock.lastOptions?.onReconnect?.();
    });

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
    expect(mutationSenderMock.sendPending12WeekMutations).not.toHaveBeenCalled();
  });

  it("skips when there is no signed-in user", () => {
    renderHook(() => useAutoCloudSync());

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("triggers once when the user uid transitions from null to a ready profile", async () => {
    const { rerender } = renderHook(() => useAutoCloudSync());

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();

    setSignedIn("firebase_uid_login");
    rerender();

    await waitFor(() => {
      expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    });
    expect(console.log).toHaveBeenCalledWith("[auto-sync] starting", { ownerUid: "firebase_uid_login" });
  });

  it("does not trigger again while the same user uid remains mounted", async () => {
    setSignedIn("firebase_uid_same");
    const { rerender } = renderHook(() => useAutoCloudSync());

    await waitFor(() => {
      expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    });

    rerender();
    rerender();

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent triggerSyncNow calls while a sync is in flight", async () => {
    setSignedIn("firebase_uid_inflight");
    const deferred = createDeferred<TwelveWeekManualCloudSyncResult>();
    manualSyncMock.syncNow.mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useAutoCloudSync());

    await waitFor(() => {
      expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    });

    const firstManualTrigger = result.current.triggerSyncNow();
    const secondManualTrigger = result.current.triggerSyncNow();

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(appliedResult);
      await Promise.all([firstManualTrigger, secondManualTrigger]);
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("rate-limits full sync triggers inside the minimum sync interval", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    setSignedIn("firebase_uid_rate");

    const { result } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 5_000 }));

    await flushMicrotasks();
    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    manualSyncMock.syncNow.mockClear();

    await act(async () => {
      await result.current.triggerSyncNow();
    });

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-05-10T10:00:30.000Z"));
    await act(async () => {
      await result.current.triggerSyncNow();
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("runs one periodic background sync while signed in, online, and visible", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    setSignedIn("firebase_uid_interval");

    renderHook(() => useAutoCloudSync({ intervalMs: 60_000, minSyncIntervalMs: 5_000 }));

    await flushMicrotasks();
    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    manualSyncMock.syncNow.mockClear();

    vi.setSystemTime(new Date("2026-05-10T10:01:00.000Z"));
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("does not run periodic background sync while the tab is hidden", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    visibilityState = "hidden";
    setSignedIn("firebase_uid_hidden");

    renderHook(() => useAutoCloudSync({ intervalMs: 60_000, minSyncIntervalMs: 5_000 }));

    await act(async () => {
      vi.advanceTimersByTime(180_000);
    });

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("triggers one sync when a hidden tab becomes visible after the visibility stale window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    visibilityState = "hidden";
    setSignedIn("firebase_uid_visible");

    renderHook(() => useAutoCloudSync({ intervalMs: 60_000, minSyncIntervalMs: 5_000 }));

    vi.setSystemTime(new Date("2026-05-10T10:02:00.000Z"));
    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(300);
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("triggers one sync from the debounced reconnect callback", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    networkStatusMock.state = {
      status: "offline",
      isOnline: false,
      isOffline: true,
    };
    setSignedIn("firebase_uid_reconnect");

    const { rerender } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 5_000 }));

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
    expect(networkStatusMock.lastOptions?.reconnectDebounceMs).toBe(3000);

    vi.setSystemTime(new Date("2026-05-10T10:00:33.000Z"));
    networkStatusMock.state = {
      status: "online",
      isOnline: true,
      isOffline: false,
    };
    rerender();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      networkStatusMock.lastOptions?.onReconnect?.();
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("drains pending mutations once after debounced user data updates without pulling cloud data", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    queueMock.pendingCount = 2;
    setSignedIn("firebase_uid_mutation");

    renderHook(() => useAutoCloudSync({ mutationDebounceMs: 2_000 }));

    await flushMicrotasks();
    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    manualSyncMock.syncNow.mockClear();

    window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));
    window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));

    await act(async () => {
      vi.advanceTimersByTime(1_999);
    });
    expect(mutationSenderMock.sendPending12WeekMutations).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(mutationSenderMock.sendPending12WeekMutations).toHaveBeenCalledTimes(1);
    expect(mutationSenderMock.sendPending12WeekMutations).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUid: "firebase_uid_mutation",
        authenticated: true,
        realMode: true,
        apiConfigured: true,
        online: true,
      }),
    );
    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("updates pendingCount after a sync result", async () => {
    queueMock.pendingCount = 3;
    setSignedIn("firebase_uid_pending");
    manualSyncMock.syncNow.mockImplementation(async () => {
      queueMock.pendingCount = 1;
      return appliedResult;
    });

    const { result } = renderHook(() => useAutoCloudSync());

    expect(result.current.pendingCount).toBe(3);
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });
  });

  it("sets a first-login restore summary when empty local data receives applied cloud goals", async () => {
    const restoredData = {
      goals: [
        {
          id: "goal_cloud_1",
          twelveWeekSystem: {
            dailyCheckIns: [{ date: "2026-05-10" }, { date: "2026-05-11" }],
            weeklyReviews: [{ weekNumber: 1 }],
          },
        },
        {
          id: "goal_cloud_2",
          twelveWeekSystem: {
            dailyCheckIns: [{ date: "2026-05-12" }],
            weeklyReviews: [],
          },
        },
      ],
    };
    storageMock.getUserData.mockReturnValue({ goals: [] });
    manualSyncMock.syncNow.mockImplementation(async () => {
      storageMock.getUserData.mockReturnValue(restoredData);
      return {
        ...appliedResult,
        appliedGoalCount: 2,
      };
    });
    setSignedIn("firebase_uid_restore");

    const { result } = renderHook(() => useAutoCloudSync());

    await waitFor(() => {
      expect(result.current.firstLoginRestoreSummary).toEqual({
        goalCount: 2,
        checkInCount: 3,
        weeklyReviewCount: 1,
      });
    });

    act(() => {
      result.current.clearFirstLoginRestoreSummary();
    });

    expect(result.current.firstLoginRestoreSummary).toBeNull();
  });

  it("does not set a first-login restore summary when local data already has goals", async () => {
    storageMock.getUserData.mockReturnValue({
      goals: [{ id: "local_goal_existing" }],
    });
    manualSyncMock.syncNow.mockResolvedValue({
      ...appliedResult,
      appliedGoalCount: 2,
    });
    setSignedIn("firebase_uid_existing_local");

    const { result } = renderHook(() => useAutoCloudSync());

    await waitFor(() => {
      expect(result.current.lastResult?.status).toBe("applied");
    });
    expect(result.current.firstLoginRestoreSummary).toBeNull();
  });

  it("surfaces cloud conflicts for explicit user resolution", async () => {
    setSignedIn("firebase_uid_conflict");
    manualSyncMock.syncNow.mockResolvedValue(conflictResult);

    const { result } = renderHook(() => useAutoCloudSync());

    await waitFor(() => {
      expect(result.current.lastResult?.status).toBe("conflict");
    });
    expect(result.current.conflictPending).toBe(true);
  });

  it("keeps conflict mutations blocked until the user chooses keep local", async () => {
    queueMock.pendingCount = 1;
    queueMock.store = {
      version: 1,
      ownerUid: "firebase_uid_auto_keep",
      deviceId: "device_1",
      updatedAt: "2026-05-10T10:00:00.000Z",
      items: [
        {
          id: "mutation_conflict_1",
          idempotencyKey: "key_1",
          collapseKey: "task:goal_1:task_1",
          kind: "task_completed_changed",
          status: "blocked_conflict",
          createdAt: "2026-05-10T09:59:00.000Z",
          updatedAt: "2026-05-10T10:00:00.000Z",
          attemptCount: 1,
          maxAttempts: 7,
          ownerUid: "firebase_uid_auto_keep",
          goalId: "goal_1",
          error: {
            code: "sync_conflict",
            message: "Conflict",
            lastSeenAt: "2026-05-10T10:00:00.000Z",
            retryable: false,
          },
          payload: {
            taskId: "task_1",
            weekNumber: 1,
            completed: true,
            scheduledDate: "2026-05-10",
          },
        },
      ],
    };
    setSignedIn("firebase_uid_auto_keep");
    manualSyncMock.syncNow.mockResolvedValue(conflictResultWithMutation);

    const { result } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 5_000 }));

    await waitFor(() => {
      expect(result.current.lastResult?.status).toBe("conflict");
    });

    expect(result.current.conflictPending).toBe(true);
    expect(queueMock.writeMutationQueueStore).not.toHaveBeenCalled();
    expect(queueMock.store.items[0]?.status).toBe("blocked_conflict");
    expect(mutationSenderMock.sendPending12WeekMutations).not.toHaveBeenCalled();
  });

  it("resolves keep-local conflicts by re-queueing conflict mutations and draining them", async () => {
    queueMock.pendingCount = 1;
    queueMock.store = {
      version: 1,
      ownerUid: "firebase_uid_keep",
      deviceId: "device_1",
      updatedAt: "2026-05-10T10:00:00.000Z",
      items: [
        {
          id: "mutation_conflict_1",
          idempotencyKey: "key_1",
          collapseKey: "task:goal_1:task_1",
          kind: "task_completed_changed",
          status: "blocked_conflict",
          createdAt: "2026-05-10T09:59:00.000Z",
          updatedAt: "2026-05-10T10:00:00.000Z",
          attemptCount: 1,
          maxAttempts: 7,
          ownerUid: "firebase_uid_keep",
          goalId: "goal_1",
          error: {
            code: "sync_conflict",
            message: "Conflict",
            lastSeenAt: "2026-05-10T10:00:00.000Z",
            retryable: false,
          },
          payload: {
            taskId: "task_1",
            weekNumber: 1,
            completed: true,
            scheduledDate: "2026-05-10",
          },
        },
      ],
    };
    setSignedIn("firebase_uid_keep");
    manualSyncMock.useTwelveWeekManualCloudSync.mockImplementation(() => ({
      loading: false,
      lastResult: conflictResultWithMutation,
      syncNow: manualSyncMock.syncNow,
    }));

    const { result } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 5_000 }));
    await flushMicrotasks();
    manualSyncMock.syncNow.mockClear();

    await act(async () => {
      await result.current.resolveConflictKeepLocal();
    });

    expect(queueMock.writeMutationQueueStore).toHaveBeenCalled();
    expect(queueMock.store.items[0]?.status).toBe("pending");
    expect(queueMock.store.items[0]?.error).toBeUndefined();
    expect(mutationSenderMock.sendPending12WeekMutations).toHaveBeenCalledTimes(1);
    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("resolves use-cloud conflicts by applying the pulled workspace, saving, clearing cursor, and syncing", async () => {
    const localData = { goals: [{ id: "local_goal" }] };
    const cloudData = { goals: [{ id: "cloud_goal" }] };
    storageMock.getUserData.mockReturnValue(localData);
    pulledWorkspaceApplyMock.applyPulledWorkspaceToUserData.mockReturnValue(cloudData);
    setSignedIn("firebase_uid_cloud");
    manualSyncMock.useTwelveWeekManualCloudSync.mockImplementation(() => ({
      loading: false,
      lastResult: conflictResultWithMutation,
      syncNow: manualSyncMock.syncNow,
    }));

    const { result } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 5_000 }));
    await flushMicrotasks();
    manualSyncMock.syncNow.mockClear();

    await act(async () => {
      await result.current.resolveConflictUseCloud();
    });

    expect(pulledWorkspaceApplyMock.applyPulledWorkspaceToUserData).toHaveBeenCalledWith(
      localData,
      conflictResultWithMutation.pullResponse,
      expect.any(Object),
    );
    expect(storageMock.saveUserData).toHaveBeenCalledWith(cloudData);
    expect(pullCursorStoreMock.clearPullCursor).toHaveBeenCalledWith("firebase_uid_cloud");
    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("does not archive conflict mutations when applying the account version cannot be saved", async () => {
    queueMock.store = {
      version: 1,
      ownerUid: "firebase_uid_cloud",
      deviceId: "device_1",
      updatedAt: "2026-05-10T10:00:00.000Z",
      items: [
        {
          id: "mutation_conflict_1",
          idempotencyKey: "key_1",
          collapseKey: "task:goal_1:task_1",
          kind: "task_completed_changed",
          status: "blocked_conflict",
          createdAt: "2026-05-10T09:59:00.000Z",
          updatedAt: "2026-05-10T10:00:00.000Z",
          attemptCount: 1,
          maxAttempts: 7,
          ownerUid: "firebase_uid_cloud",
          goalId: "goal_1",
          payload: {
            taskId: "task_1",
            weekNumber: 1,
            completed: true,
            scheduledDate: "2026-05-10",
          },
        },
      ],
    };
    storageMock.saveUserData.mockReturnValue(false);
    setSignedIn("firebase_uid_cloud");
    manualSyncMock.useTwelveWeekManualCloudSync.mockImplementation(() => ({
      loading: false,
      lastResult: conflictResultWithMutation,
      syncNow: manualSyncMock.syncNow,
    }));

    const { result } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 5_000 }));
    await flushMicrotasks();
    manualSyncMock.syncNow.mockClear();

    await act(async () => {
      await result.current.resolveConflictUseCloud();
    });

    expect(queueMock.writeMutationQueueStore).not.toHaveBeenCalled();
    expect(queueMock.store.items[0]?.status).toBe("blocked_conflict");
    expect(pullCursorStoreMock.clearPullCursor).not.toHaveBeenCalled();
    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  describe("trailing flush", () => {
    const sendPending = mutationSenderMock.sendPending12WeekMutations;

    // Dựng harness: ép hook vào nhánh rate-limit của drainPendingMutations.
    // Chạy một lượt drain "mồi" (set lastDrainStartedAtRef), tiến đồng hồ thêm `elapsed`
    // (< minSyncIntervalMs) rồi trigger drain lần hai để nó bị Sync_Floor chặn và hẹn
    // trailing flush. Trả về số lần gọi backend ghi nhận tại từng mốc thời gian.
    async function runTrailingFlushScenario(elapsed: number, minSyncIntervalMs: number) {
      const base = new Date("2026-05-10T10:00:00.000Z").getTime();
      queueMock.pendingCount = 2;
      setSignedIn("firebase_uid_trailing");
      vi.setSystemTime(base);

      const { result, unmount } = renderHook(() => useAutoCloudSync({ intervalMs: 300_000, minSyncIntervalMs }));

      // Để lượt full-sync khi mount kết thúc (giải phóng inFlightRef) trước khi drain.
      await flushMicrotasks();
      sendPending.mockClear();

      // Lượt drain mồi tại base: lastDrainStartedAtRef === null nên drain chạy thật.
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      const callsAfterPrimer = sendPending.mock.calls.length;

      // Tiến đồng hồ đúng `elapsed` ms (vẫn trong cửa sổ Sync_Floor).
      await act(async () => {
        vi.advanceTimersByTime(elapsed);
      });

      // Lượt drain thứ hai: bị rate-limit chặn → hẹn trailing flush, không gọi backend.
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      const callsAfterRateLimited = sendPending.mock.calls.length;

      // R1.2/R1.3: trailing flush phải nổ đúng tại max(0, min - elapsed) ms.
      const delay = Math.max(0, minSyncIntervalMs - elapsed);

      // Tiến ít hơn delay 1ms: drain CHƯA được chạy lại.
      await act(async () => {
        vi.advanceTimersByTime(delay - 1);
      });
      const callsJustBeforeFloor = sendPending.mock.calls.length;

      // Tiến nốt 1ms: floor hết hiệu lực, trailing flush nổ và drain chạy lại.
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      await flushMicrotasks();
      const callsAfterFloor = sendPending.mock.calls.length;

      unmount();
      sendPending.mockClear();
      queueMock.pendingCount = 0;

      return { callsAfterPrimer, callsAfterRateLimited, callsJustBeforeFloor, callsAfterFloor };
    }

    // **Feature: faster-auto-cloud-sync, Property 1: Trailing flush chạy đúng tại thời điểm floor hết hiệu lực**
    // **Validates: Requirements 1.1, 1.2, 1.3**
    it("schedules a trailing flush that drains exactly when the sync floor expires", async () => {
      vi.useFakeTimers();
      const minSyncIntervalMs = 5_000;
      const iterations = 120;

      for (let i = 0; i < iterations; i += 1) {
        // Sinh ngẫu nhiên elapsed trong [0, minSyncIntervalMs).
        const elapsed = Math.floor(Math.random() * minSyncIntervalMs);
        const message = `iteration=${i} elapsed=${elapsed}`;

        const { callsAfterPrimer, callsAfterRateLimited, callsJustBeforeFloor, callsAfterFloor } =
          await runTrailingFlushScenario(elapsed, minSyncIntervalMs);

        // Lượt drain mồi đã gọi backend đúng một lần.
        expect(callsAfterPrimer, message).toBe(1);
        // R1.1: lượt drain thứ hai bị rate-limit chặn, không gọi backend thêm.
        expect(callsAfterRateLimited, message).toBe(1);
        // Tiến ít hơn floor: drain chưa chạy lại.
        expect(callsJustBeforeFloor, message).toBe(1);
        // R1.2/R1.3: đúng tại max(0, min - elapsed) ms, trailing flush nổ → drain chạy lại.
        expect(callsAfterFloor, message).toBe(2);
      }
    });

    type FloorInvariantOp = { type: "advance"; ms: number } | { type: "drain" };

    // Sinh ngẫu nhiên một chuỗi thao tác: xen kẽ giữa việc tiến đồng hồ một lượng nhỏ
    // bất kỳ và việc gọi triggerDrainOnly (mô phỏng mutation/trigger drain tại các mốc
    // thời gian tùy ý). Trả về danh sách op để vừa replay được vừa đưa vào message.
    function generateFloorInvariantOps(minSyncIntervalMs: number): FloorInvariantOp[] {
      const opCount = 4 + Math.floor(Math.random() * 9); // 4..12 thao tác
      const ops: FloorInvariantOp[] = [];
      for (let i = 0; i < opCount; i += 1) {
        if (Math.random() < 0.5) {
          // Gap ngẫu nhiên trong [0, minSyncIntervalMs + floor/2): có lúc qua floor, có lúc không.
          const ms = Math.floor(Math.random() * (minSyncIntervalMs + minSyncIntervalMs / 2));
          ops.push({ type: "advance", ms });
        } else {
          ops.push({ type: "drain" });
        }
      }
      // Đảm bảo có ít nhất một lượt drain để kích hoạt backend.
      if (!ops.some((op) => op.type === "drain")) {
        ops.push({ type: "drain" });
      }
      return ops;
    }

    // Replay chuỗi op, ghi lại mọi thời điểm sendPending12WeekMutations thực sự được gọi.
    // pendingCount luôn > 0 để drain luôn được thử (mock giữ nguyên pendingCount).
    async function runFloorInvariantScenario(ops: FloorInvariantOp[], minSyncIntervalMs: number) {
      const base = new Date("2026-05-10T10:00:00.000Z").getTime();
      queueMock.pendingCount = 2;
      setSignedIn("firebase_uid_floor");
      vi.setSystemTime(base);

      const sendTimes: number[] = [];
      sendPending.mockImplementation(async () => {
        // Fake timers đang bật ⇒ Date.now() trả về thời gian hệ thống giả lập hiện tại.
        sendTimes.push(Date.now());
        return drainSuccessResult;
      });

      const { result, unmount } = renderHook(() => useAutoCloudSync({ intervalMs: 300_000, minSyncIntervalMs }));

      // Bỏ qua lượt full-sync khi mount (đi qua syncNow, không gọi sendPending) rồi reset mốc.
      await flushMicrotasks();
      sendTimes.length = 0;

      for (const op of ops) {
        if (op.type === "advance") {
          await act(async () => {
            vi.advanceTimersByTime(op.ms);
          });
          await flushMicrotasks();
        } else {
          await act(async () => {
            await result.current.triggerDrainOnly();
          });
        }
      }

      // Tiến nốt một cửa sổ floor để mọi trailing flush còn chờ kịp nổ.
      await act(async () => {
        vi.advanceTimersByTime(minSyncIntervalMs);
      });
      await flushMicrotasks();

      unmount();
      sendPending.mockClear();
      sendPending.mockResolvedValue(drainSuccessResult);
      queueMock.pendingCount = 0;

      return sendTimes;
    }

    // **Feature: faster-auto-cloud-sync, Property 2: Bất biến van chống-spam backend (Sync_Floor)**
    // **Validates: Requirements 2.2, 2.3**
    it("never calls the backend twice within the sync floor, even via trailing flush", async () => {
      vi.useFakeTimers();
      const minSyncIntervalMs = 5_000;
      const iterations = 120;

      for (let i = 0; i < iterations; i += 1) {
        const ops = generateFloorInvariantOps(minSyncIntervalMs);
        const sendTimes = await runFloorInvariantScenario(ops, minSyncIntervalMs);
        const message = `iteration=${i} ops=${JSON.stringify(ops)} sendTimes=${JSON.stringify(sendTimes)}`;

        // R2.2/R2.3: hai lần gọi backend liên tiếp luôn cách nhau >= minSyncIntervalMs ms.
        for (let k = 1; k < sendTimes.length; k += 1) {
          const gap = sendTimes[k] - sendTimes[k - 1];
          expect(gap, `${message} pair=${k - 1}->${k} gap=${gap}`).toBeGreaterThanOrEqual(minSyncIntervalMs);
        }
      }
    });

    // Dựng harness: trong cùng một cửa sổ floor, gọi triggerDrainOnly N lần liên tiếp
    // (N rate-limited) rồi tiến qua floor để xác nhận chỉ có TỐI ĐA MỘT trailing flush
    // nổ (một lượt drain bổ sung, không phải N). Sau đó lặp lại một chu kỳ floor nữa để
    // xác nhận hook lên lịch lại được một timer mới qua các chu kỳ.
    async function runMaxOneTrailingTimerScenario(rateLimitedCalls: number, minSyncIntervalMs: number) {
      const base = new Date("2026-05-10T10:00:00.000Z").getTime();
      queueMock.pendingCount = 2; // pendingCount luôn > 0 để drain luôn được thử.
      setSignedIn("firebase_uid_max_one");
      vi.setSystemTime(base);

      const { result, unmount } = renderHook(() => useAutoCloudSync({ intervalMs: 300_000, minSyncIntervalMs }));

      // Để lượt full-sync khi mount kết thúc (giải phóng inFlightRef) trước khi drain.
      await flushMicrotasks();
      sendPending.mockClear();

      // Lượt drain mồi tại base: lastDrainStartedAtRef === null nên drain chạy thật.
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      const callsAfterPrimer = sendPending.mock.calls.length;

      // N lần rate-limit liên tiếp trong cùng cửa sổ floor: mỗi lần tiến một khoảng nhỏ
      // (tổng vẫn < minSyncIntervalMs) rồi gọi drain → bị Sync_Floor chặn, không gọi backend.
      // Guard trailingFlushTimerRef đảm bảo chỉ MỘT timer được lên lịch dù gọi N lần.
      for (let c = 0; c < rateLimitedCalls; c += 1) {
        const smallGap = 1 + Math.floor(Math.random() * 20); // 1..20ms mỗi lần
        await act(async () => {
          vi.advanceTimersByTime(smallGap);
        });
        await act(async () => {
          await result.current.triggerDrainOnly();
        });
      }
      const callsAfterRateLimited = sendPending.mock.calls.length;

      // Tiến qua hết floor (dư) để timer trailing flush kịp nổ đúng một lần.
      await act(async () => {
        vi.advanceTimersByTime(minSyncIntervalMs);
      });
      await flushMicrotasks();
      const callsAfterFloor = sendPending.mock.calls.length;

      // Chu kỳ floor kế tiếp: tiến một khoảng nhỏ trong floor mới rồi rate-limit lại một lần
      // → phải lên lịch được một timer MỚI (chứng minh re-scheduling qua các chu kỳ).
      await act(async () => {
        vi.advanceTimersByTime(1 + Math.floor(Math.random() * 20));
      });
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      const callsAfterSecondRateLimited = sendPending.mock.calls.length;

      // Tiến qua floor lần nữa: timer mới nổ → thêm đúng một lượt drain bổ sung.
      await act(async () => {
        vi.advanceTimersByTime(minSyncIntervalMs);
      });
      await flushMicrotasks();
      const callsAfterSecondCycle = sendPending.mock.calls.length;

      unmount();
      sendPending.mockClear();
      queueMock.pendingCount = 0;

      return {
        callsAfterPrimer,
        callsAfterRateLimited,
        callsAfterFloor,
        callsAfterSecondRateLimited,
        callsAfterSecondCycle,
      };
    }

    // **Feature: faster-auto-cloud-sync, Property 3: Tối đa một trailing timer và có thể lên lịch lại qua các chu kỳ**
    // **Validates: Requirements 2.4, 4.3, 4.4**
    it("schedules at most one trailing timer per floor window and can reschedule across cycles", async () => {
      vi.useFakeTimers();
      const minSyncIntervalMs = 5_000;
      const iterations = 120;

      for (let i = 0; i < iterations; i += 1) {
        // Sinh ngẫu nhiên số lần rate-limit liên tiếp trong cùng cửa sổ floor: N in [2, 10].
        const rateLimitedCalls = 2 + Math.floor(Math.random() * 9);
        const message = `iteration=${i} rateLimitedCalls=${rateLimitedCalls}`;

        const {
          callsAfterPrimer,
          callsAfterRateLimited,
          callsAfterFloor,
          callsAfterSecondRateLimited,
          callsAfterSecondCycle,
        } = await runMaxOneTrailingTimerScenario(rateLimitedCalls, minSyncIntervalMs);

        // Lượt drain mồi đã gọi backend đúng một lần.
        expect(callsAfterPrimer, message).toBe(1);
        // R2.4: N lần rate-limit liên tiếp không gọi backend thêm (timer chỉ lên lịch, chưa nổ).
        expect(callsAfterRateLimited, message).toBe(1);
        // R2.4/R4.3: chỉ MỘT trailing flush nổ → đúng MỘT lượt drain bổ sung (không phải N).
        expect(callsAfterFloor, message).toBe(2);
        // Trong chu kỳ floor kế tiếp, lần rate-limit mới chỉ lên lịch timer, chưa gọi backend.
        expect(callsAfterSecondRateLimited, message).toBe(2);
        // R4.3/R4.4: sau khi timer trước đã nổ, chu kỳ kế tiếp lên lịch lại được timer mới
        // → thêm đúng một lượt drain bổ sung nữa, chứng minh re-scheduling qua các chu kỳ.
        expect(callsAfterSecondCycle, message).toBe(3);
      }
    });

    // Các trạng thái "không sẵn sàng" có thể áp dụng để chặn drain/trailing flush.
    // - offline / apiNotConfigured / mutationSyncDisabled ⇒ drainSyncBaseReady = false (R5.1)
    // - hidden ⇒ document đang ẩn (R5.2)
    // - signedOut ⇒ ownerUid = null (R5.3)
    type GuardUnreadyCondition = "offline" | "apiNotConfigured" | "mutationSyncDisabled" | "hidden" | "signedOut";

    const ALL_GUARD_CONDITIONS: GuardUnreadyCondition[] = [
      "offline",
      "apiNotConfigured",
      "mutationSyncDisabled",
      "hidden",
      "signedOut",
    ];

    // Đưa toàn bộ mock về trạng thái "sẵn sàng" đầy đủ (đảo ngược mọi unready của vòng trước).
    function resetGuardReadyState() {
      appModeMock.shouldEnable12WeekMutationSync.mockReturnValue(true);
      apiClientMock.isApiBaseUrlConfigured.mockReturnValue(true);
      networkStatusMock.state = {
        status: "online",
        isOnline: true,
        isOffline: false,
      };
      visibilityState = "visible";
      setSignedIn("firebase_uid_guard");
    }

    // Dựng harness: áp dụng (các) điều kiện không sẵn sàng TRƯỚC khi render để hook tính
    // drainSyncBaseReady/documentVisible/ownerUid tương ứng, rồi gọi triggerDrainOnly vài
    // lần với các bước tiến đồng hồ nhỏ, cuối cùng tiến vượt xa floor + flush microtasks.
    // Trả về tổng số lần sendPending12WeekMutations được gọi (phải luôn = 0).
    async function runGuardScenario(conditions: GuardUnreadyCondition[], minSyncIntervalMs: number) {
      const base = new Date("2026-05-10T10:00:00.000Z").getTime();
      queueMock.pendingCount = 2; // còn pending để drain luôn được thử nếu guard cho qua.
      vi.setSystemTime(base);

      // Bắt đầu từ trạng thái sẵn sàng rồi áp các điều kiện unready ngẫu nhiên.
      resetGuardReadyState();
      for (const condition of conditions) {
        switch (condition) {
          case "offline":
            networkStatusMock.state = {
              status: "offline",
              isOnline: false,
              isOffline: true,
            };
            break;
          case "apiNotConfigured":
            apiClientMock.isApiBaseUrlConfigured.mockReturnValue(false);
            break;
          case "mutationSyncDisabled":
            appModeMock.shouldEnable12WeekMutationSync.mockReturnValue(false);
            break;
          case "hidden":
            visibilityState = "hidden";
            break;
          case "signedOut":
            setSignedOut();
            break;
        }
      }

      const { result, unmount } = renderHook(() => useAutoCloudSync({ intervalMs: 300_000, minSyncIntervalMs }));

      // Lượt full-sync khi mount (nếu có) đi qua syncNow, không qua sendPending; reset mốc.
      await flushMicrotasks();
      sendPending.mockClear();

      // Gọi triggerDrainOnly vài lần với bước tiến đồng hồ nhỏ ngẫu nhiên (gồm cả trường
      // hợp ownerUid null: drain early-return, scheduleTrailingFlush không lên lịch gì).
      const triggerCount = 2 + Math.floor(Math.random() * 4); // 2..5 lần
      for (let t = 0; t < triggerCount; t += 1) {
        await act(async () => {
          vi.advanceTimersByTime(Math.floor(Math.random() * 50));
        });
        await act(async () => {
          await result.current.triggerDrainOnly();
        });
      }

      // Tiến vượt xa floor + flush để mọi trailing flush (nếu bị lên lịch nhầm) kịp nổ.
      await act(async () => {
        vi.advanceTimersByTime(minSyncIntervalMs * 2);
      });
      await flushMicrotasks();

      const callCount = sendPending.mock.calls.length;

      unmount();
      sendPending.mockClear();
      queueMock.pendingCount = 0;
      // Khôi phục trạng thái sẵn sàng cho vòng lặp kế tiếp.
      resetGuardReadyState();

      return callCount;
    }

    // **Feature: faster-auto-cloud-sync, Property 4: Bất biến điều kiện sẵn sàng (guard)**
    // **Validates: Requirements 5.1, 5.2, 5.3**
    it("never drains via trailing flush under any unready condition", async () => {
      vi.useFakeTimers();
      const minSyncIntervalMs = 5_000;
      const iterations = 120;

      for (let i = 0; i < iterations; i += 1) {
        // Chọn ngẫu nhiên (đảm bảo ≥ 1) một hoặc nhiều điều kiện không sẵn sàng.
        const conditions = ALL_GUARD_CONDITIONS.filter(() => Math.random() < 0.5);
        if (conditions.length === 0) {
          conditions.push(ALL_GUARD_CONDITIONS[Math.floor(Math.random() * ALL_GUARD_CONDITIONS.length)]);
        }
        const message = `iteration=${i} conditions=${JSON.stringify(conditions)}`;

        const callCount = await runGuardScenario(conditions, minSyncIntervalMs);

        // R5.1/R5.2/R5.3: dưới bất kỳ điều kiện không sẵn sàng nào, trailing flush KHÔNG BAO
        // GIỜ gọi sendPending12WeekMutations; ownerUid null cũng không lên lịch timer nào.
        expect(callCount, message).toBe(0);
      }
    });

    // Test A — Unit test (example-based) cho R1.4: khi trailing flush timer nổ, drain được
    // chạy lại qua đúng đường dẫn triggerDrainOnly → drainPendingMutations (gọi backend thật).
    // **Validates: Requirements 1.4**
    it("re-runs drain through triggerDrainOnly when the trailing flush timer fires", async () => {
      vi.useFakeTimers();
      const minSyncIntervalMs = 5_000;
      const base = new Date("2026-05-10T10:00:00.000Z").getTime();
      queueMock.pendingCount = 2;
      setSignedIn("firebase_uid_trailing_fire");
      vi.setSystemTime(base);

      const { result, unmount } = renderHook(() => useAutoCloudSync({ intervalMs: 300_000, minSyncIntervalMs }));

      // Bỏ qua lượt full-sync khi mount (giải phóng inFlightRef) trước khi drain.
      await flushMicrotasks();
      sendPending.mockClear();

      // Lượt drain mồi tại base: lastDrainStartedAtRef === null nên drain chạy thật.
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      expect(sendPending).toHaveBeenCalledTimes(1);

      // Tiến một chút trong cửa sổ floor rồi trigger drain lần hai → bị rate-limit chặn,
      // chỉ hẹn trailing flush, không gọi backend thêm.
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      expect(sendPending).toHaveBeenCalledTimes(1);

      // Xóa log của các lượt trước để xác nhận lượt drain do timer kích hoạt đi qua path thật.
      vi.mocked(console.log).mockClear();

      // Tiến qua hết floor: trailing flush nổ → triggerDrainOnly → drainPendingMutations.
      await act(async () => {
        vi.advanceTimersByTime(minSyncIntervalMs);
      });
      await flushMicrotasks();

      // R1.4: timer nổ gọi lại drain qua triggerDrainOnly → backend được gọi lần hai.
      expect(sendPending).toHaveBeenCalledTimes(2);
      // Xác nhận đi qua đúng đường dẫn drain thật (log "[auto-sync] drain-only starting").
      expect(console.log).toHaveBeenCalledWith(
        "[auto-sync] drain-only starting",
        expect.objectContaining({ ownerUid: "firebase_uid_trailing_fire" }),
      );

      unmount();
      sendPending.mockClear();
      queueMock.pendingCount = 0;
    });

    // Test B — Unit test (example-based) cho R3.1/R3.3: sau khi trailing flush gửi thành công,
    // pendingCount về 0 mà không cần người dùng kích hoạt thủ công triggerSyncNow.
    // **Validates: Requirements 3.1, 3.3**
    it("clears pendingCount to 0 after a successful trailing flush without a manual triggerSyncNow", async () => {
      vi.useFakeTimers();
      const minSyncIntervalMs = 5_000;
      const base = new Date("2026-05-10T10:00:00.000Z").getTime();
      queueMock.pendingCount = 2;
      setSignedIn("firebase_uid_trailing_pending");
      vi.setSystemTime(base);

      // Khi backend chạy thành công, hàng chờ rỗng (pendingCount = 0).
      sendPending.mockImplementation(async () => {
        queueMock.pendingCount = 0;
        return { ...drainSuccessResult, pendingCount: 0 };
      });

      const { result, unmount } = renderHook(() => useAutoCloudSync({ intervalMs: 300_000, minSyncIntervalMs }));

      // Lượt full-sync khi mount gọi syncNow một lần; xóa mock để theo dõi từ đây.
      await flushMicrotasks();
      manualSyncMock.syncNow.mockClear();

      // Lượt drain mồi: set lastDrainStartedAtRef (mock đặt pendingCount = 0 sau khi gửi).
      await act(async () => {
        await result.current.triggerDrainOnly();
      });

      // Khôi phục pending > 0 để lượt drain kế tiếp (bị rate-limit) hẹn được trailing flush.
      queueMock.pendingCount = 2;

      // Tiến một chút trong cửa sổ floor rồi trigger drain → bị chặn, hẹn trailing flush.
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
      await act(async () => {
        await result.current.triggerDrainOnly();
      });

      // Tiến qua hết floor để trailing flush nổ và gửi thành công.
      await act(async () => {
        vi.advanceTimersByTime(minSyncIntervalMs);
      });
      await flushMicrotasks();
      await flushMicrotasks();

      // R3.1: gửi thành công ⇒ pendingCount về 0.
      expect(result.current.pendingCount).toBe(0);
      // R3.3: không cần người dùng kích hoạt thủ công triggerSyncNow.
      expect(manualSyncMock.syncNow).not.toHaveBeenCalled();

      unmount();
      sendPending.mockClear();
      sendPending.mockResolvedValue(drainSuccessResult);
      queueMock.pendingCount = 0;
    });

    // Test A — Unit test (example-based) cho R4.1: unmount khi đang có trailing timer chờ ⇒
    // cleanup của useEffect hủy timer, nên khi delay trôi qua thì drain KHÔNG chạy nữa.
    // **Validates: Requirements 4.1**
    it("does not drain after unmount while a trailing flush timer is still pending", async () => {
      vi.useFakeTimers();
      const minSyncIntervalMs = 5_000;
      const base = new Date("2026-05-10T10:00:00.000Z").getTime();
      queueMock.pendingCount = 2;
      setSignedIn("firebase_uid_unmount");
      vi.setSystemTime(base);

      const { result, unmount } = renderHook(() => useAutoCloudSync({ intervalMs: 300_000, minSyncIntervalMs }));

      // Bỏ qua lượt full-sync khi mount (giải phóng inFlightRef) trước khi drain.
      await flushMicrotasks();
      sendPending.mockClear();

      // Lượt drain mồi tại base: lastDrainStartedAtRef === null nên drain chạy thật.
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      expect(sendPending).toHaveBeenCalledTimes(1);

      // Tiến một chút trong cửa sổ floor rồi trigger drain lần hai → bị rate-limit chặn,
      // chỉ hẹn trailing flush (timer còn đang chờ), không gọi backend thêm.
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      expect(sendPending).toHaveBeenCalledTimes(1);

      // Xóa log các lượt trước; unmount khi trailing timer VẪN còn chờ kích hoạt.
      sendPending.mockClear();
      unmount();

      // Tiến vượt qua hết floor + flush microtasks: nếu timer không bị hủy thì drain sẽ nổ.
      await act(async () => {
        vi.advanceTimersByTime(minSyncIntervalMs * 2);
      });
      await flushMicrotasks();

      // R4.1: cleanup khi unmount đã hủy timer ⇒ không có drain nào chạy sau unmount.
      expect(sendPending).not.toHaveBeenCalled();

      sendPending.mockClear();
      queueMock.pendingCount = 0;
    });

    // Test B — Unit test (example-based) cho R4.2: đổi ownerUid ⇒ cleanup effect (deps có
    // ownerUid) hủy trailing timer của user cũ, nên timer cũ không drain nhầm cho user A.
    // **Validates: Requirements 4.2**
    it("cancels the previous user's trailing flush timer when ownerUid changes", async () => {
      vi.useFakeTimers();
      const minSyncIntervalMs = 5_000;
      const base = new Date("2026-05-10T10:00:00.000Z").getTime();
      queueMock.pendingCount = 2;
      setSignedIn("firebase_uid_userA");
      vi.setSystemTime(base);

      const { result, rerender, unmount } = renderHook(() =>
        useAutoCloudSync({ intervalMs: 300_000, minSyncIntervalMs }),
      );

      // Bỏ qua lượt full-sync khi mount cho user A trước khi drain.
      await flushMicrotasks();
      sendPending.mockClear();

      // Lượt drain mồi cho user A tại base: lastDrainStartedAtRef === null nên drain chạy thật.
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      expect(sendPending).toHaveBeenCalledTimes(1);
      expect(sendPending).toHaveBeenCalledWith(expect.objectContaining({ ownerUid: "firebase_uid_userA" }));

      // Tiến một chút trong cửa sổ floor rồi trigger drain lần hai → bị rate-limit chặn,
      // hẹn trailing flush cho user A (timer còn đang chờ).
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      expect(sendPending).toHaveBeenCalledTimes(1);

      // Xóa log; đổi ownerUid sang user B rồi rerender ⇒ cleanup effect của user A chạy và
      // hủy trailing timer của A (auth mock dùng chung state nên set trước khi rerender).
      sendPending.mockClear();
      setSignedIn("firebase_uid_userB");
      rerender();

      // Tiến vượt qua hết floor + flush microtasks: timer cũ của A (nếu không bị hủy) sẽ nổ.
      // Drain cho user B cần trigger riêng (không gọi ở đây) nên backend không được gọi.
      await act(async () => {
        vi.advanceTimersByTime(minSyncIntervalMs * 2);
      });
      await flushMicrotasks();

      // R4.2: timer của user A đã bị hủy ⇒ không có drain nào chạy từ timer cũ.
      expect(sendPending).not.toHaveBeenCalled();
      // Cụ thể hơn: chắc chắn không drain nhầm cho user A từ timer cũ.
      expect(sendPending).not.toHaveBeenCalledWith(expect.objectContaining({ ownerUid: "firebase_uid_userA" }));

      unmount();
      sendPending.mockClear();
      queueMock.pendingCount = 0;
    });
  });

  // Task 2.7 — Smoke assert các hằng số sync giữ nguyên giá trị (R2.1, R5.4).
  // Các hằng số là module-private (không export) nên được khẳng định gián tiếp qua
  // HÀNH VI QUAN SÁT ĐƯỢC của hook, không sửa source để export ra ngoài.
  describe("sync constants (smoke)", () => {
    const sendPending = mutationSenderMock.sendPending12WeekMutations;
    const base = new Date("2026-05-10T10:00:00.000Z").getTime();

    // R2.1: DEFAULT_MIN_SYNC_INTERVAL_MS === 5000.
    // Render KHÔNG truyền minSyncIntervalMs (dùng mặc định). Một lượt drain mồi đặt
    // lastDrainStartedAtRef; tiến đồng hồ 4_999ms rồi trigger drain → vẫn bị Sync_Floor
    // chặn (chứng tỏ floor > 4_999); tiến nốt 1ms (tổng 5_000) → trailing flush nổ và
    // drain chạy lại (chứng tỏ floor <= 5_000). Hai chiều ⇒ floor mặc định đúng 5_000ms.
    it("defaults the sync floor to 5_000ms (DEFAULT_MIN_SYNC_INTERVAL_MS)", async () => {
      vi.useFakeTimers();
      queueMock.pendingCount = 2;
      setSignedIn("firebase_uid_floor_const");
      vi.setSystemTime(base);

      const { result, unmount } = renderHook(() => useAutoCloudSync());

      // Bỏ qua lượt full-sync khi mount (giải phóng inFlightRef) trước khi drain.
      await flushMicrotasks();
      sendPending.mockClear();

      // Lượt drain mồi tại base: lastDrainStartedAtRef === null nên drain chạy thật.
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      expect(sendPending).toHaveBeenCalledTimes(1);

      // Tiến đúng dưới floor mặc định 1ms (4_999ms): vẫn trong cửa sổ Sync_Floor.
      await act(async () => {
        vi.advanceTimersByTime(4_999);
      });

      // Trigger drain lần hai → bị rate-limit chặn, chỉ hẹn trailing flush, không gọi backend.
      await act(async () => {
        await result.current.triggerDrainOnly();
      });
      expect(sendPending).toHaveBeenCalledTimes(1);

      // Tiến nốt 1ms (tổng 5_000ms): floor hết hiệu lực, trailing flush nổ → drain chạy lại.
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      await flushMicrotasks();
      expect(sendPending).toHaveBeenCalledTimes(2);

      unmount();
      sendPending.mockClear();
      queueMock.pendingCount = 0;
    });

    // R5.4: DEFAULT_MUTATION_DEBOUNCE_MS === 1000.
    // Render KHÔNG truyền mutationDebounceMs (dùng mặc định). Sau khi full-sync mount xong,
    // phát USER_DATA_UPDATED_EVENT_NAME: tiến 999ms thì drain CHƯA nổ (debounce > 999),
    // tiến nốt 1ms (tổng 1_000) thì drain nổ đúng một lần (debounce <= 1_000) ⇒ đúng 1_000ms.
    it("defaults the mutation debounce to 1_000ms (DEFAULT_MUTATION_DEBOUNCE_MS)", async () => {
      vi.useFakeTimers();
      queueMock.pendingCount = 2;
      setSignedIn("firebase_uid_debounce_const");
      vi.setSystemTime(base);

      const { unmount } = renderHook(() => useAutoCloudSync());

      // Bỏ qua lượt full-sync khi mount (đi qua syncNow, không qua sendPending) rồi reset.
      await flushMicrotasks();
      sendPending.mockClear();

      // Phát sự kiện cập nhật dữ liệu người dùng → khởi động debounce.
      await act(async () => {
        window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));
      });

      // Tiến 999ms: debounce mặc định chưa nổ ⇒ chưa gọi backend.
      await act(async () => {
        vi.advanceTimersByTime(999);
      });
      expect(sendPending).not.toHaveBeenCalled();

      // Tiến nốt 1ms (tổng 1_000ms): debounce nổ → drain gọi backend đúng một lần.
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      await flushMicrotasks();
      expect(sendPending).toHaveBeenCalledTimes(1);

      unmount();
      sendPending.mockClear();
      queueMock.pendingCount = 0;
    });

    // R5.4: RECONNECT_DEBOUNCE_MS === 3000.
    // Hook truyền RECONNECT_DEBOUNCE_MS vào useNetworkStatus → quan sát trực tiếp hằng số
    // qua networkStatusMock.lastOptions. Không cần đăng nhập vì useNetworkStatus được gọi
    // vô điều kiện ở đầu hook (tránh kích hoạt full-sync bất đồng bộ).
    it("passes a 3_000ms reconnect debounce to useNetworkStatus (RECONNECT_DEBOUNCE_MS)", () => {
      const { unmount } = renderHook(() => useAutoCloudSync());

      expect(networkStatusMock.lastOptions?.reconnectDebounceMs).toBe(3000);

      unmount();
    });

    // R2.1/R5.4 (gián tiếp): DEFAULT_INTERVAL_MS === 300_000 (5 * 60_000).
    // Render KHÔNG truyền intervalMs (dùng mặc định), signed-in/online/visible. Sau lượt
    // full-sync mount, tiến 299_999ms thì chu kỳ định kỳ CHƯA nổ (interval > 299_999),
    // tiến nốt 1ms (tổng 300_000) thì chu kỳ nổ đúng một lần ⇒ interval mặc định 300_000ms.
    it("defaults the periodic interval to 300_000ms (DEFAULT_INTERVAL_MS)", async () => {
      vi.useFakeTimers();
      queueMock.pendingCount = 0;
      setSignedIn("firebase_uid_interval_const");
      vi.setSystemTime(base);

      const { unmount } = renderHook(() => useAutoCloudSync());

      // Lượt full-sync khi mount gọi syncNow một lần (đặt lastSyncStartedAtRef = base).
      await flushMicrotasks();
      expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
      manualSyncMock.syncNow.mockClear();

      // Tiến đúng dưới interval mặc định 1ms (299_999ms): chu kỳ định kỳ chưa nổ.
      await act(async () => {
        vi.advanceTimersByTime(299_999);
      });
      expect(manualSyncMock.syncNow).not.toHaveBeenCalled();

      // Tiến nốt 1ms (tổng 300_000ms): chu kỳ định kỳ nổ → syncNow đúng một lần.
      // Rate-limit floor (5_000ms) đã thừa qua nên không chặn lượt này.
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      await flushMicrotasks();
      expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);

      unmount();
    });

    // R5.4: VISIBILITY_SYNC_STALE_MS === 60_000.
    // Tab hiện lại chỉ kích hoạt sync nếu lần sync gần nhất cũ hơn ngưỡng stale. Harness mount
    // visible (đặt lastSyncStartedAtRef = base), ẩn tab, tiến `elapsed` ms, hiện lại + qua hết
    // debounce hiển thị (300ms), trả về số lần syncNow được gọi.
    async function runVisibilityStaleScenario(elapsed: number): Promise<number> {
      queueMock.pendingCount = 0;
      setSignedIn("firebase_uid_visibility_const");
      visibilityState = "visible";
      vi.setSystemTime(base);

      const { unmount } = renderHook(() => useAutoCloudSync());

      // Lượt full-sync khi mount đặt lastSyncStartedAtRef = base.
      await flushMicrotasks();
      manualSyncMock.syncNow.mockClear();

      // Ẩn tab.
      visibilityState = "hidden";
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // Tiến `elapsed` ms kể từ lần full-sync lúc mount.
      await act(async () => {
        vi.advanceTimersByTime(elapsed);
      });

      // Hiện lại tab + qua hết debounce hiển thị (300ms).
      visibilityState = "visible";
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        vi.advanceTimersByTime(300);
      });
      await flushMicrotasks();

      const calls = manualSyncMock.syncNow.mock.calls.length;

      unmount();
      visibilityState = "visible";
      manualSyncMock.syncNow.mockClear();
      return calls;
    }

    it("only runs the visibility-triggered sync past the 60_000ms stale window (VISIBILITY_SYNC_STALE_MS)", async () => {
      vi.useFakeTimers();

      // Dưới ngưỡng đúng 1ms (59_999ms): tab hiện lại KHÔNG kích hoạt sync (stale > 59_999).
      const callsJustBelow = await runVisibilityStaleScenario(59_999);
      expect(callsJustBelow, "elapsed=59_999").toBe(0);

      // Đúng ngưỡng (60_000ms): tab hiện lại kích hoạt đúng một lần sync (stale <= 60_000).
      const callsAtThreshold = await runVisibilityStaleScenario(60_000);
      expect(callsAtThreshold, "elapsed=60_000").toBe(1);
    });
  });
});
