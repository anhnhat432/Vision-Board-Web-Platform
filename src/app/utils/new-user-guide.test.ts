import { beforeEach, describe, expect, it } from "vitest";

import { APP_STORAGE_KEYS, getUserData, saveUserData } from "./storage";
import { getNewUserGuideProgress } from "./new-user-guide";

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
});
