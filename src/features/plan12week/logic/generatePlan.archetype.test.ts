import { describe, expect, it } from "vitest";

import { generate12WeekPlan } from "./generatePlan";
import { getArchetypePlanFullDefaults } from "./planArchetypeDefaults";

const GOAL_INPUT = {
  id: "smart_goal_test",
  goal_statement: "Test goal statement for archetype plan generation",
} as const;

describe("generate12WeekPlan - backwards compatible (no archetype)", () => {
  it("returns 12 empty weeks when no archetype provided", () => {
    const plan = generate12WeekPlan(GOAL_INPUT);
    expect(plan.weeks).toHaveLength(12);
    expect(plan.weeks.every((week) => week.focus === "")).toBe(true);
    expect(plan.weeks.every((week) => week.expectedOutput === "")).toBe(true);
    expect(plan.weeks.every((week) => week.tasks.length === 0)).toBe(true);
    expect(plan.weeks.every((week) => week.leadMetrics.length === 0)).toBe(true);
  });

  it("preserves vision and smartGoalId", () => {
    const plan = generate12WeekPlan(GOAL_INPUT);
    expect(plan.vision).toBe(GOAL_INPUT.goal_statement);
    expect(plan.smartGoalId).toBe(GOAL_INPUT.id);
  });
});

describe("generate12WeekPlan - 'other' archetype fallback", () => {
  it("still creates a 12-week plan with generic seed", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "other" });
    expect(plan.weeks).toHaveLength(12);
    expect(plan.weeks[0].focus.length).toBeGreaterThan(0);
    expect(plan.weeks[0].expectedOutput.length).toBeGreaterThan(0);
    expect(plan.weeks[0].leadMetrics.length).toBeGreaterThan(0);
  });
});

describe("generate12WeekPlan - skill_learning", () => {
  it("seeds week 1 with a practice/output focus and lead metrics mentioning practice or demo", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "skill_learning" });
    const week1 = plan.weeks[0];
    expect(week1.focus.toLowerCase()).toMatch(/dự án|feedback|output/);
    expect(week1.leadMetrics.length).toBeGreaterThanOrEqual(2);
    const metricNames = week1.leadMetrics.map((m) => m.name.toLowerCase()).join(" ");
    expect(metricNames).toMatch(/luyện|pair|demo|thực hành/i);
  });

  it("sets milestone expectedOutput referencing output at weeks 4/8/12", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "skill_learning" });
    expect(plan.weeks[3].expectedOutput.toLowerCase()).toMatch(/output|dự án|sản phẩm/i);
    expect(plan.weeks[11].expectedOutput.toLowerCase()).toMatch(/portfolio|sản phẩm/i);
  });
});

describe("generate12WeekPlan - health_fitness", () => {
  it("week 1 is sustainable (baseline / light)", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "health_fitness" });
    const week1 = plan.weeks[0];
    expect(week1.focus.toLowerCase()).toMatch(/baseline|nhẹ|form|quen/i);
    expect(week1.expectedOutput.toLowerCase()).toMatch(/baseline|buổi ngắn|ngắn/i);
  });

  it("recommends 'lighter' starting tactic load", () => {
    const defaults = getArchetypePlanFullDefaults("health_fitness");
    expect(defaults.weekOneTacticLoadHint).toBe("lighter");
  });
});

describe("generate12WeekPlan - project_completion", () => {
  it("milestones at weeks 4/8/12 reference deliverables (ship/scope/MVP)", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "project_completion" });
    const combined = [plan.weeks[3].expectedOutput, plan.weeks[7].expectedOutput, plan.weeks[11].expectedOutput]
      .join(" ")
      .toLowerCase();
    expect(combined).toMatch(/ship|mvp|deliver|scope/);
  });
});

describe("generate12WeekPlan - exam_study", () => {
  it("seeds week 1 with practice test baseline focus and cadence lead metrics", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "exam_study" });
    expect(plan.weeks[0].focus.toLowerCase()).toMatch(/đề thi thử|baseline|ôn/i);
    const metricNames = plan.weeks[0].leadMetrics.map((m) => m.name.toLowerCase()).join(" ");
    expect(metricNames).toMatch(/đề thi|spaced repetition|luyện/i);
  });
});

describe("generate12WeekPlan - financial_goal", () => {
  it("week 1 and lead metrics cover controllable actions (tracking, auto-transfer)", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "financial_goal" });
    const combined = `${plan.weeks[0].focus} ${plan.weeks[0].expectedOutput}`.toLowerCase();
    expect(combined).toMatch(/tracking|tự động|tiết kiệm/i);
    const metricNames = plan.weeks[0].leadMetrics.map((m) => m.name.toLowerCase()).join(" ");
    expect(metricNames).toMatch(/track|chuyển khoản|review/i);
  });
});

describe("generate12WeekPlan - habit_building", () => {
  it("week 1 focuses on 2-minute cue-based habit", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "habit_building" });
    expect(plan.weeks[0].focus.toLowerCase()).toMatch(/2 phút|cue|routine/i);
  });
});

describe("generate12WeekPlan - low-feasibility week 1 sizing", () => {
  it("standard feasibility seeds the standard first action", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, {
      goalArchetype: "skill_learning",
      feasibilityHint: { planLoad: "balanced", weeklyCapacity: "medium" },
    });
    const week1Output = plan.weeks[0].expectedOutput;
    expect(week1Output).toContain("Việc đầu tiên:");
    expect(week1Output.toLowerCase()).toMatch(/30-60 phút|24h tới/);
  });

  it("low feasibility (lighter planLoad) produces a smaller week 1 first action", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, {
      goalArchetype: "skill_learning",
      feasibilityHint: { planLoad: "lighter", weeklyCapacity: "low" },
    });
    const week1Output = plan.weeks[0].expectedOutput;
    expect(week1Output).toContain("Việc đầu tiên:");
    expect(week1Output.toLowerCase()).toMatch(/15 phút|chỉ cần bắt đầu/);
  });

  it("low capacity alone triggers the smaller variant", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, {
      goalArchetype: "habit_building",
      feasibilityHint: { weeklyCapacity: "low" },
    });
    const week1Output = plan.weeks[0].expectedOutput.toLowerCase();
    expect(week1Output).toMatch(/1 phút|bấm khởi động/);
  });

  it("energy/confidence bottleneck triggers the smaller variant", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, {
      goalArchetype: "project_completion",
      feasibilityHint: { bottleneckAxis: "confidence" },
    });
    const week1Output = plan.weeks[0].expectedOutput.toLowerCase();
    expect(week1Output).toMatch(/3 dòng scope|10 phút/);
  });

  it("project archetype week 1 explicitly mentions clarify scope", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "project_completion" });
    expect(plan.weeks[0].expectedOutput.toLowerCase()).toMatch(/phạm vi/);
  });

  it("habit archetype week 1 explicitly mentions environment / cue", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "habit_building" });
    expect(plan.weeks[0].expectedOutput.toLowerCase()).toMatch(/tín hiệu|nhịp quen thuộc/);
  });

  it("skill archetype week 1 explicitly mentions practice/luyện", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "skill_learning" });
    expect(plan.weeks[0].expectedOutput.toLowerCase()).toMatch(/luyện|practice|pair review/);
  });

  it("week 1 always has a 'Việc đầu tiên' line for any archetype", () => {
    const archetypes = [
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
    ] as const;
    for (const archetype of archetypes) {
      const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: archetype });
      expect(plan.weeks[0].expectedOutput).toContain("Việc đầu tiên:");
    }
  });
});

describe("generate12WeekPlan - stability", () => {
  it("different archetypes produce different week-1 focus", () => {
    const skill = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "skill_learning" });
    const health = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "health_fitness" });
    const project = generate12WeekPlan(GOAL_INPUT, { goalArchetype: "project_completion" });
    expect(skill.weeks[0].focus).not.toBe(health.weeks[0].focus);
    expect(skill.weeks[0].focus).not.toBe(project.weeks[0].focus);
  });

  it("all archetypes produce 12 weeks", () => {
    const archetypes = [
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
    ] as const;
    for (const archetype of archetypes) {
      const plan = generate12WeekPlan(GOAL_INPUT, { goalArchetype: archetype });
      expect(plan.weeks).toHaveLength(12);
    }
  });
});
