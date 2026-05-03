import { AlertTriangle, CheckCircle2, CircleAlert, Lightbulb } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import type { QualityLevel } from "@/lib/smart-goal/quality";

interface QualityFeedbackPanelProps {
  level: QualityLevel;
  overallScore: number;
  warnings: string[];
  suggestions: string[];
  canProceedToFeasibility: boolean;
}

const LEVEL_CONFIG: Record<
  QualityLevel,
  {
    label: string;
    border: string;
    bg: string;
    badgeClass: string;
    icon: typeof CheckCircle2;
    iconColor: string;
  }
> = {
  strong: {
    label: "Mạnh",
    border: "border-emerald-200",
    bg: "bg-emerald-50/80",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
  okay: {
    label: "Khá ổn",
    border: "border-amber-200",
    bg: "bg-amber-50/80",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    icon: CircleAlert,
    iconColor: "text-amber-600",
  },
  weak: {
    label: "Cần làm rõ",
    border: "border-rose-200",
    bg: "bg-rose-50/80",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-800",
    icon: AlertTriangle,
    iconColor: "text-rose-600",
  },
};

const MAX_DISPLAY_ITEMS = 3;

export function QualityFeedbackPanel({
  level,
  overallScore,
  warnings,
  suggestions,
  canProceedToFeasibility,
}: QualityFeedbackPanelProps) {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;
  const topWarnings = warnings.slice(0, MAX_DISPLAY_ITEMS);
  const topSuggestions = suggestions.slice(0, MAX_DISPLAY_ITEMS);

  return (
    <div className={`rounded-[24px] border ${config.border} ${config.bg} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
          <div>
            <p className="text-sm font-semibold text-slate-950">Chất lượng mục tiêu</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {level === "strong"
                ? "Mục tiêu đã đủ rõ ràng để chuyển sang kiểm tra tính thực tế."
                : level === "okay"
                  ? "Mục tiêu khá ổn. Xem gợi ý bên dưới để cải thiện thêm."
                  : "Mục tiêu cần bổ sung thêm chi tiết để tăng tính khả thi."}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={config.badgeClass}>
          {config.label} · {overallScore}/100
        </Badge>
      </div>

      <Progress value={overallScore} className="mt-4 h-2" aria-label={`Chất lượng mục tiêu: ${overallScore}/100`} />

      {topWarnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {topWarnings.map((warning) => (
            <div
              key={warning}
              className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-white/82 px-3 py-2.5"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
              <p className="text-sm leading-6 text-slate-700">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {topSuggestions.length > 0 && (
        <div className="mt-3 space-y-2">
          {topSuggestions.map((suggestion) => (
            <div
              key={suggestion}
              className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white/82 px-3 py-2.5"
            >
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-sm leading-6 text-slate-600">{suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {level === "weak" && canProceedToFeasibility && (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Bạn vẫn có thể tiếp tục, nhưng mục tiêu hiện tại có rủi ro thiếu rõ ràng khi chuyển sang kế hoạch 12 tuần.
        </p>
      )}
    </div>
  );
}
