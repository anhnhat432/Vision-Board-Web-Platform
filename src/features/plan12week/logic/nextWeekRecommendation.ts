/**
 * Next-Week Adjustment Recommendation — pure helper.
 *
 * After the user saves a weekly review, this module turns weekly signals into a
 * single recommendation for next week's posture: `lighter`, `same`, `push`,
 * `reset`, or `reduce_scope`. All output is canned Vietnamese copy + enum reason
 * codes — no user content is interpolated, so the result is safe for analytics
 * buckets.
 *
 * Constraints (v1):
 *   - Pure, deterministic, no AI.
 *   - Never auto-mutates plan / tasks / system. Caller must apply manually.
 *   - Never reads raw task titles, reflection text, or lag-metric text values.
 *   - Backwards compatible: every input field is optional except
 *     `weekCompletionPercent`. Missing signals lower confidence, never throw.
 */

import type { RescueSeverity, RescueTriggerId } from "./rescueMode";

// ---- Public types -----------------------------------------------------------

export type NextWeekAdjustment =
  | "lighter"
  | "same"
  | "push"
  | "reset"
  | "reduce_scope";

export type NextWeekConfidence = "low" | "medium" | "high";

export type NextWeekReasonCode =
  | "rescue_urgent"
  | "rescue_active"
  | "user_says_too_much"
  | "user_says_too_easy"
  | "user_says_keep_same"
  | "low_week_completion"
  | "very_low_week_completion"
  | "high_week_completion"
  | "low_lead_metric_completion"
  | "high_lead_metric_completion"
  | "inconsistent_check_ins"
  | "consistent_check_ins"
  | "feasibility_lighter"
  | "feasibility_push"
  | "weekly_review_missed"
  | "no_completion_streak"
  | "no_signals";

export type WorkloadDecisionInput =
  | "keep same"
  | "reduce slightly"
  | "increase slightly"
  | "";

export type FeasibilityPlanLoadInput = "lighter" | "balanced" | "push";

export interface NextWeekRecommendationContext {
  /** 0..100. Required. */
  weekCompletionPercent: number;
  /** 0..100. Optional — % of lead-metric weekly target hit this week. */
  leadMetricCompletionPercent?: number | null;
  /** 0..100. Optional — share of expected daily check-ins logged this week. */
  dailyCheckInConsistencyPercent?: number | null;
  /** From the saved weekly review form. */
  workloadDecision?: WorkloadDecisionInput;
  /** From the original feasibility check. */
  feasibilityPlanLoad?: FeasibilityPlanLoadInput | null;
  /** From rescue mode v1, when available. */
  rescueSeverity?: RescueSeverity | null;
  /** From rescue mode v1, when available. */
  rescueTriggers?: ReadonlyArray<RescueTriggerId>;
}

export interface NextWeekRecommendation {
  recommendation: NextWeekAdjustment;
  confidence: NextWeekConfidence;
  reasonCodes: NextWeekReasonCode[];
  /** Short Vietnamese headline. No user content interpolated. */
  headline: string;
  /** Longer Vietnamese explanation tied to recommendation. No user content interpolated. */
  body: string;
  /**
   * Generic Vietnamese hint for what the next-week priority should look like.
   * The user is expected to fill in the actual priority text — this is a frame,
   * not a copy-paste suggestion.
   */
  suggestedNextWeekPriority: string;
}

// ---- Constants --------------------------------------------------------------

const VERY_LOW_COMPLETION = 30;
const LOW_COMPLETION = 50;
const HIGH_COMPLETION = 80;

const LOW_LEAD_METRIC = 30;
const HIGH_LEAD_METRIC = 70;

const LOW_CHECKIN_CONSISTENCY = 30;
const HIGH_CHECKIN_CONSISTENCY = 70;

// ---- Internal utilities -----------------------------------------------------

function clampPercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function pushUnique<T>(list: T[], value: T): void {
  if (!list.includes(value)) list.push(value);
}

const COPY: Record<NextWeekAdjustment, Pick<NextWeekRecommendation, "headline" | "body" | "suggestedNextWeekPriority">> = {
  lighter: {
    headline: "Tuần sau nên nhẹ hơn",
    body: "Tuần này có vài chỗ chưa trơn. Nhẹ tải tuần sau giúp bạn giữ nhịp dài hạn — không phải lùi mục tiêu, chỉ là bước nhỏ hơn.",
    suggestedNextWeekPriority: "Chọn 1-2 việc cốt lõi, bỏ qua phần tùy chọn. Ưu tiên giữ nhịp hơn là làm nhiều.",
  },
  same: {
    headline: "Tuần sau giữ nguyên nhịp",
    body: "Bạn đang chạy ổn. Lặp lại nhịp tuần này, ưu tiên rõ một việc trọng tâm là đủ.",
    suggestedNextWeekPriority: "Giữ nguyên 1 ưu tiên cốt lõi giống tuần này, làm rõ kết quả mong đợi.",
  },
  push: {
    headline: "Tuần sau có thể đẩy thêm",
    body: "Bạn đang có nhịp tốt và chỉ số hỗ trợ. Có thể tăng nhẹ một việc cốt lõi nếu năng lượng còn.",
    suggestedNextWeekPriority: "Thêm 1 việc cốt lõi mới hoặc đẩy mục tiêu tuần lên cao hơn 10-20%.",
  },
  reset: {
    headline: "Tuần sau cần restart nhẹ",
    body: "Tuần này lệch nhịp khá rõ. Tuần sau hãy chốt 1 việc duy nhất, làm xong là đã quay lại đúng hướng — không cần dồn việc cũ.",
    suggestedNextWeekPriority: "Chốt đúng 1 việc cốt lõi cho cả tuần. Mục tiêu là khởi động lại, không phải bù task cũ.",
  },
  reduce_scope: {
    headline: "Tuần sau nên thu hẹp scope",
    body: "Bạn đang chạy nhiều task nhưng kim mục tiêu chưa di chuyển nhiều. Tuần sau giảm số lượng và tập trung vào việc thực sự đẩy chỉ số chính.",
    suggestedNextWeekPriority: "Giữ 2-3 việc gắn trực tiếp với chỉ số chính. Cắt việc tốt-nhưng-không-cần.",
  },
};

// ---- Decision pipeline ------------------------------------------------------

interface DecisionFrame {
  recommendation: NextWeekAdjustment;
  reasonCodes: NextWeekReasonCode[];
  /** Number of independent signals supporting the recommendation. */
  supportingSignals: number;
  /** Whether the user explicitly chose this direction (high-confidence override). */
  userExplicit: boolean;
}

function decideRecommendation(input: {
  weekCompletionPercent: number;
  leadMetric: number | null;
  consistency: number | null;
  workloadDecision: WorkloadDecisionInput | undefined;
  feasibility: FeasibilityPlanLoadInput | null | undefined;
  rescueSeverity: RescueSeverity | null | undefined;
  rescueTriggers: ReadonlyArray<RescueTriggerId>;
}): DecisionFrame {
  const reasonCodes: NextWeekReasonCode[] = [];
  let supportingSignals = 0;
  let userExplicit = false;

  // ---- 1. Hard overrides (highest priority) -----------------------------------
  if (input.rescueSeverity === "urgent") {
    reasonCodes.push("rescue_urgent");
    return {
      recommendation: "reset",
      reasonCodes,
      supportingSignals: 2, // urgent rescue is a strong dual signal
      userExplicit: false,
    };
  }

  if (input.workloadDecision === "reduce slightly") {
    reasonCodes.push("user_says_too_much");
    userExplicit = true;
    supportingSignals += 1;
    if (input.weekCompletionPercent < LOW_COMPLETION) {
      reasonCodes.push("low_week_completion");
      supportingSignals += 1;
    }
    return { recommendation: "lighter", reasonCodes, supportingSignals, userExplicit };
  }

  if (input.workloadDecision === "increase slightly") {
    reasonCodes.push("user_says_too_easy");
    userExplicit = true;
    supportingSignals += 1;
    if (input.weekCompletionPercent >= HIGH_COMPLETION) {
      reasonCodes.push("high_week_completion");
      supportingSignals += 1;
    }
    return { recommendation: "push", reasonCodes, supportingSignals, userExplicit };
  }

  // ---- 2. Recovery / reset triggers ------------------------------------------
  const rescueTriggersSet = new Set(input.rescueTriggers);
  const hasNoCompletionStreak = rescueTriggersSet.has("no-completion-streak");
  const hasWeeklyReviewMissed = rescueTriggersSet.has("weekly-review-missed");

  if (input.weekCompletionPercent < VERY_LOW_COMPLETION) {
    reasonCodes.push("very_low_week_completion");
    supportingSignals += 1;
    if (hasNoCompletionStreak) {
      reasonCodes.push("no_completion_streak");
      supportingSignals += 1;
    }
    if (hasWeeklyReviewMissed) {
      reasonCodes.push("weekly_review_missed");
      supportingSignals += 1;
    }
    if (input.consistency !== null && input.consistency < LOW_CHECKIN_CONSISTENCY) {
      reasonCodes.push("inconsistent_check_ins");
      supportingSignals += 1;
    }
    return { recommendation: "reset", reasonCodes, supportingSignals, userExplicit };
  }

  // ---- 3. reduce_scope: high task throughput but low needle-movement --------
  if (
    input.weekCompletionPercent >= HIGH_LEAD_METRIC &&
    input.leadMetric !== null &&
    input.leadMetric <= LOW_LEAD_METRIC
  ) {
    reasonCodes.push("high_week_completion");
    reasonCodes.push("low_lead_metric_completion");
    supportingSignals += 2;
    return { recommendation: "reduce_scope", reasonCodes, supportingSignals, userExplicit };
  }

  // ---- 4. Lighter when completion is below threshold ------------------------
  if (input.weekCompletionPercent < LOW_COMPLETION) {
    reasonCodes.push("low_week_completion");
    supportingSignals += 1;
    if (input.rescueSeverity === "active") {
      reasonCodes.push("rescue_active");
      supportingSignals += 1;
    }
    if (input.feasibility === "lighter") {
      reasonCodes.push("feasibility_lighter");
      supportingSignals += 1;
    }
    if (input.consistency !== null && input.consistency < LOW_CHECKIN_CONSISTENCY) {
      reasonCodes.push("inconsistent_check_ins");
      supportingSignals += 1;
    }
    return { recommendation: "lighter", reasonCodes, supportingSignals, userExplicit };
  }

  // ---- 5. Push when everything is strong ------------------------------------
  const completionStrong = input.weekCompletionPercent >= HIGH_COMPLETION;
  const leadMetricStrong = input.leadMetric === null ? false : input.leadMetric >= HIGH_LEAD_METRIC;
  const consistencyStrong =
    input.consistency === null ? false : input.consistency >= HIGH_CHECKIN_CONSISTENCY;

  if (completionStrong && leadMetricStrong && consistencyStrong) {
    reasonCodes.push("high_week_completion");
    reasonCodes.push("high_lead_metric_completion");
    reasonCodes.push("consistent_check_ins");
    supportingSignals += 3;
    if (input.feasibility === "push") {
      reasonCodes.push("feasibility_push");
      supportingSignals += 1;
    }
    return { recommendation: "push", reasonCodes, supportingSignals, userExplicit };
  }

  // ---- 6. Default: same -----------------------------------------------------
  if (input.workloadDecision === "keep same") {
    reasonCodes.push("user_says_keep_same");
    userExplicit = true;
    supportingSignals += 1;
  }
  if (completionStrong) {
    reasonCodes.push("high_week_completion");
    supportingSignals += 1;
  } else if (input.weekCompletionPercent >= LOW_COMPLETION) {
    // Solid mid-band — implicit support for "same".
    supportingSignals += 1;
  }
  if (reasonCodes.length === 0 && !completionStrong) {
    reasonCodes.push("no_signals");
  }

  return { recommendation: "same", reasonCodes, supportingSignals, userExplicit };
}

function deriveConfidence(frame: DecisionFrame): NextWeekConfidence {
  if (frame.userExplicit && frame.supportingSignals >= 2) return "high";
  if (frame.supportingSignals >= 3) return "high";
  if (frame.supportingSignals >= 2) return "medium";
  if (frame.userExplicit) return "medium";
  if (frame.reasonCodes.includes("no_signals")) return "low";
  return frame.supportingSignals === 0 ? "low" : "medium";
}

// ---- Public entry -----------------------------------------------------------

export function getNextWeekAdjustmentRecommendation(
  context: NextWeekRecommendationContext,
): NextWeekRecommendation {
  const weekCompletionPercent = clampPercent(context.weekCompletionPercent) ?? 0;
  const leadMetric = clampPercent(context.leadMetricCompletionPercent ?? null);
  const consistency = clampPercent(context.dailyCheckInConsistencyPercent ?? null);

  const frame = decideRecommendation({
    weekCompletionPercent,
    leadMetric,
    consistency,
    workloadDecision: context.workloadDecision,
    feasibility: context.feasibilityPlanLoad ?? null,
    rescueSeverity: context.rescueSeverity ?? null,
    rescueTriggers: context.rescueTriggers ?? [],
  });

  const copy = COPY[frame.recommendation];
  return {
    recommendation: frame.recommendation,
    confidence: deriveConfidence(frame),
    reasonCodes: frame.reasonCodes,
    headline: copy.headline,
    body: copy.body,
    suggestedNextWeekPriority: copy.suggestedNextWeekPriority,
  };
}
