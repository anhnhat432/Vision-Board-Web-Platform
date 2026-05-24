import { describe, expect, it } from "vitest";

import type { UserData } from "@/app/utils/storage-types";

import { isLocalDataUntouchedSeed } from "../conflict-policy";

function makeUserData(overrides: Partial<UserData> = {}): UserData {
  const base: UserData = {
    storageVersion: 8,
    userId: "user_test",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: {} as UserData["appPreferences"],
    onboardingCompleted: false,
    isHydratedFromDemo: false,
  };
  return { ...base, ...overrides };
}

describe("isLocalDataUntouchedSeed", () => {
  it("returns true for fresh empty seed (createEmptyUserData shape)", () => {
    expect(isLocalDataUntouchedSeed(makeUserData())).toBe(true);
  });

  it("returns false when onboarding has been completed", () => {
    expect(isLocalDataUntouchedSeed(makeUserData({ onboardingCompleted: true }))).toBe(false);
  });

  it("returns false when local has any goal", () => {
    expect(
      isLocalDataUntouchedSeed(
        makeUserData({
          goals: [
            {
              id: "g1",
              category: "Career",
              title: "Goal of the user",
              description: "",
              deadline: "2026-12-31",
              feasibilityResult: "Khả thi",
              readinessScore: 0,
              focusArea: "Career",
              createdAt: new Date().toISOString(),
              tasks: [],
            } as UserData["goals"][number],
          ],
        }),
      ),
    ).toBe(false);
  });

  it("returns false when local has reflections", () => {
    expect(
      isLocalDataUntouchedSeed(
        makeUserData({
          reflections: [
            {
              id: "r1",
              date: "2026-05-01",
              title: "first reflection",
              content: "content",
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("returns false when local has wheel-of-life history", () => {
    expect(
      isLocalDataUntouchedSeed(
        makeUserData({
          wheelOfLifeHistory: [
            {
              date: "2026-05-01",
              areas: [],
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("returns false when local has achievements", () => {
    expect(
      isLocalDataUntouchedSeed(
        makeUserData({
          achievements: [
            {
              id: "a1",
              title: "First Steps",
              description: "",
              icon: "Target",
              earnedAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("returns false when local has vision boards", () => {
    expect(
      isLocalDataUntouchedSeed(
        makeUserData({
          visionBoards: [
            {
              id: "b1",
              name: "Vision",
              year: "2026",
              items: [],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("returns false when local was hydrated from demo data", () => {
    expect(isLocalDataUntouchedSeed(makeUserData({ isHydratedFromDemo: true }))).toBe(false);
  });

  it("returns false when given null/undefined input", () => {
    expect(isLocalDataUntouchedSeed(null)).toBe(false);
    expect(isLocalDataUntouchedSeed(undefined)).toBe(false);
  });
});
