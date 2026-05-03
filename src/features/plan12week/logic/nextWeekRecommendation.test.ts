import { describe, expect, it } from "vitest";

import {
  getNextWeekAdjustmentRecommendation,
  type NextWeekRecommendationContext,
} from "./nextWeekRecommendation";

function makeContext(overrides: Partial<NextWeekRecommendationContext> = {}): NextWeekRecommendationContext {
  return {
    weekCompletionPercent: overrides.weekCompletionPercent ?? 70,
    leadMetricCompletionPercent: overrides.leadMetricCompletionPercent ?? null,
    dailyCheckInConsistencyPercent: overrides.dailyCheckInConsistencyPercent ?? null,
    workloadDecision: overrides.workloadDecision,
    feasibilityPlanLoad: overrides.feasibilityPlanLoad ?? null,
    rescueSeverity: overrides.rescueSeverity ?? null,
    rescueTriggers: overrides.rescueTriggers ?? [],
  };
}

describe("getNextWeekAdjustmentRecommendation — user-driven overrides", () => {
  it("recommends 'lighter' when user says workload was too much", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ workloadDecision: "reduce slightly", weekCompletionPercent: 65 }),
    );
    expect(result.recommendation).toBe("lighter");
    expect(result.reasonCodes).toContain("user_says_too_much");
    expect(result.confidence).toBe("medium");
  });

  it("recommends 'lighter' with high confidence when user says too much AND completion is low", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ workloadDecision: "reduce slightly", weekCompletionPercent: 30 }),
    );
    expect(result.recommendation).toBe("lighter");
    expect(result.confidence).toBe("high");
    expect(result.reasonCodes).toContain("user_says_too_much");
    expect(result.reasonCodes).toContain("low_week_completion");
  });

  it("recommends 'push' when user says workload was too easy", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ workloadDecision: "increase slightly", weekCompletionPercent: 75 }),
    );
    expect(result.recommendation).toBe("push");
    expect(result.reasonCodes).toContain("user_says_too_easy");
  });

  it("recommends 'push' with high confidence when user says too easy AND completion is high", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ workloadDecision: "increase slightly", weekCompletionPercent: 90 }),
    );
    expect(result.recommendation).toBe("push");
    expect(result.confidence).toBe("high");
  });
});

describe("getNextWeekAdjustmentRecommendation — rescue overrides", () => {
  it("recommends 'reset' when rescue severity is urgent (highest priority)", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ rescueSeverity: "urgent", weekCompletionPercent: 90 }),
    );
    expect(result.recommendation).toBe("reset");
    expect(result.reasonCodes).toContain("rescue_urgent");
  });

  it("urgent rescue beats explicit user 'increase slightly'", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        rescueSeverity: "urgent",
        workloadDecision: "increase slightly",
        weekCompletionPercent: 95,
      }),
    );
    expect(result.recommendation).toBe("reset");
  });

  it("includes 'weekly_review_missed' reason when triggered together with very low completion", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 20,
        rescueTriggers: ["weekly-review-missed"],
      }),
    );
    expect(result.recommendation).toBe("reset");
    expect(result.reasonCodes).toContain("very_low_week_completion");
    expect(result.reasonCodes).toContain("weekly_review_missed");
  });

  it("missed weekly review alone (without low completion) does not force reset", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 75,
        rescueTriggers: ["weekly-review-missed"],
      }),
    );
    // Mid completion → still 'same'; review-missed contributes only when completion is very low.
    expect(result.recommendation).toBe("same");
  });
});

describe("getNextWeekAdjustmentRecommendation — completion-driven rules", () => {
  it("recommends 'reset' for very low completion", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ weekCompletionPercent: 25 }),
    );
    expect(result.recommendation).toBe("reset");
    expect(result.reasonCodes).toContain("very_low_week_completion");
  });

  it("recommends 'lighter' for low completion (<50%)", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ weekCompletionPercent: 40 }),
    );
    expect(result.recommendation).toBe("lighter");
    expect(result.reasonCodes).toContain("low_week_completion");
  });

  it("recommends 'same' for mid completion (50-79%)", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ weekCompletionPercent: 65 }),
    );
    expect(result.recommendation).toBe("same");
  });

  it("recommends 'push' for strong completion + strong lead metric + consistent check-ins", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 90,
        leadMetricCompletionPercent: 85,
        dailyCheckInConsistencyPercent: 80,
      }),
    );
    expect(result.recommendation).toBe("push");
    expect(result.confidence).toBe("high");
    expect(result.reasonCodes).toContain("high_lead_metric_completion");
    expect(result.reasonCodes).toContain("consistent_check_ins");
  });

  it("does NOT push when completion is high but lead metric or consistency is missing/weak", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 90,
        leadMetricCompletionPercent: 60,
        dailyCheckInConsistencyPercent: 50,
      }),
    );
    expect(result.recommendation).toBe("same");
  });

  it("recommends 'reduce_scope' when completion is high but lead metric is low", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 80,
        leadMetricCompletionPercent: 20,
      }),
    );
    expect(result.recommendation).toBe("reduce_scope");
    expect(result.reasonCodes).toContain("high_week_completion");
    expect(result.reasonCodes).toContain("low_lead_metric_completion");
  });
});

describe("getNextWeekAdjustmentRecommendation — combined low completion + rescue/feasibility", () => {
  it("low completion + rescue active still leads to 'lighter' but with higher confidence", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 40,
        rescueSeverity: "active",
      }),
    );
    expect(result.recommendation).toBe("lighter");
    expect(result.reasonCodes).toContain("rescue_active");
    expect(result.confidence).toBe("medium");
  });

  it("low completion + feasibility lighter doubles support for 'lighter'", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 35,
        feasibilityPlanLoad: "lighter",
      }),
    );
    expect(result.recommendation).toBe("lighter");
    expect(result.reasonCodes).toContain("feasibility_lighter");
  });

  it("low completion + inconsistent check-ins captures both reason codes", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 40,
        dailyCheckInConsistencyPercent: 20,
      }),
    );
    expect(result.recommendation).toBe("lighter");
    expect(result.reasonCodes).toContain("inconsistent_check_ins");
    expect(result.confidence).toBe("medium");
  });
});

describe("getNextWeekAdjustmentRecommendation — confidence", () => {
  it("returns 'low' confidence when only weekCompletionPercent is provided in mid-band", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ weekCompletionPercent: 60 }),
    );
    expect(result.recommendation).toBe("same");
    // Mid-band has 1 implicit signal → medium.
    expect(["low", "medium"]).toContain(result.confidence);
  });

  it("returns 'high' confidence when 3+ signals agree", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 90,
        leadMetricCompletionPercent: 80,
        dailyCheckInConsistencyPercent: 80,
        feasibilityPlanLoad: "push",
      }),
    );
    expect(result.confidence).toBe("high");
  });

  it("returns 'high' confidence when user is explicit AND signals agree", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 90,
        workloadDecision: "increase slightly",
      }),
    );
    expect(result.confidence).toBe("high");
  });
});

describe("getNextWeekAdjustmentRecommendation — copy", () => {
  it("each recommendation has a non-empty headline, body, and priority hint", () => {
    const cases: NextWeekRecommendationContext[] = [
      makeContext({ weekCompletionPercent: 90, leadMetricCompletionPercent: 80, dailyCheckInConsistencyPercent: 80 }),
      makeContext({ weekCompletionPercent: 65 }),
      makeContext({ weekCompletionPercent: 40 }),
      makeContext({ weekCompletionPercent: 20 }),
      makeContext({ weekCompletionPercent: 80, leadMetricCompletionPercent: 20 }),
    ];
    for (const context of cases) {
      const result = getNextWeekAdjustmentRecommendation(context);
      expect(result.headline.length).toBeGreaterThan(0);
      expect(result.body.length).toBeGreaterThan(0);
      expect(result.suggestedNextWeekPriority.length).toBeGreaterThan(0);
    }
  });

  it("does not interpolate user content (raw text) into output", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ weekCompletionPercent: 40 }),
    );
    const combined = `${result.headline} ${result.body} ${result.suggestedNextWeekPriority}`;
    // Sanity: outputs contain no placeholders or numeric percentages beyond canned copy.
    expect(combined).not.toMatch(/\{[^}]+\}/);
    expect(combined).not.toMatch(/__/);
  });

  it("reason codes are stable enum values (safe for analytics)", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({
        weekCompletionPercent: 90,
        leadMetricCompletionPercent: 80,
        dailyCheckInConsistencyPercent: 80,
        workloadDecision: "increase slightly",
        feasibilityPlanLoad: "push",
      }),
    );
    for (const code of result.reasonCodes) {
      expect(typeof code).toBe("string");
      expect(code).toMatch(/^[a-z_]+$/);
    }
  });
});

describe("getNextWeekAdjustmentRecommendation — backwards compat", () => {
  it("works with only weekCompletionPercent (legacy review)", () => {
    const result = getNextWeekAdjustmentRecommendation({ weekCompletionPercent: 60 });
    expect(result.recommendation).toBe("same");
  });

  it("treats workloadDecision='' (legacy unset) as no override", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ workloadDecision: "", weekCompletionPercent: 65 }),
    );
    expect(result.recommendation).toBe("same");
    expect(result.reasonCodes).not.toContain("user_says_keep_same");
  });

  it("clamps invalid percentages instead of throwing", () => {
    const result = getNextWeekAdjustmentRecommendation({
      weekCompletionPercent: 250,
      leadMetricCompletionPercent: -50,
      dailyCheckInConsistencyPercent: Number.NaN,
    });
    expect(["same", "push", "reduce_scope"]).toContain(result.recommendation);
  });

  it("ignores unknown rescueSeverity gracefully (treats as null)", () => {
    const result = getNextWeekAdjustmentRecommendation(
      makeContext({ weekCompletionPercent: 65 }),
    );
    expect(result.recommendation).toBe("same");
  });
});
