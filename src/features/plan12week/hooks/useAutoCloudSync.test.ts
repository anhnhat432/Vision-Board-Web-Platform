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
      },
    ],
    missingClientIds: [],
    unsupportedFields: [],
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
});
