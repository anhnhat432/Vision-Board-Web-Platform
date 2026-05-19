import { describe, expect, it } from "vitest";

import {
  analyzeFirstTaskTitle,
  evaluateTwelveWeekPlanQuality,
  getPlanImprovementSuggestions,
  getPlanQualityWarnings,
  type PlanQualityContext,
  type PlanQualityInput,
} from "./planQuality";

function makePlan(overrides: Partial<PlanQualityInput> = {}): PlanQualityInput {
  return {
    vision12Week:
      overrides.vision12Week ?? "Trong 12 tuần, tôi muốn xây thói quen viết blog hằng tuần để chia sẻ kiến thức.",
    week12Outcome: overrides.week12Outcome ?? "Xuất bản 12 bài blog dài 800+ từ.",
    goalType: overrides.goalType ?? "Habit Building",
    lagMetric: overrides.lagMetric ?? { name: "Số bài blog", target: "12", unit: "bài" },
    leadIndicators: overrides.leadIndicators ?? [
      { name: "Viết draft", target: "2", schedule: [1, 4], type: "core" },
      { name: "Edit & publish", target: "1", schedule: [6], type: "core" },
    ],
    milestones: overrides.milestones ?? {
      week4: "Hoàn thành 4 bài blog đầu tiên",
      week8: "Đã publish 8 bài và có 50 followers mới",
      week12: "Xuất bản 12 bài blog",
    },
    reviewDay: overrides.reviewDay ?? "Sunday",
    tacticLoadPreference: overrides.tacticLoadPreference ?? "balanced",
    dailyTimeBudget: overrides.dailyTimeBudget ?? "1h",
    personalConstraint: overrides.personalConstraint ?? "consistency",
  };
}

function makeContext(overrides: Partial<PlanQualityContext> = {}): PlanQualityContext {
  return {
    weeklyTaskCount: overrides.weeklyTaskCount ?? 3,
    feasibility: overrides.feasibility,
  };
}

describe("evaluateTwelveWeekPlanQuality - basic structure", () => {
  it("returns 7 dimensions totaling 100 max", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), makeContext());
    expect(result.dimensions).toHaveLength(7);
    const totalMax = result.dimensions.reduce((sum, dim) => sum + dim.maxScore, 0);
    expect(totalMax).toBe(100);
  });

  it("overall score is the sum of dimension scores", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), makeContext());
    const summed = result.dimensions.reduce((sum, dim) => sum + dim.score, 0);
    expect(result.overallScore).toBe(summed);
  });

  it("level reflects threshold bands", () => {
    const strong = evaluateTwelveWeekPlanQuality(makePlan(), makeContext());
    expect(strong.level).toMatch(/strong|okay/);

    const weak = evaluateTwelveWeekPlanQuality(
      makePlan({
        vision12Week: "",
        week12Outcome: "",
        lagMetric: { name: "", target: "", unit: "" },
        leadIndicators: [],
        milestones: { week4: "", week8: "", week12: "" },
        reviewDay: "",
        dailyTimeBudget: "",
      }),
      { weeklyTaskCount: 0 },
    );
    expect(weak.level).toBe("weak");
  });
});

describe("valid plan gets strong quality level", () => {
  it("a complete plan with feasibility match gets strong overall score", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ tacticLoadPreference: "lighter" }),
      makeContext({
        weeklyTaskCount: 3,
        feasibility: {
          planLoad: "lighter",
          weeklyCapacity: "low",
          bottleneck: { axis: "time", label: "Thời gian thật" },
          adjustedScore: 9,
        },
      }),
    );

    expect(result.level).toBe("strong");
    expect(result.warnings).toHaveLength(0);
  });
});

describe("low capacity plan has lighter week 1", () => {
  it("week-one-startability awards points when low feasibility and ≤4 tasks", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ tacticLoadPreference: "lighter" }),
      makeContext({
        weeklyTaskCount: 4,
        feasibility: {
          planLoad: "lighter",
          weeklyCapacity: "low",
          bottleneck: { axis: "energy", label: "Năng lượng" },
        },
      }),
    );

    const startability = result.dimensions.find((dim) => dim.id === "week-one-startability");
    expect(startability?.score).toBeGreaterThanOrEqual(10);
    expect(result.warnings.find((w) => w.includes("tuần đầu"))).toBeUndefined();
  });

  it("warns when low feasibility but week 1 has > 4 tasks", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ tacticLoadPreference: "push", dailyTimeBudget: "2h+" }),
      makeContext({
        weeklyTaskCount: 6,
        feasibility: {
          planLoad: "lighter",
          weeklyCapacity: "low",
          bottleneck: { axis: "energy", label: "Năng lượng" },
        },
      }),
    );

    const overloadWarning = result.warnings.find((w) => w.includes("tuần đầu"));
    expect(overloadWarning).toBeDefined();
  });
});

describe("balanced plan has reasonable task count", () => {
  it("balanced + 1h budget with 4 tasks scores full task-load dimension", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ tacticLoadPreference: "balanced", dailyTimeBudget: "1h" }),
      makeContext({ weeklyTaskCount: 4 }),
    );

    const taskLoad = result.dimensions.find((dim) => dim.id === "task-load");
    expect(taskLoad?.score).toBe(taskLoad?.maxScore);
  });
});

describe("push plan still respects max weekly tasks", () => {
  it("push plan with 6 tasks (within ceiling) does not warn", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ tacticLoadPreference: "push", dailyTimeBudget: "2h+" }),
      makeContext({ weeklyTaskCount: 6 }),
    );

    const overloadWarning = result.warnings.find((w) => w.includes("vượt giới hạn"));
    expect(overloadWarning).toBeUndefined();
  });

  it("push plan with 8 tasks exceeds max and warns", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ tacticLoadPreference: "push", dailyTimeBudget: "2h+" }),
      makeContext({ weeklyTaskCount: 8 }),
    );

    const overloadWarning = result.warnings.find((w) => w.includes("vượt giới hạn"));
    expect(overloadWarning).toBeDefined();
  });
});

describe("no lead indicators shows warning", () => {
  it("warns when lead indicators array is empty", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan({ leadIndicators: [] }), makeContext({ weeklyTaskCount: 0 }));

    expect(result.warnings.find((w) => w.toLowerCase().includes("việc lặp lại"))).toBeDefined();
    const dim = result.dimensions.find((d) => d.id === "lead-indicators");
    expect(dim?.score).toBe(0);
  });

  it("warns when there is only 1 lead indicator", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ leadIndicators: [{ name: "Viết draft", target: "2", schedule: [1, 4] }] }),
      makeContext({ weeklyTaskCount: 2 }),
    );

    expect(result.warnings.find((w) => w.includes("ít nhất 2"))).toBeDefined();
  });

  it("warns when lead indicators count exceeds 4", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        leadIndicators: [
          { name: "A", target: "1", schedule: [1] },
          { name: "B", target: "1", schedule: [2] },
          { name: "C", target: "1", schedule: [3] },
          { name: "D", target: "1", schedule: [4] },
          { name: "E", target: "1", schedule: [5] },
        ],
      }),
      makeContext({ weeklyTaskCount: 5 }),
    );

    expect(result.warnings.find((w) => w.includes("vượt khuyến nghị"))).toBeDefined();
  });

  it("suggests adding target when indicators lack numeric target", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        leadIndicators: [
          { name: "Viết draft", target: "abc" },
          { name: "Edit & publish", target: "" },
        ],
      }),
      makeContext({ weeklyTaskCount: 2 }),
    );

    expect(result.suggestions.find((s) => s.includes("số lần"))).toBeDefined();
  });
});

describe("vague milestones show warning", () => {
  it("warns when both week 4 and week 8 milestones are too short", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ milestones: { week4: "Tốt", week8: "OK", week12: "Xong" } }),
      makeContext(),
    );

    expect(result.warnings.find((w) => w.includes("chung chung"))).toBeDefined();
  });

  it("does not warn when milestones are specific enough", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        milestones: {
          week4: "Hoàn thành 4 bài blog đầu tiên với độ dài 800 từ",
          week8: "Đã publish 8 bài và có 50 followers mới",
          week12: "Xuất bản đủ 12 bài blog",
        },
      }),
      makeContext(),
    );

    expect(result.warnings.find((w) => w.includes("chung chung"))).toBeUndefined();
    const milestonesDim = result.dimensions.find((d) => d.id === "milestones");
    expect(milestonesDim?.status).toBe("strong");
  });
});

describe("feasibility alignment", () => {
  it("warns when plan picks push but feasibility recommends lighter", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ tacticLoadPreference: "push", dailyTimeBudget: "2h+" }),
      makeContext({
        weeklyTaskCount: 5,
        feasibility: { planLoad: "lighter", weeklyCapacity: "low" },
      }),
    );

    expect(result.warnings.find((w) => w.includes("'push'"))).toBeDefined();
  });

  it("awards full alignment score when plan matches feasibility recommendation", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ tacticLoadPreference: "lighter", personalConstraint: "time" }),
      makeContext({
        weeklyTaskCount: 3,
        feasibility: {
          planLoad: "lighter",
          bottleneck: { axis: "time", label: "Thời gian thật" },
        },
      }),
    );

    const alignment = result.dimensions.find((d) => d.id === "feasibility-alignment");
    expect(alignment?.score).toBe(alignment?.maxScore);
  });

  it("suggests change when constraint does not match bottleneck axis", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({ personalConstraint: "motivation" }),
      makeContext({
        weeklyTaskCount: 3,
        feasibility: {
          planLoad: "balanced",
          bottleneck: { axis: "clarity", label: "Độ rõ mục tiêu" },
        },
      }),
    );

    expect(result.suggestions.find((s) => s.toLowerCase().includes("trở ngại"))).toBeDefined();
  });

  it("plans without feasibility context get half score for alignment", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), makeContext());
    const alignment = result.dimensions.find((d) => d.id === "feasibility-alignment");
    expect(alignment?.score).toBe(5);
  });

  it("suggests improving SMART goal when quality level is weak", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan(),
      makeContext({
        feasibility: { smartGoalQualityLevel: "weak" },
      }),
    );

    expect(result.suggestions.find((s) => s.toLowerCase().includes("smart"))).toBeDefined();
  });
});

describe("review cadence", () => {
  it("warns when reviewDay is missing", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan({ reviewDay: "" }), makeContext());
    expect(result.warnings.find((w) => w.includes("ngày nhìn lại"))).toBeDefined();
  });

  it("suggests setting daily time budget if empty", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan({ dailyTimeBudget: "" }), makeContext());
    expect(result.suggestions.find((s) => s.includes("ngân sách thời gian"))).toBeDefined();
  });
});

describe("outcome clarity", () => {
  it("warns when vision12Week is empty", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan({ vision12Week: "" }), makeContext());
    expect(result.warnings.find((w) => w.toLowerCase().includes("tầm nhìn"))).toBeDefined();
  });

  it("warns when week12Outcome is empty", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan({ week12Outcome: "" }), makeContext());
    expect(result.warnings.find((w) => w.toLowerCase().includes("kết quả tuần 12"))).toBeDefined();
  });
});

describe("getPlanQualityWarnings / getPlanImprovementSuggestions", () => {
  it("getPlanQualityWarnings returns the same warnings as evaluate()", () => {
    const plan = makePlan({ leadIndicators: [] });
    const ctx = makeContext({ weeklyTaskCount: 0 });
    expect(getPlanQualityWarnings(plan, ctx)).toEqual(evaluateTwelveWeekPlanQuality(plan, ctx).warnings);
  });

  it("getPlanImprovementSuggestions returns the same suggestions as evaluate()", () => {
    const plan = makePlan({ dailyTimeBudget: "" });
    const ctx = makeContext();
    expect(getPlanImprovementSuggestions(plan, ctx)).toEqual(evaluateTwelveWeekPlanQuality(plan, ctx).suggestions);
  });
});

describe("Week 1 Startability — analyzeFirstTaskTitle", () => {
  it("flags empty/missing title as missing", () => {
    expect(analyzeFirstTaskTitle("")).toEqual({
      isMissing: true,
      isVague: false,
      missingActionVerb: false,
    });
    expect(analyzeFirstTaskTitle("   ")).toEqual({
      isMissing: true,
      isVague: false,
      missingActionVerb: false,
    });
  });

  it("flags very short or generic titles as vague", () => {
    expect(analyzeFirstTaskTitle("ok").isVague).toBe(true);
    expect(analyzeFirstTaskTitle("Việc 1").isVague).toBe(true);
    expect(analyzeFirstTaskTitle("Task").isVague).toBe(true);
    expect(analyzeFirstTaskTitle("Kết quả").isVague).toBe(true);
  });

  it("flags titles without action verbs", () => {
    // "Buổi sáng" is a noun phrase, no action verb
    expect(analyzeFirstTaskTitle("Buổi sáng").missingActionVerb).toBe(true);
    expect(analyzeFirstTaskTitle("Code quality cao").missingActionVerb).toBe(false); // "code" is verb
  });

  it("does not flag a clear concrete task title", () => {
    const analysis = analyzeFirstTaskTitle("Viết draft 800 từ về SMART goals");
    expect(analysis).toEqual({
      isMissing: false,
      isVague: false,
      missingActionVerb: false,
    });
  });

  it("recognises common Vietnamese action verbs", () => {
    expect(analyzeFirstTaskTitle("Đo baseline cân và nhịp tim").missingActionVerb).toBe(false);
    expect(analyzeFirstTaskTitle("Chạy 5km buổi sáng").missingActionVerb).toBe(false);
    expect(analyzeFirstTaskTitle("Lên lịch deep work 60 phút").missingActionVerb).toBe(false);
    expect(analyzeFirstTaskTitle("Gửi tin nhắn chốt 1:1 với mentor").missingActionVerb).toBe(false);
  });

  it("recognises common English action verbs at start", () => {
    expect(analyzeFirstTaskTitle("Write rough draft 200 words").missingActionVerb).toBe(false);
    expect(analyzeFirstTaskTitle("Ship MVP scope document").missingActionVerb).toBe(false);
  });
});

describe("Week 1 Startability — first task warnings (additive)", () => {
  it("warns when firstTaskTitle is empty but tasks exist", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), {
      weeklyTaskCount: 3,
      firstTaskTitle: "",
    });
    expect(result.warnings.find((w) => w.includes("Việc đầu tiên tuần 1 chưa có tên"))).toBeDefined();
  });

  it("warns when firstTaskTitle is vague", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), {
      weeklyTaskCount: 3,
      firstTaskTitle: "Việc 1",
    });
    expect(result.warnings.find((w) => w.includes("Việc đầu tiên còn mơ hồ"))).toBeDefined();
  });

  it("warns when firstTaskTitle has no action verb", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), {
      weeklyTaskCount: 3,
      firstTaskTitle: "Buổi sáng cuối tuần",
    });
    expect(result.warnings.find((w) => w.includes("thiếu động từ hành động"))).toBeDefined();
  });

  it("does not warn when firstTaskTitle is clear and concrete", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), {
      weeklyTaskCount: 3,
      firstTaskTitle: "Viết draft 800 từ về SMART goals",
    });
    expect(result.warnings.find((w) => w.includes("Việc đầu tiên"))).toBeUndefined();
  });

  it("does not add first-task warnings when firstTaskTitle is omitted (backwards compat)", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), {
      weeklyTaskCount: 3,
      // firstTaskTitle absent
    });
    expect(result.warnings.find((w) => w.includes("Việc đầu tiên"))).toBeUndefined();
  });

  it("does not change overall scoring when firstTaskTitle is provided vs omitted", () => {
    const baseline = evaluateTwelveWeekPlanQuality(makePlan(), { weeklyTaskCount: 3 });
    const withVagueTitle = evaluateTwelveWeekPlanQuality(makePlan(), {
      weeklyTaskCount: 3,
      firstTaskTitle: "Việc 1",
    });
    expect(withVagueTitle.overallScore).toBe(baseline.overallScore);
    expect(withVagueTitle.dimensions.map((d) => d.score)).toEqual(baseline.dimensions.map((d) => d.score));
  });
});

describe("dimension status thresholds", () => {
  it("dimensions return strong/okay/weak based on score ratio", () => {
    const result = evaluateTwelveWeekPlanQuality(makePlan(), makeContext());
    for (const dim of result.dimensions) {
      const ratio = dim.score / dim.maxScore;
      if (ratio >= 0.7) expect(dim.status).toBe("strong");
      else if (ratio >= 0.4) expect(dim.status).toBe("okay");
      else expect(dim.status).toBe("weak");
    }
  });
});
