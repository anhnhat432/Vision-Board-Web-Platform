import { CheckCircle2, CircleAlert, CircleDot, type LucideIcon, TriangleAlert, Wrench } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import { formatDateInputValue, getLifeAreaLabel } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { getArchetypeForIntent, getUserIntentId, hasActionableArchetypeHint } from "@/app/utils/user-intent";
import { evaluateTwelveWeekPlanQuality, getPlanRationale, type PlanQualityLevel } from "@/features/plan12week/logic";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import {
  errorTextClass,
  inputClass,
  labelClass,
  textareaClass,
} from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import {
  addDays,
  formatScheduleDayLabels,
  getCycleWeekStart,
  getGoalTypeLabel,
  getLoadPreferenceLabel,
  getMilestoneValidationError,
  getReviewDayLabel,
} from "../helpers";
import type { LeadIndicatorDraft, PendingFeasibilityResult, TwelveWeekSetupDraft } from "../types";

interface ReviewStepProps {
  smartGoal: PendingSMARTGoal;
  draft: TwelveWeekSetupDraft;
  focusArea: string;
  selectedTemplate: TwelveWeekTemplateDefinition | null;
  setupGuideSupport: AdaptiveTemplateSupport | null;
  setupGuideTemplate: TwelveWeekTemplateDefinition | null;
  weekOneTaskPreview: string[];
  weekOneTaskWarning: string | null;
  feasibility: PendingFeasibilityResult | null;
  scheduledLeadIndicators: Array<LeadIndicatorDraft & { schedule: number[] }>;
  onChange: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
}

function getQualityBadgeStyle(level: PlanQualityLevel): string {
  if (level === "strong") return "border-app-accent bg-app-accent-soft text-app-accent";
  if (level === "okay") return "border-app-line bg-app-bg text-app-ink-soft";
  return "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]";
}

function getQualityLevelLabel(level: PlanQualityLevel): string {
  if (level === "strong") return "Tốt";
  if (level === "okay") return "Ổn";
  return "Cần xem lại";
}

function getDimensionStatusMeta(status: PlanQualityLevel): {
  label: string;
  icon: LucideIcon;
  textClass: string;
} {
  if (status === "strong") {
    return { label: "Tốt", icon: CheckCircle2, textClass: "text-app-accent" };
  }
  if (status === "okay") {
    return { label: "Ổn", icon: CircleDot, textClass: "text-app-ink-soft" };
  }
  return { label: "Cần xem lại", icon: TriangleAlert, textClass: "text-[color:var(--color-danger-fg)]" };
}

function jumpToSetupStep(stepIndex: number) {
  if (typeof document === "undefined") return;
  const stepButton = document.querySelector<HTMLButtonElement>(`button[aria-label^="Đi tới bước ${stepIndex + 1}:"]`);
  stepButton?.click();
}

function getCycleDates(startDate: string): { start: string; end: string } {
  const parsedStart = startDate ? new Date(`${startDate}T00:00:00`) : null;
  if (!parsedStart || Number.isNaN(parsedStart.getTime())) {
    return { start: "Chưa chọn", end: "Chưa chọn" };
  }

  const cycleStart = getCycleWeekStart(parsedStart);
  return {
    start: formatDateInputValue(cycleStart),
    end: formatDateInputValue(addDays(cycleStart, 83)),
  };
}

function ReviewSection({
  caption,
  title,
  stepIndex,
  children,
}: {
  caption: string;
  title: string;
  stepIndex: number;
  children: ReactNode;
}) {
  return (
    <section
      className="min-w-0 border-b border-app-line pb-5 last:border-0"
      aria-labelledby={`review-section-${stepIndex}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-semibold uppercase leading-snug tracking-[0.14em] text-app-ink-muted">
            {caption}
          </p>
          <h3
            id={`review-section-${stepIndex}`}
            className="mt-1 break-words font-serif text-xl font-medium leading-snug text-app-ink"
          >
            {title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => jumpToSetupStep(stepIndex)}
          aria-label={`Sửa ${title}`}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-2 py-1 text-xs font-medium text-app-accent transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Sửa
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="break-words text-xs font-semibold uppercase leading-snug tracking-[0.14em] text-app-ink-muted">
        {label}
      </p>
      <div className="mt-1 break-words text-sm leading-6 text-app-ink">{children}</div>
    </div>
  );
}

function EmptyValue({ children }: { children: ReactNode }) {
  return <span className="text-app-ink-muted">{children}</span>;
}

export function ReviewStep({
  smartGoal,
  draft,
  focusArea,
  selectedTemplate,
  setupGuideSupport,
  setupGuideTemplate,
  weekOneTaskPreview,
  weekOneTaskWarning,
  feasibility,
  scheduledLeadIndicators,
  onChange,
}: ReviewStepProps) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem("review-step-suggestions-open") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("review-step-suggestions-open", String(suggestionsOpen));
    } catch {}
  }, [suggestionsOpen]);

  const milestoneError = getMilestoneValidationError({
    week4: draft.week4Milestone,
    week8: draft.week8Milestone,
    week12: draft.week12Outcome,
  });

  const intentArchetype = useMemo(() => {
    const intent = getUserIntentId();
    if (!intent || !hasActionableArchetypeHint(intent)) return null;
    return getArchetypeForIntent(intent);
  }, []);

  const cycleDates = useMemo(() => getCycleDates(draft.startDate), [draft.startDate]);
  const coreIndicators = scheduledLeadIndicators.filter((indicator) => indicator.type !== "optional");
  const optionalIndicators = scheduledLeadIndicators.filter((indicator) => indicator.type === "optional");

  const feasibilityContext = feasibility
    ? {
        planLoad: feasibility.planLoad,
        weeklyCapacity: feasibility.weeklyCapacity,
        bottleneck: feasibility.bottleneck
          ? { axis: feasibility.bottleneck.axis, label: feasibility.bottleneck.label }
          : undefined,
        adjustedScore: feasibility.adjustedScore,
        smartGoalQualityLevel: feasibility.smartGoalQualityLevel,
      }
    : undefined;

  const rationaleInput = useMemo(
    () => ({
      vision12Week: draft.vision12Week,
      week12Outcome: draft.week12Outcome,
      goalArchetype: intentArchetype,
      leadIndicators: scheduledLeadIndicators.map((indicator) => ({
        name: indicator.name,
        target: indicator.target,
        schedule: indicator.schedule,
        type: indicator.type,
      })),
      milestones: {
        week4: draft.week4Milestone,
        week8: draft.week8Milestone,
        week12: draft.week12Outcome,
      },
      reviewDay: draft.reviewDay,
      tacticLoadPreference: draft.tacticLoadPreference,
      weeklyTaskCount: weekOneTaskPreview.length,
      firstTaskTitle: weekOneTaskPreview[0],
    }),
    [
      draft.vision12Week,
      draft.week12Outcome,
      draft.week4Milestone,
      draft.week8Milestone,
      draft.reviewDay,
      draft.tacticLoadPreference,
      weekOneTaskPreview,
      scheduledLeadIndicators,
      intentArchetype,
    ],
  );

  const planRationale = useMemo(
    () =>
      getPlanRationale(rationaleInput, {
        feasibility: feasibilityContext ?? null,
        goalArchetype: intentArchetype,
      }),
    [rationaleInput, feasibilityContext, intentArchetype],
  );

  const planQuality = useMemo(
    () =>
      evaluateTwelveWeekPlanQuality(
        {
          vision12Week: draft.vision12Week,
          week12Outcome: draft.week12Outcome,
          goalType: draft.goalType,
          lagMetric: { name: draft.lagMetricName, target: draft.lagMetricTarget, unit: draft.lagMetricUnit },
          leadIndicators: scheduledLeadIndicators.map((indicator) => ({
            name: indicator.name,
            target: indicator.target,
            schedule: indicator.schedule,
            type: indicator.type,
          })),
          milestones: {
            week4: draft.week4Milestone,
            week8: draft.week8Milestone,
            week12: draft.week12Outcome,
          },
          reviewDay: draft.reviewDay,
          tacticLoadPreference: draft.tacticLoadPreference,
          dailyTimeBudget: draft.dailyTimeBudget,
          personalConstraint: draft.personalConstraint,
        },
        {
          weeklyTaskCount: weekOneTaskPreview.length,
          firstTaskTitle: weekOneTaskPreview[0],
          feasibility: feasibilityContext,
        },
      ),
    [
      draft.vision12Week,
      draft.week12Outcome,
      draft.goalType,
      draft.lagMetricName,
      draft.lagMetricTarget,
      draft.lagMetricUnit,
      draft.week4Milestone,
      draft.week8Milestone,
      draft.reviewDay,
      draft.tacticLoadPreference,
      draft.dailyTimeBudget,
      draft.personalConstraint,
      scheduledLeadIndicators,
      weekOneTaskPreview,
      feasibilityContext,
    ],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-app-accent" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">Rà soát cuối</p>
            <h3 className="mt-2 font-serif text-2xl font-medium leading-7 text-app-ink">
              Kiểm tra lần cuối trước khi kích hoạt chu kỳ.
            </h3>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">
              Sau khi lưu, bạn vào trung tâm 12 tuần với Hôm nay, Tuần, Tiến độ và Cài đặt.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent">
            {getGoalTypeLabel(draft.goalType)}
          </span>
          <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent">
            {getLifeAreaLabel(focusArea)}
          </span>
          <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent">
            Nhìn lại {getReviewDayLabel(draft.reviewDay)}
          </span>
          <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent">
            Nhịp {getLoadPreferenceLabel(draft.tacticLoadPreference)}
          </span>
        </div>
      </div>

      <div className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 sm:p-6">
        <div className="space-y-5">
          <ReviewSection caption="KẾT QUẢ" title="Kết quả 12 tuần" stepIndex={0}>
            <div className="grid gap-4 md:grid-cols-2">
              <SummaryItem label="Mục tiêu SMART">
                {smartGoal.specific || <EmptyValue>Chưa có mục tiêu SMART.</EmptyValue>}
              </SummaryItem>
              <SummaryItem label="Tầm nhìn 12 tuần">
                {draft.vision12Week.trim() || <EmptyValue>Chưa điền tầm nhìn 12 tuần.</EmptyValue>}
              </SummaryItem>
              <SummaryItem label="Outcome statement">
                {draft.week12Outcome.trim() || <EmptyValue>Chưa điền kết quả tuần 12.</EmptyValue>}
              </SummaryItem>
              <SummaryItem label="Chỉ số">
                {draft.lagMetricName.trim() || draft.lagMetricTarget.trim() ? (
                  <span>
                    {draft.lagMetricName || "-"}
                    {draft.lagMetricTarget ? ` · ${draft.lagMetricTarget}` : ""}
                    {draft.lagMetricUnit ? ` ${draft.lagMetricUnit}` : ""}
                  </span>
                ) : (
                  <EmptyValue>Chưa có chỉ số kết quả.</EmptyValue>
                )}
              </SummaryItem>
            </div>
          </ReviewSection>

          <ReviewSection caption="LEAD" title="Việc lặp lại mỗi tuần" stepIndex={1}>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent">
                {coreIndicators.length} cốt lõi
              </span>
              <span className="rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-xs text-app-ink-muted">
                {optionalIndicators.length} tùy chọn
              </span>
            </div>
            {scheduledLeadIndicators.length === 0 ? (
              <p className="mt-3 text-sm text-app-ink-soft">Chưa có việc nào được chốt.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {scheduledLeadIndicators.map((indicator) => (
                  <li key={indicator.id} className="rounded-lg border border-app-line bg-app-bg px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-medium text-app-ink">{indicator.name || "-"}</p>
                      <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent">
                        {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-xs leading-relaxed text-app-ink-muted">
                      {indicator.target || "1"} {indicator.unit || "lần/tuần"} ·{" "}
                      {formatScheduleDayLabels(indicator.schedule)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ReviewSection>

          <ReviewSection caption="LỊCH" title="Chu kỳ và tuần đầu" stepIndex={2}>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryItem label="Bắt đầu">{cycleDates.start}</SummaryItem>
              <SummaryItem label="Kết thúc">{cycleDates.end}</SummaryItem>
              <SummaryItem label="Ngày nhìn lại">{getReviewDayLabel(draft.reviewDay)}</SummaryItem>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { label: "Tuần 4", value: draft.week4Milestone },
                { label: "Tuần 8", value: draft.week8Milestone },
                { label: "Tuần 12", value: draft.week12Outcome },
              ].map((milestone) => (
                <div key={milestone.label} className="rounded-lg border border-app-line bg-app-bg p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                    {milestone.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-app-ink-soft">
                    {milestone.value.trim() || <EmptyValue>Chưa có.</EmptyValue>}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                {weekOneTaskPreview.length > 0 ? "Việc tuần 1" : "Tuần đầu"}
              </p>
              {weekOneTaskPreview.length > 0 ? (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {weekOneTaskPreview.map((task) => (
                    <div
                      key={task}
                      className="min-w-0 break-words rounded-lg border border-app-line bg-app-bg px-3 py-2 text-sm leading-6 text-app-ink-soft"
                    >
                      {task}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-app-ink-soft">Chưa có việc tuần 1 để xem trước.</p>
              )}
              {weekOneTaskWarning ? (
                <p className="mt-3 text-xs leading-5 text-[color:var(--color-danger-fg)]">{weekOneTaskWarning}</p>
              ) : null}
            </div>
          </ReviewSection>

          <ReviewSection caption="TỔNG QUAN" title="Chất lượng và gợi ý" stepIndex={3}>
            <div className="rounded-lg border border-app-line bg-app-bg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                    Đánh giá nhanh kế hoạch
                  </p>
                  <p className="mt-2 text-sm font-medium text-app-ink">
                    Chất lượng: {getQualityLevelLabel(planQuality.level)} · {planQuality.overallScore}/100
                  </p>
                  <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                    Đây là gợi ý — bạn vẫn có thể tạo kế hoạch.
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                    getQualityBadgeStyle(planQuality.level),
                  )}
                >
                  {getQualityLevelLabel(planQuality.level)}
                </span>
              </div>

              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {planQuality.dimensions.map((dimension) => {
                  const statusMeta = getDimensionStatusMeta(dimension.status);
                  const StatusIcon = statusMeta.icon;
                  return (
                    <li
                      key={dimension.id}
                      className="flex items-center justify-between rounded-lg border border-app-line bg-app-surface px-3 py-2"
                    >
                      <span className="text-sm text-app-ink-soft">{dimension.label}</span>
                      <span className={cn("flex items-center gap-1.5 text-xs font-medium", statusMeta.textClass)}>
                        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">{statusMeta.label}: </span>
                        <span>
                          {dimension.score}/{dimension.maxScore}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              {planQuality.warnings.length > 0 ? (
                <div className="mt-4 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-danger-fg)]">
                    Cảnh báo ({planQuality.warnings.length})
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-[color:var(--color-danger-fg)]">
                    {planQuality.warnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {planQuality.suggestions.length > 0 ? (
                <details
                  className="mt-4 rounded-lg border border-app-line bg-app-surface px-3 py-2"
                  open={suggestionsOpen}
                  onToggle={(event) => setSuggestionsOpen(event.currentTarget.open)}
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center break-words text-xs font-medium leading-snug text-app-accent">
                    Gợi ý cải thiện ({planQuality.suggestions.length})
                  </summary>
                  <ul className="mt-2 space-y-1 break-words text-sm leading-6 text-app-ink-soft">
                    {planQuality.suggestions.map((suggestion) => (
                      <li key={suggestion}>• {suggestion}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg border border-app-line bg-app-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                Vì sao kế hoạch này phù hợp
              </p>
              <p className="mt-2 text-xs leading-6 text-app-ink-soft">
                Tổng hợp từ kết quả kiểm tra, nhịp tuần, việc lặp lại và cột mốc.
              </p>
              <ul data-testid="plan-rationale-reasons" className="mt-3 space-y-2 text-sm leading-6 text-app-ink-soft">
                {planRationale.reasons.map((reason) => (
                  <li
                    key={reason.id}
                    data-reason-id={reason.id}
                    className="rounded-lg border border-app-line bg-app-surface px-3 py-2"
                  >
                    • {reason.text}
                  </li>
                ))}
              </ul>

              {planRationale.warnings.length > 0 ? (
                <div
                  data-testid="plan-rationale-warnings"
                  className="mt-3 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3"
                >
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-danger-fg)]">
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Lưu ý cần biết</span>
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-[color:var(--color-danger-fg)]">
                    {planRationale.warnings.map((warning) => (
                      <li key={warning.id} data-warning-id={warning.id}>
                        • {warning.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {planRationale.adjustments.length > 0 ? (
                <div
                  data-testid="plan-rationale-adjustments"
                  className="mt-3 rounded-lg border border-app-line bg-app-surface p-3"
                >
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
                    <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Nếu bạn thấy chưa khớp, có thể đổi</span>
                  </p>
                  <ul className="mt-2 space-y-1 break-words text-sm leading-6 text-app-ink-soft">
                    {planRationale.adjustments.map((adjustment) => (
                      <li key={adjustment.id} data-adjustment-id={adjustment.id}>
                        • {adjustment.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {setupGuideSupport && setupGuideTemplate ? (
              <div className="mt-4 rounded-lg border border-app-line bg-app-bg p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                  Tuần đầu theo khung {setupGuideTemplate.name}
                </p>
                <p className="mt-2 text-sm font-medium text-app-ink">{setupGuideSupport.week1Headline}</p>
                <p className="mt-2 text-sm leading-6 text-app-ink-soft">{setupGuideSupport.week1Support}</p>
              </div>
            ) : null}

            {selectedTemplate ? (
              <p className="mt-4 rounded-lg border border-app-line bg-app-bg px-3 py-2 text-sm leading-6 text-app-ink-soft">
                Khung đang dùng: <span className="font-medium text-app-ink">{selectedTemplate.name}</span>
              </p>
            ) : null}
          </ReviewSection>
        </div>

        <div className="mt-6 rounded-card border border-app-line bg-app-bg p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
            <p className="text-sm leading-6 text-app-ink-soft">
              Tôi đã rà soát toàn bộ trước khi lưu. Nếu có điểm chưa khớp, dùng nút Sửa hoặc thanh bước phía trên để
              quay lại.
            </p>
          </div>
        </div>
      </div>

      <details className="surface-raised rounded-xl border border-app-line bg-app-surface p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center break-words text-sm font-medium leading-snug text-app-ink">
          Mở phần nâng cao (tùy chọn)
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="milestone-week-4" className={labelClass}>
                Mốc tuần 4
              </label>
              <Input
                id="milestone-week-4"
                value={draft.week4Milestone}
                aria-invalid={Boolean(milestoneError)}
                aria-describedby={milestoneError ? "milestone-validation-error" : undefined}
                className={cn(
                  inputClass,
                  milestoneError &&
                    "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
                )}
                onChange={(event) => onChange("week4Milestone", event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="milestone-week-8" className={labelClass}>
                Mốc tuần 8
              </label>
              <Input
                id="milestone-week-8"
                value={draft.week8Milestone}
                aria-invalid={Boolean(milestoneError)}
                aria-describedby={milestoneError ? "milestone-validation-error" : undefined}
                className={cn(
                  inputClass,
                  milestoneError &&
                    "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
                )}
                onChange={(event) => onChange("week8Milestone", event.target.value)}
              />
            </div>
          </div>
          {milestoneError ? (
            <p id="milestone-validation-error" role="alert" className={errorTextClass}>
              {milestoneError}
            </p>
          ) : null}
          <div>
            <label htmlFor="success-evidence" className={labelClass}>
              Bằng chứng thành công muốn thấy
            </label>
            <Textarea
              id="success-evidence"
              rows={3}
              value={draft.successEvidence}
              onChange={(event) => onChange("successEvidence", event.target.value)}
              className={textareaClass}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
