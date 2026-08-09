import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

import type { WeeklyReviewViewModel } from "@/features/plan12week/logic";

import type { PricingPlanCode, TwelveWeekSystem } from "../../utils/storage-types";
import type { SuggestedNextWeekPlan, WeeklyReviewPremiumInsight } from "../../utils/twelve-week-premium";
import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { cn } from "../ui/utils";
import { NextWeekCommitmentsEditor } from "./NextWeekCommitmentsEditor";
import { TwelveWeekEmotionFlow } from "./TwelveWeekEmotionFlow";
import { TwelveWeekPremiumInsightSection } from "./TwelveWeekPremiumInsightSection";
import type { TwelveWeekWeeklyReviewForm } from "./TwelveWeekWeekTab";
import { WeeklyReviewEvidencePanel } from "./WeeklyReviewEvidencePanel";

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
  nextWeekCommitments: string[];
  canSubmitWeeklyReview: boolean;
  reviewStatusTitle: string;
  reviewStatusHint: string;
  reviewStickyStatus: string;
  isSavingReview: boolean;
  isEditingReview: boolean;
  isStartingEarly: boolean;
  isFinalWeek: boolean;
  isNoTaskWeek: boolean;
  isPerfectWeek: boolean;
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

const WORKLOAD_OPTIONS = ["keep same", "reduce slightly", "increase slightly"] as const;

function getCommitmentButtonClass(status: WeeklyCommitmentStatus, currentStatus: WeeklyCommitmentStatus): string {
  const isActive = status === currentStatus;
  if (!isActive) {
    return "min-h-11 w-full rounded-lg border-app-line bg-app-surface px-3 py-2 text-xs leading-tight text-app-ink-soft transition-colors hover:bg-app-bg-subtle";
  }
  if (status === "kept") {
    return "min-h-11 w-full rounded-lg border-app-status-success/30 bg-app-status-success/10 px-3 py-2 text-xs font-semibold leading-tight text-app-status-success";
  }
  if (status === "missed") {
    return "min-h-11 w-full rounded-lg border-app-status-error/30 bg-app-status-error/10 px-3 py-2 text-xs font-semibold leading-tight text-app-status-error";
  }
  return "min-h-11 w-full rounded-lg border-app-line-strong bg-app-bg-subtle px-3 py-2 text-xs font-semibold leading-tight text-app-ink-soft";
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
  nextWeekCommitments,
  canSubmitWeeklyReview,
  reviewStatusTitle,
  reviewStatusHint,
  reviewStickyStatus,
  isSavingReview,
  isEditingReview,
  isStartingEarly,
  isFinalWeek,
  isNoTaskWeek,
  isPerfectWeek,
  formatCalendarDate,
  onWeeklyFormChange,
  onApplySuggestedPlan,
  onOpenPremiumInsights,
  onSaveWeeklyReview,
  onCancelReview,
}: WeeklyReviewFormProps) {
  const [isCommitmentDetailOpen, setIsCommitmentDetailOpen] = useState(false);
  const answeredQuestionCount = [
    weeklyForm.keepTactic.trim().length > 0,
    weeklyForm.mainObstacle.trim().length > 0,
    nextWeekCommitments.length > 0 ||
      weeklyForm.reduceTactic.trim().length > 0 ||
      weeklyForm.workloadDecision === "reduce slightly" ||
      weeklyForm.workloadDecision === "increase slightly",
  ].filter(Boolean).length;
  const questionOne = isNoTaskWeek
    ? "Tuần này có điều gì đáng ghi lại?"
    : "Điều gì đã giúp bạn tiến lên tuần này?";
  const questionTwo = isNoTaskWeek
    ? "Điều gì khiến tuần này chưa có việc được lên lịch?"
    : isPerfectWeek
      ? "Có điều gì vẫn làm bạn tốn sức hoặc có thể làm gọn hơn?"
      : "Điều gì khiến kế hoạch lệch khỏi dự kiến?";
  const questionThree = isFinalWeek
    ? "Bạn muốn mang điều gì sang chu kỳ tiếp theo?"
    : "Tuần sau bạn muốn thay đổi điều gì?";

  return (
    <div className="space-y-5 sm:space-y-6">
      <section
        data-testid="weekly-review-context"
        className="rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="rounded-lg border border-app-line/20 bg-app-accent-soft/75 px-3 py-1 font-serif text-xs font-bold text-app-accent">
            Tuần {currentWeekLimit} / {totalWeeks}
          </span>
          <span className="rounded-lg border border-app-line/25 bg-app-bg-subtle/80 px-3 py-1 font-mono text-[11px] text-app-ink-soft">
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
            <h2 className="max-w-[28ch] text-balance font-serif text-xl font-bold leading-snug text-app-ink sm:text-2xl">
              {currentPlanFocus}
            </h2>
          </div>
        )}
      </section>

      <div data-testid="wam-section-score">
        <WeeklyReviewEvidencePanel
          evidence={reviewViewModel.evidence}
          insights={reviewViewModel.insights}
          formatCalendarDate={formatCalendarDate}
        />
      </div>

      <section
        aria-labelledby="weekly-review-questions-heading"
        className="space-y-5 rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:p-6"
      >
        <header className="border-b border-app-line/70 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-warm">Phần của bạn</p>
          <h3 id="weekly-review-questions-heading" className="mt-1 font-serif text-xl font-bold text-app-ink sm:text-2xl">
            Ba câu hỏi để chốt tuần
          </h3>
          <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-app-ink-soft sm:text-sm">
            Hệ thống đã chuẩn bị dữ kiện. Bạn chỉ cần bổ sung bối cảnh và quyết định điều sẽ thay đổi.
          </p>
        </header>

        <div className="space-y-4" data-testid="weekly-review-three-questions">
          <div className="rounded-xl border border-app-line/60 bg-app-bg-subtle/20 p-4">
            <Label htmlFor="weekly-keep-tactic" className="text-sm font-bold leading-relaxed text-app-ink">
              1. {questionOne}
            </Label>
            <p className="mt-1 text-xs leading-relaxed text-app-ink-muted">
              Ghi lại cách làm, thời điểm hoặc điều kiện đáng giữ.
            </p>
            <Textarea
              id="weekly-keep-tactic"
              rows={3}
              className="mt-3 rounded-xl border-app-line-strong bg-app-surface text-sm"
              value={weeklyForm.keepTactic}
              placeholder={isNoTaskWeek ? "Ví dụ: Mình đã dành được một khoảng yên tĩnh để nghĩ lại hướng đi." : "Ví dụ: Deep work buổi sáng trước khi mở tin nhắn."}
              onChange={(event) => onWeeklyFormChange("keepTactic", event.target.value)}
            />
          </div>

          <div className="rounded-xl border border-app-line/60 bg-app-bg-subtle/20 p-4">
            <Label htmlFor="weekly-main-obstacle" className="text-sm font-bold leading-relaxed text-app-ink">
              2. {questionTwo}
            </Label>
            <p className="mt-1 text-xs leading-relaxed text-app-ink-muted">
              Chỉ bạn mới biết nguyên nhân; hệ thống không tự suy diễn phần này.
            </p>
            <Textarea
              id="weekly-main-obstacle"
              rows={3}
              className="mt-3 rounded-xl border-app-line-strong bg-app-surface text-sm"
              value={weeklyForm.mainObstacle}
              placeholder={isPerfectWeek ? "Ví dụ: Vẫn mất nhiều thời gian chuyển ngữ cảnh giữa các việc." : "Ví dụ: Hai buổi họp muộn làm mất khung tập trung chính."}
              onChange={(event) => onWeeklyFormChange("mainObstacle", event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 min-h-11 px-3 text-xs text-app-ink-soft"
              onClick={() => onWeeklyFormChange("mainObstacle", "Không có trở ngại đáng kể.")}
            >
              Không có trở ngại đáng kể
            </Button>
          </div>

          <div className="rounded-xl border border-app-warm-border/30 bg-app-warm-soft/20 p-4">
            <Label htmlFor="weekly-next-commitments" className="text-sm font-bold leading-relaxed text-app-ink">
              3. {questionThree}
            </Label>
            <p className="mt-1 text-xs leading-relaxed text-app-ink-muted">
              Chọn 1-3 thay đổi đủ cụ thể. Review sẽ lưu trước; plan chỉ đổi sau bước xác nhận riêng.
            </p>
            <NextWeekCommitmentsEditor
              value={nextWeekCommitments}
              maxItems={3}
              onChange={(next) => onWeeklyFormChange("nextWeekCommitments", next)}
            />

            <div className="mt-4">
              <Label htmlFor="weekly-reduce-tactic" className="text-xs font-semibold text-app-ink-soft">
                Điều muốn giảm hoặc bỏ (không bắt buộc)
              </Label>
              <Textarea
                id="weekly-reduce-tactic"
                rows={2}
                className="mt-2 rounded-xl border-app-line bg-app-surface text-sm"
                value={weeklyForm.reduceTactic}
                placeholder="Ví dụ: Việc tùy chọn buổi tối."
                onChange={(event) => onWeeklyFormChange("reduceTactic", event.target.value)}
              />
            </div>

            {!isFinalWeek && (
              <fieldset className="mt-4">
                <legend className="text-xs font-semibold text-app-ink-soft">Mức tải bạn muốn thử</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {WORKLOAD_OPTIONS.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant="outline"
                      className={cn(
                        "min-h-11 rounded-xl text-xs",
                        weeklyForm.workloadDecision === option
                          ? "border-app-warm-border bg-app-warm-soft text-app-warm-strong"
                          : "border-app-line bg-app-surface text-app-ink-soft",
                      )}
                      aria-pressed={weeklyForm.workloadDecision === option}
                      onClick={() => onWeeklyFormChange("workloadDecision", option)}
                    >
                      {getWorkloadDecisionLabel(option)}
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </div>

        {previousCommitments.length > 0 ? (
          <Collapsible open={isCommitmentDetailOpen} onOpenChange={setIsCommitmentDetailOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-app-line bg-app-bg-subtle/30 px-4 py-3 text-left text-xs font-semibold text-app-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <span>Phân loại cam kết cũ (không bắt buộc)</span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", isCommitmentDetailOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3 rounded-xl border border-app-line/60 bg-app-bg-subtle/20 p-4">
              <p className="text-xs leading-relaxed text-app-ink-muted">
                Cam kết cũ là free text nên hệ thống không tự đoán đã giữ hay bỏ lỡ. Bạn có thể bổ sung nếu thấy hữu ích.
              </p>
              {previousCommitments.map((commitment) => {
                const currentStatus = weeklyForm.commitmentStatuses[commitment] ?? "unanswered";
                const setStatus = (status: WeeklyCommitmentStatus) =>
                  onWeeklyFormChange("commitmentStatuses", {
                    ...weeklyForm.commitmentStatuses,
                    [commitment]: status,
                  });
                return (
                  <div key={commitment} className="rounded-xl border border-app-line/50 bg-app-surface p-3">
                    <p className="text-sm font-semibold leading-snug text-app-ink">{commitment}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {(["kept", "missed", "not_set"] as const).map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={getCommitmentButtonClass(status, currentStatus)}
                          aria-pressed={currentStatus === status}
                          onClick={() => setStatus(status)}
                        >
                          {status === "kept" ? "Đã giữ" : status === "missed" ? "Bỏ lỡ" : "Không đặt"}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <p className="rounded-xl border border-dashed border-app-line bg-app-bg-subtle/30 px-4 py-3 text-xs text-app-ink-soft">
            Tuần đầu chưa có cam kết cũ cần phân loại.
          </p>
        )}

        <div data-testid="weekly-review-readiness" className="rounded-xl border border-app-line/50 bg-app-bg-subtle/30 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-app-ink">{reviewStatusTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">{reviewStatusHint}</p>
            </div>
            <span className="shrink-0 rounded-lg border border-app-line bg-app-surface px-3 py-1.5 font-mono text-xs font-bold text-app-accent">
              {answeredQuestionCount}/3 câu
            </span>
          </div>
        </div>

        <div className="hidden gap-2 md:flex md:items-center md:justify-end">
          {(isEditingReview || isStartingEarly) && (
            <Button type="button" variant="outline" className="min-h-11" onClick={onCancelReview}>
              Hủy chỉnh sửa
            </Button>
          )}
          <Button
            type="button"
            className="min-h-11 bg-app-warm text-white hover:bg-app-warm-hover"
            onClick={onSaveWeeklyReview}
            disabled={isSavingReview || !canSubmitWeeklyReview}
            aria-busy={isSavingReview}
          >
            {isSavingReview ? "Đang lưu…" : "Lưu review"}
          </Button>
        </div>
      </section>

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

      <div
        data-testid="weekly-review-mobile-sticky-cta"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-app-line/80 bg-app-surface/95 px-4 pb-4 pt-3 shadow-[0_-18px_40px_-30px_rgba(23,21,15,0.45)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3 text-[11px] font-semibold text-app-ink-muted">
            <span>Đã trả lời {answeredQuestionCount}/3 câu</span>
            <span className={canSubmitWeeklyReview ? "text-app-warm-strong" : "text-app-ink-muted"}>
              {reviewStickyStatus}
            </span>
          </div>
          <Button
            type="button"
            size="lg"
            className="min-h-12 w-full rounded-xl bg-app-warm text-sm font-bold text-white hover:bg-app-warm-hover"
            onClick={onSaveWeeklyReview}
            disabled={isSavingReview || !canSubmitWeeklyReview}
            aria-busy={isSavingReview}
          >
            {isSavingReview ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                Đang lưu…
              </>
            ) : (
              "Lưu review"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
