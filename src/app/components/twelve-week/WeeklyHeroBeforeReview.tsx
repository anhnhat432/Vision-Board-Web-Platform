import { AlertCircle, Calendar, Target } from "lucide-react";
import { CountUp } from "../ui/count-up";
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
  getReviewDayLabel: (day: string | number) => string;
  reviewDay: string | number;
  onStartEarlyReview: () => void;
  weeklyReflectionInsights?: ReadonlyArray<ExecutionInsight>;
}

const tacticStatusStyle = (status: string) => {
  switch (status) {
    case "Done":
      return {
        dot: "bg-app-status-success",
        badge: "border-app-status-success/30 bg-app-status-success/10 text-app-status-success",
        label: "Hoàn thành",
      };
    case "Behind":
      return {
        dot: "bg-app-status-error",
        badge: "border-app-status-error/30 bg-app-status-error/10 text-app-status-error",
        label: "Trễ hạn",
      };
    case "In Progress":
      return {
        dot: "bg-app-status-warning",
        badge: "border-app-status-warning/30 bg-app-status-warning/10 text-app-status-warning",
        label: "Đang tiến hành",
      };
    default:
      return {
        dot: "bg-app-ink-muted",
        badge: "border-app-line/40 bg-app-bg-subtle text-app-ink-muted",
        label: "Chưa bắt đầu",
      };
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
      <div className="relative overflow-hidden rounded-card-lg border border-app-line bg-app-surface p-6 shadow-app-card weekly-card-lift sm:p-8">
        {/* Decorative pin */}
        <div className="absolute -top-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center pointer-events-none select-none">
          <div className="w-3.5 h-3.5 rounded-full bg-app-warm shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2),0_1.5px_3px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Soft accent glow */}
        <div className="absolute -top-1/2 -right-1/4 w-2/3 h-full bg-radial-gradient from-app-accent-soft/40 to-transparent rounded-full pointer-events-none" />

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: Big score */}
            <div className="flex items-center gap-4.5">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-app-ink-soft uppercase tracking-wider block mb-1">
                  Điểm thực thi
                </span>
                {weekCompletion.isEmpty ? (
                  <span
                    data-testid="weekly-lead-score"
                    className="text-sm font-semibold text-app-ink-muted font-sans"
                  >
                    Chưa có việc nào
                  </span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <CountUp
                      data-testid="weekly-lead-score"
                      value={leadScoreValue}
                      suffix="%"
                      className="weekly-score-animate font-serif text-6xl sm:text-7xl font-extrabold text-app-accent leading-none tracking-tighter"
                    />
                  </div>
                )}
              </div>
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
        </div>
      </div>

      {/* Tactic Indicator Grid */}
      <div className="relative rounded-card border border-app-line/45 bg-app-surface p-6 sm:p-8 shadow-app-sm space-y-5 weekly-card-lift">
        {/* Washi tape */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-app-warm-soft/40 backdrop-blur-[0.5px] rotate-[1deg] border border-dashed border-app-warm-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.01)] pointer-events-none select-none z-20" />

        <div className="flex items-center justify-between border-b border-app-line/30 pb-3.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-3.5 bg-app-accent rounded-full" />
            <h3 className="text-lg font-bold text-app-ink font-serif">Hành động cam kết</h3>
          </div>
          <span className="text-xs text-app-accent font-bold bg-app-accent-soft px-3 py-1 rounded-lg border border-app-line/10">
            {mergedIndicators.length} việc
          </span>
        </div>

        {mergedIndicators.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-app-bg-subtle flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-app-ink-muted" />
            </div>
            <p className="text-xs text-app-ink-muted max-w-xs mx-auto leading-relaxed">
              Chưa có hành động cam kết nào cho tuần này. Khi các hành động lặp lại được lên lịch ở Hôm nay, chúng
              sẽ hiển thị ở đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mergedIndicators.map((indicator, idx) => {
              const { total, completed, percent, status } = getTacticProgress(indicator);
              const st = tacticStatusStyle(status);

              let statusCardClass = "weekly-action-card-notstarted";
              if (status === "Done") {
                statusCardClass = "weekly-action-card-done";
              } else if (status === "Behind") {
                statusCardClass = "weekly-action-card-behind";
              } else if (status === "In Progress") {
                statusCardClass = "weekly-action-card-inprogress";
              }

              return (
                <div
                  key={indicator.id || indicator.name}
                  className={cn(
                    "weekly-stagger-item weekly-card-lift group flex flex-col gap-3 p-4 rounded-xl weekly-action-card shadow-3xs",
                    statusCardClass
                  )}
                  style={{ "--stagger-index": idx + 1 } as React.CSSProperties}
                >
                  {/* Top row: name + core/optional badge */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        data-tactic-status={status}
                        className={`weekly-status-dot h-2 w-2 rounded-full shrink-0 ${st.dot}`}
                      />
                      <span className="min-w-0 break-words text-sm font-semibold leading-snug text-app-ink tactic-name">
                        {indicator.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider border",
                        indicator.isCore
                          ? "bg-app-status-success/10 text-app-status-success border-app-status-success/20"
                          : "bg-app-status-warning/10 text-app-status-warning border-app-status-warning/20"
                      )}
                    >
                      {indicator.isCore ? "Cốt lõi" : "Tùy chọn"}
                    </span>
                  </div>

                  {/* Middle row: progress + status */}
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <div className="flex items-center gap-2 text-xs text-app-ink-soft font-medium">
                      <span>
                        {completed}/{total || indicator.target || 1} {indicator.unit || "lần"}
                      </span>
                      {!weekCompletion.isEmpty && (
                        <span className="font-mono font-bold text-app-accent bg-app-accent-soft/60 px-2 py-0.5 rounded text-[10px]">
                          {percent}%
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", st.badge)}>
                      {st.label}
                    </span>
                  </div>

                  {/* Mini progress bar */}
                  {!weekCompletion.isEmpty && total > 0 && (
                    <div className="w-full h-1 bg-app-bg/50 rounded-full overflow-hidden mt-1">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", st.dot)}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review reminder / Next action */}
      <div className="flex flex-col gap-4 rounded-card-lg border border-app-line/40 bg-app-bg/20 p-4 weekly-card-lift sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">Chuẩn bị review</p>
          <p className="text-sm font-semibold leading-snug text-app-ink">Nhìn lại và đánh giá tuần</p>
          <p className="max-w-[65ch] text-xs leading-relaxed text-app-ink-soft">
            Review chính thức mở vào {getReviewDayLabel(reviewDay)}. Bạn có thể bắt đầu sớm nếu muốn chốt nhận xét trước khi tuần kết thúc.
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 w-full rounded-card border border-app-line bg-app-surface px-4.5 py-2.5 text-xs font-semibold text-app-ink shadow-2xs transition-all hover:bg-app-bg weekly-btn-press sm:w-auto sm:shrink-0"
          onClick={onStartEarlyReview}
        >
          Bắt đầu review sớm
        </button>
      </div>
    </div>
  );
}