import type { SmartGoal } from "./types";
import { estimateGoalDifficulty, hasOutcomeIndicator } from "./helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QualityLevel = "weak" | "okay" | "strong";

export interface DimensionScore {
  dimension: QualityDimension;
  score: number;
  maxScore: number;
  label: string;
}

export type QualityDimension =
  | "specificity"
  | "measurableClarity"
  | "baselineTargetQuality"
  | "achievableRealism"
  | "resourceSupportClarity"
  | "relevanceMotivation"
  | "timeBoundClarity"
  | "twelveWeekCompatibility";

export interface SmartGoalQualityResult {
  overallScore: number;
  level: QualityLevel;
  dimensions: DimensionScore[];
  warnings: string[];
  suggestions: string[];
  canProceedToFeasibility: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_STATEMENT_LENGTH = 20;
const MIN_FEASIBILITY_STATEMENT_LENGTH = 10;
const MIN_MOTIVATION_LENGTH = 15;
const GOOD_STATEMENT_WORD_COUNT = 8;
const GOOD_MOTIVATION_WORD_COUNT = 6;
const MAX_REALISTIC_WEEKLY_HOURS = 40;
const HIGH_WEEKLY_HOURS_THRESHOLD = 25;
const TWELVE_WEEK_MIN = 4;
const TWELVE_WEEK_MAX = 24;
const TWELVE_WEEK_SWEET_SPOT_MIN = 8;
const TWELVE_WEEK_SWEET_SPOT_MAX = 16;

const DIMENSION_LABELS: Record<QualityDimension, string> = {
  specificity: "Mức cụ thể của mục tiêu",
  measurableClarity: "Rõ ràng chỉ số đo",
  baselineTargetQuality: "Chất lượng mốc đầu - mốc đích",
  achievableRealism: "Tính thực tế về thời gian",
  resourceSupportClarity: "Rõ ràng nguồn lực và hỗ trợ",
  relevanceMotivation: "Sức mạnh lý do theo đuổi",
  timeBoundClarity: "Rõ ràng mốc thời gian",
  twelveWeekCompatibility: "Tương thích chu kỳ 12 tuần",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeDimension(dimension: QualityDimension, score: number, maxScore: number): DimensionScore {
  return {
    dimension,
    score: clamp(Math.round(score), 0, maxScore),
    maxScore,
    label: DIMENSION_LABELS[dimension],
  };
}

// ---------------------------------------------------------------------------
// Dimension scorers (each returns raw score + optional warnings/suggestions)
// ---------------------------------------------------------------------------

interface DimensionEval {
  score: number;
  warnings: string[];
  suggestions: string[];
}

function evaluateSpecificity(goal: SmartGoal): DimensionEval {
  const MAX = 15;
  const statement = goal.specific.goal_statement.trim();
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (statement.length === 0) {
    warnings.push("Chưa có câu mục tiêu.");
    suggestions.push("Viết một câu mô tả kết quả cụ thể bạn muốn đạt được.");
    return { score: 0, warnings, suggestions };
  }

  // Length gate
  if (statement.length >= MIN_STATEMENT_LENGTH) {
    score += 5;
  } else {
    warnings.push("Câu mục tiêu quá ngắn, cần ít nhất 20 ký tự.");
    suggestions.push("Bổ sung chi tiết để câu mục tiêu đủ rõ ràng.");
  }

  // Outcome indicator
  if (hasOutcomeIndicator(statement)) {
    score += 5;
  } else {
    suggestions.push("Thêm động từ kết quả như đạt, hoàn thành, xây dựng, ra mắt để mục tiêu rõ hướng hơn.");
  }

  // Word richness
  const wordCount = countWords(statement);
  if (wordCount >= GOOD_STATEMENT_WORD_COUNT) {
    score += 5;
  } else if (wordCount >= 4) {
    score += 3;
  } else {
    suggestions.push("Viết thêm chi tiết để mục tiêu đủ cụ thể cho người khác cũng hiểu.");
  }

  return { score: clamp(score, 0, MAX), warnings, suggestions };
}

function evaluateMeasurableClarity(goal: SmartGoal): DimensionEval {
  const MAX = 15;
  const metricName = goal.measurable.metric_name.trim();
  const targetValue = goal.measurable.target_value;
  const metricUnit = goal.measurable.metric_unit?.trim();
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!metricName) {
    warnings.push("Chưa có chỉ số đo lường.");
    suggestions.push("Chọn một con số hoặc dấu hiệu để theo dõi tiến độ.");
    return { score: 0, warnings, suggestions };
  }

  // Has metric name
  score += 5;

  // Has valid target
  if (Number.isFinite(targetValue) && targetValue > 0) {
    score += 5;
  } else {
    warnings.push("Mốc mục tiêu chưa hợp lệ hoặc bằng 0.");
    suggestions.push("Nhập mốc đích cụ thể để biết khi nào đạt mục tiêu.");
  }

  // Has unit
  if (metricUnit && metricUnit.length > 0) {
    score += 5;
  } else {
    suggestions.push("Thêm đơn vị đo (ví dụ: điểm, lần, giờ, bài) giúp chỉ số rõ ràng hơn.");
  }

  return { score: clamp(score, 0, MAX), warnings, suggestions };
}

function evaluateBaselineTargetQuality(goal: SmartGoal): DimensionEval {
  const MAX = 10;
  const baseline = goal.measurable.baseline_value;
  const target = goal.measurable.target_value;
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!Number.isFinite(target) || target <= 0) {
    return { score: 0, warnings, suggestions };
  }

  // Has target
  score += 3;

  // Has baseline
  if (baseline !== undefined && Number.isFinite(baseline)) {
    score += 4;

    // Target > baseline
    if (target > baseline) {
      score += 3;
    } else {
      warnings.push("Mốc đích phải lớn hơn mốc hiện tại.");
    }
  } else {
    suggestions.push("Thêm mốc hiện tại để hệ thống đánh giá khoảng cách cần vượt qua.");
  }

  return { score: clamp(score, 0, MAX), warnings, suggestions };
}

function evaluateAchievableRealism(goal: SmartGoal): DimensionEval {
  const MAX = 15;
  const weeklyHours = goal.achievable.weekly_time_commitment_hours;
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0) {
    warnings.push("Chưa có thời gian cam kết mỗi tuần.");
    suggestions.push("Nhập số giờ mỗi tuần bạn thực sự có thể dành cho mục tiêu.");
    return { score: 0, warnings, suggestions };
  }

  // Has commitment
  score += 5;

  // Realistic range
  if (weeklyHours <= HIGH_WEEKLY_HOURS_THRESHOLD) {
    score += 5;
  } else if (weeklyHours <= MAX_REALISTIC_WEEKLY_HOURS) {
    score += 3;
    suggestions.push(`${weeklyHours} giờ/tuần là khá cao. Cân nhắc bắt đầu với mức thấp hơn để dễ giữ nhịp.`);
  } else {
    score += 1;
    warnings.push(`${weeklyHours} giờ/tuần vượt mức khuyến nghị (tối đa 40 giờ). Nguy cơ kiệt sức cao.`);
  }

  // Ratio check: if target and baseline exist, check if commitment seems proportional
  const baseline = goal.measurable.baseline_value ?? 0;
  const target = goal.measurable.target_value;
  const delta = target - baseline;
  const targetWeeks = goal.time_bound.target_weeks;

  if (
    Number.isFinite(delta) &&
    delta > 0 &&
    targetWeeks !== undefined &&
    Number.isFinite(targetWeeks) &&
    targetWeeks > 0
  ) {
    const totalHours = weeklyHours * targetWeeks;
    // Very rough: if total hours seems reasonable (> delta / 2), it's fine
    if (totalHours >= 4) {
      score += 5;
    } else {
      score += 2;
      suggestions.push("Tổng thời gian cam kết có vẻ thấp so với mốc đích. Xem lại kế hoạch.");
    }
  } else {
    // Can't evaluate ratio, give partial credit
    score += 3;
  }

  return { score: clamp(score, 0, MAX), warnings, suggestions };
}

function evaluateResourceSupportClarity(goal: SmartGoal): DimensionEval {
  const MAX = 10;
  const skills = goal.achievable.required_skills.filter((s) => s.trim().length > 0);
  const resources = goal.achievable.support_resources.filter((s) => s.trim().length > 0);
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (skills.length > 0) {
    score += 5;
  } else {
    suggestions.push("Liệt kê ít nhất 1 kỹ năng cần có để hệ thống đánh giá tính khả thi.");
  }

  if (resources.length > 0) {
    score += 5;
  } else {
    suggestions.push("Thêm ít nhất 1 nguồn hỗ trợ (mentor, khóa học, tài liệu) giúp mục tiêu rõ hơn.");
  }

  return { score: clamp(score, 0, MAX), warnings, suggestions };
}

function evaluateRelevanceMotivation(goal: SmartGoal): DimensionEval {
  const MAX = 15;
  const motivation = goal.relevant.motivation_reason.trim();
  const alignment = goal.relevant.life_dimension_alignment?.trim();
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (motivation.length === 0) {
    warnings.push("Chưa có lý do theo đuổi mục tiêu.");
    suggestions.push("Viết lý do vì sao mục tiêu này quan trọng với bạn.");
    return { score: 0, warnings, suggestions };
  }

  // Length gate
  if (motivation.length >= MIN_MOTIVATION_LENGTH) {
    score += 5;
  } else {
    suggestions.push("Viết thêm chi tiết để lý do đủ mạnh giữ bạn theo đuổi khi khó.");
  }

  // Word richness
  const wordCount = countWords(motivation);
  if (wordCount >= GOOD_MOTIVATION_WORD_COUNT) {
    score += 5;
  } else if (wordCount >= 3) {
    score += 3;
  } else {
    suggestions.push("Lý do nên dài hơn và giải thích cụ thể vì sao điều này quan trọng.");
  }

  // Life dimension alignment bonus
  if (alignment && alignment.length > 0) {
    score += 5;
  } else {
    suggestions.push("Gắn mục tiêu với một lĩnh vực cuộc sống (sự nghiệp, sức khỏe...) để tăng sự cam kết.");
  }

  return { score: clamp(score, 0, MAX), warnings, suggestions };
}

function evaluateTimeBoundClarity(goal: SmartGoal): DimensionEval {
  const MAX = 10;
  const targetDate = goal.time_bound.target_date?.trim();
  const targetWeeks = goal.time_bound.target_weeks;
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const hasDate = targetDate !== undefined && targetDate.length > 0;
  const hasWeeks = targetWeeks !== undefined && Number.isFinite(targetWeeks) && targetWeeks > 0;

  if (!hasDate && !hasWeeks) {
    warnings.push("Chưa có mốc thời gian.");
    suggestions.push("Chọn số tuần hoặc ngày đích để tạo nhịp cho kế hoạch.");
    return { score: 0, warnings, suggestions };
  }

  // Has some time bound
  score += 5;

  if (hasWeeks && targetWeeks !== undefined) {
    if (targetWeeks >= TWELVE_WEEK_MIN && targetWeeks <= TWELVE_WEEK_MAX) {
      score += 5;
    } else if (targetWeeks > TWELVE_WEEK_MAX) {
      score += 2;
      suggestions.push(`${targetWeeks} tuần khá dài. Cân nhắc chia thành các chu kỳ 12 tuần nhỏ hơn.`);
    } else {
      score += 3;
      suggestions.push(`${targetWeeks} tuần có thể quá ngắn. Kiểm tra lại mốc đích có thực tế không.`);
    }
  } else if (hasDate) {
    // Date mode: give full credit since we can't easily validate without current date context
    score += 5;
  }

  return { score: clamp(score, 0, MAX), warnings, suggestions };
}

function evaluateTwelveWeekCompatibility(goal: SmartGoal): DimensionEval {
  const MAX = 10;
  const targetWeeks = goal.time_bound.target_weeks;
  const weeklyHours = goal.achievable.weekly_time_commitment_hours;
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const hasWeeks = targetWeeks !== undefined && Number.isFinite(targetWeeks) && targetWeeks > 0;

  if (!hasWeeks) {
    // If using date mode, give partial credit
    if (goal.time_bound.target_date?.trim()) {
      score += 4;
      suggestions.push("Dùng số tuần thay vì ngày cụ thể sẽ tương thích tốt hơn với hệ thống 12 tuần.");
    } else {
      suggestions.push("Cần mốc thời gian để đánh giá tương thích với chu kỳ 12 tuần.");
    }
    return { score: clamp(score, 0, MAX), warnings, suggestions };
  }

  // Sweet spot check
  if (
    targetWeeks !== undefined &&
    targetWeeks >= TWELVE_WEEK_SWEET_SPOT_MIN &&
    targetWeeks <= TWELVE_WEEK_SWEET_SPOT_MAX
  ) {
    score += 6;
  } else if (targetWeeks !== undefined && targetWeeks >= TWELVE_WEEK_MIN && targetWeeks <= TWELVE_WEEK_MAX) {
    score += 4;
  } else {
    score += 1;
    suggestions.push("Chu kỳ 8-16 tuần là vùng lý tưởng cho hệ thống 12 tuần. Cân nhắc điều chỉnh.");
  }

  // Weekly commitment compatibility
  if (Number.isFinite(weeklyHours) && weeklyHours > 0 && hasWeeks && targetWeeks !== undefined) {
    const totalHours = weeklyHours * targetWeeks;
    if (totalHours >= 12 && totalHours <= 960) {
      score += 4;
    } else if (totalHours < 12) {
      score += 1;
      suggestions.push("Tổng thời gian cam kết trong chu kỳ khá thấp. Xem lại mục tiêu có đủ thách thức không.");
    } else {
      score += 2;
    }
  } else {
    score += 2;
  }

  return { score: clamp(score, 0, MAX), warnings, suggestions };
}

// ---------------------------------------------------------------------------
// Main exports
// ---------------------------------------------------------------------------

export function evaluateSmartGoalQuality(goal: SmartGoal): SmartGoalQualityResult {
  const evaluators: {
    dimension: QualityDimension;
    maxScore: number;
    evaluate: (g: SmartGoal) => DimensionEval;
  }[] = [
    { dimension: "specificity", maxScore: 15, evaluate: evaluateSpecificity },
    { dimension: "measurableClarity", maxScore: 15, evaluate: evaluateMeasurableClarity },
    { dimension: "baselineTargetQuality", maxScore: 10, evaluate: evaluateBaselineTargetQuality },
    { dimension: "achievableRealism", maxScore: 15, evaluate: evaluateAchievableRealism },
    { dimension: "resourceSupportClarity", maxScore: 10, evaluate: evaluateResourceSupportClarity },
    { dimension: "relevanceMotivation", maxScore: 15, evaluate: evaluateRelevanceMotivation },
    { dimension: "timeBoundClarity", maxScore: 10, evaluate: evaluateTimeBoundClarity },
    {
      dimension: "twelveWeekCompatibility",
      maxScore: 10,
      evaluate: evaluateTwelveWeekCompatibility,
    },
  ];

  const dimensions: DimensionScore[] = [];
  const allWarnings: string[] = [];
  const allSuggestions: string[] = [];
  let totalScore = 0;

  for (const { dimension, maxScore, evaluate } of evaluators) {
    const result = evaluate(goal);
    const clamped = clamp(Math.round(result.score), 0, maxScore);
    dimensions.push(makeDimension(dimension, clamped, maxScore));
    totalScore += clamped;
    allWarnings.push(...result.warnings);
    allSuggestions.push(...result.suggestions);
  }

  const overallScore = clamp(totalScore, 0, 100);

  const level: QualityLevel = overallScore >= 70 ? "strong" : overallScore >= 40 ? "okay" : "weak";

  // Lenient gate: user can proceed if they have a meaningful statement and a target value.
  const hasGoalStatement = goal.specific.goal_statement.trim().length >= MIN_FEASIBILITY_STATEMENT_LENGTH;
  const hasTargetValue = Number.isFinite(goal.measurable.target_value) && goal.measurable.target_value > 0;
  const canProceedToFeasibility = hasGoalStatement && hasTargetValue && overallScore >= 20;

  return {
    overallScore,
    level,
    dimensions,
    warnings: allWarnings,
    suggestions: allSuggestions,
    canProceedToFeasibility,
  };
}

export function getSmartGoalQualityScore(goal: SmartGoal): number {
  return evaluateSmartGoalQuality(goal).overallScore;
}

export function getSmartGoalQualityWarnings(goal: SmartGoal): string[] {
  return evaluateSmartGoalQuality(goal).warnings;
}

export function getSmartGoalImprovementSuggestions(goal: SmartGoal): string[] {
  return evaluateSmartGoalQuality(goal).suggestions;
}

// ---------------------------------------------------------------------------
// Calibration helpers
// ---------------------------------------------------------------------------

export type GoalClarityLevel = "weak" | "moderate" | "strong";

export type GoalClarityDimensionId =
  | "outcome_verb"
  | "measurable_target"
  | "achievable_weekly_hours"
  | "relevant_motivation"
  | "time_bound";

export interface GoalClarityCheck {
  id: GoalClarityDimensionId;
  label: string;
  passed: boolean;
}

export interface GoalClarityAssessment {
  level: GoalClarityLevel;
  score: number;
  passed: GoalClarityDimensionId[];
  missing: GoalClarityDimensionId[];
  checks: GoalClarityCheck[];
}

export type CalibratedDifficulty = "easy" | "medium" | "hard" | "qualitative" | "unknown";

const MIN_CALIBRATED_WEEKLY_HOURS = 1;
const MAX_CALIBRATED_WEEKLY_HOURS = 60;
const CLARITY_STRONG_THRESHOLD = 0.8;
const CLARITY_MODERATE_THRESHOLD = 0.6;

const QUALITATIVE_METRIC_KEYWORDS = [
  "band",
  "level",
  "score",
  "grade",
  "rank",
  "tier",
  "percentile",
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
  return QUALITATIVE_METRIC_KEYWORDS.some((keyword) => unit.includes(keyword) || name.includes(keyword));
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

function checkMeasurableTarget(goal: SmartGoal): boolean {
  const target = goal.measurable.target_value;
  if (!Number.isFinite(target) || target <= 0) return false;

  const baseline = goal.measurable.baseline_value;
  if (baseline !== undefined && target <= baseline) return false;

  return goal.measurable.metric_name.trim().length > 0;
}

function checkAchievableWeeklyHours(goal: SmartGoal): boolean {
  const hours = goal.achievable.weekly_time_commitment_hours;
  return Number.isFinite(hours) && hours >= MIN_CALIBRATED_WEEKLY_HOURS && hours <= MAX_CALIBRATED_WEEKLY_HOURS;
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

const CLARITY_CHECK_LABELS: Record<GoalClarityDimensionId, string> = {
  outcome_verb: "Câu mục tiêu có động từ kết quả rõ (đạt, hoàn thành, ra mắt, duy trì...)",
  measurable_target: "Có chỉ số đo và con số mục tiêu lớn hơn mốc hiện tại",
  achievable_weekly_hours: "Quỹ thời gian mỗi tuần hợp lý (1-60 giờ)",
  relevant_motivation: "Lý do quan trọng đủ rõ",
  time_bound: "Có deadline (số tuần hoặc ngày cụ thể)",
};

export function assessGoalClarity(goal: SmartGoal): GoalClarityAssessment {
  const checks: GoalClarityCheck[] = [
    {
      id: "outcome_verb",
      label: CLARITY_CHECK_LABELS.outcome_verb,
      passed: hasOutcomeIndicator(goal.specific.goal_statement),
    },
    { id: "measurable_target", label: CLARITY_CHECK_LABELS.measurable_target, passed: checkMeasurableTarget(goal) },
    {
      id: "achievable_weekly_hours",
      label: CLARITY_CHECK_LABELS.achievable_weekly_hours,
      passed: checkAchievableWeeklyHours(goal),
    },
    {
      id: "relevant_motivation",
      label: CLARITY_CHECK_LABELS.relevant_motivation,
      passed: checkRelevantMotivation(goal),
    },
    { id: "time_bound", label: CLARITY_CHECK_LABELS.time_bound, passed: checkTimeBound(goal) },
  ];

  const passed = checks.filter((check) => check.passed).map((check) => check.id);
  const missing = checks.filter((check) => !check.passed).map((check) => check.id);
  const score = checks.length === 0 ? 0 : passed.length / checks.length;

  let level: GoalClarityLevel;
  if (score >= CLARITY_STRONG_THRESHOLD) level = "strong";
  else if (score >= CLARITY_MODERATE_THRESHOLD) level = "moderate";
  else level = "weak";

  if (!passed.includes("outcome_verb") && level === "strong") {
    level = "moderate";
  }

  return { level, score, passed, missing, checks };
}

const SUGGESTION_BY_CLARITY_DIMENSION: Record<GoalClarityDimensionId, string> = {
  outcome_verb: "Thêm động từ kết quả rõ vào câu mục tiêu (ví dụ: đạt, hoàn thành, ra mắt, duy trì, chạm mốc).",
  measurable_target:
    "Thêm chỉ số đo và một con số mục tiêu rõ ràng. Nếu có mốc hiện tại, mốc mục tiêu phải lớn hơn mốc hiện tại.",
  achievable_weekly_hours:
    "Đặt quỹ thời gian mỗi tuần trong khoảng 1-60 giờ. Quá ít sẽ không tạo nhịp; quá nhiều khó duy trì.",
  relevant_motivation: "Viết một câu ngắn vì sao mục tiêu này quan trọng với bạn ở thời điểm hiện tại.",
  time_bound: "Chốt deadline: hoặc số tuần (ví dụ 12) hoặc ngày cụ thể.",
};

export function generateGoalClaritySuggestions(goal: SmartGoal): string[] {
  const assessment = assessGoalClarity(goal);
  const suggestions = assessment.missing.map((id) => SUGGESTION_BY_CLARITY_DIMENSION[id]);

  if (assessment.level === "strong" && isQualitativeMetric(goal)) {
    suggestions.push(
      "Chỉ số có vẻ định tính (band, level, hạng...). Đừng tin nhãn easy/medium/hard cho mục tiêu này; hãy dùng Feasibility để đánh giá độ tham vọng.",
    );
  }

  return suggestions;
}
