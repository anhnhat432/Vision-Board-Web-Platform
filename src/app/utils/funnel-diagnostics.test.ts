import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildFunnelDiagnosticsSnapshot,
  evaluateDiagnosticsFlag,
  shouldShowFunnelDiagnostics,
} from "./funnel-diagnostics";
import { LIFE_AREAS, saveUserData } from "./storage";
import { CURRENT_STORAGE_VERSION } from "./storage-constants";
import type { TwelveWeekSystem, UserData } from "./storage-types";
import { setUserIntent } from "./user-intent";

const STORAGE_KEY_FEASIBILITY = "pending_feasibility_result";
const STORAGE_KEY_SMART = "pending_smart_goal";
const STORAGE_KEY_FOCUS = "selected_focus_area";

function makeUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    storageVersion: CURRENT_STORAGE_VERSION,
    userId: "test-user",
    wheelOfLifeHistory: [],
    currentWheelOfLife: LIFE_AREAS.map((area, index) => ({
      ...area,
      score: index === 0 ? 3 : 7,
    })),
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: {
      theme: "light",
      analyticsConsent: "off",
      localEventLog: "off",
      locale: "vi",
    } as unknown as UserData["appPreferences"],
    onboardingCompleted: true,
    ...overrides,
  } as UserData;
}

function makeSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Hoàn thành dự án A",
    lagMetric: { name: "Doanh thu", unit: "đồng", target: "100000000", currentValue: "" },
    leadIndicators: [
      { id: "tactic_1", name: "Việc lặp lại 1", target: "1", unit: "lần", type: "core", schedule: [1, 3, 5] },
      { id: "tactic_2", name: "Việc lặp lại 2", target: "1", unit: "lần", type: "optional", schedule: [2] },
    ],
    milestones: { week4: "Cột mốc 4", week8: "Cột mốc 8", week12: "Kết quả cuối" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "Outcome",
    startDate: "2026-04-13",
    endDate: "2026-07-05",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 3,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [
      {
        id: "task_w1_1",
        weekNumber: 1,
        scheduledDate: "2026-04-14",
        title: "Viết draft 800 từ",
        leadIndicatorName: "Việc lặp lại 1",
        isCore: true,
        completed: true,
        tacticId: "tactic_1",
      },
      {
        id: "task_w2_1",
        weekNumber: 2,
        scheduledDate: "2026-04-21",
        title: "Tiếp tục viết",
        leadIndicatorName: "Việc lặp lại 1",
        isCore: true,
        completed: false,
        tacticId: "tactic_1",
      },
    ],
    dailyCheckIns: [],
    weeklyReviews: [{ weekNumber: 1, reviewCompleted: true } as TwelveWeekSystem["weeklyReviews"][number]],
    scoreboard: [],
    ...overrides,
  } as TwelveWeekSystem;
}

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe("evaluateDiagnosticsFlag", () => {
  it("returns false when env is undefined", () => {
    expect(evaluateDiagnosticsFlag(undefined)).toBe(false);
  });

  it("returns false when flag is missing", () => {
    expect(evaluateDiagnosticsFlag({})).toBe(false);
  });

  it("returns false for any value other than 'true'", () => {
    for (const value of ["1", "yes", "TRUE  ", "", "false", "0"]) {
      expect(evaluateDiagnosticsFlag({ VITE_SHOW_FUNNEL_DIAGNOSTICS: value })).toBe(
        value.trim().toLowerCase() === "true",
      );
    }
  });

  it("is case-insensitive on the literal 'true'", () => {
    expect(evaluateDiagnosticsFlag({ VITE_SHOW_FUNNEL_DIAGNOSTICS: "True" })).toBe(true);
    expect(evaluateDiagnosticsFlag({ VITE_SHOW_FUNNEL_DIAGNOSTICS: "true" })).toBe(true);
  });
});

describe("shouldShowFunnelDiagnostics", () => {
  it("is false by default in test env (the flag is unset)", () => {
    expect(shouldShowFunnelDiagnostics()).toBe(false);
  });
});

describe("buildFunnelDiagnosticsSnapshot — empty state", () => {
  it("returns a fully-shaped snapshot with no plan / smart / feasibility data", () => {
    const data = buildFunnelDiagnosticsSnapshot({
      userData: makeUserData({ goals: [], onboardingCompleted: false }),
      now: new Date("2026-05-03T08:00:00Z"),
    });

    expect(data.intent.id).toBeNull();
    expect(data.steps.onboardingCompleted).toBe(false);
    expect(data.smart.present).toBe(false);
    expect(data.smart.qualityLevel).toBeNull();
    expect(data.feasibility.present).toBe(false);
    expect(data.plan.present).toBe(false);
    expect(data.execution.hasActiveSystem).toBe(false);
    expect(data.execution.completedTaskCount).toBe(0);
    expect(data.execution.totalTaskCount).toBe(0);
    expect(data.generatedAt).toBe("2026-05-03T08:00:00.000Z");
  });
});

describe("buildFunnelDiagnosticsSnapshot — populated state", () => {
  it("captures intent + funnel steps + plan + execution metrics from user data", () => {
    setUserIntent("learn_skill");
    localStorage.setItem(STORAGE_KEY_FOCUS, "Career");
    localStorage.setItem(
      STORAGE_KEY_SMART,
      JSON.stringify({
        focusArea: "Career",
        specific: "Hoàn thành 3 dự án nhỏ JavaScript với README và demo",
        measurable: { metric_name: "Số dự án nhỏ", baseline_value: 0, target_value: 3, metric_unit: "dự án" },
        achievable: { weekly_time_commitment_hours: 8, required_skills: ["JavaScript"], support_resources: [] },
        relevant: { motivation_reason: "Xây portfolio và lấy job mới" },
        time_bound: { target_weeks: 12 },
      }),
    );
    localStorage.setItem(
      STORAGE_KEY_FEASIBILITY,
      JSON.stringify({
        resultType: "challenging",
        adjustedScore: 12,
        bottleneck: { axis: "energy", label: "Năng lượng hiện tại" },
        planLoad: "balanced",
        weeklyCapacity: "medium",
      }),
    );

    const userData = makeUserData({
      goals: [
        {
          id: "goal_1",
          title: "Goal",
          category: "Career",
          description: "",
          deadline: "2026-07-05",
          tasks: [],
          createdAt: "2026-04-13T00:00:00Z",
          twelveWeekSystem: makeSystem(),
        } as unknown as UserData["goals"][number],
      ],
    });

    const data = buildFunnelDiagnosticsSnapshot({
      userData,
      now: new Date("2026-05-03T08:00:00Z"),
    });

    // Intent surfaces id + label.
    expect(data.intent.id).toBe("learn_skill");
    expect(data.intent.label.length).toBeGreaterThan(0);

    // Steps reflect the full funnel.
    expect(data.steps.hasFocusArea).toBe(true);
    expect(data.steps.hasPendingSmartGoal).toBe(true);
    expect(data.steps.hasPendingFeasibility).toBe(true);
    expect(data.steps.has12WeekPlan).toBe(true);
    expect(data.steps.hasActiveTwelveWeekSystem).toBe(true);

    // SMART quality is bucketed.
    expect(data.smart.present).toBe(true);
    expect(data.smart.qualityLevel).toMatch(/^(weak|okay|strong)$/);
    expect(data.smart.overallScoreBucket).toMatch(/^(0-19|20-39|40-59|60-79|80-100)$/);

    // Feasibility values pass through as enums only.
    expect(data.feasibility.resultType).toBe("challenging");
    expect(data.feasibility.adjustedScoreBucket).toBe("10-14");
    expect(data.feasibility.bottleneckAxis).toBe("energy");
    expect(data.feasibility.planLoad).toBe("balanced");
    expect(data.feasibility.weeklyCapacity).toBe("medium");

    // Plan has 2 indicators (1 core, 1 optional), 3 milestones, 1 week-1 task.
    expect(data.plan.leadIndicatorCount).toBe(2);
    expect(data.plan.coreIndicatorCount).toBe(1);
    expect(data.plan.optionalIndicatorCount).toBe(1);
    expect(data.plan.milestoneCount).toBe(3);
    expect(data.plan.weekOneTaskCount).toBe(1);
    expect(data.plan.weekOneStartable).toBe(true);

    // Execution captures totals.
    expect(data.execution.hasActiveSystem).toBe(true);
    expect(data.execution.totalTaskCount).toBe(2);
    expect(data.execution.completedTaskCount).toBe(1);
    expect(data.execution.weeklyReviewsCompleted).toBe(1);
  });

  it("tolerates malformed pending feasibility / smart goal payloads", () => {
    localStorage.setItem(STORAGE_KEY_SMART, "not-json");
    localStorage.setItem(STORAGE_KEY_FEASIBILITY, "{not-json");
    const data = buildFunnelDiagnosticsSnapshot({
      userData: makeUserData({ goals: [] }),
      now: new Date("2026-05-03T08:00:00Z"),
    });
    expect(data.smart.present).toBe(true);
    expect(data.smart.qualityLevel).toBeNull();
    expect(data.feasibility.present).toBe(false);
  });
});

describe("buildFunnelDiagnosticsSnapshot — privacy guard", () => {
  it("never includes user free text in the snapshot output", () => {
    const RAW_GOAL = "RAW PRIVATE GOAL TEXT";
    const RAW_VISION = "RAW PRIVATE VISION";
    const RAW_TASK = "RAW PRIVATE TASK TITLE";
    const RAW_NOTE = "RAW PRIVATE CHECKIN NOTE";

    localStorage.setItem(
      STORAGE_KEY_SMART,
      JSON.stringify({
        focusArea: "Career",
        specific: RAW_GOAL,
        measurable: { metric_name: "x", baseline_value: 0, target_value: 5, metric_unit: "u" },
        achievable: { weekly_time_commitment_hours: 6, required_skills: [], support_resources: [] },
        relevant: { motivation_reason: "Why" },
        time_bound: { target_weeks: 12 },
      }),
    );
    localStorage.setItem(STORAGE_KEY_FOCUS, "Career");

    const userData = makeUserData({
      goals: [
        {
          id: "goal_1",
          title: "Goal",
          category: "Career",
          description: "",
          deadline: "2026-07-05",
          tasks: [],
          createdAt: "2026-04-13T00:00:00Z",
          twelveWeekSystem: makeSystem({
            vision12Week: RAW_VISION,
            week12Outcome: RAW_VISION,
            taskInstances: [
              {
                id: "t1",
                weekNumber: 1,
                scheduledDate: "2026-04-14",
                title: RAW_TASK,
                leadIndicatorName: RAW_TASK,
                isCore: true,
                completed: false,
                tacticId: "tactic_1",
              },
            ],
            dailyCheckIns: [
              {
                date: "2026-04-15",
                didWorkToday: true,
                whichLeadIndicatorWorkedOn: RAW_TASK,
                amountDone: "",
                outputCreated: "",
                obstacleOrIssue: "",
                dailySelfRating: 3,
                optionalNote: RAW_NOTE,
              } as unknown as TwelveWeekSystem["dailyCheckIns"][number],
            ],
          }),
        } as unknown as UserData["goals"][number],
      ],
    });

    const data = buildFunnelDiagnosticsSnapshot({
      userData,
      now: new Date("2026-05-03T08:00:00Z"),
    });

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain(RAW_GOAL);
    expect(serialized).not.toContain(RAW_VISION);
    expect(serialized).not.toContain(RAW_TASK);
    expect(serialized).not.toContain(RAW_NOTE);
  });
});
