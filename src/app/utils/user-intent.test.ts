import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildIntentAnalyticsPayload,
  clearUserIntent,
  getArchetypeForIntent,
  getUserIntent,
  getUserIntentId,
  getUserIntentLabel,
  getUserIntentOptions,
  hasActionableArchetypeHint,
  isUserIntentId,
  setUserIntent,
  type UserIntentId,
} from "./user-intent";

const STORAGE_KEY = "user_intent";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("user-intent — taxonomy", () => {
  it("exposes the 7 positive intents + the 'unsure' escape", () => {
    const ids = getUserIntentOptions().map((option) => option.id);
    expect(ids).toEqual([
      "complete_project",
      "build_habit",
      "learn_skill",
      "improve_health",
      "prepare_exam",
      "grow_finance",
      "find_direction",
      "unsure",
    ]);
  });

  it("isUserIntentId gates only on the enum", () => {
    expect(isUserIntentId("complete_project")).toBe(true);
    expect(isUserIntentId("unsure")).toBe(true);
    expect(isUserIntentId("nope")).toBe(false);
    expect(isUserIntentId(null)).toBe(false);
    expect(isUserIntentId(42)).toBe(false);
  });

  it("getUserIntentLabel returns the friendly Vietnamese label", () => {
    expect(getUserIntentLabel("learn_skill")).toMatch(/kỹ năng/i);
    expect(getUserIntentLabel("unsure")).toMatch(/Chưa chắc/i);
  });
});

describe("user-intent — storage", () => {
  it("getUserIntent returns null when no choice has ever been made", () => {
    expect(getUserIntent()).toBeNull();
    expect(getUserIntentId()).toBeNull();
  });

  it("setUserIntent persists id + timestamp as JSON", () => {
    const now = new Date("2026-05-03T10:00:00.000Z");
    const record = setUserIntent("build_habit", now);

    expect(record).toEqual({ intent: "build_habit", updatedAt: "2026-05-03T10:00:00.000Z" });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBe(JSON.stringify(record));
  });

  it("getUserIntent round-trips a stored record", () => {
    setUserIntent("improve_health");
    expect(getUserIntent()?.intent).toBe("improve_health");
    expect(getUserIntentId()).toBe("improve_health");
  });

  it("rejects malformed payloads without throwing", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    expect(getUserIntent()).toBeNull();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ intent: "🙃", updatedAt: "x" }));
    expect(getUserIntent()).toBeNull();
  });

  it("clearUserIntent removes the record", () => {
    setUserIntent("prepare_exam");
    clearUserIntent();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getUserIntent()).toBeNull();
  });
});

describe("user-intent — archetype mapping", () => {
  const cases: Array<[UserIntentId, string]> = [
    ["complete_project", "project_completion"],
    ["build_habit", "habit_building"],
    ["learn_skill", "skill_learning"],
    ["improve_health", "health_fitness"],
    ["prepare_exam", "exam_study"],
    ["grow_finance", "financial_goal"],
    ["find_direction", "other"],
    ["unsure", "other"],
  ];

  for (const [intent, archetype] of cases) {
    it(`maps ${intent} → ${archetype}`, () => {
      expect(getArchetypeForIntent(intent)).toBe(archetype);
    });
  }

  it("hasActionableArchetypeHint is false for unsure / find_direction / missing", () => {
    expect(hasActionableArchetypeHint("unsure")).toBe(false);
    expect(hasActionableArchetypeHint("find_direction")).toBe(false);
    expect(hasActionableArchetypeHint(null)).toBe(false);
    expect(hasActionableArchetypeHint(undefined)).toBe(false);
  });

  it("hasActionableArchetypeHint is true for the 6 concrete intents", () => {
    for (const intent of [
      "complete_project",
      "build_habit",
      "learn_skill",
      "improve_health",
      "prepare_exam",
      "grow_finance",
    ] as UserIntentId[]) {
      expect(hasActionableArchetypeHint(intent)).toBe(true);
    }
  });
});

describe("user-intent — analytics safety", () => {
  it("buildIntentAnalyticsPayload returns id only (never label or text)", () => {
    const payload = buildIntentAnalyticsPayload("learn_skill");
    expect(payload).toEqual({ intent_id: "learn_skill" });
    expect(Object.keys(payload)).toEqual(["intent_id"]);
  });
});
