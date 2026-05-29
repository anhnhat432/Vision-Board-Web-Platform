import { useEffect, useState } from "react";
import { Lightbulb, Lock, Sparkles, ChevronDown } from "lucide-react";

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
import { buildPlanRationaleReasons, getMilestoneValidationError, getPlanLoadLabel } from "../helpers";
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
const infoBoxClass = "rounded-xl border border-app-line bg-app-bg p-4 text-xs leading-relaxed text-app-ink-soft shadow-sm";
const chipClass =
  "rounded-full border border-app-line px-3 py-1 text-xs text-app-ink-soft transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft hover:text-app-accent";

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
    <div className="relative w-full py-6 select-none bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 p-4 mb-6 overflow-hidden">
      {/* Nhúng styles trực tiếp cho các animation động */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.05); }
        }
        @keyframes float-faster {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-7px) scale(1.08); }
        }
        @keyframes pulse-spread {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes shimmer-grad {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-dash-flow {
          animation: dash 1.2s linear infinite;
        }
        .animate-float-1 {
          animation: float-slower 3.5s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-faster 2.8s ease-in-out infinite;
        }
        .animate-float-3 {
          animation: float-slower 3s ease-in-out infinite;
        }
        .animate-float-4 {
          animation: float-faster 3.2s ease-in-out infinite;
        }
        .animate-pulse-spread {
          animation: pulse-spread 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .animate-holographic-border {
          background-size: 300% 300%;
          animation: shimmer-grad 5s ease infinite;
        }
      `}</style>

      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400 mb-6 text-center flex items-center justify-center gap-1.5 relative z-10">
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-500" />
        Bản đồ viễn chinh 12 tuần (Expedition Map)
      </p>

      {/* Canvas SVG vẽ con đường lượn sóng */}
      <div className="relative w-full max-w-lg mx-auto h-[135px]">
        <svg
          viewBox="0 0 320 80"
          className="absolute top-0 left-0 w-full h-[80px] overflow-visible pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="expedition-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* 1. Đường nền nét đứt màu xám nhạt */}
          <path
            d="M 40 40 C 80 20, 100 20, 120 30 C 140 40, 180 60, 200 50 C 220 40, 260 30, 280 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="6, 6"
            className="text-slate-250 dark:text-slate-850"
          />

          {/* 2. Đường tiến trình phát sáng động (chỉ vẽ đến chặng đã điền) */}
          <path
            d="M 40 40 C 80 20, 100 20, 120 30"
            fill="none"
            stroke={isW4Filled ? "url(#expedition-active-grad)" : "currentColor"}
            strokeWidth={isW4Filled ? "4" : "3.5"}
            strokeLinecap="round"
            strokeDasharray={isW4Filled ? "5, 4" : "6, 6"}
            className={cn(
              isW4Filled ? "animate-dash-flow" : "text-slate-200 dark:text-slate-800/40",
              isW4Filled && "drop-shadow-[0_0_4px_rgba(99,102,241,0.4)]"
            )}
          />

          <path
            d="M 120 30 C 140 40, 180 60, 200 50"
            fill="none"
            stroke={isW8Filled ? "url(#expedition-active-grad)" : "currentColor"}
            strokeWidth={isW8Filled ? "4" : "3.5"}
            strokeLinecap="round"
            strokeDasharray={isW8Filled ? "5, 4" : "6, 6"}
            className={cn(
              isW8Filled ? "animate-dash-flow" : "text-slate-200 dark:text-slate-800/40",
              isW8Filled && "drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]"
            )}
          />

          <path
            d="M 200 50 C 220 40, 260 30, 280 40"
            fill="none"
            stroke={isW12Filled ? "url(#expedition-active-grad)" : "currentColor"}
            strokeWidth={isW12Filled ? "4" : "3.5"}
            strokeLinecap="round"
            strokeDasharray={isW12Filled ? "5, 4" : "6, 6"}
            className={cn(
              isW12Filled ? "animate-dash-flow" : "text-slate-200 dark:text-slate-800/40",
              isW12Filled && "drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]"
            )}
          />
        </svg>

        {/* CÁC ĐIỂM TRẠM HOẠT HỌA NỔI */}
        <div 
          className="absolute flex flex-col items-center z-10 animate-float-1"
          style={{ left: "12.5%", top: "40px", transform: "translate(-50%, -50%)" }}
        >
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-900 text-lg shadow-[0_4px_12px_rgba(99,102,241,0.25)] select-none">
            🚀
            <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-ping opacity-75" />
          </div>
          <span className="mt-2.5 text-[10px] font-extrabold text-slate-700 dark:text-slate-200 tracking-wide">Khởi động</span>
          <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400">Tuần 1</span>
        </div>

        <div 
          className={cn("absolute flex flex-col items-center z-10", isW4Filled ? "animate-float-2" : "opacity-75")}
          style={{ left: "37.5%", top: "30px", transform: "translate(-50%, -50%)" }}
        >
          <div className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-500 text-lg bg-white dark:bg-slate-900 select-none",
            isW4Filled 
              ? "border-indigo-500 text-indigo-500 shadow-[0_4px_12px_rgba(99,102,241,0.25)]" 
              : "border-slate-200 dark:border-slate-800 text-slate-300 opacity-60"
          )}>
            {isW4Filled ? (
              <>
                🚩
                <div className="absolute -inset-2 rounded-full bg-indigo-500/10 animate-pulse-spread" />
              </>
            ) : "🔒"}
          </div>
          <span className={cn("mt-2.5 text-[10px] font-bold transition-colors duration-500", isW4Filled ? "text-slate-700 dark:text-slate-200" : "text-slate-400")}>Tuần 4</span>
          <span className="text-[9px] font-semibold text-slate-400">{isW4Filled ? "Mốc 1/3" : "Chờ đặt"}</span>
        </div>

        <div 
          className={cn("absolute flex flex-col items-center z-10", isW8Filled ? "animate-float-3" : "opacity-75")}
          style={{ left: "62.5%", top: "50px", transform: "translate(-50%, -50%)" }}
        >
          <div className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-500 text-lg bg-white dark:bg-slate-900 select-none",
            isW8Filled 
              ? "border-amber-500 text-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.25)]" 
              : "border-slate-200 dark:border-slate-800 text-slate-300 opacity-60"
          )}>
            {isW8Filled ? (
              <>
                🚩
                <div className="absolute -inset-2 rounded-full bg-amber-500/10 animate-pulse-spread" />
              </>
            ) : "🔒"}
          </div>
          <span className={cn("mt-2.5 text-[10px] font-bold transition-colors duration-500", isW8Filled ? "text-slate-700 dark:text-slate-200" : "text-slate-400")}>Tuần 8</span>
          <span className="text-[9px] font-semibold text-slate-400">{isW8Filled ? "Mốc 2/3" : "Chờ đặt"}</span>
        </div>

        <div 
          className={cn("absolute flex flex-col items-center z-10", isW12Filled ? "animate-float-4" : "opacity-75")}
          style={{ left: "87.5%", top: "40px", transform: "translate(-50%, -50%)" }}
        >
          <div className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-500 text-lg bg-white dark:bg-slate-900 select-none",
            isW12Filled 
              ? "border-emerald-500 text-emerald-500 shadow-[0_4px_16px_rgba(16,185,129,0.35)]" 
              : "border-slate-200 dark:border-slate-800 text-slate-300 opacity-60"
          )}>
            {isW12Filled ? (
              <>
                🏆
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping opacity-75" />
                <div className="absolute -inset-3.5 rounded-full bg-emerald-500/10 animate-pulse-spread" />
              </>
            ) : "🏁"}
          </div>
          <span className={cn("mt-2.5 text-[10px] font-extrabold transition-colors duration-500", isW12Filled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>Tuần 12</span>
          <span className="text-[9px] font-semibold text-slate-400">{isW12Filled ? "Đích đến" : "Chờ đặt"}</span>
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

  const planRationaleReasons = buildPlanRationaleReasons(feasibility);
  const milestoneError = getMilestoneValidationError({
    week4: draft.week4Milestone,
    week8: draft.week8Milestone,
    week12: draft.week12Outcome,
  });
  const lagMetricPreview = draft.lagMetricName.trim()
    ? `${draft.lagMetricName.trim()}${draft.lagMetricUnit.trim() ? ` (${draft.lagMetricUnit.trim()})` : ""}`
    : "";

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 sm:space-y-5 sm:px-0">
      {smartGoal.measurable ? (
        <div role="note" className={cn(infoBoxClass, "flex items-start gap-2 bg-gradient-to-r from-app-accent-soft/20 to-transparent border-app-accent/20")}>
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-app-accent animate-pulse" aria-hidden="true" />
          <p>
            <span className="font-semibold text-app-ink">Đã suy ra từ SMART Goal của bạn:</span> {smartGoal.measurable}
          </p>
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[20px] border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-2xl p-6 sm:p-8 transition-all duration-300" aria-labelledby="outcome-required-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p id="outcome-required-title" className="text-sm font-semibold text-app-ink">
              Chốt phần bắt buộc trước
            </p>
            <p className="mt-1 text-xs text-app-ink-soft">
              Ba mục này đủ để đi tiếp. Khung gợi ý phía dưới chỉ là phần hỗ trợ nhanh.
            </p>
          </div>
          <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs font-semibold text-app-ink-muted">
            Bắt buộc
          </span>
        </div>

        {/* Milestone Roadmap */}
        <MilestoneRoadmap
          week4={draft.week4Milestone}
          week8={draft.week8Milestone}
          week12={draft.week12Outcome}
        />

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="milestone-week-4" className={labelClass}>
                Cột mốc sau 4 tuần
              </label>
              <Input
                id="milestone-week-4"
                value={draft.week4Milestone}
                className={inputClass}
                onChange={(event) => onChange("week4Milestone", event.target.value)}
                placeholder="Ví dụ: Hoàn thành bản nháp 1..."
              />
              <p className={helperTextClass}>Mục tiêu đạt được sau 1/3 chặng đường.</p>
            </div>
            <div>
              <label htmlFor="milestone-week-8" className={labelClass}>
                Cột mốc sau 8 tuần
              </label>
              <Input
                id="milestone-week-8"
                value={draft.week8Milestone}
                className={inputClass}
                onChange={(event) => onChange("week8Milestone", event.target.value)}
                placeholder="Ví dụ: Hoàn thiện tính năng chính..."
              />
              <p className={helperTextClass}>Mục tiêu đạt được sau 2/3 chặng đường.</p>
            </div>
          </div>

          <div>
            <label htmlFor="week-12-outcome" className={labelClass}>
              Đích đến sau 12 tuần (Tuần 12)
            </label>
            <Textarea
              id="week-12-outcome"
              rows={3}
              value={draft.week12Outcome}
              aria-invalid={Boolean(milestoneError)}
              aria-describedby={milestoneError ? "week-12-outcome-error" : "week-12-outcome-helper"}
              className={cn(
                textareaClass,
                "min-h-[100px]",
                milestoneError &&
                  "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
              )}
              onChange={(event) => onChange("week12Outcome", event.target.value)}
              placeholder="Ví dụ: Sau 12 tuần, tôi có bản portfolio 3 case study đủ gửi đi ứng tuyển."
            />
            {milestoneError ? (
              <p id="week-12-outcome-error" role="alert" className={errorTextClass}>
                {milestoneError}
              </p>
            ) : (
              <p id="week-12-outcome-helper" className={helperTextClass}>
                Mô tả trạng thái bạn muốn đạt được khi 12 tuần kết thúc. Đây là đích đến cuối chu kỳ.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="vision-12-week" className={labelClass}>
              Vì sao mục tiêu này quan trọng?
            </label>
            <Textarea
              id="vision-12-week"
              rows={3}
              value={draft.vision12Week}
              onChange={(event) => onChange("vision12Week", event.target.value)}
              className={textareaClass}
              placeholder="Vì sao kết quả này đáng để bạn dành 12 tuần tới?"
            />
            <p className={helperTextClass}>Một câu đủ thật giúp bạn giữ nhịp khi tuần bận lên.</p>
          </div>

          <div>
            <label htmlFor="lag-metric-name" className={labelClass}>
              Tên chỉ số cần theo dõi
            </label>
            <Input
              id="lag-metric-name"
              value={draft.lagMetricName}
              onChange={(event) => onChange("lagMetricName", event.target.value)}
              className={inputClass}
              placeholder="Ví dụ: số bài xuất bản, số kg giảm, doanh thu mới..."
            />
            {lagMetricPreview ? (
              <p className={helperTextClass}>
                Đang theo dõi: <span className="font-semibold text-app-accent">{lagMetricPreview}</span>
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
            <div>
              <label htmlFor="lag-metric-target" className={labelClass}>
                Con số mục tiêu
              </label>
              <Input
                id="lag-metric-target"
                type="number"
                inputMode="decimal"
                value={draft.lagMetricTarget}
                onChange={(event) => onChange("lagMetricTarget", event.target.value)}
                className={inputClass}
                placeholder="VD: 12"
              />
              <p className={helperTextClass}>Con số mục tiêu cuối chu kỳ.</p>
            </div>
            <div>
              <label htmlFor="lag-metric-unit" className={labelClass}>
                Đơn vị
              </label>
              <Input
                id="lag-metric-unit"
                value={draft.lagMetricUnit}
                onChange={(event) => onChange("lagMetricUnit", event.target.value)}
                className={inputClass}
                placeholder="bài, kg, triệu"
              />
            </div>
          </div>

          <div>
            <label htmlFor="goal-type" className={labelClass}>
              Loại mục tiêu
            </label>
            <Select value={draft.goalType} onValueChange={(value) => onChange("goalType", value)}>
              <SelectTrigger id="goal-type" aria-label="Chọn loại mục tiêu" className={selectTriggerClass}>
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

      {selectedTemplate ? (
        <details className="group surface-raised rounded-2xl border border-app-line bg-app-surface p-5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
          <summary
            id="template-personalize-title"
            className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md px-2 text-sm font-semibold uppercase tracking-[0.14em] text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 p-1"
          >
            <span>Cá nhân hóa khung gợi ý</span>
            <ChevronDown className="h-4.5 w-4.5 text-app-accent transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 border-t border-app-line/60 pt-4 space-y-4">
            <p className="text-sm leading-relaxed text-app-ink-soft">
              Trả lời nhanh 3 câu để khung tự điều chỉnh số việc và nhịp phù hợp.
            </p>

            <div>
              <label htmlFor="daily-time-budget" className={labelClass}>
                Mỗi ngày bạn có thể dành bao lâu?
              </label>
              <Select
                value={draft.dailyTimeBudget}
                onValueChange={(value) => onTemplatePersonalizationChange("dailyTimeBudget", value)}
              >
                <SelectTrigger
                  id="daily-time-budget"
                  aria-label="Chọn ngân sách thời gian mỗi ngày"
                  className={selectTriggerClass}
                >
                  <SelectValue placeholder="Chọn thời lượng" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="30min" className={selectItemClass}>
                    30 phút
                  </SelectItem>
                  <SelectItem value="1h" className={selectItemClass}>
                    1 giờ
                  </SelectItem>
                  <SelectItem value="1.5h" className={selectItemClass}>
                    1.5 giờ
                  </SelectItem>
                  <SelectItem value="2h+" className={selectItemClass}>
                    2+ giờ
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className={labelClass}>Những ngày nào bạn muốn tập trung?</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((dayLabel, dayIndex) => {
                  const isActive = draft.preferredDays.includes(dayIndex);
                  return (
                    <button
                      key={dayLabel}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onPreferredDayToggle(dayIndex)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                        isActive
                          ? "border-app-accent bg-app-accent text-white shadow-sm font-bold scale-105"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/40 hover:text-app-accent",
                      )}
                    >
                      {dayLabel}
                    </button>
                  );
                })}
              </div>
              <p className={helperTextClass}>
                {draft.preferredDays.length === 0
                  ? "Chưa chọn — mặc định dàn đều cả tuần."
                  : `Đã chọn ${draft.preferredDays.length} ngày.`}
              </p>
            </div>

            <div>
              <label htmlFor="personal-constraint" className={labelClass}>
                Trở ngại lớn nhất hiện tại?
              </label>
              <Select
                value={draft.personalConstraint}
                onValueChange={(value) =>
                  onTemplatePersonalizationChange(
                    "personalConstraint",
                    value as TwelveWeekSetupDraft["personalConstraint"],
                  )
                }
              >
                <SelectTrigger
                  id="personal-constraint"
                  aria-label="Chọn trở ngại lớn nhất"
                  className={selectTriggerClass}
                >
                  <SelectValue placeholder="Chọn trở ngại" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="time" className={selectItemClass}>
                    Thiếu thời gian
                  </SelectItem>
                  <SelectItem value="motivation" className={selectItemClass}>
                    Khó giữ động lực
                  </SelectItem>
                  <SelectItem value="consistency" className={selectItemClass}>
                    Hay bị đứt nhịp
                  </SelectItem>
                  <SelectItem value="complexity" className={selectItemClass}>
                    Mục tiêu phức tạp, chưa biết bắt đầu
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className={helperTextClass}>
                {draft.personalConstraint === "time" && "Kế hoạch sẽ ưu tiên giữ nhẹ và tập trung."}
                {draft.personalConstraint === "motivation" && "Kế hoạch sẽ ưu tiên thắng nhỏ sớm và giảm ma sát."}
                {draft.personalConstraint === "consistency" && "Kế hoạch sẽ ưu tiên nhịp đều thay vì tải cao."}
                {draft.personalConstraint === "complexity" && "Kế hoạch sẽ giúp tách lớp rõ hơn."}
                {!draft.personalConstraint && "Chọn trở ngại để kế hoạch điều chỉnh phù hợp hơn."}
              </p>
            </div>
          </div>
        </details>
      ) : null}

      <details className="group surface-raised rounded-2xl border border-app-line bg-app-surface p-5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 rounded-lg p-1">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4.5 w-4.5 shrink-0 text-app-accent" aria-hidden="true" />
            <span id="template-picker-title" className="block text-sm font-semibold text-app-ink">
              Bắt đầu nhanh bằng khung gợi ý
            </span>
          </span>
          <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
        </summary>

        <div className="mt-4 border-t border-app-line/60 pt-4 space-y-4">
          <p className="text-xs text-app-ink-soft">
            Dùng khung mẫu được thiết kế sẵn để bắt đầu nhanh chóng. Bạn vẫn có thể tùy chỉnh mọi thông số sau đó.
          </p>

          {recommendedTemplate && adaptiveTemplateRecommendation ? (
            <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 via-pink-500 via-amber-400 via-emerald-500 to-indigo-500 animate-holographic-border shadow-xl shadow-indigo-500/10 overflow-hidden">
              <div className="rounded-[14px] bg-white dark:bg-slate-900 p-5.5 relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-app-accent">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                      Đề xuất nhiều nhất cho bạn (Recommended)
                    </div>
                    <p className="mt-2 text-lg font-bold text-app-ink">{recommendedTemplate.name}</p>
                    <p className="mt-2 text-xs leading-relaxed text-app-ink-soft">{adaptiveTemplateRecommendation.reason}</p>
                  </div>
                  <span className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-semibold text-app-ink-muted">
                    {recommendedTemplate.requiredPlan ? getPlanLabel(recommendedTemplate.requiredPlan) : "Miễn phí"}
                  </span>
                </div>
                <button
                  type="button"
                  className={cn(
                    "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto active:scale-[0.98]",
                    selectedTemplate?.id === recommendedTemplate.id
                      ? "border border-app-accent bg-app-accent-soft text-app-accent"
                      : "bg-app-accent text-white hover:bg-app-accent",
                  )}
                  onClick={() => onTemplateSelect(recommendedTemplate)}
                >
                  {selectedTemplate?.id === recommendedTemplate.id ? "Đang dùng khung gợi ý" : "Dùng khung gợi ý này"}
                </button>
                {recommendedTemplateSupport ? (
                  <details className="group mt-4 rounded-xl border border-app-line bg-app-surface px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-xs font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 p-1">
                      <span>Xem chi tiết gợi ý giữ nhịp</span>
                      <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 border-t border-app-line/60 pt-3 grid gap-3 sm:grid-cols-2">
                      <div className={infoBoxClass}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
                          Tuần 1 nên thắng ở đâu
                        </p>
                        <p className="mt-2 text-sm font-bold text-app-ink">
                          {recommendedTemplateSupport.week1Headline}
                        </p>
                        <p className="mt-1.5 leading-relaxed">{recommendedTemplateSupport.week1Support}</p>
                      </div>
                      <div className={infoBoxClass}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
                          Nhịp nên giữ
                        </p>
                        <p className="mt-2 leading-relaxed">{recommendedTemplateSupport.week1CadenceHint}</p>
                      </div>
                    </div>
                  </details>
                ) : null}
              </div>
            </div>
          ) : null}

          <details className="group mt-4 rounded-xl border border-dashed border-app-line bg-app-bg p-4 [&::-webkit-details-marker]:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-xs font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 p-1">
              <span>Xem tất cả khung mẫu</span>
              <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-3.5 lg:grid-cols-2">
              {TWELVE_WEEK_TEMPLATE_CATALOG.map((template) => {
                const isLocked = !planSatisfiesRequirement(currentPlan, template.requiredPlan);
                const isSelected = selectedTemplate?.id === template.id;
                const isRecommended = recommendedTemplate?.id === template.id;
                const templateAriaLabel = isLocked
                  ? `${template.name} — cần gói Plus để dùng khung này`
                  : `${template.name}${isSelected ? " — đang dùng" : ""}`;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onTemplateSelect(template)}
                    aria-pressed={isSelected}
                    aria-label={templateAriaLabel}
                    className={cn(
                      "min-h-11 rounded-xl border p-4 text-left transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                      isSelected && "border-app-accent bg-gradient-to-br from-app-accent-soft/30 to-app-accent-soft/10 text-app-accent shadow-sm font-semibold",
                      !isSelected && isRecommended && "border-amber-400 bg-amber-500/[0.02] text-app-ink hover:border-app-accent/40 hover:bg-app-bg shadow-[0_2px_8px_rgba(245,158,11,0.05)]",
                      !isSelected && !isRecommended &&
                        isLocked &&
                        "border-app-line bg-app-bg text-app-ink-soft hover:border-app-accent/30 hover:bg-app-accent-soft/5",
                      !isSelected && !isRecommended && !isLocked && "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30 hover:bg-app-bg",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold">{template.name}</p>
                          {isRecommended && (
                            <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider animate-pulse">
                              <Sparkles className="h-2.5 w-2.5" />
                              Khuyên dùng
                            </span>
                          )}
                          <span className="rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-[11px] font-semibold text-app-ink-muted">
                            {template.requiredPlan ? `Khung ${getPlanLabel(template.requiredPlan)}` : "Khung miễn phí"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-app-ink-soft">{template.subtitle}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-[11px] font-semibold text-app-ink-muted">
                        {isLocked ? <Lock className="h-3 w-3" aria-hidden="true" /> : null}
                        {isSelected ? "Đang dùng" : isLocked ? "Đang khóa" : "Sẵn sàng"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-app-ink-soft">{template.description}</p>
                    <div className="mt-3.5 grid gap-2.5 text-xs leading-relaxed text-app-ink-soft sm:grid-cols-2">
                      <div className="rounded-xl border border-app-line bg-app-surface px-3 py-2 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
                          Hợp khi
                        </p>
                        <p className="mt-1 font-medium">{template.bestFor}</p>
                      </div>
                      <div className="rounded-xl border border-app-line bg-app-surface px-3 py-2 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Tuần 1</p>
                        <p className="mt-1 font-medium">{template.firstWeekWin}</p>
                      </div>
                    </div>
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {template.idealFor.map((item) => (
                        <span key={`${template.id}_${item}`} className={chipClass}>
                          {item}
                        </span>
                      ))}
                      {template.tactics.slice(0, 2).map((tactic) => (
                        <span key={`${template.id}_${tactic.name}`} className={chipClass}>
                          {tactic.name}
                        </span>
                      ))}
                    </div>
                    {isLocked ? (
                      <div className="mt-4 flex items-center justify-between border-t border-app-line pt-3 text-xs font-semibold text-app-accent">
                        <span>Cần gói Plus để dùng khung này</span>
                        <span>Mở khóa →</span>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </details>
        </div>
      </details>

      {selectedTemplate ? (
        <details className="group surface-raised rounded-2xl border border-app-line bg-app-surface p-5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
          <summary id="selected-template-title" className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 p-1">
            <span>Khung đang dùng: {selectedTemplate.name}</span>
            <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-3 border-t border-app-line/60 pt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Khung đang dùng</p>
              <p className="mt-2 text-base font-bold text-app-ink">{selectedTemplate.name}</p>
              <p className="mt-1 text-sm leading-5 text-app-ink-soft">{selectedTemplate.subtitle}</p>
            </div>
            <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs text-app-ink-muted">
              {selectedTemplate.requiredPlan ? getPlanLabel(selectedTemplate.requiredPlan) : "Miễn phí"}
            </span>
          </div>
        </details>
      ) : null}

      <details className="group rounded-2xl border border-dashed border-app-line bg-app-bg p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 p-1">
          <span>Xem mục tiêu đã viết</span>
          <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-3.5">
          <div className="rounded-xl border border-app-line bg-app-surface p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-app-ink-muted">Mục tiêu cụ thể</p>
            <p className="mt-2 text-sm leading-relaxed text-app-ink-soft">{smartGoal.specific}</p>
          </div>
          <div className="rounded-xl border border-app-line bg-app-surface p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-app-ink-muted">Cách đo kết quả</p>
            <p className="mt-2 text-sm leading-relaxed text-app-ink-soft">{smartGoal.measurable}</p>
          </div>
        </div>
      </details>

      {planRationaleReasons.length > 0 ? (
        <details className="group rounded-2xl border border-app-line bg-app-bg p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 p-1">
            <span>Vì sao kế hoạch này được đề xuất</span>
            <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 border-t border-app-line/60 pt-4">
            <ul className="grid gap-3 md:grid-cols-2">
              {planRationaleReasons.map((reason) => (
                <li key={reason.id} className="rounded-xl border border-app-line bg-app-surface p-4 shadow-sm">
                  <p className="text-sm font-bold text-app-ink">{reason.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft">{reason.detail}</p>
                </li>
              ))}
            </ul>
            {feasibility.smartGoalQualityNote ? (
              <div className="mt-3.5 rounded-xl border border-app-line bg-app-surface px-4 py-3 text-xs leading-relaxed text-app-ink-soft">
                {feasibility.smartGoalQualityNote}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {(feasibility.bottleneck || feasibility.firstWeekGuidance || feasibility.scopeRecommendation) && (
        <details className="group rounded-2xl border border-app-line bg-app-bg p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 p-1">
            <span>Các gợi ý từ đánh giá khả thi (Feasibility Hints)</span>
            <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-3.5 md:grid-cols-3">
            <div className={cn(infoBoxClass, "bg-app-surface border-app-line")}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Cần chú ý</p>
              <p className="mt-1 text-sm font-bold text-app-ink">{feasibility.bottleneck?.label ?? "Chưa có"}</p>
              {feasibility.bottleneck?.action ? <p className="mt-2 text-xs text-app-ink-soft leading-normal">{feasibility.bottleneck.action}</p> : null}
            </div>
            <div className={cn(infoBoxClass, "bg-app-surface border-app-line")}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Tuần 1</p>
              <p className="mt-1 font-medium leading-relaxed">{feasibility.firstWeekGuidance ?? "Giữ tuần đầu vừa sức để tạo nhịp."}</p>
            </div>
            <div className={cn(infoBoxClass, "bg-app-surface border-app-line")}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Mức tải</p>
              <p className="mt-1 text-sm font-bold text-app-ink">{getPlanLoadLabel(feasibility.planLoad)}</p>
              <p className="mt-2 text-xs text-app-ink-soft leading-normal">{feasibility.scopeRecommendation ?? "Giữ 2-3 việc lặp lại và một buổi nhìn lại cố định."}</p>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
