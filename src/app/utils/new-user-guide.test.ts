import { beforeEach, describe, expect, it } from "vitest";
import { getNewUserGuideProgress } from "./new-user-guide";
import { APP_STORAGE_KEYS, getUserData, saveUserData } from "./storage";

function seedZeroScoreLifeBalance() {
  const data = getUserData();
  data.isHydratedFromDemo = false;
  data.onboardingCompleted = true;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 0 }));
  data.goals = [];
  saveUserData(data);
  return data;
}

function seedRealLifeBalance() {
  const data = getUserData();
  data.isHydratedFromDemo = false;
  data.onboardingCompleted = true;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({
    ...area,
    score: area.name === "Career" ? 8 : 5,
  }));
  data.goals = [];
  saveUserData(data);
  return data;
}

function seedBackendRestoredTwelveWeekSystem() {
  const data = getUserData();
  data.isHydratedFromDemo = false;
  data.onboardingCompleted = false;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 0 }));
  data.goals = [
    {
      id: "goal_backend_restored",
      category: "Career",
      title: "Backend restored 12-week system",
      description: "A restored goal can arrive before the local Life Balance snapshot is hydrated.",
      deadline: "2026-06-30",
      tasks: [],
      focusArea: "Career",
      feasibilityResult: "realistic",
      readinessScore: 16,
      createdAt: "2026-04-28T00:00:00.000Z",
      twelveWeekSystem: {
        goalType: "Personal Growth",
        vision12Week: "Restore the production smoke workspace after login.",
        lagMetric: {
          name: "Reviews",
          unit: "reviews",
          target: "12",
          currentValue: "1",
        },
        leadIndicators: [
          {
            id: "lead_1",
            name: "Weekly review",
            target: "1",
            unit: "time/week",
            type: "core",
          },
        ],
        milestones: {
          week4: "Milestone 4",
          week8: "Milestone 8",
          week12: "Milestone 12",
        },
        successEvidence: "A restored system is visible after login.",
        reviewDay: "Sunday",
        week12Outcome: "Finish the restored cycle",
        startDate: "2026-04-27",
        endDate: "2026-07-19",
        timezone: "Asia/Saigon",
        weekStartsOn: "Monday",
        status: "active",
        currentWeek: 1,
        totalWeeks: 12,
        weeklyPlans: [],
        taskInstances: [
          {
            id: "task_1",
            weekNumber: 1,
            scheduledDate: "2026-04-28",
            title: "Complete first task",
            leadIndicatorName: "Weekly review",
            isCore: true,
            completed: true,
            completedAt: "2026-04-28T00:00:00.000Z",
          },
        ],
        dailyCheckIns: [],
        weeklyReviews: [],
        scoreboard: [],
      },
    },
  ] as typeof data.goals;
  saveUserData(data);
  return data;
}

describe("getNewUserGuideProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not let stale goal drafts skip a missing Life Balance step", () => {
    const data = seedZeroScoreLifeBalance();
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify({
        focusArea: "Career",
        specific: { goal_statement: "Ship the first-session flow safely" },
        measurable: { metric_name: "guarded steps", target_value: 6 },
      }),
    );
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingFeasibilityResult,
      JSON.stringify({
        resultType: "realistic",
        resultTitle: "Khả thi",
        readinessScore: 18,
        adjustedScore: 18,
        wheelScore: 8,
      }),
    );

    const progress = getNewUserGuideProgress(data);

    expect(progress.completedCount).toBe(0);
    expect(progress.nextStep?.id).toBe("life_balance");
    expect(progress.steps.map((step) => [step.id, step.completed])).toEqual([
      ["life_balance", false],
      ["life_insight", false],
      ["smart_goal", false],
      ["feasibility", false],
      ["setup_cycle", false],
      ["complete_today", false],
      ["complete_review", false],
    ]);
  });

  it("advances to SMART Goal after real Life Balance and a selected focus area", () => {
    const data = seedRealLifeBalance();
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");

    const progress = getNewUserGuideProgress(data);

    expect(progress.completedCount).toBe(2);
    expect(progress.nextStep?.id).toBe("smart_goal");
    expect(progress.nextStep?.href).toBe("/smart-goal-setup");
  });

  it("routes the merged Life Balance step to the focus tab when the score is done but focus is not chosen yet", () => {
    const data = seedRealLifeBalance();

    const progress = getNewUserGuideProgress(data);
    const lifeBalanceStep = progress.steps.find((step) => step.id === "life_balance");
    const smartGoalStep = progress.steps.find((step) => step.id === "smart_goal");

    expect(progress.nextStep?.id).toBe("life_balance");
    expect(lifeBalanceStep).toMatchObject({
      completed: false,
      href: "/life-balance?tab=focus",
      ctaLabel: "Chọn trọng tâm",
    });
    expect(smartGoalStep).toMatchObject({
      href: "/life-balance?tab=focus",
    });
  });

  it("routes directly to 12-week setup after SMART Goal when feasibility has not been run", () => {
    const data = seedRealLifeBalance();
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify({
        focusArea: "Career",
        specific: "Ra mắt hệ thống review cá nhân",
        measurable: "Hoàn thành 12 tuần review",
        achievable: "6 giờ mỗi tuần",
        relevant: "Giữ nhịp thực thi dài hạn",
        timeBound: "Trong 12 tuần tới",
      }),
    );

    const progress = getNewUserGuideProgress(data);
    const feasibilityStep = progress.steps.find((step) => step.id === "feasibility");
    const setupStep = progress.steps.find((step) => step.id === "setup_cycle");

    expect(progress.completedCount).toBe(4);
    expect(progress.nextStep?.id).toBe("setup_cycle");
    expect(feasibilityStep).toMatchObject({
      completed: true,
      href: "/feasibility",
      ctaLabel: "Kiểm tra khả thi nâng cao",
    });
    expect(setupStep).toMatchObject({
      completed: false,
      href: "/12-week-setup",
      ctaLabel: "Tạo kế hoạch 12 tuần",
    });
  });

  it("treats a restored 12-week system as completed upstream core flow", () => {
    const data = seedBackendRestoredTwelveWeekSystem();

    const progress = getNewUserGuideProgress(data);

    expect(progress.completedCount).toBe(6);
    expect(progress.nextStep?.id).toBe("complete_review");
    expect(progress.isComplete).toBe(false);
    expect(progress.steps.map((step) => [step.id, step.completed])).toEqual([
      ["life_balance", true],
      ["life_insight", true],
      ["smart_goal", true],
      ["feasibility", true],
      ["setup_cycle", true],
      ["complete_today", true],
      ["complete_review", false],
    ]);
  });

  it("marks feasibility complete when a SMART goal draft exists but no saved feasibility result", () => {
    const data = seedRealLifeBalance();
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify({
        focusArea: "Career",
        specific: { goal_statement: "Write 2 English articles per week" },
        measurable: { metric_name: "articles", target_value: 24 },
      }),
    );

    const progress = getNewUserGuideProgress(data);
    const feasibilityStep = progress.steps.find((step) => step.id === "feasibility");
    const setupCycleStep = progress.steps.find((step) => step.id === "setup_cycle");

    expect(feasibilityStep?.completed).toBe(true);
    expect(setupCycleStep?.href).toBe("/12-week-setup");
  });
});
