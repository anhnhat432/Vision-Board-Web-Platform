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
        "text-emerald-700 bg-emerald-50/70 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30",
      barClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    };
  }
  if (score >= 60) {
    return {
      label: "Khá rõ nét",
      colorClass:
        "text-teal-700 bg-teal-50/70 border-teal-100 dark:text-teal-400 dark:bg-teal-950/20 dark:border-teal-900/30",
      barClass: "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]",
    };
  }
  if (score >= 40) {
    return {
      label: "Đang hình thành",
      colorClass:
        "text-amber-700 bg-amber-50/70 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30",
      barClass: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    };
  }
  return {
    label: "Đang phác thảo",
    colorClass:
      "text-rose-750 bg-rose-50/70 border-rose-100 dark:text-rose-450 dark:bg-rose-950/20 dark:border-rose-900/30",
    barClass: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.4)]",
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
        className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden"
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
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
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
