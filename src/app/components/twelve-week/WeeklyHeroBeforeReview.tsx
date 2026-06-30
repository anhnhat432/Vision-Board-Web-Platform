import { AlertCircle, CalendarDays, Target } from "lucide-react";
import { Progress } from "../ui/progress";
import { cn } from "../ui/utils";
import type { LeadIndicator } from "../../utils/storage-types";
import type { ExecutionInsight } from "@/features/plan12week/logic";
import { interpretWeeklyExecutionScore } from "@/features/plan12week/logic";

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
  isEmpty?: boolean;
}

interface WeeklyHeroBeforeReviewProps {
  currentWeekLimit: number;
  totalWeeks: number;
  currentWeekRange: { start: string; end: string } | null;
  currentPlanFocus: string;
  currentPlanMilestone: string;
  weekCompletion: WeekCompletionSummary;
  leadScoreValue: number;
  _lagScoreValue: number | null;
  _lagMetricName: string;
  _lagMetricValue: string;
  mergedIndicators: Array<LeadIndicator & { isCore: boolean }>;
  getTacticProgress: (indicator: LeadIndicator) => {
    total: number;
    completed: number;
    percent: number;
    status: "Not started" | "In Progress" | "Done" | "Behind";
  };
  formatCalendarDate: (date: string) => string;
  weeklyReflectionInsights?: ReadonlyArray<ExecutionInsight>;
}

const tacticStatusStyle = (status: string) => {
  switch (status) {
    case "Done":
      return { dot: "bg-app-status-success", text: "text-app-status-success", label: "Hoàn thành" };
    case "Behind":
      return { dot: "bg-app-status-error", text: "text-app-status-error", label: "Trễ hạn" };
    case "In Progress":
      return { dot: "bg-app-status-warning", text: "text-app-status-warning", label: "Đang tiến hành" };
    default:
      return { dot: "bg-app-ink-disabled", text: "text-app-ink-muted", label: "Chưa bắt đầu" };
  }
};

export function WeeklyHeroBeforeReview({
  currentWeekLimit,
  totalWeeks,
  currentWeekRange,
  currentPlanFocus,
  currentPlanMilestone,
  weekCompletion,
  leadScoreValue,
  mergedIndicators,
  getTacticProgress,
  formatCalendarDate,
}: WeeklyHeroBeforeReviewProps) {
  const scoreInterpretation = interpretWeeklyExecutionScore(leadScoreValue);

  return (
    <div className="rounded-card border border-app-line bg-app-surface p-5 shadow-app-sm sm:p-7">
      {/* Masthead */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-app-accent">
          Tuần {currentWeekLimit} <span className="text-app-ink-disabled">/ {totalWeeks}</span>
        </p>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-app-ink-muted">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {currentWeekRange
            ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
            : "Chu kỳ hiện tại"}
        </span>
      </div>

      {currentPlanFocus && (
        <div className="mt-4">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
            Tiêu điểm tuần
          </span>
          <h2 className="max-w-[28ch] text-balance font-serif text-2xl font-bold leading-snug tracking-tight text-app-ink sm:text-3xl">
            {currentPlanFocus}
          </h2>
        </div>
      )}

      {currentPlanMilestone && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs leading-relaxed text-app-ink-soft">
          <Target className="h-3.5 w-3.5 shrink-0 text-app-ink-muted" aria-hidden="true" />
          <span className="font-medium text-app-ink-muted">Cột mốc:</span>
          <span className="min-w-0 break-words font-semibold text-app-ink">{currentPlanMilestone}</span>
        </p>
      )}

      {/* Score — dominant statement + hairline meter */}
      <div className="mt-5 border-t border-app-line pt-5">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
          Điểm thực thi tuần
        </span>
        {weekCompletion.isEmpty ? (
          <span data-testid="weekly-lead-score" className="text-sm font-semibold text-app-ink-muted">
            Chưa có việc nào
          </span>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <span
                data-testid="weekly-lead-score"
                className="font-serif text-5xl font-extrabold leading-none tracking-tighter text-app-accent sm:text-6xl"
              >
                {leadScoreValue}%
              </span>
              <span className="pb-1 font-mono text-xs font-bold text-app-ink-soft tabular-nums">
                {weekCompletion.completed}/{weekCompletion.total} việc
              </span>
            </div>
            <Progress value={leadScoreValue} className="h-1.5 rounded-full bg-app-bg-subtle" />
            <p className="text-xs leading-relaxed text-app-ink-soft">
              <span className="font-bold text-app-ink">{scoreInterpretation.headline}.</span>{" "}
              {scoreInterpretation.advice}
            </p>
          </div>
        )}
      </div>

      {/* Committed actions — clean list */}
      <div className="mt-5 border-t border-app-line pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
            Hành động cam kết
          </span>
          <span className="font-mono text-[11px] font-bold text-app-ink-soft tabular-nums">
            {mergedIndicators.length} việc
          </span>
        </div>

        {mergedIndicators.length === 0 ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-input border border-dashed border-app-line bg-app-bg-subtle/50 px-4 py-3.5 text-xs leading-relaxed text-app-ink-soft">
            <AlertCircle className="h-4 w-4 shrink-0 text-app-ink-muted" aria-hidden="true" />
            Chưa có hành động cam kết nào cho tuần này.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-app-line">
            {mergedIndicators.map((indicator) => {
              const { total, completed, percent, status } = getTacticProgress(indicator);
              const st = tacticStatusStyle(status);
              return (
                <li key={indicator.id || indicator.name} className="flex items-center gap-3 py-2.5">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", st.dot)} aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-app-ink">
                    {indicator.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] font-semibold text-app-ink-soft tabular-nums">
                    {completed}/{total || indicator.target || 1}
                  </span>
                  <span className={cn("shrink-0 text-[10px] font-bold uppercase tracking-wide", st.text)}>
                    {weekCompletion.isEmpty ? st.label : `${percent}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
