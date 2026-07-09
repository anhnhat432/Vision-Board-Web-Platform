import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Local-first integration test (Task 11.2 — Requirements 9.2, 9.4, 9.5, 9.6).
//
// Mục tiêu: chứng minh vòng thực thi 12-Week (setup, Today, weekly review,
// progress) chạy hoàn toàn trên dữ liệu local, KHÔNG phụ thuộc backend/Firebase.
// Ta mock toàn bộ api client để mọi lời gọi backend đều thất bại (backend down)
// và đặt navigator ở trạng thái offline, rồi kiểm chứng:
//  - Thao tác local vẫn chạy và lưu local < 2s (Req 9.4, 9.5)
//  - Sync remote thất bại KHÔNG làm thay đổi/xoá progress local (Req 9.6)
//  - Sync_Status_Indicator hiển thị offline/error (Req 9.6)
//  - Đọc dữ liệu bản cũ trả về shape hiện hành không mất trường (Req 9.2)

// Mock api client: mọi phương thức đều reject như lỗi mạng (backend/Firebase down).
const apiClientMock = vi.hoisted(() => {
  const networkError = () =>
    Promise.reject({ message: "Lỗi kết nối mạng. Kiểm tra mạng rồi thử lại.", isNetworkError: true });
  return {
    get: vi.fn(networkError),
    post: vi.fn(networkError),
    patch: vi.fn(networkError),
    put: vi.fn(networkError),
    delete: vi.fn(networkError),
  };
});

vi.mock("@/lib/api/apiClient", () => ({
  get: apiClientMock.get,
  post: apiClientMock.post,
  patch: apiClientMock.patch,
  put: apiClientMock.put,
  delete: apiClientMock.delete,
  apiClient: apiClientMock,
}));

import {
  getUserData,
  recomputeGoalProgressFromWeeks,
  resetUserDataCache,
  saveUserData,
  toggleTwelveWeekTask,
  updateGoal,
} from "@/app/utils/storage";
import {
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  MOTIVATIONAL_QUOTES,
  STORAGE_KEY,
} from "@/app/utils/storage-constants";
import { createEmptyUserData } from "@/app/utils/storage-demo-data";
import { getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type {
  Goal,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalWeeklyReview,
  UserData,
} from "@/app/utils/storage-types";
import { resolveSyncIndicatorStatus } from "@/app/utils/sync-indicator-status";
import { post12WeekMutations } from "@/services/syncService";

function makeTask(overrides: Partial<TwelveWeekTaskInstance> = {}): TwelveWeekTaskInstance {
  return {
    id: overrides.id ?? "tw_task_1_tactic_1_0",
    weekNumber: overrides.weekNumber ?? 1,
    scheduledDate: overrides.scheduledDate ?? "2026-03-03",
    title: overrides.title ?? "Giữ nhịp hành động",
    leadIndicatorName: overrides.leadIndicatorName ?? "Ship",
    isCore: overrides.isCore ?? true,
    completed: overrides.completed ?? false,
    completedAt: overrides.completedAt,
    tacticId: overrides.tacticId ?? "tactic_1",
    rescheduledFrom: overrides.rescheduledFrom,
    skipped: overrides.skipped,
  };
}

function createSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship core flow",
    lagMetric: { name: "Lag", unit: "units", target: "100", currentValue: "" },
    // target 4 + schedule [0,2,4,6] => 4 task/tuần, id ổn định tw_task_<week>_tactic_1_<0..3>.
    leadIndicators: [
      {
        id: "tactic_1",
        name: "Ship",
        target: "4",
        unit: "times/week",
        type: "core",
        priority: 1,
        schedule: [0, 2, 4, 6],
      },
    ],
    milestones: { week4: "", week8: "", week12: "" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-03-02",
    endDate: "2026-05-24",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [
      makeTask({ id: "tw_task_1_tactic_1_0", scheduledDate: "2026-03-03" }),
      makeTask({ id: "tw_task_1_tactic_1_1", scheduledDate: "2026-03-04" }),
      makeTask({ id: "tw_task_1_tactic_1_2", scheduledDate: "2026-03-05" }),
      makeTask({ id: "tw_task_1_tactic_1_3", scheduledDate: "2026-03-06" }),
    ],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(12),
    ...overrides,
  };
}

function seedGoalWithSystem(goalId = "goal_local_first", system = createSystem()): void {
  const data = createEmptyUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
  const goal: Goal = {
    id: goalId,
    category: "Career",
    title: "Local-first goal",
    description: "",
    deadline: "2026-06-30",
    tasks: [],
    createdAt: "2026-03-01T00:00:00.000Z",
    twelveWeekSystem: system,
  };
  data.goals = [goal];
  expect(saveUserData(data)).toBe(true);
}

/** Đọc lại system đã lưu (sau normalize) và chọn `count` task id của tuần 1. */
function pickWeekOneTaskIds(goalId: string, count: number): string[] {
  const system = getUserData().goals.find((goal) => goal.id === goalId)?.twelveWeekSystem as TwelveWeekSystem;
  const ids = system.taskInstances
    .filter((task) => task.weekNumber === 1)
    .map((task) => task.id)
    .sort();
  expect(ids.length).toBeGreaterThanOrEqual(count);
  return ids.slice(0, count);
}

function setNavigatorOnline(online: boolean): void {
  Object.defineProperty(navigator, "onLine", { value: online, writable: true, configurable: true });
}

const originalOnLine = navigator.onLine;

beforeEach(() => {
  localStorage.clear();
  resetUserDataCache();
  apiClientMock.get.mockClear();
  apiClientMock.post.mockClear();
  apiClientMock.patch.mockClear();
  apiClientMock.put.mockClear();
  apiClientMock.delete.mockClear();
  // Backend/Firebase không khả dụng: offline.
  setNavigatorOnline(false);
});

afterEach(() => {
  setNavigatorOnline(originalOnLine);
  vi.restoreAllMocks();
});

describe("Local-first 12-Week loop khi backend/Firebase offline (Req 9.4, 9.5)", () => {
  it("chạy setup, Today, weekly review, progress trên local và lưu local < 2s mà không gọi backend", () => {
    const goalId = "goal_local_first";

    const startedAt = performance.now();

    // Setup: tạo cycle 12-Week mới dựa trên dữ liệu local (Req 9.5).
    seedGoalWithSystem(goalId);

    // Today: hoàn thành 2 task trong ngày (thao tác local thuần).
    const [taskIdA, taskIdB] = pickWeekOneTaskIds(goalId, 2);
    expect(toggleTwelveWeekTask(goalId, taskIdA, true)).toBe(true);
    expect(toggleTwelveWeekTask(goalId, taskIdB, true)).toBe(true);

    // Weekly review: ghi một weekly review + daily check-in vào local.
    const weeklyReview: UniversalWeeklyReview = {
      weekNumber: 1,
      leadCompletionPercent: 50,
      lagProgressValue: "50",
      biggestOutputThisWeek: "Ship đều 2 ngày",
      mainObstacle: "",
      nextWeekPriority: "Giữ nhịp",
      workloadDecision: "keep same",
      reviewCompleted: true,
      progressScore: 4,
      disciplineScore: 4,
      focusScore: 5,
      improvementScore: 5,
      outputQualityScore: 5,
    };
    const checkIn: UniversalDailyCheckIn = {
      date: "2026-03-03",
      didWorkToday: true,
      whichLeadIndicatorWorkedOn: "Ship",
      amountDone: "1/1",
      outputCreated: "Bản build",
      obstacleOrIssue: "",
      dailySelfRating: 4,
      optionalNote: "Local check-in phải sống sót.",
      mood: "steady",
      updatedCount: 1,
    };
    const currentSystem = getUserData().goals[0]?.twelveWeekSystem as TwelveWeekSystem;
    updateGoal(goalId, {
      twelveWeekSystem: { ...currentSystem, weeklyReviews: [weeklyReview], dailyCheckIns: [checkIn] },
    });

    // Progress: tính lại progress từ tuần (local thuần).
    const progress = recomputeGoalProgressFromWeeks(goalId);

    const elapsedMs = performance.now() - startedAt;

    // Req 9.5: hoàn tất lưu local < 2s.
    expect(elapsedMs).toBeLessThan(2000);

    // Req 9.4: thao tác chạy trên local, không phụ thuộc backend.
    expect(apiClientMock.get).not.toHaveBeenCalled();
    expect(apiClientMock.post).not.toHaveBeenCalled();
    expect(apiClientMock.patch).not.toHaveBeenCalled();
    expect(apiClientMock.put).not.toHaveBeenCalled();
    expect(apiClientMock.delete).not.toHaveBeenCalled();

    // Dữ liệu được lưu local đúng.
    const savedSystem = getUserData().goals[0]?.twelveWeekSystem as TwelveWeekSystem;
    const completedTaskIds = savedSystem.taskInstances
      .filter((task) => task.completed)
      .map((task) => task.id)
      .sort();
    expect(completedTaskIds).toEqual([taskIdA, taskIdB].sort());
    expect(savedSystem.weeklyReviews).toHaveLength(1);
    expect(savedSystem.dailyCheckIns[0]?.optionalNote).toBe("Local check-in phải sống sót.");
    // Progress = round(completed / total * 100) tính từ dữ liệu local.
    const totalTasks = savedSystem.taskInstances.length;
    expect(progress).toBe(Math.round((2 / totalTasks) * 100));

    // Indicator: real-mode signed-in, offline => "offline" (Req 9.6).
    expect(
      resolveSyncIndicatorStatus({
        appMode: "real",
        signedIn: true,
        networkStatus: "offline",
        syncing: false,
        timedOutOrErrored: false,
        lastSyncSucceeded: false,
      }),
    ).toBe("offline");
  });
});

describe("Sync remote thất bại KHÔNG thay đổi progress local (Req 9.6)", () => {
  it("giữ nguyên byte-for-byte dữ liệu local sau khi post12WeekMutations reject", async () => {
    const goalId = "goal_local_first";
    seedGoalWithSystem(goalId);
    const [taskIdA, taskIdB] = pickWeekOneTaskIds(goalId, 2);
    expect(toggleTwelveWeekTask(goalId, taskIdA, true)).toBe(true);
    expect(toggleTwelveWeekTask(goalId, taskIdB, true)).toBe(true);

    const rawBeforeSync = localStorage.getItem(STORAGE_KEY);
    const progressBeforeSync = recomputeGoalProgressFromWeeks(goalId);
    expect(progressBeforeSync).toBeGreaterThan(0);

    // Thử sync remote — backend down nên reject.
    await expect(
      post12WeekMutations({
        batchId: "batch_local_first",
        clientGeneratedAt: "2026-03-03T00:00:00.000Z",
        mutations: [],
      }),
    ).rejects.toBeTruthy();
    expect(apiClientMock.post).toHaveBeenCalledTimes(1);

    // Req 9.6: progress local bất biến sau khi sync fail.
    const rawAfterSync = localStorage.getItem(STORAGE_KEY);
    expect(rawAfterSync).toBe(rawBeforeSync);

    resetUserDataCache();
    expect(recomputeGoalProgressFromWeeks(goalId)).toBe(progressBeforeSync);
    const reloadedSystem = getUserData().goals[0]?.twelveWeekSystem as TwelveWeekSystem;
    expect(reloadedSystem.taskInstances.filter((task) => task.completed)).toHaveLength(2);
  });

  it("hiển thị trạng thái error khi sync timeout/lỗi server (online nhưng backend lỗi)", () => {
    expect(
      resolveSyncIndicatorStatus({
        appMode: "real",
        signedIn: true,
        networkStatus: "online",
        syncing: false,
        timedOutOrErrored: true,
        lastSyncSucceeded: false,
      }),
    ).toBe("error");
  });
});

describe("Đọc dữ liệu bản cũ tương thích shape hiện hành (Req 9.2)", () => {
  it("nâng cấp localStorage bản v6 lên shape hiện hành mà không mất trường dữ liệu", () => {
    // Dựng dữ liệu bản cũ (v6) với 12-Week system, check-in kiểu cũ (không updatedCount)
    // và weekly review kiểu legacy.
    const legacyData = createEmptyUserData({
      currentStorageVersion: 6,
      defaultAppPreferences: DEFAULT_APP_PREFERENCES,
      motivationalQuotes: MOTIVATIONAL_QUOTES,
    });
    const legacySystem = createSystem({
      dailyCheckIns: [
        {
          date: "2026-03-03",
          mood: "steady",
        },
      ] as unknown as TwelveWeekSystem["dailyCheckIns"],
      weeklyReviews: [
        {
          weekNumber: 1,
          leadCompletionPercent: 75,
          lagProgressValue: "30",
          biggestOutputThisWeek: "Legacy win",
          mainObstacle: "Legacy miss",
          nextWeekPriority: "Keep focus block",
          workloadDecision: "keep same",
          reviewCompleted: true,
          progressScore: 4,
          disciplineScore: 4,
          focusScore: 5,
          improvementScore: 5,
          outputQualityScore: 5,
          completedLeadIndicators: 2,
        },
      ] as unknown as TwelveWeekSystem["weeklyReviews"],
    });
    // Đánh dấu 1 task đã hoàn thành để kiểm chứng trường được giữ nguyên.
    legacySystem.taskInstances[0]!.completed = true;
    legacySystem.taskInstances[0]!.completedAt = "2026-03-03T08:00:00.000Z";

    const legacyGoal: Goal = {
      id: "legacy_goal",
      category: "Career",
      title: "Legacy goal title",
      description: "Mô tả cũ cần được giữ",
      deadline: "2026-06-30",
      tasks: [],
      createdAt: "2026-03-01T00:00:00.000Z",
      twelveWeekSystem: legacySystem,
    };
    legacyData.goals = [legacyGoal];

    // Ghi trực tiếp bản cũ vào localStorage (mô phỏng dữ liệu do phiên bản trước lưu).
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyData));
    resetUserDataCache();

    // Core_Flow_UI đọc dữ liệu -> phải trả về shape hiện hành, không mất trường (Req 9.2).
    const loaded: UserData = getUserData();

    expect(loaded.storageVersion).toBe(CURRENT_STORAGE_VERSION);

    const loadedGoal = loaded.goals.find((goal) => goal.id === "legacy_goal");
    expect(loadedGoal).toBeDefined();
    expect(loadedGoal?.title).toBe("Legacy goal title");
    expect(loadedGoal?.description).toBe("Mô tả cũ cần được giữ");

    const loadedSystem = loadedGoal?.twelveWeekSystem as TwelveWeekSystem;
    // Task cũ (kèm completed/completedAt) được giữ nguyên.
    const firstTask = loadedSystem.taskInstances.find((task) => task.id === "tw_task_1_tactic_1_0");
    expect(firstTask?.completed).toBe(true);
    expect(firstTask?.completedAt).toBe("2026-03-03T08:00:00.000Z");
    expect(loadedSystem.taskInstances.length).toBeGreaterThanOrEqual(4);

    // Daily check-in kiểu cũ được giữ (date + mood), updatedCount vẫn undefined.
    expect(loadedSystem.dailyCheckIns[0]?.date).toBe("2026-03-03");
    expect(loadedSystem.dailyCheckIns[0]?.mood).toBe("steady");
    expect(loadedSystem.dailyCheckIns[0]?.updatedCount).toBeUndefined();

    // Weekly review legacy được migrate sang shape WAM hiện hành, giữ nội dung gốc.
    const review = loadedSystem.weeklyReviews[0];
    expect(review?.weekNumber).toBe(1);
    expect(review?.biggestOutputThisWeek).toBe("Legacy win");
    expect(review?.insights).toBe("Legacy win");
    expect(review?.nextWeekCommitments).toEqual(["Keep focus block"]);
    expect(review?.executionScore).toBe(75);
  });
});
