import { describe, expect, it } from "vitest";

import type { SmartGoal } from "./types";
import {
  evaluateSmartGoalQuality,
  getSmartGoalQualityScore,
  getSmartGoalQualityWarnings,
  getSmartGoalImprovementSuggestions,
} from "./quality";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGoal(overrides: Partial<SmartGoal> = {}): SmartGoal {
  return {
    id: "test_goal_1",
    domain: "career",
    specific: {
      goal_statement: "",
    },
    measurable: {
      metric_name: "",
      target_value: 1,
    },
    achievable: {
      weekly_time_commitment_hours: 1,
      required_skills: [],
      support_resources: [],
    },
    relevant: {
      motivation_reason: "",
    },
    time_bound: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeStrongGoal(): SmartGoal {
  return makeGoal({
    specific: {
      goal_statement:
        "Hoàn thành chứng chỉ AWS Solutions Architect và áp dụng vào dự án nội bộ trước cuối quý 3.",
    },
    measurable: {
      metric_name: "Số module hoàn thành",
      metric_unit: "module",
      baseline_value: 2,
      target_value: 12,
    },
    achievable: {
      weekly_time_commitment_hours: 6,
      required_skills: ["Cloud computing", "Networking cơ bản"],
      support_resources: ["Khóa Udemy", "Mentor nội bộ"],
    },
    relevant: {
      motivation_reason:
        "Vì chứng chỉ này gắn trực tiếp với lộ trình thăng chức và tăng thu nhập 20% trong 2 năm tới.",
      life_dimension_alignment: "sự nghiệp",
    },
    time_bound: {
      target_weeks: 12,
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("evaluateSmartGoalQuality", () => {
  it("returns all 8 dimensions", () => {
    const result = evaluateSmartGoalQuality(makeGoal());
    expect(result.dimensions).toHaveLength(8);
    const dimensionNames = result.dimensions.map((d) => d.dimension);
    expect(dimensionNames).toContain("specificity");
    expect(dimensionNames).toContain("measurableClarity");
    expect(dimensionNames).toContain("baselineTargetQuality");
    expect(dimensionNames).toContain("achievableRealism");
    expect(dimensionNames).toContain("resourceSupportClarity");
    expect(dimensionNames).toContain("relevanceMotivation");
    expect(dimensionNames).toContain("timeBoundClarity");
    expect(dimensionNames).toContain("twelveWeekCompatibility");
  });

  it("score is always 0-100", () => {
    const empty = evaluateSmartGoalQuality(makeGoal());
    expect(empty.overallScore).toBeGreaterThanOrEqual(0);
    expect(empty.overallScore).toBeLessThanOrEqual(100);

    const strong = evaluateSmartGoalQuality(makeStrongGoal());
    expect(strong.overallScore).toBeGreaterThanOrEqual(0);
    expect(strong.overallScore).toBeLessThanOrEqual(100);
  });

  it("level is one of weak/okay/strong", () => {
    const result = evaluateSmartGoalQuality(makeGoal());
    expect(["weak", "okay", "strong"]).toContain(result.level);
  });
});

describe("goal quá chung chung", () => {
  it("scores low when goal statement is vague and short", () => {
    const goal = makeGoal({
      specific: { goal_statement: "Tốt hơn" },
    });
    const result = evaluateSmartGoalQuality(goal);
    expect(result.overallScore).toBeLessThan(40);
    expect(result.level).toBe("weak");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("gives specificity warnings for empty statement", () => {
    const goal = makeGoal();
    const result = evaluateSmartGoalQuality(goal);
    const specificityDim = result.dimensions.find((d) => d.dimension === "specificity");
    expect(specificityDim?.score).toBe(0);
    expect(result.warnings).toContain("Chưa có câu mục tiêu.");
  });
});

describe("goal không có metric", () => {
  it("scores low measurableClarity when metric_name is empty", () => {
    const goal = makeGoal({
      specific: {
        goal_statement: "Hoàn thành một dự án quan trọng trong 12 tuần tới.",
      },
    });
    const result = evaluateSmartGoalQuality(goal);
    const measDim = result.dimensions.find((d) => d.dimension === "measurableClarity");
    expect(measDim?.score).toBe(0);
    expect(result.warnings).toContain("Chưa có chỉ số đo lường.");
  });
});

describe("metric có target nhưng không có baseline", () => {
  it("gives partial baselineTargetQuality score without baseline", () => {
    const goal = makeGoal({
      specific: {
        goal_statement: "Đạt mốc 10 dự án hoàn thành trước cuối năm.",
      },
      measurable: {
        metric_name: "Số dự án hoàn thành",
        target_value: 10,
      },
    });
    const result = evaluateSmartGoalQuality(goal);
    const btDim = result.dimensions.find((d) => d.dimension === "baselineTargetQuality");
    // Should have target credit (3) but not full baseline credit (4)
    expect(btDim?.score).toBe(3);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("mốc hiện tại"),
      ]),
    );
  });

  it("gives full baselineTargetQuality when both baseline and target exist", () => {
    const goal = makeGoal({
      measurable: {
        metric_name: "Điểm IELTS",
        baseline_value: 5.5,
        target_value: 7.0,
      },
    });
    const result = evaluateSmartGoalQuality(goal);
    const btDim = result.dimensions.find((d) => d.dimension === "baselineTargetQuality");
    expect(btDim?.score).toBe(10);
  });
});

describe("weekly commitment quá cao so với target", () => {
  it("warns when weekly hours exceed realistic threshold", () => {
    const goal = makeGoal({
      specific: {
        goal_statement: "Hoàn thành chứng chỉ AWS trong 12 tuần tới.",
      },
      achievable: {
        weekly_time_commitment_hours: 50,
        required_skills: [],
        support_resources: [],
      },
      time_bound: { target_weeks: 12 },
    });
    const result = evaluateSmartGoalQuality(goal);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("vượt mức khuyến nghị"),
      ]),
    );
  });

  it("gives partial score for high but not extreme hours", () => {
    const goal = makeGoal({
      achievable: {
        weekly_time_commitment_hours: 30,
        required_skills: [],
        support_resources: [],
      },
      time_bound: { target_weeks: 12 },
    });
    const result = evaluateSmartGoalQuality(goal);
    const achDim = result.dimensions.find((d) => d.dimension === "achievableRealism");
    expect(achDim!.score).toBeGreaterThan(0);
    expect(achDim!.score).toBeLessThan(achDim!.maxScore);
  });
});

describe("goal có target weeks hợp lý", () => {
  it("gives high timeBoundClarity for 12-week target", () => {
    const goal = makeGoal({
      time_bound: { target_weeks: 12 },
    });
    const result = evaluateSmartGoalQuality(goal);
    const tbDim = result.dimensions.find((d) => d.dimension === "timeBoundClarity");
    expect(tbDim?.score).toBe(10);
  });

  it("gives high twelveWeekCompatibility for 12-week sweet spot", () => {
    const goal = makeGoal({
      achievable: {
        weekly_time_commitment_hours: 5,
        required_skills: [],
        support_resources: [],
      },
      time_bound: { target_weeks: 12 },
    });
    const result = evaluateSmartGoalQuality(goal);
    const twDim = result.dimensions.find((d) => d.dimension === "twelveWeekCompatibility");
    expect(twDim!.score).toBeGreaterThanOrEqual(8);
  });
});

describe("goal có motivation rõ", () => {
  it("gives high relevanceMotivation for detailed motivation with alignment", () => {
    const goal = makeGoal({
      relevant: {
        motivation_reason:
          "Vì chứng chỉ này gắn trực tiếp với lộ trình thăng chức và tăng thu nhập trong 2 năm tới.",
        life_dimension_alignment: "sự nghiệp",
      },
    });
    const result = evaluateSmartGoalQuality(goal);
    const relDim = result.dimensions.find((d) => d.dimension === "relevanceMotivation");
    expect(relDim?.score).toBe(15);
  });

  it("gives partial score for short motivation without alignment", () => {
    const goal = makeGoal({
      relevant: {
        motivation_reason: "Quan trọng cho tôi.",
      },
    });
    const result = evaluateSmartGoalQuality(goal);
    const relDim = result.dimensions.find((d) => d.dimension === "relevanceMotivation");
    expect(relDim!.score).toBeGreaterThan(0);
    expect(relDim!.score).toBeLessThan(15);
  });
});

describe("goal strong đạt điểm cao", () => {
  it("scores >= 70 and level strong for a well-defined goal", () => {
    const result = evaluateSmartGoalQuality(makeStrongGoal());
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.level).toBe("strong");
    expect(result.canProceedToFeasibility).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("has minimal suggestions for strong goal", () => {
    const result = evaluateSmartGoalQuality(makeStrongGoal());
    // Strong goals may still have minor improvement suggestions, but should be few
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });
});

describe("legacy parsed goal vẫn đánh giá được", () => {
  it("evaluates a goal with minimal legacy-style fields", () => {
    const legacyGoal = makeGoal({
      specific: {
        goal_statement: "Duy trì 3 buổi tập thể dục mỗi tuần liên tục 12 tuần.",
      },
      measurable: {
        metric_name: "Số buổi tập",
        target_value: 36,
      },
      achievable: {
        weekly_time_commitment_hours: 4,
        required_skills: [],
        support_resources: ["Phòng tập gần nhà"],
      },
      relevant: {
        motivation_reason: "Vì sức khỏe là nền tảng quan trọng nhất cho mọi kế hoạch khác.",
      },
      time_bound: {
        target_weeks: 12,
      },
    });

    const result = evaluateSmartGoalQuality(legacyGoal);
    expect(result.overallScore).toBeGreaterThanOrEqual(40);
    expect(result.level).not.toBe("weak");
    expect(result.canProceedToFeasibility).toBe(true);
  });

  it("handles goal with only target_date instead of target_weeks", () => {
    const dateGoal = makeGoal({
      specific: {
        goal_statement: "Hoàn thành một hệ thống review cá nhân trước cuối tháng 6.",
      },
      measurable: {
        metric_name: "Số tính năng hoàn thành",
        target_value: 5,
      },
      achievable: {
        weekly_time_commitment_hours: 8,
        required_skills: ["React", "TypeScript"],
        support_resources: ["Tài liệu nội bộ"],
      },
      relevant: {
        motivation_reason:
          "Để tự chủ hơn trong việc theo dõi tiến độ và không phụ thuộc vào công cụ bên ngoài.",
      },
      time_bound: {
        target_date: "2026-06-30",
      },
    });

    const result = evaluateSmartGoalQuality(dateGoal);
    expect(result.overallScore).toBeGreaterThanOrEqual(50);
    expect(result.canProceedToFeasibility).toBe(true);
  });
});

describe("canProceedToFeasibility", () => {
  it("returns false when goal has no statement at all", () => {
    const goal = makeGoal();
    const result = evaluateSmartGoalQuality(goal);
    expect(result.canProceedToFeasibility).toBe(false);
  });

  it("returns false when goal statement has fewer than 10 meaningful characters", () => {
    const goal = makeGoal({
      specific: {
        goal_statement: "   abc   ",
      },
      measurable: {
        metric_name: "Weekly output",
        target_value: 8,
      },
      achievable: {
        weekly_time_commitment_hours: 3,
        required_skills: [],
        support_resources: [],
      },
      relevant: {
        motivation_reason: "Important for the next 12 weeks.",
      },
      time_bound: { target_weeks: 12 },
    });

    const result = evaluateSmartGoalQuality(goal);
    expect(result.canProceedToFeasibility).toBe(false);
  });

  it("returns true for a minimal but valid goal", () => {
    const goal = makeGoal({
      specific: {
        goal_statement: "Đạt mốc tiết kiệm đầu tiên trước cuối quý.",
      },
      measurable: {
        metric_name: "Số tiền tiết kiệm",
        target_value: 10000000,
      },
      achievable: {
        weekly_time_commitment_hours: 2,
        required_skills: [],
        support_resources: [],
      },
      relevant: {
        motivation_reason: "Vì tài chính là nền tảng.",
      },
      time_bound: { target_weeks: 12 },
    });
    const result = evaluateSmartGoalQuality(goal);
    expect(result.canProceedToFeasibility).toBe(true);
  });

  it("does not block user with okay-level goal", () => {
    const goal = makeGoal({
      specific: {
        goal_statement: "Cải thiện kỹ năng giao tiếp trong công việc hàng ngày.",
      },
      measurable: {
        metric_name: "Số buổi thuyết trình",
        target_value: 8,
      },
      achievable: {
        weekly_time_commitment_hours: 3,
        required_skills: [],
        support_resources: [],
      },
      relevant: {
        motivation_reason: "Quan trọng cho sự nghiệp.",
      },
      time_bound: { target_weeks: 12 },
    });
    const result = evaluateSmartGoalQuality(goal);
    expect(result.canProceedToFeasibility).toBe(true);
  });
});

describe("getSmartGoalQualityScore", () => {
  it("returns same score as evaluateSmartGoalQuality", () => {
    const goal = makeStrongGoal();
    expect(getSmartGoalQualityScore(goal)).toBe(
      evaluateSmartGoalQuality(goal).overallScore,
    );
  });
});

describe("getSmartGoalQualityWarnings", () => {
  it("returns same warnings as evaluateSmartGoalQuality", () => {
    const goal = makeGoal();
    expect(getSmartGoalQualityWarnings(goal)).toEqual(
      evaluateSmartGoalQuality(goal).warnings,
    );
  });
});

describe("getSmartGoalImprovementSuggestions", () => {
  it("returns same suggestions as evaluateSmartGoalQuality", () => {
    const goal = makeGoal();
    expect(getSmartGoalImprovementSuggestions(goal)).toEqual(
      evaluateSmartGoalQuality(goal).suggestions,
    );
  });
});
