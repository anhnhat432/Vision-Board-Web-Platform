import { Calendar, Target } from "lucide-react";
import { CountUp } from "../ui/count-up";
import { Progress } from "../ui/progress";
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
  getReviewDayLabel: (day: string | number) => string;
  reviewDay: string | number;
  onStartEarlyReview: () => void;
  weeklyReflectionInsights?: ReadonlyArray<ExecutionInsight>;
}

const tacticStatusStyle = (status: string) => {
  switch (status) {
    case "Done":
      return { badge: "text-app-status-success", label: "Hoàn thành" };
    case "Behind":
      return { badge: "text-app-status-error", label: "Trễ hạn" };
    case "In Progress":
      return { badge: "text-app-status-warning", label: "Đang tiến hành" };
    default:
      return { badge: "text-app-ink-muted", label: "Chưa bắt đầu" };
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
  _lagScoreValue,
  _lagMetricName,
  _lagMetricValue,
  mergedIndicators,
  getTacticProgress,
  formatCalendarDate,
  getReviewDayLabel,
  reviewDay,
  onStartEarlyReview,
}: WeeklyHeroBeforeReviewProps) {
  const scoreInterpretation = interpretWeeklyExecutionScore(leadScoreValue);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero Score Card */}
      <section className="rounded-card border border-app-line bg-app-surface p-5 sm:p-6">
        {/* Header metadata */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">
          <span className="font-serif text-xs font-bold tracking-normal normal-case text-app-accent bg-app-accent-soft/75 px-3 py-1 rounded-lg border border-app-line/20">
            Tuần {currentWeekLimit} / {totalWeeks}
          </span>
          <span className="min-w-0 bg-app-bg-subtle/80 px-3 py-1 rounded-lg border border-app-line/25 font-mono text-[11px] text-app-ink-soft flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {currentWeekRange
              ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
              : "Chu kỳ hiện tại"}
          </span>
        </div>

        {/* Focus title */}
        {currentPlanFocus && (
          <div className="relative z-10 mt-5">
            <span className="text-[10px] font-bold text-app-accent uppercase tracking-widest block mb-1">
              Tiêu điểm tuần
            </span>
            <h2 className="max-w-[28ch] text-balance font-serif text-2xl font-bold leading-snug tracking-tight text-app-ink sm:text-3xl">
              {currentPlanFocus}
            </h2>
          </div>
        )}

        {currentPlanMilestone && (
          <p className="relative z-10 mt-2 max-w-[65ch] text-xs leading-relaxed text-app-ink-soft flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-app-ink-muted" />
            <span className="font-medium text-app-ink-muted">Cột mốc:</span>
            <span className="font-semibold text-app-ink bg-app-bg-subtle px-2.5 py-0.5 rounded-md border border-app-line/30 font-sans">
              {currentPlanMilestone}
            </span>
          </p>
        )}

        {/* Score focal area */}
        <div className="relative z-10 pt-6 mt-5 border-t border-app-line/40">
          <div className="grid grid-cols-1 gap-6 items-center sm:grid-cols-[auto_1fr]">
            {/* Left: Score ring */}
            <div className="flex flex-col items-center gap-2">
              {weekCompletion.isEmpty ? (
                <span
                  data-testid="weekly-lead-score"
                  className="text-sm font-semibold text-app-ink-muted font-sans"
                >
                  Chưa có việc nào
                </span>
              ) : (
                <div
                  className="relative flex h-40 w-40 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(var(--app-accent) ${leadScoreValue}%, var(--app-line) 0)` }}
                  role="img"
                  aria-label={`Điểm thực thi ${leadScoreValue} phần trăm`}
                >
                  <div className="absolute inset-2 rounded-full bg-app-surface" />
                  <CountUp
                    data-testid="weekly-lead-score"
                    value={leadScoreValue}
                    suffix="%"
                    className="weekly-score-animate relative z-10 font-serif text-5xl font-extrabold text-app-accent leading-none tracking-tighter"
                  />
                </div>
              )}
              <span className="text-[10px] font-bold text-app-ink-soft uppercase tracking-wider">
                Điểm thực thi
              </span>
            </div>

            {/* Right: Interpretation & progress */}
            {!weekCompletion.isEmpty && (
              <div className="flex flex-col gap-3">
                <div className="w-full">
                  <div className="flex justify-between items-center text-[10px] font-bold text-app-ink-soft mb-1.5">
                    <span>Tiến độ thực hiện</span>
                    <span className="font-mono">{weekCompletion.completed}/{weekCompletion.total} việc</span>
                  </div>
                  <Progress
                    value={leadScoreValue}
                    className="h-2.5 bg-app-bg-subtle rounded-full weekly-progress-bar"
                  />
                </div>

                <div className="rounded-xl bg-app-accent-subtle/50 border border-app-accent/10 p-3">
                  <span className="font-serif text-xs font-bold text-app-accent block mb-0.5">
                    {scoreInterpretation.headline}
                  </span>
                  <p className="text-[11px] text-app-ink-soft leading-relaxed font-sans">
                    {scoreInterpretation.advice}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Folded review CTA footer */}
          <div className="mt-5 flex flex-col gap-3 border-t border-app-line/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">Chuẩn bị review</p>
              <p className="text-xs leading-relaxed text-app-ink-soft">
                Review chính thức mở vào {getReviewDayLabel(reviewDay)}. Bắt đầu sớm để chốt nhận xét trước khi tuần kết thúc.
              </p>
            </div>
            <button
              type="button"
              className="min-h-11 rounded-card border border-app-line bg-app-surface px-4.5 py-2.5 text-xs font-semibold text-app-ink shadow-2xs transition-[background-color,color,border-color,box-shadow,opacity,transform] hover:bg-app-bg sm:shrink-0"
              onClick={onStartEarlyReview}
            >
              Bắt đầu review sớm
            </button>
          </div>
        </div>
      </section>

      {/* Tactic rows */}
      <section className="rounded-card border border-app-line bg-app-surface">
        <div className="flex items-center justify-between border-b border-app-line px-4 py-4 sm:px-5">
          <h3 className="text-lg font-bold text-app-ink">Hành động cam kết</h3>
          <span className="text-sm font-semibold text-app-accent">{mergedIndicators.length} việc</span>
        </div>

        {mergedIndicators.length === 0 ? (
          <p className="px-4 py-8 text-center text-[15px] leading-relaxed text-app-ink-soft">
            Chưa có hành động cam kết nào cho tuần này.
          </p>
        ) : (
          <div data-testid="weekly-tactics-list" className="divide-y divide-app-line">
            {mergedIndicators.map((indicator) => {
              const { total, completed, percent, status } = getTacticProgress(indicator);
              const statusInfo = tacticStatusStyle(status);

              return (
                <div
                  key={indicator.id || indicator.name}
                  className="grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="break-words text-[15px] font-semibold text-app-ink">{indicator.name}</p>
                    <p className="mt-1 text-sm text-app-ink-soft">
                      {completed}/{total || indicator.target || 1} {indicator.unit || "lần"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-app-ink-soft">
                    {indicator.isCore ? "Cốt lõi" : "Tùy chọn"}
                  </span>
                  <span className={`text-sm font-bold ${statusInfo.badge}`}>
                    <span className="font-mono tabular-nums">{percent}%</span> · {statusInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Review reminder folded into hero footer above — separate card removed to reduce vertical bloat. */}
    </div>
  );
}
