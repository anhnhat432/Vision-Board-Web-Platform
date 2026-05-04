import type { GoalArchetype } from "@/lib/smart-goal";

import {
  getArchetypePlanFullDefaults,
  indicatorsMatchArchetype,
  milestonesMatchArchetype,
} from "./planArchetypeDefaults";
import { getMaxTasksPerTactic, getMaxWeeklyTaskCount, type WeeklyTaskLoadPreference } from "./taskConstraints";

export type PlanQualityLevel = "weak" | "okay" | "strong";

export type PlanQualityDimensionId =
  | "outcome"
  | "milestones"
  | "lead-indicators"
  | "task-load"
  | "week-one-startability"
  | "review-cadence"
  | "feasibility-alignment";

export interface PlanQualityDimensionResult {
  id: PlanQualityDimensionId;
  label: string;
  score: number;
  maxScore: number;
  status: PlanQualityLevel;
}

export interface PlanQualityResult {
  overallScore: number;
  level: PlanQualityLevel;
  dimensions: PlanQualityDimensionResult[];
  warnings: string[];
  suggestions: string[];
}

export interface PlanQualityFeasibilityContext {
  planLoad?: "lighter" | "balanced" | "push";
  weeklyCapacity?: "low" | "medium" | "high";
  bottleneck?: { axis?: string; label?: string };
  adjustedScore?: number;
  smartGoalQualityLevel?: "weak" | "okay" | "strong";
}

export interface PlanQualityContext {
  feasibility?: PlanQualityFeasibilityContext;
  /** Total number of generated tasks for week 1, derived from indicator schedules. */
  weeklyTaskCount?: number;
  /**
   * Title of the first concrete task in week 1 (typically the first preview
   * task title). Used by Week 1 Startability to detect vague titles or
   * missing action verbs. Optional — plans without it skip the check.
   */
  firstTaskTitle?: string;
}

export interface PlanQualityLeadIndicatorInput {
  name: string;
  target?: string;
  schedule?: number[];
  type?: "core" | "optional";
}

export interface PlanQualityInput {
  vision12Week: string;
  week12Outcome: string;
  goalType?: string;
  /**
   * Optional goal archetype. When provided, planQuality emits
   * archetype-shape warnings/suggestions (e.g. exam plan missing practice
   * test cadence, health plan pushing too hard week 1). Numeric scoring
   * is unaffected; warnings are additive only.
   */
  goalArchetype?: GoalArchetype;
  lagMetric: { name: string; target?: string; unit?: string };
  leadIndicators: PlanQualityLeadIndicatorInput[];
  milestones: { week4: string; week8: string; week12: string };
  reviewDay?: string;
  tacticLoadPreference?: "lighter" | "balanced" | "push";
  dailyTimeBudget?: string;
  personalConstraint?: "time" | "motivation" | "consistency" | "complexity" | "";
}

const DIMENSION_MAX = {
  outcome: 15,
  milestones: 15,
  "lead-indicators": 20,
  "task-load": 15,
  "week-one-startability": 15,
  "review-cadence": 10,
  "feasibility-alignment": 10,
} as const;

const DIMENSION_LABEL: Record<PlanQualityDimensionId, string> = {
  outcome: "Kết quả 12 tuần rõ",
  milestones: "Cột mốc tuần 4/8/12",
  "lead-indicators": "Việc lặp lại thực tế",
  "task-load": "Số việc tuần đầu",
  "week-one-startability": "Tuần 1 dễ bắt đầu",
  "review-cadence": "Nhịp nhìn lại",
  "feasibility-alignment": "Khớp với phần yếu nhất",
};

function trim(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function countWords(value: string): number {
  return trim(value).split(/\s+/).filter(Boolean).length;
}

function dimensionStatus(score: number, maxScore: number): PlanQualityLevel {
  if (maxScore <= 0) return "weak";
  const ratio = score / maxScore;
  if (ratio >= 0.7) return "strong";
  if (ratio >= 0.4) return "okay";
  return "weak";
}

function overallLevel(score: number): PlanQualityLevel {
  if (score >= 70) return "strong";
  if (score >= 40) return "okay";
  return "weak";
}

function parseTargetNumber(target: string | undefined): number | null {
  const parsed = Number.parseInt(trim(target ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isVagueMilestone(value: string): boolean {
  return countWords(value) < 3;
}

function isMilestoneSpecific(value: string): boolean {
  return countWords(value) >= 4 && trim(value).length >= 12;
}

// ---- Week 1 Startability helpers --------------------------------------------

/**
 * Curated list of action verb roots (Vietnamese with/without diacritics +
 * common English) used to detect whether a task title starts with an action.
 * Substring match against the lower-cased first 3 words of the title.
 */
const ACTION_VERB_ROOTS: readonly string[] = [
  // Vietnamese with diacritics
  "viết", "đọc", "tập", "luyện", "làm", "chạy", "học", "ôn", "gặp", "gọi",
  "ghi", "lập", "lên", "đặt", "chuẩn bị", "thiết lập", "tạo", "mở", "kiểm tra",
  "đo", "chuyển", "khởi động", "hoàn thành", "bắt đầu", "tổng kết",
  "phân tích", "ưu tiên", "đăng", "chỉnh", "hỏi", "trao đổi",
  "nhắn", "gửi", "lưu", "in", "book", "lịch", "lướt", "luyện tập",
  "thực hành", "thực hiện", "rèn", "dọn", "kiểm", "đi", "nấu",
  // Vietnamese no diacritics
  "viet", "doc", "tap", "luyen", "lam", "chay", "hoc", "on", "gap", "goi",
  "lap", "len", "dat", "chuan bi", "thiet lap", "tao", "mo", "kiem tra",
  "do", "chuyen", "khoi dong", "hoan thanh", "bat dau", "tong ket",
  "phan tich", "uu tien", "dang", "chinh", "hoi", "trao doi",
  "nhan", "gui", "luu", "thuc hanh", "thuc hien", "ren", "don", "kiem", "di", "nau",
  // English common starters
  "write", "read", "do", "run", "start", "complete", "build", "ship", "code",
  "draft", "edit", "publish", "post", "upload", "track", "log", "transfer",
  "save", "set up", "set", "plan", "schedule", "call", "send", "book",
  "open", "create", "deliver", "review", "demo", "prep", "finish", "check",
];

const GENERIC_TASK_PATTERNS: readonly RegExp[] = [
  /^(việc|viec)\s*\d*$/iu,
  /^task\s*\d*$/iu,
  /^(thành công|thanh cong)$/iu,
  /^(kết quả|ket qua)$/iu,
  /^(làm việc|lam viec)$/iu,
  /^(tốt hơn|tot hon)$/iu,
];

export interface FirstTaskAnalysis {
  isMissing: boolean;
  /** Title shorter than 6 chars, only generic phrasing, or vague pattern match. */
  isVague: boolean;
  /** First 3 words of the title contain no recognised action verb root. */
  missingActionVerb: boolean;
}

/**
 * Pure check on a task title for Week 1 Startability:
 *   - missing
 *   - vague (too short or generic phrasing)
 *   - missing action verb in the first few words
 *
 * Heuristic only — designed to nudge users without blocking. Returns flags
 * so callers can build localised warnings.
 */
export function analyzeFirstTaskTitle(title: string | undefined | null): FirstTaskAnalysis {
  const trimmed = trim(title ?? "");
  if (trimmed.length === 0) {
    return { isMissing: true, isVague: false, missingActionVerb: false };
  }

  const lower = trimmed.toLowerCase();
  const isGeneric = GENERIC_TASK_PATTERNS.some((pattern) => pattern.test(trimmed));
  const isVague = isGeneric || trimmed.length < 6;

  // Look at the first 3 "tokens" (split on whitespace). Match against verb roots.
  // Normalise whitespace for multi-word verb roots.
  const lowerNormalised = lower.replace(/\s+/g, " ");
  const firstSegment = lowerNormalised.split(" ").slice(0, 3).join(" ");
  const missingActionVerb = !ACTION_VERB_ROOTS.some((verb) => firstSegment.includes(verb));

  return {
    isMissing: false,
    isVague,
    missingActionVerb,
  };
}

// ---- Dimension evaluators ----------------------------------------------------

function evaluateOutcome(input: PlanQualityInput): { score: number; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const visionLength = trim(input.vision12Week).length;
  if (visionLength >= 30) {
    score += 5;
  } else if (visionLength === 0) {
    warnings.push("Tầm nhìn 12 tuần đang trống — kế hoạch sẽ thiếu định hướng.");
  } else {
    suggestions.push("Mở rộng tầm nhìn 12 tuần (≥30 ký tự) để outcome rõ hơn.");
  }

  const outcomeLength = trim(input.week12Outcome).length;
  if (outcomeLength >= 15) {
    score += 5;
  } else if (outcomeLength === 0) {
    warnings.push("Chưa có kết quả tuần 12 — không biết đích đến cụ thể.");
  } else {
    suggestions.push("Viết kết quả tuần 12 cụ thể hơn (≥15 ký tự, có con số nếu có thể).");
  }

  const lagTarget = trim(input.lagMetric.target);
  const lagName = trim(input.lagMetric.name);
  if (lagTarget && lagName) {
    score += 5;
  } else if (!lagTarget) {
    suggestions.push("Thêm con số đích cho chỉ số chính để đo được tiến độ.");
  }

  return { score, warnings, suggestions };
}

function evaluateMilestones(input: PlanQualityInput): { score: number; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const week4 = trim(input.milestones.week4);
  const week8 = trim(input.milestones.week8);
  const week12 = trim(input.milestones.week12);

  if (week4.length >= 8) {
    score += 5;
  }
  if (week8.length >= 8) {
    score += 5;
  }

  if (isVagueMilestone(week4) && isVagueMilestone(week8)) {
    warnings.push("Mốc tuần 4 và tuần 8 còn quá chung chung — kế hoạch khó đo giữa chu kỳ.");
  } else if (isVagueMilestone(week4)) {
    suggestions.push("Cụ thể hóa mốc tuần 4 (≥4 từ, có con số/đầu ra).");
  } else if (isVagueMilestone(week8)) {
    suggestions.push("Cụ thể hóa mốc tuần 8 (≥4 từ, có con số/đầu ra).");
  }

  // +5 bonus when all three milestones differ AND at least one is specific
  const distinct = new Set([week4, week8, week12].filter((value) => value.length > 0)).size;
  if (distinct >= 2 && (isMilestoneSpecific(week4) || isMilestoneSpecific(week8) || isMilestoneSpecific(week12))) {
    score += 5;
  } else if (week4 && week8 && week4 === week8) {
    suggestions.push("Mốc tuần 4 và tuần 8 đang trùng nội dung — phân hóa để thấy tiến độ.");
  }

  return { score, warnings, suggestions };
}

function evaluateLeadIndicators(
  input: PlanQualityInput,
): { score: number; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const validIndicators = input.leadIndicators.filter((indicator) => trim(indicator.name).length > 0);
  const count = validIndicators.length;

  if (count === 0) {
    warnings.push("Chưa có việc lặp lại nào — kế hoạch không có việc để giữ nhịp hằng tuần.");
    return { score, warnings, suggestions };
  }

  if (count >= 2 && count <= 4) {
    score += 5;
  } else if (count === 1) {
    warnings.push("Chỉ có 1 việc lặp lại — nên có ít nhất 2 việc để giữ nhịp.");
  } else if (count > 4) {
    warnings.push(`Có ${count} việc lặp lại — vượt khuyến nghị 2-4 việc, dễ quá tải.`);
  }

  // +5 if every indicator has a non-empty name (already filtered, but treat as confirmation)
  score += 5;

  // +5 if every indicator has a valid numeric target
  const indicatorsWithValidTarget = validIndicators.filter((indicator) => parseTargetNumber(indicator.target) !== null);
  if (indicatorsWithValidTarget.length === validIndicators.length) {
    score += 5;
  } else {
    const missing = validIndicators.length - indicatorsWithValidTarget.length;
    suggestions.push(`Đặt số lần cụ thể cho ${missing} việc còn thiếu (ví dụ: 3 lần/tuần).`);
  }

  // +5 if every indicator has at least one schedule offset
  const indicatorsWithSchedule = validIndicators.filter(
    (indicator) => Array.isArray(indicator.schedule) && indicator.schedule.length > 0,
  );
  if (indicatorsWithSchedule.length === validIndicators.length) {
    score += 5;
  } else if (indicatorsWithSchedule.length === 0) {
    suggestions.push("Chưa có ngày lịch cụ thể cho các việc lặp lại — chọn ngày ưu tiên hoặc để mặc định.");
  }

  return { score, warnings, suggestions };
}

function evaluateTaskLoad(
  input: PlanQualityInput,
  context: PlanQualityContext | undefined,
): { score: number; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const weeklyTaskCount = context?.weeklyTaskCount ?? 0;
  const maxWeeklyTasks = getMaxWeeklyTaskCount({
    tacticLoadPreference: input.tacticLoadPreference,
    dailyTimeBudget: input.dailyTimeBudget,
  });
  const maxTasksPerTactic = getMaxTasksPerTactic({
    tacticLoadPreference: input.tacticLoadPreference,
    dailyTimeBudget: input.dailyTimeBudget,
  });

  if (weeklyTaskCount > 0 && weeklyTaskCount <= maxWeeklyTasks) {
    score += 8;
  } else if (weeklyTaskCount > maxWeeklyTasks) {
    warnings.push(
      `Tuần đầu có ${weeklyTaskCount} việc — vượt giới hạn ${maxWeeklyTasks} cho cấu hình hiện tại, dễ quá tải.`,
    );
  }

  if (weeklyTaskCount >= 2) {
    score += 4;
  } else if (weeklyTaskCount === 0) {
    warnings.push("Tuần đầu chưa có việc nào được tạo — cần nhập tên cho các việc lặp lại.");
  }

  const validIndicators = input.leadIndicators.filter((indicator) => trim(indicator.name).length > 0);
  const indicatorsWithSchedule = validIndicators.filter(
    (indicator) => Array.isArray(indicator.schedule) && indicator.schedule.length > 0,
  );
  if (validIndicators.length > 0 && indicatorsWithSchedule.length === validIndicators.length) {
    score += 3;
  }

  // Detect single tactic carrying too much
  const overloadedTactic = validIndicators.find(
    (indicator) => Array.isArray(indicator.schedule) && indicator.schedule.length > maxTasksPerTactic,
  );
  if (overloadedTactic) {
    suggestions.push(
      `Một việc đang được lên lịch nhiều hơn ${maxTasksPerTactic} lần/tuần — chia bớt sang việc khác.`,
    );
  }

  return { score, warnings, suggestions };
}

function evaluateWeekOneStartability(
  input: PlanQualityInput,
  context: PlanQualityContext | undefined,
): { score: number; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const weeklyTaskCount = context?.weeklyTaskCount ?? 0;
  const feasibility = context?.feasibility;

  if (weeklyTaskCount > 0) {
    score += 5;
  }

  // Feasibility-aware ceiling for week 1
  const isLowFeasibility =
    feasibility?.planLoad === "lighter" ||
    feasibility?.weeklyCapacity === "low" ||
    feasibility?.bottleneck?.axis === "energy" ||
    feasibility?.bottleneck?.axis === "confidence";

  if (isLowFeasibility) {
    if (weeklyTaskCount > 0 && weeklyTaskCount <= 4) {
      score += 5;
    } else if (weeklyTaskCount > 4) {
      warnings.push(
        `Mức khả thi đang thấp (${feasibility?.bottleneck?.label ?? "phần yếu nhất"}) nhưng tuần đầu có ${weeklyTaskCount} việc — nên giảm xuống tối đa 4 việc để dễ bắt đầu.`,
      );
    }
  } else {
    if (weeklyTaskCount > 0 && weeklyTaskCount <= 6) {
      score += 5;
    } else if (weeklyTaskCount > 6) {
      suggestions.push("Tuần đầu hơi nhiều việc — cân nhắc giảm để giữ thắng nhỏ sớm.");
    }
  }

  // Recommend 1-2 indicators of type "core" so week 1 is anchored
  const coreCount = input.leadIndicators.filter(
    (indicator) => trim(indicator.name).length > 0 && indicator.type !== "optional",
  ).length;
  if (coreCount >= 1) {
    score += 5;
  } else if (input.leadIndicators.length > 0) {
    suggestions.push("Đánh dấu ít nhất 1 việc lặp lại là 'cốt lõi' để tuần 1 có việc bắt buộc.");
  }

  // First task quality — additive warnings, no score change.
  // Skip when there are no week-1 tasks (already covered by zero-task warning).
  if (weeklyTaskCount > 0 && context?.firstTaskTitle !== undefined) {
    const analysis = analyzeFirstTaskTitle(context.firstTaskTitle);
    if (analysis.isMissing) {
      warnings.push(
        "Việc đầu tiên tuần 1 chưa có tên — đặt tên rõ để bạn biết làm gì trong 24h tới.",
      );
    } else {
      if (analysis.isVague) {
        warnings.push(
          "Việc đầu tiên còn mơ hồ — viết rõ hành động và đầu ra (ví dụ: 'viết draft 800 từ', 'đo baseline 1 set').",
        );
      }
      if (analysis.missingActionVerb) {
        warnings.push(
          "Việc đầu tiên thiếu động từ hành động — bắt đầu tên bằng động từ (viết, làm, đo, lên lịch, gửi...) để dễ bắt tay vào.",
        );
      }
    }
  }

  return { score, warnings, suggestions };
}

function evaluateReviewCadence(input: PlanQualityInput): { score: number; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (trim(input.reviewDay)) {
    score += 5;
  } else {
    warnings.push("Chưa chọn ngày nhìn lại — dễ trôi tuần mà không đánh giá.");
  }

  if (trim(input.dailyTimeBudget)) {
    score += 5;
  } else {
    suggestions.push("Chọn ngân sách thời gian mỗi ngày để task được phân bổ đúng tải.");
  }

  return { score, warnings, suggestions };
}

function evaluateFeasibilityAlignment(
  input: PlanQualityInput,
  context: PlanQualityContext | undefined,
): { score: number; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const feasibility = context?.feasibility;
  if (!feasibility) {
    // Without feasibility context we cannot judge; award half score so plans without it aren't penalized hard.
    return { score: 5, warnings, suggestions };
  }

  if (feasibility.planLoad && input.tacticLoadPreference) {
    if (feasibility.planLoad === input.tacticLoadPreference) {
      score += 5;
    } else if (feasibility.planLoad === "lighter" && input.tacticLoadPreference === "push") {
      warnings.push(
        "Khả thi gợi ý nhịp 'lighter' nhưng bạn đang chọn 'push' — rủi ro mất nhịp sớm.",
      );
    } else {
      suggestions.push(
        `Cân nhắc đổi nhịp về '${feasibility.planLoad}' theo gợi ý kiểm tra khả thi, hoặc giữ '${input.tacticLoadPreference}' nếu có lý do rõ.`,
      );
    }
  } else if (feasibility.planLoad) {
    suggestions.push(`Chọn nhịp '${feasibility.planLoad}' theo gợi ý kiểm tra khả thi.`);
  }

  const bottleneckAxis = feasibility.bottleneck?.axis;
  const constraint = input.personalConstraint;
  if (bottleneckAxis && constraint) {
    const expected =
      bottleneckAxis === "time"
        ? "time"
        : bottleneckAxis === "energy" || bottleneckAxis === "routine" || bottleneckAxis === "confidence"
          ? "consistency"
          : bottleneckAxis === "resources" || bottleneckAxis === "clarity" || bottleneckAxis === "wheel"
            ? "complexity"
            : bottleneckAxis === "obstacle"
              ? "motivation"
              : null;
    if (expected && expected === constraint) {
      score += 5;
    } else if (expected) {
      suggestions.push(
        `Trở ngại đang chọn ('${constraint}') chưa khớp với điểm nghẽn ('${feasibility.bottleneck?.label ?? bottleneckAxis}').`,
      );
    }
  } else if (bottleneckAxis && !constraint) {
    suggestions.push(
      `Chọn trở ngại lớn nhất phù hợp với điểm nghẽn '${feasibility.bottleneck?.label ?? bottleneckAxis}'.`,
    );
  }

  if (feasibility.smartGoalQualityLevel === "weak") {
    suggestions.push("Mục tiêu SMART hiện còn yếu — cân nhắc làm rõ trước khi chạy 12 tuần.");
  }

  return { score, warnings, suggestions };
}

function evaluateArchetypeFit(
  input: PlanQualityInput,
): { warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const archetype = input.goalArchetype;
  if (!archetype || archetype === "other") {
    return { warnings, suggestions };
  }

  const defaults = getArchetypePlanFullDefaults(archetype);
  const validIndicators = input.leadIndicators.filter((indicator) => trim(indicator.name).length > 0);
  const indicatorNames = validIndicators.map((indicator) => indicator.name);

  // Signal 1: at least one indicator name should match archetype keywords
  if (
    defaults.requiredSignals.leadIndicatorKeywords.length > 0 &&
    validIndicators.length > 0 &&
    !indicatorsMatchArchetype(indicatorNames, archetype)
  ) {
    const suggestionSnippet = defaults.leadIndicatorSuggestions.slice(0, 2).join(", ");
    warnings.push(
      `Việc lặp lại chưa phản ánh loại mục tiêu (${archetype}). Cân nhắc thêm 1 việc dạng: ${suggestionSnippet}.`,
    );
  }

  // Signal 2: at least one milestone should reference archetype-relevant outcomes
  const milestoneValues = [input.milestones.week4, input.milestones.week8, input.milestones.week12].map(trim);
  const nonEmptyMilestones = milestoneValues.filter((value) => value.length > 0);
  if (
    defaults.requiredSignals.milestoneKeywords.length > 0 &&
    nonEmptyMilestones.length > 0 &&
    !milestonesMatchArchetype(nonEmptyMilestones, archetype)
  ) {
    suggestions.push(
      `Mốc tuần 4/8/12 chưa nói đến output đặc thù của loại mục tiêu này (ví dụ: ${defaults.milestoneTemplates.week4}).`,
    );
  }

  // Archetype-specific warnings
  switch (archetype) {
    case "health_fitness": {
      if (input.tacticLoadPreference === "push") {
        warnings.push(
          "Mục tiêu sức khỏe nên bắt đầu ở mức 'nhẹ hơn' hoặc 'cân bằng' tuần 1 để tránh chấn thương / kiệt sức.",
        );
      }
      const hasRecoverySignal = indicatorNames.some((name) =>
        /nghỉ|recovery|mobility|ngủ|ngu /i.test(name.toLowerCase()),
      );
      if (validIndicators.length >= 2 && !hasRecoverySignal) {
        suggestions.push("Cân nhắc thêm 1 việc recovery/nghỉ để tránh tăng tải liên tiếp.");
      }
      break;
    }
    case "project_completion": {
      const deliverableMilestones = nonEmptyMilestones.filter((value) => value.length >= 8);
      if (deliverableMilestones.length < 2) {
        warnings.push(
          "Dự án cần mốc deliverable rõ ở ít nhất 2 trong 3 tuần 4/8/12 (ship, release, demo, feature cụ thể).",
        );
      }
      break;
    }
    case "exam_study": {
      const hasPracticeTest = indicatorNames.some((name) =>
        /đề thi|de thi|practice test|mock|luyện đề|luyen de/i.test(name.toLowerCase()),
      );
      if (validIndicators.length > 0 && !hasPracticeTest) {
        warnings.push(
          "Plan thi cử cần ít nhất 1 việc 'đề thi thử / practice test' mỗi tuần để theo dõi baseline thật.",
        );
      }
      break;
    }
    case "financial_goal": {
      if (validIndicators.length === 0) {
        warnings.push(
          "Mục tiêu tài chính đang chỉ có chỉ số chính, chưa có hành động kiểm soát được hằng tuần (tracking/chuyển khoản tự động/review).",
        );
      } else if (validIndicators.length === 1) {
        suggestions.push(
          "Nên có ít nhất 2 hành động tài chính hằng tuần (ví dụ: tracking + weekly review) để không phụ thuộc duy nhất vào số tiền.",
        );
      }
      break;
    }
    case "habit_building": {
      const hasCueSignal = indicatorNames.some((name) =>
        /cue|trigger|routine|môi trường|moi truong|sau |trước |truoc /i.test(name.toLowerCase()),
      );
      if (validIndicators.length > 0 && !hasCueSignal) {
        suggestions.push(
          "Habit cần cue/trigger rõ (ví dụ: 'sau cà phê sáng', 'trước khi đánh răng'). Gắn vào routine có sẵn để giảm friction.",
        );
      }
      break;
    }
    case "skill_learning": {
      const hasFeedbackLoop = indicatorNames.some((name) =>
        /demo|pair|review|feedback|output|ship|publish/i.test(name.toLowerCase()),
      );
      if (validIndicators.length > 0 && !hasFeedbackLoop) {
        suggestions.push(
          "Skill learning cần feedback loop (demo, pair review, ship output). Học mà không có output dễ ảo tưởng tiến bộ.",
        );
      }
      break;
    }
    default:
      break;
  }

  return { warnings, suggestions };
}

// ---- Public API --------------------------------------------------------------

export function evaluateTwelveWeekPlanQuality(
  input: PlanQualityInput,
  context?: PlanQualityContext,
): PlanQualityResult {
  const dimensionEvals = [
    { id: "outcome" as const, evaluation: evaluateOutcome(input) },
    { id: "milestones" as const, evaluation: evaluateMilestones(input) },
    { id: "lead-indicators" as const, evaluation: evaluateLeadIndicators(input) },
    { id: "task-load" as const, evaluation: evaluateTaskLoad(input, context) },
    { id: "week-one-startability" as const, evaluation: evaluateWeekOneStartability(input, context) },
    { id: "review-cadence" as const, evaluation: evaluateReviewCadence(input) },
    { id: "feasibility-alignment" as const, evaluation: evaluateFeasibilityAlignment(input, context) },
  ];

  const dimensions: PlanQualityDimensionResult[] = dimensionEvals.map(({ id, evaluation }) => {
    const maxScore = DIMENSION_MAX[id];
    const score = Math.min(Math.max(evaluation.score, 0), maxScore);
    return {
      id,
      label: DIMENSION_LABEL[id],
      score,
      maxScore,
      status: dimensionStatus(score, maxScore),
    };
  });

  const overallScore = dimensions.reduce((total, dimension) => total + dimension.score, 0);
  const archetypeFit = evaluateArchetypeFit(input);
  const warnings = [
    ...dimensionEvals.flatMap(({ evaluation }) => evaluation.warnings),
    ...archetypeFit.warnings,
  ];
  const suggestions = [
    ...dimensionEvals.flatMap(({ evaluation }) => evaluation.suggestions),
    ...archetypeFit.suggestions,
  ];

  return {
    overallScore,
    level: overallLevel(overallScore),
    dimensions,
    warnings,
    suggestions,
  };
}

export function getPlanQualityWarnings(input: PlanQualityInput, context?: PlanQualityContext): string[] {
  return evaluateTwelveWeekPlanQuality(input, context).warnings;
}

export function getPlanImprovementSuggestions(input: PlanQualityInput, context?: PlanQualityContext): string[] {
  return evaluateTwelveWeekPlanQuality(input, context).suggestions;
}

// ---- Calibration API ---------------------------------------------------------

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
  min: number;
  max: number;
  hardCap: number;
}

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

function getLoadBand(planLoad: PlanLoadPreference, weeklyCapacity: WeeklyCapacityBand): LoadBand {
  return LOAD_BANDS[`${planLoad}-${weeklyCapacity}`] ?? LOAD_BANDS["balanced-medium"];
}

function buildOverloadedSuggestion(taskCount: number, planLoad: PlanLoadPreference, band: LoadBand): string {
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
    return null;
  }
  if (taskCount === 0) {
    return "Tuần 1 chưa có việc nào. Thêm ít nhất một việc lặp lại trước khi bắt đầu chu kỳ.";
  }
  return `Tuần 1 chỉ có ${taskCount} task — dưới mức gợi ý ${band.min}. Cân nhắc thêm 1 việc cốt lõi nếu lịch cho phép.`;
}

export function assessWeekOneLoad(input: AssessWeekOneLoadInput): WeekOneLoadAssessment {
  const { taskCount, planLoad, weeklyCapacity } = input;
  const band = getLoadBand(planLoad, weeklyCapacity);
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
    level = "okay";
  } else {
    level = "strong";
  }

  if (
    level === "weak" &&
    weekOneLoad.level === "underloaded" &&
    input.planLoad === "lighter" &&
    input.weeklyCapacity === "low" &&
    input.hasLagMetric &&
    input.leadIndicatorCount >= RECOMMENDED_LEAD_INDICATOR_MIN
  ) {
    level = "okay";
  }

  return { level, weekOneLoad, warnings, suggestions };
}
