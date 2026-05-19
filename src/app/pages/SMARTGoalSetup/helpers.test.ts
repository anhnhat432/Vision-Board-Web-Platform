import { describe, expect, it } from "vitest";

import { evaluateSmartGoalQuality } from "@/lib/smart-goal/quality";

import {
  buildSmartGoalFromFormData,
  createInitialSMARTData,
  getQualityScoreBucket,
  getStepQualityHint,
  getStepValidationError,
} from "./helpers";
import type { SMARTData } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(overrides: Partial<SMARTData> = {}): SMARTData {
  return {
    ...createInitialSMARTData(),
    ...overrides,
  };
}

function makeWeakFormData(): SMARTData {
  return makeFormData({
    specific: { goal_statement: "Tốt hơn" },
    measurable: { metric_name: "", baseline_value: "", target_value: "" },
    achievable: {
      weekly_time_commitment_hours: "",
      required_skills: "",
      support_resources: "",
    },
    relevant: { motivation_reason: "", life_dimension_alignment: "" },
    timeBound: { mode: "weeks", target_date: "", target_weeks: "12" },
  });
}

function makeStrongFormData(): SMARTData {
  return makeFormData({
    specific: {
      goal_statement: "Hoàn thành chứng chỉ AWS Solutions Architect và áp dụng vào dự án nội bộ trước cuối quý 3.",
    },
    measurable: {
      metric_name: "Số module hoàn thành",
      baseline_value: "2",
      target_value: "12",
    },
    achievable: {
      weekly_time_commitment_hours: "6",
      required_skills: "Cloud computing, Networking cơ bản",
      support_resources: "Khóa Udemy, Mentor nội bộ",
    },
    relevant: {
      motivation_reason: "Vì chứng chỉ này gắn trực tiếp với lộ trình thăng chức và tăng thu nhập 20% trong 2 năm tới.",
      life_dimension_alignment: "sự nghiệp",
    },
    timeBound: { mode: "weeks", target_date: "", target_weeks: "12" },
  });
}

// ---------------------------------------------------------------------------
// buildSmartGoalFromFormData
// ---------------------------------------------------------------------------

describe("buildSmartGoalFromFormData", () => {
  it("converts empty form data without errors", () => {
    const goal = buildSmartGoalFromFormData(createInitialSMARTData(), "career");
    expect(goal.domain).toBe("career");
    expect(goal.specific.goal_statement).toBe("");
    expect(goal.measurable.target_value).toBe(0);
  });

  it("converts filled form data correctly", () => {
    const goal = buildSmartGoalFromFormData(makeStrongFormData(), "career");
    expect(goal.specific.goal_statement).toContain("AWS");
    expect(goal.measurable.metric_name).toBe("Số module hoàn thành");
    expect(goal.measurable.baseline_value).toBe(2);
    expect(goal.measurable.target_value).toBe(12);
    expect(goal.achievable.weekly_time_commitment_hours).toBe(6);
    expect(goal.achievable.required_skills.length).toBeGreaterThan(0);
    expect(goal.achievable.support_resources.length).toBeGreaterThan(0);
    expect(goal.time_bound.target_weeks).toBe(12);
  });
});

describe("SMART measurable validation", () => {
  it("blocks a target that is not larger than baseline with field-specific copy", () => {
    const error = getStepValidationError(
      "measurable",
      makeFormData({
        measurable: {
          metric_name: "Số bài viết",
          baseline_value: "10",
          target_value: "10",
        },
      }),
    );

    expect(error).toBe("Mục tiêu cần lớn hơn mốc hiện tại");
  });
});

// ---------------------------------------------------------------------------
// Quality integration: weak goal shows warnings/suggestions
// ---------------------------------------------------------------------------

describe("weak goal shows improvement suggestions", () => {
  it("scores weak and has warnings + suggestions", () => {
    const goal = buildSmartGoalFromFormData(makeWeakFormData(), "life");
    const result = evaluateSmartGoalQuality(goal);
    expect(result.level).toBe("weak");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Quality integration: strong goal shows positive confirmation
// ---------------------------------------------------------------------------

describe("strong goal shows positive confirmation", () => {
  it("scores strong with no warnings", () => {
    const goal = buildSmartGoalFromFormData(makeStrongFormData(), "career");
    const result = evaluateSmartGoalQuality(goal);
    expect(result.level).toBe("strong");
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.warnings).toHaveLength(0);
    expect(result.canProceedToFeasibility).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// User can continue with warning
// ---------------------------------------------------------------------------

describe("user can continue with warning", () => {
  it("allows proceed for okay-level goal", () => {
    const okayData = makeFormData({
      specific: {
        goal_statement: "Cải thiện kỹ năng giao tiếp trong công việc hàng ngày.",
      },
      measurable: {
        metric_name: "Số buổi thuyết trình",
        baseline_value: "",
        target_value: "8",
      },
      achievable: {
        weekly_time_commitment_hours: "3",
        required_skills: "",
        support_resources: "",
      },
      relevant: {
        motivation_reason: "Quan trọng cho sự nghiệp dài hạn.",
        life_dimension_alignment: "",
      },
      timeBound: { mode: "weeks", target_date: "", target_weeks: "12" },
    });
    const goal = buildSmartGoalFromFormData(okayData, "career");
    const result = evaluateSmartGoalQuality(goal);
    expect(result.canProceedToFeasibility).toBe(true);
    expect(result.level).not.toBe("weak");
  });

  it("allows proceed for weak goal with basic fields", () => {
    const weakButHasBasics = makeFormData({
      specific: {
        goal_statement: "Đạt mốc tiết kiệm đầu tiên trước cuối quý ba.",
      },
      measurable: {
        metric_name: "Tiền tiết kiệm",
        baseline_value: "",
        target_value: "10000000",
      },
      achievable: {
        weekly_time_commitment_hours: "2",
        required_skills: "",
        support_resources: "",
      },
      relevant: {
        motivation_reason: "Tài chính quan trọng.",
        life_dimension_alignment: "",
      },
      timeBound: { mode: "weeks", target_date: "", target_weeks: "12" },
    });
    const goal = buildSmartGoalFromFormData(weakButHasBasics, "finance");
    const result = evaluateSmartGoalQuality(goal);
    expect(result.canProceedToFeasibility).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Analytics payload does not contain raw goal text
// ---------------------------------------------------------------------------

describe("analytics payload does not contain raw goal text", () => {
  it("quality_level and score_bucket are safe strings", () => {
    const goal = buildSmartGoalFromFormData(makeStrongFormData(), "career");
    const result = evaluateSmartGoalQuality(goal);
    const payload = {
      focus_area: "career",
      target_mode: "weeks" as const,
      target_weeks: 12,
      has_baseline: true,
      weekly_hours: 6,
      quality_level: result.level,
      score_bucket: getQualityScoreBucket(result.overallScore),
    };

    const payloadValues = Object.values(payload);
    const payloadString = JSON.stringify(payload);

    expect(payloadValues).not.toContain(goal.specific.goal_statement);
    expect(payloadValues).not.toContain(goal.relevant.motivation_reason);
    expect(payloadString).not.toContain("AWS");
    expect(payloadString).not.toContain("chứng chỉ");

    expect(["weak", "okay", "strong"]).toContain(payload.quality_level);
    expect(["0-19", "20-39", "40-59", "60-79", "80-100"]).toContain(payload.score_bucket);
  });
});

// ---------------------------------------------------------------------------
// getStepQualityHint
// ---------------------------------------------------------------------------

describe("getStepQualityHint", () => {
  it("returns null when step has no content", () => {
    const goal = buildSmartGoalFromFormData(createInitialSMARTData(), "career");
    const result = evaluateSmartGoalQuality(goal);
    expect(getStepQualityHint("specific", result, false)).toBeNull();
  });

  it("returns hint for weak specific step", () => {
    const data = makeFormData({
      specific: { goal_statement: "Muốn tốt hơn." },
    });
    const goal = buildSmartGoalFromFormData(data, "career");
    const result = evaluateSmartGoalQuality(goal);
    const hint = getStepQualityHint("specific", result, true);
    expect(hint).toBeTruthy();
    expect(hint).toContain("động từ kết quả");
  });

  it("returns null for strong specific step", () => {
    const data = makeStrongFormData();
    const goal = buildSmartGoalFromFormData(data, "career");
    const result = evaluateSmartGoalQuality(goal);
    const hint = getStepQualityHint("specific", result, true);
    expect(hint).toBeNull();
  });

  it("returns hint for measurable step without baseline", () => {
    const data = makeFormData({
      measurable: {
        metric_name: "Điểm IELTS",
        baseline_value: "",
        target_value: "7",
      },
    });
    const goal = buildSmartGoalFromFormData(data, "learning");
    const result = evaluateSmartGoalQuality(goal);
    const hint = getStepQualityHint("measurable", result, true);
    expect(hint).toContain("mốc hiện tại");
  });

  it("returns hint for achievable step without resources", () => {
    const data = makeFormData({
      achievable: {
        weekly_time_commitment_hours: "5",
        required_skills: "",
        support_resources: "",
      },
    });
    const goal = buildSmartGoalFromFormData(data, "career");
    const result = evaluateSmartGoalQuality(goal);
    const hint = getStepQualityHint("achievable", result, true);
    expect(hint).toContain("kỹ năng");
  });

  it("returns hint for relevant step with short motivation and no alignment", () => {
    const data = makeFormData({
      relevant: {
        motivation_reason: "Quan trọng",
        life_dimension_alignment: "",
      },
    });
    const goal = buildSmartGoalFromFormData(data, "career");
    const result = evaluateSmartGoalQuality(goal);
    const hint = getStepQualityHint("relevant", result, true);
    expect(hint).toBeTruthy();
    expect(hint).toContain("lĩnh vực cuộc sống");
  });
});

// ---------------------------------------------------------------------------
// getQualityScoreBucket
// ---------------------------------------------------------------------------

describe("getQualityScoreBucket", () => {
  it("returns correct buckets", () => {
    expect(getQualityScoreBucket(0)).toBe("0-19");
    expect(getQualityScoreBucket(15)).toBe("0-19");
    expect(getQualityScoreBucket(20)).toBe("20-39");
    expect(getQualityScoreBucket(45)).toBe("40-59");
    expect(getQualityScoreBucket(72)).toBe("60-79");
    expect(getQualityScoreBucket(80)).toBe("80-100");
    expect(getQualityScoreBucket(100)).toBe("80-100");
  });
});

// ---------------------------------------------------------------------------
// Existing SMART goal helpers still work
// ---------------------------------------------------------------------------

describe("existing helpers compatibility", () => {
  it("createInitialSMARTData returns valid empty structure", () => {
    const data = createInitialSMARTData();
    expect(data.specific.goal_statement).toBe("");
    expect(data.measurable.metric_name).toBe("");
    expect(data.timeBound.mode).toBe("weeks");
    expect(data.timeBound.target_weeks).toBe("12");
  });
});
