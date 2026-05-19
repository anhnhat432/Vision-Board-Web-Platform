import { Heart, RefreshCcw } from "lucide-react";

import type { RescueModeStatus, RescueSuggestion, RescueSuggestionId } from "@/features/plan12week/logic";
import { getRescueActionSuggestion, getRescueModeMessage } from "@/features/plan12week/logic";

import { Button } from "../ui/button";

interface TwelveWeekRescueNudgeProps {
  status: RescueModeStatus;
  /** Variant: 'today' uses violet accent, 'week' uses amber accent. */
  variant?: "today" | "week";
  /** Optional callbacks; suggestion IDs that have a callback render as a button. */
  onPickTinyTask?: () => void;
  onQuickCheckIn?: () => void;
  onReducePlan?: () => void;
  onReviewPlan?: () => void;
  onOpenWeekTab?: () => void;
}

const SEVERITY_BORDER = {
  today: {
    gentle: "border-app-line bg-app-accent-soft/70",
    active: "border-app-accent/20 bg-app-accent-soft",
    urgent: "border-app-warm-border bg-app-warm-soft",
  },
  week: {
    gentle: "border-app-warm-border/60 bg-app-warm-soft/70",
    active: "border-app-warm-border bg-app-warm-soft",
    urgent: "border-app-warm/30 bg-app-warm-soft",
  },
} as const;

function getCallbackForSuggestion(id: RescueSuggestionId, props: TwelveWeekRescueNudgeProps): (() => void) | undefined {
  switch (id) {
    case "pick-one-tiny-task":
      return props.onPickTinyTask;
    case "quick-check-in":
      return props.onQuickCheckIn;
    case "reduce-week-load":
      return props.onReducePlan ?? props.onOpenWeekTab;
    case "review-plan":
      return props.onReviewPlan ?? props.onOpenWeekTab;
    case "reschedule-non-core":
      return props.onOpenWeekTab;
    default:
      return undefined;
  }
}

export function TwelveWeekRescueNudge(props: TwelveWeekRescueNudgeProps) {
  const { status, variant = "today" } = props;

  if (status.severity === "none" || status.triggers.length === 0) {
    return null;
  }

  const message = getRescueModeMessage(status);
  const suggestions = getRescueActionSuggestion(status);

  const severityKey: keyof (typeof SEVERITY_BORDER)["today"] =
    status.severity === "urgent" ? "urgent" : status.severity === "active" ? "active" : "gentle";
  const accent = SEVERITY_BORDER[variant][severityKey];

  return (
    <div
      data-testid={variant === "today" ? "today-rescue-nudge" : "week-rescue-nudge"}
      data-rescue-severity={status.severity}
      className={`order-1 rounded-card border p-5 sm:p-6 ${accent}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            variant === "today" ? "bg-app-accent-soft text-app-accent" : "bg-app-warm-soft text-app-warm"
          }`}
        >
          <Heart className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.16em] ${
              variant === "today" ? "text-app-accent" : "text-app-warm"
            }`}
          >
            Cứu nhịp nhẹ
          </p>
          <p className="mt-1 text-base font-semibold leading-7 text-app-ink">{message.headline}</p>
          {message.subtext && <p className="mt-1 text-sm leading-6 text-app-ink-soft">{message.subtext}</p>}

          {suggestions.length > 0 && (
            <ul
              data-testid={variant === "today" ? "today-rescue-suggestions" : "week-rescue-suggestions"}
              className="mt-3 grid gap-2"
            >
              {suggestions.map((suggestion: RescueSuggestion) => {
                const callback = getCallbackForSuggestion(suggestion.id, props);
                return (
                  <li
                    key={suggestion.id}
                    data-suggestion-id={suggestion.id}
                    className="rounded-lg border border-app-line bg-app-surface px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-app-ink">{suggestion.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-app-ink-soft">{suggestion.hint}</p>
                      </div>
                      {callback && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 bg-white"
                          onClick={callback}
                          aria-label={`Làm: ${suggestion.title}`}
                        >
                          <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                          Làm
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
