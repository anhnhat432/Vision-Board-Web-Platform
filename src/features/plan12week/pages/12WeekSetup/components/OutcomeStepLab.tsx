import { useEffect, useState } from "react";
import { Lightbulb, Lock, Sparkles, ChevronDown, Target, Flag, Award, ClipboardCheck, ArrowRight } from "lucide-react";

import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import type { PricingPlanCode } from "@/app/utils/storage";
import {
  TWELVE_WEEK_TEMPLATE_CATALOG,
  getPlanLabel,
  planSatisfiesRequirement,
  type AdaptiveTemplateRecommendation,
  type AdaptiveTemplateSupport,
  type TwelveWeekTemplateDefinition,
} from "@/app/utils/twelve-week-premium";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import { soundService } from "@/app/services/soundService";
import {
  errorTextClass,
  helperTextClass,
  inputClass,
  labelClass,
  textareaClass,
} from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
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
  adaptiveTemplateRecommendation: AdaptiveTemplateRecommendation | null;
  recommendedTemplateSupport: AdaptiveTemplateSupport | null;
  onChange: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
  onTemplateSelect: (template: TwelveWeekTemplateDefinition) => void;
  onTemplatePersonalizationChange: <K extends "dailyTimeBudget" | "personalConstraint">(
    key: K,
    value: TwelveWeekSetupDraft[K],
  ) => void;
  onPreferredDayToggle: (dayIndex: number) => void;
}

const selectTriggerClass =
  "h-auto rounded-lg border border-app-line bg-app-surface px-3.5 py-2.5 text-sm font-normal text-app-ink shadow-none focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2";
const selectContentClass = "surface-elevated rounded-xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]";
const selectItemClass = "cursor-pointer text-sm text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

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
      <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 mb-4 text-center">
        LỘ TRÌNH THỰC THI 12 TUẦN
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
        <div className="absolute flex flex-col items-center z-10" style={{ left: "12.5%", top: "40%", transform: "translate(-50%, -50%)" }}>
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-indigo-500 bg-white dark:bg-slate-900 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shadow-sm">
            W1
          </div>
          <span className="mt-1.5 text-[9px] font-bold text-slate-500 tracking-wide uppercase">Khởi đầu</span>
        </div>

        <div className="absolute flex flex-col items-center z-10" style={{ left: "37.5%", top: "40%", transform: "translate(-50%, -50%)" }}>
          <div className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
            isW4Filled ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm scale-105" : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
          )}>
            W4
          </div>
          <span className={cn("mt-1.5 text-[9px] font-bold tracking-wide uppercase transition-colors duration-300", isW4Filled ? "text-slate-650 dark:text-slate-300" : "text-slate-400")}>Chặng 1</span>
        </div>

        <div className="absolute flex flex-col items-center z-10" style={{ left: "62.5%", top: "40%", transform: "translate(-50%, -50%)" }}>
          <div className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
            isW8Filled ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm scale-105" : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
          )}>
            W8
          </div>
          <span className={cn("mt-1.5 text-[9px] font-bold tracking-wide uppercase transition-colors duration-300", isW8Filled ? "text-slate-650 dark:text-slate-300" : "text-slate-400")}>Chặng 2</span>
        </div>

        <div className="absolute flex flex-col items-center z-10" style={{ left: "87.5%", top: "40%", transform: "translate(-50%, -50%)" }}>
          <div className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
            isW12Filled ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm scale-110" : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
          )}>
            W12
          </div>
          <span className={cn("mt-1.5 text-[9px] font-bold tracking-wide uppercase transition-colors duration-300", isW12Filled ? "text-emerald-650 dark:text-emerald-450" : "text-slate-400")}>Đích đến</span>
        </div>
      </div>
    </div>
  );
}

export function OutcomeStepLab({
  feasibility,
  draft,
  currentPlan,
  smartGoal,
  selectedTemplate,
  recommendedTemplate,
  adaptiveTemplateRecommendation,
  recommendedTemplateSupport,
  onChange,
  onTemplateSelect,
  onTemplatePersonalizationChange,
  onPreferredDayToggle,
}: OutcomeStepLabProps) {
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
      
      {/* KHU VỰC 1: KHỞI ĐẦU NHANH BẰNG KHUNG MẪU (TEMPLATE CAROUSEL) */}
      <section aria-labelledby="template-carousel-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 id="template-carousel-title" className="text-xs font-extrabold uppercase tracking-wider text-app-accent flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span>Chọn khung mẫu bắt đầu nhanh (Recommends)</span>
          </h3>
          <span className="text-[11px] text-app-ink-muted">Tự động điền nhanh cột mốc & hành động</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TWELVE_WEEK_TEMPLATE_CATALOG.slice(0, 3).map((template) => {
            const isLocked = !planSatisfiesRequirement(currentPlan, template.requiredPlan);
            const isSelected = selectedTemplate?.id === template.id;
            const isRecommended = recommendedTemplate?.id === template.id;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onTemplateSelect(template)}
                className={cn(
                  "flex flex-col rounded-2xl border p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/20",
                  isSelected
                    ? "border-app-accent bg-app-accent-soft/30 text-app-ink shadow-md shadow-app-accent/5 ring-1 ring-app-accent/20"
                    : isRecommended
                    ? "border-amber-400 bg-amber-500/[0.01] hover:border-app-accent/40"
                    : "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30"
                )}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div>
                    {isRecommended && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[8px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5 animate-pulse">
                        💡 Khuyên dùng
                      </span>
                    )}
                    <h4 className="text-xs font-bold text-app-ink leading-tight flex items-center gap-1">
                      {template.name}
                    </h4>
                    <p className="mt-1 text-[10px] text-app-ink-muted leading-tight line-clamp-1">{template.subtitle}</p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border",
                    isSelected 
                      ? "bg-app-accent border-app-accent text-white" 
                      : isLocked 
                      ? "bg-app-bg border-app-line text-app-ink-muted" 
                      : "bg-slate-100 dark:bg-slate-800 border-transparent text-app-ink-soft"
                  )}>
                    {isSelected ? "Đang dùng" : isLocked ? "Gói Plus" : "Sẵn sàng"}
                  </span>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-app-ink-soft line-clamp-2">{template.description}</p>
                
                <div className="mt-3 flex items-center justify-between border-t border-app-line/60 pt-2.5 w-full text-[10px] text-app-ink-muted">
                  <span>Tuần 1: <strong className="text-app-ink font-semibold">{template.firstWeekWin}</strong></span>
                  {isLocked && <span className="text-app-accent font-bold">Mở khóa →</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* KHU VỰC 2: CÁ NHÂN HÓA KHUNG GỢI Ý (CHỈ HIỆN KHI ĐÃ CHỌN TEMPLATE) */}
      {selectedTemplate && (
        <details className="group rounded-2xl border border-app-line bg-app-bg p-4 transition-all duration-200 [&::-webkit-details-marker]:hidden">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-app-accent focus-visible:outline-none">
            <span>⚙️ Cá nhân hóa khung gợi ý ({selectedTemplate.name})</span>
            <ChevronDown className="h-4 w-4 text-app-accent transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 border-t border-app-line/60 pt-4 space-y-4 text-xs">
            <p className="text-app-ink-soft">
              Điều chỉnh 3 câu dưới đây để khung mẫu tự động cân chỉnh tải việc cho phù hợp.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="daily-time-budget" className={labelClass}>
                  Quỹ thời gian dành cho mục tiêu mỗi ngày?
                </label>
                <Select
                  value={draft.dailyTimeBudget}
                  onValueChange={(value) => onTemplatePersonalizationChange("dailyTimeBudget", value)}
                >
                  <SelectTrigger id="daily-time-budget" className={selectTriggerClass}>
                    <SelectValue placeholder="Chọn thời lượng" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem value="30min" className={selectItemClass}>30 phút</SelectItem>
                    <SelectItem value="1h" className={selectItemClass}>1 giờ</SelectItem>
                    <SelectItem value="1.5h" className={selectItemClass}>1.5 giờ</SelectItem>
                    <SelectItem value="2h+" className={selectItemClass}>2+ giờ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="personal-constraint" className={labelClass}>
                  Trở ngại lớn nhất của bạn lúc này?
                </label>
                <Select
                  value={draft.personalConstraint}
                  onValueChange={(value) =>
                    onTemplatePersonalizationChange(
                      "personalConstraint",
                      value as TwelveWeekSetupDraft["personalConstraint"]
                    )
                  }
                >
                  <SelectTrigger id="personal-constraint" className={selectTriggerClass}>
                    <SelectValue placeholder="Chọn trở ngại" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem value="time" className={selectItemClass}>Thiếu thời gian</SelectItem>
                    <SelectItem value="motivation" className={selectItemClass}>Khó giữ động lực</SelectItem>
                    <SelectItem value="consistency" className={selectItemClass}>Hay bị đứt nhịp</SelectItem>
                    <SelectItem value="complexity" className={selectItemClass}>Mục tiêu quá phức tạp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <p className={labelClass}>Những ngày tập trung hành động chính?</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((dayLabel, dayIndex) => {
                  const isActive = draft.preferredDays.includes(dayIndex);
                  return (
                    <button
                      key={dayLabel}
                      type="button"
                      onClick={() => onPreferredDayToggle(dayIndex)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-200 active:scale-90",
                        isActive
                          ? "border-app-accent bg-app-accent text-white shadow-sm"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/40"
                      )}
                    >
                      {dayLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </details>
      )}

      {/* KHU VỰC 3: FORM BIỂU MẪU CỐT LÕI (MỤC TIÊU & CỘT MỐC) */}
      <section className="relative overflow-hidden rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm space-y-5" aria-labelledby="outcome-required-title">
        <div className="flex items-center justify-between border-b border-app-line/60 pb-3">
          <div>
            <h3 id="outcome-required-title" className="text-xs font-extrabold uppercase tracking-wider text-app-accent">
              Chốt kết quả & Cột mốc 12 tuần
            </h3>
            <p className="mt-0.5 text-[11px] text-app-ink-muted">
              Xác định lộ trình tiến bước và đích đến rõ ràng của chu kỳ
            </p>
          </div>
          <span className="rounded-full bg-app-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-app-accent border border-app-accent/15">
            Bắt buộc
          </span>
        </div>

        {/* Milestone Roadmap */}
        <MilestoneRoadmap
          week4={draft.week4Milestone}
          week8={draft.week8Milestone}
          week12={draft.week12Outcome}
        />

        <div className="space-y-4 pt-2">
          {/* Cột mốc Tuần 4 & Tuần 8 - Đưa lên cùng một hàng ngang */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="milestone-week-4" className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}>
                <Target className="h-4 w-4 text-app-accent shrink-0" />
                <span>Cột mốc sau 4 tuần (1/3 chặng đường)</span>
              </label>
              <Input
                id="milestone-week-4"
                value={draft.week4Milestone}
                className={inputClass}
                onChange={(event) => onChange("week4Milestone", event.target.value)}
                placeholder="Ví dụ: Hoàn thành bản nháp phác thảo 1..."
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="milestone-week-8" className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}>
                <Flag className="h-4 w-4 text-app-accent shrink-0" />
                <span>Cột mốc sau 8 tuần (2/3 chặng đường)</span>
              </label>
              <Input
                id="milestone-week-8"
                value={draft.week8Milestone}
                className={inputClass}
                onChange={(event) => onChange("week8Milestone", event.target.value)}
                placeholder="Ví dụ: Hoàn thiện 80% tính năng cốt lõi..."
              />
            </div>
          </div>

          {/* Đích đến cuối cùng Tuần 12 */}
          <div className="space-y-1.5">
            <label htmlFor="week-12-outcome" className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}>
              <Award className="h-4 w-4 text-app-accent shrink-0" />
              <span>Đích đến sau 12 tuần (Tuần 12)</span>
            </label>
            <Textarea
              id="week-12-outcome"
              rows={2}
              value={draft.week12Outcome}
              aria-invalid={Boolean(milestoneError)}
              className={cn(
                textareaClass,
                "min-h-[70px]",
                milestoneError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-150"
              )}
              onChange={(event) => onChange("week12Outcome", event.target.value)}
              placeholder="Ví dụ: Đạt bản portfolio 3 case study chất lượng cao đủ gửi đi ứng tuyển."
            />
            {milestoneError ? (
              <p role="alert" className="text-[10px] font-bold text-red-500">
                {milestoneError}
              </p>
            ) : (
              <p className={helperTextClass}>
                Mô tả trạng thái bạn muốn đạt được khi 12 tuần kết thúc. Đây là đích đến cuối cùng của chu kỳ này.
              </p>
            )}
          </div>

          {/* Động lực cốt lõi */}
          <div className="space-y-1.5">
            <label htmlFor="vision-12-week" className={cn(labelClass, "flex items-center gap-1 text-app-ink font-bold")}>
              <Lightbulb className="h-4 w-4 text-app-accent shrink-0" />
              <span>Vì sao mục tiêu này thực sự quan trọng với bạn?</span>
            </label>
            <Textarea
              id="vision-12-week"
              rows={2}
              value={draft.vision12Week}
              onChange={(event) => onChange("vision12Week", event.target.value)}
              className="min-h-[60px] text-xs"
              placeholder="Giải thích ngắn gọn lý do giúp bạn duy trì kỷ luật và kiên trì khi gặp khó khăn..."
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
