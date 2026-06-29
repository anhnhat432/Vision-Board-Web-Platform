import { Check, Loader2 } from "lucide-react";
import { interpretWeeklyExecutionScore } from "@/features/plan12week/logic";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { cn } from "../ui/utils";
import { NextWeekCommitmentsEditor } from "./NextWeekCommitmentsEditor";
import { TwelveWeekEmotionFlow } from "./TwelveWeekEmotionFlow";
import { TwelveWeekPremiumInsightSection } from "./TwelveWeekPremiumInsightSection";
import type { TwelveWeekWeeklyReviewForm } from "./TwelveWeekWeekTab";
import type { PricingPlanCode, TwelveWeekSystem, UniversalWeeklyReview } from "../../utils/storage-types";
import type { SuggestedNextWeekPlan, WeeklyReviewPremiumInsight } from "../../utils/twelve-week-premium";

type WeeklyCommitmentStatus = "kept" | "missed" | "not_set" | "unanswered";

interface WeeklyReviewFormProps {
  system: TwelveWeekSystem;
  currentWeekLimit: number;
  totalWeeks: number;
  currentWeekRange: { start: string; end: string } | null;
  currentPlanFocus: string;
  weekCompletion: { completed: number; total: number; percent: number; isEmpty?: boolean };
  leadScoreValue: number;
  lagScoreValue: number | null;
  lagMetricValue: string;
  currentPlanCode: PricingPlanCode;
  hasPremiumInsights: boolean;
  premiumInsight: WeeklyReviewPremiumInsight | null;
  suggestedNextWeekPlan: SuggestedNextWeekPlan | null;
  weeklyForm: TwelveWeekWeeklyReviewForm;
  currentReview: UniversalWeeklyReview | null;
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
  weekCompletion,
  leadScoreValue,
  lagScoreValue,
  lagMetricValue,
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
  const scoreInterpretation = interpretWeeklyExecutionScore(leadScoreValue);
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Form Hero Card */}
      <div className="relative overflow-hidden rounded-card-lg border border-app-line/45 bg-app-surface p-5 pt-8 shadow-app-card weekly-card-lift sm:p-8 sm:pt-10">
        {/* Decorative pin */}
        <div className="absolute -top-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center pointer-events-none select-none">
          <div className="w-3.5 h-3.5 rounded-full bg-app-warm shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2),0_1.5px_3px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Header metadata */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">
          <span className="font-serif text-xs font-bold tracking-normal normal-case text-app-accent bg-app-accent-soft/75 px-3 py-1 rounded-lg border border-app-line/20">
            Tuần {currentWeekLimit} / {totalWeeks}
          </span>
          <span className="min-w-0 bg-app-bg-subtle/80 px-3 py-1 rounded-lg border border-app-line/25 font-mono text-[11px] text-app-ink-soft">
            {currentWeekRange
              ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
              : "Chu kỳ hiện tại"}
          </span>
        </div>

        {currentPlanFocus && (
          <div className="relative z-10 mt-5">
            <span className="text-[10px] font-bold text-app-accent uppercase tracking-widest block mb-1">
              Tiêu điểm tuần
            </span>
            <p className="max-w-[28ch] text-balance font-serif text-xl sm:text-2xl font-bold leading-snug tracking-tight text-app-ink">
              {currentPlanFocus}
            </p>
          </div>
        )}

        <div className="relative z-10 flex flex-wrap items-center gap-2 mt-3.5">
          <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg-subtle/60 px-2.5 py-0.5 text-[10px] font-bold text-app-ink-soft uppercase tracking-wider">
            Tiến độ {reviewReadyCount}/4 bước
          </span>
        </div>

        <div className="flex flex-col gap-4 border-t border-app-line/40 pt-5 mt-5 relative z-10 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-baseline justify-between text-xs font-semibold text-app-ink-soft">
              <span className="font-serif">Điểm thực thi</span>
              {weekCompletion.isEmpty ? (
                <span data-testid="weekly-lead-score" className="font-bold text-app-ink-muted">
                  Chưa có việc
                </span>
              ) : (
                <span data-testid="weekly-lead-score" className="font-bold text-app-accent">
                  {leadScoreValue}%
                </span>
              )}
            </div>
            {!weekCompletion.isEmpty && (
              <Progress value={leadScoreValue} className="h-2 bg-app-bg-subtle rounded-full" />
            )}
          </div>

          {lagScoreValue !== null && (
            <div className="flex flex-1 flex-col justify-between space-y-1.5 border-t border-app-line/30 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <div className="flex items-baseline justify-between text-xs font-semibold text-app-ink-soft">
                <span className="font-serif">Chỉ số kết quả</span>
                <span data-testid="weekly-lag-score" className="font-bold text-app-ink">
                  {lagScoreValue}%
                </span>
              </div>
              <span className="min-w-0 break-words text-xs font-medium leading-snug text-app-ink-muted">
                {system.lagMetric.name}: {lagMetricValue}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Review Form Card */}
      <div className="relative space-y-6 rounded-card-lg border border-app-line/45 bg-app-surface p-5 pt-9 shadow-app-md weekly-card-lift sm:space-y-7 sm:p-8 sm:pt-10">
        {/* Washi tape */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-app-warm-soft/40 backdrop-blur-[0.5px] rotate-[-1deg] border border-dashed border-app-warm-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.01)] pointer-events-none select-none z-20" />

        <div className="space-y-1.5 pt-1 border-b border-app-line pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-4 bg-app-warm rounded-md" />
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-app-ink">Đánh giá và cam kết tuần</h3>
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
                <div key={item.key} className="flex flex-1 flex-col items-center">
                  {idx > 0 && (
                    <div
                      className={cn(
                        "weekly-step-line absolute",
                        reviewReadinessItems[idx - 1]?.done ? "weekly-step-line--done" : "",
                      )}
                      style={{ left: `${(idx / 4) * 100}%`, width: `${100 / 4}%`, top: "14px" }}
                    />
                  )}
                  <div className={dotClass}>
                    {item.done ? <Check className="h-3 w-3" /> : idx + 1}
                  </div>
                  <span className={cn(labelClass, "mt-1.5")}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <TwelveWeekEmotionFlow system={system} currentWeekRange={currentWeekRange} currentWeek={currentWeekLimit} />

        <div id="weekly-review-flow" data-testid="weekly-review-flow" className="space-y-6">
          {/* Step 1: Execution Score */}
          <div data-testid="wam-section-score" className="weekly-review-step-card shadow-3xs hover:border-app-line-strong transition-all">
            <div
              data-testid="weekly-review-step-score"
              data-done="true"
              className="space-y-3 bg-transparent"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                <span className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-app-accent/10 text-[10px] font-extrabold text-app-accent">
                  1
                </span>
                <span>Điểm thực thi tuần này</span>
              </div>

              <div className="flex items-center gap-4 pt-1">
                {weekCompletion.isEmpty ? (
                  <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">
                    Chưa có việc trong tuần này
                  </span>
                ) : (
                  <span className="text-4xl font-serif font-extrabold text-app-accent leading-none">
                    {leadScoreValue}%
                  </span>
                )}
                {!weekCompletion.isEmpty && (
                  <div className="text-xs text-app-ink-soft leading-snug border-l border-app-line/60 pl-4 py-0.5">
                    <span className="font-bold text-app-ink block text-sm">{scoreInterpretation.headline}</span>
                    <span className="text-xs block mt-0.5 text-app-ink-soft">{scoreInterpretation.advice}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <TwelveWeekPremiumInsightSection
            currentPlanCode={currentPlanCode}
            hasPremiumInsights={hasPremiumInsights}
            premiumInsight={premiumInsight}
            suggestedNextWeekPlan={suggestedNextWeekPlan}
            onApplySuggestedPlan={onApplySuggestedPlan}
            onOpenPremiumInsights={onOpenPremiumInsights}
          />

          {/* Step 2: Commitment Check */}
          <div data-testid="wam-section-commitments" className="weekly-review-step-card shadow-3xs hover:border-app-line-strong transition-all">
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
                          <p className="text-xs italic text-app-ink-soft leading-relaxed pl-3 border-l-2 border-app-accent/40 bg-app-accent-soft/20 py-1 rounded-r-md">
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
          <div data-testid="wam-section-insights" className="weekly-review-step-card shadow-3xs hover:border-app-line-strong transition-all">
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
          <div data-testid="wam-section-next-commitments" className="weekly-review-step-card shadow-3xs hover:border-app-line-strong transition-all">
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
          className="space-y-3.5 weekly-readiness-box px-4 py-4.5 text-xs text-app-ink-soft"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                Checklist trước khi lưu
              </p>
              <p className="text-sm font-semibold text-app-ink">{reviewStatusTitle}</p>
              <p className="max-w-[65ch] text-xs leading-relaxed text-app-ink-soft">{reviewStatusHint}</p>
            </div>
            <div className="shrink-0 rounded-xl border border-app-line/45 bg-app-surface px-4 py-2.5 sm:text-right shadow-3xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-app-ink-muted leading-none">Tiến độ review</p>
              <p className="text-lg font-serif font-bold text-app-accent mt-1 leading-none">{reviewReadyCount}/4</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {reviewReadinessItems.map((item) => (
              <div
                key={item.key}
                data-testid={`weekly-review-check-${item.key}`}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                  item.done
                    ? "border-app-accent/20 bg-app-accent-soft text-app-ink shadow-3xs"
                    : "border-app-line bg-app-surface text-app-ink-soft",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    item.done ? "bg-app-accent shadow-[0_0_6px_rgba(42,84,71,0.35)]" : "bg-app-line-strong/50",
                  )}
                />
                <span className="min-w-0 break-words leading-snug">{item.label}</span>
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