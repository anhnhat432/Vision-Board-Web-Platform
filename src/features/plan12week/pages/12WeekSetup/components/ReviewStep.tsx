import { useMemo, useState, useEffect } from "react";
import { useBreakpoint } from "@/app/hooks/useBreakpoint";
import { SecondaryPanel } from "@/app/components/layout";
import { CheckCircle2, CircleAlert, CircleDot, Flag, Target, TriangleAlert, Wrench } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { getLifeAreaLabel } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import {
  getArchetypeForIntent,
  getUserIntentId,
  hasActionableArchetypeHint,
} from "@/app/utils/user-intent";
import {
  evaluateTwelveWeekPlanQuality,
  getPlanRationale,
  type PlanQualityLevel,
} from "@/features/plan12week/logic";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import {
  formatScheduleDayLabels,
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
  if (level === "strong") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (level === "okay") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-amber-300 bg-amber-50 text-amber-800";
}

function getQualityLevelLabel(level: PlanQualityLevel): string {
  if (level === "strong") return "Tốt";
  if (level === "okay") return "Ổn";
  return "Cần xem lại";
}

function getDimensionStatusMeta(status: PlanQualityLevel): {
  label: string;
  icon: typeof CheckCircle2;
  textClass: string;
} {
  if (status === "strong") {
    return { label: "Tốt", icon: CheckCircle2, textClass: "text-emerald-700" };
  }
  if (status === "okay") {
    return { label: "Ổn", icon: CircleDot, textClass: "text-amber-700" };
  }
  return { label: "Cần xem lại", icon: TriangleAlert, textClass: "text-amber-700" };
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
      return localStorage.getItem("review-step-suggestions-open") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("review-step-suggestions-open", String(suggestionsOpen));
    } catch { /* ignore */ }
  }, [suggestionsOpen]);

  const isDesktop = useBreakpoint();
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

    const _firstAction = weekOneTaskPreview[0] ?? null;
  const coreIndicators = scheduledLeadIndicators.filter((indicator) => indicator.type !== "optional");
  const optionalIndicators = scheduledLeadIndicators.filter((indicator) => indicator.type === "optional");

  return (
    <div className="mx-auto max-w-4xl stack-section">
      {/* 1. Summary - primary */}
      <div className="rounded-[var(--r-card)] border border-white/70 bg-white/72 p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tóm tắt kế hoạch</p>
        <h3 className="mt-[var(--space-inline)] text-xl font-semibold text-slate-900">{smartGoal.specific}</h3>
        <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-600">{draft.vision12Week}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">{getGoalTypeLabel(draft.goalType)}</Badge>
          <Badge variant="outline">{getLifeAreaLabel(focusArea)}</Badge>
          <Badge variant="outline">Nhìn lại {getReviewDayLabel(draft.reviewDay)}</Badge>
          <Badge variant="outline">Nhịp {getLoadPreferenceLabel(draft.tacticLoadPreference)}</Badge>
          {selectedTemplate && <Badge variant="outline">Khung {selectedTemplate.name}</Badge>}
        </div>
      </div>

      {/* 2. Outcome - primary */}
      <section className="rounded-[var(--r-card)] border-2 border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Kết quả 12 tuần</p>
        </div>
        <p className="mt-[var(--space-inline)] text-base leading-7 text-slate-900">
          {draft.week12Outcome.trim() || (
            <span className="italic text-slate-400">Chưa điền - quay lại bước 1 để bổ sung.</span>
          )}
        </p>
        {(draft.lagMetricName.trim() || draft.lagMetricTarget.trim()) && (
          <div className="mt-[var(--space-inline)] inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-emerald-200 bg-white/86 px-3 py-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Đo bằng</span>
            <span>
              {draft.lagMetricName || "-"}
              {draft.lagMetricTarget ? ` · ${draft.lagMetricTarget}` : ""}
              {draft.lagMetricUnit ? ` ${draft.lagMetricUnit}` : ""}
            </span>
          </div>
        )}
      </section>

      {/* 3. Milestones - primary */}
      <section className="rounded-[var(--r-card)] border border-white/70 bg-white/72 p-5">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-slate-600" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cột mốc giữa chu kỳ</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { label: "Tuần 4", value: draft.week4Milestone },
            { label: "Tuần 8", value: draft.week8Milestone },
            { label: "Tuần 12", value: draft.week12Outcome },
          ].map((milestone) => (
            <div key={milestone.label} className="rounded-[var(--r-tile)] border border-white/70 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{milestone.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {milestone.value.trim() || (
                  <span className="italic text-slate-400">
                    Chưa có - bạn có thể thêm trong phần nâng cao bên dưới.
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Lead indicators - primary */}
      <section className="rounded-[var(--r-card)] border border-white/70 bg-white/72 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Việc lặp lại mỗi tuần</p>
          <span className="text-xs text-slate-500">
            {coreIndicators.length} cốt lõi · {optionalIndicators.length} tùy chọn
          </span>
        </div>
        {scheduledLeadIndicators.length === 0 ? (
          <p className="mt-[var(--space-inline)] text-sm text-slate-500">Chưa có việc nào được chốt.</p>
        ) : (
          <ul className="mt-[var(--space-inline)] space-y-2">
            {scheduledLeadIndicators.map((indicator) => (
              <li
                key={indicator.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-card)] border px-3 py-2 ${
                  indicator.type === "optional" ? "border-amber-200 bg-amber-50/80" : "border-emerald-200 bg-emerald-50/80"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{indicator.name || "-"}</p>
                  <p className="text-xs text-slate-500">
                    {indicator.target || "1"} {indicator.unit || "lần/tuần"} ·{" "}
                    {formatScheduleDayLabels(indicator.schedule)}
                  </p>
                </div>
                <Badge variant={indicator.type === "optional" ? "warning" : "success"} className="text-xs">
                  {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Quality panel - secondary (collapsible) */}
      <SecondaryPanel title="Chất lượng kế hoạch" collapsible defaultOpen={isDesktop}>
        <div className="rounded-[var(--r-card)] border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Đánh giá nhanh kế hoạch
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                Chất lượng: {getQualityLevelLabel(planQuality.level)} · {planQuality.overallScore}/100
              </p>
              <p className="mt-1 text-sm text-slate-600">Đây là gợi ý - bạn vẫn có thể tạo kế hoạch.</p>
            </div>
            <span
              className={`rounded-[var(--r-pill)] border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getQualityBadgeStyle(
                planQuality.level,
              )}`}
            >
              {getQualityLevelLabel(planQuality.level)}
            </span>
          </div>

          {/* Dimensions grid - hide on mobile, show on md+ */}
          <ul className="mt-4 hidden md:grid gap-2 md:grid-cols-2">
            {planQuality.dimensions.map((dimension) => {
              const statusMeta = getDimensionStatusMeta(dimension.status);
              const StatusIcon = statusMeta.icon;
              return (
                <li
                  key={dimension.id}
                  className="flex items-center justify-between rounded-[var(--r-card)] border border-white/70 bg-white/82 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">{dimension.label}</span>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-semibold ${statusMeta.textClass}`}
                  >
                    <StatusIcon className={`h-3.5 w-3.5 ${dimension.status === "strong" ? "check-bounce" : ""}`} aria-hidden="true" />
                    <span className="sr-only">{statusMeta.label}: </span>
                    <span>
                      {dimension.score}/{dimension.maxScore}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          {planQuality.warnings.length > 0 && (
            <div className="mt-4 rounded-[var(--r-card)] border border-amber-300 bg-amber-50/82 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Cảnh báo ({planQuality.warnings.length})
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">
                {planQuality.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {planQuality.suggestions.length > 0 && (
            <details
              className="mt-[var(--space-inline)] rounded-[var(--r-card)] border border-violet-200 bg-violet-50/72 px-3 py-2"
              open={suggestionsOpen}
              onToggle={() => setSuggestionsOpen(!suggestionsOpen)}
            >
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Gợi ý cải thiện ({planQuality.suggestions.length})
              </summary>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
                {planQuality.suggestions.map((suggestion) => (
                  <li key={suggestion}>• {suggestion}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </SecondaryPanel>

      {/* 6. Rationale - secondary (collapsible) */}
      <SecondaryPanel
        title="Vì sao kế hoạch này phù hợp với bạn?"
        collapsible
        defaultOpen={isDesktop}
      >
        <div className="rounded-[var(--r-card)] border border-violet-200 bg-violet-50/76 p-5">
          <p className="mt-2 text-xs leading-6 text-violet-900/72">
            Tổng hợp từ kết quả kiểm tra, nhịp tuần, việc lặp lại và cột mốc. Đây là gợi ý — kế hoạch không bảo
            đảm thành công, nhưng giúp bạn biết vì sao nên thử cách này trước.
          </p>

          <ul data-testid="plan-rationale-reasons" className="mt-4 space-y-2 text-sm leading-6 text-slate-800">
            {planRationale.reasons.map((reason) => (
              <li
                key={reason.id}
                data-reason-id={reason.id}
                className="rounded-[var(--r-card)] border border-white/70 bg-white/82 px-3 py-2"
              >
                <span aria-hidden="true">• </span>
                {reason.text}
              </li>
            ))}
          </ul>

          {planRationale.warnings.length > 0 && (
            <div
              data-testid="plan-rationale-warnings"
              className="mt-[var(--space-inline)] rounded-[var(--r-card)] border border-amber-200 bg-amber-50/82 p-3"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Lưu ý cần biết</span>
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">
                {planRationale.warnings.map((warning) => (
                  <li key={warning.id} data-warning-id={warning.id}>
                    • {warning.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {planRationale.adjustments.length > 0 && (
            <div
              data-testid="plan-rationale-adjustments"
              className="mt-[var(--space-inline)] rounded-[var(--r-card)] border border-sky-200 bg-sky-50/82 p-3"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
                <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Nếu bạn thấy chưa khớp, có thể đổi</span>
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-sky-900">
                {planRationale.adjustments.map((adjustment) => (
                  <li key={adjustment.id} data-adjustment-id={adjustment.id}>
                    • {adjustment.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SecondaryPanel>

      {/* 7. Week 1 tasks - secondary (collapsible) */}
      {weekOneTaskPreview.length > 0 && (
        <SecondaryPanel
          title="Toàn bộ việc tuần 1"
          collapsible
          defaultOpen={isDesktop}
        >
          <div className="rounded-[var(--r-card)] border border-white/70 bg-white/72 p-5">
            <div className="mt-[var(--space-inline)] grid gap-2 md:grid-cols-2">
              {weekOneTaskPreview.map((task) => (
                <div
                  key={task}
                  className="rounded-[var(--r-card)] border border-white/70 bg-slate-50/80 px-3 py-2 text-sm text-slate-700"
                >
                  {task}
                </div>
              ))}
            </div>
            {weekOneTaskWarning ? <p className="mt-[var(--space-inline)] text-xs text-amber-600">{weekOneTaskWarning}</p> : null}
          </div>
        </SecondaryPanel>
      )}

      {/* 8. Template support - secondary (collapsible) */}
      {setupGuideSupport && setupGuideTemplate && (
        <SecondaryPanel
          title="Tuần đầu sẽ khởi động như thế nào"
          collapsible
          defaultOpen={isDesktop}
        >
          <div className="rounded-[var(--r-card)] border border-white/70 bg-white/72 p-5">
            <p className="mt-2 text-base font-semibold text-slate-900">{setupGuideSupport.week1Headline}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{setupGuideSupport.week1Support}</p>
          </div>
        </SecondaryPanel>
      )}

      {/* 9. Advanced section - secondary (collapsible) */}
      <SecondaryPanel
        title="Mở phần nâng cao (tùy chọn)"
        collapsible
        defaultOpen={isDesktop}
      >
        <div className="rounded-[var(--r-card)] border border-dashed border-slate-200 bg-slate-50/80 p-5">
          <div className="stack-stack">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="milestone-week-4">Mốc tuần 4</Label>
                <Input
                  id="milestone-week-4"
                  value={draft.week4Milestone}
                  aria-invalid={Boolean(milestoneError)}
                  aria-describedby={milestoneError ? "milestone-validation-error" : undefined}
                  className={milestoneError ? "border-rose-300 focus-visible:ring-rose-200" : undefined}
                  onChange={(event) => onChange("week4Milestone", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-week-8">Mốc tuần 8</Label>
                <Input
                  id="milestone-week-8"
                  value={draft.week8Milestone}
                  aria-invalid={Boolean(milestoneError)}
                  aria-describedby={milestoneError ? "milestone-validation-error" : undefined}
                  className={milestoneError ? "border-rose-300 focus-visible:ring-rose-200" : undefined}
                  onChange={(event) => onChange("week8Milestone", event.target.value)}
                />
              </div>
            </div>
            {milestoneError ? (
              <p id="milestone-validation-error" role="alert" className="text-xs font-medium text-rose-700">
                {milestoneError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="success-evidence">Bằng chứng thành công muốn thấy</Label>
              <Textarea
                id="success-evidence"
                rows={3}
                value={draft.successEvidence}
                onChange={(event) => onChange("successEvidence", event.target.value)}
              />
            </div>
          </div>
        </div>
      </SecondaryPanel>

      <p className="text-center text-xs text-slate-500">
        Sau khi tạo, bạn vào ngay trung tâm 12 tuần với màn Hôm nay, Tuần, Tiến độ và Cài đặt.
      </p>
    </div>
  );
}
