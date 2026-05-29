import { Award, ClipboardCheck, Flag, Lightbulb, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
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

const selectTriggerClass =
  "h-auto rounded-lg border border-app-line bg-app-surface px-3.5 py-2.5 text-sm font-normal text-app-ink shadow-none focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2";
const selectContentClass = "surface-elevated rounded-xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]";
const selectItemClass = "cursor-pointer text-sm text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink";

interface MilestoneRoadmapProps {
  week4: string;
  week8: string;
  week12: string;
}

function MilestoneRoadmap({ week4, week8, week12 }: MilestoneRoadmapProps) {
  const isW4Filled = week4.trim().length > 0;
  const isW8Filled = week8.trim().length > 0;
  const isW12Filled = week12.trim().length > 0;

  return (
    <div className="relative w-full py-4 bg-slate-50/40 dark:bg-slate-950/20 rounded-xl border border-slate-200/50 dark:border-slate-800/40 px-4 select-none overflow-hidden max-w-xl mx-auto">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-450 mb-4 text-center">
        LỘ TRÌNH CHẶNG ĐƯỜNG 12 TUẦN (ĐÃ TỰ ĐỘNG CHIA NHỎ)
      </p>

      <div className="relative w-full aspect-[320/75] flex items-center justify-center">
        <svg
          viewBox="0 0 320 75"
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="expedition-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Đường nền */}
          <path
            d="M 40 30 H 280"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-200 dark:text-slate-800"
          />

          {/* Đường tiến trình */}
          <path
            d={`M 40 30 H ${isW12Filled ? 280 : isW8Filled ? 200 : isW4Filled ? 120 : 40}`}
            fill="none"
            stroke="url(#expedition-active-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Các mốc điểm */}
        <div
          className="absolute flex flex-col items-center z-10"
          style={{ left: "12.5%", top: "40%", transform: "translate(-50%, -50%)" }}
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-indigo-500 bg-white dark:bg-slate-900 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shadow-sm">
            W1
          </div>
          <span className="mt-1.5 text-[9px] font-bold text-slate-500 tracking-wide uppercase">Khởi đầu</span>
        </div>

        <div
          className="absolute flex flex-col items-center z-10"
          style={{ left: "37.5%", top: "40%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
              isW4Filled
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm scale-105"
                : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60",
            )}
          >
            W4
          </div>
          <span
            className={cn(
              "mt-1.5 text-[9px] font-bold tracking-wide uppercase transition-colors duration-300",
              isW4Filled ? "text-slate-650 dark:text-slate-350" : "text-slate-400",
            )}
          >
            Chặng 1
          </span>
        </div>

        <div
          className="absolute flex flex-col items-center z-10"
          style={{ left: "62.5%", top: "40%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
              isW8Filled
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm scale-105"
                : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60",
            )}
          >
            W8
          </div>
          <span
            className={cn(
              "mt-1.5 text-[9px] font-bold tracking-wide uppercase transition-colors duration-300",
              isW8Filled ? "text-slate-650 dark:text-slate-350" : "text-slate-400",
            )}
          >
            Chặng 2
          </span>
        </div>

        <div
          className="absolute flex flex-col items-center z-10"
          style={{ left: "87.5%", top: "40%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
              isW12Filled
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm scale-110"
                : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60",
            )}
          >
            W12
          </div>
          <span
            className={cn(
              "mt-1.5 text-[9px] font-bold tracking-wide uppercase transition-colors duration-300",
              isW12Filled ? "text-emerald-650 dark:text-emerald-450" : "text-slate-400",
            )}
          >
            Đích đến
          </span>
        </div>
      </div>
    </div>
  );
}

export function OutcomeStepLab({ draft, onChange }: OutcomeStepLabProps) {
  const [hasPlayedSuccess, setHasPlayedSuccess] = useState(false);
  const isW4Filled = draft.week4Milestone.trim().length > 0;
  const isW8Filled = draft.week8Milestone.trim().length > 0;
  const isW12Filled = draft.week12Outcome.trim().length > 0;

  useEffect(() => {
    if (isW4Filled && isW8Filled && isW12Filled) {
      if (!hasPlayedSuccess) {
        soundService.success();
        setHasPlayedSuccess(true);
      }
    } else {
      setHasPlayedSuccess(false);
    }
  }, [isW4Filled, isW8Filled, isW12Filled, hasPlayedSuccess]);

  const milestoneError = getMilestoneValidationError({
    week4: draft.week4Milestone,
    week8: draft.week8Milestone,
    week12: draft.week12Outcome,
  });

  return (
    <div className="space-y-6">
      {/* BIỂU MẪU LỘ TRÌNH CỐT LÕI (ĐÃ TỰ ĐIỀN) */}
      <section
        className="relative overflow-hidden rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm space-y-5"
        aria-labelledby="outcome-required-title"
      >
        <div className="flex items-center justify-between border-b border-app-line/60 pb-3">
          <div>
            <h3 id="outcome-required-title" className="text-xs font-extrabold uppercase tracking-wider text-app-accent">
              Lộ trình 12 tuần của bạn
            </h3>
            <p className="mt-0.5 text-[11px] text-app-ink-muted">
              Chúng tôi đã tự động chia nhỏ mục tiêu của bạn làm 3 chặng chốt. Bạn có thể chỉnh sửa lại nếu cần.
            </p>
          </div>
          <span className="rounded-full bg-app-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-app-accent border border-app-accent/15">
            Tự điền 90%
          </span>
        </div>

        {/* Milestone Roadmap */}
        <MilestoneRoadmap week4={draft.week4Milestone} week8={draft.week8Milestone} week12={draft.week12Outcome} />

        <div className="space-y-4 pt-2">
          {/* Cột mốc Tuần 4 & Tuần 8 - Đặt cùng một hàng ngang */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="milestone-week-4"
                className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}
              >
                <Target className="h-4 w-4 text-app-accent shrink-0" />
                <span>Cột mốc chặng 1 (Tuần 4)</span>
              </label>
              <Input
                id="milestone-week-4"
                value={draft.week4Milestone}
                className={inputClass}
                onChange={(event) => onChange("week4Milestone", event.target.value)}
                placeholder="Mốc chặng 1..."
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="milestone-week-8"
                className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}
              >
                <Flag className="h-4 w-4 text-app-accent shrink-0" />
                <span>Cột mốc chặng 2 (Tuần 8)</span>
              </label>
              <Input
                id="milestone-week-8"
                value={draft.week8Milestone}
                className={inputClass}
                onChange={(event) => onChange("week8Milestone", event.target.value)}
                placeholder="Mốc chặng 2..."
              />
            </div>
          </div>

          {/* Đích đến cuối cùng Tuần 12 */}
          <div className="space-y-1.5">
            <label
              htmlFor="week-12-outcome"
              className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}
            >
              <Award className="h-4 w-4 text-app-accent shrink-0" />
              <span>Đích đến cuối cùng (Tuần 12)</span>
            </label>
            <Textarea
              id="week-12-outcome"
              rows={2}
              value={draft.week12Outcome}
              aria-invalid={Boolean(milestoneError)}
              className={cn(
                textareaClass,
                "min-h-[60px] text-xs",
                milestoneError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-150",
              )}
              onChange={(event) => onChange("week12Outcome", event.target.value)}
              placeholder="Đích đến sau 12 tuần..."
            />
            {milestoneError && (
              <p role="alert" className="text-[10px] font-bold text-red-500">
                {milestoneError}
              </p>
            )}
          </div>

          {/* Động lực cốt lõi */}
          <div className="space-y-1.5">
            <label
              htmlFor="vision-12-week"
              className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}
            >
              <Lightbulb className="h-4 w-4 text-app-accent shrink-0" />
              <span>Ý nghĩa quan trọng giúp bạn giữ nhịp?</span>
            </label>
            <Textarea
              id="vision-12-week"
              rows={2}
              value={draft.vision12Week}
              onChange={(event) => onChange("vision12Week", event.target.value)}
              className="min-h-[50px] text-xs"
              placeholder="Ví dụ: Giúp cải thiện sức khỏe lâu dài..."
            />
          </div>

          {/* Loại mục tiêu */}
          <div className="space-y-1.5">
            <label htmlFor="goal-type" className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}>
              <ClipboardCheck className="h-4 w-4 text-app-accent shrink-0" />
              <span>Phân loại mục tiêu</span>
            </label>
            <Select value={draft.goalType} onValueChange={(value) => onChange("goalType", value)}>
              <SelectTrigger id="goal-type" className={selectTriggerClass}>
                <SelectValue placeholder="Chọn loại mục tiêu" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {GOAL_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value} className={selectItemClass}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </div>
  );
}
