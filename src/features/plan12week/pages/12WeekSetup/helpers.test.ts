import { describe, expect, it } from "vitest";

import { TWELVE_WEEK_TEMPLATE_CATALOG } from "@/app/utils/twelve-week-premium";
import {
  buildLeadIndicatorSchedules,
  buildPlanRationaleReasons,
  formatScheduleDayLabels,
  getFeasibilityDraftDefaults,
  getLeadIndicatorTargetValidationError,
  getLeadIndicatorUnitValidationError,
  getMilestoneValidationError,
  getPreviewTasks,
  getPreviewTasksByIndicator,
  getStartDateValidation,
  normalizeReviewDay,
  parseTargetFrequency,
  validateLeadIndicatorDraft,
} from "./helpers";
import type {
  LeadIndicatorDraft,
  PendingFeasibilityResult,
  PlanLoadRecommendation,
  TwelveWeekSetupDraft,
  WeeklyCapacity,
} from "./types";

function makeFeasibility(overrides: Partial<PendingFeasibilityResult> = {}): PendingFeasibilityResult {
  const planLoad = (overrides.planLoad ?? "balanced") as PlanLoadRecommendation;
  const weeklyCapacity = (overrides.weeklyCapacity ?? "medium") as WeeklyCapacity;
  return {
    resultType: overrides.resultType ?? "challenging",
    resultTitle: overrides.resultTitle ?? "Mục tiêu này làm được, nhưng phải xử lý đúng phần yếu nhất.",
    resultSummary: overrides.resultSummary ?? "Tóm tắt kết quả kiểm tra.",
    recommendation: overrides.recommendation ?? "Khuyến nghị mặc định cho test.",
    readinessScore: overrides.readinessScore ?? 12,
    adjustedScore: overrides.adjustedScore ?? 12,
    wheelScore: overrides.wheelScore ?? 7,
    bottleneck: overrides.bottleneck,
    planLoad,
    weeklyCapacity,
    firstWeekGuidance: overrides.firstWeekGuidance ?? "Tuần 1 nên cân bằng.",
    scopeRecommendation: overrides.scopeRecommendation ?? "Giữ một kết quả chính.",
    smartGoalQualityLevel: overrides.smartGoalQualityLevel,
    smartGoalQualityNote: overrides.smartGoalQualityNote,
  };
}

function makeIndicator(
  name: string,
  target = "4",
  type: LeadIndicatorDraft["type"] = "core",
  cadence: LeadIndicatorDraft["cadence"] = "spread",
): LeadIndicatorDraft {
  return {
    id: `indicator_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name,
    target,
    unit: "times/week",
    type,
    cadence,
  };
}

function getTotalScheduledTasks(indicators: Array<LeadIndicatorDraft & { schedule: number[] }>): number {
  return indicators.reduce((total, indicator) => total + indicator.schedule.length, 0);
}

function buildOptions(
  tacticLoadPreference: TwelveWeekSetupDraft["tacticLoadPreference"],
  dailyTimeBudget: string,
  preferredDays: number[] = [],
) {
  return {
    tacticLoadPreference,
    dailyTimeBudget,
    preferredDays,
  };
}

describe("12-week setup plan load guards", () => {
  it("parses zero or invalid target frequency as null", () => {
    expect(parseTargetFrequency("0")).toBeNull();
    expect(parseTargetFrequency({ target: "0" })).toBeNull();
    expect(parseTargetFrequency("-1")).toBeNull();
    expect(parseTargetFrequency("abc")).toBeNull();
    expect(parseTargetFrequency("2")).toBe(2);
  });

  it("does not silently schedule an invalid zero target as one weekly task", () => {
    const scheduled = buildLeadIndicatorSchedules(
      [makeIndicator("Zero target", "0"), makeIndicator("Review loop", "1")],
      buildOptions("balanced", "1h"),
    );

    expect(scheduled.find((indicator) => indicator.name === "Zero target")?.schedule).toEqual([]);
  });

  it("returns a field-specific validation error for invalid target frequency", () => {
    const error = getLeadIndicatorTargetValidationError(makeIndicator("Zero target", "0"), 0);

    expect(error).toContain("1");
    expect(error).toContain("Zero target");
  });

  it("blocks an empty lead indicator unit with concrete unit examples", () => {
    expect(getLeadIndicatorUnitValidationError(makeIndicator("Deep work", "2", "core"), 0)).toBeNull();

    const missingUnit = makeIndicator("Deep work", "2", "core");
    missingUnit.unit = "";

    expect(getLeadIndicatorUnitValidationError(missingUnit, 0)).toBe(
      "Đơn vị của việc lặp lại 1 (Deep work) không được trống. Gợi ý: lần, phút, trang, buổi.",
    );
  });

  it("validates start date against local today and warns beyond 30 days", () => {
    expect(getStartDateValidation("2026-05-08", new Date("2026-05-09T12:00:00+07:00"))).toEqual({
      error: "Ngày bắt đầu không được ở quá khứ",
      warning: null,
    });
    expect(getStartDateValidation("2026-06-15", new Date("2026-05-09T12:00:00+07:00"))).toEqual({
      error: null,
      warning: "Ngày bắt đầu cách hiện tại hơn 30 ngày. Hãy chắc chắn đây là chủ ý.",
    });
  });

  it("normalizes invalid reviewDay drafts back to Sunday and reports it", () => {
    expect(normalizeReviewDay("Funday")).toEqual({ value: "Sunday", changed: true });
    expect(normalizeReviewDay("Monday")).toEqual({ value: "Monday", changed: false });
  });

  it("requires at least one week 4, 8, or 12 milestone", () => {
    expect(getMilestoneValidationError({ week4: "", week8: "   ", week12: "" })).toBe(
      "Đặt ít nhất 1 cột mốc kiểm tra để cycle có nhịp",
    );
    expect(getMilestoneValidationError({ week4: "", week8: "", week12: "Launch beta" })).toBeNull();
  });

  it("keeps lighter plus low time budget to one weekly task per tactic", () => {
    const indicators = [
      makeIndicator("Focus block"),
      makeIndicator("Review"),
      makeIndicator("Outreach", "3", "optional"),
      makeIndicator("Recovery", "3", "optional"),
    ];

    const options = buildOptions("lighter", "30min");
    const scheduled = buildLeadIndicatorSchedules(indicators, options);

    expect(getTotalScheduledTasks(scheduled)).toBeLessThanOrEqual(4);
    expect(scheduled.every((indicator) => indicator.schedule.length <= 1)).toBe(true);
    expect(getPreviewTasks(indicators, options)).toHaveLength(4);
  });

  it("keeps balanced plans inside a reasonable weekly task count", () => {
    const indicators = [
      makeIndicator("Deep work", "3"),
      makeIndicator("Review loop", "3"),
      makeIndicator("Publish", "3", "optional"),
    ];

    const scheduled = buildLeadIndicatorSchedules(indicators, buildOptions("balanced", "1h"));

    expect(getTotalScheduledTasks(scheduled)).toBeLessThanOrEqual(5);
    expect(getTotalScheduledTasks(scheduled)).toBeGreaterThanOrEqual(indicators.length);
    expect(scheduled.every((indicator) => indicator.schedule.length <= 2)).toBe(true);
  });

  it("lets push plans stretch without creating extreme weekly overload", () => {
    const indicators = [
      makeIndicator("Draft", "7"),
      makeIndicator("Ship", "7"),
      makeIndicator("Follow up", "7", "optional"),
      makeIndicator("Measure", "7", "optional"),
    ];

    const scheduled = buildLeadIndicatorSchedules(indicators, buildOptions("push", "2h+"));

    expect(getTotalScheduledTasks(scheduled)).toBeLessThanOrEqual(6);
    expect(scheduled.every((indicator) => indicator.schedule.length <= 3)).toBe(true);
  });

  it("still creates usable schedules when preferred days are empty", () => {
    const scheduled = buildLeadIndicatorSchedules(
      [makeIndicator("Main work", "2"), makeIndicator("Review", "1")],
      buildOptions("balanced", "1h"),
    );

    expect(getTotalScheduledTasks(scheduled)).toBeGreaterThan(0);
    expect(scheduled.flatMap((indicator) => indicator.schedule).every((day) => day >= 0 && day <= 6)).toBe(true);
  });

  it("respects preferred days when the user selects them", () => {
    const scheduled = buildLeadIndicatorSchedules(
      [makeIndicator("Main work", "3"), makeIndicator("Review", "2")],
      buildOptions("push", "2h+", [1, 3]),
    );

    expect(scheduled.flatMap((indicator) => indicator.schedule).every((day) => day === 1 || day === 3)).toBe(true);
  });

  it("keeps both free and premium template tactics usable", () => {
    const freeTemplate = TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => !template.requiredPlan);
    const premiumTemplate = TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => template.requiredPlan);

    expect(freeTemplate).toBeDefined();
    expect(premiumTemplate).toBeDefined();

    for (const template of [freeTemplate, premiumTemplate]) {
      if (!template) continue;

      const indicators: LeadIndicatorDraft[] =
        template.tactics.map((tactic, index) => ({
          id: `${template.id}_${index}`,
          name: tactic.name,
          target: tactic.target,
          unit: tactic.unit,
          type: tactic.type,
          cadence: tactic.cadence,
        }));

      const scheduled = buildLeadIndicatorSchedules(indicators, buildOptions("balanced", "1h"));

      expect(getTotalScheduledTasks(scheduled)).toBeGreaterThan(0);
      expect(getTotalScheduledTasks(scheduled)).toBeLessThanOrEqual(5);
      expect(getPreviewTasks(indicators, buildOptions("balanced", "1h")).length).toBeGreaterThan(0);
    }
  });
});

describe("getFeasibilityDraftDefaults", () => {
  it("low capacity defaults to lighter plan and 30min daily budget", () => {
    const feasibility = makeFeasibility({
      weeklyCapacity: "low",
      planLoad: "lighter",
      bottleneck: { axis: "time", label: "Thời gian thật", score: 1, action: "Giảm số việc." },
    });

    const defaults = getFeasibilityDraftDefaults(feasibility);
    expect(defaults.tacticLoadPreference).toBe("lighter");
    expect(defaults.dailyTimeBudget).toBe("30min");
    expect(defaults.personalConstraint).toBe("time");
  });

  it("low resources maps to complexity constraint (preparation tactic hint)", () => {
    const feasibility = makeFeasibility({
      weeklyCapacity: "medium",
      planLoad: "lighter",
      bottleneck: {
        axis: "resources",
        label: "Nguồn lực / kỹ năng",
        score: 1,
        action: "Thêm một bước chuẩn bị hoặc học nhanh trước khi yêu cầu đầu ra lớn.",
      },
    });

    const defaults = getFeasibilityDraftDefaults(feasibility);
    expect(defaults.personalConstraint).toBe("complexity");
  });

  it("low confidence maps to consistency and reduces daily budget", () => {
    const feasibility = makeFeasibility({
      weeklyCapacity: "medium",
      planLoad: "lighter",
      bottleneck: { axis: "confidence", label: "Tự tin hoàn thành", score: 1, action: "Tạo tuần đầu dễ hoàn thành." },
    });

    const defaults = getFeasibilityDraftDefaults(feasibility);
    expect(defaults.personalConstraint).toBe("consistency");
    expect(defaults.dailyTimeBudget).toBe("30min");
  });

  it("low energy bottleneck still reduces daily budget despite medium time", () => {
    const feasibility = makeFeasibility({
      weeklyCapacity: "medium",
      planLoad: "lighter",
      bottleneck: { axis: "energy", label: "Năng lượng hiện tại", score: 1, action: "Tuần 1 nhẹ hơn." },
    });

    const defaults = getFeasibilityDraftDefaults(feasibility);
    expect(defaults.dailyTimeBudget).toBe("30min");
    expect(defaults.personalConstraint).toBe("consistency");
  });

  it("strong feasibility does not force lighter plan", () => {
    const feasibility = makeFeasibility({
      weeklyCapacity: "high",
      planLoad: "push",
      adjustedScore: 18,
      bottleneck: { axis: "time", label: "Thời gian thật", score: 4, action: "Giữ nhịp đều." },
    });

    const defaults = getFeasibilityDraftDefaults(feasibility);
    expect(defaults.tacticLoadPreference).toBe("push");
    expect(defaults.dailyTimeBudget).toBe("1.5h");
  });

  it("balanced feasibility keeps balanced load and 1h budget", () => {
    const feasibility = makeFeasibility({
      weeklyCapacity: "medium",
      planLoad: "balanced",
      adjustedScore: 14,
      bottleneck: { axis: "obstacle", label: "Trở ngại chính", score: 2, action: "Biến trở ngại thành nguyên tắc." },
    });

    const defaults = getFeasibilityDraftDefaults(feasibility);
    expect(defaults.tacticLoadPreference).toBe("balanced");
    expect(defaults.dailyTimeBudget).toBe("1h");
    expect(defaults.personalConstraint).toBe("motivation");
  });
});

describe("buildPlanRationaleReasons", () => {
  it("returns 2-4 reasons", () => {
    const reasons = buildPlanRationaleReasons(
      makeFeasibility({
        planLoad: "balanced",
        bottleneck: { axis: "time", label: "Thời gian thật", score: 2, action: "Giảm số việc." },
      }),
    );
    expect(reasons.length).toBeGreaterThanOrEqual(2);
    expect(reasons.length).toBeLessThanOrEqual(4);
  });

  it("first reason mentions plan load and readiness score", () => {
    const reasons = buildPlanRationaleReasons(
      makeFeasibility({ planLoad: "lighter", adjustedScore: 9 }),
    );
    expect(reasons[0].title).toContain("Nhẹ hơn");
    expect(reasons[0].detail).toContain("9/20");
  });

  it("includes bottleneck reason when bottleneck exists", () => {
    const reasons = buildPlanRationaleReasons(
      makeFeasibility({
        bottleneck: {
          axis: "resources",
          label: "Nguồn lực / kỹ năng",
          score: 1,
          action: "Thêm một bước chuẩn bị hoặc học nhanh trước khi yêu cầu đầu ra lớn.",
        },
      }),
    );

    const bottleneckReason = reasons.find((reason) => reason.id === "bottleneck");
    expect(bottleneckReason).toBeDefined();
    expect(bottleneckReason?.title).toContain("Nguồn lực");
    expect(bottleneckReason?.detail).toContain("chuẩn bị");
  });

  it("low clarity bottleneck surfaces scope warning in bottleneck action", () => {
    const reasons = buildPlanRationaleReasons(
      makeFeasibility({
        planLoad: "lighter",
        bottleneck: {
          axis: "clarity",
          label: "Độ rõ mục tiêu",
          score: 1,
          action: "Thu hẹp mục tiêu 12 tuần để chỉ còn một kết quả chính có thể đo được.",
        },
      }),
    );

    const bottleneckReason = reasons.find((reason) => reason.id === "bottleneck");
    expect(bottleneckReason?.detail).toContain("Thu hẹp");
  });

  it("low capacity adds capacity-low reason", () => {
    const reasons = buildPlanRationaleReasons(
      makeFeasibility({
        weeklyCapacity: "low",
        planLoad: "lighter",
        bottleneck: { axis: "time", label: "Thời gian thật", score: 1, action: "Giảm số việc." },
      }),
    );

    const capacityReason = reasons.find((reason) => reason.id === "capacity-low");
    expect(capacityReason).toBeDefined();
  });

  it("weak SMART goal quality adds smart-quality-weak reason", () => {
    const reasons = buildPlanRationaleReasons(
      makeFeasibility({
        smartGoalQualityLevel: "weak",
        smartGoalQualityNote: "Mục tiêu chưa rõ.",
      }),
    );

    const qualityReason = reasons.find((reason) => reason.id === "smart-quality-weak");
    expect(qualityReason).toBeDefined();
    expect(qualityReason?.title).toContain("chung chung");
  });

  it("strong SMART goal quality does not add smart-quality reason", () => {
    const reasons = buildPlanRationaleReasons(
      makeFeasibility({ smartGoalQualityLevel: "strong" }),
    );

    expect(reasons.find((reason) => reason.id === "smart-quality-weak")).toBeUndefined();
  });

  it("never returns more than 4 reasons even when all signals fire", () => {
    const reasons = buildPlanRationaleReasons(
      makeFeasibility({
        weeklyCapacity: "low",
        planLoad: "lighter",
        bottleneck: { axis: "time", label: "Thời gian thật", score: 1, action: "Giảm số việc." },
        smartGoalQualityLevel: "weak",
      }),
    );

    expect(reasons.length).toBeLessThanOrEqual(4);
  });
});

describe("validateLeadIndicatorDraft", () => {
  it("warns when name is empty", () => {
    const result = validateLeadIndicatorDraft(makeIndicator("", "2"));
    expect(result.warnings.find((w) => w.includes("Đặt tên"))).toBeDefined();
  });

  it("warns when name is too short", () => {
    const result = validateLeadIndicatorDraft(makeIndicator("Viết", "2"));
    expect(result.warnings.find((w) => w.includes("ngắn"))).toBeDefined();
  });

  it("warns when name is generic like 'Việc 1'", () => {
    const result = validateLeadIndicatorDraft(makeIndicator("Việc 1", "2"));
    expect(result.warnings.find((w) => w.includes("chung chung"))).toBeDefined();
  });

  it("warns when name looks like an outcome (e.g. 'Tăng followers')", () => {
    const result = validateLeadIndicatorDraft(makeIndicator("Tăng 100 followers", "2"));
    expect(result.warnings.find((w) => w.includes("kết quả cuối"))).toBeDefined();
  });

  it("does not flag good controllable actions", () => {
    const result = validateLeadIndicatorDraft(makeIndicator("Viết draft 800 từ", "2"));
    expect(result.warnings.find((w) => w.includes("kết quả cuối"))).toBeUndefined();
    expect(result.warnings.find((w) => w.includes("ngắn"))).toBeUndefined();
    expect(result.warnings.find((w) => w.includes("chung chung"))).toBeUndefined();
  });

  it("warns when target is not a positive integer", () => {
    const invalidTargets = ["", "0", "-1", "abc"];
    for (const target of invalidTargets) {
      const result = validateLeadIndicatorDraft(makeIndicator("Viết draft 800 từ", target));
      expect(result.warnings.find((w) => w.includes("số dương"))).toBeDefined();
    }
  });

  it("warns when target exceeds 7 lần/tuần", () => {
    const result = validateLeadIndicatorDraft(makeIndicator("Viết draft 800 từ", "10"));
    expect(result.warnings.find((w) => w.includes("tối đa là 7"))).toBeDefined();
  });

  it("warns when target exceeds maxTasksPerTactic for current load preference", () => {
    // lighter + 30min budget → maxTasksPerTactic = 1
    const result = validateLeadIndicatorDraft(makeIndicator("Viết draft 800 từ", "3"), {
      tacticLoadPreference: "lighter",
      dailyTimeBudget: "30min",
    });
    expect(result.warnings.find((w) => w.includes("Vượt giới hạn"))).toBeDefined();
  });

  it("warns when unit is empty", () => {
    const indicator: LeadIndicatorDraft = {
      ...makeIndicator("Viết draft 800 từ", "2"),
      unit: "",
    };
    const result = validateLeadIndicatorDraft(indicator);
    expect(result.warnings.find((w) => w.includes("đơn vị"))).toBeDefined();
  });

  it("returns no warnings for a fully valid indicator", () => {
    const result = validateLeadIndicatorDraft(makeIndicator("Viết draft 800 từ", "2"), {
      tacticLoadPreference: "balanced",
      dailyTimeBudget: "1h",
    });
    expect(result.warnings).toEqual([]);
  });
});

describe("getPreviewTasksByIndicator", () => {
  it("returns one group per named indicator", () => {
    const groups = getPreviewTasksByIndicator(
      [makeIndicator("Viết draft 800 từ", "2"), makeIndicator("Edit và publish", "1")],
      buildOptions("balanced", "1h"),
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe("Viết draft 800 từ");
    expect(groups[0].taskTitles.length).toBeGreaterThan(0);
    expect(groups[0].scheduleDays.length).toBeGreaterThan(0);
  });

  it("filters out indicators without a name", () => {
    const groups = getPreviewTasksByIndicator(
      [makeIndicator("", "2"), makeIndicator("Viết draft 800 từ", "2")],
      buildOptions("balanced", "1h"),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Viết draft 800 từ");
  });

  it("preserves task title format consistent with getPreviewTasks", () => {
    const indicators = [makeIndicator("Viết draft 800 từ", "2")];
    const groups = getPreviewTasksByIndicator(indicators, buildOptions("balanced", "1h"));
    const flatTasks = getPreviewTasks(indicators, buildOptions("balanced", "1h"));
    const flattenedFromGroups = groups.flatMap((group) => group.taskTitles);
    expect(flattenedFromGroups).toEqual(flatTasks);
  });

  it("respects tacticLoadPreference + dailyTimeBudget caps", () => {
    const groups = getPreviewTasksByIndicator(
      [makeIndicator("Viết draft 800 từ", "5")],
      buildOptions("lighter", "30min"),
    );
    // lighter + 30min → maxTasksPerTactic = 1
    expect(groups[0].taskTitles.length).toBeLessThanOrEqual(1);
  });
});

describe("formatScheduleDayLabels", () => {
  it("returns 'Chưa có lịch' for empty schedule", () => {
    expect(formatScheduleDayLabels([])).toBe("Chưa có lịch");
  });

  it("maps day indices to Vietnamese day labels (T2-CN)", () => {
    expect(formatScheduleDayLabels([0])).toBe("T2");
    expect(formatScheduleDayLabels([0, 2, 4])).toBe("T2, T4, T6");
    expect(formatScheduleDayLabels([6])).toBe("CN");
  });

  it("ignores out-of-range indices", () => {
    expect(formatScheduleDayLabels([0, 99, -1, 3])).toBe("T2, T5");
  });
});
