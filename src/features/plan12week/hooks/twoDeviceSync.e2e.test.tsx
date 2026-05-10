import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME } from "@/app/components/root-layout/SyncStatusPill";
import {
  createMockBackend,
  dispatchUserDataUpdated,
  enqueueDailyCheckInMutation,
  enqueueTaskCompletedMutation,
  enqueueWeeklyReviewMutation,
  getAppliedMutationKinds,
  makeDailyCheckIn,
  makeTwelveWeekGoal,
  makeWeeklyReview,
  markDeviceQueueBlockedConflict,
  replaceDeviceGoal,
  restoreLocalStorage,
  seedDeviceWithData,
  setDeviceGoalTitle,
  setupDevice,
  snapshotLocalStorage,
  type TwoDevice,
} from "@/test/twoDeviceHarness";

const authContextMock = vi.hoisted(() => ({
  state: {
    user: null as { uid: string; email: string } | null,
    userProfile: null as { id: string; email: string } | null,
    userProfileLoading: false,
  },
  useAuthContext: vi.fn(),
}));

const appModeMock = vi.hoisted(() => ({
  isRealMode: vi.fn(() => true),
  isDemoMode: vi.fn(() => false),
  shouldSeedDemoData: vi.fn(() => false),
  shouldEnable12WeekMutationSync: vi.fn(() => true),
  shouldEnable12WeekPullSync: vi.fn(() => true),
}));

const apiClientMock = vi.hoisted(() => ({
  isApiBaseUrlConfigured: vi.fn(() => true),
  toAppError: vi.fn((error: unknown) =>
    error instanceof Error
      ? { message: error.message, status: undefined, isNetworkError: false }
      : { message: "Sync request failed.", status: undefined, isNetworkError: false },
  ),
}));

const syncServiceMock = vi.hoisted(() => ({
  post12WeekMutations: vi.fn(),
  pullTwelveWeekWorkspace: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/app/utils/app-mode", () => ({
  isRealMode: appModeMock.isRealMode,
  isDemoMode: appModeMock.isDemoMode,
  shouldSeedDemoData: appModeMock.shouldSeedDemoData,
  shouldEnable12WeekMutationSync: appModeMock.shouldEnable12WeekMutationSync,
  shouldEnable12WeekPullSync: appModeMock.shouldEnable12WeekPullSync,
}));

vi.mock("@/lib/api/apiClient", () => ({
  isApiBaseUrlConfigured: apiClientMock.isApiBaseUrlConfigured,
  toAppError: apiClientMock.toAppError,
}));

vi.mock("@/services/syncService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/syncService")>();
  return {
    ...actual,
    post12WeekMutations: syncServiceMock.post12WeekMutations,
    pullTwelveWeekWorkspace: syncServiceMock.pullTwelveWeekWorkspace,
  };
});

vi.mock("sonner", () => ({
  toast: toastMock,
}));

const UID = "firebase_uid_two_device";
let online = true;
let visibilityState = "visible";

function setSignedIn(uid = UID) {
  authContextMock.state.user = { uid, email: `${uid}@example.test` };
  authContextMock.state.userProfile = { id: `profile_${uid}`, email: `${uid}@example.test` };
  authContextMock.state.userProfileLoading = false;
}

function setOnline(nextOnline: boolean) {
  online = nextOnline;
  window.dispatchEvent(new Event(nextOnline ? "online" : "offline"));
}

function setVisibility(nextVisibility: "visible" | "hidden") {
  visibilityState = nextVisibility;
  document.dispatchEvent(new Event("visibilitychange"));
}

function configureBackend(backend: ReturnType<typeof createMockBackend>) {
  syncServiceMock.post12WeekMutations.mockImplementation(backend.postMutations);
  syncServiceMock.pullTwelveWeekWorkspace.mockImplementation(backend.pullTwelveWeekWorkspace);
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function drainDeviceToCloud(device: TwoDevice, backend: ReturnType<typeof createMockBackend>) {
  setVisibility("hidden");
  const mounted = device.mountProvider();
  setVisibility("visible");
  fireEvent.click(screen.getByRole("button", { name: "Trigger drain only" }));
  await waitFor(() => {
    expect(backend.capturedBatches.length).toBeGreaterThan(0);
  });
  mounted.unmount();
}

function findButtonByText(fragment: string): HTMLButtonElement {
  const button = screen
    .getAllByRole("button")
    .find((candidate): candidate is HTMLButtonElement => candidate.textContent?.includes(fragment) ?? false);
  if (!button) throw new Error(`Button containing "${fragment}" was not found.`);
  return button;
}

describe("two-device 12-week auto-sync integration", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:backup");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    online = true;
    visibilityState = "visible";
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => online,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });

    setSignedIn();
    authContextMock.useAuthContext.mockImplementation(() => ({
      ...authContextMock.state,
      authLoading: false,
      userProfileError: null,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      isConfigured: true,
    }));
    appModeMock.isRealMode.mockReturnValue(true);
    appModeMock.isDemoMode.mockReturnValue(false);
    appModeMock.shouldSeedDemoData.mockReturnValue(false);
    appModeMock.shouldEnable12WeekMutationSync.mockReturnValue(true);
    appModeMock.shouldEnable12WeekPullSync.mockReturnValue(true);
    apiClientMock.isApiBaseUrlConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("restores a first-login empty device from the cloud snapshot created by another device", async () => {
    const backend = createMockBackend();
    configureBackend(backend);

    const device1 = setupDevice(UID, { setAuthUser: setSignedIn });
    seedDeviceWithData(device1, {
      title: "Round trip restore",
      dailyCheckIns: [
        makeDailyCheckIn("2026-05-10"),
        makeDailyCheckIn("2026-05-11", { optionalNote: "Second check-in" }),
      ],
      weeklyReviews: [makeWeeklyReview(1)],
    });

    await drainDeviceToCloud(device1, backend);

    expect(backend.capturedBatches).toHaveLength(1);
    expect(backend.capturedBatches[0].mutations.map((mutation) => mutation.type)).toEqual(
      expect.arrayContaining(["plan_snapshot_updated", "daily_check_in_upserted", "weekly_review_upserted"]),
    );

    const cloudSnapshot = backend.getSnapshot();
    expect(cloudSnapshot.goals).toHaveLength(1);
    expect(cloudSnapshot.dailyCheckIns).toHaveLength(2);
    expect(cloudSnapshot.weeklyReviews).toHaveLength(1);

    const device2 = setupDevice(UID, { setAuthUser: setSignedIn });
    const mounted = device2.mountProvider({ includeRestoreToast: true });

    await waitFor(() => {
      const restoredGoal = device2.getUserData().goals[0];
      expect(restoredGoal?.title).toBe("Round trip restore");
      expect(restoredGoal?.twelveWeekSystem?.dailyCheckIns).toHaveLength(2);
      expect(restoredGoal?.twelveWeekSystem?.weeklyReviews).toHaveLength(1);
    });

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledTimes(1);
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining("1"),
      expect.objectContaining({
        description: expect.stringContaining("1"),
      }),
    );
    expect(mounted.getLatestState()?.firstLoginRestoreSummary).toBeNull();
  });

  it("surfaces concurrent edit conflicts and lets the user postpone, keep local, or use cloud", async () => {
    const backend = createMockBackend();
    configureBackend(backend);

    const device1 = setupDevice(UID, { setAuthUser: setSignedIn });
    seedDeviceWithData(device1, { title: "A" });
    await drainDeviceToCloud(device1, backend);

    const device2 = setupDevice(UID, { setAuthUser: setSignedIn });
    const hydrateMount = device2.mountProvider();
    await waitFor(() => {
      expect(device2.getUserData().goals[0]?.title).toBe("A");
    });
    hydrateMount.unmount();

    setDeviceGoalTitle(device2, "B");
    markDeviceQueueBlockedConflict(device2);
    const device2ConflictSnapshot = snapshotLocalStorage();

    const device1Update = setupDevice(UID, { setAuthUser: setSignedIn });
    seedDeviceWithData(device1Update, { title: "C" });
    await drainDeviceToCloud(device1Update, backend);
    expect(backend.getSnapshot().goals[0]?.title).toBe("C");

    restoreLocalStorage(device2ConflictSnapshot);
    setSignedIn(UID);
    const keepLocalMount = device2.mountProvider({ includeConflictDialog: true });

    await waitFor(() => {
      expect(keepLocalMount.getLatestState()?.conflictPending).toBe(true);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.click(findButtonByText("sau"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent(window, new CustomEvent(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Giữ trên thiết bị này" }));

    await waitFor(() => {
      expect(backend.getSnapshot().goals[0]?.title).toBe("B");
    });
    expect(getAppliedMutationKinds(device2)).toContain("plan_snapshot_updated");
    keepLocalMount.unmount();

    const cloudGoalC = makeTwelveWeekGoal({ title: "C" });
    backend.replaceFromUserData({ ...device2.getUserData(), goals: [cloudGoalC] });
    restoreLocalStorage(device2ConflictSnapshot);
    setSignedIn(UID);

    const useCloudMount = device2.mountProvider({ includeConflictDialog: true });
    await waitFor(() => {
      expect(useCloudMount.getLatestState()?.conflictPending).toBe(true);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Lấy bản tài khoản" }));
    fireEvent.click(screen.getByRole("button", { name: "Tải backup và lấy bản tài khoản" }));

    await waitFor(() => {
      expect(device2.getUserData().goals[0]?.title).toBe("C");
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("keeps an offline queue pending, reports offline skip, and drains after reconnect", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    const backend = createMockBackend();
    configureBackend(backend);
    setOnline(false);

    const device = setupDevice(UID, { setAuthUser: setSignedIn });
    const goal = makeTwelveWeekGoal();
    replaceDeviceGoal(device, goal);
    enqueueTaskCompletedMutation(device, goal, true);
    enqueueDailyCheckInMutation(device, goal, makeDailyCheckIn("2026-05-10"));
    enqueueWeeklyReviewMutation(device, goal, makeWeeklyReview(1));
    dispatchUserDataUpdated();

    const mounted = device.mountProvider();
    fireEvent.click(screen.getByRole("button", { name: "Trigger sync now" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mounted.getLatestState()?.pendingCount).toBe(3);
    expect(mounted.getLatestState()?.lastResult?.status).toBe("skipped");
    expect(mounted.getLatestState()?.lastResult?.skipReason).toBe("offline");
    expect(syncServiceMock.post12WeekMutations).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-05-10T10:00:33.000Z"));
    await act(async () => {
      setOnline(true);
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
      await Promise.resolve();
    });

    await flushMicrotasks();
    expect(syncServiceMock.post12WeekMutations).toHaveBeenCalledTimes(1);
    expect(mounted.getLatestState()?.pendingCount).toBe(0);
  });

  it("runs the periodic sync while visible and pauses it while hidden", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    const backend = createMockBackend();
    configureBackend(backend);

    setupDevice(UID, { setAuthUser: setSignedIn });
    setupDevice(UID, { setAuthUser: setSignedIn }).mountProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });
    expect(syncServiceMock.pullTwelveWeekWorkspace).toHaveBeenCalledTimes(1);
    syncServiceMock.pullTwelveWeekWorkspace.mockClear();

    await act(async () => {
      vi.setSystemTime(new Date("2026-05-10T10:05:00.000Z"));
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      await Promise.resolve();
    });
    expect(syncServiceMock.pullTwelveWeekWorkspace).toHaveBeenCalledTimes(1);
    syncServiceMock.pullTwelveWeekWorkspace.mockClear();

    await act(async () => {
      setVisibility("hidden");
      await Promise.resolve();
    });
    await act(async () => {
      vi.setSystemTime(new Date("2026-05-10T10:10:00.000Z"));
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      await Promise.resolve();
    });
    expect(syncServiceMock.pullTwelveWeekWorkspace).not.toHaveBeenCalled();

    await act(async () => {
      vi.setSystemTime(new Date("2026-05-10T10:11:01.000Z"));
      setVisibility("visible");
      await vi.advanceTimersByTimeAsync(300);
      await Promise.resolve();
    });

    expect(syncServiceMock.pullTwelveWeekWorkspace).toHaveBeenCalledTimes(1);
  });
});
