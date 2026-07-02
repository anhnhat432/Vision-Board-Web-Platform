import { Check, Lightbulb } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

import type { QualityLevel } from "@/lib/smart-goal/quality";

interface QualityFeedbackPanelProps {
  level: QualityLevel;
  overallScore: number;
  warnings: string[];
  suggestions: string[];
  canProceedToFeasibility: boolean;
}

const MAX_DISPLAY_ITEMS = 6;

function getClarityDetails(score: number) {
  if (score >= 80) {
    return {
      label: "Rất rõ ràng",
      badgeClass: "text-[#0C5E3A] bg-[#EDF7E0] border-[#0C5E3A]/20",
      barClass: "bg-[#0C5E3A]",
    };
  }
  if (score >= 60) {
    return {
      label: "Khá rõ nét",
      badgeClass: "text-[#0C5E3A] bg-[#EDF7E0]/70 border-[#0C5E3A]/10",
      barClass: "bg-[#0C5E3A]",
    };
  }
  if (score >= 40) {
    return {
      label: "Đang hình thành",
      badgeClass: "text-[#9A7B00] dark:text-[#E7B400] bg-[#FFF8DE] dark:bg-[#2A2410] border-[#D6B228]/20",
      barClass: "bg-[#9A7B00]",
    };
  }
  return {
    label: "Đang phác thảo",
      badgeClass: "text-[#C2410C] dark:text-[#FF8C66] bg-[#FBEAE2] dark:bg-[#2A1510] border-[#C2410C]/20",
    barClass: "bg-[#C2410C]",
  };
}

export function QualityFeedbackPanel({
  level,
  overallScore,
  warnings,
  suggestions,
  canProceedToFeasibility,
}: QualityFeedbackPanelProps) {
  const clarity = getClarityDetails(overallScore);
  const completedMessage =
    level === "strong"
      ? "Tuyệt vời! Mục tiêu của bạn đã đủ rõ ràng để chuyển sang kiểm tra tính thực tế."
      : level === "okay"
        ? "Mục tiêu khá ổn. Thêm vài chi tiết sẽ giúp bạn hành động dễ dàng hơn."
        : canProceedToFeasibility
          ? "Đã có thể tiếp tục. Hãy hoàn thiện thêm vài thông tin để kế hoạch chắc chắn hơn nhé."
          : "Hãy bổ sung câu mục tiêu và mốc đích cụ thể để chúng mình đồng hành tiếp cùng bạn.";

  const formattedWarnings = warnings.map((w) =>
    w
      .replace("Cần bổ sung", "Bạn nên bổ sung thêm")
      .replace("Không nên bỏ trống", "Hãy điền thêm chi tiết về")
      .replace("chưa đạt tối thiểu", "hơi ngắn, hãy viết rõ thêm một chút"),
  );

  const formattedSuggestions = suggestions.map((s) =>
    s.replace("Hãy thử", "Gợi ý cho bạn:").replace("Nên dùng", "Chúng mình khuyên dùng"),
  );

  const hintItems = [completedMessage, ...formattedWarnings, ...formattedSuggestions].slice(0, MAX_DISPLAY_ITEMS);

  return (
    <section
      className="rounded-[14px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-white dark:bg-app-surface p-5 space-y-4"
      aria-label="Mức độ rõ ràng mục tiêu"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 select-none">
        <h3 className="text-[13px] font-bold text-[#17150F]">Mức độ rõ nét của mục tiêu</h3>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold border transition-all duration-300",
            clarity.badgeClass,
          )}
        >
          {clarity.label} · {overallScore}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={overallScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Độ rõ nét mục tiêu"
        className="relative h-[9px] w-full rounded-full bg-[#E4E0D4] dark:bg-app-line overflow-hidden"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", clarity.barClass)}
          style={{ width: `${overallScore}%` }}
        />
      </div>

      <ul className="space-y-2.5 pt-1">
        {hintItems.map((item, index) => {
          const isSuccessMessage = index === 0;
          return (
            <li key={item} className="flex items-start gap-2.5 text-[12px] sm:text-[13px] animate-[fade-in_0.2s_ease-out]">
              {isSuccessMessage ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EDF7E0] text-[#0C5E3A] mt-0.5">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF8DE] dark:bg-[#2A2410] text-[#9A7B00] dark:text-[#E7B400] mt-0.5">
                  <Lightbulb className="h-3 w-3" />
                </span>
              )}
              <p className="leading-relaxed text-[#5C574B] pt-0.5">{item}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
