import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeAction } from "../executeAction";
import type { AssistantAction } from "../parseActions";

// Mock các module liên quan đến storage và feasibility
vi.mock("@/app/utils/storage", () => {
  const mockUserData = {
    goals: [
      {
        id: "goal_123",
        title: "Gym Goal",
        category: "health",
        tasks: [],
        twelveWeekSystem: {
          currentWeek: 1,
          totalWeeks: 12,
          taskInstances: [
            {
              id: "task_abc",
              title: "Tập ngực",
              scheduledDate: "2026-06-03",
              completed: false,
            },
          ],
          weeklyReviews: [],
          scoreboard: [],
        },
      },
    ],
    currentWheelOfLife: [{ name: "Sức khỏe", score: 8, color: "red" }],
  };

  return {
    getUserData: vi.fn(() => mockUserData),
    saveUserData: vi.fn(),
    addReflection: vi.fn(),
    addGoal: vi.fn(() => "new_goal_999"),
    APP_STORAGE_KEYS: {
      selectedFocusArea: "selected_focus_area",
      pendingSmartGoal: "pending_smart_goal",
      pendingFeasibilityAnswers: "pending_feasibility_answers",
      pendingFeasibilityResult: "pending_feasibility_result",
      pending12WeekSetupDraft: "pending_12_week_setup_draft",
    },
  };
});

vi.mock("@/app/utils/storage-goal-ops", () => ({
  toggleTwelveWeekTaskInData: vi.fn(),
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
}));

import { APP_STORAGE_KEYS, addGoal, addReflection, saveUserData } from "@/app/utils/storage";
import { toggleTwelveWeekTaskInData } from "@/app/utils/storage-goal-ops";

describe("executeAction - Phase 5 Action Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
});
