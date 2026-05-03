import type { GoalArchetype } from "@/lib/smart-goal";

import { getArchetypeFeasibilityOverride } from "./archetypeCopy";
import { QUESTIONS } from "./constants";
import type {
  AxisScore,
  FeasibilityAxis,
  FeasibilityBottleneck,
  PlanLoadRecommendation,
  Question,
  ResultData,
  ResultType,
  SmartGoalQualityBridge,
  WeeklyCapacity,
} from "./types";

export interface BuildResultOptions {
  smartGoalQualityLevel?: SmartGoalQualityBridge;
  /**
   * Optional goal archetype used to tune human-readable copy
   * (firstWeekGuidance, scopeRecommendation, bottleneck overlay note).
   * Numeric scoring is unaffected by this option.
   */
  goalArchetype?: GoalArchetype;
}

function getWheelPenalty(score: number): number {
  if (score <= 3) return 3;
  if (score <= 5) return 2;
  if (score <= 7) return 1;
  return 0;
}

function getSelectedOption(answers: Record<number, string>, question: Question) {
  const answer = answers[question.id];
  return question.options.find((choice) => choice.value === answer) ?? question.options[0];
}

function getBottleneckAction(axis: FeasibilityAxis | "wheel"): string {
  switch (axis) {
    case "time":
      return "Giảm số việc, khóa ít khung giờ cố định và tránh làm tuần đầu quá dày.";
    case "energy":
      return "Thiết kế tuần đầu nhẹ hơn, ưu tiên bước nhỏ dễ hoàn thành sau ngày bận.";
    case "resources":
      return "Thêm một bước chuẩn bị hoặc học nhanh trước khi yêu cầu đầu ra lớn.";
    case "clarity":
      return "Thu hẹp mục tiêu 12 tuần để chỉ còn một kết quả chính có thể đo được.";
    case "obstacle":
      return "Biến trở ngại chính thành nguyên tắc khi lập kế hoạch, không chỉ là ghi chú cảnh báo.";
    case "routine":
      return "Khóa khung giờ cố định trước, rồi mới tăng số lượng việc cần làm.";
    case "confidence":
      return "Tạo một tuần đầu dễ hoàn thành để tăng niềm tin trước khi nâng độ khó.";
    case "wheel":
      return "Giữ mục tiêu nhỏ hơn vì nền hiện tại của lĩnh vực này còn chưa vững.";
  }
}

function getWeeklyCapacity(answers: Record<number, string>): WeeklyCapacity {
  const timeAnswer = answers[1];
  if (timeAnswer === "lt1" || timeAnswer === "1to3") return "low";
  if (timeAnswer === "3to5") return "medium";
  return "high";
}

function getPlanLoadRecommendation(input: {
  adjustedScore: number;
  bottleneck: FeasibilityBottleneck;
  weeklyCapacity: WeeklyCapacity;
}): PlanLoadRecommendation {
  if (input.adjustedScore <= 10 || input.weeklyCapacity === "low") return "lighter";
  if (input.bottleneck.score <= 2 && input.bottleneck.axis !== "wheel") return "lighter";
  if (input.adjustedScore >= 17 && input.weeklyCapacity === "high") return "push";
  return "balanced";
}

function getPrePlanAction(bottleneck: FeasibilityBottleneck): string {
  switch (bottleneck.axis) {
    case "time":
      return "khóa ít nhất 2 khung giờ cố định trong tuần cho mục tiêu này";
    case "energy":
      return "chọn thời điểm trong ngày bạn còn năng lượng nhất để làm việc chính";
    case "resources":
      return "xác định 1-2 nguồn lực hoặc kỹ năng cần bổ sung ngay tuần đầu";
    case "clarity":
      return "thu hẹp mục tiêu về một kết quả chính duy nhất có thể đo được trong 12 tuần";
    case "obstacle":
      return "viết ra trở ngại chính và quyết định cách xử lý trước khi bắt đầu";
    case "routine":
      return "khóa lịch cố định cho mục tiêu trước khi thêm bất kỳ việc mới nào";
    case "confidence":
      return "chọn một bước nhỏ nhất bạn chắc chắn hoàn thành được trong tuần đầu";
    case "wheel":
      return "cân nhắc củng cố nền tảng lĩnh vực này song song với mục tiêu";
  }
}

function getSmartGoalQualityNote(
  qualityLevel: SmartGoalQualityBridge | undefined,
): string | undefined {
  if (qualityLevel === "weak") {
    return "Mục tiêu viết chưa đủ rõ ràng. Nên quay lại bước viết mục tiêu để làm rõ kết quả cần đạt, con số đo và lý do trước khi tạo kế hoạch 12 tuần.";
  }
  return undefined;
}

function buildPlanGuidance(input: {
  resultType: ResultType;
  bottleneck: FeasibilityBottleneck;
  planLoad: PlanLoadRecommendation;
  weeklyCapacity: WeeklyCapacity;
  smartGoalQualityLevel?: SmartGoalQualityBridge;
}) {
  const qualitySuffix =
    input.smartGoalQualityLevel === "weak"
      ? " Ngoài ra, mục tiêu viết chưa rõ — nên làm rõ kết quả và con số trước khi bắt đầu."
      : "";

  if (input.resultType === "too_ambitious") {
    return {
      firstWeekGuidance:
        "Tuần 1 chỉ nên có 1-2 hành động bắt buộc, ưu tiên tạo nhịp thắng nhỏ thay vì chứng minh năng lực.",
      scopeRecommendation:
        `Thu nhỏ mục tiêu 12 tuần hoặc kéo dài thời hạn trước khi tăng độ khó.${qualitySuffix}`,
    };
  }

  if (input.planLoad === "lighter") {
    return {
      firstWeekGuidance: `Tuần 1 nên nhẹ hơn vì phần cần chú ý nhất là ${input.bottleneck.label.toLowerCase()}.`,
      scopeRecommendation:
        `Giữ 2 việc chính, bỏ bớt phần mở rộng cho đến khi nhịp ổn định.${qualitySuffix}`,
    };
  }

  if (input.planLoad === "push") {
    return {
      firstWeekGuidance:
        "Tuần 1 có thể thử thách hơn một chút, nhưng vẫn cần nhìn lại sớm để tránh ôm quá nhiều.",
      scopeRecommendation:
        `Có thể dùng 3-4 việc lặp lại nếu mỗi việc có lịch rõ và đo được.${qualitySuffix}`,
    };
  }

  return {
    firstWeekGuidance: "Tuần 1 nên cân bằng: đủ rõ để tiến lên, đủ nhẹ để không mất nhịp.",
    scopeRecommendation:
      `Giữ một kết quả chính, 2-3 việc lặp lại và một buổi nhìn lại cố định.${qualitySuffix}`,
  };
}

export function buildResult(
  answers: Record<number, string>,
  wheelScore: number,
  options?: BuildResultOptions,
): ResultData {
  const goalArchetype = options?.goalArchetype;
  const axisScores: AxisScore[] = QUESTIONS.map((question) => {
    const option = getSelectedOption(answers, question);
    return {
      axis: question.axis,
      label: question.axisLabel,
      score: option.score,
      maxScore: 4,
      percent: Math.round((option.score / 4) * 100),
      diagnostic: option.diagnostic,
    };
  });

  const diagnosticScore = axisScores.reduce((sum, item) => sum + item.score, 0);
  const maxDiagnosticScore = QUESTIONS.length * 4;
  const readinessScore = Math.round((diagnosticScore / maxDiagnosticScore) * 20);
  const wheelPenalty = getWheelPenalty(wheelScore);
  const adjustedScore = readinessScore - wheelPenalty;
  const weakestAxis = [...axisScores].sort((a, b) => a.score - b.score)[0];
  const bottleneck =
    wheelScore <= 4 && wheelScore / 10 < weakestAxis.score / weakestAxis.maxScore
      ? {
          axis: "wheel" as const,
          label: "Nền lĩnh vực hiện tại",
          score: wheelScore,
          action: getBottleneckAction("wheel"),
        }
      : {
          axis: weakestAxis.axis,
          label: weakestAxis.label,
          score: weakestAxis.score,
          action: getBottleneckAction(weakestAxis.axis),
        };
  const weeklyCapacity = getWeeklyCapacity(answers);
  const smartGoalQualityLevel = options?.smartGoalQualityLevel;

  const resultType: ResultType =
    adjustedScore >= 15 ? "realistic" : adjustedScore >= 10 ? "challenging" : "too_ambitious";
  const planLoad = getPlanLoadRecommendation({ adjustedScore, bottleneck, weeklyCapacity });
  const guidance = buildPlanGuidance({ resultType, bottleneck, planLoad, weeklyCapacity, smartGoalQualityLevel });
  const prePlanAction = getPrePlanAction(bottleneck);
  const smartGoalQualityNote = getSmartGoalQualityNote(smartGoalQualityLevel);

  const resultCopy: Record<ResultType, Pick<ResultData, "title" | "summary" | "recommendation">> = {
    realistic: {
      title: "Mục tiêu này đủ thực tế nếu giữ đúng độ nặng.",
      summary: `Đánh giá dựa trên ${QUESTIONS.length} góc nhìn cho thấy bạn có thể bắt đầu. Phần cần chú ý nhất là ${bottleneck.label.toLowerCase()}, nên kế hoạch 12 tuần cần xử lý phần này ngay từ tuần đầu.`,
      recommendation:
        planLoad === "push"
          ? `Trước khi tạo kế hoạch 12 tuần, hãy ${prePlanAction}. Sau đó có thể thử thách hơn một chút, nhưng vẫn cần nhìn lại sớm.`
          : `Trước khi tạo kế hoạch 12 tuần, hãy ${prePlanAction}. Sau đó giữ nhịp rõ, ít việc và nhìn lại đều.`,
    },
    challenging: {
      title: "Mục tiêu này làm được, nhưng phải xử lý đúng phần yếu nhất.",
      summary: `Kết quả không chỉ dựa vào cảm giác chung. Phần yếu nhất hiện tại là ${bottleneck.label.toLowerCase()}, nên nếu bỏ qua nó thì kế hoạch 12 tuần rất dễ dày lên nhưng khó giữ.`,
      recommendation:
        `Trước khi tạo kế hoạch 12 tuần: ${prePlanAction}. Thu hẹp mục tiêu, chọn ít việc chính hơn và biến ${bottleneck.label.toLowerCase()} thành nguyên tắc cho tuần đầu.`,
    },
    too_ambitious: {
      title: "Mục tiêu này cần thu nhỏ trước khi tạo kế hoạch 12 tuần.",
      summary: `Một vài nền tảng hiện tại chưa đủ chắc, đặc biệt là ${bottleneck.label.toLowerCase()}. Nếu giữ nguyên độ rộng, rủi ro lớn nhất là bắt đầu hăng nhưng mất nhịp sớm.`,
      recommendation:
        `Trước khi tạo kế hoạch 12 tuần: ${prePlanAction}. Chọn phiên bản nhỏ hơn của mục tiêu, giữ tuần đầu rất nhẹ và chỉ tăng độ khó khi nhịp ổn.`,
    },
  };

  const archetypeOverride = getArchetypeFeasibilityOverride(
    goalArchetype,
    resultType,
    bottleneck.axis,
  );

  const finalBottleneck: FeasibilityBottleneck = archetypeOverride.bottleneckOverlayNote
    ? { ...bottleneck, action: `${bottleneck.action} ${archetypeOverride.bottleneckOverlayNote}` }
    : bottleneck;

  // Archetype override replaces generic firstWeek / scope copy when present,
  // but we preserve the smartGoalQualityLevel suffix so "weak" goals still
  // get the "mục tiêu viết chưa rõ" nudge appended.
  const qualitySuffix =
    smartGoalQualityLevel === "weak"
      ? " Ngoài ra, mục tiêu viết chưa rõ — nên làm rõ kết quả và con số trước khi bắt đầu."
      : "";
  const firstWeekGuidance = archetypeOverride.firstWeekGuidance ?? guidance.firstWeekGuidance;
  const scopeRecommendation = archetypeOverride.scopeRecommendation
    ? `${archetypeOverride.scopeRecommendation}${qualitySuffix}`
    : guidance.scopeRecommendation;

  return {
    type: resultType,
    ...resultCopy[resultType],
    readinessScore,
    adjustedScore: Math.max(0, adjustedScore),
    wheelScore,
    diagnosticScore,
    maxDiagnosticScore,
    axisScores,
    bottleneck: finalBottleneck,
    planLoad,
    weeklyCapacity,
    firstWeekGuidance,
    scopeRecommendation,
    smartGoalQualityLevel,
    smartGoalQualityNote,
  };
}
