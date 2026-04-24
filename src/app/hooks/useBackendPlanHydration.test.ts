import { vi } from "vitest";

import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getGoals, type ApiGoal } from "@/services/goalService";
import { getPlan, getPlans } from "@/services/planService";
import type { Metric, PlanDetails } from "@/types/plan";
import { APP_STORAGE_KEYS, getUserData, saveUserData } from "../utils/storage";
import { hydrateTwelveWeekPlansFromBackend } from "./useBackendPlanHydration";

vi.mock("@/services/goalService", () => ({
  getGoals: vi.fn(),
}));

vi.mock("@/services/planService", () => ({
  getPlan: vi.fn(),
  getPlans: vi.fn(),
}));

function resetLocalUserData(): void {
  localStorage.clear();
  const data = getUserData();
  saveUserData({
    ...data,
    goals: [],
    onboardingCompleted: false,
  });
}

function createApiGoal(): ApiGoal {
  return {
    id: "remote_goal_1",
    userId: "user_1",
    title: "Launch backend-backed cycle",
    category: "Career",
    description: "Restore this cycle on a new device.",
    deadline: "2026-04-12",
    status: "active",
    focusArea: "Career",
    readinessScore: 17,
    tasks: [{ title: "Set up workspace", completed: true }],
    planId: "plan_1",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };
}

function createMetric(name: string, logs: Metric["logs"] = []): Metric {
  return {
    id: `${name}_metric`,
    weekId: "week_1",
    name,
    weeklyTarget: 1,
    logs,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };
}

function createPlanDetails(): PlanDetails {
  return {
    plan: {
      id: "plan_1",
      userId: "user_1",
      vision: "Finish a restored backend cycle",
      smartGoalId: "local_goal_1",
      startDate: "2026-04-06",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    weeks: [
      {
        id: "week_1",
        planId: "plan_1",
        weekNumber: 1,
        focus: "Write the first proposal",
        expectedOutput: "Proposal is ready",
        review: {
          weekNumber: 1,
          executionScore: 80,
          reflection: "Proposal shipped",
          adjustments: "Book the next review",
        },
        tasks: [
          {
            id: "remote_task_1",
            weekId: "week_1",
            title: "Write proposal",
            status: "done",
            scheduledDate: "2026-04-07",
            createdAt: "2026-04-01T00:00:00.000Z",
            updatedAt: "2026-04-07T00:00:00.000Z",
          },
        ],
        metrics: [
          createMetric("Write proposal", [
            {
              id: "metric_log_1",
              date: "2026-04-07",
              value: 1,
              completed: true,
            },
          ]),
          createMetric("__daily_checkin__", [
            {
              id: "daily_log_1",
              date: "2026-04-07",
              value: 1,
              completed: true,
            },
          ]),
        ],
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
  };
}

describe("hydrateTwelveWeekPlansFromBackend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLocalUserData();
  });

  it("restores backend 12-week plans into local storage on a new device", async () => {
    const apiGoal = createApiGoal();
    const details = createPlanDetails();
    vi.mocked(getGoals).mockResolvedValue([apiGoal]);
    vi.mocked(getPlans).mockResolvedValue([details.plan]);
    vi.mocked(getPlan).mockResolvedValue(details);

    const result = await hydrateTwelveWeekPlansFromBackend();

    expect(result.status).toBe("success");
    expect(result.hydratedCount).toBe(1);

    const data = getUserData();
    expect(data.onboardingCompleted).toBe(true);
    expect(data.goals).toHaveLength(1);

    const goal = data.goals[0];
    expect(goal?.id).toBe("local_goal_1");
    expect(goal?.title).toBe(apiGoal.title);
    expect(goal?.twelveWeekSystem?.weeklyPlans[0]?.focus).toBe("Write the first proposal");
    expect(goal?.twelveWeekSystem?.dailyCheckIns[0]?.didWorkToday).toBe(true);
    expect(goal?.twelveWeekSystem?.weeklyReviews[0]?.reviewCompleted).toBe(true);

    const completedTask = goal?.twelveWeekSystem?.taskInstances.find((task) => task.completed);
    expect(completedTask?.title).toBe("Write proposal");

    const link = getPlanLink("local_goal_1");
    expect(link?.planId).toBe("plan_1");
    expect(completedTask ? link?.taskIdByLocalTaskId[completedTask.id] : null).toBe("remote_task_1");
    expect(localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId)).toBe("local_goal_1");
  });

  it("does not duplicate an already hydrated backend plan", async () => {
    const apiGoal = createApiGoal();
    const details = createPlanDetails();
    vi.mocked(getGoals).mockResolvedValue([apiGoal]);
    vi.mocked(getPlans).mockResolvedValue([details.plan]);
    vi.mocked(getPlan).mockResolvedValue(details);

    await hydrateTwelveWeekPlansFromBackend();
    const result = await hydrateTwelveWeekPlansFromBackend();

    expect(result.status).toBe("idle");
    expect(result.skippedCount).toBe(1);
    expect(getUserData().goals).toHaveLength(1);
  });

  it("reports local/backend differences for an already linked plan", async () => {
    const apiGoal = createApiGoal();
    const details = createPlanDetails();
    vi.mocked(getGoals).mockResolvedValue([apiGoal]);
    vi.mocked(getPlans).mockResolvedValue([details.plan]);
    vi.mocked(getPlan).mockResolvedValue(details);

    await hydrateTwelveWeekPlansFromBackend();

    const divergentDetails = createPlanDetails();
    divergentDetails.weeks[0].tasks[0].status = "todo";
    vi.mocked(getPlan).mockResolvedValue(divergentDetails);

    const result = await hydrateTwelveWeekPlansFromBackend();

    expect(result.status).toBe("idle");
    expect(result.skippedCount).toBe(1);
    expect(result.conflictCount).toBe(1);
    expect(result.message).toBe("1 local/backend differences need review.");
    expect(getUserData().goals).toHaveLength(1);
  });

  it("leaves onboarding untouched when there are no backend plans", async () => {
    vi.mocked(getGoals).mockResolvedValue([]);
    vi.mocked(getPlans).mockResolvedValue([]);

    const result = await hydrateTwelveWeekPlansFromBackend();

    expect(result.status).toBe("idle");
    expect(getUserData().onboardingCompleted).toBe(false);
    expect(getUserData().goals).toHaveLength(0);
  });
});
