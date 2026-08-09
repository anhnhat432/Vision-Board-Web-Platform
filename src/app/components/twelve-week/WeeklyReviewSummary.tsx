import { Check, Pencil } from "lucide-react";
import {
  buildNextWeekHandoffPreview,
  type NextWeekRecommendation,
  type WeeklyReviewViewModel,
} from "@/features/plan12week/logic";
import type { LeadIndicator, TwelveWeekSystem, UniversalWeeklyReview } from "../../utils/storage-types";
import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { WeeklyReviewEvidencePanel } from "./WeeklyReviewEvidencePanel";
import {
  WeeklyReviewNextWeekHandoff,
  type WeeklyReviewNextWeekHandoffResult,
} from "./WeeklyReviewNextWeekHandoff";

interface WeeklyReviewSummaryProps {
  system: TwelveWeekSystem;
  currentWeekLimit: number;
  lagScoreValue: number | null;
  lagMetricValue: string;
  reviewViewModel: WeeklyReviewViewModel;
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
  onApplyNextWeekHandoff?: (
    weekNumber: number,
    selection: { applyPriority: boolean; applyWorkload: boolean },
  ) => Promise<WeeklyReviewNextWeekHandoffResult>;
  onOpenTodayTab?: () => void;
}

export function WeeklyReviewSummary({
  system,
  currentWeekLimit,
  lagScoreValue,
  lagMetricValue,
  reviewViewModel,
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
  onApplyNextWeekHandoff,
  onOpenTodayTab,
}: WeeklyReviewSummaryProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div
        data-testid="weekly-review-summary"
        className="relative space-y-5 overflow-hidden rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:space-y-6 sm:p-6"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-app-line pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-app-warm" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-soft">
                Báo cáo tổng kết tuần
              </span>
            </div>
            <h3 className="font-serif text-xl font-bold leading-tight text-app-ink sm:text-2xl">
              Kết quả Tuần {currentWeekLimit}
            </h3>
          </div>
          <Badge className="rounded-full border-app-warm-border/20 bg-app-warm-soft px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-app-warm shadow-3xs">
            Đã chốt review
          </Badge>
        </header>

        <WeeklyReviewEvidencePanel
          evidence={reviewViewModel.evidence}
          insights={reviewViewModel.insights}
          formatCalendarDate={formatCalendarDate}
        />

        {(summaryReview.keepTactic || summaryReview.mainObstacle || summaryReview.reduceTactic) && (
          <section aria-labelledby="weekly-review-human-summary" className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">Phần của bạn</p>
              <h4 id="weekly-review-human-summary" className="mt-1 text-sm font-semibold text-app-ink">
                Bối cảnh và quyết định đã lưu
              </h4>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-app-status-success/20 bg-app-status-success/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-status-success">Điều nên giữ</p>
                <p className="mt-2 text-sm leading-relaxed text-app-ink-soft">
                  {summaryReview.keepTactic?.trim() || "Chưa ghi điều cần giữ."}
                </p>
              </div>
              <div className="rounded-xl border border-app-line bg-app-bg-subtle/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Nguyên nhân lệch nhịp</p>
                <p className="mt-2 text-sm leading-relaxed text-app-ink-soft">
                  {summaryReview.mainObstacle.trim() || "Không có trở ngại đáng kể."}
                </p>
              </div>
            </div>
            {summaryReview.reduceTactic?.trim() && (
              <div className="rounded-xl border border-app-warm-border/25 bg-app-warm-soft/25 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-warm">Điều muốn giảm hoặc bỏ</p>
                <p className="mt-2 text-sm leading-relaxed text-app-ink-soft">{summaryReview.reduceTactic}</p>
              </div>
            )}
          </section>
        )}

        {system.week12Outcome && (
          <p className="rounded-xl border border-app-line bg-app-bg-subtle/50 px-4 py-2.5 text-xs leading-relaxed text-app-ink-soft sm:text-sm">
            <span className="font-bold text-app-ink">Mục tiêu chu kỳ 12 tuần:</span> {system.week12Outcome}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-app-line bg-app-bg-subtle/25 p-4 shadow-3xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Cam kết tuần cũ
            </span>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-app-ink">
              Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
            </p>

            <div className="mt-3.5 space-y-3 text-xs text-app-ink-soft">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-status-success">Giữ được</p>
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-status-error">Bỏ lỡ</p>
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
          </section>

          <section className="rounded-xl border border-app-line bg-app-bg-subtle/25 p-4 shadow-3xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Cam kết tuần sau
            </span>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-app-ink">
              Những hành động đã chốt để bước vào tuần mới:
            </p>
            {summaryNextWeekCommitments.length > 0 ? (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {summaryNextWeekCommitments.map((commitment) => (
                  <span
                    key={commitment}
                    className="rounded-full border border-app-warm-border/40 bg-app-warm-soft px-3 py-1.5 text-xs font-semibold text-app-warm-strong shadow-3xs"
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
              <div className="mt-4 flex items-center justify-between border-t border-app-line pt-3 text-xs leading-relaxed text-app-ink-soft">
                <span className="font-semibold text-app-ink-soft">Quyết định tải việc:</span>
                <span className="font-bold uppercase tracking-wider text-app-warm">
                  {getWorkloadDecisionLabel(summaryReview.workloadDecision)}
                </span>
              </div>
            )}
          </section>
        </div>

        {summaryInsights && (
          <section className="space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Bài học kinh nghiệm rút ra
            </span>
            <blockquote className="rounded-2xl border border-app-warm-border/30 bg-app-warm-soft/35 px-4 py-3 italic leading-relaxed text-app-ink shadow-[var(--app-shadow-sm)]">
              <span className="block text-xs font-medium sm:text-sm">{summaryInsights}</span>
            </blockquote>
          </section>
        )}

        {(lagScoreValue !== null || mergedIndicators.length > 0) && (
          <section aria-labelledby="weekly-review-secondary-summary" className="space-y-4 border-t border-app-line pt-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">Chi tiết bổ sung</p>
              <h4 id="weekly-review-secondary-summary" className="mt-1 text-sm font-semibold text-app-ink">
                Chỉ số kết quả và tiến độ tactic
              </h4>
            </div>

            {lagScoreValue !== null && (
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2 rounded-xl border border-app-line bg-app-bg-subtle/35 px-4 py-3 text-xs text-app-ink-soft">
                <span className="font-semibold text-app-ink">Chỉ số kết quả</span>
                <span className="min-w-0 break-words text-right">
                  <span data-testid="weekly-lag-score" className="font-mono font-bold tabular-nums text-app-ink">
                    {lagScoreValue}%
                  </span>
                  {lagMetricValue && ` · ${system.lagMetric.name}: ${lagMetricValue}`}
                </span>
              </div>
            )}

            {mergedIndicators.length > 0 && (
              <div className="rounded-card border border-app-line bg-app-surface">
                <div className="flex items-center justify-between border-b border-app-line px-4 py-4 sm:px-5">
                  <h4 className="text-[15px] font-bold text-app-ink">Tiến độ hành động đã cam kết</h4>
                  <span className="text-sm font-semibold text-app-accent">{mergedIndicators.length} tactic</span>
                </div>
                <div data-testid="weekly-tactics-list" className="divide-y divide-app-line">
                  {mergedIndicators.map((indicator) => {
                    const { total, completed, percent, status } = getTacticProgress(indicator);
                    const statusLabel =
                      status === "Done"
                        ? "Hoàn thành"
                        : status === "Behind"
                          ? "Trễ hạn"
                          : status === "In Progress"
                            ? "Đang tiến hành"
                            : "Chưa bắt đầu";
                    const statusClassName =
                      status === "Done"
                        ? "text-app-status-success"
                        : status === "Behind"
                          ? "text-app-status-error"
                          : status === "In Progress"
                            ? "text-app-status-warning"
                            : "text-app-ink-muted";

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
                        <span className={`text-sm font-bold ${statusClassName}`}>
                          <span className="font-mono tabular-nums">{percent}%</span> · {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="flex justify-end gap-2 border-t border-app-line pt-4.5">
          <Button
            type="button"
            variant="outline"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-app-line bg-app-surface px-4.5 py-2.5 text-xs font-bold text-app-ink-soft transition-[background-color,color,border-color,box-shadow,opacity,transform] hover:bg-app-bg"
            onClick={onEditReview}
          >
            <Pencil className="h-3.5 w-3.5" />
            Chỉnh sửa đánh giá
          </Button>
        </div>
      </div>

      {nextWeekRecommendation && currentWeekLimit < system.totalWeeks && (
        <div className="space-y-3 rounded-card-lg border border-app-line bg-app-bg-subtle/25 p-4 sm:space-y-4 sm:p-5">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Gợi ý từ dữ liệu tuần
            </span>
            <h4 className="text-sm font-semibold leading-snug text-app-ink">{nextWeekRecommendation.headline}</h4>
          </div>
          <p className="text-xs leading-relaxed text-app-ink-soft sm:text-sm">{nextWeekRecommendation.body}</p>
        </div>
      )}

      <WeeklyReviewNextWeekHandoff
        preview={buildNextWeekHandoffPreview(system, summaryReview)}
        onConfirm={(selection) =>
          onApplyNextWeekHandoff
            ? onApplyNextWeekHandoff(currentWeekLimit, selection)
            : Promise.resolve({ status: "unavailable" })
        }
        onOpenTodayTab={onOpenTodayTab}
      />
    </div>
  );
}
