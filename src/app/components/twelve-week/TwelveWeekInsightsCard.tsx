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
  positive: "border-app-accent/20 bg-app-accent-soft",
  neutral: "border-app-line bg-app-bg",
  warning: "border-app-warm-border bg-app-warm-soft",
};

const SEVERITY_BADGE: Record<ExecutionInsightSeverity, string> = {
  positive: "border-app-accent/20 bg-app-surface text-app-accent",
  neutral: "border-app-line bg-app-surface text-app-ink",
  warning: "border-app-warm-border bg-app-surface text-app-warm",
};

const SEVERITY_ICON: Record<ExecutionInsightSeverity, ReactElement> = {
  positive: <Sparkles className="h-4 w-4 text-app-accent" />,
  neutral: <Lightbulb className="h-4 w-4 text-app-ink-muted" />,
  warning: <ShieldAlert className="h-4 w-4 text-app-warm" />,
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
      className="rounded-card border border-app-line bg-app-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-app-bg text-app-accent">
            <ChevronUp className="h-4 w-4" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">{title}</p>
        </div>
        <Badge variant="neutral">{insights.length} góc nhìn</Badge>
      </div>

      <ul data-testid="execution-insights-list" className="mt-3 grid gap-3">
        {insights.map((insight) => (
          <li
            key={insight.id}
            data-insight-id={insight.id}
            data-insight-severity={insight.severity}
            className={`rounded-lg border p-3 ${SEVERITY_ACCENT[insight.severity]}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{SEVERITY_ICON[insight.severity]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold leading-6 text-app-ink">{insight.headline}</p>
                  <Badge variant="outline" className={SEVERITY_BADGE[insight.severity]}>
                    {SEVERITY_LABEL[insight.severity]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-app-ink-soft">{insight.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {nextActionCallback && nextAction.id !== "no_action" && (
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-app-accent/20 bg-app-accent-soft p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
              Gợi ý hành động tiếp theo
            </p>
            <p data-testid="execution-insights-next-action-hint" className="mt-1 text-sm leading-6 text-app-ink">
              {nextAction.hint}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-app-surface"
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
