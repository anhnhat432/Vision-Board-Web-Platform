import { ChevronDown, ChevronUp, Heart, RefreshCcw } from "lucide-react";
import { useState } from "react";

import type { RescueModeStatus, RescueSuggestion, RescueSuggestionId } from "@/features/plan12week/logic";
import { getRescueActionSuggestion, getRescueModeMessage } from "@/features/plan12week/logic";

import { Button } from "../ui/button";

interface TwelveWeekRescueNudgeProps {
  status: RescueModeStatus;
  /** Variant: 'today' uses the accent (Forest Green) tone, 'week' uses the warm (Terracotta) tone. */
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
  const [isExpanded, setIsExpanded] = useState(false);

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
      className={`order-1 rounded-card border p-4 shadow-3xs transition-all duration-200 ${accent}`}
    >
      <div className="flex flex-col gap-2">
        {/* Compact header */}
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              variant === "today" ? "bg-app-accent-soft text-app-accent" : "bg-app-warm-soft text-app-warm"
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
          </span>
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.12em] ${
              variant === "today" ? "text-app-accent" : "text-app-warm"
            }`}
          >
            Cứu nhịp nhẹ
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-app-ink-muted">
            · {status.severity === "gentle" ? "Nhẹ nhàng" : status.severity === "active" ? "Cần thiết" : "Ưu tiên"}
          </span>
        </div>

        {/* Message */}
        <div className="min-w-0">
          <h4 className="font-serif text-sm font-bold leading-snug text-app-ink">{message.headline}</h4>
          {message.subtext && (
            <p className="mt-0.5 text-xs leading-relaxed text-app-ink-soft font-sans">{message.subtext}</p>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-0.5">
            <ul
              data-testid={variant === "today" ? "today-rescue-suggestions" : "week-rescue-suggestions"}
              className="divide-y divide-app-line/20 border-t border-app-line/25 pt-1"
            >
              {suggestions.map((suggestion: RescueSuggestion, index) => {
                const callback = getCallbackForSuggestion(suggestion.id, props);
                const isSecondOrLater = index > 0;

                return (
                  <li
                    key={suggestion.id}
                    data-suggestion-id={suggestion.id}
                    className={`py-2 flex items-center gap-3 transition-all ${
                      isSecondOrLater && !isExpanded ? "hidden sm:flex" : "flex"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${variant === "today" ? "bg-app-accent" : "bg-app-warm"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-app-ink">{suggestion.title}</p>
                      <p className="truncate text-[11px] leading-snug text-app-ink-muted font-sans">{suggestion.hint}</p>
                    </div>
                    {callback && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 bg-app-surface border-app-line min-h-[36px] sm:min-h-0 sm:h-8 px-3 rounded-lg text-xs hover:bg-app-bg hover:text-app-ink transition-colors font-medium flex items-center gap-1"
                        onClick={callback}
                        aria-label={`Làm: ${suggestion.title}`}
                      >
                        <RefreshCcw className="h-3 w-3 text-app-ink-soft shrink-0" />
                        <span>Làm</span>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* View More on Mobile */}
            {suggestions.length > 1 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="sm:hidden mt-1.5 text-[11px] font-semibold text-app-accent hover:text-app-accent-hover flex items-center gap-1 py-2 min-h-[44px] w-full justify-center border border-dashed border-app-line rounded-lg bg-app-surface/40 hover:bg-app-surface/80 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <span>Thu gọn</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Xem thêm ({suggestions.length - 1})</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
