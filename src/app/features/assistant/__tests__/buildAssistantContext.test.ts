import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";

vi.mock("@/app/utils/storage", () => ({
  getUserData: vi.fn(),
}));

vi.mock("@/app/utils/storage-twelve-week", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/utils/storage-twelve-week")>();
  return {
    ...actual,
    getActiveTwelveWeekGoal: vi.fn((goals: Goal[]) => goals.find((goal) => goal.twelveWeekSystem) ?? null),
    getTwelveWeekCurrentWeek: vi.fn(() => 3),
    getTwelveWeekTodayTasks: vi.fn((system: TwelveWeekSystem) =>
      system.taskInstances.filter((task) => task.scheduledDate === "2026-05-18"),
    ),
  };
});

import { getUserData } from "@/app/utils/storage";
import { buildAssistantContext } from "../buildAssistantContext";

const mockedGetUserData = vi.mocked(getUserData);

function makeSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "learning",
    vision12Week: "Launch a useful habit",
    lagMetric: { name: "Outcome", unit: "item", target: "1", currentValue: "0" },
    leadIndicators: [],
    milestones: { week4: "", week8: "", week12: "" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-05-01",
    endDate: "2026-07-24",
    timezone: "Asia/Saigon",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 3,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
    ...overrides,
  };
}

describe("buildAssistantContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("includes feasibility, latest review, stuck reason, and overdue tasks", () => {
    localStorage.setItem(
      "pending_feasibility_result",
      JSON.stringify({
        readinessScore: 11,
        bottleneck: {
          label: "Thoi gian",
          action: "Chon mot khoang 20 phut co dinh moi ngay.",
        },
      }),
    );

    const activeGoal = {
      id: "goal_1",
      category: "Education",
      title: "Hoc React",
      description: "",
      deadline: "",
      tasks: [],
      feasibilityResult: "Nen bat dau nhe hon.",
      readinessScore: 10,
      createdAt: "2026-05-01",
      twelveWeekSystem: makeSystem({
        taskInstances: [
          { id: "late_1", weekNumber: 2, scheduledDate: "2026-05-10", title: "Lam bai tap cu", leadIndicatorName: "", isCore: true, completed: false },
          { id: "late_2", weekNumber: 2, scheduledDate: "2026-05-11", title: "Doc tai lieu cu", leadIndicatorName: "", isCore: false, completed: false },
          { id: "today_1", weekNumber: 3, scheduledDate: "2026-05-18", title: "Lam bai tap hom nay", leadIndicatorName: "", isCore: true, completed: false },
        ],
        dailyCheckIns: [
          {
            date: "2026-05-17",
            didWorkToday: false,
            whichLeadIndicatorWorkedOn: "",
            amountDone: "",
            outputCreated: "",
            obstacleOrIssue: "Bi ket vi qua met",
            dailySelfRating: 2,
            optionalNote: "private note",
          },
        ],
        weeklyReviews: [
          {
            weekNumber: 2,
            leadCompletionPercent: 40,
            lagProgressValue: "",
            biggestOutputThisWeek: "",
            mainObstacle: "Lich lam viec day",
            nextWeekPriority: "Giu 1 viec cot loi moi ngay",
            workloadDecision: "reduce slightly",
            reviewCompleted: true,
            progressScore: 2,
            disciplineScore: 2,
            focusScore: 3,
            improvementScore: 3,
            outputQualityScore: 3,
            commitmentsMissed: ["Bo lo 2 buoi hoc", "Chua review bai"],
            lastReviewAt: "2026-05-17T10:00:00.000Z",
          },
        ],
      }),
    } satisfies Goal;

    mockedGetUserData.mockReturnValue({
      goals: [activeGoal],
      reflections: [],
    } as unknown as ReturnType<typeof getUserData>);

    const context = buildAssistantContext(new Date(2026, 4, 18));

    expect(context.feasibility).toEqual({
      readinessScore: 11,
      bottleneckLabel: "Thoi gian",
      bottleneckAction: "Chon mot khoang 20 phut co dinh moi ngay.",
    });
    expect(context.latestWeeklyReview).toMatchObject({
      weekNumber: 2,
      leadCompletionPercent: 40,
      mainObstacle: "Lich lam viec day",
      nextWeekPriority: "Giu 1 viec cot loi moi ngay",
      workloadDecision: "reduce slightly",
    });
    expect(context.stuckSignals.latestObstacle).toBe("Bi ket vi qua met");
    expect(context.stuckSignals.missedCommitments).toEqual(["Bo lo 2 buoi hoc", "Chua review bai"]);
    expect(context.stuckSignals.overdueOpenCount).toBe(2);
    expect(context.stuckSignals.overdueTasks).toEqual([
      { id: "late_1", title: "Lam bai tap cu", scheduledDate: "2026-05-10", isCore: true },
      { id: "late_2", title: "Doc tai lieu cu", scheduledDate: "2026-05-11", isCore: false },
    ]);
  });
});
