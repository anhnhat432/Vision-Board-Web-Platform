import { Heart, RefreshCcw } from "lucide-react";

import type {
  RescueModeStatus,
  RescueSuggestion,
  RescueSuggestionId,
} from "@/features/plan12week/logic";
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
    gentle: "border-violet-200/80 bg-violet-50/70",
    active: "border-violet-300 bg-violet-50",
    urgent: "border-amber-300 bg-amber-50/82",
  },
  week: {
    gentle: "border-amber-200/80 bg-amber-50/70",
    active: "border-amber-300 bg-amber-50",
    urgent: "border-amber-400 bg-amber-100/80",
  },
} as const;

function getCallbackForSuggestion(
  id: RescueSuggestionId,
  props: TwelveWeekRescueNudgeProps,
): (() => void) | undefined {
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
      className={`order-1 rounded-xl border p-4 sm:p-5 ${accent}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            variant === "today" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          <Heart className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.16em] ${
              variant === "today" ? "text-violet-700" : "text-amber-800"
            }`}
          >
            Cứu nhịp nhẹ
          </p>
          <p className="mt-1 text-base font-semibold leading-7 text-slate-950">
            {message.headline}
          </p>
          {message.subtext && (
            <p className="mt-1 text-sm leading-6 text-slate-700">{message.subtext}</p>
          )}

          {suggestions.length > 0 && (
            <ul
              data-testid={
                variant === "today" ? "today-rescue-suggestions" : "week-rescue-suggestions"
              }
              className="mt-3 grid gap-2"
            >
              {suggestions.map((suggestion: RescueSuggestion) => {
                const callback = getCallbackForSuggestion(suggestion.id, props);
                return (
                  <li
                    key={suggestion.id}
                    data-suggestion-id={suggestion.id}
                    className="rounded-lg border border-white/82 bg-white/82 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950">{suggestion.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-600">{suggestion.hint}</p>
                      </div>
                      {callback && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 bg-white"
                          onClick={callback}
                          aria-label={suggestion.title}
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
