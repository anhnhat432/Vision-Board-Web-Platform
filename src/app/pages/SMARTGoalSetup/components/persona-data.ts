import type { GoalArchetype } from "@/lib/smart-goal";
import type { SmartStepKey } from "../types";

export type PersonaTone = "empathetic" | "pragmatic" | "strategic";

export interface PersonaResult {
  coachComment: string;
  goalDraft: string;
  coreTextToApply: string;
}

const DEFAULT_PERSONA: PersonaResult = {
  coachComment: "Gợi ý cấu trúc mục tiêu cho bước này của bạn:",
  goalDraft: "",
  coreTextToApply: "",
};

interface SpecificReplacements {
  [key: string]: { pragmatic: string; strategic: string };
}

const SPECIFIC_REPLACEMENTS: SpecificReplacements = {
  "Hoàn thành một kết quả quan trọng trong 12 tuần để cải thiện lĩnh vực đang ưu tiên và có bằng chứng rõ ràng về tiến bộ.":
    {
      pragmatic:
        "Thực hiện cam kết hành động 12 tuần để cải thiện lĩnh vực ưu tiên và ghi nhận tiến bộ rõ ràng.",
      strategic:
        "Thực thi chiến lược 12 tuần nhằm tối ưu hóa lĩnh vực ưu tiên và tạo chỉ số tiến trình rõ nét.",
    },
  "Hoàn thành một dự án nổi bật trong 12 tuần để có bằng chứng rõ ràng khi trao đổi về bước tiến nghề nghiệp.":
    {
      pragmatic:
        "Hoàn thành 1 dự án trọng điểm trong 12 tuần để chứng minh năng lực và thăng tiến nghề nghiệp.",
      strategic:
        "Xây dựng dự án trọng điểm trong 12 tuần, tạo đòn bẩy thăng tiến nghề nghiệp rõ rệt.",
    },
  "Xây dựng quỹ dự phòng đầu tiên trong 12 tuần để tài chính cá nhân ổn hơn và giảm áp lực khi có việc phát sinh.":
    {
      pragmatic:
        "Tích lũy quỹ dự phòng khẩn cấp trong 12 tuần nhằm ổn định tài chính cá nhân trước các sự cố phát sinh.",
      strategic:
        "Tối ưu hóa phân bổ dòng tiền và thiết lập quỹ dự phòng 12 tuần nhằm bảo vệ an toàn tài chính lâu dài.",
    },
  "Duy trì 3 buổi vận động mỗi tuần trong 12 tuần để cơ thể khỏe hơn, ngủ tốt hơn và có nhiều năng lượng hơn.":
    {
      pragmatic:
        "Duy trì tập thể dục 3 buổi mỗi tuần trong 12 tuần nhằm nâng cao thể lực và năng lượng làm việc.",
      strategic:
        "Xây dựng thói quen vận động 3 buổi/tuần trong 12 tuần nhằm tái tạo năng lượng thể chất và tinh thần tối đa.",
    },
  "Hoàn thành một lộ trình học 12 tuần để nắm chắc một kỹ năng mới và có sản phẩm nhỏ chứng minh kết quả học.":
    {
      pragmatic:
        "Hoàn thành lộ trình học kỹ năng mới trong 12 tuần và tự làm 1 sản phẩm thực tế để ứng dụng.",
      strategic:
        "Làm chủ kỹ năng mới thông qua lộ trình học 12 tuần và đóng gói kết quả dưới dạng sản phẩm kiểm chứng.",
    },
  "Duy trì ít nhất 2 lần chủ động kết nối mỗi tuần trong 12 tuần để các mối quan hệ quan trọng gần gũi hơn.":
    {
      pragmatic:
        "Chủ động kết nối với những người quan trọng 2 lần mỗi tuần trong 12 tuần để gia tăng sự gắn kết.",
      strategic:
        "Hệ thống hóa lịch kết nối chất lượng 2 lần/tuần trong 12 tuần nhằm tối ưu hóa các mối quan hệ cốt lõi.",
    },
  "Duy trì 2 khoảng thời gian chất lượng với gia đình mỗi tuần trong 12 tuần để kết nối gần hơn và bớt bị cuốn vào việc riêng.":
    {
      pragmatic:
        "Dành riêng 2 khoảng thời gian chất lượng cho gia đình mỗi tuần trong 12 tuần, gác lại công việc riêng.",
      strategic:
        "Thiết lập ranh giới công việc, dành 2 buổi sinh hoạt gia đình chất lượng mỗi tuần trong 12 tuần.",
    },
  "Duy trì một thói quen phát triển bản thân trong 12 tuần để hiểu mình hơn và có nhịp cải thiện đều mỗi tuần.":
    {
      pragmatic:
        "Thực hiện thói quen phát triển bản thân đều đặn mỗi tuần trong 12 tuần để nâng cao nhận thức cá nhân.",
      strategic:
        "Chuẩn hóa quy trình tự phản tỉnh và thực hiện thói quen phát triển bản thân mỗi tuần trong 12 tuần.",
    },
  "Duy trì 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần để phục hồi năng lượng và không để cuộc sống chỉ xoay quanh việc riêng.":
    {
      pragmatic:
        "Lên lịch và thực hiện 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần nhằm phục hồi năng lượng tối ưu.",
      strategic:
        "Quản trị năng lượng bằng 2 khoảng nghỉ sâu mỗi tuần trong 12 tuần, ngăn chặn rủi ro kiệt sức.",
    },
};

function applySpecificTone(goalStr: string, tone: PersonaTone): string {
  if (tone === "empathetic") {
    return goalStr;
  }

  const replacement = SPECIFIC_REPLACEMENTS[goalStr]?.[tone];
  if (replacement) {
    return replacement;
  }

  return goalStr;
}

export function getPersonaData(
  stepKey: SmartStepKey,
  tone: PersonaTone,
  starter: {
    specificGoalStatement: string;
    metricName: string;
    baselineValue: string;
    targetValue: string;
    weeklyHours: string;
    motivationReason: string;
    targetWeeks: string;
  },
  _archetype: GoalArchetype,
): PersonaResult {
  const cleanMetric = starter.metricName.toLowerCase();

  if (stepKey === "specific") {
    if (tone === "empathetic") {
      return {
        coachComment:
          "Bạn đang hướng tới một tầm nhìn rất ý nghĩa đấy. Hãy bắt đầu nhẹ nhàng nhưng đầy cam kết:",
        goalDraft: starter.specificGoalStatement,
        coreTextToApply: starter.specificGoalStatement,
      };
    }

    const transformed = applySpecificTone(starter.specificGoalStatement, tone);

    if (tone === "pragmatic") {
      return {
        coachComment: "Vào thẳng hành động thực tế nào. Hãy điền ngắn gọn, rõ việc cần làm:",
        goalDraft: transformed,
        coreTextToApply: transformed,
      };
    }

    return {
      coachComment:
        "Phân tích chiến lược cho thấy đây là lộ trình tối ưu nhất. Hãy tham khảo cấu trúc mục tiêu:",
      goalDraft: transformed,
      coreTextToApply: transformed,
    };
  }

  if (stepKey === "measurable") {
    if (tone === "empathetic") {
      return {
        coachComment:
          "Số liệu là tấm gương giúp bạn tự quan sát nhẹ nhàng. Chúc bạn có những bước đi thảnh thơi!",
        goalDraft: `Hãy đo lường bằng cách đạt mốc ${starter.targetValue} ${cleanMetric} (khởi điểm từ mốc ${starter.baselineValue}).`,
        coreTextToApply: "",
      };
    }
    if (tone === "pragmatic") {
      return {
        coachComment: "Đo lường cụ thể để kiểm soát kết quả tốt nhất. Chỉ tiêu hành động:",
        goalDraft: `Đạt mốc ${starter.targetValue} ${cleanMetric} (bắt đầu từ mốc ${starter.baselineValue}).`,
        coreTextToApply: "",
      };
    }
    return {
      coachComment: "Chỉ số định hướng giúp bạn dễ dàng theo dõi tiến độ mỗi tuần:",
      goalDraft: `Đặt mốc cần đạt là ${starter.targetValue} ${cleanMetric} (với mốc cơ sở hiện tại là ${starter.baselineValue}).`,
      coreTextToApply: "",
    };
  }

  if (stepKey === "achievable") {
    if (tone === "empathetic") {
      return {
        coachComment:
          "Nuôi dưỡng thói quen bền bỉ tốt hơn là ép mình quá sức. Bạn nên bắt đầu chậm rãi:",
        goalDraft: `Dành ra khoảng ${starter.weeklyHours} giờ mỗi tuần để thích nghi từ từ bạn nhé.`,
        coreTextToApply: "",
      };
    }
    if (tone === "pragmatic") {
      return {
        coachComment: "Tập trung phân bổ thời gian kỷ luật tối đa. Hãy cam kết:",
        goalDraft: `Dành ra đúng ${starter.weeklyHours} giờ mỗi tuần để hành động thực tế. Hãy chuẩn bị trước các nguồn lực cần thiết để sẵn sàng thực hiện.`,
        coreTextToApply: "",
      };
    }
    return {
      coachComment:
        "Để giữ nhịp độ hành động đều đặn và tránh bị quá tải, thời gian gợi ý cho bạn là:",
      goalDraft: `Phân bổ quỹ thời gian biểu là ${starter.weeklyHours} giờ/tuần cùng với việc chuẩn bị nguồn lực hỗ trợ đầy đủ.`,
      coreTextToApply: "",
    };
  }

  if (stepKey === "relevant") {
    const cleanReason = starter.motivationReason.replace("Tôi muốn mục tiêu này vì ", "");
    const capitalizedReason = cleanReason.charAt(0).toUpperCase() + cleanReason.slice(1);

    if (tone === "empathetic") {
      return {
        coachComment:
          "Lý do sâu sắc từ trái tim sẽ tiếp thêm sức mạnh cho bạn. Hãy cảm nhận xem điều này đã thực sự chạm tới ước muốn của bạn chưa:",
        goalDraft: starter.motivationReason,
        coreTextToApply: starter.motivationReason,
      };
    }

    const pragmaticReason = `Động lực thực tế: ${capitalizedReason}`;
    if (tone === "pragmatic") {
      return {
        coachComment: "Tập trung vào giá trị thực tế nhất cho cuộc sống của bạn lúc này:",
        goalDraft: pragmaticReason,
        coreTextToApply: pragmaticReason,
      };
    }

    const strategicReason = `Định hướng phát triển: ${capitalizedReason}`;
    return {
      coachComment: "Tìm ra động lực sâu sắc giúp bạn giữ cam kết đến cùng:",
      goalDraft: strategicReason,
      coreTextToApply: strategicReason,
    };
  }

  if (stepKey === "timeBound") {
    if (tone === "empathetic") {
      return {
        coachComment:
          "Tạo một nhịp điệu thời gian vừa vặn và không gây áp lực cho cuộc sống:",
        goalDraft: `Theo dõi tiến trình trong ${starter.targetWeeks} tuần trước khi chốt kết quả. 12 tuần là khoảng thời gian hoàn hảo để chứng kiến sự chuyển hóa nhẹ nhàng.`,
        coreTextToApply: "",
      };
    }
    if (tone === "pragmatic") {
      return {
        coachComment: "Đặt mốc thời gian rõ ràng để tập trung kỷ luật tối đa, không trì hoãn:",
        goalDraft: `Cam kết hoàn thành trong vòng ${starter.targetWeeks} tuần tới.`,
        coreTextToApply: "",
      };
    }
    return {
      coachComment: "Đặt mốc thời gian hoàn thành rõ ràng để tập trung hành động:",
      goalDraft: `Cam kết hoàn thành trong vòng ${starter.targetWeeks} tuần để tổng kết và ghi nhận sự tiến bộ của bạn.`,
      coreTextToApply: "",
    };
  }

  return DEFAULT_PERSONA;
}