import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import type { ExecutionInsight } from "@/features/plan12week/logic";

interface WeeklyEvidenceInsightsProps {
  insights: ReadonlyArray<ExecutionInsight>;
}

function getInsightPresentation(insight: ExecutionInsight) {
  switch (insight.severity) {
    case "positive":
      return {
        Icon: CheckCircle2,
        label: "Điểm đáng giữ",
        iconClassName: "text-app-status-success",
      };
    case "warning":
      return {
        Icon: AlertTriangle,
        label: "Điểm cần chú ý",
        iconClassName: "text-app-status-warning",
      };
    default:
      return {
        Icon: TrendingUp,
        label: "Xu hướng",
        iconClassName: "text-app-status-info",
      };
  }
}

export function WeeklyEvidenceInsights({ insights }: WeeklyEvidenceInsightsProps) {
  const visibleInsights = insights.slice(0, 3);
  if (visibleInsights.length === 0) return null;

  return (
    <section aria-labelledby="weekly-evidence-insights-title" className="border-t border-app-line/60 p-4 sm:p-6">
      <h3
        id="weekly-evidence-insights-title"
        className="text-xs font-bold uppercase tracking-[0.18em] text-app-ink-soft"
      >
        Điều đáng chú ý
      </h3>
      <div className="mt-4 divide-y divide-app-line/50">
        {visibleInsights.map((insight) => {
          const { Icon, label, iconClassName } = getInsightPresentation(insight);
          return (
            <article
              key={insight.id}
              data-testid="weekly-evidence-insight"
              className="flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClassName}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted">{label}</p>
                <h4 className="mt-0.5 break-words text-sm font-semibold leading-snug text-app-ink">
                  {insight.headline}
                </h4>
                <p className="mt-1 break-words text-xs leading-relaxed text-app-ink-soft">{insight.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
