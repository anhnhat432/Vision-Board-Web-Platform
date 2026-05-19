import type { LeadIndicatorCommitment } from "@/app/utils/storage";
import type { LeadIndicatorDraft } from "./types";

export type LeadIndicatorSuggestionProfile = "business_analyst" | "generic";

const BUSINESS_ANALYST_KEYWORDS: readonly RegExp[] = [
  /business\s+analyst/iu,
  /\bba\b/iu,
  /quản\s*lý\s*thư\s*viện/iu,
  /quan\s*ly\s*thu\s*vien/iu,
  /chứng\s*chỉ/iu,
  /chung\s*chi/iu,
  /requirement/iu,
  /user\s*story/iu,
];

function createSuggestionId(index: number): string {
  return `suggested_indicator_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

function createCommitment(input: Omit<LeadIndicatorCommitment, "filledAt">): LeadIndicatorCommitment {
  return {
    ...input,
    filledAt: new Date().toISOString(),
  };
}

export function detectGoalSuggestionProfile(goalText: string): LeadIndicatorSuggestionProfile {
  return BUSINESS_ANALYST_KEYWORDS.some((pattern) => pattern.test(goalText)) ? "business_analyst" : "generic";
}

type LeadIndicatorSuggestionSeed = Omit<LeadIndicatorDraft, "id" | "commitment"> & {
  commitment?: Omit<LeadIndicatorCommitment, "filledAt">;
};

export function buildLeadIndicatorSuggestions(profile: LeadIndicatorSuggestionProfile): LeadIndicatorDraft[] {
  const suggestions: readonly LeadIndicatorSuggestionSeed[] =
    profile === "business_analyst" ? BUSINESS_ANALYST_SUGGESTIONS : GENERIC_SUGGESTIONS;

  return suggestions.map((suggestion, index) => ({
    ...suggestion,
    id: createSuggestionId(index),
    commitment: suggestion.commitment ? createCommitment(suggestion.commitment) : undefined,
  }));
}

export function isBlankLeadIndicatorList(indicators: LeadIndicatorDraft[]): boolean {
  return indicators.every((indicator) => {
    const hasCommitment = indicator.commitment
      ? [
          indicator.commitment.want,
          indicator.commitment.cost,
          indicator.commitment.means,
          indicator.commitment.tradeoff,
          indicator.commitment.reward,
        ].some((value) => value.trim().length > 0)
      : false;
    const hasUserTarget = indicator.target.trim() && !["1", "2"].includes(indicator.target.trim());
    const hasUserUnit = indicator.unit.trim() && indicator.unit.trim() !== "lần/tuần";

    return indicator.name.trim().length === 0 && !hasCommitment && !hasUserTarget && !hasUserUnit;
  });
}

export function getLeadIndicatorPlaceholder(profile: LeadIndicatorSuggestionProfile, field: "name" | keyof LeadIndicatorCommitment): string {
  const placeholders = profile === "business_analyst" ? BUSINESS_ANALYST_PLACEHOLDERS : GENERIC_PLACEHOLDERS;
  return placeholders[field];
}

export function getLeadIndicatorIntroExamples(profile: LeadIndicatorSuggestionProfile): readonly string[] {
  return profile === "business_analyst" ? BUSINESS_ANALYST_INTRO_EXAMPLES : GENERIC_INTRO_EXAMPLES;
}

export function getLagMetricSuggestion(profile: LeadIndicatorSuggestionProfile): {
  name: string;
  target: string;
  unit: string;
} {
  if (profile === "business_analyst") {
    return {
      name: "Số đầu ra BA đã hoàn thiện",
      target: "2",
      unit: "đầu ra/tuần",
    };
  }

  return {
    name: "Số đầu ra đã hoàn thiện",
    target: "2",
    unit: "đầu ra/tuần",
  };
}

export function isGenericLagMetricValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === "chỉ số kết quả chính" ||
    normalized === "chi so ket qua chinh" ||
    normalized === "metric" ||
    normalized === "kết quả" ||
    normalized === "ket qua"
  );
}

const BUSINESS_ANALYST_INTRO_EXAMPLES = [
  "Học kiến thức BA và ghi chú ý chính",
  "Làm tài liệu BA cho dự án quản lý thư viện",
  "Ôn thuật ngữ BA cuối tuần",
] as const;

const GENERIC_INTRO_EXAMPLES = [
  "Học kiến thức nền và ghi chú ý chính",
  "Thực hành tạo đầu ra cụ thể",
  "Ôn lại và điều chỉnh kế hoạch cuối tuần",
] as const;

const BUSINESS_ANALYST_PLACEHOLDERS: Record<"name" | keyof LeadIndicatorCommitment, string> = {
  name: "Học kiến thức BA và ghi chú ý chính",
  want: "Mỗi phiên học ít nhất 45 phút, ghi lại 5 ý chính và 1 ví dụ áp dụng vào dự án quản lý thư viện.",
  cost: "Tôi sẵn sàng dành 2 buổi mỗi tuần để làm việc này, kể cả khi hơi lười hoặc bận việc cá nhân.",
  means: "Mỗi buổi học một chủ đề như requirement, stakeholder, user story, use case hoặc process flow.",
  tradeoff: "Tôi sẽ giảm thời gian lướt mạng xã hội, xem YouTube hoặc chơi game vào buổi tối.",
  reward: "Nếu hoàn thành đủ trong tuần, tôi sẽ tự thưởng một món đồ uống yêu thích hoặc một buổi nghỉ thoải mái.",
  filledAt: "",
};

const GENERIC_PLACEHOLDERS: Record<"name" | keyof LeadIndicatorCommitment, string> = {
  name: "Học kiến thức nền và ghi chú ý chính",
  want: "Mỗi phiên làm ít nhất 45 phút và ghi lại kết quả cụ thể sau khi xong.",
  cost: "Tôi sẵn sàng dành 2 buổi mỗi tuần để làm việc này, kể cả khi hơi lười hoặc bận việc cá nhân.",
  means: "Chọn một phần nhỏ, làm xong trong một phiên, sau đó ghi lại kết quả.",
  tradeoff: "Tôi sẽ giảm thời gian lướt mạng xã hội, xem YouTube hoặc chơi game vào buổi tối.",
  reward: "Nếu hoàn thành đủ trong tuần, tôi sẽ tự thưởng một món đồ uống yêu thích hoặc một buổi nghỉ thoải mái.",
  filledAt: "",
};

const BUSINESS_ANALYST_SUGGESTIONS: readonly LeadIndicatorSuggestionSeed[] = [
  {
    name: "Học kiến thức BA và ghi chú ý chính",
    type: "core",
    cadence: "spread",
    target: "2",
    unit: "phiên/tuần",
    commitment: {
      want: "Mỗi phiên học ít nhất 45 phút, ghi lại khái niệm chính và ví dụ áp dụng vào dự án quản lý thư viện.",
      cost: "Tôi sẵn sàng dành 2 buổi mỗi tuần để học BA đều đặn.",
      means: "Mỗi buổi học một chủ đề như requirement, stakeholder, user story, use case hoặc process flow.",
      tradeoff: "Tôi sẽ giảm thời gian lướt mạng xã hội hoặc chơi game vào buổi tối.",
      reward: "Nếu hoàn thành đủ buổi học trong tuần, tôi sẽ tự thưởng một món đồ uống yêu thích.",
    },
  },
  {
    name: "Làm tài liệu BA cho dự án quản lý thư viện",
    type: "core",
    cadence: "spread",
    target: "2",
    unit: "phiên/tuần",
    commitment: {
      want: "Mỗi tuần hoàn thiện ít nhất một đầu ra BA như requirement list, user story, use case, activity diagram, user flow hoặc wireframe.",
      cost: "Tôi sẵn sàng chỉnh sửa tài liệu và trao đổi với nhóm nếu yêu cầu chưa rõ.",
      means: "Chọn một phần của dự án quản lý thư viện, phân tích yêu cầu và tạo tài liệu BA tương ứng.",
      tradeoff: "Tôi sẽ giảm việc nhảy thẳng vào code khi chưa rõ yêu cầu.",
      reward: "Nếu có ít nhất một tài liệu BA hoàn chỉnh trong tuần, tôi sẽ tự thưởng một buổi xem phim hoặc nghỉ ngơi.",
    },
  },
  {
    name: "Ôn thuật ngữ BA và kiểm tra lại kiến thức",
    type: "optional",
    cadence: "backload",
    target: "1",
    unit: "lần/tuần",
    commitment: {
      want: "Cuối tuần ôn lại kiến thức đã học, tạo flashcard thuật ngữ BA và ghi ra phần chưa hiểu.",
      cost: "Tôi sẵn sàng dành 30-45 phút cuối tuần để ôn lại thay vì bỏ qua.",
      means: "Xem lại ghi chú, tạo flashcard và tự giải thích thuật ngữ bằng lời của mình.",
      tradeoff: "Tôi sẽ giảm việc học dồn sát deadline và chỉ đọc qua mà không ôn.",
      reward: "Nếu ôn đủ cuối tuần, tôi sẽ cho phép mình nghỉ ngơi thoải mái hơn.",
    },
  },
];

const GENERIC_SUGGESTIONS: readonly LeadIndicatorSuggestionSeed[] = [
  {
    name: "Học kiến thức nền và ghi chú ý chính",
    type: "core",
    cadence: "spread",
    target: "2",
    unit: "phiên/tuần",
  },
  {
    name: "Thực hành tạo đầu ra cụ thể",
    type: "core",
    cadence: "spread",
    target: "2",
    unit: "phiên/tuần",
  },
  {
    name: "Ôn lại và điều chỉnh kế hoạch cuối tuần",
    type: "optional",
    cadence: "backload",
    target: "1",
    unit: "lần/tuần",
  },
];
