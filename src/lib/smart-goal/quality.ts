import type { SmartGoal } from "./types";
import { estimateGoalDifficulty, hasOutcomeIndicator } from "./helpers";

/**
 * SMART goal quality calibration.
 *
 * Calibration is grounded in the known-limitations corpus surfaced by
 * `src/test/fixtures/coreFunnelScenarios.ts`, not on real tester sessions
 * (none recorded yet). The two specific mismatches addressed:
 *
 *  1. `estimateGoalDifficulty` returns "easy" for goals with non-linear
 *     metrics (e.g. IELTS band 5.5 -> 7.0 over 12 weeks at 15h/week:
 *     delta/hours = 0.1 -> "easy"), even though feasibility correctly
 *     flags the goal as `too_ambitious`. Calibrated difficulty suppresses
 *     the easy/medium/hard label when the metric is qualitative.
 *  2. `hasOutcomeIndicator` is the only outcome-verb check in helpers.ts
 *     and is used in isolation by the UI. Calibrated clarity bundles it
 *     with measurable / achievable / relevant / time-bound checks so a
 *     goal cannot score "strong" on outcome verb alone.
 */

export type GoalClarityLevel = "weak" | "moderate" | "strong";

export interface GoalClarityCheck {
  id: GoalClarityDimensionId;
  label: string;
  passed: boolean;
}

export type GoalClarityDimensionId =
  | "outcome_verb"
  | "measurable_target"
  | "achievable_weekly_hours"
  | "relevant_motivation"
  | "time_bound";

export interface GoalClarityAssessment {
  level: GoalClarityLevel;
  score: number;
  passed: GoalClarityDimensionId[];
  missing: GoalClarityDimensionId[];
  checks: GoalClarityCheck[];
}

export type CalibratedDifficulty = "easy" | "medium" | "hard" | "qualitative" | "unknown";

const MIN_WEEKLY_HOURS = 1;
const MAX_WEEKLY_HOURS = 60;

const STRONG_THRESHOLD = 0.8;
const MODERATE_THRESHOLD = 0.6;

const QUALITATIVE_METRIC_KEYWORDS = [
  // English
  "band",
  "level",
  "score",
  "grade",
  "rank",
  "tier",
  "percentile",
  // Vietnamese
  "điểm",
  "diem",
  "hạng",
  "hang",
  "mức",
  "muc",
  "cấp",
  "cap",
];

function normalizeLower(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isQualitativeMetric(goal: SmartGoal): boolean {
  const unit = normalizeLower(goal.measurable.metric_unit);
  const name = normalizeLower(goal.measurable.metric_name);

  if (!unit && !name) return false;

  for (const keyword of QUALITATIVE_METRIC_KEYWORDS) {
    if (unit.includes(keyword) || name.includes(keyword)) return true;
  }
  return false;
}

export function getCalibratedDifficulty(goal: SmartGoal): CalibratedDifficulty {
  if (isQualitativeMetric(goal)) return "qualitative";

  const target = goal.measurable.target_value;
  const baseline = goal.measurable.baseline_value ?? 0;
  const hours = goal.achievable.weekly_time_commitment_hours;
  const metricName = goal.measurable.metric_name.trim();

  if (!Number.isFinite(target) || !Number.isFinite(hours) || hours <= 0) return "unknown";
  if (target <= 0 || target <= baseline) return "unknown";
  if (metricName.length === 0) return "unknown";

  return estimateGoalDifficulty(goal);
}

function checkOutcomeVerb(goal: SmartGoal): boolean {
  return hasOutcomeIndicator(goal.specific.goal_statement);
}

function checkMeasurableTarget(goal: SmartGoal): boolean {
  const target = goal.measurable.target_value;
  if (!Number.isFinite(target) || target <= 0) return false;

  const baseline = goal.measurable.baseline_value;
  if (baseline !== undefined && target <= baseline) return false;

  return goal.measurable.metric_name.trim().length > 0;
}

function checkAchievableWeeklyHours(goal: SmartGoal): boolean {
  const hours = goal.achievable.weekly_time_commitment_hours;
  return Number.isFinite(hours) && hours >= MIN_WEEKLY_HOURS && hours <= MAX_WEEKLY_HOURS;
}

function checkRelevantMotivation(goal: SmartGoal): boolean {
  return goal.relevant.motivation_reason.trim().length >= 10;
}

function checkTimeBound(goal: SmartGoal): boolean {
  const weeks = goal.time_bound.target_weeks;
  if (typeof weeks === "number" && Number.isFinite(weeks) && weeks > 0) return true;

  const date = goal.time_bound.target_date;
  return typeof date === "string" && date.trim().length > 0;
}

const CHECK_LABELS: Record<GoalClarityDimensionId, string> = {
  outcome_verb: "Câu mục tiêu có động từ kết quả rõ (đạt, hoàn thành, ra mắt, duy trì...)",
  measurable_target: "Có chỉ số đo và con số mục tiêu lớn hơn baseline",
  achievable_weekly_hours: "Quỹ thời gian mỗi tuần hợp lý (1-60 giờ)",
  relevant_motivation: "Lý do quan trọng đủ rõ (ít nhất một câu)",
  time_bound: "Có deadline (số tuần hoặc ngày cụ thể)",
};

export function assessGoalClarity(goal: SmartGoal): GoalClarityAssessment {
  const checks: GoalClarityCheck[] = [
    { id: "outcome_verb", label: CHECK_LABELS.outcome_verb, passed: checkOutcomeVerb(goal) },
    { id: "measurable_target", label: CHECK_LABELS.measurable_target, passed: checkMeasurableTarget(goal) },
    {
      id: "achievable_weekly_hours",
      label: CHECK_LABELS.achievable_weekly_hours,
      passed: checkAchievableWeeklyHours(goal),
    },
    { id: "relevant_motivation", label: CHECK_LABELS.relevant_motivation, passed: checkRelevantMotivation(goal) },
    { id: "time_bound", label: CHECK_LABELS.time_bound, passed: checkTimeBound(goal) },
  ];

  const passed = checks.filter((check) => check.passed).map((check) => check.id);
  const missing = checks.filter((check) => !check.passed).map((check) => check.id);
  const score = checks.length === 0 ? 0 : passed.length / checks.length;

  let level: GoalClarityLevel;
  if (score >= STRONG_THRESHOLD) level = "strong";
  else if (score >= MODERATE_THRESHOLD) level = "moderate";
  else level = "weak";

  // Calibration guardrail: outcome verb is the spine of SMART specific.
  // Without it, the goal cannot reach "strong" no matter how many other
  // dimensions pass. Surfaced by `weak-but-enthusiastic` calibration case.
  const outcomeVerbCheck = checks.find((check) => check.id === "outcome_verb");
  if (outcomeVerbCheck && !outcomeVerbCheck.passed && level === "strong") {
    level = "moderate";
  }

  return { level, score, passed, missing, checks };
}

const SUGGESTION_BY_DIMENSION: Record<GoalClarityDimensionId, string> = {
  outcome_verb:
    "Thêm động từ kết quả rõ vào câu mục tiêu (ví dụ: đạt, hoàn thành, ra mắt, duy trì, chạm mốc).",
  measurable_target:
    "Thêm chỉ số đo và một con số mục tiêu rõ ràng. Nếu có baseline, target phải lớn hơn baseline.",
  achievable_weekly_hours:
    "Đặt quỹ thời gian mỗi tuần trong khoảng 1-60 giờ. Quá ít sẽ không tạo nhịp; quá nhiều khó duy trì.",
  relevant_motivation:
    "Viết một câu ngắn vì sao mục tiêu này quan trọng với bạn ở thời điểm hiện tại.",
  time_bound: "Chốt deadline: hoặc số tuần (ví dụ 12) hoặc ngày cụ thể.",
};

export function generateGoalClaritySuggestions(goal: SmartGoal): string[] {
  const assessment = assessGoalClarity(goal);
  const suggestions = assessment.missing.map((id) => SUGGESTION_BY_DIMENSION[id]);

  if (assessment.level === "strong" && isQualitativeMetric(goal)) {
    suggestions.push(
      "Chỉ số có vẻ định tính (band, level, hạng...). Đừng tin nhãn easy/medium/hard cho mục tiêu này — hãy dùng kết quả Feasibility để đánh giá độ tham vọng.",
    );
  }

  return suggestions;
}
