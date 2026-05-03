import { describe, expect, it } from "vitest";

import { buildResult, type BuildResultOptions } from "./helpers";

// ---------------------------------------------------------------------------
// Helpers — build answer sets for specific scenarios
// ---------------------------------------------------------------------------

/**
 * Answer map: questionId → answer value string.
 * See constants.ts for question IDs:
 * 1=time, 2=energy, 3=resources, 4=clarity, 5=obstacle, 6=routine, 7=confidence.
 */
type AnswerMap = Record<number, string>;

function highCapacityClearGoal(): AnswerMap {
  return {
    1: "gt5",       // time: 4
    2: "energy_high",  // energy: 4
    3: "resources_ready", // resources: 4
    4: "very_realistic", // clarity: 4
    5: "none",       // obstacle: 4
    6: "always",     // routine: 4
    7: "committed",  // confidence: 4
  };
}

function lowTimeHighAmbition(): AnswerMap {
  return {
    1: "lt1",          // time: 1
    2: "energy_drained", // energy: 1
    3: "resources_ready", // resources: 4
    4: "realistic",    // clarity: 3
    5: "none",         // obstacle: 4
    6: "mostly",       // routine: 3
    7: "committed",    // confidence: 4
  };
}

function lowClarity(): AnswerMap {
  return {
    1: "3to5",         // time: 3
    2: "energy_stable", // energy: 3
    3: "resources_mostly_ready", // resources: 3
    4: "overwhelming", // clarity: 1
    5: "complexity",   // obstacle: 2
    6: "sometimes",    // routine: 2
    7: "interested",   // confidence: 2
  };
}

function lowResources(): AnswerMap {
  return {
    1: "3to5",           // time: 3
    2: "energy_stable",  // energy: 3
    3: "resources_missing", // resources: 1
    4: "challenging",    // clarity: 2
    5: "resources",      // obstacle: 2
    6: "mostly",         // routine: 3
    7: "ready",          // confidence: 3
  };
}

function lowConfidence(): AnswerMap {
  return {
    1: "1to3",          // time: 2
    2: "energy_low",    // energy: 2
    3: "resources_basic", // resources: 2
    4: "challenging",   // clarity: 2
    5: "motivation",    // obstacle: 2
    6: "sometimes",     // routine: 2
    7: "exploring",     // confidence: 1
  };
}

function lowContextBalance(): AnswerMap {
  return {
    1: "1to3",          // time: 2
    2: "energy_low",    // energy: 2
    3: "resources_basic", // resources: 2
    4: "challenging",   // clarity: 2
    5: "time",          // obstacle: 2
    6: "rarely",        // routine: 1
    7: "interested",    // confidence: 2
  };
}

function strongGoalLowCapacity(): AnswerMap {
  return {
    1: "lt1",             // time: 1
    2: "energy_drained",  // energy: 1
    3: "resources_basic", // resources: 2
    4: "realistic",       // clarity: 3
    5: "motivation",      // obstacle: 2
    6: "sometimes",       // routine: 2
    7: "interested",      // confidence: 2
  };
}

function weakGoalHighEnergy(): AnswerMap {
  return {
    1: "gt5",            // time: 4
    2: "energy_high",    // energy: 4
    3: "resources_ready", // resources: 4
    4: "very_realistic", // clarity: 4
    5: "none",           // obstacle: 4
    6: "always",         // routine: 4
    7: "committed",      // confidence: 4
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: high capacity + clear goal -> realistic
// ---------------------------------------------------------------------------

describe("high capacity + clear goal", () => {
  it("produces realistic result with high adjusted score", () => {
    const result = buildResult(highCapacityClearGoal(), 8);
    expect(result.type).toBe("realistic");
    expect(result.adjustedScore).toBeGreaterThanOrEqual(15);
    expect(result.readinessScore).toBeGreaterThanOrEqual(15);
    expect(result.weeklyCapacity).toBe("high");
  });

  it("recommendation contains actionable pre-plan step", () => {
    const result = buildResult(highCapacityClearGoal(), 8);
    expect(result.recommendation).toContain("Trước khi tạo kế hoạch 12 tuần");
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: low time + high ambition -> too_ambitious or challenging
// ---------------------------------------------------------------------------

describe("low time + high ambition", () => {
  it("produces challenging or too_ambitious result", () => {
    const result = buildResult(lowTimeHighAmbition(), 7);
    expect(["challenging", "too_ambitious"]).toContain(result.type);
  });

  it("bottleneck targets time or energy", () => {
    const result = buildResult(lowTimeHighAmbition(), 7);
    expect(["time", "energy"]).toContain(result.bottleneck.axis);
  });

  it("planLoad is lighter due to low capacity", () => {
    const result = buildResult(lowTimeHighAmbition(), 7);
    expect(result.planLoad).toBe("lighter");
    expect(result.weeklyCapacity).toBe("low");
  });

  it("firstWeekGuidance references bottleneck", () => {
    const result = buildResult(lowTimeHighAmbition(), 7);
    expect(result.firstWeekGuidance.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: low clarity -> should recommend narrowing scope
// ---------------------------------------------------------------------------

describe("low clarity", () => {
  it("bottleneck is clarity", () => {
    const result = buildResult(lowClarity(), 7);
    expect(result.bottleneck.axis).toBe("clarity");
  });

  it("recommendation advises narrowing scope", () => {
    const result = buildResult(lowClarity(), 7);
    expect(result.recommendation).toContain("thu hẹp mục tiêu");
  });

  it("scopeRecommendation is actionable", () => {
    const result = buildResult(lowClarity(), 7);
    expect(result.scopeRecommendation.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: low resources -> should add preparation week
// ---------------------------------------------------------------------------

describe("low resources", () => {
  it("bottleneck is resources", () => {
    const result = buildResult(lowResources(), 7);
    expect(result.bottleneck.axis).toBe("resources");
  });

  it("bottleneck action mentions preparation", () => {
    const result = buildResult(lowResources(), 7);
    expect(result.bottleneck.action).toContain("chuẩn bị");
  });

  it("recommendation contains pre-plan action for resources", () => {
    const result = buildResult(lowResources(), 7);
    expect(result.recommendation).toContain("nguồn lực");
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: low confidence -> first week should be lighter
// ---------------------------------------------------------------------------

describe("low confidence", () => {
  it("bottleneck is confidence", () => {
    const result = buildResult(lowConfidence(), 7);
    expect(result.bottleneck.axis).toBe("confidence");
  });

  it("planLoad is lighter", () => {
    const result = buildResult(lowConfidence(), 7);
    expect(result.planLoad).toBe("lighter");
  });

  it("firstWeekGuidance mentions lighter start", () => {
    const result = buildResult(lowConfidence(), 7);
    expect(result.firstWeekGuidance).toMatch(/nhẹ|thắng nhỏ|bắt buộc/);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: low life balance / context -> warn about conflict
// ---------------------------------------------------------------------------

describe("low life balance / context", () => {
  it("with very low wheel score, bottleneck becomes wheel", () => {
    const result = buildResult(lowContextBalance(), 2);
    expect(result.bottleneck.axis).toBe("wheel");
    expect(result.bottleneck.label).toContain("lĩnh vực");
  });

  it("bottleneck action mentions keeping goal small", () => {
    const result = buildResult(lowContextBalance(), 2);
    expect(result.bottleneck.action).toContain("nhỏ hơn");
  });

  it("wheel penalty lowers adjusted score", () => {
    const resultLow = buildResult(lowContextBalance(), 2);
    const resultHigh = buildResult(lowContextBalance(), 9);
    expect(resultLow.adjustedScore).toBeLessThan(resultHigh.adjustedScore);
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: strong SMART goal but low capacity -> challenging
// ---------------------------------------------------------------------------

describe("strong SMART goal + low capacity", () => {
  it("produces challenging or too_ambitious despite strong quality", () => {
    const result = buildResult(strongGoalLowCapacity(), 5, { smartGoalQualityLevel: "strong" });
    expect(["challenging", "too_ambitious"]).toContain(result.type);
  });

  it("does not have quality note when goal is strong", () => {
    const result = buildResult(strongGoalLowCapacity(), 5, { smartGoalQualityLevel: "strong" });
    expect(result.smartGoalQualityNote).toBeUndefined();
  });

  it("planLoad is lighter", () => {
    const result = buildResult(strongGoalLowCapacity(), 5, { smartGoalQualityLevel: "strong" });
    expect(result.planLoad).toBe("lighter");
  });
});

// ---------------------------------------------------------------------------
// Scenario 8: weak SMART goal + high energy -> still needs clarify
// ---------------------------------------------------------------------------

describe("weak SMART goal + high energy", () => {
  it("produces realistic for high-scoring answers", () => {
    const result = buildResult(weakGoalHighEnergy(), 8, { smartGoalQualityLevel: "weak" });
    expect(result.type).toBe("realistic");
  });

  it("adds quality note warning about unclear goal", () => {
    const result = buildResult(weakGoalHighEnergy(), 8, { smartGoalQualityLevel: "weak" });
    expect(result.smartGoalQualityNote).toBeDefined();
    expect(result.smartGoalQualityNote).toContain("chưa đủ rõ ràng");
    expect(result.smartGoalQualityNote).toContain("quay lại");
  });

  it("scopeRecommendation includes quality warning", () => {
    const result = buildResult(weakGoalHighEnergy(), 8, { smartGoalQualityLevel: "weak" });
    expect(result.scopeRecommendation).toContain("mục tiêu viết chưa rõ");
  });
});

// ---------------------------------------------------------------------------
// Quality bridge: okay goal has no quality note
// ---------------------------------------------------------------------------

describe("quality bridge — okay level", () => {
  it("does not add quality note for okay goal", () => {
    const result = buildResult(highCapacityClearGoal(), 8, { smartGoalQualityLevel: "okay" });
    expect(result.smartGoalQualityNote).toBeUndefined();
  });

  it("does not modify scopeRecommendation for okay goal", () => {
    const withoutQuality = buildResult(highCapacityClearGoal(), 8);
    const withOkay = buildResult(highCapacityClearGoal(), 8, { smartGoalQualityLevel: "okay" });
    expect(withoutQuality.scopeRecommendation).toBe(withOkay.scopeRecommendation);
  });
});

// ---------------------------------------------------------------------------
// Quality bridge: no quality level (backward compat)
// ---------------------------------------------------------------------------

describe("quality bridge — no quality level", () => {
  it("produces valid result without quality options", () => {
    const result = buildResult(highCapacityClearGoal(), 8);
    expect(result.type).toBe("realistic");
    expect(result.smartGoalQualityNote).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Scoring thresholds
// ---------------------------------------------------------------------------

describe("scoring thresholds", () => {
  it("realistic threshold: adjustedScore >= 15", () => {
    const result = buildResult(highCapacityClearGoal(), 8);
    expect(result.adjustedScore).toBeGreaterThanOrEqual(15);
    expect(result.type).toBe("realistic");
  });

  it("too_ambitious threshold: adjustedScore < 10", () => {
    const result = buildResult(lowConfidence(), 3);
    expect(result.adjustedScore).toBeLessThan(10);
    expect(result.type).toBe("too_ambitious");
  });

  it("challenging is between thresholds", () => {
    const result = buildResult(lowClarity(), 8);
    expect(result.adjustedScore).toBeGreaterThanOrEqual(10);
    expect(result.adjustedScore).toBeLessThan(15);
    expect(result.type).toBe("challenging");
  });
});

// ---------------------------------------------------------------------------
// Weakest dimension / bottleneck
// ---------------------------------------------------------------------------

describe("bottleneck detection", () => {
  it("detects weakest question axis", () => {
    const result = buildResult(lowResources(), 8);
    expect(result.bottleneck.axis).toBe("resources");
    expect(result.bottleneck.score).toBe(1);
  });

  it("detects wheel as bottleneck when very low", () => {
    const result = buildResult(highCapacityClearGoal(), 2);
    expect(result.bottleneck.axis).toBe("wheel");
  });

  it("bottleneck has an action string", () => {
    const result = buildResult(lowResources(), 7);
    expect(result.bottleneck.action.length).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// Result copy is actionable, not generic
// ---------------------------------------------------------------------------

describe("result copy is actionable", () => {
  it("recommendation always contains pre-plan action", () => {
    for (const [answers, wheel] of [
      [highCapacityClearGoal(), 8],
      [lowClarity(), 7],
      [lowTimeHighAmbition(), 3],
    ] as [AnswerMap, number][]) {
      const result = buildResult(answers, wheel);
      expect(result.recommendation).toContain("Trước khi tạo kế hoạch 12 tuần");
    }
  });

  it("firstWeekGuidance is not empty", () => {
    const result = buildResult(lowConfidence(), 5);
    expect(result.firstWeekGuidance.length).toBeGreaterThan(10);
  });

  it("scopeRecommendation is not empty", () => {
    const result = buildResult(lowClarity(), 7);
    expect(result.scopeRecommendation.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Analytics safety: no raw user text in result
// ---------------------------------------------------------------------------

describe("analytics safety", () => {
  it("result does not contain raw user text fields", () => {
    const result = buildResult(highCapacityClearGoal(), 8, { smartGoalQualityLevel: "strong" });
    const payload = {
      focus_area: "career",
      result_type: result.type,
      readiness_score: result.readinessScore,
      adjusted_score: result.adjustedScore,
      bottleneck_axis: result.bottleneck.axis,
      plan_load: result.planLoad,
      weekly_capacity: result.weeklyCapacity,
      answer_count: 7,
    };
    const payloadString = JSON.stringify(payload);
    expect(payloadString).not.toContain("goal_statement");
    expect(payloadString).not.toContain("motivation_reason");
    expect(payloadString).not.toContain("metric_name");
  });
});

// ---------------------------------------------------------------------------
// Result structure completeness
// ---------------------------------------------------------------------------

describe("result structure", () => {
  it("contains all required fields", () => {
    const result = buildResult(highCapacityClearGoal(), 7);
    expect(result.type).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.recommendation).toBeDefined();
    expect(result.readinessScore).toBeDefined();
    expect(result.adjustedScore).toBeDefined();
    expect(result.wheelScore).toBe(7);
    expect(result.diagnosticScore).toBeDefined();
    expect(result.maxDiagnosticScore).toBe(28);
    expect(result.axisScores).toHaveLength(7);
    expect(result.bottleneck).toBeDefined();
    expect(result.planLoad).toBeDefined();
    expect(result.weeklyCapacity).toBeDefined();
    expect(result.firstWeekGuidance).toBeDefined();
    expect(result.scopeRecommendation).toBeDefined();
  });

  it("adjusted score is never negative", () => {
    const result = buildResult(lowConfidence(), 1);
    expect(result.adjustedScore).toBeGreaterThanOrEqual(0);
  });

  it("readiness score is 0-20 range", () => {
    const result = buildResult(highCapacityClearGoal(), 8);
    expect(result.readinessScore).toBeGreaterThanOrEqual(0);
    expect(result.readinessScore).toBeLessThanOrEqual(20);
  });
});
