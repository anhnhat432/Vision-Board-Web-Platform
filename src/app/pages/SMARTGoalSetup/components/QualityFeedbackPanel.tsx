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
      badgeClass: "text-app-accent bg-app-accent-subtle border-app-accent/20",
      barClass: "bg-app-accent",
    };
  }
  if (score >= 60) {
    return {
      label: "Khá rõ nét",
      badgeClass: "text-app-accent bg-app-accent-subtle/70 border-app-accent/10",
      barClass: "bg-app-accent",
    };
  }
  if (score >= 40) {
    return {
      label: "Đang hình thành",
      badgeClass: "text-app-status-warning bg-app-status-warning/10 border-app-status-warning/20",
      barClass: "bg-app-status-warning",
    };
  }
  return {
    label: "Đang phác thảo",
    badgeClass: "text-app-status-error bg-app-status-error/10 border-app-status-error/20",
    barClass: "bg-app-status-error",
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
      className="space-y-4 rounded-[16px] border border-app-line bg-app-surface p-4 sm:p-5"
      aria-label="Mức độ rõ ràng mục tiêu"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 select-none">
        <h3 className="text-[13px] font-bold text-app-ink">Điểm rõ nét</h3>
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
        className="relative h-[9px] w-full overflow-hidden rounded-full bg-app-line"
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
            <li
              key={item}
              className="flex items-start gap-2.5 text-[12px] animate-[fade-in_0.2s_ease-out] sm:text-[13px]"
            >
              {isSuccessMessage ? (
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-subtle text-app-accent">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : (
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-status-warning/10 text-app-status-warning">
                  <Lightbulb className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
              <p className="pt-0.5 leading-relaxed text-app-ink-soft">{item}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
