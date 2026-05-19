import { describe, expect, it } from "vitest";

import { buildSmartGoal, hasOutcomeIndicator } from "@/lib/smart-goal";
import { buildResult } from "@/app/pages/FeasibilityCheck/helpers";
import { getFeasibilityDraftDefaults } from "@/app/pages/12WeekSetup/helpers";
import { buildLeadIndicatorSchedules, getPreviewTasks } from "@/app/pages/12WeekSetup/helpers";
import {
  getMaxTasksPerTactic,
  getMaxWeeklyTaskCount,
  getWeeklyTaskWarning,
  isTaskCountInRecommendedRange,
} from "@/features/plan12week/logic/taskConstraints";

import { CORE_FUNNEL_SCENARIOS } from "./coreFunnelScenarios";

describe("core funnel scenarios — SMART quality", () => {
  for (const scenario of CORE_FUNNEL_SCENARIOS) {
    describe(scenario.id, () => {
      const goal = buildSmartGoal(scenario.smartInput);

      it("produces a normalized SMART goal with goal_summary", () => {
        expect(goal.id).toMatch(/^smart_goal_/);
        expect(goal.specific.goal_statement).toBe(scenario.smartInput.specificGoalStatement);
        expect(goal.measurable.target_value).toBe(scenario.smartInput.measurableTargetValue);
        expect(goal.goal_summary).toBeDefined();
      });

      it("matches expected difficulty bucket", () => {
        expect(goal.goal_summary?.difficulty).toBe(scenario.expectedSmart.difficulty);
      });

      it("specific statement passes hasOutcomeIndicator as expected", () => {
        expect(hasOutcomeIndicator(goal.specific.goal_statement)).toBe(scenario.expectedSmart.hasOutcomeIndicator);
      });
    });
  }
});

describe("core funnel scenarios — feasibility result", () => {
  for (const scenario of CORE_FUNNEL_SCENARIOS) {
    describe(scenario.id, () => {
      const result = buildResult(scenario.feasibilityAnswers, scenario.wheelScore);

      it("matches resultType, planLoad, weeklyCapacity", () => {
        expect(result.type).toBe(scenario.expectedFeasibility.resultType);
        expect(result.planLoad).toBe(scenario.expectedFeasibility.planLoad);
        expect(result.weeklyCapacity).toBe(scenario.expectedFeasibility.weeklyCapacity);
      });

      it("identifies the expected bottleneck axis and score", () => {
        expect(result.bottleneck.axis).toBe(scenario.expectedFeasibility.bottleneckAxis);
        expect(result.bottleneck.score).toBe(scenario.expectedFeasibility.bottleneckScore);
      });

      it("adjustedScore stays in expected range", () => {
        expect(result.adjustedScore).toBeGreaterThanOrEqual(scenario.expectedFeasibility.adjustedScoreAtLeast);
        expect(result.adjustedScore).toBeLessThanOrEqual(scenario.expectedFeasibility.adjustedScoreAtMost);
      });

      it("returns guidance and recommendation strings", () => {
        expect(result.firstWeekGuidance.length).toBeGreaterThan(0);
        expect(result.scopeRecommendation.length).toBeGreaterThan(0);
        expect(result.recommendation.length).toBeGreaterThan(0);
      });
    });
  }
});

describe("core funnel scenarios — plan load constraints", () => {
  for (const scenario of CORE_FUNNEL_SCENARIOS) {
    describe(scenario.id, () => {
      const feasibilityResult = buildResult(scenario.feasibilityAnswers, scenario.wheelScore);
      const draftDefaults = getFeasibilityDraftDefaults({
        resultType: feasibilityResult.type,
        resultTitle: feasibilityResult.title,
        resultSummary: feasibilityResult.summary,
        recommendation: feasibilityResult.recommendation,
        readinessScore: feasibilityResult.readinessScore,
        adjustedScore: feasibilityResult.adjustedScore,
        wheelScore: feasibilityResult.wheelScore,
        diagnosticScore: feasibilityResult.diagnosticScore,
        maxDiagnosticScore: feasibilityResult.maxDiagnosticScore,
        axisScores: feasibilityResult.axisScores,
        bottleneck: feasibilityResult.bottleneck,
        planLoad: feasibilityResult.planLoad,
        weeklyCapacity: feasibilityResult.weeklyCapacity,
        firstWeekGuidance: feasibilityResult.firstWeekGuidance,
        scopeRecommendation: feasibilityResult.scopeRecommendation,
      });

      const constraintsInput = {
        tacticLoadPreference: draftDefaults.tacticLoadPreference,
        dailyTimeBudget: draftDefaults.dailyTimeBudget,
      };

      it("derives expected daily time budget from feasibility weeklyCapacity", () => {
        expect(draftDefaults.dailyTimeBudget).toBe(scenario.expectedPlan.dailyTimeBudget);
      });

      it("max weekly task count matches expected", () => {
        expect(getMaxWeeklyTaskCount(constraintsInput)).toBe(scenario.expectedPlan.maxWeeklyTaskCount);
      });

      it("max tasks per tactic matches expected", () => {
        expect(getMaxTasksPerTactic(constraintsInput)).toBe(scenario.expectedPlan.maxTasksPerTactic);
      });

      it("week 1 task count from lead indicator schedule matches expected", () => {
        const previewTasks = getPreviewTasks(scenario.leadIndicators, {
          ...constraintsInput,
          preferredDays: scenario.preferredDays,
        });
        expect(previewTasks.length).toBe(scenario.expectedPlan.week1TaskCount);
      });

      it("recommended range flag matches expected", () => {
        expect(isTaskCountInRecommendedRange(scenario.expectedPlan.week1TaskCount)).toBe(
          scenario.expectedPlan.week1TaskCountInRecommendedRange,
        );
      });

      it("weekly task warning matches expected", () => {
        expect(getWeeklyTaskWarning(scenario.expectedPlan.week1TaskCount)).toBe(
          scenario.expectedPlan.weeklyTaskWarning,
        );
      });

      it("scheduled lead indicator count matches expected", () => {
        const scheduled = buildLeadIndicatorSchedules(scenario.leadIndicators, {
          ...constraintsInput,
          preferredDays: scenario.preferredDays,
        });
        expect(scheduled.length).toBe(scenario.expectedPlan.expectedLeadIndicatorCount);
      });

      it("each scheduled tactic stays within maxTasksPerTactic", () => {
        const scheduled = buildLeadIndicatorSchedules(scenario.leadIndicators, {
          ...constraintsInput,
          preferredDays: scenario.preferredDays,
        });
        const perTacticLimit = getMaxTasksPerTactic(constraintsInput);
        for (const indicator of scheduled) {
          expect(indicator.schedule.length).toBeLessThanOrEqual(perTacticLimit);
        }
      });
    });
  }
});

describe("core funnel scenarios — coverage", () => {
  it("covers all 8 expected goal types", () => {
    const goalTypes = new Set(CORE_FUNNEL_SCENARIOS.map((scenario) => scenario.goalType));
    expect(goalTypes.size).toBe(8);
    expect(goalTypes).toEqual(
      new Set(["skill", "health", "finance", "career", "exam", "project", "habit", "self_development"]),
    );
  });

  it("covers all 3 resultType bands", () => {
    const resultTypes = new Set(CORE_FUNNEL_SCENARIOS.map((scenario) => scenario.expectedFeasibility.resultType));
    expect(resultTypes).toEqual(new Set(["realistic", "challenging", "too_ambitious"]));
  });

  it("covers all 3 planLoad recommendations", () => {
    const planLoads = new Set(CORE_FUNNEL_SCENARIOS.map((scenario) => scenario.expectedFeasibility.planLoad));
    expect(planLoads).toEqual(new Set(["lighter", "balanced", "push"]));
  });

  it("covers all 3 weeklyCapacity bands", () => {
    const capacities = new Set(CORE_FUNNEL_SCENARIOS.map((scenario) => scenario.expectedFeasibility.weeklyCapacity));
    expect(capacities).toEqual(new Set(["low", "medium", "high"]));
  });

  it("scenario ids are unique", () => {
    const ids = CORE_FUNNEL_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
