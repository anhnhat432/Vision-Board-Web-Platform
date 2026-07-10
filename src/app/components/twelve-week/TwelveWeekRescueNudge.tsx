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
      className={`order-1 rounded-xl border p-3.5 sm:p-4 shadow-3xs transition-all duration-200 ${accent}`}
    >
      <div className="flex flex-col gap-2.5">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                variant === "today" ? "bg-app-accent-soft text-app-accent" : "bg-app-warm-soft text-app-warm"
              }`}
            >
              <Heart className="h-3.5 w-3.5" />
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-[0.14em] ${
                variant === "today" ? "text-app-accent" : "text-app-warm"
              }`}
            >
              Cứu nhịp nhẹ
            </span>
            <span className="text-[10px] text-app-ink-muted/50">•</span>
            <span className="rounded-md bg-app-surface/60 border border-app-line/20 px-1.5 py-0.5 text-[9px] font-semibold text-app-ink-soft uppercase tracking-wider">
              {status.severity === "gentle" ? "Nhẹ nhàng" : status.severity === "active" ? "Cần thiết" : "Ưu tiên"}
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-relaxed text-app-ink">{message.headline}</h4>
          {message.subtext && (
            <p className="mt-0.5 text-xs leading-normal text-app-ink-soft/90 font-sans">{message.subtext}</p>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-1">
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
                    className={`py-2 flex items-start justify-between gap-3 transition-all ${
                      isSecondOrLater && !isExpanded ? "hidden sm:flex" : "flex"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-xs font-semibold text-app-ink flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-app-accent/60 shrink-0" />
                        {suggestion.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-normal text-app-ink-soft pl-3 font-sans">
                        {suggestion.hint}
                      </p>
                    </div>
                    {callback && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 bg-app-surface border-app-line min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg text-xs hover:bg-app-bg hover:text-app-ink transition-colors font-medium flex items-center gap-1"
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

            {/* View More Buttons on Mobile */}
            {suggestions.length > 1 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="sm:hidden mt-2 text-[11px] font-semibold text-app-accent hover:text-app-accent-hover flex items-center gap-1 py-2 min-h-[44px] w-full justify-center border border-dashed border-app-line rounded-xl bg-app-surface/40 hover:bg-app-surface/80 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <span>Thu gọn gợi ý</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Xem thêm gợi ý ({suggestions.length - 1})</span>
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
