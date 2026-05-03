import { CheckCircle2, Flag, Sparkles, Target } from "lucide-react";

import type { PendingSMARTGoal } from "@/lib/smart-goal";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { getLifeAreaLabel } from "@/app/utils/storage";
import { evaluateTwelveWeekPlanQuality, type PlanQualityLevel } from "@/features/plan12week/logic";
import {
  buildPlanRationaleReasons,
  formatScheduleDayLabels,
  getGoalTypeLabel,
  getLoadPreferenceLabel,
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
  if (level === "okay") return "border-sky-300 bg-sky-50 text-sky-800";
  return "border-amber-300 bg-amber-50 text-amber-800";
}

function getQualityLevelLabel(level: PlanQualityLevel): string {
  if (level === "strong") return "Tốt";
  if (level === "okay") return "Ổn";
  return "Cần xem lại";
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
  const planQuality = evaluateTwelveWeekPlanQuality(
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
      feasibility: feasibility
        ? {
            planLoad: feasibility.planLoad,
            weeklyCapacity: feasibility.weeklyCapacity,
            bottleneck: feasibility.bottleneck
              ? { axis: feasibility.bottleneck.axis, label: feasibility.bottleneck.label }
              : undefined,
            adjustedScore: feasibility.adjustedScore,
            smartGoalQualityLevel: feasibility.smartGoalQualityLevel,
          }
        : undefined,
    },
  );

  const rationaleReasons = feasibility ? buildPlanRationaleReasons(feasibility) : [];
  const firstAction = weekOneTaskPreview[0] ?? null;
  const coreIndicators = scheduledLeadIndicators.filter((indicator) => indicator.type !== "optional");
  const optionalIndicators = scheduledLeadIndicators.filter((indicator) => indicator.type === "optional");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tóm tắt kế hoạch</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-900">{smartGoal.specific}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{draft.vision12Week}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">{getGoalTypeLabel(draft.goalType)}</Badge>
          <Badge variant="outline">{getLifeAreaLabel(focusArea)}</Badge>
          <Badge variant="outline">Nhìn lại {getReviewDayLabel(draft.reviewDay)}</Badge>
          <Badge variant="outline">Nhịp {getLoadPreferenceLabel(draft.tacticLoadPreference)}</Badge>
          {selectedTemplate && <Badge variant="outline">Khung {selectedTemplate.name}</Badge>}
        </div>
      </div>

      <section className="rounded-[24px] border-2 border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            Kết quả 12 tuần
          </p>
        </div>
        <p className="mt-3 text-base leading-7 text-slate-900">
          {draft.week12Outcome.trim() || (
            <span className="italic text-slate-400">Chưa điền — quay lại bước 1 để bổ sung.</span>
          )}
        </p>
        {(draft.lagMetricName.trim() || draft.lagMetricTarget.trim()) && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/86 px-3 py-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Đo bằng</span>
            <span>
              {draft.lagMetricName || "—"}
              {draft.lagMetricTarget ? ` · ${draft.lagMetricTarget}` : ""}
              {draft.lagMetricUnit ? ` ${draft.lagMetricUnit}` : ""}
            </span>
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-white/70 bg-white/72 p-5">
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
            <div
              key={milestone.label}
              className="rounded-[18px] border border-white/70 bg-slate-50/80 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {milestone.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {milestone.value.trim() || (
                  <span className="italic text-slate-400">Chưa có — bạn có thể thêm trong phần nâng cao bên dưới.</span>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/70 bg-white/72 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Việc lặp lại mỗi tuần
          </p>
          <span className="text-xs text-slate-500">
            {coreIndicators.length} cốt lõi · {optionalIndicators.length} tùy chọn
          </span>
        </div>
        {scheduledLeadIndicators.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Chưa có việc nào được chốt.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {scheduledLeadIndicators.map((indicator) => (
              <li
                key={indicator.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 ${
                  indicator.type === "optional"
                    ? "border-slate-200 bg-slate-50/80"
                    : "border-emerald-200 bg-white/82"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{indicator.name || "—"}</p>
                  <p className="text-xs text-slate-500">
                    {indicator.target || "1"} {indicator.unit || "lần/tuần"} · {formatScheduleDayLabels(indicator.schedule)}
                  </p>
                </div>
                <Badge variant={indicator.type === "optional" ? "outline" : "default"} className="text-xs">
                  {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {firstAction && (
        <section className="rounded-[24px] border border-slate-900 bg-slate-950 p-5 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-white/70" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              Việc đầu tiên ở tuần 1
            </p>
          </div>
          <p className="mt-3 text-lg font-semibold">{firstAction}</p>
          <p className="mt-2 text-sm leading-6 text-white/74">
            Đây là việc đầu tiên hệ thống tạo ngay khi bạn vào màn Hôm nay. Bắt đầu từ đây để tạo nhịp.
          </p>
        </section>
      )}

      <section
        className={`rounded-[24px] border p-5 ${
          planQuality.level === "strong"
            ? "border-emerald-200 bg-emerald-50/72"
            : planQuality.level === "okay"
              ? "border-sky-200 bg-sky-50/72"
              : "border-amber-200 bg-amber-50/78"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Đánh giá nhanh kế hoạch
            </p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              Chất lượng: {getQualityLevelLabel(planQuality.level)} · {planQuality.overallScore}/100
            </p>
            <p className="mt-1 text-sm text-slate-600">Đây là gợi ý — bạn vẫn có thể tạo kế hoạch.</p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getQualityBadgeStyle(
              planQuality.level,
            )}`}
          >
            {getQualityLevelLabel(planQuality.level)}
          </span>
        </div>

        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {planQuality.dimensions.map((dimension) => (
            <li
              key={dimension.id}
              className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/82 px-3 py-2"
            >
              <span className="text-sm text-slate-700">{dimension.label}</span>
              <span
                className={`text-xs font-semibold ${
                  dimension.status === "strong"
                    ? "text-emerald-700"
                    : dimension.status === "okay"
                      ? "text-sky-700"
                      : "text-amber-700"
                }`}
              >
                {dimension.score}/{dimension.maxScore}
              </span>
            </li>
          ))}
        </ul>

        {planQuality.warnings.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-white/86 p-3">
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
          <details className="mt-3 rounded-2xl border border-white/70 bg-white/72 px-3 py-2">
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
      </section>

      {rationaleReasons.length > 0 && (
        <section className="rounded-[24px] border border-violet-200 bg-violet-50/72 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-violet-700" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
              Vì sao kế hoạch này hợp với bạn
            </p>
          </div>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {rationaleReasons.map((reason) => (
              <li key={reason.id} className="rounded-[18px] border border-violet-200 bg-white/82 p-3">
                <p className="text-sm font-semibold text-slate-950">{reason.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{reason.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {weekOneTaskPreview.length > 0 && (
        <section className="rounded-[24px] border border-white/70 bg-white/72 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Toàn bộ việc tuần 1</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {weekOneTaskPreview.map((task) => (
              <div
                key={task}
                className="rounded-2xl border border-white/70 bg-slate-50/80 px-3 py-2 text-sm text-slate-700"
              >
                {task}
              </div>
            ))}
          </div>
          {weekOneTaskWarning ? <p className="mt-3 text-xs text-amber-600">{weekOneTaskWarning}</p> : null}
        </section>
      )}

      {setupGuideSupport && setupGuideTemplate && (
        <section className="rounded-[24px] border border-white/70 bg-white/72 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Tuần đầu sẽ khởi động như thế nào
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">{setupGuideSupport.week1Headline}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{setupGuideSupport.week1Support}</p>
        </section>
      )}

      <details className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
          Mở phần nâng cao (tùy chọn)
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="milestone-week-4">Mốc tuần 4</Label>
              <Input
                id="milestone-week-4"
                value={draft.week4Milestone}
                onChange={(event) => onChange("week4Milestone", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-week-8">Mốc tuần 8</Label>
              <Input
                id="milestone-week-8"
                value={draft.week8Milestone}
                onChange={(event) => onChange("week8Milestone", event.target.value)}
              />
            </div>
          </div>
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
      </details>

      <p className="text-center text-xs text-slate-500">
        Sau khi tạo, bạn vào ngay trung tâm 12 tuần với màn Hôm nay, Tuần, Tiến độ và Cài đặt.
      </p>
    </div>
  );
}
