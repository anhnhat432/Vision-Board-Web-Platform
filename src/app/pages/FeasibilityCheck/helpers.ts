import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";

import { QUESTIONS } from "./constants";
import { getArchetypeFeasibilityOverride } from "./archetypeCopy";
import type {
  AxisScore,
  FeasibilityAxis,
  FeasibilityBottleneck,
  PlanLoadRecommendation,
  Question,
  ResultData,
  ResultType,
  WeeklyCapacity,
} from "./types";

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

function buildPlanGuidance(input: {
  resultType: ResultType;
  bottleneck: FeasibilityBottleneck;
  planLoad: PlanLoadRecommendation;
  weeklyCapacity: WeeklyCapacity;
}) {
  if (input.resultType === "too_ambitious") {
    return {
      firstWeekGuidance:
        "Tuần 1 chỉ nên có 1-2 hành động bắt buộc, ưu tiên tạo nhịp thắng nhỏ thay vì chứng minh năng lực.",
      scopeRecommendation: "Thu nhỏ mục tiêu 12 tuần hoặc kéo dài thời hạn trước khi tăng độ khó.",
    };
  }

  if (input.planLoad === "lighter") {
    return {
      firstWeekGuidance: `Tuần 1 nên nhẹ hơn vì phần cần chú ý nhất là ${input.bottleneck.label.toLowerCase()}.`,
      scopeRecommendation: "Giữ 2 việc chính, bỏ bớt phần mở rộng cho đến khi nhịp ổn định.",
    };
  }

  if (input.planLoad === "push") {
    return {
      firstWeekGuidance: "Tuần 1 có thể thử thách hơn một chút, nhưng vẫn cần nhìn lại sớm để tránh ôm quá nhiều.",
      scopeRecommendation: "Có thể dùng 3-4 việc lặp lại nếu mỗi việc có lịch rõ và đo được.",
    };
  }

  return {
    firstWeekGuidance: "Tuần 1 nên cân bằng: đủ rõ để tiến lên, đủ nhẹ để không mất nhịp.",
    scopeRecommendation: "Giữ một kết quả chính, 2-3 việc lặp lại và một buổi nhìn lại cố định.",
  };
}

export function buildResult(
  answers: Record<number, string>,
  wheelScore: number,
  goalArchetype?: GoalArchetype,
): ResultData {
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

  const resultType: ResultType =
    adjustedScore >= 15 ? "realistic" : adjustedScore >= 10 ? "challenging" : "too_ambitious";
  const planLoad = getPlanLoadRecommendation({ adjustedScore, bottleneck, weeklyCapacity });
  const guidance = buildPlanGuidance({ resultType, bottleneck, planLoad, weeklyCapacity });

  const resultCopy: Record<ResultType, Pick<ResultData, "title" | "summary" | "recommendation">> = {
    realistic: {
      title: "Mục tiêu này đủ thực tế nếu giữ đúng độ nặng.",
      summary: `Đánh giá dựa trên ${QUESTIONS.length} góc nhìn cho thấy bạn có thể bắt đầu. Phần cần chú ý nhất là ${bottleneck.label.toLowerCase()}, nên kế hoạch 12 tuần cần xử lý phần này ngay từ tuần đầu.`,
      recommendation:
        planLoad === "push"
          ? "Bạn có thể thử thách hơn một chút, nhưng vẫn cần nhìn lại sớm để không mở rộng quá tay."
          : "Bạn có thể đi tiếp sang kế hoạch 12 tuần với nhịp rõ, ít việc và nhìn lại đều.",
    },
    challenging: {
      title: "Mục tiêu này làm được, nhưng phải xử lý đúng phần yếu nhất.",
      summary: `Kết quả không chỉ dựa vào cảm giác chung. Phần yếu nhất hiện tại là ${bottleneck.label.toLowerCase()}, nên nếu bỏ qua nó thì kế hoạch 12 tuần rất dễ dày lên nhưng khó giữ.`,
      recommendation:
        "Nên thu hẹp mục tiêu, chọn ít việc chính hơn và biến phần cần chú ý nhất thành nguyên tắc cho tuần đầu.",
    },
    too_ambitious: {
      title: "Mục tiêu này cần thu nhỏ trước khi tạo kế hoạch 12 tuần.",
      summary: `Một vài nền tảng hiện tại chưa đủ chắc, đặc biệt là ${bottleneck.label.toLowerCase()}. Nếu giữ nguyên độ rộng, rủi ro lớn nhất là bắt đầu hăng nhưng mất nhịp sớm.`,
      recommendation:
        "Hãy chọn phiên bản nhỏ hơn của mục tiêu, giữ tuần đầu rất nhẹ và chỉ tăng độ khó khi phần nhìn lại hằng tuần cho thấy bạn giữ được nhịp.",
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
    firstWeekGuidance: archetypeOverride.firstWeekGuidance ?? guidance.firstWeekGuidance,
    scopeRecommendation:
      archetypeOverride.scopeRecommendation ?? guidance.scopeRecommendation,
  };
}
