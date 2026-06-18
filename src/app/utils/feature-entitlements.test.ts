import { describe, expect, it } from "vitest";

import { canAccess, FREE_TIER_LIMITS, getFreeTierUsage, hasReachedLimit } from "./feature-entitlements";
import type { UserData } from "./storage-types";

const now = "2026-05-15T00:00:00.000Z";

function createUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    storageVersion: 1,
    userId: "test-user",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: {
      enableInAppReminders: false,
      enableBrowserNotifications: false,
      allowLocalAnalytics: false,
      keepLocalOutbox: true,
      preferredReminderHour: 19,
    },
    subscription: null,
    entitlements: [],
    onboardingCompleted: false,
    ...overrides,
  };
}

function createGoal(id: string, hasActiveCycle = false): UserData["goals"][number] {
  return {
    id,
    category: "career",
    title: `Goal ${id}`,
    description: "Test goal",
    deadline: "2026-08-01",
    tasks: [],
    createdAt: now,
    twelveWeekSystem: hasActiveCycle
      ? {
          goalType: "project",
          vision12Week: "Ship",
          lagMetric: { name: "Output", target: "1", unit: "project", currentValue: "" },
          leadIndicators: [],
          milestones: { week4: "A", week8: "B", week12: "C" },
          successEvidence: "Done",
          reviewDay: "Sunday",
          week12Outcome: "Done",
          startDate: "2026-05-15",
          endDate: "2026-08-07",
          timezone: "Asia/Ho_Chi_Minh",
          weekStartsOn: "Monday",
          status: "active",
          currentWeek: 1,
          totalWeeks: 12,
          weeklyPlans: [],
          taskInstances: [],
          dailyCheckIns: [],
          weeklyReviews: [],
          scoreboard: [],
        }
      : undefined,
  };
}

describe("feature entitlements", () => {
  it("defines the suggested free tier limits", () => {
    expect(FREE_TIER_LIMITS.maxActiveGoals).toBe(3);
    expect(FREE_TIER_LIMITS.max12WeekCycles).toBe(1);
    expect(FREE_TIER_LIMITS.maxVisionBoards).toBe(1);
    expect(FREE_TIER_LIMITS.maxReflectionsPerWeek).toBe(Number.POSITIVE_INFINITY);
    expect(FREE_TIER_LIMITS.canExportPDF).toBe(false);
    expect(FREE_TIER_LIMITS.canUseAdvancedMetrics).toBe(false);
    expect(FREE_TIER_LIMITS.cloudSync).toBe(false);
  });

  it("blocks free users after three goals", () => {
    const data = createUserData({ goals: [createGoal("1"), createGoal("2"), createGoal("3")] });

    expect(getFreeTierUsage(data, "maxActiveGoals")).toEqual({ current: 3, limit: 3, reached: true });
    expect(hasReachedLimit(data, "maxActiveGoals")).toBe(true);
  });

  it("blocks free users after one active 12-week cycle", () => {
    const data = createUserData({ goals: [createGoal("1", true), createGoal("2")] });

    expect(hasReachedLimit(data, "max12WeekCycles")).toBe(true);
  });

  it("keeps unlimited weekly reflections free", () => {
    const data = createUserData();

    expect(hasReachedLimit(data, "maxReflectionsPerWeek")).toBe(false);
  });

  it("allows Plus users to pass limits and access paid features", () => {
    const data = createUserData({
      goals: [createGoal("1"), createGoal("2"), createGoal("3")],
      subscription: {
        planCode: "PLUS",
        status: "active",
        billingCycle: "monthly",
        providerMode: "api_contract",
        startedAt: now,
        renewsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        isLocalTestMode: false,
      },
      entitlements: [{ key: "advanced_analytics", sourcePlan: "PLUS", grantedAt: now }],
    });

    expect(hasReachedLimit(data, "maxActiveGoals")).toBe(false);
    expect(canAccess(data, "cloudSync")).toBe(true);
    expect(canAccess(data, "canExportPDF")).toBe(true);
    expect(canAccess(data, "canUseAdvancedMetrics")).toBe(true);
  });

  it("denies paid feature access for free users", () => {
    const data = createUserData();

    expect(canAccess(data, "cloudSync")).toBe(false);
    expect(canAccess(data, "canExportPDF")).toBe(false);
    expect(canAccess(data, "canUseAdvancedMetrics")).toBe(false);
  });
});
