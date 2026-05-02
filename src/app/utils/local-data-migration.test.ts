import { beforeEach, describe, expect, it } from "vitest";

import {
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  AUTH_OWNER_STORAGE_KEY,
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX,
  LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY,
  MOTIVATIONAL_QUOTES,
  STORAGE_KEY,
} from "./storage-constants";
import { createDemoUserData, createEmptyUserData } from "./storage-demo-data";
import { getScopedUserDataStorageKey } from "./storage-auth-scope";
import {
  getAnonymousLocalDataMigrationCandidate,
  hasCompletedCloudImport,
  hasMeaningfulLocalWork,
  hasSkippedLocalDataMigrationPrompt,
  importAnonymousLocalDataToAccountScope,
  markCloudImportCompleted,
  markLocalDataMigrationPromptSkipped,
} from "./local-data-migration";
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

beforeEach(() => {
  localStorage.clear();
});

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

describe("anonymous local data migration candidate", () => {
  it("returns null when anonymous data is fresh", () => {
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(createFreshUserData()));

    expect(getAnonymousLocalDataMigrationCandidate()).toBeNull();
  });

  it("returns a candidate summary when anonymous data has meaningful work", () => {
    const data = createFreshUserData();
    data.goals.push(createRealGoal());
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(data));

    const candidate = getAnonymousLocalDataMigrationCandidate();

    expect(candidate).not.toBeNull();
    expect(candidate?.summary.goalCount).toBe(1);
    expect(candidate?.fingerprint).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });

  it("stores skip state without deleting anonymous data", () => {
    const data = createFreshUserData();
    data.goals.push(createRealGoal());
    const rawData = JSON.stringify(data);
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, rawData);

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected migration candidate");

    markLocalDataMigrationPromptSkipped("auth_user_1", candidate.fingerprint);

    expect(hasSkippedLocalDataMigrationPrompt("auth_user_1", candidate.fingerprint)).toBe(true);
    expect(hasSkippedLocalDataMigrationPrompt("auth_user_2", candidate.fingerprint)).toBe(false);
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(rawData);
    expect(localStorage.getItem(LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY)).toContain(candidate.fingerprint);
  });

  it("imports anonymous work into a fresh active account scope", () => {
    const anonymousData = createFreshUserData();
    anonymousData.goals.push(createRealGoal());
    const anonymousRaw = JSON.stringify(anonymousData);
    const freshAccountRaw = JSON.stringify(createFreshUserData());
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, anonymousRaw);
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "auth_user_1");
    localStorage.setItem(STORAGE_KEY, freshAccountRaw);
    localStorage.setItem(getScopedUserDataStorageKey("auth_user_1"), freshAccountRaw);

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected migration candidate");

    const result = importAnonymousLocalDataToAccountScope("auth_user_1", candidate.fingerprint);

    expect(result.status).toBe("imported");
    expect(result.backupKey).toContain(LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(anonymousRaw);
    expect(localStorage.getItem(getScopedUserDataStorageKey("auth_user_1"))).toBe(anonymousRaw);
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(anonymousRaw);
  });

  it("does not silently overwrite an account scope with existing meaningful data", () => {
    const anonymousData = createFreshUserData();
    anonymousData.goals.push(createRealGoal({ title: "Anonymous goal" }));
    const anonymousRaw = JSON.stringify(anonymousData);
    const accountData = createFreshUserData();
    accountData.goals.push(createRealGoal({ id: "goal_account_1", title: "Existing account goal" }));
    const accountRaw = JSON.stringify(accountData);
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, anonymousRaw);
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "auth_user_1");
    localStorage.setItem(STORAGE_KEY, accountRaw);
    localStorage.setItem(getScopedUserDataStorageKey("auth_user_1"), accountRaw);

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected migration candidate");

    const result = importAnonymousLocalDataToAccountScope("auth_user_1", candidate.fingerprint);

    expect(result.status).toBe("blocked_existing_account_data");
    expect(result.accountSummary?.goalCount).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(accountRaw);
    expect(localStorage.getItem(getScopedUserDataStorageKey("auth_user_1"))).toBe(accountRaw);
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(anonymousRaw);
  });

  it("does not import when the active auth owner does not match the target account", () => {
    const anonymousData = createFreshUserData();
    anonymousData.goals.push(createRealGoal());
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(anonymousData));
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "auth_user_2");

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected migration candidate");

    const result = importAnonymousLocalDataToAccountScope("auth_user_1", candidate.fingerprint);

    expect(result.status).toBe("inactive_auth_scope");
    expect(localStorage.getItem(getScopedUserDataStorageKey("auth_user_1"))).toBeNull();
  });
});

describe("cloud import tracking", () => {
  it("marks cloud import completed for a user and fingerprint", () => {
    const data = createFreshUserData();
    data.goals.push(createRealGoal());
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(data));

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected candidate");

    expect(hasCompletedCloudImport("auth_user_1", candidate.fingerprint)).toBe(false);

    markCloudImportCompleted("auth_user_1", candidate.fingerprint);

    expect(hasCompletedCloudImport("auth_user_1", candidate.fingerprint)).toBe(true);
  });

  it("does not mark cloud import for a different user", () => {
    const data = createFreshUserData();
    data.goals.push(createRealGoal());
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(data));

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected candidate");

    markCloudImportCompleted("auth_user_1", candidate.fingerprint);

    expect(hasCompletedCloudImport("auth_user_2", candidate.fingerprint)).toBe(false);
  });

  it("cloud import completed also marks prompt as skipped", () => {
    const data = createFreshUserData();
    data.goals.push(createRealGoal());
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(data));

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected candidate");

    markCloudImportCompleted("auth_user_1", candidate.fingerprint);

    expect(hasSkippedLocalDataMigrationPrompt("auth_user_1", candidate.fingerprint)).toBe(true);
  });

  it("does not report completed for a different fingerprint", () => {
    markCloudImportCompleted("auth_user_1", "fingerprint_a");

    expect(hasCompletedCloudImport("auth_user_1", "fingerprint_b")).toBe(false);
    expect(hasCompletedCloudImport("auth_user_1", "fingerprint_a")).toBe(true);
  });

  it("import does not delete anonymous data", () => {
    const anonymousData = createFreshUserData();
    anonymousData.goals.push(createRealGoal());
    const anonymousRaw = JSON.stringify(anonymousData);
    const freshAccountRaw = JSON.stringify(createFreshUserData());
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, anonymousRaw);
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "auth_user_1");
    localStorage.setItem(STORAGE_KEY, freshAccountRaw);
    localStorage.setItem(getScopedUserDataStorageKey("auth_user_1"), freshAccountRaw);

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate) throw new Error("Expected candidate");

    const result = importAnonymousLocalDataToAccountScope("auth_user_1", candidate.fingerprint);

    expect(result.status).toBe("imported");
    // Anonymous data preserved
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(anonymousRaw);

    // Marking cloud import does not touch local/anonymous data
    markCloudImportCompleted("auth_user_1", candidate.fingerprint);

    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(anonymousRaw);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(anonymousRaw);
    expect(localStorage.getItem(getScopedUserDataStorageKey("auth_user_1"))).toBe(anonymousRaw);
  });

  it("handles empty/null arguments safely", () => {
    expect(hasCompletedCloudImport(null, "fp")).toBe(false);
    expect(hasCompletedCloudImport("uid", null)).toBe(false);
    expect(hasCompletedCloudImport(null, null)).toBe(false);

    // These should not throw
    markCloudImportCompleted("", "fp");
    markCloudImportCompleted("uid", "");
  });
});

