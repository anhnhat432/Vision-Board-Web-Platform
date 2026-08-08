import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeAction } from "../executeAction";
import type { AssistantAction } from "../parseActions";

// Mock các module liên quan đến storage và feasibility
vi.mock("@/app/utils/storage", () => {
  const initialMockUserData = {
    storageVersion: 1,
    userId: "assistant_test_user",
    wheelOfLifeHistory: [],
    goals: [
      {
        id: "goal_inactive",
        title: "Inactive Goal",
        category: "career",
        description: "",
        deadline: "2026-10-01",
        createdAt: "2026-06-01T00:00:00.000Z",
        tasks: [],
      },
      {
        id: "goal_123",
        title: "Gym Goal",
        category: "health",
        description: "",
        deadline: "2026-10-01",
        createdAt: "2026-06-01T00:00:00.000Z",
        tasks: [],
        twelveWeekSystem: {
          lagMetric: { name: "Sessions", unit: "session", target: "12", currentValue: "0" },
          currentWeek: 1,
          totalWeeks: 12,
          taskInstances: [
            {
              id: "task_abc",
              title: "Tập ngực",
              weekNumber: 1,
              scheduledDate: "2026-06-03",
              leadIndicatorName: "Tập ngực",
              isCore: true,
              completed: false,
            },
          ],
          dailyCheckIns: [],
          weeklyReviews: [],
          scoreboard: [],
        },
      },
      {
        id: "goal_selected",
        title: "Selected Goal",
        category: "learning",
        description: "",
        deadline: "2026-10-01",
        createdAt: "2026-06-01T00:00:00.000Z",
        tasks: [],
        twelveWeekSystem: {
          lagMetric: { name: "Sessions", unit: "session", target: "12", currentValue: "0" },
          currentWeek: 1,
          totalWeeks: 12,
          taskInstances: [
            {
              id: "task_selected",
              title: "Tập ngực",
              weekNumber: 1,
              scheduledDate: "2026-06-03",
              leadIndicatorName: "Tập ngực",
              isCore: true,
              completed: false,
            },
          ],
          dailyCheckIns: [],
          weeklyReviews: [],
          scoreboard: [],
        },
      },
    ],
    currentWheelOfLife: [{ name: "Sức khỏe", score: 8, color: "red" }],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: {
      allowLocalAnalytics: false,
      enableInAppReminders: false,
      enableBrowserNotifications: false,
      keepLocalOutbox: false,
      preferredReminderHour: 19,
    },
    onboardingCompleted: true,
  };

  // Mutable reference: saveUserData updates this, getUserData reads it
  let currentData = JSON.parse(JSON.stringify(initialMockUserData));

  return {
    getUserData: vi.fn(() => JSON.parse(JSON.stringify(currentData))),
    saveUserData: vi.fn((data: unknown) => {
      currentData = JSON.parse(JSON.stringify(data));
      return true;
    }),
    addReflection: vi.fn(),
    addGoal: vi.fn(() => "new_goal_999"),
    APP_STORAGE_KEYS: {
      selectedFocusArea: "selected_focus_area",
      pendingSmartGoal: "pending_smart_goal",
      pendingFeasibilityAnswers: "pending_feasibility_answers",
      pendingFeasibilityResult: "pending_feasibility_result",
      pending12WeekSetupDraft: "pending_12_week_setup_draft",
      latest12WeekGoalId: "latest_12_week_goal_id",
      latest12WeekSystemGoalId: "latest_12_week_system_goal_id",
    },
    // Expose reset for beforeEach
    __resetMockData: () => {
      currentData = JSON.parse(JSON.stringify(initialMockUserData));
    },
  };
});

vi.mock("@/app/utils/storage-goal-ops", () => ({
  toggleTwelveWeekTaskInData: vi.fn(
    (
      data: {
        goals?: Array<{ id: string; twelveWeekSystem?: { taskInstances?: Array<{ id: string; completed: boolean }> } }>;
      },
      goalId: string,
      taskId: string,
      completed: boolean,
    ) => {
      const goal = data.goals?.find((g) => g.id === goalId);
      if (!goal?.twelveWeekSystem?.taskInstances) return false;
      const task = goal.twelveWeekSystem.taskInstances.find((t) => t.id === taskId);
      if (!task) return false;
      task.completed = completed;
      return true;
    },
  ),
}));

vi.mock("@/app/utils/storage-achievement-ops", () => ({
  checkAchievementsInData: vi.fn(),
}));

vi.mock("@/app/pages/FeasibilityCheck/helpers", () => ({
  buildResult: vi.fn(() => ({
    type: "realistic",
    title: "Mục tiêu khả thi",
    summary: "Ngon lành",
    recommendation: "Cứ thế mà làm",
    readinessScore: 16,
    adjustedScore: 16,
    wheelScore: 8,
    diagnosticScore: 28,
    maxDiagnosticScore: 28,
    axisScores: [],
    bottleneck: { axis: "time", label: "Thời gian", score: 3, action: "làm đi" },
    planLoad: "balanced",
    weeklyCapacity: "medium",
    firstWeekGuidance: "nhẹ nhàng",
    scopeRecommendation: "vừa phải",
    smartGoalQualityLevel: "strong",
    smartGoalQualityNote: "tốt",
  })),
}));

vi.mock("@/app/utils/storage-twelve-week", () => ({
  buildDerivedScoreboard: vi.fn(() => []),
  getDefaultScoreboard: vi.fn(() => []),
  getTwelveWeekWeekCompletion: vi.fn(() => ({ completed: 0, total: 1, percent: 0, isEmpty: false })),
  getActiveTwelveWeekGoal: vi.fn((goals: Array<{ id: string }> | null | undefined, preferredGoalId?: string | null) => {
    if (!goals) return null;
    if (preferredGoalId) {
      const preferredGoal = goals.find((goal) => goal.id === preferredGoalId);
      if (preferredGoal) return preferredGoal;
    }
    return goals.find((goal) => goal.id === "goal_123") ?? null;
  }),
}));

import { APP_STORAGE_KEYS, addGoal, addReflection, getUserData, saveUserData } from "@/app/utils/storage";
import { toggleTwelveWeekTaskInData } from "@/app/utils/storage-goal-ops";
import { listStoredPendingMutations } from "@/features/plan12week/persistence/mutationQueue";

// biome-ignore lint/suspicious/noExplicitAny: test helper reset function
const { __resetMockData } = (await import("@/app/utils/storage")) as any;

describe("executeAction - Phase 5 Action Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __resetMockData();
  });

  it("executes create_life_insight_note successfully", async () => {
    const action: AssistantAction = {
      id: "a1",
      type: "create_life_insight_note",
      label: "Tạo ghi chú",
      payload: {
        title: "Insight sức khỏe",
        content: "Cần tập thể dục đều đặn hơn.",
        mood: "high",
        entryType: "freeform",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã tạo ghi chú phân tích");
    expect(addReflection).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Insight sức khỏe",
        content: "Cần tập thể dục đều đặn hơn.",
        mood: "high",
        entryType: "freeform",
      }),
    );
  });

  it("executes create_smart_goal_from_insight successfully", async () => {
    const action: AssistantAction = {
      id: "a2",
      type: "create_smart_goal_from_insight",
      label: "Tạo mục tiêu SMART",
      payload: {
        title: "Tập gym 3 buổi/tuần",
        category: "health",
        description: "Để có sức khỏe tốt hơn",
        focusArea: "Sức khỏe",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã tạo mục tiêu SMART");
    expect(addGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Tập gym 3 buổi/tuần",
        category: "health",
        description: "Để có sức khỏe tốt hơn",
        focusArea: "Sức khỏe",
      }),
    );
    expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Sức khỏe");
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal)).toContain("new_goal_999");
  });

  it("executes suggest_feasibility_inputs successfully", async () => {
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Sức khỏe");
    const action: AssistantAction = {
      id: "a3",
      type: "suggest_feasibility_inputs",
      label: "Đề xuất câu trả lời khả thi",
      payload: {
        answers: {
          1: "3to5",
          2: "energy_stable",
          3: "resources_mostly_ready",
          4: "realistic",
          5: "time",
          6: "mostly",
          7: "ready",
        },
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã đề xuất các câu trả lời trắc nghiệm khả thi");
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers)).toContain("3to5");
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult)).toContain("realistic");
  });

  it("executes create_twelve_week_plan_draft successfully", async () => {
    const action: AssistantAction = {
      id: "a4",
      type: "create_twelve_week_plan_draft",
      label: "Tạo draft 12 tuần",
      payload: {
        week12Outcome: "Giảm 3kg mỡ thừa",
        lagMetricName: "Cân nặng",
        lagMetricTarget: "70",
        lagMetricUnit: "kg",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã tạo/cập nhật bản nháp");
    const stored = localStorage.getItem(APP_STORAGE_KEYS.pending12WeekSetupDraft);
    expect(stored).toContain("Giảm 3kg mỡ thừa");
    expect(stored).toContain("Cân nặng");
  });

  it("executes add_weekly_review successfully", async () => {
    const action: AssistantAction = {
      id: "a5",
      type: "add_weekly_review",
      label: "Add weekly review",
      payload: {
        goalId: "goal_123",
        weekNumber: 1,
        mainObstacle: "Lười biếng",
        nextWeekPriority: "Chăm chỉ hơn",
        workloadDecision: "keep same",
        biggestOutputThisWeek: "Tập 3 buổi",
        reflection: "Khá tốt",
        adjustments: "Ngủ sớm hơn",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã cập nhật review tuần 1");
    expect(saveUserData).toHaveBeenCalled();
  });

  it("queues Assistant weekly review through the canonical contract without fake ratings", async () => {
    const action: AssistantAction = {
      id: "a5_canonical",
      type: "add_weekly_review",
      label: "Add canonical weekly review",
      payload: {
        goalId: "goal_123",
        weekNumber: 1,
        mainObstacle: "Late meetings",
        nextWeekPriority: "Ship portfolio",
        workloadDecision: "reduce slightly",
        biggestOutputThisWeek: "Finished case study",
        reflection: "Morning work was more reliable",
        adjustments: "Train twice",
      },
    };

    const result = await executeAction(action);
    const review = getUserData().goals.find((goal) => goal.id === "goal_123")?.twelveWeekSystem?.weeklyReviews[0];
    const mutations = listStoredPendingMutations(null).filter((item) => item.kind === "weekly_review_upserted");

    expect(result.success).toBe(true);
    expect(review).toEqual(
      expect.objectContaining({
        executionScore: 0,
        insights: "Morning work was more reliable",
        nextWeekCommitments: ["Ship portfolio"],
      }),
    );
    expect(review).not.toHaveProperty("progressScore");
    expect(review).not.toHaveProperty("disciplineScore");
    expect(review).not.toHaveProperty("focusScore");
    expect(review).not.toHaveProperty("improvementScore");
    expect(review).not.toHaveProperty("outputQualityScore");
    expect(mutations).toHaveLength(1);
  });

  it("preserves unrelated existing review fields during a partial Assistant update", async () => {
    const data = getUserData();
    const goal = data.goals.find((item) => item.id === "goal_123");
    if (!goal?.twelveWeekSystem) throw new Error("Expected Assistant test goal");
    goal.twelveWeekSystem.weeklyReviews = [
      {
        weekNumber: 1,
        leadCompletionPercent: 50,
        executionScore: 50,
        lagProgressValue: "20",
        biggestOutputThisWeek: "Existing output",
        mainObstacle: "Existing obstacle",
        nextWeekPriority: "Existing priority",
        workloadDecision: "keep same",
        reviewCompleted: true,
        commitmentsKept: ["Deep work"],
        commitmentsMissed: ["Exercise"],
        insights: "Existing insight",
        nextWeekCommitments: ["Finish portfolio", "Train twice"],
        keepTactic: "Morning work",
        reduceTactic: "Late meetings",
        progressScore: 7,
      },
    ];
    saveUserData(data);

    const action: AssistantAction = {
      id: "a5_partial",
      type: "add_weekly_review",
      label: "Update weekly review partially",
      payload: {
        goalId: "goal_123",
        weekNumber: 1,
        mainObstacle: "Updated obstacle",
        nextWeekPriority: "Updated priority",
        reflection: "Updated reflection",
      },
    };

    const result = await executeAction(action);
    const review = getUserData().goals.find((item) => item.id === "goal_123")?.twelveWeekSystem?.weeklyReviews[0];

    expect(result.success).toBe(true);
    expect(review).toEqual(
      expect.objectContaining({
        mainObstacle: "Updated obstacle",
        nextWeekPriority: "Updated priority",
        commitmentsKept: ["Deep work"],
        commitmentsMissed: ["Exercise"],
        insights: "Existing insight",
        nextWeekCommitments: ["Finish portfolio", "Train twice"],
        keepTactic: "Morning work",
        reduceTactic: "Late meetings",
        progressScore: 7,
      }),
    );
    expect(listStoredPendingMutations(null).filter((item) => item.kind === "weekly_review_upserted")).toHaveLength(1);
  });

  it("executes reschedule_task successfully", async () => {
    const action: AssistantAction = {
      id: "a6",
      type: "reschedule_task",
      label: "Dời lịch task",
      payload: {
        taskId: "task_abc",
        scheduledDate: "2026-06-04",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã dời lịch task sang ngày 2026-06-04");
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes reschedule_task successfully using title fallback", async () => {
    const action: AssistantAction = {
      id: "a6_title",
      type: "reschedule_task",
      label: "Dời lịch task bằng tên",
      payload: {
        taskId: "Tập ngực",
        scheduledDate: "2026-06-05",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã dời lịch task sang ngày 2026-06-05");
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes update_task_status successfully", async () => {
    const action: AssistantAction = {
      id: "a7",
      type: "update_task_status",
      label: "Đổi status task",
      payload: {
        taskId: "task_abc",
        completed: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã đánh dấu hoàn thành nhiệm vụ");
    expect(toggleTwelveWeekTaskInData).toHaveBeenCalledWith(expect.anything(), "goal_123", "task_abc", true);
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes update_task_status successfully using title fallback", async () => {
    const action: AssistantAction = {
      id: "a7_title",
      type: "update_task_status",
      label: "Đổi status task bằng tên",
      payload: {
        taskId: "Tập ngực",
        completed: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã đánh dấu hoàn thành nhiệm vụ");
    expect(toggleTwelveWeekTaskInData).toHaveBeenCalledWith(expect.anything(), "goal_123", "task_abc", true);
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes mark_task_done successfully", async () => {
    const action: AssistantAction = {
      id: "a8",
      type: "mark_task_done",
      label: "Đánh dấu xong",
      payload: {
        taskId: "task_abc",
        done: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã đánh dấu xong: Tập ngực");
    expect(toggleTwelveWeekTaskInData).toHaveBeenCalledWith(expect.anything(), "goal_123", "task_abc", true);
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes mark_task_done successfully using title fallback", async () => {
    const action: AssistantAction = {
      id: "a8_title",
      type: "mark_task_done",
      label: "Đánh dấu xong bằng tên",
      payload: {
        taskId: "Tập ngực",
        done: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã đánh dấu xong: Tập ngực");
    expect(toggleTwelveWeekTaskInData).toHaveBeenCalledWith(expect.anything(), "goal_123", "task_abc", true);
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes mark_task_done against the selected 12-week goal when titles overlap", async () => {
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, "goal_selected");
    const action: AssistantAction = {
      id: "a8_selected",
      type: "mark_task_done",
      label: "Đánh dấu xong task trong goal đang chọn",
      payload: {
        taskId: "Tập ngực",
        done: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã đánh dấu xong: Tập ngực");
    expect(toggleTwelveWeekTaskInData).toHaveBeenCalledWith(expect.anything(), "goal_selected", "task_selected", true);
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes update_task_status against the selected 12-week goal when titles overlap", async () => {
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, "goal_selected");
    const action: AssistantAction = {
      id: "a7_selected",
      type: "update_task_status",
      label: "Đổi status task trong goal đang chọn",
      payload: {
        taskId: "Tập ngực",
        completed: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã đánh dấu hoàn thành nhiệm vụ");
    expect(toggleTwelveWeekTaskInData).toHaveBeenCalledWith(expect.anything(), "goal_selected", "task_selected", true);
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes create_task today successfully", async () => {
    const action: AssistantAction = {
      id: "a9_today",
      type: "create_task",
      label: "Tạo task hôm nay",
      payload: {
        title: "Chạy bộ buổi sáng",
        scheduledDate: "today",
        isCore: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã tạo task: Chạy bộ buổi sáng");
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes create_task tomorrow successfully", async () => {
    const action: AssistantAction = {
      id: "a9_tomorrow",
      type: "create_task",
      label: "Tạo task ngày mai",
      payload: {
        title: "Học lập trình",
        scheduledDate: "tomorrow",
        isCore: false,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã tạo task: Học lập trình");
    expect(saveUserData).toHaveBeenCalled();
  });

  it("executes create_task with exact date successfully", async () => {
    const action: AssistantAction = {
      id: "a9_exact",
      type: "create_task",
      label: "Tạo task ngày cụ thể",
      payload: {
        title: "Đọc sách",
        scheduledDate: "2026-06-10",
        isCore: false,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã tạo task: Đọc sách");
    expect(saveUserData).toHaveBeenCalled();
  });

  it("rejects create_task with invalid date", async () => {
    const action: AssistantAction = {
      id: "a9_invalid",
      type: "create_task",
      label: "Tạo task ngày sai",
      payload: {
        title: "Task lỗi",
        scheduledDate: "not-a-date",
        isCore: false,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Ngày lập lịch không hợp lệ");
  });

  it("executes create_task using active goal instead of first goal", async () => {
    const action: AssistantAction = {
      id: "a9_active",
      type: "create_task",
      label: "Tạo task vào active goal",
      payload: {
        title: "Tập squat",
        scheduledDate: "today",
        isCore: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã tạo task: Tập squat");

    const { getActiveTwelveWeekGoal } = await import("@/app/utils/storage-twelve-week");
    expect(getActiveTwelveWeekGoal).toHaveBeenCalled();
  });

  it("executes reschedule_task against the selected 12-week goal when titles overlap", async () => {
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, "goal_selected");
    const action: AssistantAction = {
      id: "a10_reschedule",
      type: "reschedule_task",
      label: "Dời lịch task trong goal đang chọn",
      payload: {
        taskId: "Tập ngực",
        scheduledDate: "2026-06-08",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Đã dời lịch task sang ngày 2026-06-08");
    expect(saveUserData).toHaveBeenCalled();
  });

  it("does not call saveUserData when action execution fails", async () => {
    const action: AssistantAction = {
      id: "fail_action",
      type: "mark_task_done",
      label: "Đánh dấu task không tồn tại",
      payload: {
        taskId: "non_existent_task_id",
        done: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(false);
    expect(saveUserData).not.toHaveBeenCalled();
  });

  it("limits audit log to 50 records in localStorage", async () => {
    const existingLogs = Array.from({ length: 49 }, (_, i) => ({
      timestamp: new Date().toISOString(),
      type: "navigate_to",
      label: `Log ${i}`,
      success: true,
      message: "success",
    }));
    localStorage.setItem("assistant.action_audit_log", JSON.stringify(existingLogs));

    const action: AssistantAction = {
      id: "a11",
      type: "mark_task_done",
      label: "Missing task",
      payload: {
        taskId: "missing_task",
        done: true,
      },
    };
    await executeAction(action);
    await executeAction(action);

    const storedLogs = JSON.parse(localStorage.getItem("assistant.action_audit_log") || "[]");
    expect(storedLogs).toHaveLength(50);
  });
});

describe("executeAction - Phase 5 State Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __resetMockData();
  });

  it("mark_task_done returns verified=true after successful execution", async () => {
    const action: AssistantAction = {
      id: "v1",
      type: "mark_task_done",
      label: "Hoàn thành task",
      payload: { taskId: "task_abc", done: true },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.alreadyDone).toBeUndefined();
    expect(result.message).toContain("Đã đánh dấu xong");
  });

  it("mark_task_done returns success=false when state verification fails", async () => {
    vi.mocked(saveUserData).mockImplementationOnce(() => false);

    const action: AssistantAction = {
      id: "v1_verify_fail",
      type: "mark_task_done",
      label: "Hoàn thành task",
      payload: { taskId: "task_abc", done: true },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(false);
    expect(result.verified).toBe(false);
    expect(result.message).toContain("chưa xác minh được");
  });

  it("mark_task_done on already-completed task returns alreadyDone=true", async () => {
    // First call: mark done
    const action1: AssistantAction = {
      id: "v2a",
      type: "mark_task_done",
      label: "Hoàn thành task lần 1",
      payload: { taskId: "task_abc", done: true },
    };
    await executeAction(action1);

    // Second call: same task should be alreadyDone
    const action2: AssistantAction = {
      id: "v2b",
      type: "mark_task_done",
      label: "Hoàn thành task lần 2",
      payload: { taskId: "task_abc", done: true },
    };
    const result = await executeAction(action2);

    expect(result.success).toBe(true);
    expect(result.alreadyDone).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("đã được hoàn thành từ trước");
  });

  it("create_task returns verified=true after successful execution", async () => {
    const action: AssistantAction = {
      id: "v3",
      type: "create_task",
      label: "Tạo task",
      payload: {
        title: "Chạy bộ test",
        scheduledDate: "today",
        isCore: false,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("Đã tạo task");
  });

  it("create_goal returns verified=true after successful execution", async () => {
    const action: AssistantAction = {
      id: "v4",
      type: "create_goal",
      label: "Tạo mục tiêu",
      payload: {
        title: "Học IELTS",
        category: "career",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("Đã tạo mục tiêu");
  });

  it("reschedule_task returns verified=true after successful execution", async () => {
    const action: AssistantAction = {
      id: "v5",
      type: "reschedule_task",
      label: "Dời lịch task",
      payload: {
        taskId: "task_abc",
        scheduledDate: "2026-06-10",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("Đã dời lịch task sang ngày 2026-06-10");
  });

  it("add_weekly_review returns verified=true after successful execution", async () => {
    const action: AssistantAction = {
      id: "v6",
      type: "add_weekly_review",
      label: "Thêm review tuần 1",
      payload: {
        goalId: "goal_123",
        weekNumber: 1,
        mainObstacle: "Mệt mỏi",
        nextWeekPriority: "Nghỉ ngơi",
        workloadDecision: "keep same",
        biggestOutputThisWeek: "Tập 3 buổi",
        reflection: "OK",
        adjustments: "",
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("Đã cập nhật review tuần 1");
  });

  it("update_task_status returns verified=true after successful execution", async () => {
    const action: AssistantAction = {
      id: "v7",
      type: "update_task_status",
      label: "Cập nhật status",
      payload: {
        taskId: "task_abc",
        completed: true,
      },
    };

    const result = await executeAction(action);

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("Đã đánh dấu hoàn thành");
  });

  it("audit log includes verified and alreadyDone fields", async () => {
    const action: AssistantAction = {
      id: "v8",
      type: "mark_task_done",
      label: "Hoàn thành task",
      payload: { taskId: "task_abc", done: true },
    };

    await executeAction(action);

    const storedLogs = JSON.parse(localStorage.getItem("assistant.action_audit_log") || "[]");
    expect(storedLogs.length).toBeGreaterThan(0);
    expect(storedLogs[0].verified).toBe(true);
    expect(storedLogs[0].alreadyDone).toBeUndefined();
  });
});
