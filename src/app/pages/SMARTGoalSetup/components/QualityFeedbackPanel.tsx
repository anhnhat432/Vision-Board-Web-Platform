import { Check, Sparkles } from "lucide-react";
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
      colorClass:
        "text-app-status-success bg-app-status-success/10 border-app-status-success/20 dark:text-app-status-success dark:bg-app-status-success/10 dark:border-app-status-success/20",
      barClass: "bg-app-status-success shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    };
  }
  if (score >= 60) {
    return {
      label: "Khá rõ nét",
      colorClass:
        "text-app-accent bg-app-accent-soft/70 border-app-accent/10 dark:text-app-accent dark:bg-app-accent-soft/20 dark:border-app-accent/20",
      barClass: "bg-app-accent shadow-[0_0_8px_rgba(20,184,166,0.4)]",
    };
  }
  if (score >= 40) {
    return {
      label: "Đang hình thành",
      colorClass:
        "text-app-status-warning bg-app-status-warning/10 border-app-status-warning/20 dark:text-app-status-warning dark:bg-app-status-warning/10 dark:border-app-status-warning/20",
      barClass: "bg-app-status-warning shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    };
  }
  return {
    label: "Đang phác thảo",
    colorClass:
      "text-app-status-error bg-app-status-error/10 border-app-status-error/20 dark:text-app-status-error dark:bg-app-status-error/10 dark:border-app-status-error/20",
    barClass: "bg-app-status-error shadow-[0_0_8px_rgba(251,113,133,0.4)]",
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

  // Làm dịu văn phong của warnings và suggestions
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
      className="rounded-[14px] border border-app-line bg-app-surface p-5 shadow-sm space-y-4"
      aria-label="Mức độ rõ ràng mục tiêu"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 select-none">
        <h3 className="text-sm font-bold text-app-ink">Mức độ rõ nét của mục tiêu</h3>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold border transition-all duration-300",
            clarity.colorClass,
          )}
        >
          {clarity.label} · {overallScore}%
        </span>
      </div>

      {/* Thanh Clarity Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={overallScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Độ rõ nét mục tiêu"
        className="relative h-2 w-full rounded-full bg-app-bg-subtle overflow-hidden"
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
            <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm animate-[fade-in_0.2s_ease-out]">
              {isSuccessMessage ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-status-success/10 text-app-status-success dark:text-app-status-success mt-0.5">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft/30 text-app-accent mt-0.5">
                  <Sparkles className="h-3 w-3" />
                </span>
              )}
              <p className="leading-relaxed text-app-ink-soft pt-0.5">{item}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
