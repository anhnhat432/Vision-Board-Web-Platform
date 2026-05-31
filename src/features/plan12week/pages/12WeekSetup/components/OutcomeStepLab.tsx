import { Award, ClipboardCheck, Flag, Lightbulb, Target } from "lucide-react";
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
    <div className="relative w-full py-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 px-4 sm:px-5 select-none overflow-hidden max-w-xl mx-auto">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-450 mb-3 text-center">
        LỘ TRÌNH 12 TUẦN (ĐÃ TỰ ĐỘNG CHIA NHỎ MỐC)
      </p>

      {/* Dành cho Desktop: Timeline nằm ngang */}
      <div className="relative w-full aspect-[320/75] hidden sm:flex items-center justify-center">
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
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Các mốc điểm ngang */}
        <div
          className="absolute flex flex-col items-center z-10"
          style={{ left: "12.5%", top: "40%", transform: "translate(-50%, -50%)" }}
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-indigo-500 bg-white dark:bg-slate-900 text-[10px] font-bold text-indigo-650 dark:text-indigo-400 shadow-sm">
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
                ? "border-indigo-500 text-indigo-650 dark:text-indigo-400 shadow-sm scale-105"
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
                ? "border-indigo-500 text-indigo-650 dark:text-indigo-400 shadow-sm scale-105"
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

      {/* Dành cho Mobile: Timeline dọc (cực kỳ dễ nhìn, thumb-friendly và không bị tràn) */}
      <div className="flex flex-col space-y-4.5 pl-2 sm:hidden relative">
        <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />
        
        {/* Điểm tiến trình dọc */}
        <div
          className="absolute left-[13px] top-2 w-0.5 bg-gradient-to-b from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ height: isW12Filled ? "90%" : isW8Filled ? "60%" : isW4Filled ? "30%" : "0%" }}
        />

        <div className="flex items-center gap-3">
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-500 bg-white dark:bg-slate-900 text-[9px] font-bold text-indigo-650 dark:text-indigo-400">
            W1
          </div>
          <div className="text-left">
            <span className="text-[9px] font-extrabold text-indigo-650 dark:text-indigo-400 tracking-wide uppercase">Khởi đầu</span>
            <p className="text-[10px] font-semibold text-app-ink-soft">Bắt đầu chu kỳ 12 tuần</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
              isW4Filled ? "border-indigo-500 text-indigo-650 dark:text-indigo-400" : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60",
            )}
          >
            W4
          </div>
          <div className="text-left">
            <span className={cn("text-[9px] font-extrabold tracking-wide uppercase", isW4Filled ? "text-indigo-650 dark:text-indigo-400" : "text-slate-400")}>Chặng 1 (Tuần 4)</span>
            <p className="text-[10px] font-semibold text-app-ink-soft truncate max-w-[200px]">{week4 || "Chưa điền..."}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
              isW8Filled ? "border-indigo-500 text-indigo-650 dark:text-indigo-400" : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60",
            )}
          >
            W8
          </div>
          <div className="text-left">
            <span className={cn("text-[9px] font-extrabold tracking-wide uppercase", isW8Filled ? "text-indigo-650 dark:text-indigo-400" : "text-slate-400")}>Chặng 2 (Tuần 8)</span>
            <p className="text-[10px] font-semibold text-app-ink-soft truncate max-w-[200px]">{week8 || "Chưa điền..."}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold bg-white dark:bg-slate-900 transition-all duration-300",
              isW12Filled ? "border-emerald-500 text-emerald-600 dark:text-emerald-450" : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-60",
            )}
          >
            W12
          </div>
          <div className="text-left">
            <span className={cn("text-[9px] font-extrabold tracking-wide uppercase", isW12Filled ? "text-emerald-650 dark:text-emerald-450" : "text-slate-400")}>Đích đến (Tuần 12)</span>
            <p className="text-[10px] font-semibold text-emerald-650 dark:text-emerald-400 truncate max-w-[200px]">{week12 || "Chưa điền..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const GOAL_TYPE_EMOJIS: Record<string, string> = {
  "Skill Learning": "📚",
  "Habit Building": "🔁",
  "Fitness / Health": "💪",
  "Exam / Study": "📝",
  "Career / Job Search": "💼",
  "Finance / Saving": "💰",
  "Project Completion": "🚀",
  "Personal Growth": "🌱",
  "Other": "✨",
};

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
            <h3 id="outcome-required-title" className="text-xs font-extrabold uppercase tracking-wider text-app-accent flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              <span>Thiết kế Lộ trình 12 tuần</span>
            </h3>
            <p className="mt-0.5 text-[11px] text-app-ink-muted">
              Hệ thống đã tự động tính toán lộ trình 12 tuần từ mục tiêu SMART. Bạn chỉ việc rà soát và chỉnh sửa.
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-450 border border-emerald-500/15 shrink-0">
            Tự điền 90%
          </span>
        </div>

        {/* Milestone Roadmap */}
        <MilestoneRoadmap week4={draft.week4Milestone} week8={draft.week8Milestone} week12={draft.week12Outcome} />

        <div className="space-y-5 pt-1">
          {/* Cột mốc Tuần 4 & Tuần 8 - Đặt cùng một hàng ngang */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="milestone-week-4"
                className={cn(labelClass, "flex items-center gap-1.5 text-app-ink font-bold")}
              >
                <Target className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>🎯 Mốc tuần 4: Tạo đà ban đầu</span>
              </label>
              <Input
                id="milestone-week-4"
                value={draft.week4Milestone}
                className={inputClass}
                onChange={(event) => onChange("week4Milestone", event.target.value)}
                placeholder="Ví dụ: Đọc xong 3 cuốn sách đầu tiên..."
              />
              <p className="text-[10px] italic text-app-ink-muted leading-relaxed">
                * Mốc tháng đầu tiên giúp bạn xây dựng thói quen và quán tính hành động.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <label
                htmlFor="milestone-week-8"
                className={cn(labelClass, "flex items-center gap-1.5 text-app-ink font-bold")}
              >
                <Flag className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>🚀 Mốc tuần 8: Bứt phá tăng tốc</span>
              </label>
              <Input
                id="milestone-week-8"
                value={draft.week8Milestone}
                className={inputClass}
                onChange={(event) => onChange("week8Milestone", event.target.value)}
                placeholder="Ví dụ: Hoàn thành 60% chương trình học..."
              />
              <p className="text-[10px] italic text-app-ink-muted leading-relaxed">
                * Điểm bứt phá quan trọng, giúp tăng tốc trước khi về đích.
              </p>
            </div>
          </div>

          {/* Đích đến cuối cùng Tuần 12 */}
          <div className="space-y-1.5">
            <label
              htmlFor="week-12-outcome"
              className={cn(labelClass, "flex items-center gap-1.5 text-app-ink font-bold")}
            >
              <Award className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>🏆 Đích đến tự hào (Tuần 12)</span>
            </label>
            <Textarea
              id="week-12-outcome"
              rows={2}
              value={draft.week12Outcome}
              aria-invalid={Boolean(milestoneError)}
              className={cn(
                textareaClass,
                "min-h-[55px] text-xs leading-relaxed",
                milestoneError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-150",
              )}
              onChange={(event) => onChange("week12Outcome", event.target.value)}
              placeholder="Ví dụ: Đạt được kết quả rực rỡ cuối cùng mà bạn khát khao..."
            />
            {milestoneError ? (
              <p role="alert" className="text-[10px] font-bold text-red-500">
                {milestoneError}
              </p>
            ) : (
              <p className="text-[10px] italic text-app-ink-muted leading-relaxed">
                * Kết quả tối thượng bạn cam kết sẽ chạm tay vào sau 12 tuần phi hành.
              </p>
            )}
          </div>

          {/* Động lực cốt lõi */}
          <div className="space-y-1.5 border-t border-app-line/40 pt-4">
            <label
              htmlFor="vision-12-week"
              className={cn(labelClass, "flex items-center gap-1.5 text-app-ink font-bold")}
            >
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
              <span>💡 Động lực: Tại sao bạn nhất định phải làm điều này?</span>
            </label>
            <Textarea
              id="vision-12-week"
              rows={2}
              value={draft.vision12Week}
              onChange={(event) => onChange("vision12Week", event.target.value)}
              className="min-h-[50px] text-xs leading-relaxed"
              placeholder="Ví dụ: Giúp tôi tự tin hơn, bứt phá thu nhập và nâng tầm cuộc sống..."
            />
            <p className="text-[10px] italic text-app-ink-muted leading-relaxed">
              * Lý do đủ lớn sẽ giúp bạn duy trì kỷ luật và năng lượng vào những ngày mệt mỏi.
            </p>
          </div>

          {/* Phân loại mục tiêu - Bằng các Chip Tag sinh động chọn 1 chạm thay vì dropdown nặng nề */}
          <div className="space-y-2 border-t border-app-line/40 pt-4">
            <div className={cn(labelClass, "flex items-center gap-1.5 text-app-ink font-bold")}>
              <ClipboardCheck className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>Phân loại mục tiêu (Giúp gợi ý hành động chuẩn hơn)</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {GOAL_TYPES.map((item) => {
                const isActive = draft.goalType === item.value;
                const emoji = GOAL_TYPE_EMOJIS[item.value] || "🎯";
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      soundService.click();
                      onChange("goalType", item.value);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95",
                      isActive
                        ? "border-app-accent bg-app-accent text-white shadow-sm shadow-app-accent/20 scale-105"
                        : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/30"
                    )}
                  >
                    <span className="text-sm leading-none">{emoji}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] italic text-app-ink-muted leading-relaxed mt-1">
              * Chạm 1 chạm để phân loại nhanh. Hệ thống sẽ tối ưu hóa các mẫu hành động dựa trên phân loại này.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
