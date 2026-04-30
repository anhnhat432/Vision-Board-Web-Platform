import type { LeadIndicator } from "../storage-types";
import type { SuggestedNextWeekPlan, WeeklyReviewPremiumInsight } from "./types";

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
      workloadDecision: input.currentScore >= 90 && input.missedTasksCount === 0 ? "increase slightly" : "keep same",
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
      secondaryTrackItems: pauseItems.length > 0 ? pauseItems : ["Không thêm tactic mới trong nửa đầu tuần sau."],
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
