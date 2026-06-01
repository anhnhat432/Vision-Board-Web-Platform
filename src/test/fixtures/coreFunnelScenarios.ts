import type { LeadIndicatorDraft } from "@/app/pages/12WeekSetup/types";
import type {
  FeasibilityAxis,
  PlanLoadRecommendation,
  ResultType,
  WeeklyCapacity,
} from "@/app/pages/FeasibilityCheck/types";
import type { BuildSmartGoalInput } from "@/lib/smart-goal";

export type CoreFunnelGoalType =
  | "skill"
  | "health"
  | "finance"
  | "career"
  | "exam"
  | "project"
  | "habit"
  | "self_development";

export interface CoreFunnelExpectedSmart {
  difficulty: "easy" | "medium" | "hard";
  hasOutcomeIndicator: boolean;
}

export interface CoreFunnelExpectedFeasibility {
  resultType: ResultType;
  planLoad: PlanLoadRecommendation;
  weeklyCapacity: WeeklyCapacity;
  bottleneckAxis: FeasibilityAxis | "wheel";
  bottleneckScore: number;
  adjustedScoreAtLeast: number;
  adjustedScoreAtMost: number;
}

export interface CoreFunnelExpectedPlan {
  dailyTimeBudget: "30min" | "1h" | "1.5h" | "2h+";
  maxWeeklyTaskCount: number;
  maxTasksPerTactic: number;
  week1TaskCount: number;
  week1TaskCountInRecommendedRange: boolean;
  weeklyTaskWarning: string | null;
  expectedLeadIndicatorCount: number;
}

export interface CoreFunnelScenario {
  id: string;
  goalType: CoreFunnelGoalType;
  label: string;
  rationale: string;
  smartInput: BuildSmartGoalInput;
  feasibilityAnswers: Record<number, string>;
  wheelScore: number;
  leadIndicators: LeadIndicatorDraft[];
  preferredDays: number[];
  expectedSmart: CoreFunnelExpectedSmart;
  expectedFeasibility: CoreFunnelExpectedFeasibility;
  expectedPlan: CoreFunnelExpectedPlan;
  knownLimitations?: string[];
}

function makeIndicator(
  id: string,
  name: string,
  target: string,
  unit: string,
  type: LeadIndicatorDraft["type"] = "core",
  cadence: LeadIndicatorDraft["cadence"] = "spread",
): LeadIndicatorDraft {
  return { id, name, target, unit, type, cadence };
}

export const CORE_FUNNEL_SCENARIOS: CoreFunnelScenario[] = [
  {
    id: "skill-rust-portfolio",
    goalType: "skill",
    label: "Học kỹ năng - Rust portfolio",
    rationale:
      "Người mới chuyển ngành, quỹ thời gian giới hạn (1-3h/tuần), kiến thức nền cơ bản. Kỳ vọng feasibility = challenging vì rõ phần yếu là thời gian + nguồn lực.",
    smartInput: {
      focusArea: "learning",
      specificGoalStatement: "Hoàn thành 6 dự án Rust nhỏ trong 12 tuần để xây portfolio backend.",
      measurableMetricName: "Du an Rust hoan thanh",
      measurableTargetValue: 6,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 4,
      achievableRequiredSkills: ["Rust syntax", "Ownership model"],
      achievableSupportResources: ["The Rust Book", "Cộng đồng Discord Rust VN"],
      relevantMotivationReason: "Chuẩn bị chuyển sang vai trò backend Rust trong 6 tháng tới.",
      timeBoundTargetWeeks: 12,
    },
    feasibilityAnswers: {
      1: "1to3",
      2: "energy_stable",
      3: "resources_basic",
      4: "challenging",
      5: "time",
      6: "mostly",
      7: "ready",
    },
    wheelScore: 6,
    leadIndicators: [
      makeIndicator("ind_rust_code", "Code Rust 60p", "3", "buổi/tuần"),
      makeIndicator("ind_rust_read", "Đọc Rust Book 30p", "2", "buổi/tuần", "core"),
      makeIndicator("ind_rust_pair", "Pair review", "1", "buổi/tuần", "optional"),
    ],
    preferredDays: [1, 2, 4, 5],
    expectedSmart: { difficulty: "medium", hasOutcomeIndicator: true },
    expectedFeasibility: {
      resultType: "challenging",
      planLoad: "lighter",
      weeklyCapacity: "low",
      bottleneckAxis: "time",
      bottleneckScore: 2,
      adjustedScoreAtLeast: 11,
      adjustedScoreAtMost: 11,
    },
    expectedPlan: {
      dailyTimeBudget: "30min",
      maxWeeklyTaskCount: 4,
      maxTasksPerTactic: 1,
      week1TaskCount: 3,
      week1TaskCountInRecommendedRange: true,
      weeklyTaskWarning: null,
      expectedLeadIndicatorCount: 3,
    },
  },
  {
    id: "health-run-5k",
    goalType: "health",
    label: "Sức khỏe - Chạy 5K",
    rationale: "Người tập thể thao trung bình, có khoảng 3-5h/tuần, motivation rõ. Kỳ vọng realistic + balanced.",
    smartInput: {
      focusArea: "health",
      specificGoalStatement: "Đạt mốc chạy 5K liên tục dưới 30 phút trong 12 tuần.",
      measurableMetricName: "Khoang cach chay duoc",
      measurableMetricUnit: "km",
      measurableTargetValue: 5,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 5,
      achievableRequiredSkills: ["Kỹ thuật chạy nền", "Hô hấp"],
      achievableSupportResources: ["Đồng hồ Garmin", "Lịch tập 5K từ HLV"],
      relevantMotivationReason: "Cải thiện sức khỏe và năng lượng cho công việc.",
      timeBoundTargetWeeks: 12,
    },
    feasibilityAnswers: {
      1: "3to5",
      2: "energy_stable",
      3: "resources_mostly_ready",
      4: "realistic",
      5: "none",
      6: "mostly",
      7: "ready",
    },
    wheelScore: 7,
    leadIndicators: [
      makeIndicator("ind_run", "Chạy 30p", "3", "buổi/tuần"),
      makeIndicator("ind_strength", "Strength 20p", "2", "buổi/tuần"),
      makeIndicator("ind_mobility", "Mobility 15p", "2", "buổi/tuần", "optional"),
    ],
    preferredDays: [1, 3, 5, 6],
    expectedSmart: { difficulty: "medium", hasOutcomeIndicator: true },
    expectedFeasibility: {
      resultType: "realistic",
      planLoad: "balanced",
      weeklyCapacity: "medium",
      bottleneckAxis: "time",
      bottleneckScore: 3,
      adjustedScoreAtLeast: 15,
      adjustedScoreAtMost: 15,
    },
    expectedPlan: {
      dailyTimeBudget: "1h",
      maxWeeklyTaskCount: 5,
      maxTasksPerTactic: 2,
      week1TaskCount: 5,
      week1TaskCountInRecommendedRange: true,
      weeklyTaskWarning: null,
      expectedLeadIndicatorCount: 3,
    },
  },
  {
    id: "finance-savings-milestones",
    goalType: "finance",
    label: "Tài chính - 4 milestone tiết kiệm",
    rationale:
      "Người làm văn phòng quỹ thời gian thấp nhưng routine rất chắc, mục tiêu rõ và đo được dễ. Kỳ vọng realistic + lighter (vì capacity thấp).",
    smartInput: {
      focusArea: "finance",
      specificGoalStatement: "Hoàn thành 4 milestone tiết kiệm trong 12 tuần.",
      measurableMetricName: "Milestone tiet kiem",
      measurableTargetValue: 4,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 2,
      achievableRequiredSkills: ["Lập ngân sách", "Theo dõi chi tiêu"],
      achievableSupportResources: ["YNAB", "Bảng tracking cá nhân"],
      relevantMotivationReason: "Xây quỹ khẩn cấp 6 tháng chi tiêu.",
      timeBoundTargetWeeks: 12,
    },
    feasibilityAnswers: {
      1: "1to3",
      2: "energy_stable",
      3: "resources_mostly_ready",
      4: "very_realistic",
      5: "none",
      6: "always",
      7: "committed",
    },
    wheelScore: 7,
    leadIndicators: [
      makeIndicator("ind_track", "Track expenses 10p", "3", "buổi/tuần"),
      makeIndicator("ind_review", "Weekly money review", "1", "buổi/tuần"),
    ],
    preferredDays: [0, 3, 6],
    expectedSmart: { difficulty: "medium", hasOutcomeIndicator: true },
    expectedFeasibility: {
      resultType: "realistic",
      planLoad: "lighter",
      weeklyCapacity: "low",
      bottleneckAxis: "time",
      bottleneckScore: 2,
      adjustedScoreAtLeast: 16,
      adjustedScoreAtMost: 16,
    },
    expectedPlan: {
      dailyTimeBudget: "30min",
      maxWeeklyTaskCount: 4,
      maxTasksPerTactic: 1,
      week1TaskCount: 2,
      week1TaskCountInRecommendedRange: false,
      weeklyTaskWarning: null,
      expectedLeadIndicatorCount: 2,
    },
    knownLimitations: [
      "Week 1 chỉ có 2 task (dưới mức khuyến nghị 3-5) vì capacity = low buộc plan load = lighter. Đây là hành vi đúng để tránh quá tải, nhưng UX nên gợi ý thêm 1 indicator để tiến vào vùng 3-5.",
    ],
  },
  {
    id: "career-promotion-senior",
    goalType: "career",
    label: "Sự nghiệp - Promotion Senior",
    rationale:
      "Engineer cấp cao, capacity dồi dào (>5h/tuần), routine ổn, motivation rõ. Kỳ vọng realistic + push (high capacity, weakest=3).",
    smartInput: {
      focusArea: "career",
      specificGoalStatement: "Hoàn thành 12 deliverable thuộc IDP trước review Q3.",
      measurableMetricName: "Deliverable IDP",
      measurableTargetValue: 12,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 12,
      achievableRequiredSkills: ["System design", "Stakeholder management"],
      achievableSupportResources: ["Mentor cấp Senior", "IDP doc"],
      relevantMotivationReason: "Đạt vị trí Senior Engineer trong vòng 6 tháng tới.",
      timeBoundTargetWeeks: 12,
    },
    feasibilityAnswers: {
      1: "gt5",
      2: "energy_high",
      3: "resources_mostly_ready",
      4: "realistic",
      5: "none",
      6: "always",
      7: "committed",
    },
    wheelScore: 8,
    leadIndicators: [
      makeIndicator("ind_deepwork", "Deep work block", "5", "buổi/tuần"),
      makeIndicator("ind_one_on_one", "1:1 stakeholder", "2", "buổi/tuần"),
      makeIndicator("ind_demo_prep", "Demo prep", "2", "buổi/tuần", "optional"),
      makeIndicator("ind_skill_ramp", "Skill ramp 30p", "3", "buổi/tuần", "optional"),
    ],
    preferredDays: [1, 2, 3, 4, 5],
    expectedSmart: { difficulty: "medium", hasOutcomeIndicator: true },
    expectedFeasibility: {
      resultType: "realistic",
      planLoad: "push",
      weeklyCapacity: "high",
      bottleneckAxis: "resources",
      bottleneckScore: 3,
      adjustedScoreAtLeast: 19,
      adjustedScoreAtMost: 19,
    },
    expectedPlan: {
      dailyTimeBudget: "1.5h",
      maxWeeklyTaskCount: 6,
      maxTasksPerTactic: 2,
      week1TaskCount: 6,
      week1TaskCountInRecommendedRange: false,
      weeklyTaskWarning: "Khuyến nghị mỗi tuần chỉ nên có 3-5 việc. Bạn đang vượt quá 5 việc.",
      expectedLeadIndicatorCount: 4,
    },
    knownLimitations: [
      "Week 1 = 6 task vượt quá ngưỡng khuyến nghị (3-5). getMaxTasksPerTactic('push','1.5h') = 2 (giới hạn bởi time budget, không phải load), nhưng tổng vẫn vượt 5. UI nên cảnh báo qua getWeeklyTaskWarning.",
    ],
  },
  {
    id: "exam-ielts-7-12-weeks",
    goalType: "exam",
    label: "Thi cử - IELTS 7.0 trong 12 tuần",
    rationale:
      "Mục tiêu rất tham vọng so với baseline + thời gian. Kỳ vọng too_ambitious + lighter. Cũng minh hoạ điểm yếu của estimateGoalDifficulty với metric phi tuyến (band IELTS).",
    smartInput: {
      focusArea: "learning",
      specificGoalStatement: "Đạt IELTS overall band 7.0 sau 12 tuần ôn luyện.",
      measurableMetricName: "IELTS overall band",
      measurableTargetValue: 7,
      measurableBaselineValue: 5.5,
      achievableWeeklyTimeCommitmentHours: 15,
      achievableRequiredSkills: ["Writing task 2", "Speaking part 3"],
      achievableSupportResources: ["Cambridge IELTS book", "Speaking partner"],
      relevantMotivationReason: "Du học master vào năm 2027.",
      timeBoundTargetWeeks: 12,
    },
    feasibilityAnswers: {
      1: "1to3",
      2: "energy_low",
      3: "resources_basic",
      4: "overwhelming",
      5: "motivation",
      6: "sometimes",
      7: "interested",
    },
    wheelScore: 4,
    leadIndicators: [
      makeIndicator("ind_listen", "Listening 25p", "4", "buổi/tuần"),
      makeIndicator("ind_writing", "Writing task 2", "2", "buổi/tuần"),
    ],
    preferredDays: [2, 4, 6],
    expectedSmart: { difficulty: "easy", hasOutcomeIndicator: true },
    expectedFeasibility: {
      resultType: "too_ambitious",
      planLoad: "lighter",
      weeklyCapacity: "low",
      bottleneckAxis: "clarity",
      bottleneckScore: 1,
      adjustedScoreAtLeast: 7,
      adjustedScoreAtMost: 7,
    },
    expectedPlan: {
      dailyTimeBudget: "30min",
      maxWeeklyTaskCount: 4,
      maxTasksPerTactic: 1,
      week1TaskCount: 2,
      week1TaskCountInRecommendedRange: false,
      weeklyTaskWarning: null,
      expectedLeadIndicatorCount: 2,
    },
    knownLimitations: [
      "estimateGoalDifficulty trả về 'easy' vì delta band (1.5) chia weekly hours (15) = 0.1, dù mục tiêu thực sự rất tham vọng. Đây là gap rõ của difficulty rubric với metric phi tuyến (band score). Feasibility resultType 'too_ambitious' bù lại tín hiệu ambition.",
      "Week 1 = 2 task, dưới recommended range. Đúng tinh thần lighter cho too_ambitious; nên cảnh báo phải scope-down trước.",
    ],
  },
  {
    id: "project-side-mvp-feedback",
    goalType: "project",
    label: "Hoàn thành dự án - Side project MVP",
    rationale: "Solo builder, capacity trung bình, mục tiêu rõ nhưng phức tạp. Kỳ vọng challenging + balanced.",
    smartInput: {
      focusArea: "career",
      specificGoalStatement: "Ra mắt MVP vision board planner với 8 phiên feedback người dùng.",
      measurableMetricName: "Phien feedback nguoi dung",
      measurableTargetValue: 8,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 6,
      achievableRequiredSkills: ["React", "UX writing"],
      achievableSupportResources: ["Figma", "Vercel"],
      relevantMotivationReason: "Validate ý tưởng SaaS trước khi rời job hiện tại.",
      timeBoundTargetWeeks: 12,
    },
    feasibilityAnswers: {
      1: "3to5",
      2: "energy_stable",
      3: "resources_mostly_ready",
      4: "realistic",
      5: "none",
      6: "mostly",
      7: "ready",
    },
    wheelScore: 5,
    leadIndicators: [
      makeIndicator("ind_build", "Build session 60p", "3", "buổi/tuần"),
      makeIndicator("ind_user_iv", "User interview", "2", "buổi/tuần"),
      makeIndicator("ind_ship_review", "Ship review", "1", "buổi/tuần", "optional"),
    ],
    preferredDays: [1, 3, 5, 6],
    expectedSmart: { difficulty: "medium", hasOutcomeIndicator: true },
    expectedFeasibility: {
      resultType: "challenging",
      planLoad: "balanced",
      weeklyCapacity: "medium",
      bottleneckAxis: "time",
      bottleneckScore: 3,
      adjustedScoreAtLeast: 14,
      adjustedScoreAtMost: 14,
    },
    expectedPlan: {
      dailyTimeBudget: "1h",
      maxWeeklyTaskCount: 5,
      maxTasksPerTactic: 2,
      week1TaskCount: 5,
      week1TaskCountInRecommendedRange: true,
      weeklyTaskWarning: null,
      expectedLeadIndicatorCount: 3,
    },
  },
  {
    id: "habit-reading-3x-week",
    goalType: "habit",
    label: "Xây thói quen - Đọc sách 3 buổi/tuần",
    rationale:
      "Habit goal, capacity ổn, mọi axis cao. Kỳ vọng realistic + balanced. Difficulty = easy vì target nhỏ so với weekly hours.",
    smartInput: {
      focusArea: "life",
      specificGoalStatement: "Duy trì đọc sách 3 buổi mỗi tuần trong 12 tuần liền.",
      measurableMetricName: "Buoi doc/tuan",
      measurableTargetValue: 3,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 4,
      achievableRequiredSkills: ["Tóm tắt 3 dòng"],
      achievableSupportResources: ["Kindle", "Goodreads"],
      relevantMotivationReason: "Mở rộng góc nhìn ngoài công việc.",
      timeBoundTargetWeeks: 12,
    },
    feasibilityAnswers: {
      1: "3to5",
      2: "energy_high",
      3: "resources_ready",
      4: "very_realistic",
      5: "none",
      6: "always",
      7: "committed",
    },
    wheelScore: 8,
    leadIndicators: [
      makeIndicator("ind_read", "Đọc 30p", "3", "buổi/tuần"),
      makeIndicator("ind_note", "Note review", "1", "buổi/tuần"),
    ],
    preferredDays: [0, 2, 4, 6],
    expectedSmart: { difficulty: "easy", hasOutcomeIndicator: true },
    expectedFeasibility: {
      resultType: "realistic",
      planLoad: "balanced",
      weeklyCapacity: "medium",
      bottleneckAxis: "time",
      bottleneckScore: 3,
      adjustedScoreAtLeast: 19,
      adjustedScoreAtMost: 19,
    },
    expectedPlan: {
      dailyTimeBudget: "1h",
      maxWeeklyTaskCount: 5,
      maxTasksPerTactic: 2,
      week1TaskCount: 3,
      week1TaskCountInRecommendedRange: true,
      weeklyTaskWarning: null,
      expectedLeadIndicatorCount: 2,
    },
  },
  {
    id: "self-development-mentor-journal",
    goalType: "self_development",
    label: "Phát triển bản thân - Mentor + journal",
    rationale:
      "Người bận, năng lượng thấp, motivation đang yếu. Kỳ vọng challenging + lighter. Difficulty = easy vì target nhỏ.",
    smartInput: {
      focusArea: "life",
      specificGoalStatement: "Hoàn thành 2 buổi mentor và duy trì journal hàng ngày trong 12 tuần.",
      measurableMetricName: "Buoi mentor",
      measurableTargetValue: 2,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 3,
      achievableRequiredSkills: ["Self-reflection", "Đặt câu hỏi mở"],
      achievableSupportResources: ["Mentor mạng lưới", "Notion journal"],
      relevantMotivationReason: "Hiểu rõ định hướng nghề nghiệp 3 năm tới.",
      timeBoundTargetWeeks: 12,
    },
    feasibilityAnswers: {
      1: "1to3",
      2: "energy_low",
      3: "resources_mostly_ready",
      4: "realistic",
      5: "motivation",
      6: "sometimes",
      7: "interested",
    },
    wheelScore: 6,
    leadIndicators: [
      makeIndicator("ind_journal", "Journal 10p", "4", "buổi/tuần"),
      makeIndicator("ind_mentor", "Mentor session", "1", "buổi/tuần", "optional"),
    ],
    preferredDays: [0, 1, 2, 3, 4, 5, 6],
    expectedSmart: { difficulty: "easy", hasOutcomeIndicator: true },
    expectedFeasibility: {
      resultType: "challenging",
      planLoad: "lighter",
      weeklyCapacity: "low",
      bottleneckAxis: "time",
      bottleneckScore: 2,
      adjustedScoreAtLeast: 10,
      adjustedScoreAtMost: 10,
    },
    expectedPlan: {
      dailyTimeBudget: "30min",
      maxWeeklyTaskCount: 4,
      maxTasksPerTactic: 1,
      week1TaskCount: 2,
      week1TaskCountInRecommendedRange: false,
      weeklyTaskWarning: null,
      expectedLeadIndicatorCount: 2,
    },
    knownLimitations: [
      "Week 1 = 2 task dưới recommended range (3-5). Đúng tinh thần lighter cho người capacity thấp + motivation yếu, nhưng UX nên gợi ý mở rộng dần khi giữ được nhịp.",
    ],
  },
];

export function getScenarioById(id: string): CoreFunnelScenario | undefined {
  return CORE_FUNNEL_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getScenariosByGoalType(goalType: CoreFunnelGoalType): CoreFunnelScenario[] {
  return CORE_FUNNEL_SCENARIOS.filter((scenario) => scenario.goalType === goalType);
}
