import { Check, Loader2 } from "lucide-react";
import { Fragment } from "react";
import type { WeeklyReviewViewModel } from "@/features/plan12week/logic";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { cn } from "../ui/utils";
import { NextWeekCommitmentsEditor } from "./NextWeekCommitmentsEditor";
import { TwelveWeekEmotionFlow } from "./TwelveWeekEmotionFlow";
import { TwelveWeekPremiumInsightSection } from "./TwelveWeekPremiumInsightSection";
import type { TwelveWeekWeeklyReviewForm } from "./TwelveWeekWeekTab";
import { WeeklyReviewEvidencePanel } from "./WeeklyReviewEvidencePanel";
import type { PricingPlanCode, TwelveWeekSystem } from "../../utils/storage-types";
import type { SuggestedNextWeekPlan, WeeklyReviewPremiumInsight } from "../../utils/twelve-week-premium";

type WeeklyCommitmentStatus = "kept" | "missed" | "not_set" | "unanswered";

interface WeeklyReviewFormProps {
  system: TwelveWeekSystem;
  currentWeekLimit: number;
  totalWeeks: number;
  currentWeekRange: { start: string; end: string } | null;
  currentPlanFocus: string;
  lagScoreValue: number | null;
  lagMetricValue: string;
  reviewViewModel: WeeklyReviewViewModel;
  currentPlanCode: PricingPlanCode;
  hasPremiumInsights: boolean;
  premiumInsight: WeeklyReviewPremiumInsight | null;
  suggestedNextWeekPlan: SuggestedNextWeekPlan | null;
  weeklyForm: TwelveWeekWeeklyReviewForm;
  previousCommitments: string[];
  allPreviousCommitmentsAnswered: boolean;
  nextWeekCommitments: string[];
  hasNextWeekCommitment: boolean;
  reviewReadinessItems: Array<{ key: string; label: string; done: boolean }>;
  reviewReadyCount: number;
  _reviewPendingItems: Array<{ key: string; label: string; done: boolean }>;
  canSubmitWeeklyReview: boolean;
  reviewStatusTitle: string;
  reviewStatusHint: string;
  reviewStickyStatus: string;
  isSavingReview: boolean;
  isEditingReview: boolean;
  isStartingEarly: boolean;
  formatCalendarDate: (date: string) => string;
  onWeeklyFormChange: <K extends keyof TwelveWeekWeeklyReviewForm>(
    field: K,
    value: TwelveWeekWeeklyReviewForm[K],
  ) => void;
  onApplySuggestedPlan: () => void;
  onOpenPremiumInsights: () => void;
  onSaveWeeklyReview: () => void;
  onCancelReview: () => void;
}


function getCommitmentButtonClass(status: WeeklyCommitmentStatus, currentStatus: WeeklyCommitmentStatus): string {
  const isActive = status === currentStatus;
  if (!isActive) {
    return "w-full border-app-line bg-app-surface px-3 py-2 text-xs min-h-11 flex items-center justify-center rounded-lg text-center leading-tight text-app-ink-soft transition-all duration-200 hover:bg-app-bg-subtle weekly-btn-press";
  }

  switch (status) {
    case "kept":
      return "w-full border-app-status-success/30 bg-app-status-success/10 px-3 py-2 text-xs min-h-11 flex items-center justify-center rounded-lg text-center font-semibold leading-tight text-app-status-success shadow-2xs ring-1 ring-app-status-success/15 transition-all duration-200 hover:bg-app-status-success/20 weekly-btn-press";
    case "missed":
      return "w-full border-app-status-error/30 bg-app-status-error/10 px-3 py-2 text-xs min-h-11 flex items-center justify-center rounded-lg text-center font-semibold leading-tight text-app-status-error shadow-2xs ring-1 ring-app-status-error/15 transition-all duration-200 hover:bg-app-status-error/20 weekly-btn-press";
    case "not_set":
      return "w-full border-app-line-strong bg-app-bg-subtle px-3 py-2 text-xs min-h-11 flex items-center justify-center rounded-lg text-center font-semibold leading-tight text-app-ink-soft shadow-2xs transition-all duration-200 hover:bg-app-line-strong/20 weekly-btn-press";
    default:
      return "w-full border-app-ink bg-app-ink px-3 py-2 text-xs min-h-11 flex items-center justify-center rounded-lg text-center font-semibold leading-tight text-white shadow-2xs transition-all duration-200 weekly-btn-press";
  }
}

function truncateCommitmentQuote(value: string, maxLength = 80): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function getCommitmentQuoteForPreviousCommitment(
  system: TwelveWeekSystem,
  commitment: string,
): string | null {
  const normalizedCommitment = commitment.trim().toLocaleLowerCase("vi-VN");
  if (!normalizedCommitment) return null;

  const indicator = system.leadIndicators.find((leadIndicator) => {
    const indicatorName = leadIndicator.name.trim().toLocaleLowerCase("vi-VN");
    return (
      indicatorName === normalizedCommitment ||
      normalizedCommitment.includes(indicatorName) ||
      indicatorName.includes(normalizedCommitment)
    );
  });
  const want = indicator?.commitment?.want?.trim();

  return want ? `“${truncateCommitmentQuote(want)}”` : null;
}

export function WeeklyReviewForm({
  system,
  currentWeekLimit,
  totalWeeks,
  currentWeekRange,
  currentPlanFocus,
  lagScoreValue,
  lagMetricValue,
  reviewViewModel,
  currentPlanCode,
  hasPremiumInsights,
  premiumInsight,
  suggestedNextWeekPlan,
  weeklyForm,
  previousCommitments,
  allPreviousCommitmentsAnswered,
  nextWeekCommitments,
  hasNextWeekCommitment,
  reviewReadinessItems,
  reviewReadyCount,
  _reviewPendingItems,
  canSubmitWeeklyReview,
  reviewStatusTitle,
  reviewStatusHint,
  reviewStickyStatus,
  isSavingReview,
  isEditingReview,
  isStartingEarly,
  formatCalendarDate,
  onWeeklyFormChange,
  onApplySuggestedPlan,
  onOpenPremiumInsights,
  onSaveWeeklyReview,
  onCancelReview,
}: WeeklyReviewFormProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section
        data-testid="weekly-review-context"
        className="rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">
          <span className="rounded-lg border border-app-line/20 bg-app-accent-soft/75 px-3 py-1 font-serif text-xs font-bold tracking-normal text-app-accent normal-case">
            Tuần {currentWeekLimit} / {totalWeeks}
          </span>
          <span className="min-w-0 rounded-lg border border-app-line/25 bg-app-bg-subtle/80 px-3 py-1 font-mono text-[11px] text-app-ink-soft">
            {currentWeekRange
              ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
              : "Chu kỳ hiện tại"}
          </span>
        </div>

        {currentPlanFocus && (
          <div className="mt-5">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-app-accent">
              Tiêu điểm tuần
            </span>
            <h2 className="max-w-[28ch] text-balance font-serif text-xl font-bold leading-snug tracking-tight text-app-ink sm:text-2xl">
              {currentPlanFocus}
            </h2>
          </div>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg-subtle/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-app-ink-soft">
            Tiến độ {reviewReadyCount}/4 bước
          </span>
        </div>
      </section>

      <div data-testid="wam-section-score">
        <div data-testid="weekly-review-step-score" data-done="true">
          <WeeklyReviewEvidencePanel
            evidence={reviewViewModel.evidence}
            insights={reviewViewModel.insights}
            formatCalendarDate={formatCalendarDate}
          />
        </div>
      </div>

      {/* Review Form Card */}
      <div className="relative space-y-5 rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:space-y-6 sm:p-6">
        <div className="space-y-1.5 border-b border-app-line/70 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-app-warm" />
            <h3 className="font-serif text-xl font-bold text-app-ink sm:text-2xl">Đánh giá và cam kết tuần</h3>
          </div>
          <p className="max-w-[65ch] text-xs leading-relaxed text-app-ink-soft sm:text-sm">
            Ghi chép lại bài học tuần cũ và thiết lập ưu tiên tuần mới để giữ nhịp thực thi ổn định.
          </p>
        </div>

        {/* Step Progress Indicator */}
          <div className="px-1">
            <div className="weekly-step-progress">
              {reviewReadinessItems.map((item, idx) => {
                const isFirstPending = !item.done && reviewReadinessItems.slice(0, idx).every((prev) => prev.done);
                const isActive = isFirstPending;
                const dotClass = item.done
                  ? "weekly-step-dot weekly-step-dot--done"
                  : isActive
                    ? "weekly-step-dot weekly-step-dot--active"
                    : "weekly-step-dot weekly-step-dot--pending";
                const labelClass = item.done
                  ? "weekly-step-label weekly-step-label--done"
                  : isActive
                    ? "weekly-step-label weekly-step-label--active"
                    : "weekly-step-label";

                return (
                  <Fragment key={item.key}>
                    {idx > 0 && (
                      <div
                        className={cn(
                          "weekly-step-line",
                          reviewReadinessItems[idx - 1]?.done ? "weekly-step-line--done" : "",
                        )}
                      />
                    )}
                    <div className="flex flex-col items-center">
                      <div className={dotClass}>
                        {item.done ? <Check className="h-3 w-3" /> : idx + 1}
                      </div>
                      <span className={cn(labelClass, "mt-1.5")}>{item.label}</span>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>

        <div id="weekly-review-flow" data-testid="weekly-review-flow" className="space-y-6">
          {/* Step 2: Commitment Check */}
          <div data-testid="wam-section-commitments" className="weekly-review-step-card hover:border-app-line-strong transition-all">
            <div
              data-testid="weekly-review-step-commitments"
              data-done={allPreviousCommitmentsAnswered ? "true" : "false"}
              className="space-y-3 bg-transparent"
            >
              <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                <span className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-app-warm-soft text-[10px] font-extrabold text-app-warm-strong">
                  2
                </span>
                <span>Đánh giá cam kết cũ</span>
              </Label>
              <p className="text-xs text-app-ink-muted">Chọn trạng thái cho các cam kết tuần trước.</p>

              {previousCommitments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-app-line bg-app-bg-subtle/50 px-4 py-3.5 text-xs leading-relaxed text-app-ink-soft">
                  Tuần đầu chưa có cam kết tuần trước. Hãy đặt ưu tiên tuần sau tại mục 4 bên dưới.
                </div>
              ) : (
                <div className="space-y-3.5 mt-2.5">
                  {previousCommitments.map((commitment) => {
                    const currentStatus = weeklyForm.commitmentStatuses[commitment] ?? "unanswered";
                    const commitmentQuote = getCommitmentQuoteForPreviousCommitment(system, commitment);
                    const setStatus = (status: WeeklyCommitmentStatus) =>
                      onWeeklyFormChange("commitmentStatuses", {
                        ...weeklyForm.commitmentStatuses,
                        [commitment]: status,
                      });

                    return (
                      <div
                        key={commitment}
                        className="space-y-3 rounded-xl border border-app-line/50 bg-app-bg-subtle/30 p-3.5 transition-colors duration-200 hover:border-app-line/85"
                      >
                        <p className="text-xs sm:text-sm font-semibold text-app-ink leading-snug">{commitment}</p>
                        {commitmentQuote && (
                          <p className="rounded-xl border border-app-accent/12 bg-app-accent-soft/25 px-3 py-2 text-xs italic leading-relaxed text-app-ink-soft">
                            {commitmentQuote}
                          </p>
                        )}
                        <div className="grid grid-cols-3 gap-2.5 pt-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={getCommitmentButtonClass("kept", currentStatus)}
                            aria-pressed={currentStatus === "kept"}
                            onClick={() => setStatus("kept")}
                          >
                            Đã giữ
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={getCommitmentButtonClass("missed", currentStatus)}
                            aria-pressed={currentStatus === "missed"}
                            onClick={() => setStatus("missed")}
                          >
                            Bỏ lỡ
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={getCommitmentButtonClass("not_set", currentStatus)}
                            aria-pressed={currentStatus === "not_set"}
                            onClick={() => setStatus("not_set")}
                          >
                            Không đặt
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Breakdown / Lesson */}
          <div data-testid="wam-section-insights" className="weekly-review-step-card hover:border-app-line-strong transition-all">
            <div
              data-testid="weekly-review-step-insights"
              data-done={weeklyForm.insights.trim().length > 0 ? "true" : "false"}
              className="space-y-3 bg-transparent"
            >
              <Label
                htmlFor="weekly-insights"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft"
              >
                <span className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-app-accent/10 text-[10px] font-extrabold text-app-accent">
                  3
                </span>
                <span>Góc nhìn/điều học được</span>
              </Label>
              <p className="text-xs text-app-ink-muted">Ghi nhận bài học kinh nghiệm rút ra trong tuần.</p>
              <Textarea
                id="weekly-insights"
                rows={3}
                className="mt-2.5 text-xs sm:text-sm bg-app-surface border-app-line-strong rounded-xl placeholder:text-app-ink-muted/50 p-3.5 focus:ring-1 focus:ring-app-accent/20 transition-all duration-200 font-sans"
                value={weeklyForm.insights}
                placeholder="Ví dụ: Tuần qua mình nhận ra học sâu 90 phút buổi sáng hiệu quả hơn học lắt nhắt buổi tối. Tuần sau dời khung giờ..."
                onChange={(event) => onWeeklyFormChange("insights", event.target.value)}
              />
            </div>
          </div>

          {/* Step 4: Next Week Commitments */}
          <div data-testid="wam-section-next-commitments" className="weekly-review-step-card hover:border-app-line-strong transition-all">
            <div
              data-testid="weekly-review-step-next"
              data-done={hasNextWeekCommitment ? "true" : "false"}
              className="space-y-3 bg-transparent"
            >
              <Label
                htmlFor="weekly-next-commitments"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft"
              >
                <span className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-app-warm-soft text-[10px] font-extrabold text-app-warm-strong">
                  4
                </span>
                <span>Cam kết của tuần tới</span>
              </Label>
              <p className="text-xs text-app-ink-muted">Chọn tối đa 5 hành động quan trọng nhất cho tuần mới.</p>
              <div className="mt-2">
                <NextWeekCommitmentsEditor
                  value={nextWeekCommitments}
                  onChange={(next) => onWeeklyFormChange("nextWeekCommitments", next)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Review readiness indicator */}
        <div
          data-testid="weekly-review-readiness"
          className="weekly-readiness-box rounded-xl border border-app-line/40 bg-app-bg-subtle/30 px-4 py-3 text-xs text-app-ink-soft"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                Checklist trước khi lưu
              </p>
              <p className="text-sm font-semibold text-app-ink">{reviewStatusTitle}</p>
              <p className="max-w-[65ch] text-xs leading-relaxed text-app-ink-soft">{reviewStatusHint}</p>
            </div>
            <div className="shrink-0 rounded-lg border border-app-line/40 bg-app-surface px-3 py-1.5 text-right shadow-3xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted leading-none">Tiến độ review</p>
              <p className="text-base font-serif font-bold text-app-accent mt-0.5 leading-none">{reviewReadyCount}/4</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {reviewReadinessItems.map((item) => (
              <div
                key={item.key}
                data-testid={`weekly-review-check-${item.key}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all",
                  item.done
                    ? "border-app-accent/20 bg-app-accent-soft text-app-ink shadow-3xs"
                    : "border-app-line bg-app-surface text-app-ink-soft",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    item.done ? "bg-app-accent shadow-[0_0_6px_rgba(42,84,71,0.35)]" : "bg-app-line-strong/50",
                  )}
                />
                <span className="min-w-0 truncate leading-snug">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden gap-2 pt-1 md:flex md:flex-row md:items-center md:justify-end">
          {(isEditingReview || isStartingEarly) && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-card border-app-line bg-app-surface px-4 py-2 text-xs font-semibold text-app-ink-soft transition-all hover:bg-app-bg weekly-btn-press"
              onClick={onCancelReview}
            >
              Quay lại hôm nay
            </Button>
          )}
          <Button
            size="sm"
            className="min-h-11 rounded-card bg-app-warm px-4.5 py-2.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-app-warm-hover active:shadow-app-sm weekly-btn-press"
            onClick={onSaveWeeklyReview}
            disabled={isSavingReview || !canSubmitWeeklyReview}
            aria-busy={isSavingReview}
          >
            {isSavingReview ? "Đang lưu..." : "Chốt review tuần này"}
          </Button>
        </div>
      </div>

      <div data-testid="weekly-review-secondary-details" className="space-y-4">
        <TwelveWeekEmotionFlow system={system} currentWeekRange={currentWeekRange} currentWeek={currentWeekLimit} />
        <TwelveWeekPremiumInsightSection
          currentPlanCode={currentPlanCode}
          hasPremiumInsights={hasPremiumInsights}
          premiumInsight={premiumInsight}
          suggestedNextWeekPlan={suggestedNextWeekPlan}
          onApplySuggestedPlan={onApplySuggestedPlan}
          onOpenPremiumInsights={onOpenPremiumInsights}
        />
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
      </div>

      {/* Sticky Mobile Review CTA */}
      <div
        data-testid="weekly-review-mobile-sticky-cta"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-app-line/80 bg-app-surface/95 px-4 pb-4 pt-3 backdrop-blur-md md:hidden shadow-[0_-18px_40px_-30px_rgba(23,21,15,0.45)]"
      >
        <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-2.5 md:max-w-none">
          <div className="flex items-start justify-between gap-3 text-[11px] font-semibold text-app-ink-muted">
            <span className="min-w-0 break-words leading-snug">Tiến độ review {reviewReadyCount}/4</span>
            <span className={canSubmitWeeklyReview ? "text-app-warm-strong" : "text-app-ink-muted"}>
              {reviewStickyStatus}
            </span>
          </div>
          <Button
            size="lg"
            className="min-h-12 w-full rounded-xl bg-app-warm px-4 py-3 text-sm font-bold text-white shadow-app-sm transition-all duration-150 hover:bg-app-warm-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-app-ink-muted disabled:opacity-70 weekly-btn-press"
            onClick={onSaveWeeklyReview}
            disabled={isSavingReview || !canSubmitWeeklyReview}
            aria-busy={isSavingReview}
          >
            {isSavingReview ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                Đang lưu...
              </>
            ) : (
              "Chốt review tuần này"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
