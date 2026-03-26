import type {
  Entitlement,
  EntitlementKey,
  LeadIndicator,
  PricingPlanCode,
  TacticType,
  UniversalWeeklyReview,
} from "./storage-types";

export type PremiumFeatureContext = "template" | "review" | "reminder" | "plan";

export interface PricingPlanDefinition {
  code: PricingPlanCode;
  name: string;
  shortLabel: string;
  priceLabel: string;
  description: string;
  highlights: string[];
}

export interface TemplateTacticPreset {
  name: string;
  target: string;
  unit: string;
  type: TacticType;
  cadence: "spread" | "frontload" | "backload";
}

export interface TwelveWeekTemplateDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  bestFor: string;
  whyItWorks: string;
  firstWeekWin: string;
  idealFor: string[];
  goalType: string;
  reviewDay: string;
  requiredPlan: PricingPlanCode | null;
  accent: "slate" | "sky" | "emerald" | "amber" | "violet";
  vision12Week: string;
  week12Outcome: string;
  lagMetricName: string;
  lagMetricTarget: string;
  lagMetricUnit: string;
  week4Milestone: string;
  week8Milestone: string;
  successEvidence: string;
  tactics: TemplateTacticPreset[];
}

export interface WeeklyReviewPremiumInsight {
  status: "strong" | "watch" | "at_risk";
  badgeLabel: string;
  headline: string;
  summary: string;
  recommendedAdjustment: string;
  coachNote: string;
}

export interface SuggestedNextWeekPlan {
  focus: string;
  workloadDecision: UniversalWeeklyReview["workloadDecision"];
  rationale: string;
  protectTactics: string[];
  secondaryTrackLabel: string;
  secondaryTrackItems: string[];
  firstMove: string;
}

export interface AdaptiveTemplateRecommendation {
  templateId: string;
  reason: string;
}

export interface AdaptiveTemplateSupport {
  personalizedTactics: TemplateTacticPreset[];
  weekPlanFocuses: string[];
  week1Headline: string;
  week1Support: string;
  week1CadenceHint: string;
  recommendedReviewDay: string;
  recommendedReviewReason: string;
  recommendedLoadPreference: "balanced" | "lighter" | "push";
  recommendedLoadReason: string;
  week4MilestoneSuggestion: string;
  week8MilestoneSuggestion: string;
}

export const PLAN_DEFINITIONS: PricingPlanDefinition[] = [
  {
    code: "FREE",
    name: "Free",
    shortLabel: "Free",
    priceLabel: "0đ",
    description: "Đủ để bạn chạy một chu kỳ 12 tuần hoàn chỉnh và biết hôm nay cần làm gì.",
    highlights: ["1 chu kỳ 12 tuần", "Today queue + check-in", "Review tuần cơ bản"],
  },
  {
    code: "PLUS",
    name: "Plus",
    shortLabel: "Plus",
    priceLabel: "149.000đ / chu kỳ",
    description: "Dành cho người muốn bắt đầu nhanh hơn, giữ nhịp đều hơn và biết tuần sau nên chỉnh gì.",
    highlights: [
      "Khung gợi ý thích nghi theo kiểu mục tiêu",
      "Review premium với gợi ý tuần sau",
      "Nhắc việc ưu tiên + analytics nâng cao",
    ],
  },
];

export const PLAN_ENTITLEMENTS: Record<PricingPlanCode, EntitlementKey[]> = {
  FREE: [],
  PLUS: [
    "premium_templates",
    "premium_review_insights",
    "priority_reminders",
    "advanced_analytics",
  ],
  PRO: [
    "premium_templates",
    "premium_review_insights",
    "priority_reminders",
    "advanced_analytics",
  ],
};

export const TWELVE_WEEK_TEMPLATE_CATALOG: TwelveWeekTemplateDefinition[] = [
  {
    id: "steady-focus-reset",
    name: "Quay lại nhịp gọn",
    subtitle: "Khung gợi ý Free",
    description: "Dành cho lúc bạn cần cắt loãng, quay lại nhịp và làm ít nhưng chắc.",
    bestFor: "Lúc bạn vừa bị rơi nhịp, đang ôm quá tay, hoặc muốn một chu kỳ thật gọn để quay lại.",
    whyItWorks: "Khung này thắng bằng độ đều. Bạn chỉ giữ vài nhịp lặp đơn giản nên rất khó vỡ tuần đầu.",
    firstWeekWin: "Tuần đầu chỉ cần chốt 1 việc cốt lõi mỗi ngày và review ngắn cuối ngày để nhịp quay lại ngay.",
    idealFor: ["Rơi nhịp gần đây", "Quá tải", "Muốn làm ít mà đều"],
    goalType: "Personal Growth",
    reviewDay: "Sunday",
    requiredPlan: null,
    accent: "slate",
    vision12Week: "Trong 12 tuần tới, tôi muốn dựng lại một nhịp làm việc gọn, rõ và ít ma sát hơn mỗi ngày.",
    week12Outcome: "Giữ được nhịp làm việc ít nhất 5 ngày mỗi tuần mà không còn cảm giác ôm quá tay.",
    lagMetricName: "Số ngày giữ đúng nhịp mỗi tuần",
    lagMetricTarget: "5",
    lagMetricUnit: "ngày/tuần",
    week4Milestone: "Nhịp tuần không còn bị đứt quá 2 ngày liên tiếp.",
    week8Milestone: "Có một lịch làm việc đủ nhẹ để giữ đều ngay cả khi bận.",
    successEvidence: "Bạn nhìn vào tuần nào cũng biết việc ưu tiên số 1 là gì.",
    tactics: [
      { name: "Chốt 1 việc cốt lõi mỗi ngày", target: "5", unit: "lần/tuần", type: "core", cadence: "spread" },
      { name: "Review cuối ngày 3 phút", target: "5", unit: "lần/tuần", type: "core", cadence: "spread" },
    ],
  },
  {
    id: "study-sprint-basics",
    name: "Đều và bền",
    subtitle: "Khung gợi ý Free",
    description: "Khi mục tiêu cần tiến đều từng tuần, không cần nước rút mạnh nhưng phải tích lũy thật.",
    bestFor: "Khi bạn muốn giữ nhịp bền, không cần tăng tốc mạnh nhưng vẫn phải thấy tiến triển đều.",
    whyItWorks: "Khung này cân giữa tiến độ chính và một vòng rà lại nhẹ, nên tuần nào cũng có bước tiến thật.",
    firstWeekWin: "Tuần đầu đã có nhịp tiến độ chính, nhịp rà lại và một review tuần rất nhẹ để giữ đều.",
    idealFor: ["Xây thói quen", "Tích lũy từng tuần", "Muốn tiến đều"],
    goalType: "Habit Building",
    reviewDay: "Sunday",
    requiredPlan: null,
    accent: "sky",
    vision12Week: "Trong 12 tuần tới, tôi muốn giữ một nhịp tiến đều để mục tiêu đi lên mà không phải ép nước rút liên tục.",
    week12Outcome: "Tích lũy đủ 12 tuần tiến đều và không còn cảm giác tuần nào cũng phải bắt đầu lại từ đầu.",
    lagMetricName: "Số phiên tiến độ chính",
    lagMetricTarget: "4",
    lagMetricUnit: "phiên/tuần",
    week4Milestone: "Nhịp tuần đã ổn định và biết rõ việc chính tuần nào cũng phải chạm.",
    week8Milestone: "Tốc độ tiến lên đều hơn và review tuần không còn nặng đầu.",
    successEvidence: "Bạn nhìn vào tuần nào cũng thấy rõ một bước tiến thật, dù nhỏ.",
    tactics: [
      { name: "Slot tiến độ chính", target: "4", unit: "phiên/tuần", type: "core", cadence: "spread" },
      { name: "Rà lại và khóa việc kế tiếp", target: "2", unit: "lần/tuần", type: "core", cadence: "backload" },
      { name: "Bổ sung một bước nhỏ", target: "1", unit: "lần/tuần", type: "optional", cadence: "spread" },
    ],
  },
  {
    id: "job-search-pipeline",
    name: "Ít nhưng phải ra đầu ra",
    subtitle: "Khung gợi ý Plus",
    description: "Khung Plus cho mục tiêu cần tạo đầu ra rõ mỗi tuần, không chỉ bận mà không tiến.",
    bestFor: "Khi bạn cần mỗi tuần phải có thứ gì đó được ship, nộp, đăng, gửi hoặc hoàn thành.",
    whyItWorks: "Mọi tactic đều bị kéo về một đầu ra chính, nên tuần không bị nuốt bởi việc phụ.",
    firstWeekWin: "Tuần đầu đã có slot tạo đầu ra, slot hoàn thiện và một nhịp follow-up nhẹ để đóng vòng.",
    idealFor: ["Ra đầu ra", "Ship dự án", "Chốt deliverable"],
    goalType: "Project Completion",
    reviewDay: "Friday",
    requiredPlan: "PLUS",
    accent: "emerald",
    vision12Week: "Trong 12 tuần tới, tôi muốn mỗi tuần đều có một đầu ra thật thay vì chỉ bận mà không chạm đích.",
    week12Outcome: "Có một chuỗi 12 tuần mà hầu như tuần nào cũng ra được đầu ra rõ ràng và đo được.",
    lagMetricName: "Số đầu ra đã chốt",
    lagMetricTarget: "2",
    lagMetricUnit: "đầu ra/tuần",
    week4Milestone: "Đã giữ được nhịp ra đầu ra tối thiểu mỗi tuần.",
    week8Milestone: "Không còn tuần nào bị trôi qua mà không chốt được một thứ thật.",
    successEvidence: "Bạn luôn biết tuần này đầu ra cần chốt là gì và đang ở giai đoạn nào.",
    tactics: [
      { name: "Tạo bản nháp hoặc phiên bản đầu", target: "2", unit: "phiên/tuần", type: "core", cadence: "frontload" },
      { name: "Hoàn thiện để chốt đầu ra", target: "2", unit: "phiên/tuần", type: "core", cadence: "backload" },
      { name: "Follow-up hoặc công bố", target: "1", unit: "lần/tuần", type: "optional", cadence: "spread" },
    ],
  },
  {
    id: "creator-publishing-engine",
    name: "Tăng tốc có kiểm soát",
    subtitle: "Khung gợi ý Plus",
    description: "Khung Plus cho lúc mục tiêu đủ khả thi để tăng tải nhẹ nhưng không muốn tự làm rối mình.",
    bestFor: "Khi bạn đã có độ sẵn sàng khá tốt và muốn đẩy nhanh tiến độ mà vẫn kiểm soát được nhịp.",
    whyItWorks: "Nó giữ 2 trục cốt lõi và một lớp mở rộng, nên bạn tăng tốc mà vẫn còn khoảng thở để không vỡ tuần.",
    firstWeekWin: "Tuần đầu đã có nhịp tăng tốc rõ nhưng vẫn giữ được ngày review và khoảng thở cần thiết.",
    idealFor: ["Muốn tăng tốc", "Đã có nền tảng", "Cần nhịp nước rút vừa phải"],
    goalType: "Personal Growth",
    reviewDay: "Friday",
    requiredPlan: "PLUS",
    accent: "violet",
    vision12Week: "Trong 12 tuần tới, tôi muốn tăng tốc đúng lúc nhưng vẫn giữ cho hệ thực thi đủ gọn để bám lâu.",
    week12Outcome: "Đẩy tiến độ nhanh hơn rõ rệt mà không bị hụt hơi sau vài tuần đầu.",
    lagMetricName: "Số đầu ra cốt lõi đã chốt",
    lagMetricTarget: "2",
    lagMetricUnit: "đầu ra/tuần",
    week4Milestone: "Nhịp tăng tốc đã vào guồng nhưng chưa làm tuần bị loãng.",
    week8Milestone: "Giữ được tốc độ cao hơn mà review tuần vẫn còn rõ đầu óc.",
    successEvidence: "Bạn nhìn vào tuần là biết đâu là lớp cốt lõi, đâu là lớp tăng tốc thêm.",
    tactics: [
      { name: "Phiên sâu cho việc chính", target: "3", unit: "phiên/tuần", type: "core", cadence: "frontload" },
      { name: "Chốt đầu ra hoặc gửi đi", target: "2", unit: "lần/tuần", type: "core", cadence: "spread" },
      { name: "Đẩy thêm lớp mở rộng", target: "1", unit: "lần/tuần", type: "optional", cadence: "backload" },
    ],
  },
  {
    id: "strength-and-energy-system",
    name: "Nhiều lớp nhưng không vỡ nhịp",
    subtitle: "Khung gợi ý Plus",
    description: "Khung Plus cho mục tiêu nhiều lớp khi bạn vừa phải làm việc chính, vừa giữ nhịp nền mà vẫn muốn tuần đủ nhẹ.",
    bestFor: "Khi mục tiêu có nhiều lớp kéo cùng lúc nhưng bạn vẫn muốn hệ thống biết chỗ nào phải giữ, chỗ nào có thể buông.",
    whyItWorks: "Khung này tách rõ phần bắt buộc, phần giữ nền và phần tùy sức, nên mục tiêu phức tạp vẫn đi được.",
    firstWeekWin: "Tuần đầu đã có phân lớp cốt lõi, nhịp giữ nền và chỗ để buông bớt khi cần.",
    idealFor: ["Mục tiêu nhiều lớp", "Vừa việc chính vừa việc nền", "Muốn cứu nhịp sớm"],
    goalType: "Personal Growth",
    reviewDay: "Sunday",
    requiredPlan: "PLUS",
    accent: "amber",
    vision12Week: "Trong 12 tuần tới, tôi muốn theo đuổi một mục tiêu nhiều lớp mà không để tuần nào cũng bị nặng đầu hoặc vỡ nhịp.",
    week12Outcome: "Giữ được phần cốt lõi, phần nền và phần mở rộng đúng chỗ mà không còn cảm giác mọi thứ dồn cục.",
    lagMetricName: "Số lớp việc được giữ đúng nhịp",
    lagMetricTarget: "3",
    lagMetricUnit: "lớp/tuần",
    week4Milestone: "Biết rõ lớp nào là bắt buộc và lớp nào chỉ làm khi còn sức.",
    week8Milestone: "Tuần nhiều việc hơn nhưng vẫn không bị mất phương hướng.",
    successEvidence: "Bạn nhìn vào lịch là biết việc nào phải giữ, việc nào có thể lùi mà không thấy tội lỗi.",
    tactics: [
      { name: "Lớp việc chính", target: "3", unit: "lần/tuần", type: "core", cadence: "spread" },
      { name: "Lớp giữ nền", target: "2", unit: "lần/tuần", type: "core", cadence: "spread" },
      { name: "Lớp mở rộng khi còn sức", target: "2", unit: "lần/tuần", type: "optional", cadence: "backload" },
    ],
  },
  {
    id: "exam-deep-study",
    name: "Học sâu không dàn trải",
    subtitle: "Khung gợi ý Plus",
    description: "Khung Plus cho kỳ thi hoặc mục tiêu học có deadline rõ. Giữ tiến độ đều, kiểm tra mức nắm và về đích trước ngày thi.",
    bestFor: "Khi bạn có một kỳ thi, kỳ sát hạch hoặc deadline học rõ ràng và cần một nhịp học không bị gián đoạn trong 12 tuần.",
    whyItWorks: "Khung này tách riêng slot học chủ động, slot ôn và slot kiểm tra hiểu, nên bạn không chỉ đọc mà còn biết mình nắm đến đâu.",
    firstWeekWin: "Tuần đầu đã có nhịp học chủ động, ôn lại và một vòng kiểm tra mức hiểu để biết điểm hổng sớm.",
    idealFor: ["Thi cử", "Học có deadline", "Cần tiến đều từng tuần"],
    goalType: "Exam / Study",
    reviewDay: "Sunday",
    requiredPlan: "PLUS",
    accent: "sky",
    vision12Week: "Trong 12 tuần tới, tôi muốn học sâu, ôn đúng chỗ và vào ngày thi không còn cảm giác phải nhồi nhét.",
    week12Outcome: "Hoàn thành toàn bộ nội dung cần học, có ít nhất 2 lần ôn tổng hợp và cảm giác vào thi đã đủ chắc.",
    lagMetricName: "Số buổi học chủ động mỗi tuần",
    lagMetricTarget: "4",
    lagMetricUnit: "buổi/tuần",
    week4Milestone: "Xong phần nền và biết rõ chỗ nào cần ôn thêm.",
    week8Milestone: "Đã học qua toàn bộ nội dung, bắt đầu chu kỳ ôn chủ động.",
    successEvidence: "Bạn ngồi vào buổi học là biết ngay hôm nay sẽ nắm thêm phần nào và kiểm tra bằng cách nào.",
    tactics: [
      { name: "Buổi học chủ động mới", target: "3", unit: "buổi/tuần", type: "core", cadence: "spread" },
      { name: "Ôn và consolidate", target: "2", unit: "lần/tuần", type: "core", cadence: "backload" },
      { name: "Kiểm tra mức hiểu (quiz/flashcard)", target: "1", unit: "lần/tuần", type: "optional", cadence: "spread" },
    ],
  },
  {
    id: "fitness-consistency-engine",
    name: "Vào guồng sức khỏe bền",
    subtitle: "Khung gợi ý Plus",
    description: "Khung Plus cho mục tiêu sức khỏe cần nhịp đều hơn là nước rút. Giữ tập, theo dõi phục hồi và ghi lại tiến triển thật.",
    bestFor: "Khi bạn muốn tập luyện thành thói quen bền, không chỉ bứt phá được vài tuần rồi đứt quãng.",
    whyItWorks: "Nhịp tập cốt lõi được bảo vệ, phần phục hồi được đo và chỉ số chính là tiến bộ thật, không phải cảm giác.",
    firstWeekWin: "Tuần đầu đã có 3 buổi tập chất lượng, 1 ngày chủ động phục hồi và biết rõ chỉ số chính đang ở đâu.",
    idealFor: ["Tập luyện đều", "Sức khỏe thể chất", "Tránh chấn thương và đứt quãng"],
    goalType: "Fitness / Health",
    reviewDay: "Sunday",
    requiredPlan: "PLUS",
    accent: "emerald",
    vision12Week: "Trong 12 tuần tới, tôi muốn xây một nhịp tập đều, đo được tiến bộ thật và không bị đứt quãng vì kiệt sức.",
    week12Outcome: "Giữ nhịp tập ít nhất 3 buổi mỗi tuần liên tục và có một chỉ số sức khỏe cốt lõi được cải thiện rõ rệt.",
    lagMetricName: "Số buổi tập đã hoàn thành mỗi tuần",
    lagMetricTarget: "3",
    lagMetricUnit: "buổi/tuần",
    week4Milestone: "Nhịp 3 buổi/tuần đã thành thói quen, không còn phải cưỡng ép bản thân.",
    week8Milestone: "Chỉ số chính đã có tiến triển rõ và nhịp phục hồi đang hoạt động tốt.",
    successEvidence: "Bạn nhìn vào lịch là biết ngay tuần này tập ngày nào, nghỉ ngày nào và không còn tự hỏi 'hôm nay có cần tập không'.",
    tactics: [
      { name: "Buổi tập chính", target: "3", unit: "buổi/tuần", type: "core", cadence: "spread" },
      { name: "Phục hồi chủ động (giãn / đi bộ)", target: "2", unit: "lần/tuần", type: "core", cadence: "spread" },
      { name: "Ghi chỉ số và tiến triển", target: "1", unit: "lần/tuần", type: "optional", cadence: "backload" },
    ],
  },
];

const PLAN_RANK: Record<PricingPlanCode, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 1,
};

export function normalizePlanCode(planCode: PricingPlanCode): PricingPlanCode {
  return planCode === "PRO" ? "PLUS" : planCode;
}

export function getPlanDefinition(planCode: PricingPlanCode): PricingPlanDefinition {
  const normalizedPlanCode = normalizePlanCode(planCode);
  return PLAN_DEFINITIONS.find((plan) => plan.code === normalizedPlanCode) ?? PLAN_DEFINITIONS[0];
}

export function getPlanLabel(planCode: PricingPlanCode): string {
  return getPlanDefinition(planCode).shortLabel;
}

export function getEntitlementLabel(key: EntitlementKey): string {
  switch (key) {
    case "premium_templates":
      return "Template premium";
    case "premium_review_insights":
      return "Insight review premium";
    case "priority_reminders":
      return "Nhắc việc ưu tiên";
    case "advanced_analytics":
      return "Analytics nâng cao";
    default:
      return key;
  }
}

export function getEntitlementsForPlan(planCode: PricingPlanCode, grantedAt: string): Entitlement[] {
  const normalizedPlanCode = normalizePlanCode(planCode);
  return PLAN_ENTITLEMENTS[normalizedPlanCode].map((key) => ({
    key,
    sourcePlan: normalizedPlanCode,
    grantedAt,
  }));
}

export function planSatisfiesRequirement(
  currentPlan: PricingPlanCode,
  requiredPlan: PricingPlanCode | null,
): boolean {
  if (!requiredPlan) return true;
  return PLAN_RANK[normalizePlanCode(currentPlan)] >= PLAN_RANK[normalizePlanCode(requiredPlan)];
}

export function buildAdaptiveTemplateRecommendation(input: {
  readinessScore: number;
  goalStatement: string;
  measurableText: string;
}): AdaptiveTemplateRecommendation {
  const combinedText = `${input.goalStatement} ${input.measurableText}`.toLowerCase();

  if (input.readinessScore <= 10) {
    return {
      templateId: "steady-focus-reset",
      reason: "Độ sẵn sàng hiện tại còn thấp, nên hợp nhất là giữ một khung rất gọn để quay lại nhịp trước.",
    };
  }

  if (/thói quen|mỗi ngày|đều|duy trì|kỷ luật|routine|nhịp/.test(combinedText)) {
    return {
      templateId: "study-sprint-basics",
      reason: "Mục tiêu này hợp kiểu tiến đều từng tuần, nên một khung bền và nhẹ sẽ dễ giữ hơn nước rút mạnh.",
    };
  }

  if (/ra mắt|hoàn thành|xong|ship|launch|submit|nộp|đăng|publish|portfolio|deliverable|đầu ra/.test(combinedText)) {
    return {
      templateId: "job-search-pipeline",
      reason: "Mục tiêu này sẽ tiến nhanh hơn nếu mọi tactic cùng kéo về một đầu ra rõ ràng mỗi tuần.",
    };
  }

  if (input.readinessScore >= 16) {
    return {
      templateId: "creator-publishing-engine",
      reason: "Độ sẵn sàng hiện tại khá tốt, nên bạn có thể tăng tốc nhẹ nhưng vẫn cần một khung đủ kiểm soát để không bị loãng.",
    };
  }

  return {
    templateId: "strength-and-energy-system",
    reason: "Mục tiêu này nên đi theo kiểu nhiều lớp nhưng vẫn có trục cốt lõi rõ, để tuần không bị nặng đầu khi việc bắt đầu chồng lên nhau.",
  };
}

function shortenGoalLabel(goalStatement: string, measurableText: string): string {
  const source = measurableText.trim() || goalStatement.trim();
  const cleaned = source.replace(/^["'\s]+|["'\s]+$/g, "");
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 8);
  return words.join(" ") || "mục tiêu chính";
}

function adaptTargetCount(target: string, readinessScore: number, type: TacticType): string {
  const parsedTarget = Number.parseInt(target, 10);
  if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) return target;

  if (readinessScore <= 10) {
    return String(type === "optional" ? 1 : Math.max(1, Math.min(parsedTarget, 4) - (parsedTarget >= 4 ? 1 : 0)));
  }

  if (readinessScore >= 17 && type === "core" && parsedTarget < 4) {
    return String(parsedTarget + 1);
  }

  return String(parsedTarget);
}

function buildFocusPhases(input: {
  early: string;
  middle: string;
  final: string;
}): string[] {
  return Array.from({ length: 12 }, (_, index) => {
    if (index < 4) return input.early;
    if (index < 8) return input.middle;
    return input.final;
  });
}

export function buildAdaptiveTemplateSupport(input: {
  template: TwelveWeekTemplateDefinition;
  goalStatement: string;
  measurableText: string;
  readinessScore: number;
}): AdaptiveTemplateSupport {
  const goalLabel = shortenGoalLabel(input.goalStatement, input.measurableText);

  switch (input.template.id) {
    case "steady-focus-reset":
      return {
        personalizedTactics: [
          {
            ...input.template.tactics[0],
            name: `Chốt 1 bước rõ cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[0].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[1],
            name: "Khóa lại ngày mai trong 3 phút",
            target: adaptTargetCount(input.template.tactics[1].target, input.readinessScore, "core"),
          },
        ],
        weekPlanFocuses: buildFocusPhases({
          early: "Cứu lại nhịp, giảm ma sát và chốt một bước rõ mỗi ngày.",
          middle: "Giữ nhịp đã dựng được và đừng thêm quá nhiều việc song song.",
          final: "Về đích thật gọn, giữ phần đang đều và tránh tăng tải muộn.",
        }),
        week1Headline: "Tuần 1 chỉ cần cứu lại nhịp.",
        week1Support: `Đừng cố bù tất cả ngay. Mục tiêu của tuần đầu là mỗi ngày chốt một bước rõ cho ${goalLabel}.`,
        week1CadenceHint: "Ưu tiên trải đều 5 ngày thay vì dồn việc vào 1-2 ngày đẹp.",
        recommendedReviewDay: "Sunday",
        recommendedReviewReason: "Khóa tuần vào cuối tuần để nhìn lại xem nhịp đã quay về chưa và tránh tự ép sớm.",
        recommendedLoadPreference: "lighter",
        recommendedLoadReason: "Tuần đầu nên nhẹ hơn để cứu nhịp trước, không cố gồng lại tất cả cùng lúc.",
        week4MilestoneSuggestion: `Giữ được nhịp rõ cho ${goalLabel} trong phần lớn tuần mà không còn bị đứt quãng dài.`,
        week8MilestoneSuggestion: "Có một nhịp đủ gọn để tuần bận vẫn không làm bạn rơi khỏi đường ray.",
      };
    case "study-sprint-basics":
      return {
        personalizedTactics: [
          {
            ...input.template.tactics[0],
            name: `Slot tiến độ chính cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[0].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[1],
            name: "Rà lại và khóa việc kế tiếp",
            target: adaptTargetCount(input.template.tactics[1].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[2],
            name: `Bổ sung một bước nhỏ cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[2].target, input.readinessScore, "optional"),
          },
        ],
        weekPlanFocuses: buildFocusPhases({
          early: "Vào nhịp đều, khóa việc chính của từng tuần và tránh chạy theo cảm hứng.",
          middle: "Giữ vòng lặp tiến độ chính rồi mới thêm bước phụ.",
          final: "Siết lại nhịp đều, khóa đầu ra cuối chu kỳ và tránh loãng vào những tuần cuối.",
        }),
        week1Headline: "Tuần 1 chỉ cần vào nhịp đều.",
        week1Support: `Tuần đầu của ${goalLabel} nên thắng bằng độ đều, không phải bằng việc làm quá nhiều.`,
        week1CadenceHint: "Giữ 3-4 slot tiến độ chính đẹp trong tuần, rồi mới tính phần bổ sung.",
        recommendedReviewDay: "Sunday",
        recommendedReviewReason: "Review cuối tuần hợp hơn với kiểu tích lũy đều, vì bạn sẽ có đủ cả tuần để nhìn ra nhịp thật.",
        recommendedLoadPreference: "balanced",
        recommendedLoadReason: "Kiểu mục tiêu này thắng nhờ đều và bền, nên cân bằng thường tốt hơn là ép mạnh hay hạ quá nhẹ.",
        week4MilestoneSuggestion: `Đã có một nhịp đều cho ${goalLabel}, tuần nào cũng chạm được phần việc chính thay vì làm theo hứng.`,
        week8MilestoneSuggestion: "Tiến độ đi lên đều hơn và review tuần không còn cảm giác phải kéo lại từ đầu.",
      };
    case "job-search-pipeline":
      return {
        personalizedTactics: [
          {
            ...input.template.tactics[0],
            name: `Tạo bản đầu cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[0].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[1],
            name: "Hoàn thiện và chốt đầu ra",
            target: adaptTargetCount(input.template.tactics[1].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[2],
            name: `Follow-up hoặc công bố cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[2].target, input.readinessScore, "optional"),
          },
        ],
        weekPlanFocuses: buildFocusPhases({
          early: "Mỗi tuần phải có một đầu ra thật, dù nhỏ, thay vì chỉ bận chuẩn bị.",
          middle: "Giữ nhịp ra đầu ra và lặp lại vòng hoàn thiện - gửi đi.",
          final: "Ưu tiên chốt các đầu ra quan trọng nhất và tránh dàn rộng thêm.",
        }),
        week1Headline: "Tuần 1 phải chốt được một đầu ra nhỏ.",
        week1Support: `Nếu tuần đầu của ${goalLabel} chỉ dừng ở chuẩn bị, nhịp sẽ rất dễ trôi. Hãy đặt mục tiêu ra được một bản đầu thật.`,
        week1CadenceHint: "Đầu tuần tạo bản đầu, giữa tuần hoàn thiện, cuối tuần chốt hoặc gửi đi.",
        recommendedReviewDay: "Friday",
        recommendedReviewReason: "Review vào thứ Sáu giúp bạn khóa đầu ra sớm và còn cuối tuần để thở hoặc chuẩn bị vòng tiếp theo.",
        recommendedLoadPreference: "balanced",
        recommendedLoadReason: "Bạn cần đủ tải để ra đầu ra thật, nhưng vẫn phải chừa chỗ để hoàn thiện và gửi đi.",
        week4MilestoneSuggestion: `Mỗi tuần đều chốt được ít nhất một đầu ra nhỏ cho ${goalLabel}, thay vì chỉ dừng ở chuẩn bị.`,
        week8MilestoneSuggestion: "Đầu ra đi thành chuỗi đều hơn và bạn biết rõ đầu tuần tạo gì, cuối tuần chốt gì.",
      };
    case "creator-publishing-engine":
      return {
        personalizedTactics: [
          {
            ...input.template.tactics[0],
            name: `Phiên sâu cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[0].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[1],
            name: "Chốt đầu ra hoặc gửi đi",
            target: adaptTargetCount(input.template.tactics[1].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[2],
            name: "Đẩy thêm lớp mở rộng khi còn sức",
            target: adaptTargetCount(input.template.tactics[2].target, input.readinessScore, "optional"),
          },
        ],
        weekPlanFocuses: buildFocusPhases({
          early: "Tăng tốc có kiểm soát: giữ hai trục chính rồi mới thêm phần mở rộng.",
          middle: "Đẩy nhanh tiến độ nhưng không hi sinh ngày review và khoảng thở.",
          final: "Giữ tốc độ cao ở đúng chỗ đang hiệu quả, tránh ôm thêm việc mới vào cuối chu kỳ.",
        }),
        week1Headline: "Tuần 1 tăng tốc nhưng vẫn phải giữ khoảng thở.",
        week1Support: `Với ${goalLabel}, tuần đầu nên đẩy nhịp vừa đủ để thấy tiến nhanh hơn, nhưng vẫn phải giữ chỗ để review và điều chỉnh.`,
        week1CadenceHint: "Dồn phần sâu vào nửa đầu tuần, để cuối tuần còn khoảng thở cho việc chốt lại.",
        recommendedReviewDay: "Friday",
        recommendedReviewReason: "Với kiểu tăng tốc có kiểm soát, khóa tuần vào thứ Sáu giúp bạn hãm lại đúng lúc trước khi tuần mới bắt đầu.",
        recommendedLoadPreference: "push",
        recommendedLoadReason: "Khung này phù hợp để đẩy tải nhẹ lên, nhưng vẫn có review sớm để không lao quá đà.",
        week4MilestoneSuggestion: `Tăng được nhịp thực thi cho ${goalLabel} mà tuần vẫn còn chỗ để review và chỉnh tải.`,
        week8MilestoneSuggestion: "Giữ được tốc độ cao hơn nhưng không còn cảm giác bị loãng hoặc hụt hơi giữa tuần.",
      };
    case "exam-deep-study":
      return {
        personalizedTactics: [
          {
            ...input.template.tactics[0],
            name: `Buổi học chủ động cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[0].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[1],
            name: "Ôn và consolidate nội dung đã học",
            target: adaptTargetCount(input.template.tactics[1].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[2],
            name: `Kiểm tra mức nắm ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[2].target, input.readinessScore, "optional"),
          },
        ],
        weekPlanFocuses: buildFocusPhases({
          early: "Nắm chắc nền kiến thức và xác định điểm hổng sớm.",
          middle: "Tăng vòng ôn, đẩy phần chưa chắc lên trước, bắt đầu luyện dạng đề.",
          final: "Ôn tổng hợp, điền điểm hổng còn lại và giữ nhịp ổn định đến ngày thi.",
        }),
        week1Headline: "Tuần 1 chỉ cần vào nhịp học và biết điểm hổng ở đâu.",
        week1Support: `Đừng cố học hết mọi thứ ngay. Tuần đầu của ${goalLabel} nên thắng bằng việc vào được nhịp đều và nhận ra sớm mình cần chú ý phần nào.`,
        week1CadenceHint: "Rải đều buổi học trong tuần, xen kẽ ôn và kiểm tra mức hiểu, đừng dồn tất cả vào 2-3 ngày.",
        recommendedReviewDay: "Sunday",
        recommendedReviewReason: "Review cuối tuần giúp bạn nhìn rõ tuần học được bao nhiêu, còn cách deadline bao xa và cần điều chỉnh tốc độ không.",
        recommendedLoadPreference: "balanced",
        recommendedLoadReason: "Học cho thi cần đều và ổn định, không nên ép quá mạnh ở đầu rồi mất sức trước ngày thi.",
        week4MilestoneSuggestion: `Đã học xong phần nền của ${goalLabel} và biết rõ vùng nào cần ôn thêm.`,
        week8MilestoneSuggestion: "Đã đi qua toàn bộ nội dung và bắt đầu chu kỳ ôn có định hướng.",
      };
    case "fitness-consistency-engine":
      return {
        personalizedTactics: [
          {
            ...input.template.tactics[0],
            name: `Buổi tập chính cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[0].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[1],
            name: "Ngày phục hồi chủ động",
            target: adaptTargetCount(input.template.tactics[1].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[2],
            name: `Ghi lại chỉ số và tiến triển ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[2].target, input.readinessScore, "optional"),
          },
        ],
        weekPlanFocuses: buildFocusPhases({
          early: "Vào guồng đều, không cố sức. Ưu tiên giữ nhịp trước tiến bộ.",
          middle: "Nhịp đã ổn, bắt đầu chú ý tới chỉ số cốt lõi và tiến bộ thực sự.",
          final: "Giữ nhịp vững cho đến hết, tránh chấn thương và ghi lại tiến triển cả chu kỳ.",
        }),
        week1Headline: "Tuần 1 chỉ cần vào guồng, không cần ép mạnh.",
        week1Support: `Mục tiêu ${goalLabel} bắt đầu bằng việc giữ nhịp đủ nhẹ để tuần nào cũng hoàn thành được mà không cần ý chí quá cao.`,
        week1CadenceHint: "Chọn 3 ngày tập cách đều nhau trong tuần, tránh 2 ngày tập liên tiếp khi mới bắt đầu guồng.",
        recommendedReviewDay: "Sunday",
        recommendedReviewReason: "Review cuối tuần hợp nhất khi mục tiêu sức khỏe cần đủ cả tuần để thấy rõ nhịp phục hồi và chất lượng tập.",
        recommendedLoadPreference: "lighter",
        recommendedLoadReason: "Bắt đầu nhẹ để vào guồng trước. Tuần sau mới tăng tải khi nhịp đã ổn định.",
        week4MilestoneSuggestion: `Nhịp ${goalLabel} đã thành thói quen và bạn không còn phải nhắc nhở bản thân phải tập.`,
        week8MilestoneSuggestion: "Chỉ số chính đã cải thiện rõ và bạn biết mình phục hồi ở tốc độ nào.",
      };
    default:
      return {
        personalizedTactics: [
          {
            ...input.template.tactics[0],
            name: `Lớp việc chính cho ${goalLabel}`,
            target: adaptTargetCount(input.template.tactics[0].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[1],
            name: "Lớp giữ nền để tuần không vỡ",
            target: adaptTargetCount(input.template.tactics[1].target, input.readinessScore, "core"),
          },
          {
            ...input.template.tactics[2],
            name: `Lớp mở rộng cho ${goalLabel} khi còn sức`,
            target: adaptTargetCount(input.template.tactics[2].target, input.readinessScore, "optional"),
          },
        ],
        weekPlanFocuses: buildFocusPhases({
          early: "Tách lớp cho rõ: việc chính, việc nền và phần chỉ làm khi còn sức.",
          middle: "Giữ lớp chính và lớp nền thật chắc trước khi chạm phần mở rộng.",
          final: "Về đích bằng sự rõ ràng: biết điều gì phải giữ và điều gì có thể nhẹ xuống.",
        }),
        week1Headline: "Tuần 1 cần tách lớp cho rõ trước khi làm nhiều.",
        week1Support: `Mục tiêu ${goalLabel} sẽ dễ đi hơn nếu tuần đầu bạn biết rõ đâu là phần bắt buộc và đâu là phần chỉ làm khi còn sức.`,
        week1CadenceHint: "Khóa slot đẹp cho lớp việc chính trước, rồi mới rải phần nền và phần mở rộng.",
        recommendedReviewDay: "Sunday",
        recommendedReviewReason: "Mục tiêu nhiều lớp cần đủ dữ liệu cả tuần để cuối tuần nhìn rõ lớp nào đáng giữ, lớp nào nên nhẹ đi.",
        recommendedLoadPreference: "lighter",
        recommendedLoadReason: "Giữ tuần hơi nhẹ giúp bạn phân lớp rõ hơn trước khi tăng thêm những phần chỉ làm khi còn sức.",
        week4MilestoneSuggestion: `Biết rõ phần nào là bắt buộc để giữ ${goalLabel} đi tiếp và phần nào chỉ nên làm khi còn sức.`,
        week8MilestoneSuggestion: "Tuần nhiều lớp hơn nhưng bạn vẫn không mất phương hướng và biết chỗ nào được phép nhẹ đi.",
      };
  }
}

export function getPaywallCopy(context: PremiumFeatureContext): {
  title: string;
  description: string;
  recommendedPlan: PricingPlanCode;
  bullets: string[];
} {
  switch (context) {
    case "template":
      return {
        title: "Mở khóa 5 khung Plus thích nghi",
        description:
          "Thay vì mò template từ đầu, chọn ngay khung đã thiết kế sẵn theo đúng kiểu mục tiêu — tìm việc, thi cử, sáng tạo, sức khỏe hay chạy dự án — rồi vào tuần đầu luôn.",
        recommendedPlan: "PLUS",
        bullets: [
          "5 khung chuyên biệt: tìm việc, học sâu, content, fitness, và tăng tốc tổng thể",
          "Tactic mẫu đủ linh hoạt để chỉnh cho bất kỳ mục tiêu cụ thể nào",
          "Gợi ý tải và nhịp tuần đầu tự động theo đặc trưng từng khung",
        ],
      };
    case "review":
      return {
        title: "Mở Plus để review thông minh hơn",
        description:
          "Review xong là biết tuần này đang lệch ở đâu và tuần sau nên giữ, giảm hay tăng tải gì.",
        recommendedPlan: "PLUS",
        bullets: [
          "Đọc tín hiệu từ score và tiến độ thật của tuần",
          "Nhận gợi ý chỉnh tải đúng lúc thay vì tự đoán",
          "Chốt tuần sau rõ hơn ngay trong lúc review",
        ],
      };
    case "reminder":
      return {
        title: "Mở Plus để giữ nhịp tốt hơn",
        description:
          "Plus không chỉ thêm nhắc việc. Nó giúp bạn ưu tiên đúng việc cần chạm trước và thấy sớm dấu hiệu rơi nhịp.",
        recommendedPlan: "PLUS",
        bullets: [
          "Nhắc việc ưu tiên đúng thứ tự quan trọng",
          "Analytics sâu hơn để nhìn rõ nhịp tuần",
          "Toàn bộ lớp premium gộp vào một gói Plus duy nhất",
        ],
      };
    default:
      return {
        title: "Mở Plus để đi nhanh và chắc hơn",
        description:
          "Free đủ để chạy một chu kỳ. Plus dành cho lúc bạn muốn bớt loay hoay, giữ nhịp đều hơn và review tốt hơn mỗi tuần.",
        recommendedPlan: "PLUS",
        bullets: [
          "Bắt đầu nhanh hơn với khung gợi ý thích nghi",
          "Giữ nhịp tốt hơn với reminder và analytics premium",
          "Review thông minh hơn với gợi ý tuần sau rõ ràng",
        ],
      };
  }
}

export function buildWeeklyReviewPremiumInsight(input: {
  weekCompletionPercent: number;
  currentScore: number;
  currentLagMetricValue: string;
  missedTasksCount: number;
  coreTacticCount: number;
  optionalTacticCount: number;
  reviewDueToday: boolean;
}): WeeklyReviewPremiumInsight {
  const {
    weekCompletionPercent,
    currentScore,
    currentLagMetricValue,
    missedTasksCount,
    coreTacticCount,
    optionalTacticCount,
    reviewDueToday,
  } = input;

  if (currentScore >= 80 && weekCompletionPercent >= 75 && missedTasksCount === 0) {
    return {
      status: "strong",
      badgeLabel: "Giữ nhịp tốt",
      headline: "Tuần này đang khá khỏe và không có dấu hiệu rơi nhịp.",
      summary: currentLagMetricValue
        ? `Chỉ số chính đã có cập nhật: ${currentLagMetricValue}. Bạn đang giữ được cả tiến độ lẫn kỷ luật thực thi.`
        : "Bạn đang giữ được cả tiến độ lẫn kỷ luật thực thi, nên chưa cần chỉnh tải nhiều.",
      recommendedAdjustment:
        optionalTacticCount > 0
          ? "Giữ nguyên phần cốt lõi. Nếu còn sức, chỉ nâng chuẩn đầu ra của 1 tactic tùy chọn."
          : "Giữ nguyên tải. Đừng thêm việc mới; chỉ tăng chất lượng đầu ra của tactic mạnh nhất.",
      coachNote: reviewDueToday
        ? "Review tuần này nên khóa sớm để giữ đà sang tuần sau."
        : "Bạn đang ở thế đẹp để bước vào review tuần với tâm thế chủ động.",
    };
  }

  if (weekCompletionPercent < 45 || missedTasksCount >= 3) {
    return {
      status: "at_risk",
      badgeLabel: "Có nguy cơ rơi nhịp",
      headline: "Tuần này có dấu hiệu ôm quá tay hoặc để nhịp bị đứt.",
      summary:
        missedTasksCount > 0
          ? `Bạn đang có ${missedTasksCount} việc trễ. Nếu tiếp tục giữ cùng tải, tuần sau rất dễ nặng đầu.`
          : "Mức hoàn thành tuần đang thấp so với nhịp lý tưởng của một chu kỳ 12 tuần.",
      recommendedAdjustment:
        coreTacticCount > 2
          ? "Giảm tải bằng cách giữ lại 1-2 tactic cốt lõi mạnh nhất, còn lại đẩy sang optional."
          : "Giữ một ưu tiên duy nhất cho tuần sau và dời bớt phần tùy chọn sang cuối tuần.",
      coachNote: reviewDueToday
        ? "Review lần này nên chốt theo hướng nhẹ hơn để tuần sau bắt đầu lại gọn."
        : "Bạn có thể viết sẵn quyết định giảm tải ngay từ bây giờ để đến ngày review chỉ việc khóa lại.",
    };
  }

  return {
    status: "watch",
    badgeLabel: "Cần giữ tập trung",
    headline: "Nhịp tuần vẫn ổn, nhưng khá dễ loãng nếu tuần sau tiếp tục dàn đều quá nhiều thứ.",
    summary:
      optionalTacticCount > 0
        ? `Bạn đang giữ ${coreTacticCount} tactic cốt lõi và ${optionalTacticCount} tactic tùy chọn. Vấn đề lớn nhất lúc này là độ loãng chứ không phải thiếu cố gắng.`
        : "Bạn đang giữ được nhịp cơ bản, nhưng cần một ưu tiên tuần sau đủ rõ để điểm tuần bật lên.",
    recommendedAdjustment:
      "Khóa một ưu tiên duy nhất cho tuần sau, rồi để mọi tactic còn lại phục vụ ưu tiên đó thay vì chạy song song.",
    coachNote: currentLagMetricValue
      ? `Hãy dùng chỉ số "${currentLagMetricValue}" như tín hiệu chính khi review, đừng để nhiều metric kéo bạn lệch hướng.`
      : "Nếu chưa cập nhật chỉ số chính, hãy chốt một cách đo thật ngắn gọn trước khi khóa review.",
  };
}

function sortIndicatorsByPriority(indicators: LeadIndicator[]): LeadIndicator[] {
  return [...indicators].sort((left, right) => {
    const leftPriority = left.priority ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = right.priority ?? Number.MAX_SAFE_INTEGER;

    return leftPriority - rightPriority || left.name.localeCompare(right.name);
  });
}

export function buildSuggestedNextWeekPlan(input: {
  insight: WeeklyReviewPremiumInsight;
  currentPlanFocus: string;
  currentPlanMilestone: string;
  weekCompletionPercent: number;
  currentScore: number;
  missedTasksCount: number;
  coreIndicators: LeadIndicator[];
  optionalIndicators: LeadIndicator[];
}): SuggestedNextWeekPlan {
  const sortedCoreIndicators = sortIndicatorsByPriority(input.coreIndicators);
  const sortedOptionalIndicators = sortIndicatorsByPriority(input.optionalIndicators);
  const protectedCoreNames =
    input.insight.status === "at_risk"
      ? sortedCoreIndicators.slice(0, 1).map((indicator) => indicator.name)
      : sortedCoreIndicators.slice(0, 2).map((indicator) => indicator.name);
  const primaryCore = protectedCoreNames[0] ?? sortedCoreIndicators[0]?.name ?? "tactic cốt lõi chính";
  const nextMilestone =
    input.currentPlanMilestone.trim() ||
    input.currentPlanFocus.trim() ||
    "một ưu tiên duy nhất để kéo nhịp tuần đi lên";

  if (input.insight.status === "strong") {
    const stretchItems =
      sortedOptionalIndicators.length > 0
        ? sortedOptionalIndicators.slice(0, 2).map((indicator) => indicator.name)
        : [`Nâng chuẩn đầu ra của ${primaryCore}`];

    return {
      focus: `Giữ ${primaryCore} làm trục chính và đẩy nó tiến gần hơn tới "${nextMilestone}".`,
      workloadDecision:
        input.currentScore >= 90 && input.missedTasksCount === 0 ? "increase slightly" : "keep same",
      rationale:
        "Tuần này đang khỏe. Tuần sau không cần thêm quá nhiều thứ mới, chỉ cần giữ khung cốt lõi và nâng chuẩn ở đúng điểm mạnh nhất.",
      protectTactics: protectedCoreNames.length > 0 ? protectedCoreNames : [primaryCore],
      secondaryTrackLabel: "Nếu còn sức",
      secondaryTrackItems: stretchItems,
      firstMove: `Khóa 3 ngày đầu tuần xoay quanh ${primaryCore}, rồi mới nhận thêm phần mở rộng.`,
    };
  }

  if (input.insight.status === "at_risk") {
    const pauseItems =
      sortedOptionalIndicators.length > 0
        ? sortedOptionalIndicators.slice(0, 2).map((indicator) => indicator.name)
        : sortedCoreIndicators.slice(1, 3).map((indicator) => indicator.name);

    return {
      focus: `Chỉ giữ ${primaryCore} làm ưu tiên kéo tuần sau đi lên, còn lại để nhẹ xuống.`,
      workloadDecision: "reduce slightly",
      rationale:
        input.missedTasksCount > 0
          ? `Bạn đang có ${input.missedTasksCount} việc trễ. Tuần sau nên thắng bằng độ gọn trước khi nghĩ tới tăng tốc.`
          : "Nhịp tuần vừa rồi bị loãng nên tuần sau cần thu gọn tải và khóa lại một trục chính rõ hơn.",
      protectTactics: protectedCoreNames.length > 0 ? protectedCoreNames : [primaryCore],
      secondaryTrackLabel: "Tạm buông",
      secondaryTrackItems:
        pauseItems.length > 0 ? pauseItems : ["Không thêm tactic mới trong nửa đầu tuần sau."],
      firstMove: `Dời phần tùy chọn xuống cuối tuần và chỉ để ${primaryCore} chiếm các slot đẹp nhất.`,
    };
  }

  const focusAnchor =
    input.weekCompletionPercent >= 60
      ? `Giữ ${primaryCore} làm trục, rồi gom mọi việc còn lại về mục tiêu "${nextMilestone}".`
      : `Khóa lại ${primaryCore} thành ưu tiên duy nhất của tuần sau để điểm tuần bật lên rõ hơn.`;

  return {
    focus: focusAnchor,
    workloadDecision: "keep same",
    rationale:
      "Tuần này chưa xấu, nhưng rất dễ bị loãng nếu tuần sau tiếp tục chạy song song quá nhiều thứ. Điều quan trọng nhất là khóa lại một trục thật rõ.",
    protectTactics: protectedCoreNames.length > 0 ? protectedCoreNames : [primaryCore],
    secondaryTrackLabel: "Đừng để loãng",
    secondaryTrackItems:
      sortedOptionalIndicators.length > 0
        ? sortedOptionalIndicators
            .slice(0, 2)
            .map((indicator) => `Chỉ chạm ${indicator.name} khi ưu tiên chính đã xong.`)
        : ["Không thêm mục tiêu mới giữa tuần."],
    firstMove: `Mở tuần bằng một đầu ra nhỏ nhưng rõ cho ${primaryCore}, rồi mới lan sang phần còn lại.`,
  };
}
