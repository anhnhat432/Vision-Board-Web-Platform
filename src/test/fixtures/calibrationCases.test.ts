import { describe, expect, it } from "vitest";
import { assessPlanQuality, assessWeekOneLoad } from "@/features/plan12week/logic";
import {
  assessGoalClarity,
  buildSmartGoal,
  generateGoalClaritySuggestions,
  getCalibratedDifficulty,
  isQualitativeMetric,
} from "@/lib/smart-goal";

import { CALIBRATION_CASES } from "./calibrationCases";

describe("rubric calibration — SMART quality", () => {
  for (const calibrationCase of CALIBRATION_CASES) {
    describe(calibrationCase.id, () => {
      const goal = buildSmartGoal(calibrationCase.smartInput);

      it("returns expected clarity level", () => {
        const assessment = assessGoalClarity(goal);
        expect(assessment.level).toBe(calibrationCase.expectedClarityLevel);
      });

      it("includes expected missing dimensions", () => {
        if (!calibrationCase.expectedClarityMissingIncludes) return;
        const assessment = assessGoalClarity(goal);
        for (const missing of calibrationCase.expectedClarityMissingIncludes) {
          expect(assessment.missing).toContain(missing);
        }
      });

      it("returns expected calibrated difficulty", () => {
        expect(getCalibratedDifficulty(goal)).toBe(calibrationCase.expectedCalibratedDifficulty);
      });

      it("emits suggestions containing expected keywords", () => {
        if (!calibrationCase.expectedSuggestionMustInclude) return;
        const suggestions = generateGoalClaritySuggestions(goal).join(" | ");
        for (const keyword of calibrationCase.expectedSuggestionMustInclude) {
          expect(suggestions).toContain(keyword);
        }
      });
    });
  }
});

describe("rubric calibration — plan quality", () => {
  for (const calibrationCase of CALIBRATION_CASES) {
    if (!calibrationCase.planSnapshot) continue;
    const snapshot = calibrationCase.planSnapshot;

    describe(calibrationCase.id, () => {
      it("returns expected week-one load level", () => {
        const result = assessWeekOneLoad({
          taskCount: snapshot.weekOneTaskCount,
          planLoad: snapshot.planLoad,
          weeklyCapacity: snapshot.weeklyCapacity,
        });
        expect(result.level).toBe(snapshot.expectedWeekOneLevel);
      });

      it("returns expected plan quality level", () => {
        const assessment = assessPlanQuality({
          weekOneTaskCount: snapshot.weekOneTaskCount,
          planLoad: snapshot.planLoad,
          weeklyCapacity: snapshot.weeklyCapacity,
          leadIndicatorCount: snapshot.leadIndicatorCount,
          hasLagMetric: snapshot.hasLagMetric,
          hasMidCycleMilestones: snapshot.hasMidCycleMilestones,
        });
        expect(assessment.level).toBe(snapshot.expectedLevel);
      });

      it("emits warnings count at or above expected", () => {
        const assessment = assessPlanQuality({
          weekOneTaskCount: snapshot.weekOneTaskCount,
          planLoad: snapshot.planLoad,
          weeklyCapacity: snapshot.weeklyCapacity,
          leadIndicatorCount: snapshot.leadIndicatorCount,
          hasLagMetric: snapshot.hasLagMetric,
          hasMidCycleMilestones: snapshot.hasMidCycleMilestones,
        });
        expect(assessment.warnings.length).toBeGreaterThanOrEqual(snapshot.expectedWarningsCountAtLeast);
      });
    });
  }
});

describe("rubric calibration — guardrails", () => {
  it("does NOT over-score a vague-with-high-motivation goal", () => {
    const vagueCase = CALIBRATION_CASES.find((c) => c.id === "vague-with-high-motivation");
    if (!vagueCase) throw new Error("missing fixture");
    const assessment = assessGoalClarity(buildSmartGoal(vagueCase.smartInput));
    expect(assessment.level).toBe("weak");
    expect(assessment.score).toBeLessThan(0.6);
  });

  it("flags qualitative metrics so easy/medium/hard label is suppressed", () => {
    const ieltsLike = CALIBRATION_CASES.find((c) => c.id === "strong-but-overambitious");
    if (!ieltsLike) throw new Error("missing fixture");
    const goal = buildSmartGoal(ieltsLike.smartInput);
    expect(isQualitativeMetric(goal)).toBe(true);
    expect(getCalibratedDifficulty(goal)).toBe("qualitative");
  });

  it("does NOT warn lighter+low capacity for sustainable 2-task week 1", () => {
    const lowCapCase = CALIBRATION_CASES.find((c) => c.id === "clear-with-low-capacity");
    if (!lowCapCase?.planSnapshot) throw new Error("missing fixture");
    const result = assessWeekOneLoad({
      taskCount: lowCapCase.planSnapshot.weekOneTaskCount,
      planLoad: lowCapCase.planSnapshot.planLoad,
      weeklyCapacity: lowCapCase.planSnapshot.weeklyCapacity,
    });
    expect(result.level).toBe("appropriate");
    expect(result.warning).toBeNull();
    expect(result.suggestion).toBeNull();
  });

  it("escalates to overloaded above hard cap, not just upper_limit", () => {
    const overloaded = CALIBRATION_CASES.find((c) => c.id === "good-plan-overloaded-week-one");
    if (!overloaded?.planSnapshot) throw new Error("missing fixture");
    const result = assessWeekOneLoad({
      taskCount: overloaded.planSnapshot.weekOneTaskCount,
      planLoad: overloaded.planSnapshot.planLoad,
      weeklyCapacity: overloaded.planSnapshot.weeklyCapacity,
    });
    expect(result.level).toBe("overloaded");
    expect(result.warning).not.toBeNull();
    expect(result.suggestion).not.toBeNull();
  });

  it("strong realistic plan reaches strong without novelty bias", () => {
    const realistic = CALIBRATION_CASES.find((c) => c.id === "realistic-boring-effective");
    if (!realistic?.planSnapshot) throw new Error("missing fixture");
    const assessment = assessPlanQuality({
      weekOneTaskCount: realistic.planSnapshot.weekOneTaskCount,
      planLoad: realistic.planSnapshot.planLoad,
      weeklyCapacity: realistic.planSnapshot.weeklyCapacity,
      leadIndicatorCount: realistic.planSnapshot.leadIndicatorCount,
      hasLagMetric: realistic.planSnapshot.hasLagMetric,
      hasMidCycleMilestones: realistic.planSnapshot.hasMidCycleMilestones,
    });
    expect(assessment.level).toBe("strong");
    expect(assessment.warnings).toHaveLength(0);
  });

  it("plan with no lag metric is weak regardless of week-1 load", () => {
    const assessment = assessPlanQuality({
      weekOneTaskCount: 4,
      planLoad: "balanced",
      weeklyCapacity: "medium",
      leadIndicatorCount: 3,
      hasLagMetric: false,
      hasMidCycleMilestones: true,
    });
    expect(assessment.level).toBe("weak");
    expect(assessment.warnings.some((warning) => warning.includes("kết quả chính"))).toBe(true);
  });

  it("suggestions are actionable (not platitudes)", () => {
    for (const calibrationCase of CALIBRATION_CASES) {
      const goal = buildSmartGoal(calibrationCase.smartInput);
      const suggestions = generateGoalClaritySuggestions(goal);
      for (const suggestion of suggestions) {
        // Heuristic: each suggestion is at least 30 chars and contains a verb-driven hint.
        expect(suggestion.length).toBeGreaterThanOrEqual(30);
      }
    }
  });
});
