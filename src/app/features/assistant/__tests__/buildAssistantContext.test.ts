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
    getTwelveWeekCurrentWeek: vi.fn((system: TwelveWeekSystem) => system.currentWeek || 1),
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

  it("calculates trend direction as 'up' when completion improves", () => {
    const system = makeSystem({
      currentWeek: 5,
      taskInstances: [
        // Week 2: 2/4 completed = 50%
        { id: "w2t1", weekNumber: 2, scheduledDate: "2026-05-01", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w2t2", weekNumber: 2, scheduledDate: "2026-05-02", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w2t3", weekNumber: 2, scheduledDate: "2026-05-03", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
        { id: "w2t4", weekNumber: 2, scheduledDate: "2026-05-04", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
        // Week 3: 3/4 completed = 75%
        { id: "w3t1", weekNumber: 3, scheduledDate: "2026-05-08", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w3t2", weekNumber: 3, scheduledDate: "2026-05-09", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w3t3", weekNumber: 3, scheduledDate: "2026-05-10", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w3t4", weekNumber: 3, scheduledDate: "2026-05-11", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
        // Week 4: 4/4 = 100%
        { id: "w4t1", weekNumber: 4, scheduledDate: "2026-05-15", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w4t2", weekNumber: 4, scheduledDate: "2026-05-16", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w4t3", weekNumber: 4, scheduledDate: "2026-05-17", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w4t4", weekNumber: 4, scheduledDate: "2026-05-18", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        // Week 5: 4/4 = 100%
        { id: "w5t1", weekNumber: 5, scheduledDate: "2026-05-22", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w5t2", weekNumber: 5, scheduledDate: "2026-05-23", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w5t3", weekNumber: 5, scheduledDate: "2026-05-24", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w5t4", weekNumber: 5, scheduledDate: "2026-05-25", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
      ],
    });

    const activeGoal = {
      id: "goal_1",
      category: "Education",
      title: "Test Goal",
      description: "",
      deadline: "",
      tasks: [],
      createdAt: "2026-05-01",
      twelveWeekSystem: system,
    } satisfies Goal;

    mockedGetUserData.mockReturnValue({
      goals: [activeGoal],
      reflections: [],
    } as unknown as ReturnType<typeof getUserData>);

    const context = buildAssistantContext(new Date(2026, 4, 18));

    expect(context.trend.completionLast4Weeks).toEqual([50, 75, 100, 100]);
    expect(context.trend.direction).toBe("up");
  });

  it("calculates trend direction as 'down' when completion declines", () => {
    const system = makeSystem({
      currentWeek: 5,
      taskInstances: [
        // Week 2: 4/4 = 100%
        { id: "w2t1", weekNumber: 2, scheduledDate: "2026-05-01", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w2t2", weekNumber: 2, scheduledDate: "2026-05-02", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w2t3", weekNumber: 2, scheduledDate: "2026-05-03", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w2t4", weekNumber: 2, scheduledDate: "2026-05-04", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        // Week 3: 3/4 = 75%
        { id: "w3t1", weekNumber: 3, scheduledDate: "2026-05-08", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w3t2", weekNumber: 3, scheduledDate: "2026-05-09", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w3t3", weekNumber: 3, scheduledDate: "2026-05-10", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w3t4", weekNumber: 3, scheduledDate: "2026-05-11", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
        // Week 4: 2/4 = 50%
        { id: "w4t1", weekNumber: 4, scheduledDate: "2026-05-15", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w4t2", weekNumber: 4, scheduledDate: "2026-05-16", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w4t3", weekNumber: 4, scheduledDate: "2026-05-17", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
        { id: "w4t4", weekNumber: 4, scheduledDate: "2026-05-18", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
        // Week 5: 1/4 = 25%
        { id: "w5t1", weekNumber: 5, scheduledDate: "2026-05-22", title: "Task", leadIndicatorName: "", isCore: true, completed: true },
        { id: "w5t2", weekNumber: 5, scheduledDate: "2026-05-23", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
        { id: "w5t3", weekNumber: 5, scheduledDate: "2026-05-24", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
        { id: "w5t4", weekNumber: 5, scheduledDate: "2026-05-25", title: "Task", leadIndicatorName: "", isCore: false, completed: false },
      ],
    });

    const activeGoal = {
      id: "goal_1",
      category: "Education",
      title: "Test Goal",
      description: "",
      deadline: "",
      tasks: [],
      createdAt: "2026-05-01",
      twelveWeekSystem: system,
    } satisfies Goal;

    mockedGetUserData.mockReturnValue({
      goals: [activeGoal],
      reflections: [],
    } as unknown as ReturnType<typeof getUserData>);

    const context = buildAssistantContext(new Date(2026, 4, 18));

    expect(context.trend.completionLast4Weeks).toEqual([100, 75, 50, 25]);
    expect(context.trend.direction).toBe("down");
  });

  it("calculates streak from completed tasks", () => {
    const system = makeSystem({
      taskInstances: [
        // Today (May 18): completed
        { id: "t1", weekNumber: 3, scheduledDate: "2026-05-18", title: "Task", leadIndicatorName: "", isCore: true, completed: true, completedAt: "2026-05-18" },
        // May 17: completed
        { id: "t2", weekNumber: 3, scheduledDate: "2026-05-17", title: "Task", leadIndicatorName: "", isCore: true, completed: true, completedAt: "2026-05-17" },
        // May 16: completed
        { id: "t3", weekNumber: 3, scheduledDate: "2026-05-16", title: "Task", leadIndicatorName: "", isCore: true, completed: true, completedAt: "2026-05-16" },
        // May 15: NOT completed - streak breaks
        { id: "t4", weekNumber: 3, scheduledDate: "2026-05-15", title: "Task", leadIndicatorName: "", isCore: true, completed: false },
      ],
    });

    const activeGoal = {
      id: "goal_1",
      category: "Education",
      title: "Test Goal",
      description: "",
      deadline: "",
      tasks: [],
      createdAt: "2026-05-01",
      twelveWeekSystem: system,
    } satisfies Goal;

    mockedGetUserData.mockReturnValue({
      goals: [activeGoal],
      reflections: [],
    } as unknown as ReturnType<typeof getUserData>);

    const context = buildAssistantContext(new Date(2026, 4, 18));

    expect(context.streak.daysWithCompletedTask).toBe(3);
  });

  it("calculates upcoming deadlines sorted by days until", () => {
    const activeGoal1 = {
      id: "goal_1",
      category: "Education",
      title: "Finish Course",
      description: "",
      deadline: "2026-05-25", // 7 days away
      tasks: [],
      createdAt: "2026-05-01",
      twelveWeekSystem: makeSystem(),
    } satisfies Goal;

    const activeGoal2 = {
      id: "goal_2",
      category: "Career",
      title: "Submit Report",
      description: "",
      deadline: "2026-05-20", // 2 days away
      tasks: [],
      createdAt: "2026-05-01",
      twelveWeekSystem: makeSystem(),
    } satisfies Goal;

    const activeGoal3 = {
      id: "goal_3",
      category: "Health",
      title: "No deadline",
      description: "",
      deadline: "",
      tasks: [],
      createdAt: "2026-05-01",
    } satisfies Goal;

    mockedGetUserData.mockReturnValue({
      goals: [activeGoal1, activeGoal2, activeGoal3],
      reflections: [],
    } as unknown as ReturnType<typeof getUserData>);

    const context = buildAssistantContext(new Date(2026, 4, 18));

    expect(context.upcomingDeadlines).toHaveLength(2);
    expect(context.upcomingDeadlines[0].title).toBe("Submit Report");
    expect(context.upcomingDeadlines[0].daysUntil).toBe(2);
    expect(context.upcomingDeadlines[1].title).toBe("Finish Course");
    expect(context.upcomingDeadlines[1].daysUntil).toBe(7);
  });
});
