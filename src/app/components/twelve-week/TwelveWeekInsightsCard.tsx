import type { ReactElement } from "react";
import { ArrowRight, ChevronUp, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";

import type {
  ExecutionInsight,
  ExecutionInsightNextActionId,
  ExecutionInsightSeverity,
} from "@/features/plan12week/logic";
import { getNextActionFromInsights } from "@/features/plan12week/logic";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface TwelveWeekInsightsCardProps {
  insights: ReadonlyArray<ExecutionInsight>;
  /** Section title rendered at the top of the card. */
  title?: string;
  /**
   * Optional action callbacks. The card picks the most relevant from the top
   * insight's `nextActionId` and renders a button only when the matching
   * callback is wired. The card never auto-applies anything.
   */
  onOpenToday?: () => void;
  onOpenWeekReview?: () => void;
  onReduceLoad?: () => void;
  onTightenScope?: () => void;
  onResetFocus?: () => void;
  onCelebrate?: () => void;
  onOpenSetup?: () => void;
}

const SEVERITY_ACCENT: Record<ExecutionInsightSeverity, string> = {
  positive: "border-emerald-200 bg-emerald-50/85",
  neutral: "border-slate-200 bg-slate-50",
  warning: "border-amber-200 bg-amber-50/85",
};

const SEVERITY_BADGE: Record<ExecutionInsightSeverity, string> = {
  positive: "border-emerald-300 bg-white text-emerald-800",
  neutral: "border-slate-300 bg-white text-slate-700",
  warning: "border-amber-300 bg-white text-amber-800",
};

const SEVERITY_ICON: Record<ExecutionInsightSeverity, ReactElement> = {
  positive: <Sparkles className="h-4 w-4 text-emerald-700" />,
  neutral: <Lightbulb className="h-4 w-4 text-slate-600" />,
  warning: <ShieldAlert className="h-4 w-4 text-amber-700" />,
};

const SEVERITY_LABEL: Record<ExecutionInsightSeverity, string> = {
  positive: "Đang giúp bạn",
  neutral: "Quan sát",
  warning: "Đáng chú ý",
};

function getCallbackForActionId(
  id: ExecutionInsightNextActionId,
  props: TwelveWeekInsightsCardProps,
): (() => void) | undefined {
  switch (id) {
    case "open_today":
      return props.onOpenToday;
    case "open_week_review":
      return props.onOpenWeekReview;
    case "reduce_load":
      return props.onReduceLoad ?? props.onOpenWeekReview;
    case "tighten_scope":
      return props.onTightenScope ?? props.onOpenWeekReview;
    case "reset_focus":
      return props.onResetFocus ?? props.onOpenToday;
    case "celebrate_keep_going":
      return props.onCelebrate ?? props.onOpenToday;
    case "open_setup":
      return props.onOpenSetup;
    default:
      return undefined;
  }
}

export function TwelveWeekInsightsCard(props: TwelveWeekInsightsCardProps) {
  const { insights, title = "Góc nhìn nhịp thực thi" } = props;
  if (insights.length === 0) return null;

  const nextAction = getNextActionFromInsights(insights);
  const nextActionCallback = getCallbackForActionId(nextAction.id, props);

  return (
    <section
      data-testid="execution-insights-card"
      data-insight-count={insights.length}
      className="rounded-[var(--r-control)] border border-slate-200/82 bg-white/92 p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--r-pill)] bg-indigo-100 text-indigo-700">
            <ChevronUp className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{title}</p>
        </div>
        <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
          {insights.length} góc nhìn
        </Badge>
      </div>

      <ul data-testid="execution-insights-list" className="mt-[var(--space-inline)] grid gap-3">
        {insights.map((insight) => (
          <li
            key={insight.id}
            data-insight-id={insight.id}
            data-insight-severity={insight.severity}
            className={`rounded-[var(--r-control)] border p-3 ${SEVERITY_ACCENT[insight.severity]}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{SEVERITY_ICON[insight.severity]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold leading-6 text-slate-950">{insight.headline}</p>
                  <Badge variant="outline" className={SEVERITY_BADGE[insight.severity]}>
                    {SEVERITY_LABEL[insight.severity]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-700">{insight.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {nextActionCallback && nextAction.id !== "no_action" && (
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-[var(--r-control)] border border-indigo-200 bg-indigo-50/72 p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
              Gợi ý hành động tiếp theo
            </p>
            <p
              data-testid="execution-insights-next-action-hint"
              className="mt-1 text-sm leading-6 text-slate-700"
            >
              {nextAction.hint}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-white"
            data-testid="execution-insights-next-action-button"
            onClick={nextActionCallback}
          >
            {nextAction.label}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </section>
  );
}
