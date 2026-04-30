import { describe, expect, it } from "vitest";

import { CURRENT_STORAGE_VERSION, DEFAULT_APP_PREFERENCES, MOTIVATIONAL_QUOTES } from "./storage-constants";
import { createDemoUserData, createEmptyUserData } from "./storage-demo-data";
import { hasMeaningfulLocalWork } from "./local-data-migration";
import type { Goal, TrackingEvent, UserData } from "./storage-types";

function createFreshUserData(): UserData {
  return createEmptyUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
}

function createRealGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal_real_1",
    category: "Career",
    title: "Launch a real 12-week goal",
    description: "",
    deadline: "2026-12-31",
    tasks: [],
    createdAt: "2026-04-29T00:00:00.000Z",
    ...overrides,
  };
}

describe("hasMeaningfulLocalWork", () => {
  it("returns false for empty user data", () => {
    expect(hasMeaningfulLocalWork(createFreshUserData())).toBe(false);
  });

  it("returns false for untouched seeded demo data", () => {
    const demoData = createDemoUserData({
      currentStorageVersion: CURRENT_STORAGE_VERSION,
      defaultAppPreferences: DEFAULT_APP_PREFERENCES,
      motivationalQuotes: MOTIVATIONAL_QUOTES,
    });

    expect(hasMeaningfulLocalWork(demoData)).toBe(false);
  });

  it("returns true when seeded demo data was edited", () => {
    const demoData = createDemoUserData({
      currentStorageVersion: CURRENT_STORAGE_VERSION,
      defaultAppPreferences: DEFAULT_APP_PREFERENCES,
      motivationalQuotes: MOTIVATIONAL_QUOTES,
    });
    const firstGoal = demoData.goals[0];
    if (!firstGoal) throw new Error("Expected seeded demo goal");
    firstGoal.title = "My edited local goal";

    expect(hasMeaningfulLocalWork(demoData)).toBe(true);
  });

  it("returns true for one real goal", () => {
    const data = createFreshUserData();
    data.goals.push(createRealGoal());

    expect(hasMeaningfulLocalWork(data)).toBe(true);
  });

  it("returns true for a real 12-week system", () => {
    const data = createFreshUserData();
    data.goals.push(
      createRealGoal({
        twelveWeekSystem: {
          goalType: "Project",
          vision12Week: "Ship a focused local-first MVP",
          lagMetric: { name: "Release readiness", unit: "%", target: "100", currentValue: "20" },
          leadIndicators: [{ id: "lead_1", name: "Release task", target: "3", unit: "tasks/week" }],
          milestones: { week4: "", week8: "", week12: "Public demo ready" },
          successEvidence: "The demo runs without login.",
          reviewDay: "Sunday",
          week12Outcome: "Public demo ready",
          startDate: "2026-04-29",
          endDate: "2026-07-22",
          timezone: "Asia/Ho_Chi_Minh",
          weekStartsOn: "Monday",
          status: "active",
          currentWeek: 1,
          totalWeeks: 12,
          weeklyPlans: [],
          taskInstances: [
            {
              id: "task_real_1",
              weekNumber: 1,
              scheduledDate: "2026-04-30",
              title: "Run release smoke test",
              leadIndicatorName: "Release task",
              isCore: true,
              completed: false,
            },
          ],
          dailyCheckIns: [],
          weeklyReviews: [],
          scoreboard: [],
        },
      }),
    );

    expect(hasMeaningfulLocalWork(data)).toBe(true);
  });

  it("returns true for real wheel scores", () => {
    const data = createFreshUserData();
    data.wheelOfLifeHistory.push({
      date: "2026-04-29T00:00:00.000Z",
      areas: [{ name: "Career", score: 7, color: "#8b5cf6" }],
    });

    expect(hasMeaningfulLocalWork(data)).toBe(true);
  });

  it("returns true for a reflection", () => {
    const data = createFreshUserData();
    data.reflections.push({
      id: "reflection_real_1",
      date: "2026-04-29",
      title: "What I learned",
      content: "I need a clearer weekly review ritual.",
      mood: "steady",
    });

    expect(hasMeaningfulLocalWork(data)).toBe(true);
  });

  it("returns false when the only data is event log and outbox telemetry", () => {
    const data = createFreshUserData();
    const event: TrackingEvent = {
      id: "event_1",
      type: "12_week_setup_started",
      createdAt: "2026-04-29T00:00:00.000Z",
      metadata: { source: "test" },
    };
    data.eventLog.push(event);
    data.syncOutbox.push({
      id: "outbox_1",
      type: event.type,
      createdAt: event.createdAt,
      payloadSummary: "setup started",
      status: "pending",
    });

    expect(hasMeaningfulLocalWork(data)).toBe(false);
  });
});
