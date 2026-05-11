/**
 * Plan Rationale v1 — pure helper.
 *
 * Produces 3-5 deterministic Vietnamese bullet reasons answering
 * "Vì sao kế hoạch này phù hợp với bạn?" plus optional warnings and
 * adjustment suggestions for users who disagree.
 *
 * Constraints honored (v1):
 *  - No AI, no network, no analytics.
 *  - Pure: no side effects, no localStorage reads.
 *  - Backwards compatible: every contextual input is optional. With
 *    empty context the helper still produces 2-3 useful structural
 *    reasons (e.g. number of indicators, milestones, week-1 size).
 *  - Never interpolates user free text (vision, indicator names,
 *    task titles, milestone descriptions). Numbers and canned axis
 *    labels are safe.
 *  - Never claims success — copy frames the plan as "fits your current
 *    capacity / starting point", not "you will succeed".
 */

import type { GoalArchetype } from "@/lib/smart-goal";

// ---- Public types -----------------------------------------------------------

export interface PlanRationaleLeadIndicator {
  name: string;
  type?: "core" | "optional";
  schedule?: number[];
  target?: string;
}

export interface PlanRationaleInput {
  vision12Week?: string;
  week12Outcome?: string;
  goalArchetype?: GoalArchetype | null;
  leadIndicators: ReadonlyArray<PlanRationaleLeadIndicator>;
  milestones?: {
    week4?: string;
    week8?: string;
    week12?: string;
  };
  reviewDay?: string;
  tacticLoadPreference?: "lighter" | "balanced" | "push";
  /** Total tasks generated for week 1 from the lead indicator schedules. */
  weeklyTaskCount?: number;
  /** First task title — used for analysis only, never echoed back to UI. */
  firstTaskTitle?: string;
}

export interface PlanRationaleFeasibilityContext {
  planLoad?: "lighter" | "balanced" | "push";
  weeklyCapacity?: "low" | "medium" | "high";
  bottleneck?: { axis?: string; label?: string };
  adjustedScore?: number;
  smartGoalQualityLevel?: "weak" | "okay" | "strong";
}

export interface PlanRationaleContext {
  feasibility?: PlanRationaleFeasibilityContext | null;
  goalArchetype?: GoalArchetype | null;
}

export type PlanRationaleReasonId =
  | "lighter_for_low_capacity"
  | "balanced_for_medium_capacity"
  | "push_for_high_capacity"
  | "addresses_bottleneck"
  | "archetype_specific_focus"
  | "indicators_keep_weekly_rhythm"
  | "milestones_break_into_steps"
  | "week_one_starts_small"
  | "week_one_specific_task";

export type PlanRationaleWarningId =
  | "indicators_too_few"
  | "milestones_missing"
  | "week_one_overloaded"
  | "smart_quality_weak"
  | "load_mismatched_to_capacity";

export type PlanRationaleAdjustmentId =
  | "switch_to_lighter"
  | "switch_to_push"
  | "add_milestone"
  | "trim_week_one"
  | "add_indicator"
  | "fix_smart_goal";

export interface PlanRationaleReason {
  id: PlanRationaleReasonId;
  text: string;
}

export interface PlanRationaleWarning {
  id: PlanRationaleWarningId;
  text: string;
}

export interface PlanRationaleAdjustment {
  id: PlanRationaleAdjustmentId;
  text: string;
}

export interface PlanRationaleResult {
  reasons: PlanRationaleReason[];
  warnings: PlanRationaleWarning[];
  adjustments: PlanRationaleAdjustment[];
  /** Analytics-safe markers — never user free text. */
  metrics: {
    reason_count: number;
    warning_count: number;
    adjustment_count: number;
    has_feasibility_context: boolean;
    has_archetype: boolean;
  };
}

// ---- Constants --------------------------------------------------------------

const MIN_REASONS = 2;
const MAX_REASONS = 5;
/** Soft ceiling for week-1 tasks before "overloaded" fires (low feasibility halves this). */
const WEEK_ONE_TASK_CEILING = 6;
const WEEK_ONE_TASK_CEILING_LOW = 4;

const REASON_PRIORITY: PlanRationaleReasonId[] = [
  "lighter_for_low_capacity",
  "balanced_for_medium_capacity",
  "push_for_high_capacity",
  "addresses_bottleneck",
  "archetype_specific_focus",
  "milestones_break_into_steps",
  "indicators_keep_weekly_rhythm",
  "week_one_starts_small",
  "week_one_specific_task",
];

const ARCHETYPE_REASON_TEXT: Record<GoalArchetype, string | null> = {
  skill_learning:
    "Có ít nhất một việc lặp lại tạo kết quả để bạn đo tiến bộ thật, không chỉ đo giờ học.",
  health_fitness:
    "Nhịp tuần được giữ vừa sức để tránh kiệt sức hoặc chấn thương khi mới bắt đầu.",
  career_growth:
    "Tập trung vào kết quả công việc bạn kiểm soát được, không phụ thuộc người khác công nhận.",
  financial_goal:
    "Có hành động lặp lại bạn kiểm soát được, không phụ thuộc thu nhập bất thường.",
  exam_study:
    "Có chỗ cho việc làm đề thi thử để biết band/điểm thực tế, không học chay.",
  project_completion:
    "Có cột mốc tuần 4 và tuần 8 để biết dự án đang đúng hướng giữa chu kỳ.",
  habit_building:
    "Tuần 1 đủ nhỏ để xây chuỗi ngày, đặt nền cho thói quen lâu dài.",
  creative_output:
    "Ưu tiên nhịp xuất bản đều đặn hơn là cố làm hoàn hảo từng tác phẩm.",
  relationship_life:
    "Có lịch cố định và việc bạn kiểm soát được, không phụ thuộc 'lúc rảnh thì gặp'.",
  other: null,
};

// ---- Helpers ---------------------------------------------------------------

function isLowCapacityCtx(feasibility: PlanRationaleFeasibilityContext | null | undefined): boolean {
  if (!feasibility) return false;
  return feasibility.weeklyCapacity === "low" || feasibility.planLoad === "lighter";
}

function nonEmpty(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

function countMilestones(milestones: PlanRationaleInput["milestones"]): number {
  if (!milestones) return 0;
  let count = 0;
  if (nonEmpty(milestones.week4)) count += 1;
  if (nonEmpty(milestones.week8)) count += 1;
  if (nonEmpty(milestones.week12)) count += 1;
  return count;
}

function getEffectivePlanLoad(
  input: PlanRationaleInput,
  feasibility: PlanRationaleFeasibilityContext | null | undefined,
): "lighter" | "balanced" | "push" | undefined {
  return feasibility?.planLoad ?? input.tacticLoadPreference;
}

// ---- Reason builders -------------------------------------------------------

function buildReasons(
  input: PlanRationaleInput,
  feasibility: PlanRationaleFeasibilityContext | null | undefined,
  archetype: GoalArchetype | null,
): PlanRationaleReason[] {
  const reasons: PlanRationaleReason[] = [];
  const planLoad = getEffectivePlanLoad(input, feasibility);
  const weeklyCapacity = feasibility?.weeklyCapacity;
  const taskCount = input.weeklyTaskCount ?? 0;
  const indicatorCount = input.leadIndicators.length;
  const milestoneCount = countMilestones(input.milestones);
  const isLow = isLowCapacityCtx(feasibility);
  const ceiling = isLow ? WEEK_ONE_TASK_CEILING_LOW : WEEK_ONE_TASK_CEILING;

  // 1. Capacity — at most one of these fires.
  if (planLoad === "lighter" || weeklyCapacity === "low") {
    reasons.push({
      id: "lighter_for_low_capacity",
      text:
        "Bạn chọn nhịp nhẹ vì tuần này thời gian/năng lượng còn hạn — mục tiêu là giữ nhịp, không phải dồn việc.",
    });
  } else if (planLoad === "push" && weeklyCapacity === "high") {
    reasons.push({
      id: "push_for_high_capacity",
      text:
        "Bạn có quỹ thời gian tốt và sẵn sàng cao nên kế hoạch đẩy nhanh thêm một bậc, vẫn có chỗ nhìn lại hằng tuần.",
    });
  } else if (planLoad === "balanced") {
    reasons.push({
      id: "balanced_for_medium_capacity",
      text:
        "Nhịp cân bằng phù hợp với quỹ thời gian thực — đủ tiến độ mà không kiệt sức cuối tuần.",
    });
  }

  // 2. Bottleneck — interpolate canned axis label only.
  const bottleneck = feasibility?.bottleneck;
  if (bottleneck && nonEmpty(bottleneck.label)) {
    reasons.push({
      id: "addresses_bottleneck",
      text: `Phần yếu nhất hiện tại là ${bottleneck.label} — kế hoạch giữ tuần đầu nhẹ để gỡ phần này trước khi tăng tốc.`,
    });
  }

  // 3. Archetype-specific framing.
  if (archetype && ARCHETYPE_REASON_TEXT[archetype]) {
    reasons.push({
      id: "archetype_specific_focus",
      text: ARCHETYPE_REASON_TEXT[archetype] ?? "",
    });
  }

  // 4. Milestone progression.
  if (milestoneCount >= 2) {
    reasons.push({
      id: "milestones_break_into_steps",
      text:
        "Có cột mốc tuần 4/8/12 để chia chu kỳ thành các đoạn ngắn — dễ nhìn lại và điều chỉnh giữa chu kỳ.",
    });
  }

  // 5. Lead indicator rhythm.
  if (indicatorCount >= 2) {
    reasons.push({
      id: "indicators_keep_weekly_rhythm",
      text: `Có ${indicatorCount} việc lặp lại để giữ nhịp tuần — không cần dồn việc cuối tuần.`,
    });
  }

  // 6. Week 1 — keep small.
  if (taskCount > 0 && taskCount <= ceiling) {
    reasons.push({
      id: "week_one_starts_small",
      text: `Tuần 1 chỉ ${taskCount} việc — đủ nhỏ để bạn dễ bắt đầu và giữ nhịp đến hết tuần.`,
    });
  }

  // 7. Week 1 — first task is concrete (no title interpolation).
  if (nonEmpty(input.firstTaskTitle)) {
    const trimmed = input.firstTaskTitle?.trim() ?? "";
    if (trimmed.length >= 6) {
      reasons.push({
        id: "week_one_specific_task",
        text: "Việc đầu tiên đã có tên cụ thể nên bạn biết bắt tay từ đâu trong 24-48 giờ tới.",
      });
    }
  }

  return reasons;
}

function sortAndCap(reasons: PlanRationaleReason[]): PlanRationaleReason[] {
  const indexById = new Map(REASON_PRIORITY.map((id, index) => [id, index] as const));
  return [...reasons]
    .sort((a, b) => (indexById.get(a.id) ?? 99) - (indexById.get(b.id) ?? 99))
    .slice(0, MAX_REASONS);
}

// ---- Warning builders ------------------------------------------------------

function buildWarnings(
  input: PlanRationaleInput,
  feasibility: PlanRationaleFeasibilityContext | null | undefined,
): PlanRationaleWarning[] {
  const warnings: PlanRationaleWarning[] = [];
  const planLoad = getEffectivePlanLoad(input, feasibility);
  const weeklyCapacity = feasibility?.weeklyCapacity;
  const indicatorCount = input.leadIndicators.length;
  const milestoneCount = countMilestones(input.milestones);
  const taskCount = input.weeklyTaskCount ?? 0;
  const isLow = isLowCapacityCtx(feasibility);
  const ceiling = isLow ? WEEK_ONE_TASK_CEILING_LOW : WEEK_ONE_TASK_CEILING;

  if (indicatorCount > 0 && indicatorCount < 2) {
    warnings.push({
      id: "indicators_too_few",
      text: "Có ít hơn 2 việc lặp lại — kế hoạch có thể bị thiếu nhịp giữ chu kỳ.",
    });
  }

  if (milestoneCount === 0 && (input.leadIndicators.length > 0 || taskCount > 0)) {
    warnings.push({
      id: "milestones_missing",
      text: "Chưa có cột mốc tuần 4/8/12 — bạn nên thêm 1-2 mốc để biết đi đúng hướng giữa chu kỳ.",
    });
  }

  if (taskCount > ceiling) {
    warnings.push({
      id: "week_one_overloaded",
      text: `Tuần 1 đang có ${taskCount} việc — nhiều hơn mức khuyên (≤ ${ceiling} với sức chứa hiện tại). Cân nhắc bỏ bớt 1-2 việc.`,
    });
  }

  if (feasibility?.smartGoalQualityLevel === "weak") {
    warnings.push({
      id: "smart_quality_weak",
      text: "Mục tiêu SMART còn mơ hồ — kế hoạch sẽ rõ hơn nếu bạn quay lại làm rõ kết quả.",
    });
  }

  if (planLoad === "push" && weeklyCapacity === "low") {
    warnings.push({
      id: "load_mismatched_to_capacity",
      text: "Nhịp 'đẩy nhanh' không khớp sức chứa tuần thấp — tuần đầu có thể bị quá tải.",
    });
  }

  return warnings;
}

// ---- Adjustment builders ---------------------------------------------------

const ADJUSTMENT_TEXT: Record<PlanRationaleAdjustmentId, string> = {
  switch_to_lighter:
    "Đổi sang nhịp nhẹ hơn ở phần Cài đặt nếu tuần đầu đang quá tải.",
  switch_to_push:
    "Đổi sang nhịp đẩy nhanh ở phần Cài đặt nếu bạn còn dư thời gian/năng lượng.",
  add_milestone:
    "Thêm 1 cột mốc cho tuần 4 hoặc tuần 8 để biết kế hoạch đang đi đúng hướng.",
  trim_week_one:
    "Bỏ bớt 1-2 việc trong tuần 1 — giữ 2-3 việc cốt lõi quan trọng nhất.",
  add_indicator:
    "Thêm 1 việc lặp lại cốt lõi (kiểu hành động bạn kiểm soát được, lặp lại được hằng tuần).",
  fix_smart_goal:
    "Quay lại bước SMART để làm rõ kết quả cần đạt và con số đo được.",
};

function buildAdjustments(
  warnings: PlanRationaleWarning[],
  input: PlanRationaleInput,
  feasibility: PlanRationaleFeasibilityContext | null | undefined,
): PlanRationaleAdjustment[] {
  const adjustments: PlanRationaleAdjustment[] = [];
  const seen = new Set<PlanRationaleAdjustmentId>();

  function push(id: PlanRationaleAdjustmentId): void {
    if (seen.has(id)) return;
    seen.add(id);
    adjustments.push({ id, text: ADJUSTMENT_TEXT[id] });
  }

  // Map warnings to adjustments.
  for (const warning of warnings) {
    switch (warning.id) {
      case "indicators_too_few":
        push("add_indicator");
        break;
      case "milestones_missing":
        push("add_milestone");
        break;
      case "week_one_overloaded":
        push("trim_week_one");
        push("switch_to_lighter");
        break;
      case "smart_quality_weak":
        push("fix_smart_goal");
        break;
      case "load_mismatched_to_capacity":
        push("switch_to_lighter");
        break;
    }
  }

  // Always offer at least one "if you disagree, here's the lever" entry,
  // keyed off the current plan load. Cap total adjustments at 3 for clarity.
  const planLoad = getEffectivePlanLoad(input, feasibility);
  if (adjustments.length === 0) {
    if (planLoad === "lighter" || planLoad === "balanced") {
      push("switch_to_push");
    } else if (planLoad === "push") {
      push("switch_to_lighter");
    } else {
      push("switch_to_lighter");
    }
  }

  return adjustments.slice(0, 3);
}

// ---- Public API ------------------------------------------------------------

/**
 * Returns a deterministic rationale for the current plan draft.
 *
 * Always returns at least 2 reasons. Warnings + adjustments arrays may
 * be empty when the plan is healthy. The `metrics` slice is safe to log
 * to analytics — it contains no user free text.
 */
export function getPlanRationale(
  input: PlanRationaleInput,
  context: PlanRationaleContext = {},
): PlanRationaleResult {
  const feasibility = context.feasibility ?? null;
  const archetype = context.goalArchetype ?? input.goalArchetype ?? null;

  const allReasons = buildReasons(input, feasibility, archetype);
  const reasons = sortAndCap(allReasons);

  // Defensive: if rules produced fewer than MIN_REASONS, surface a
  // generic structural reason so the UI never shows an empty list.
  if (reasons.length < MIN_REASONS) {
    if (input.weeklyTaskCount && input.weeklyTaskCount <= WEEK_ONE_TASK_CEILING) {
      if (!reasons.some((r) => r.id === "week_one_starts_small")) {
        reasons.push({
          id: "week_one_starts_small",
          text: `Tuần 1 chỉ ${input.weeklyTaskCount} việc — đủ nhỏ để bạn dễ bắt đầu.`,
        });
      }
    }
    if (reasons.length < MIN_REASONS) {
      reasons.push({
        id: "balanced_for_medium_capacity",
        text:
          "Kế hoạch giữ nhịp cân bằng — đủ rõ để hành động, đủ nhẹ để bạn không bỏ cuộc tuần đầu.",
      });
    }
  }

  const warnings = buildWarnings(input, feasibility);
  const adjustments = buildAdjustments(warnings, input, feasibility);

  return {
    reasons,
    warnings,
    adjustments,
    metrics: {
      reason_count: reasons.length,
      warning_count: warnings.length,
      adjustment_count: adjustments.length,
      has_feasibility_context: feasibility !== null,
      has_archetype: archetype !== null && archetype !== "other",
    },
  };
}
