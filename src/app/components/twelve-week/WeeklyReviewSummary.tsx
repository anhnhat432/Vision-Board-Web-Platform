import { Check, Lightbulb, Pencil } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { LeadIndicator, TwelveWeekSystem, UniversalWeeklyReview } from "../../utils/storage-types";
import type { NextWeekRecommendation } from "@/features/plan12week/logic";
import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";

interface WeeklyReviewSummaryProps {
  system: TwelveWeekSystem;
  currentWeekLimit: number;
  currentWeekRange: { start: string; end: string } | null;
  weekCompletion: { completed: number; total: number; percent: number; isEmpty?: boolean };
  _leadScoreValue: number;
  lagScoreValue: number | null;
  lagMetricValue: string;
  scoreTone: {
    marker: string;
    panel: string;
    text: string;
  };
  scoreInterpretation: {
    headline: string;
    advice: string;
  };
  mergedIndicators: Array<LeadIndicator & { isCore: boolean }>;
  getTacticProgress: (indicator: LeadIndicator) => {
    total: number;
    completed: number;
    percent: number;
    status: "Not started" | "In Progress" | "Done" | "Behind";
  };
  summaryReview: UniversalWeeklyReview;
  summaryCommitmentsKept: string[];
  summaryCommitmentsMissed: string[];
  summaryCommitmentTotal: number;
  summaryInsights: string;
  summaryNextWeekCommitments: string[];
  formatCalendarDate: (date: string) => string;
  onEditReview: () => void;
  nextWeekRecommendation: NextWeekRecommendation | null;
  onAcceptNextWeekRecommendation?: () => void;
  onOpenTodayTab?: () => void;
}

export function WeeklyReviewSummary({
  system,
  currentWeekLimit,
  currentWeekRange,
  weekCompletion,
  _leadScoreValue,
  lagScoreValue,
  lagMetricValue,
  scoreTone,
  scoreInterpretation,
  mergedIndicators,
  getTacticProgress,
  summaryReview,
  summaryCommitmentsKept,
  summaryCommitmentsMissed,
  summaryCommitmentTotal,
  summaryInsights,
  summaryNextWeekCommitments,
  formatCalendarDate,
  onEditReview,
  nextWeekRecommendation,
  onAcceptNextWeekRecommendation,
  onOpenTodayTab,
}: WeeklyReviewSummaryProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Summary Hero Card */}
      <div
        data-testid="weekly-review-summary"
        className="relative overflow-hidden rounded-card-lg border border-app-line bg-app-surface p-6 shadow-app-card weekly-card-lift sm:p-8"
      >
        {/* Decorative pin */}
        <div className="absolute -top-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center pointer-events-none select-none">
          <div className="w-3.5 h-3.5 rounded-full bg-app-warm shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2),0_1.5px_3px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Soft glow */}
        <div className="absolute -top-1/2 -right-1/4 w-2/3 h-full bg-radial-gradient from-app-accent-soft/30 to-transparent rounded-full pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 border-b border-app-line pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-app-warm" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-soft">
                Báo cáo tổng kết tuần
              </span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-app-ink leading-tight">
              Kết quả Tuần {currentWeekLimit}
            </h3>
            {currentWeekRange && (
              <span className="text-xs text-app-ink-soft block font-medium">
                {formatCalendarDate(currentWeekRange.start)} – {formatCalendarDate(currentWeekRange.end)}
              </span>
            )}
          </div>
          <Badge className="bg-app-warm-soft text-app-warm border-app-warm-border/20 font-bold px-3.5 py-1 rounded-full text-xs shadow-3xs uppercase tracking-wider">
            Đã chốt review
          </Badge>
        </div>

        {system.week12Outcome && (
          <p className="relative z-10 text-xs sm:text-sm text-app-ink-soft leading-relaxed bg-app-bg-subtle/50 px-4 py-2.5 rounded-xl border border-app-line">
            <span className="font-bold text-app-ink">Mục tiêu chu kỳ 12 tuần:</span> {system.week12Outcome}
          </p>
        )}

        {/* Focal score area */}
        <div className="relative z-10 flex flex-col items-stretch justify-between gap-6 overflow-hidden rounded-xl border border-app-line bg-app-bg-subtle/40 p-5 sm:flex-row sm:gap-8">
          <div className="flex-1 flex flex-col justify-between space-y-2.5 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted block leading-none">
              Điểm thực thi tuần
            </span>
            <div className="flex items-baseline gap-1">
              <span
                data-testid="weekly-lead-score"
                className="weekly-score-animate font-serif text-5xl font-extrabold leading-none text-app-accent sm:text-6xl"
              >
                {summaryReview.leadCompletionPercent}%
              </span>
            </div>
            <p className="text-xs text-app-ink-soft font-semibold mt-1">
              Hoàn thành {weekCompletion.completed}/{weekCompletion.total} việc cam kết.
            </p>
          </div>

          {lagScoreValue !== null && (
            <div className="relative z-10 flex flex-1 flex-col justify-between space-y-2.5 border-t border-app-line/45 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted block leading-none">
                Chỉ số kết quả tuần
              </span>
              <p
                data-testid="weekly-lag-score"
                className="font-serif text-4xl font-extrabold leading-none text-app-ink sm:text-5xl"
              >
                {lagScoreValue}%
              </p>
              <p className="mt-1 break-words text-xs font-semibold leading-snug text-app-ink-soft">
                {system.lagMetric.name}: <span className="font-bold text-app-ink">{lagMetricValue}</span>
              </p>
            </div>
          )}
        </div>

        {/* Score interpretation */}
        <div data-testid="weekly-score-interpretation" className="space-y-2 pt-1 relative z-10">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${scoreTone.panel} ${scoreTone.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${scoreTone.marker}`} />
              {scoreInterpretation.headline}
            </span>
          </div>
          <p className="text-xs text-app-ink-soft leading-relaxed font-sans">{scoreInterpretation.advice}</p>
        </div>

        {/* Tactic indicators compact grid */}
        {mergedIndicators.length > 0 && (
          <div className="space-y-3 pt-2 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted block">
              Tiến độ hành động đã cam kết
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mergedIndicators.map((indicator) => {
                const { total, completed, percent } = getTacticProgress(indicator);
                return (
                  <div
                    key={indicator.id || indicator.name}
                    className="flex items-center justify-between text-xs text-app-ink bg-app-bg-subtle/30 p-3 rounded-xl border border-app-line hover:bg-app-accent-subtle/15 transition-colors duration-200"
                  >
                    <span className="min-w-0 max-w-[70%] break-words font-semibold leading-snug">
                      {indicator.name}
                    </span>
                    <span className="font-mono text-[10px] text-app-accent font-bold shrink-0 bg-app-surface px-2.5 py-1 rounded-lg border border-app-line">
                      {completed}/{total} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 pt-2 sm:grid-cols-2 relative z-10">
          {/* Commitments kept/missed */}
          <div className="rounded-xl border border-app-line bg-app-bg-subtle/25 p-4 shadow-3xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Cam kết tuần cũ
            </span>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-app-ink">
              Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
            </p>

            <div className="mt-3.5 space-y-3 text-xs text-app-ink-soft">
              <div className="space-y-2">
                <p className="font-bold text-[10px] text-app-status-success uppercase tracking-wider">Giữ được</p>
                {summaryCommitmentsKept.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {summaryCommitmentsKept.map((commitment) => (
                      <span
                        key={`kept-${commitment}`}
                        className="inline-flex items-center gap-1 rounded-full border border-app-status-success/25 bg-app-status-success/10 px-3 py-1 text-[11px] font-semibold text-app-status-success shadow-3xs"
                      >
                        <Check className="h-3 w-3" />
                        {commitment}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-app-ink-muted">Chưa có cam kết nào được hoàn thành.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-bold text-[10px] text-app-status-error uppercase tracking-wider">Bỏ lỡ</p>
                {summaryCommitmentsMissed.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {summaryCommitmentsMissed.map((commitment) => (
                      <span
                        key={`missed-${commitment}`}
                        className="rounded-full border border-app-status-error/25 bg-app-status-error/10 px-3 py-1 text-[11px] font-semibold text-app-status-error shadow-3xs"
                      >
                        {commitment}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-app-ink-muted">Không có cam kết nào bị bỏ lỡ.</p>
                )}
              </div>
            </div>
          </div>

          {/* Next week commitments */}
          <div className="rounded-xl border border-app-line bg-app-bg-subtle/25 p-4 shadow-3xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Cam kết tuần sau
            </span>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-app-ink">
              Mục tiêu tuần sau giúp tối ưu hiệu suất và nhịp tập trung:
            </p>
            {summaryNextWeekCommitments.length > 0 ? (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {summaryNextWeekCommitments.map((commitment) => (
                  <span
                    key={commitment}
                    className="rounded-full border border-app-warm-border/40 bg-app-warm-soft px-3 py-1.5 text-xs font-semibold text-app-warm-strong shadow-3xs transition-colors duration-200 hover:bg-app-warm-soft/80"
                  >
                    {commitment}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-app-ink-muted">
                Chưa có cam kết mới được lưu cho tuần sau.
              </p>
            )}

            {summaryReview.workloadDecision && (
              <div className="mt-4 text-xs leading-relaxed text-app-ink-soft border-t border-app-line pt-3 flex items-center justify-between">
                <span className="font-semibold text-app-ink-soft">Quyết định tải việc:</span>
                <span className="font-bold text-app-warm uppercase tracking-wider">
                  {getWorkloadDecisionLabel(summaryReview.workloadDecision)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lesson blockquote */}
        {summaryInsights && (
          <div className="space-y-2 pt-2 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted block">
              Bài học kinh nghiệm rút ra
            </span>
            <blockquote className="weekly-insights-quote weekly-insights-quote-warm shadow-3xs italic leading-relaxed text-app-ink">
              <span className="absolute top-1 left-2.5 text-app-warm/25 text-4xl font-serif leading-none select-none">
                “
              </span>
              <span className="relative z-10 pl-5 block text-xs sm:text-sm font-medium">
                {summaryInsights}
              </span>
            </blockquote>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-app-line pt-4.5 relative z-10">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-xl border border-app-line bg-app-surface px-4.5 py-2.5 text-xs font-bold text-app-ink-soft transition-all hover:bg-app-bg weekly-btn-press inline-flex items-center gap-1.5"
            onClick={onEditReview}
          >
            <Pencil className="h-3.5 w-3.5" />
            Chỉnh sửa đánh giá
          </Button>
        </div>
      </div>

      {/* Next Week Action Card */}
      {nextWeekRecommendation && (
        <div className="space-y-3 rounded-card-lg border border-app-warm-border/10 bg-app-warm-soft/20 p-4 shadow-xs weekly-card-lift sm:space-y-4 sm:p-5">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-warm block">
              Chuẩn bị tuần sau
            </span>
            <h4 className="text-sm font-semibold text-app-ink leading-snug">{nextWeekRecommendation.headline}</h4>
          </div>
          <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed">{nextWeekRecommendation.body}</p>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
            {onAcceptNextWeekRecommendation && (
              <Button
                type="button"
                className="min-h-11 rounded-card bg-app-warm px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-app-warm-hover weekly-btn-press"
                onClick={onAcceptNextWeekRecommendation}
              >
                Áp dụng gợi ý tuần sau
              </Button>
            )}
            {onOpenTodayTab && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-card border-app-line bg-app-surface px-4 py-2 text-xs font-semibold text-app-ink-soft hover:bg-app-bg weekly-btn-press"
                onClick={onOpenTodayTab}
              >
                Quay lại hôm nay
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Insights teaser */}
      <div className="rounded-card-lg border border-app-line/40 bg-app-surface p-4 shadow-xs weekly-card-lift">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-app-warm-soft flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-app-warm" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-app-ink">Góc nhìn tuần sau</p>
            <p className="text-xs text-app-ink-soft leading-relaxed max-w-[65ch]">
              Dữ liệu tuần này sẽ giúp điều chỉnh tải việc và ưu tiên cho tuần tiếp theo. Bạn có thể xem lại bất cứ lúc nào.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}