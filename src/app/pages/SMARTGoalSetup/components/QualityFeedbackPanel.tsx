import { Check, Circle } from "lucide-react";

import type { QualityLevel } from "@/lib/smart-goal/quality";

interface QualityFeedbackPanelProps {
  level: QualityLevel;
  overallScore: number;
  warnings: string[];
  suggestions: string[];
  canProceedToFeasibility: boolean;
}

const MAX_DISPLAY_ITEMS = 6;

function getScoreBucket(overallScore: number) {
  if (overallScore >= 80) {
    return {
      label: "Tốt",
      className: "bg-app-accent-soft text-app-accent",
    };
  }

  if (overallScore >= 50) {
    return {
      label: "Khá",
      className: "border border-app-line bg-app-bg text-app-ink-soft",
    };
  }

  return {
    label: "Cần cải thiện",
    className: "bg-app-warm-soft text-app-warm",
  };
}

export function QualityFeedbackPanel({
  level,
  overallScore,
  warnings,
  suggestions,
  canProceedToFeasibility,
}: QualityFeedbackPanelProps) {
  const bucket = getScoreBucket(overallScore);
  const completedMessage =
    level === "strong"
      ? "Mục tiêu đã đủ rõ để chuyển sang kiểm tra tính thực tế."
      : level === "okay"
        ? "Mục tiêu khá ổn. Bạn có thể chỉnh thêm nếu muốn kế hoạch chắc hơn."
        : canProceedToFeasibility
          ? "Vẫn tiếp tục được. Thêm vài chi tiết sẽ giúp kế hoạch 12 tuần dễ giữ hơn."
          : "Cần bổ sung câu mục tiêu và mốc đích để tiếp tục.";
  const hintItems = [completedMessage, ...warnings, ...suggestions].slice(0, MAX_DISPLAY_ITEMS);

  return (
    <section className="mt-4 rounded-[14px] border border-app-line bg-app-surface p-5" aria-label="Chất lượng mục tiêu">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-app-ink">Chất lượng mục tiêu</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${bucket.className}`}>
          {bucket.label} · {overallScore}/100
        </span>
      </div>

      <ul className="mt-4">
        {hintItems.map((item, index) => {
          const done = index === 0 || (level === "strong" && warnings.length === 0);
          return (
            <li key={item} className="flex gap-2 py-1.5">
              {done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-app-ink-muted" aria-hidden="true" />
              )}
              <p className="text-sm leading-5 text-app-ink-soft">{item}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
