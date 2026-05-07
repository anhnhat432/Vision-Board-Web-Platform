import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteAllUserData, saveUserData } from "./storage";
import { APP_STORAGE_KEYS, USER_DATA_STORAGE_KEY } from "./storage-constants";
import { createDataExportJson, type DataExportPayload } from "./local-data-backup";
import type { AppPreferences, TwelveWeekSystem, UserData } from "./storage-types";

const defaultAppPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

function createTwelveWeekSystem(): TwelveWeekSystem {
  return {
    goalType: "finance",
    vision12Week: "Build the first emergency fund",
    lagMetric: {
      name: "Emergency fund",
      unit: "USD",
      target: "1000",
      currentValue: "250",
    },
    leadIndicators: [
      {
        id: "lead_1",
        name: "Save weekly",
        target: "100",
        unit: "USD",
        type: "core",
        priority: 1,
        schedule: [1],
      },
    ],
    milestones: {
      week4: "Save 300",
      week8: "Save 700",
      week12: "Save 1000",
    },
    successEvidence: "A funded savings account",
    reviewDay: "Sunday",
    week12Outcome: "Emergency fund ready",
    weeklyActions: ["Move money to savings"],
    successMetric: "1000 USD saved",
    startDate: "2026-05-06",
    endDate: "2026-07-29",
    timezone: "Asia/Saigon",
    weekStartsOn: "Monday",
    status: "active",
    dailyReminderTime: "19:00",
    tacticLoadPreference: "balanced",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [
      {
        weekNumber: 1,
        phaseName: "Start",
        focus: "Open savings account",
        milestone: "First transfer",
        completed: false,
      },
    ],
    taskInstances: [
      {
        id: "task_1",
        weekNumber: 1,
        scheduledDate: "2026-05-06",
        title: "Transfer first saving amount",
        leadIndicatorName: "Save weekly",
        isCore: true,
        completed: true,
        completedAt: "2026-05-06T09:00:00.000Z",
        tacticId: "lead_1",
      },
    ],
    dailyCheckIns: [
      {
        date: "2026-05-06",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "Save weekly",
        amountDone: "100",
        outputCreated: "First transfer",
        obstacleOrIssue: "",
        dailySelfRating: 5,
        optionalNote: "Smooth start",
        mood: "high",
      },
    ],
    weeklyReviews: [
      {
        weekNumber: 1,
        leadCompletionPercent: 100,
        lagProgressValue: "350",
        biggestOutputThisWeek: "First transfer done",
        mainObstacle: "",
        nextWeekPriority: "Repeat transfer",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 9,
        disciplineScore: 9,
        focusScore: 8,
        improvementScore: 8,
        outputQualityScore: 9,
        completedLeadIndicators: 1,
      },
    ],
    scoreboard: [
      {
        weekNumber: 1,
        leadCompletionPercent: 100,
        mainMetricProgress: "350",
        outputDone: "First transfer",
        reviewDone: true,
        weeklyScore: 90,
      },
    ],
  };
}

function createUserData(): UserData {
  return {
    storageVersion: 5,
    userId: "user_export_test",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [
      {
        id: "goal_without_plan",
        category: "career",
        title: "Other goal",
        description: "Not exported when an active goal is selected",
        deadline: "2026-12-31",
        tasks: [],
        createdAt: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "goal_with_plan",
        category: "finance",
        title: "Emergency fund",
        description: "Build a starter emergency fund",
        deadline: "2026-07-29",
        tasks: [{ id: "task_goal_1", title: "Open account", completed: true }],
        twelveWeekSystem: createTwelveWeekSystem(),
        createdAt: "2026-05-06T00:00:00.000Z",
      },
    ],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [{ id: "event_1", type: "12_week_task_completed", createdAt: "2026-05-06T09:00:00.000Z" }],
    syncOutbox: [
      {
        id: "outbox_1",
        type: "task_completed",
        createdAt: "2026-05-06T09:00:00.000Z",
        payloadSummary: "Task completed",
        status: "pending",
      },
    ],
    appPreferences: { ...defaultAppPreferences, preferredReminderHour: 20 },
    onboardingCompleted: true,
  };
}

describe("data export and local deletion", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T10:15:30.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports the selected goal, twelve-week system, and app preferences", () => {
    const data = createUserData();

    const payload = JSON.parse(createDataExportJson(data, "goal_with_plan")) as DataExportPayload;

    expect(payload.exportVersion).toBe("1.0");
    expect(payload.exportedAt).toBe("2026-05-06T10:15:30.000Z");
    expect(payload.goal?.id).toBe("goal_with_plan");
    expect(payload.goal?.title).toBe("Emergency fund");
    expect(payload.twelveWeekSystem?.vision12Week).toBe("Build the first emergency fund");
    expect(payload.twelveWeekSystem?.taskInstances).toHaveLength(1);
    expect(payload.twelveWeekSystem?.dailyCheckIns).toHaveLength(1);
    expect(payload.twelveWeekSystem?.weeklyReviews).toHaveLength(1);
    expect(payload.preferences).toEqual(data.appPreferences);
  });

  it("clears localStorage user data and local-only app keys", () => {
    saveUserData(createUserData());
    localStorage.setItem(APP_STORAGE_KEYS.pending12WeekPlanDraft, JSON.stringify({ draft: true }));
    localStorage.setItem("visionboard_data_mutation_queue:device_id", "device_1");

    deleteAllUserData();

    expect(localStorage.getItem(USER_DATA_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(APP_STORAGE_KEYS.pending12WeekPlanDraft)).toBeNull();
    expect(localStorage.getItem("visionboard_data_mutation_queue:device_id")).toBeNull();
  });
});
