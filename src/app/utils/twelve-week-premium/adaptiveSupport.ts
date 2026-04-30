import type { TacticType } from "../storage-types";
import type { AdaptiveTemplateRecommendation, AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "./types";

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
      reason:
        "Độ sẵn sàng hiện tại khá tốt, nên bạn có thể tăng tốc nhẹ nhưng vẫn cần một khung đủ kiểm soát để không bị loãng.",
    };
  }

  return {
    templateId: "strength-and-energy-system",
    reason:
      "Mục tiêu này nên đi theo kiểu nhiều lớp nhưng vẫn có trục cốt lõi rõ, để tuần không bị nặng đầu khi việc bắt đầu chồng lên nhau.",
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

function buildFocusPhases(input: { early: string; middle: string; final: string }): string[] {
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
        recommendedReviewReason:
          "Review cuối tuần hợp hơn với kiểu tích lũy đều, vì bạn sẽ có đủ cả tuần để nhìn ra nhịp thật.",
        recommendedLoadPreference: "balanced",
        recommendedLoadReason:
          "Kiểu mục tiêu này thắng nhờ đều và bền, nên cân bằng thường tốt hơn là ép mạnh hay hạ quá nhẹ.",
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
        recommendedReviewReason:
          "Review vào thứ Sáu giúp bạn khóa đầu ra sớm và còn cuối tuần để thở hoặc chuẩn bị vòng tiếp theo.",
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
        recommendedReviewReason:
          "Với kiểu tăng tốc có kiểm soát, khóa tuần vào thứ Sáu giúp bạn hãm lại đúng lúc trước khi tuần mới bắt đầu.",
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
        recommendedReviewReason:
          "Review cuối tuần giúp bạn nhìn rõ tuần học được bao nhiêu, còn cách deadline bao xa và cần điều chỉnh tốc độ không.",
        recommendedLoadPreference: "balanced",
        recommendedLoadReason:
          "Học cho thi cần đều và ổn định, không nên ép quá mạnh ở đầu rồi mất sức trước ngày thi.",
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
        recommendedReviewReason:
          "Review cuối tuần hợp nhất khi mục tiêu sức khỏe cần đủ cả tuần để thấy rõ nhịp phục hồi và chất lượng tập.",
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
        recommendedReviewReason:
          "Mục tiêu nhiều lớp cần đủ dữ liệu cả tuần để cuối tuần nhìn rõ lớp nào đáng giữ, lớp nào nên nhẹ đi.",
        recommendedLoadPreference: "lighter",
        recommendedLoadReason:
          "Giữ tuần hơi nhẹ giúp bạn phân lớp rõ hơn trước khi tăng thêm những phần chỉ làm khi còn sức.",
        week4MilestoneSuggestion: `Biết rõ phần nào là bắt buộc để giữ ${goalLabel} đi tiếp và phần nào chỉ nên làm khi còn sức.`,
        week8MilestoneSuggestion:
          "Tuần nhiều lớp hơn nhưng bạn vẫn không mất phương hướng và biết chỗ nào được phép nhẹ đi.",
      };
  }
}
