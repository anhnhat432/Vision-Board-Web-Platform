import { describe, expect, it } from "vitest";

import type { GoalArchetype } from "@/lib/smart-goal";

import {
  getPlanRationale,
  type PlanRationaleInput,
  type PlanRationaleReasonId,
  type PlanRationaleWarningId,
} from "./planRationale";

function makeInput(overrides: Partial<PlanRationaleInput> = {}): PlanRationaleInput {
  return {
    vision12Week: "Hoàn thành mục tiêu trong 12 tuần",
    week12Outcome: "Mục tiêu hoàn thành",
    leadIndicators: overrides.leadIndicators ?? [
      { name: "Việc lặp lại 1", type: "core", schedule: [1, 3, 5] },
      { name: "Việc lặp lại 2", type: "optional", schedule: [2, 4] },
    ],
    milestones: overrides.milestones ?? {
      week4: "Cột mốc tuần 4",
      week8: "Cột mốc tuần 8",
      week12: "Kết quả cuối",
    },
    reviewDay: "Sunday",
    tacticLoadPreference: "balanced",
    weeklyTaskCount: 4,
    firstTaskTitle: "Viết draft 800 từ",
    ...overrides,
  };
}

function reasonIds(result: ReturnType<typeof getPlanRationale>): PlanRationaleReasonId[] {
  return result.reasons.map((reason) => reason.id);
}

function warningIds(result: ReturnType<typeof getPlanRationale>): PlanRationaleWarningId[] {
  return result.warnings.map((warning) => warning.id);
}

describe("getPlanRationale — capacity", () => {
  it("low capacity surfaces a 'lighter for low capacity' reason", () => {
    const result = getPlanRationale(makeInput({ tacticLoadPreference: "lighter" }), {
      feasibility: {
        weeklyCapacity: "low",
        planLoad: "lighter",
      },
    });
    expect(reasonIds(result)).toContain("lighter_for_low_capacity");
    const target = result.reasons.find((r) => r.id === "lighter_for_low_capacity");
    expect(target?.text).toMatch(/giữ nhịp/i);
  });

  it("high capacity + push surfaces 'push_for_high_capacity'", () => {
    const result = getPlanRationale(makeInput({ tacticLoadPreference: "push" }), {
      feasibility: { weeklyCapacity: "high", planLoad: "push" },
    });
    expect(reasonIds(result)).toContain("push_for_high_capacity");
  });

  it("balanced default surfaces 'balanced_for_medium_capacity'", () => {
    const result = getPlanRationale(makeInput(), {
      feasibility: { weeklyCapacity: "medium", planLoad: "balanced" },
    });
    expect(reasonIds(result)).toContain("balanced_for_medium_capacity");
  });
});

describe("getPlanRationale — bottleneck", () => {
  it("surfaces a bottleneck reason and interpolates the canned axis label", () => {
    const result = getPlanRationale(makeInput(), {
      feasibility: {
        weeklyCapacity: "medium",
        planLoad: "balanced",
        bottleneck: { axis: "energy", label: "Năng lượng hiện tại" },
      },
    });
    expect(reasonIds(result)).toContain("addresses_bottleneck");
    const target = result.reasons.find((r) => r.id === "addresses_bottleneck");
    expect(target?.text).toMatch(/Năng lượng hiện tại/);
    expect(target?.text).toMatch(/tuần đầu nhẹ/i);
  });

  it("does not include bottleneck reason when feasibility is missing", () => {
    const result = getPlanRationale(makeInput(), {});
    expect(reasonIds(result)).not.toContain("addresses_bottleneck");
  });
});

describe("getPlanRationale — archetype framing", () => {
  it("project_completion mentions milestones", () => {
    const result = getPlanRationale(makeInput(), {
      goalArchetype: "project_completion",
    });
    const archetypeReason = result.reasons.find((r) => r.id === "archetype_specific_focus");
    expect(archetypeReason?.text).toMatch(/cột mốc tuần 4 và tuần 8/i);
  });

  it("health_fitness mentions sustainable pace / no burnout", () => {
    const result = getPlanRationale(makeInput(), {
      goalArchetype: "health_fitness",
    });
    const archetypeReason = result.reasons.find((r) => r.id === "archetype_specific_focus");
    expect(archetypeReason?.text).toMatch(/(vừa sức|tránh kiệt sức|chấn thương)/i);
  });

  it("exam_study mentions practice tests", () => {
    const result = getPlanRationale(makeInput(), {
      goalArchetype: "exam_study",
    });
    const archetypeReason = result.reasons.find((r) => r.id === "archetype_specific_focus");
    expect(archetypeReason?.text).toMatch(/đề thi thử/i);
  });

  it("'other' archetype skips the archetype-specific reason", () => {
    const result = getPlanRationale(makeInput(), { goalArchetype: "other" });
    expect(reasonIds(result)).not.toContain("archetype_specific_focus");
  });

  it("missing archetype skips the archetype-specific reason", () => {
    const result = getPlanRationale(makeInput(), {});
    expect(reasonIds(result)).not.toContain("archetype_specific_focus");
  });
});

describe("getPlanRationale — fallback", () => {
  it("returns at least 2 reasons even with empty context", () => {
    const result = getPlanRationale(makeInput(), {});
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("returns useful structural reasons when only the input is provided", () => {
    const result = getPlanRationale(makeInput(), {});
    // Indicators + milestones + balanced default + week 1 small should fire.
    expect(reasonIds(result)).toEqual(
      expect.arrayContaining(["indicators_keep_weekly_rhythm", "milestones_break_into_steps"]),
    );
  });

  it("never exceeds 5 reasons even when many rules fire", () => {
    const result = getPlanRationale(
      makeInput({
        weeklyTaskCount: 4,
        firstTaskTitle: "Viết draft 800 từ rõ ràng",
      }),
      {
        goalArchetype: "skill_learning",
        feasibility: {
          weeklyCapacity: "high",
          planLoad: "push",
          bottleneck: { axis: "time", label: "Thời gian thật" },
        },
      },
    );
    expect(result.reasons.length).toBeLessThanOrEqual(5);
  });

  it("metrics slice is analytics-safe (numbers + booleans only)", () => {
    const result = getPlanRationale(makeInput(), {
      goalArchetype: "skill_learning",
      feasibility: { weeklyCapacity: "low", planLoad: "lighter" },
    });
    for (const value of Object.values(result.metrics)) {
      expect(typeof value === "number" || typeof value === "boolean").toBe(true);
    }
    expect(result.metrics.has_archetype).toBe(true);
    expect(result.metrics.has_feasibility_context).toBe(true);
  });
});

describe("getPlanRationale — warnings", () => {
  it("flags too few indicators (<2)", () => {
    const result = getPlanRationale(
      makeInput({
        leadIndicators: [{ name: "Việc lặp lại duy nhất", type: "core", schedule: [1] }],
      }),
      {},
    );
    expect(warningIds(result)).toContain("indicators_too_few");
    expect(result.adjustments.map((a) => a.id)).toContain("add_indicator");
  });

  it("flags missing milestones when there are tasks but no milestones", () => {
    const result = getPlanRationale(
      makeInput({
        milestones: { week4: "", week8: "", week12: "" },
      }),
      {},
    );
    expect(warningIds(result)).toContain("milestones_missing");
    expect(result.adjustments.map((a) => a.id)).toContain("add_milestone");
  });

  it("flags week-1 overload (more tasks than the ceiling for capacity)", () => {
    const result = getPlanRationale(
      makeInput({
        weeklyTaskCount: 9,
      }),
      {
        feasibility: { weeklyCapacity: "medium", planLoad: "balanced" },
      },
    );
    expect(warningIds(result)).toContain("week_one_overloaded");
    expect(result.adjustments.map((a) => a.id)).toEqual(
      expect.arrayContaining(["trim_week_one", "switch_to_lighter"]),
    );
  });

  it("flags load mismatch when push + low capacity", () => {
    const result = getPlanRationale(makeInput({ tacticLoadPreference: "push" }), {
      feasibility: { weeklyCapacity: "low", planLoad: "push" },
    });
    expect(warningIds(result)).toContain("load_mismatched_to_capacity");
  });

  it("flags weak SMART goal when feasibility says so", () => {
    const result = getPlanRationale(makeInput(), {
      feasibility: { smartGoalQualityLevel: "weak" },
    });
    expect(warningIds(result)).toContain("smart_quality_weak");
    expect(result.adjustments.map((a) => a.id)).toContain("fix_smart_goal");
  });

  it("returns no warnings for a healthy plan", () => {
    const result = getPlanRationale(makeInput(), {
      goalArchetype: "skill_learning",
      feasibility: { weeklyCapacity: "medium", planLoad: "balanced" },
    });
    expect(result.warnings).toHaveLength(0);
  });
});

describe("getPlanRationale — adjustments default", () => {
  it("offers a default 'switch_to_push' adjustment when nothing is wrong and load is balanced", () => {
    const result = getPlanRationale(makeInput(), {
      feasibility: { weeklyCapacity: "medium", planLoad: "balanced" },
    });
    expect(result.adjustments.map((a) => a.id)).toContain("switch_to_push");
  });

  it("offers a default 'switch_to_lighter' adjustment when nothing is wrong and load is push", () => {
    const result = getPlanRationale(makeInput({ tacticLoadPreference: "push" }), {
      feasibility: { weeklyCapacity: "high", planLoad: "push" },
    });
    expect(result.adjustments.map((a) => a.id)).toContain("switch_to_lighter");
  });

  it("never returns more than 3 adjustments", () => {
    const result = getPlanRationale(
      makeInput({
        weeklyTaskCount: 12,
        leadIndicators: [{ name: "x", type: "core", schedule: [1] }],
        milestones: { week4: "", week8: "", week12: "" },
      }),
      {
        feasibility: { weeklyCapacity: "low", planLoad: "push", smartGoalQualityLevel: "weak" },
      },
    );
    expect(result.adjustments.length).toBeLessThanOrEqual(3);
  });
});

describe("getPlanRationale — copy safety", () => {
  it("never echoes the user's vision text into reasons", () => {
    const result = getPlanRationale(makeInput({ vision12Week: "RAW USER TEXT" }), {});
    const allText = result.reasons.map((r) => r.text).join(" ");
    expect(allText).not.toMatch(/RAW USER TEXT/);
  });

  it("never echoes the user's first task title into reasons", () => {
    const result = getPlanRationale(makeInput({ firstTaskTitle: "RAW TASK TITLE" }), {});
    const allText = result.reasons.map((r) => r.text).join(" ");
    expect(allText).not.toMatch(/RAW TASK TITLE/);
  });

  it("never echoes indicator names into reasons", () => {
    const result = getPlanRationale(
      makeInput({
        leadIndicators: [
          { name: "RAW INDICATOR NAME 1", type: "core", schedule: [1] },
          { name: "RAW INDICATOR NAME 2", type: "core", schedule: [2] },
        ],
      }),
      {},
    );
    const allText = result.reasons.map((r) => r.text).join(" ");
    expect(allText).not.toMatch(/RAW INDICATOR NAME/);
  });

  it("does not contain success-promising language", () => {
    const archetypes: GoalArchetype[] = [
      "skill_learning",
      "health_fitness",
      "career_growth",
      "financial_goal",
      "exam_study",
      "project_completion",
      "habit_building",
      "creative_output",
      "relationship_life",
      "other",
    ];
    for (const archetype of archetypes) {
      const result = getPlanRationale(makeInput(), { goalArchetype: archetype });
      const text = result.reasons.map((r) => r.text).join(" ");
      expect(text).not.toMatch(/(chắc\s*chắn\s*thành\s*công|guarantee|đảm\s*bảo\s*kết\s*quả)/i);
    }
  });

  it("uses canned Vietnamese with no template placeholders left in copy", () => {
    const result = getPlanRationale(makeInput(), {
      goalArchetype: "habit_building",
      feasibility: {
        weeklyCapacity: "medium",
        planLoad: "balanced",
        bottleneck: { axis: "time", label: "Thời gian thật" },
      },
    });
    for (const reason of result.reasons) {
      expect(reason.text).not.toMatch(/\{[^}]+\}/);
      expect(reason.text.length).toBeGreaterThan(0);
    }
  });
});
