import type { BuildSmartGoalInput } from "@/lib/smart-goal";
import type {
  GoalClarityLevel,
  CalibratedDifficulty,
} from "@/lib/smart-goal/quality";
import type {
  PlanQualityLevel,
  WeekOneLoadLevel,
  PlanLoadPreference,
  WeeklyCapacityBand,
} from "@/features/plan12week/logic/planQuality";

/**
 * Calibration cases for SMART quality + plan quality rubrics.
 *
 * Each case names a real-world archetype that the rubrics must NOT confuse:
 * - clear vs vague goals
 * - clear goals with overambitious metrics (qualitative/non-linear)
 * - low-capacity sustainable plans vs overloaded plans
 *
 * No real tester data informed these cases. They are evidence-grounded in
 * the known-limitations corpus from `coreFunnelScenarios.ts`. When real
 * tester sessions populate `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md`, additional
 * cases should be added here, not in `coreFunnelScenarios.ts`.
 */

export type CalibrationCaseId =
  | "weak-but-enthusiastic"
  | "strong-but-overambitious"
  | "clear-with-low-capacity"
  | "vague-with-high-motivation"
  | "good-plan-overloaded-week-one"
  | "realistic-boring-effective";

export interface CalibrationCase {
  id: CalibrationCaseId;
  label: string;
  archetype: string;
  smartInput: BuildSmartGoalInput;
  expectedClarityLevel: GoalClarityLevel;
  expectedClarityMissingIncludes?: string[];
  expectedCalibratedDifficulty: CalibratedDifficulty;
  expectedSuggestionMustInclude?: string[];
  planSnapshot?: {
    weekOneTaskCount: number;
    planLoad: PlanLoadPreference;
    weeklyCapacity: WeeklyCapacityBand;
    leadIndicatorCount: number;
    hasLagMetric: boolean;
    hasMidCycleMilestones: boolean;
    expectedLevel: PlanQualityLevel;
    expectedWeekOneLevel: WeekOneLoadLevel;
    expectedWarningsCountAtLeast: number;
  };
}

export const CALIBRATION_CASES: CalibrationCase[] = [
  {
    id: "weak-but-enthusiastic",
    label: "Weak but enthusiastic — outcome verb missing, motivation strong",
    archetype:
      "Người mới có năng lượng cao nhưng câu mục tiêu chưa có động từ kết quả rõ. Rubric không được tin vào sự nhiệt tình mà bỏ qua thiếu sót cấu trúc.",
    smartInput: {
      focusArea: "career",
      // Intentionally missing outcome verb (no đạt/hoàn thành/ra mắt/duy trì...).
      specificGoalStatement: "Tôi muốn giỏi hơn trong việc quản lý đội nhóm.",
      measurableMetricName: "Buoi 1-1",
      measurableTargetValue: 8,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 4,
      achievableRequiredSkills: ["Phản hồi xây dựng"],
      achievableSupportResources: ["Mentor cấp Senior"],
      relevantMotivationReason:
        "Đội nhóm đang mất nhịp giao tiếp, mình muốn cải thiện điều đó trước khi mất người.",
      timeBoundTargetWeeks: 12,
    },
    expectedClarityLevel: "moderate",
    expectedClarityMissingIncludes: ["outcome_verb"],
    expectedCalibratedDifficulty: "medium",
    expectedSuggestionMustInclude: ["động từ kết quả"],
  },
  {
    id: "strong-but-overambitious",
    label: "Strong on form, qualitative metric — IELTS-shaped",
    archetype:
      "Câu rõ, có deadline, motivation rõ, mọi dimension SMART đều đạt. Nhưng metric là band IELTS — delta/hours không phản ánh độ khó. Calibrated difficulty phải trả về 'qualitative', không phải 'easy'.",
    smartInput: {
      focusArea: "learning",
      specificGoalStatement: "Đạt IELTS overall band 7.0 sau 12 tuần ôn luyện.",
      measurableMetricName: "IELTS overall band",
      measurableTargetValue: 7,
      measurableBaselineValue: 5.5,
      achievableWeeklyTimeCommitmentHours: 15,
      achievableRequiredSkills: ["Writing task 2", "Speaking part 3"],
      achievableSupportResources: ["Cambridge IELTS book", "Speaking partner"],
      relevantMotivationReason: "Du học master vào năm 2027 nên cần band 7.0 trước hồ sơ.",
      timeBoundTargetWeeks: 12,
    },
    expectedClarityLevel: "strong",
    expectedCalibratedDifficulty: "qualitative",
    expectedSuggestionMustInclude: ["định tính"],
  },
  {
    id: "clear-with-low-capacity",
    label: "Clear goal, low weekly capacity — sustainable lighter plan",
    archetype:
      "Mục tiêu rõ ràng nhưng người này chỉ có 2h/tuần. Plan rubric phải xem 2 task/tuần là 'appropriate' (lighter+low), không cảnh báo dưới mức.",
    smartInput: {
      focusArea: "finance",
      specificGoalStatement: "Hoàn thành 4 milestone tiết kiệm trong 12 tuần.",
      measurableMetricName: "Milestone tiet kiem",
      measurableTargetValue: 4,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 2,
      achievableRequiredSkills: ["Lập ngân sách"],
      achievableSupportResources: ["YNAB"],
      relevantMotivationReason: "Xây quỹ khẩn cấp 6 tháng chi tiêu.",
      timeBoundTargetWeeks: 12,
    },
    expectedClarityLevel: "strong",
    expectedCalibratedDifficulty: "medium",
    planSnapshot: {
      weekOneTaskCount: 2,
      planLoad: "lighter",
      weeklyCapacity: "low",
      leadIndicatorCount: 2,
      hasLagMetric: true,
      hasMidCycleMilestones: false,
      expectedLevel: "moderate",
      expectedWeekOneLevel: "appropriate",
      expectedWarningsCountAtLeast: 0,
    },
  },
  {
    id: "vague-with-high-motivation",
    label: "Vague goal, high motivation — rubric must not over-score",
    archetype:
      "Câu mục tiêu mơ hồ, không có metric rõ, không có deadline. Motivation rất mạnh. Rubric phải báo 'weak'.",
    smartInput: {
      focusArea: "life",
      specificGoalStatement: "Tôi muốn tốt hơn trong công việc.",
      measurableMetricName: "",
      // Target = baseline + 1 fallback to keep buildSmartGoal valid; clarity check still fails on metric_name.
      measurableTargetValue: 1,
      achievableWeeklyTimeCommitmentHours: 5,
      achievableRequiredSkills: [],
      achievableSupportResources: [],
      relevantMotivationReason:
        "Tôi đã chán cảm giác giậm chân tại chỗ và muốn tạo ra thay đổi rõ ràng cho đời mình.",
      // No timeBoundTargetWeeks, no timeBoundTargetDate.
    },
    expectedClarityLevel: "weak",
    expectedClarityMissingIncludes: ["outcome_verb", "measurable_target", "time_bound"],
    expectedCalibratedDifficulty: "unknown",
    expectedSuggestionMustInclude: ["động từ kết quả", "deadline"],
  },
  {
    id: "good-plan-overloaded-week-one",
    label: "Good goal, plan overloaded at week 1 — must warn proportionally",
    archetype:
      "Câu mục tiêu rõ, plan có lag metric và milestones. Nhưng tuần 1 nhồi 7 task ở balanced/medium — vượt hard cap. Rubric phải báo overloaded chứ không phải 'upper_limit'.",
    smartInput: {
      focusArea: "career",
      specificGoalStatement: "Hoàn thành 12 deliverable thuộc IDP trước review Q3.",
      measurableMetricName: "Deliverable IDP",
      measurableTargetValue: 12,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 10,
      achievableRequiredSkills: ["System design"],
      achievableSupportResources: ["Mentor cấp Senior"],
      relevantMotivationReason: "Chuẩn bị cho promotion trong vòng 6 tháng.",
      timeBoundTargetWeeks: 12,
    },
    expectedClarityLevel: "strong",
    expectedCalibratedDifficulty: "medium",
    planSnapshot: {
      weekOneTaskCount: 7,
      planLoad: "balanced",
      weeklyCapacity: "medium",
      leadIndicatorCount: 4,
      hasLagMetric: true,
      hasMidCycleMilestones: true,
      expectedLevel: "weak",
      expectedWeekOneLevel: "overloaded",
      expectedWarningsCountAtLeast: 1,
    },
  },
  {
    id: "realistic-boring-effective",
    label: "Realistic, boring, effective — must score strong without novelty bias",
    archetype:
      "Mục tiêu rõ, plan đầy đủ, tuần 1 có 4 task ở balanced/medium. Nội dung không 'cool' — chỉ là việc lặp lại đều. Rubric không được trừ điểm vì 'thiếu sáng tạo'.",
    smartInput: {
      focusArea: "health",
      specificGoalStatement: "Đạt mốc chạy 5K liên tục dưới 30 phút trong 12 tuần.",
      measurableMetricName: "Khoang cach chay duoc",
      measurableMetricUnit: "km",
      measurableTargetValue: 5,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 5,
      achievableRequiredSkills: ["Kỹ thuật chạy nền"],
      achievableSupportResources: ["Đồng hồ Garmin", "Lịch tập 5K"],
      relevantMotivationReason: "Cải thiện sức khỏe và năng lượng cho công việc.",
      timeBoundTargetWeeks: 12,
    },
    expectedClarityLevel: "strong",
    expectedCalibratedDifficulty: "medium",
    planSnapshot: {
      weekOneTaskCount: 4,
      planLoad: "balanced",
      weeklyCapacity: "medium",
      leadIndicatorCount: 3,
      hasLagMetric: true,
      hasMidCycleMilestones: true,
      expectedLevel: "strong",
      expectedWeekOneLevel: "appropriate",
      expectedWarningsCountAtLeast: 0,
    },
  },
];
