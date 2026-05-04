import type { WeeklyTaskLoadPreference } from "./taskConstraints";

/**
 * 12-week plan quality calibration.
 *
 * Calibration is grounded in the known-limitations corpus surfaced by
 * `src/test/fixtures/coreFunnelScenarios.ts`, not on real tester sessions
 * (none recorded yet). The two specific mismatches addressed:
 *
 *  1. `isTaskCountInRecommendedRange(3, 5)` over-warns lighter+low-capacity
 *     scenarios. Three of eight scenarios (finance-savings, IELTS,
 *     mentor+journal) intentionally schedule 2 tasks because plan load is
 *     `lighter` and weekly capacity is `low`. That is correct lighter
 *     behavior, not a violation. `assessWeekOneLoad` calibrates the
 *     "appropriate" range against (planLoad, weeklyCapacity).
 *  2. `getWeeklyTaskWarning` only fires above 5 tasks. The
 *     career-promotion scenario lands at exactly 6 (the time-budget cap),
 *     which is the planner's allowed maximum yet still trips the warning.
 *     `assessWeekOneLoad` differentiates "at upper limit" from "overloaded"
 *     so the UI can warn proportionally.
 *
 * Existing helpers in `taskConstraints.ts` are NOT changed — the
 * production planner still uses them. This module is additive.
 */

export type PlanLoadPreference = WeeklyTaskLoadPreference;
export type WeeklyCapacityBand = "low" | "medium" | "high";

export type WeekOneLoadLevel = "underloaded" | "appropriate" | "upper_limit" | "overloaded";

export interface AssessWeekOneLoadInput {
  taskCount: number;
  planLoad: PlanLoadPreference;
  weeklyCapacity: WeeklyCapacityBand;
}

export interface WeekOneLoadAssessment {
  level: WeekOneLoadLevel;
  warning: string | null;
  suggestion: string | null;
  appropriateRange: { min: number; max: number };
}

interface LoadBand {
  /** Inclusive minimum for "appropriate". */
  min: number;
  /** Inclusive maximum for "appropriate". */
  max: number;
  /** Inclusive maximum for "upper_limit". Above this is "overloaded". */
  hardCap: number;
}

/**
 * Calibrated bands per (planLoad, weeklyCapacity).
 *
 * For `lighter` + `low` we intentionally allow 1-2 because that is what the
 * scheduler actually produces and matches feasibility's intent for low
 * capacity / too_ambitious goals (avoid overload to recover rhythm first).
 *
 * For `push` + `high` we allow up to 6 (matching the planner's max) without
 * firing a hard overload — only above 6 is the user really doing too much.
 */
const LOAD_BANDS: Record<`${PlanLoadPreference}-${WeeklyCapacityBand}`, LoadBand> = {
  "lighter-low": { min: 1, max: 3, hardCap: 4 },
  "lighter-medium": { min: 2, max: 4, hardCap: 5 },
  "lighter-high": { min: 2, max: 4, hardCap: 5 },
  "balanced-low": { min: 2, max: 4, hardCap: 5 },
  "balanced-medium": { min: 3, max: 5, hardCap: 6 },
  "balanced-high": { min: 3, max: 5, hardCap: 6 },
  "push-low": { min: 2, max: 4, hardCap: 5 },
  "push-medium": { min: 3, max: 5, hardCap: 6 },
  "push-high": { min: 4, max: 6, hardCap: 7 },
};

function getBand(planLoad: PlanLoadPreference, weeklyCapacity: WeeklyCapacityBand): LoadBand {
  return LOAD_BANDS[`${planLoad}-${weeklyCapacity}`] ?? LOAD_BANDS["balanced-medium"];
}

function buildOverloadedSuggestion(
  taskCount: number,
  planLoad: PlanLoadPreference,
  band: LoadBand,
): string {
  if (planLoad === "push") {
    return `Tuần 1 đang có ${taskCount} task — vượt giới hạn ${band.hardCap} ngay cả ở nhịp push. Bỏ bớt 1-2 việc tùy chọn để tránh kiệt sức tuần đầu.`;
  }
  return `Tuần 1 đang có ${taskCount} task. Giảm xuống ${band.max} hoặc ít hơn để giữ nhịp.`;
}

function buildUnderloadedSuggestion(
  taskCount: number,
  planLoad: PlanLoadPreference,
  weeklyCapacity: WeeklyCapacityBand,
  band: LoadBand,
): string | null {
  if (planLoad === "lighter" && weeklyCapacity === "low") {
    // Intentional. Do not nag the user — let them grow naturally.
    return null;
  }
  if (taskCount === 0) {
    return "Tuần 1 chưa có việc nào. Thêm ít nhất một việc lặp lại trước khi bắt đầu chu kỳ.";
  }
  return `Tuần 1 chỉ có ${taskCount} task — dưới mức gợi ý ${band.min}. Cân nhắc thêm 1 việc cốt lõi nếu lịch cho phép.`;
}

export function assessWeekOneLoad(input: AssessWeekOneLoadInput): WeekOneLoadAssessment {
  const { taskCount, planLoad, weeklyCapacity } = input;
  const band = getBand(planLoad, weeklyCapacity);
  const appropriateRange = { min: band.min, max: band.max };

  if (!Number.isFinite(taskCount) || taskCount < 0) {
    return {
      level: "underloaded",
      warning: "Số task tuần 1 không hợp lệ.",
      suggestion: "Tạo lại chu kỳ để dashboard nhận đúng số việc tuần 1.",
      appropriateRange,
    };
  }

  if (taskCount > band.hardCap) {
    return {
      level: "overloaded",
      warning: `Tuần 1 quá nặng cho cấu hình ${planLoad}/${weeklyCapacity}.`,
      suggestion: buildOverloadedSuggestion(taskCount, planLoad, band),
      appropriateRange,
    };
  }

  if (taskCount > band.max) {
    return {
      level: "upper_limit",
      warning: `Tuần 1 đang chạm trần ${band.hardCap} task của cấu hình ${planLoad}/${weeklyCapacity}.`,
      suggestion: "Giữ nguyên nếu lịch ổn, nhưng nên review sớm để cắt bớt nếu thấy đuối.",
      appropriateRange,
    };
  }

  if (taskCount < band.min) {
    return {
      level: "underloaded",
      warning: null,
      suggestion: buildUnderloadedSuggestion(taskCount, planLoad, weeklyCapacity, band),
      appropriateRange,
    };
  }

  return {
    level: "appropriate",
    warning: null,
    suggestion: null,
    appropriateRange,
  };
}

export type PlanQualityLevel = "weak" | "moderate" | "strong";

export interface AssessPlanQualityInput {
  weekOneTaskCount: number;
  planLoad: PlanLoadPreference;
  weeklyCapacity: WeeklyCapacityBand;
  leadIndicatorCount: number;
  hasLagMetric: boolean;
  hasMidCycleMilestones: boolean;
}

export interface PlanQualityAssessment {
  level: PlanQualityLevel;
  weekOneLoad: WeekOneLoadAssessment;
  warnings: string[];
  suggestions: string[];
}

const RECOMMENDED_LEAD_INDICATOR_MIN = 2;
const RECOMMENDED_LEAD_INDICATOR_MAX = 4;

export function assessPlanQuality(input: AssessPlanQualityInput): PlanQualityAssessment {
  const weekOneLoad = assessWeekOneLoad({
    taskCount: input.weekOneTaskCount,
    planLoad: input.planLoad,
    weeklyCapacity: input.weeklyCapacity,
  });

  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (weekOneLoad.warning) warnings.push(weekOneLoad.warning);
  if (weekOneLoad.suggestion) suggestions.push(weekOneLoad.suggestion);

  if (input.leadIndicatorCount < RECOMMENDED_LEAD_INDICATOR_MIN) {
    warnings.push(
      `Chu kỳ chỉ có ${input.leadIndicatorCount} việc giữ nhịp. Khuyến nghị ${RECOMMENDED_LEAD_INDICATOR_MIN}-${RECOMMENDED_LEAD_INDICATOR_MAX}.`,
    );
    suggestions.push("Thêm ít nhất một việc giữ nhịp cốt lõi để dashboard có đủ tín hiệu hằng tuần.");
  } else if (input.leadIndicatorCount > RECOMMENDED_LEAD_INDICATOR_MAX) {
    warnings.push(
      `Chu kỳ có ${input.leadIndicatorCount} việc giữ nhịp — vượt mức ${RECOMMENDED_LEAD_INDICATOR_MAX} dễ loãng.`,
    );
    suggestions.push("Giảm xuống còn 4 việc giữ nhịp tối đa, gộp việc trùng lặp.");
  }

  if (!input.hasLagMetric) {
    warnings.push("Chưa có chỉ số kết quả chính của chu kỳ.");
    suggestions.push("Thêm 1 chỉ số kết quả chính (lag metric) để tuần 12 có đầu ra rõ.");
  }

  if (!input.hasMidCycleMilestones) {
    suggestions.push(
      "Cân nhắc đặt mốc tuần 4 và tuần 8 để chu kỳ có điểm dừng giữa đường thay vì chỉ có deadline cuối.",
    );
  }

  let level: PlanQualityLevel;
  if (
    weekOneLoad.level === "overloaded" ||
    weekOneLoad.level === "underloaded" ||
    !input.hasLagMetric ||
    input.leadIndicatorCount < RECOMMENDED_LEAD_INDICATOR_MIN
  ) {
    level = "weak";
  } else if (weekOneLoad.level === "upper_limit" || !input.hasMidCycleMilestones) {
    level = "moderate";
  } else {
    level = "strong";
  }

  // `lighter+low` legitimately runs below the standard min and is not a weakness.
  if (
    level === "weak" &&
    weekOneLoad.level === "underloaded" &&
    input.planLoad === "lighter" &&
    input.weeklyCapacity === "low" &&
    input.hasLagMetric &&
    input.leadIndicatorCount >= RECOMMENDED_LEAD_INDICATOR_MIN
  ) {
    level = "moderate";
  }

  return { level, weekOneLoad, warnings, suggestions };
}
