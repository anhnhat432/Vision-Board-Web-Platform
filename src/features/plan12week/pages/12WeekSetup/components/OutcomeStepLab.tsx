import { ChevronDown, Flag, Lightbulb, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import { soundService } from "@/app/services/soundService";
import type { PricingPlanCode } from "@/app/utils/storage";
import type {
  AdaptiveTemplateRecommendation,
  AdaptiveTemplateSupport,
  TwelveWeekTemplateDefinition,
} from "@/app/utils/twelve-week-premium";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import { inputClass, labelClass, textareaClass } from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import { GOAL_TYPES } from "../constants";
import { getMilestoneValidationError } from "../helpers";
import type { PendingFeasibilityResult, TwelveWeekSetupDraft } from "../types";

interface OutcomeStepLabProps {
  feasibility: PendingFeasibilityResult;
  draft: TwelveWeekSetupDraft;
  currentPlan: PricingPlanCode;
  smartGoal: PendingSMARTGoal;
  selectedTemplate: TwelveWeekTemplateDefinition | null;
  recommendedTemplate: TwelveWeekTemplateDefinition | null;
  adaptiveTemplateRecommendation?: AdaptiveTemplateRecommendation | null;
  recommendedTemplateSupport?: AdaptiveTemplateSupport | null;
  onChange: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
  onTemplateSelect: (template: TwelveWeekTemplateDefinition) => void;
  onTemplatePersonalizationChange?: <K extends "dailyTimeBudget" | "personalConstraint">(
    key: K,
    value: TwelveWeekSetupDraft[K],
  ) => void;
  onPreferredDayToggle?: (dayIndex: number) => void;
}

const GOAL_TYPE_EMOJIS: Record<string, string> = {
  "Skill Learning": "🎓",
  "Habit Building": "🌱",
  "Fitness / Health": "🏃",
  "Exam / Study": "📝",
  "Career / Job Search": "💼",
  "Finance / Saving": "💰",
  "Project Completion": "🚀",
  "Personal Growth": "✨",
  Other: "🎯",
};

export function OutcomeStepLab({
  draft,
  onChange,
  smartGoal,
  feasibility,
  currentPlan: _currentPlan,
  selectedTemplate: _selectedTemplate,
  recommendedTemplate: _recommendedTemplate,
  adaptiveTemplateRecommendation: _adaptiveTemplateRecommendation,
  recommendedTemplateSupport: _recommendedTemplateSupport,
  onTemplateSelect: _onTemplateSelect,
  onTemplatePersonalizationChange: _onTemplatePersonalizationChange,
  onPreferredDayToggle: _onPreferredDayToggle,
}: OutcomeStepLabProps) {
  const [hasPlayedSuccess, setHasPlayedSuccess] = useState(false);
  const [showGoalTypes, setShowGoalTypes] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const milestoneError = getMilestoneValidationError({
    week4: draft.week4Milestone,
    week8: draft.week8Milestone,
    week12: draft.week12Outcome,
  });

  useEffect(() => {
    const isComplete = Boolean(draft.week4Milestone.trim() && draft.week8Milestone.trim() && draft.week12Outcome.trim());
    if (isComplete && !hasPlayedSuccess) {
      soundService.success();
      setHasPlayedSuccess(true);
    } else if (!isComplete) {
      setHasPlayedSuccess(false);
    }
  }, [draft.week4Milestone, draft.week8Milestone, draft.week12Outcome, hasPlayedSuccess]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="space-y-4 rounded-2xl border border-app-accent/20 bg-app-accent-soft/15 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-app-surface text-app-accent shadow-app-sm">
            <Target className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-app-accent">Đích đến tuần 12</p>
            <h3 className="mt-1 text-lg font-semibold leading-snug text-app-ink">
              Bạn muốn thấy điều gì sau 12 tuần?
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft">
              Mô tả trạng thái cuối chu kỳ, không phải danh sách việc cần làm mỗi ngày.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="week-12-outcome" className={cn(labelClass, "text-sm font-semibold text-app-ink")}>
            Đích đến bạn muốn chạm tới
          </label>
          <Textarea
            id="week-12-outcome"
            rows={3}
            value={draft.week12Outcome}
            aria-invalid={Boolean(milestoneError)}
            className={cn(textareaClass, "min-h-[92px] rounded-xl text-sm leading-relaxed")}
            onChange={(event) => onChange("week12Outcome", event.target.value)}
            placeholder="Ví dụ: Ra mắt bản beta cho 10 người dùng đầu tiên."
          />
          {smartGoal ? (
            <button
              type="button"
              onClick={() => onChange("week12Outcome", smartGoal.measurable || smartGoal.specific)}
              className="min-h-11 text-left text-xs font-semibold text-app-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
            >
              Dùng gợi ý từ mục tiêu trước
            </button>
          ) : null}
          {milestoneError ? (
            <p role="alert" className="text-xs font-semibold text-app-status-error">
              {milestoneError}
            </p>
          ) : null}
        </div>

        {feasibility.smartGoalQualityNote ? (
          <p className="rounded-xl border border-app-line bg-app-surface/75 px-3 py-2.5 text-xs leading-relaxed text-app-ink-soft">
            {feasibility.smartGoalQualityNote}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5" aria-labelledby="metric-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id="metric-title" className="text-sm font-semibold text-app-ink">
              Đo bằng gì để biết mình đã tới đích?
            </h3>
            <p className="mt-1 text-xs text-app-ink-muted">Một con số nhỏ giúp bạn nhìn lại dễ hơn.</p>
          </div>
          <span className="rounded-full bg-app-bg-subtle px-2.5 py-1 text-[10px] font-semibold text-app-ink-muted">Đã gợi ý</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.5fr_0.7fr_0.8fr]">
          <div className="space-y-1.5">
            <label htmlFor="lag-metric-name" className={cn(labelClass, "text-xs font-semibold text-app-ink")}>
              Tên chỉ số
            </label>
            <Input
              id="lag-metric-name"
              value={draft.lagMetricName}
              onChange={(event) => onChange("lagMetricName", event.target.value)}
              placeholder="Ví dụ: bản beta hoàn thành"
              className={cn(inputClass, "min-h-11 rounded-xl text-sm")}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lag-metric-target" className={cn(labelClass, "text-xs font-semibold text-app-ink")}>
              Mục tiêu
            </label>
            <Input
              id="lag-metric-target"
              value={draft.lagMetricTarget}
              onChange={(event) => onChange("lagMetricTarget", event.target.value)}
              placeholder="10"
              className={cn(inputClass, "min-h-11 rounded-xl text-sm")}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lag-metric-unit" className={cn(labelClass, "text-xs font-semibold text-app-ink")}>
              Đơn vị
            </label>
            <Input
              id="lag-metric-unit"
              value={draft.lagMetricUnit}
              onChange={(event) => onChange("lagMetricUnit", event.target.value)}
              placeholder="người dùng"
              className={cn(inputClass, "min-h-11 rounded-xl text-sm")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5" aria-labelledby="goal-type-section-title">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
              <Lightbulb className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id="goal-type-section-title" className="text-sm font-semibold text-app-ink">
                Gợi ý loại mục tiêu
              </h3>
              <p className="mt-1 text-xs text-app-ink-muted">Đang chọn: {draft.goalType || "Khác"}</p>
            </div>
          </div>
          <button
            type="button"
            aria-expanded={showGoalTypes}
            aria-controls="goal-type-options"
            onClick={() => setShowGoalTypes((open) => !open)}
            className="min-h-11 shrink-0 rounded-xl border border-app-line px-3 text-xs font-semibold text-app-accent hover:bg-app-accent-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            {showGoalTypes ? "Thu gọn" : "Đổi loại mục tiêu"}
          </button>
        </div>
        {showGoalTypes ? (
          <div id="goal-type-options" className="mt-3 flex flex-wrap gap-2">
            {GOAL_TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={draft.goalType === item.value}
                onClick={() => {
                  soundService.click();
                  onChange("goalType", item.value);
                }}
                className={cn(
                  "min-h-11 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent",
                  draft.goalType === item.value
                    ? "border-app-accent bg-app-accent text-white"
                    : "border-app-line text-app-ink-soft hover:border-app-accent/40",
                )}
              >
                <span aria-hidden="true">{GOAL_TYPE_EMOJIS[item.value] ?? "🎯"} </span>
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5">
        <button
          type="button"
          aria-expanded={isAdvancedOpen}
          aria-controls="outcome-advanced-options"
          onClick={() => setIsAdvancedOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-app-line bg-app-bg-subtle/60 px-3 text-left text-xs font-semibold text-app-accent hover:bg-app-accent-soft/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
        >
          <span className="flex items-center gap-2">
            <Flag className="size-4" aria-hidden="true" />
            Tùy chỉnh thêm
          </span>
          <ChevronDown className={cn("size-4 transition-transform", isAdvancedOpen && "rotate-180")} aria-hidden="true" />
        </button>

        {isAdvancedOpen ? (
          <div id="outcome-advanced-options" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="milestone-week-4" className={cn(labelClass, "text-xs font-semibold text-app-ink")}>
                  Mốc tuần 4
                </label>
                <Input
                  id="milestone-week-4"
                  value={draft.week4Milestone}
                  onChange={(event) => onChange("week4Milestone", event.target.value)}
                  placeholder="Ví dụ: Có bản nháp đầu tiên"
                  className={cn(inputClass, "min-h-11 rounded-xl text-sm")}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="milestone-week-8" className={cn(labelClass, "text-xs font-semibold text-app-ink")}>
                  Mốc tuần 8
                </label>
                <Input
                  id="milestone-week-8"
                  value={draft.week8Milestone}
                  onChange={(event) => onChange("week8Milestone", event.target.value)}
                  placeholder="Ví dụ: Hoàn thành phần cốt lõi"
                  className={cn(inputClass, "min-h-11 rounded-xl text-sm")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="vision-12-week" className={cn(labelClass, "text-xs font-semibold text-app-ink")}>
                Vì sao điều này quan trọng với bạn?
              </label>
              <Textarea
                id="vision-12-week"
                rows={2}
                value={draft.vision12Week}
                onChange={(event) => onChange("vision12Week", event.target.value)}
                className="min-h-[64px] rounded-xl text-sm leading-relaxed"
                placeholder="Viết một lý do đủ thật để bạn muốn giữ nhịp."
              />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
