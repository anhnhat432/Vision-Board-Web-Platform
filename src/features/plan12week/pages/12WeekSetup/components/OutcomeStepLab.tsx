import { Lightbulb, Lock, Sparkles, ChevronDown } from "lucide-react";

import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import { getUserData, type PricingPlanCode } from "@/app/utils/storage";
import {
  TWELVE_WEEK_TEMPLATE_CATALOG,
  getPlanLabel,
  planSatisfiesRequirement,
  type AdaptiveTemplateRecommendation,
  type AdaptiveTemplateSupport,
  type TwelveWeekTemplateDefinition,
} from "@/app/utils/twelve-week-premium";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
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

export const LIFE_AREA_COLORS: Record<string, { bg: string; border: string; text: string; accentClass: string; accentHex: string; softBg: string; label: string }> = {
  Career: { bg: "bg-mood-mint-soft/40 dark:bg-mood-mint-soft/5", border: "border-mood-mint/20 dark:border-mood-mint/10", text: "text-mood-mint dark:text-mood-mint", accentClass: "bg-mood-mint", accentHex: "#5CA08E", softBg: "bg-mood-mint-soft dark:bg-mood-mint-soft/10", label: "Sự nghiệp" },
  Finance: { bg: "bg-mood-amber-soft/40 dark:bg-mood-amber-soft/5", border: "border-mood-amber/20 dark:border-mood-amber/10", text: "text-mood-amber dark:text-mood-amber", accentClass: "bg-mood-amber", accentHex: "#E29E4B", softBg: "bg-mood-amber-soft dark:bg-mood-amber-soft/10", label: "Tài chính" },
  Health: { bg: "bg-mood-sky-soft/40 dark:bg-mood-sky-soft/5", border: "border-mood-sky/20 dark:border-mood-sky/10", text: "text-mood-sky dark:text-mood-sky", accentClass: "bg-mood-sky", accentHex: "#6BA4E8", softBg: "bg-mood-sky-soft dark:bg-mood-sky-soft/10", label: "Sức khỏe" },
  Education: { bg: "bg-mood-lavender-soft/40 dark:bg-mood-lavender-soft/5", border: "border-mood-lavender/20 dark:border-mood-lavender/10", text: "text-mood-lavender dark:text-mood-lavender", accentClass: "bg-mood-lavender", accentHex: "#9F92EC", softBg: "bg-mood-lavender-soft dark:bg-mood-lavender-soft/10", label: "Học tập" },
  Relationships: { bg: "bg-mood-rose-soft/40 dark:bg-mood-rose-soft/5", border: "border-mood-rose/20 dark:border-mood-rose/10", text: "text-mood-rose dark:text-mood-rose", accentClass: "bg-mood-rose", accentHex: "#E88BA4", softBg: "bg-mood-rose-soft dark:bg-mood-rose-soft/10", label: "Mối quan hệ" },
  Family: { bg: "bg-mood-rose-soft/40 dark:bg-mood-rose-soft/5", border: "border-mood-rose/20 dark:border-mood-rose/10", text: "text-mood-rose dark:text-mood-rose", accentClass: "bg-mood-rose", accentHex: "#E88BA4", softBg: "bg-mood-rose-soft dark:bg-mood-rose-soft/10", label: "Gia đình" },
  "Personal Growth": { bg: "bg-mood-lavender-soft/40 dark:bg-mood-lavender-soft/5", border: "border-mood-lavender/20 dark:border-mood-lavender/10", text: "text-mood-lavender dark:text-mood-lavender", accentClass: "bg-mood-lavender", accentHex: "#9F92EC", softBg: "bg-mood-lavender-soft dark:bg-mood-lavender-soft/10", label: "Phát triển bản thân" },
  Leisure: { bg: "bg-mood-amber-soft/40 dark:bg-mood-amber-soft/5", border: "border-mood-amber/20 dark:border-mood-amber/10", text: "text-mood-amber dark:text-mood-amber", accentClass: "bg-mood-amber", accentHex: "#E29E4B", softBg: "bg-mood-amber-soft dark:bg-mood-amber-soft/10", label: "Giải trí" },
};

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
  const planRationaleReasons = buildPlanRationaleReasons(feasibility);
  const milestoneError = getMilestoneValidationError({
    week4: draft.week4Milestone,
    week8: draft.week8Milestone,
    week12: draft.week12Outcome,
  });
  const lagMetricPreview = draft.lagMetricName.trim()
    ? `${draft.lagMetricName.trim()}${draft.lagMetricUnit.trim() ? ` (${draft.lagMetricUnit.trim()})` : ""}`
    : "";

  // 1. Load Vision Board image to establish strong visual connection
  const userData = getUserData();
  const activeBoard = userData.visionBoards?.[0];
  const focusAreaItem = activeBoard?.items?.find(
    (item) => item.type === "image" && item.lifeAreaId === smartGoal.focusArea
  );
  const visionImageUrl = focusAreaItem?.content;

  // 2. Identify color map for current focus area
  const areaColor = LIFE_AREA_COLORS[smartGoal.focusArea] || {
    bg: "bg-mood-lavender-soft/40 dark:bg-mood-lavender-soft/5",
    border: "border-mood-lavender/20 dark:border-mood-lavender/10",
    text: "text-mood-lavender",
    accentClass: "bg-mood-lavender",
    accentHex: "#9F92EC",
    softBg: "bg-mood-lavender-soft dark:bg-mood-lavender-soft/10",
    label: smartGoal.focusArea
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 sm:px-0">
      
      {/* Visual Link Header: Polaroid picture alongside styled SMART Goal card */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center bg-white/40 dark:bg-[#1C1A15]/40 p-5 rounded-2xl border border-app-line/50 backdrop-blur-sm shadow-sm animate-fade-in">
        
        {/* Left: Polaroid vision item */}
        <div className="relative shrink-0 mx-auto w-[210px] sm:w-[220px] rotate-[-1.5deg] bg-white dark:bg-[#26231D] p-3 pb-5 shadow-md border border-neutral-200/50 dark:border-neutral-800 rounded-sm transition-transform duration-300 hover:rotate-0">
          {/* Washi tape effect */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-gradient-to-r from-violet-200/75 via-pink-200/75 to-sky-200/75 dark:from-violet-900/40 dark:to-sky-900/40 backdrop-blur-sm rotate-[1deg] border border-white/20 shadow-xs" />
          
          {visionImageUrl ? (
            <img 
              src={visionImageUrl} 
              alt={smartGoal.focusArea} 
              className="w-full h-36 sm:h-40 object-cover rounded-xs border border-neutral-100 dark:border-neutral-900" 
            />
          ) : (
            <div className={cn("w-full h-36 sm:h-40 rounded-xs border border-neutral-100 dark:border-neutral-900 flex flex-col items-center justify-center p-3 text-center", areaColor.softBg)}>
              <span className="text-3xl mb-1.5">🎯</span>
              <p className={cn("text-[11px] font-bold uppercase tracking-wider", areaColor.text)}>
                {areaColor.label}
              </p>
            </div>
          )}
          
          <p className="mt-3 text-center font-serif italic text-[11px] text-app-ink-soft">
            Mục tiêu từ Vision Board ✨
          </p>
        </div>

        {/* Right: SMART Goal details card */}
        <div className={cn("rounded-2xl border p-5 space-y-3.5 self-stretch flex flex-col justify-center", areaColor.bg, areaColor.border)}>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/60 dark:bg-black/20 text-xs">🎯</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">Mục tiêu hiện tại</span>
          </div>

          <h3 className="text-base font-semibold leading-relaxed text-app-ink">
            {smartGoal.specific}
          </h3>

          {smartGoal.measurable ? (
            <div className="flex items-start gap-2 rounded-xl bg-white/60 dark:bg-black/20 px-3.5 py-2.5 border border-white/40 dark:border-white/5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-accent animate-pulse" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-app-ink-soft">
                <span className="font-semibold text-app-ink">Đã đo lường từ SMART Goal:</span> {smartGoal.measurable}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <section className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm" aria-labelledby="outcome-required-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p id="outcome-required-title" className="text-sm font-semibold text-app-ink">
              Chốt phần bắt buộc trước
            </p>
            <p className="mt-1 text-xs text-app-ink-soft">
              Ba mục này đủ để đi tiếp. Khung gợi ý phía dưới chỉ là phần hỗ trợ nhanh.
            </p>
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold shadow-xs", areaColor.border, areaColor.text, areaColor.softBg)}>
            Bắt buộc
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="week-12-outcome" className={labelClass}>
              Đích đến sau 12 tuần
            </label>
            <Textarea
              id="week-12-outcome"
              rows={4}
              value={draft.week12Outcome}
              aria-invalid={Boolean(milestoneError)}
              aria-describedby={milestoneError ? "week-12-outcome-error" : "week-12-outcome-helper"}
              className={cn(
                textareaClass,
                "min-h-[120px] rounded-xl focus:ring-violet-400 focus:border-violet-400",
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
                Mô tả trạng thái bạn muốn đạt được khi 12 tuần kết thúc. Đây là đích đến cuối chu kỳ, không phải việc cần làm mỗi ngày.
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
              className={cn(textareaClass, "rounded-xl")}
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
              className={cn(inputClass, "rounded-xl")}
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
                className={cn(inputClass, "rounded-xl")}
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
                className={cn(inputClass, "rounded-xl")}
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
        <details className="group surface-raised rounded-2xl border border-app-line bg-app-surface p-5 transition-all duration-300 [&::-webkit-details-marker]:hidden">
          <summary
            id="template-personalize-title"
            className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md px-2 text-sm font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400 focus-visible:outline-none p-1"
          >
            <span>Cá nhân hóa khung gợi ý</span>
            <ChevronDown className="h-4.5 w-4.5 text-violet-500 transition-transform duration-300 group-open:rotate-180" />
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
                  className={cn(selectTriggerClass, "rounded-xl")}
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
              <div className="flex flex-wrap gap-2.5 mt-2">
                {WEEKDAY_LABELS.map((dayLabel, dayIndex) => {
                  const isActive = draft.preferredDays.includes(dayIndex);
                  return (
                    <button
                      key={dayLabel}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onPreferredDayToggle(dayIndex)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 focus-visible:outline-none",
                        isActive
                          ? "border-none bg-gradient-to-r from-violet-500 to-indigo-500 dark:from-violet-600 dark:to-indigo-600 text-white shadow-md font-bold scale-110"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:border-violet-400 hover:text-violet-500 dark:hover:text-violet-400",
                      )}
                    >
                      {dayLabel}
                    </button>
                  );
                })}
              </div>
              <p className={helperTextClass}>
                {draft.preferredDays.length === 0
                  ? "Chưa chọn — mặc định sẽ dàn đều cả tuần."
                  : `Đã chọn ${draft.preferredDays.length} ngày tập trung.`}
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
                  className={cn(selectTriggerClass, "rounded-xl")}
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
                {draft.personalConstraint === "time" && "💡 Gợi ý: Kế hoạch sẽ ưu tiên giữ nhẹ và cực kỳ tập trung."}
                {draft.personalConstraint === "motivation" && "💡 Gợi ý: Kế hoạch sẽ ưu tiên thắng nhỏ sớm và giảm ma sát."}
                {draft.personalConstraint === "consistency" && "💡 Gợi ý: Kế hoạch sẽ ưu tiên nhịp đều thay vì tải cao."}
                {draft.personalConstraint === "complexity" && "💡 Gợi ý: Kế hoạch sẽ giúp tách lớp rõ ràng hơn."}
                {!draft.personalConstraint && "Chọn trở ngại để kế hoạch tự động điều chỉnh phù hợp hơn."}
              </p>
            </div>
          </div>
        </details>
      ) : null}

      <details className="group surface-raised rounded-2xl border border-app-line bg-app-surface p-5 transition-all duration-300 [&::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between py-1 focus-visible:outline-none rounded-lg p-1">
          <span className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-500">
              <Lightbulb className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            </div>
            <span id="template-picker-title" className="block text-sm font-semibold text-app-ink">
              Bắt đầu nhanh bằng khung gợi ý
            </span>
          </span>
          <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-300 group-open:rotate-180" />
        </summary>

        <div className="mt-4 border-t border-app-line/60 pt-4 space-y-4 animate-fade-in">
          <p className="text-xs text-app-ink-soft">
            Dùng khung mẫu được thiết kế sẵn để bắt đầu nhanh chóng. Bạn vẫn có thể tùy chỉnh mọi thông số sau đó.
          </p>

          {recommendedTemplate && adaptiveTemplateRecommendation ? (
            <div className="rounded-2xl border border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-violet-50/20 to-indigo-50/10 dark:from-violet-950/5 dark:to-indigo-950/5 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                    Gợi ý tối ưu cho mục tiêu này
                  </p>
                  <p className="mt-2 text-xl font-bold text-app-ink tracking-tight">{recommendedTemplate.name}</p>
                  <p className="mt-2 text-xs leading-relaxed text-app-ink-soft/90">{adaptiveTemplateRecommendation.reason}</p>
                </div>
                <span className="rounded-full border border-violet-200 dark:border-violet-800 bg-white dark:bg-[#26231D] px-3.5 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
                  {recommendedTemplate.requiredPlan ? getPlanLabel(recommendedTemplate.requiredPlan) : "Miễn phí"}
                </span>
              </div>
              <button
                type="button"
                className={cn(
                  "mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none sm:w-auto active:scale-[0.98] shadow-sm",
                  selectedTemplate?.id === recommendedTemplate.id
                    ? "border border-violet-300 bg-violet-100/50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white hover:brightness-105",
                )}
                onClick={() => onTemplateSelect(recommendedTemplate)}
              >
                {selectedTemplate?.id === recommendedTemplate.id ? "✨ Đang sử dụng khung này" : "Áp dụng khung gợi ý này"}
              </button>
              {recommendedTemplateSupport ? (
                <details className="group mt-4 rounded-xl border border-app-line/60 bg-white/40 dark:bg-black/10 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-10 cursor-pointer items-center justify-between list-none rounded-md text-xs font-semibold text-app-ink focus-visible:outline-none p-1">
                    <span>Xem chi tiết gợi ý giữ nhịp</span>
                    <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 border-t border-app-line/60 pt-3 grid gap-3.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-app-line/50 bg-white dark:bg-[#1C1A15] p-4 text-xs leading-relaxed text-app-ink-soft shadow-xs">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">
                        Tuần 1 nên thắng ở đâu
                      </p>
                      <p className="mt-1.5 text-sm font-bold text-app-ink">
                        {recommendedTemplateSupport.week1Headline}
                      </p>
                      <p className="mt-1.5 leading-relaxed">{recommendedTemplateSupport.week1Support}</p>
                    </div>
                    <div className="rounded-xl border border-app-line/50 bg-white dark:bg-[#1C1A15] p-4 text-xs leading-relaxed text-app-ink-soft shadow-xs">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">
                        Nhịp nên giữ
                      </p>
                      <p className="mt-1.5 leading-relaxed font-medium">{recommendedTemplateSupport.week1CadenceHint}</p>
                    </div>
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}

          <details className="group mt-4 rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-4 [&::-webkit-details-marker]:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-xs font-semibold text-app-ink focus-visible:outline-none p-1">
              <span>Xem tất cả khung mẫu thiết kế sẵn</span>
              <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-4 lg:grid-cols-2">
              {TWELVE_WEEK_TEMPLATE_CATALOG.map((template) => {
                const isLocked = !planSatisfiesRequirement(currentPlan, template.requiredPlan);
                const isSelected = selectedTemplate?.id === template.id;
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
                      "min-h-11 rounded-2xl border p-4.5 text-left transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none",
                      isSelected 
                        ? "border-violet-400 bg-gradient-to-br from-violet-50/40 to-indigo-50/20 dark:from-violet-950/20 dark:to-indigo-950/10 text-violet-700 dark:text-violet-300 shadow-md font-semibold ring-[4px] ring-violet-100 dark:ring-violet-950/30"
                        : isLocked
                        ? "border-app-line bg-app-bg/60 text-app-ink-soft opacity-80 hover:border-violet-300 hover:bg-violet-50/5 hover:opacity-100"
                        : "border-app-line bg-app-surface text-app-ink hover:border-violet-300 hover:bg-app-bg/50",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold tracking-tight">{template.name}</p>
                          <span className="rounded-full border border-app-line/60 bg-app-surface px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
                            {template.requiredPlan ? `Khung ${getPlanLabel(template.requiredPlan)}` : "Khung miễn phí"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-app-ink-soft">{template.subtitle}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-app-line bg-app-surface px-2.5 py-0.5 text-[10px] font-semibold text-app-ink-muted shadow-xs">
                        {isLocked ? <Lock className="h-3 w-3" aria-hidden="true" /> : null}
                        {isSelected ? "Đang dùng" : isLocked ? "Đang khóa" : "Sẵn sàng"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-app-ink-soft/90">{template.description}</p>
                    
                    <div className="mt-4 grid gap-3 text-xs leading-relaxed text-app-ink-soft/95 sm:grid-cols-2">
                      <div className="rounded-xl border border-app-line/60 bg-white/40 dark:bg-black/10 px-3 py-2 shadow-xs">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">
                          Hợp khi
                        </p>
                        <p className="mt-1 font-medium">{template.bestFor}</p>
                      </div>
                      <div className="rounded-xl border border-app-line/60 bg-white/40 dark:bg-black/10 px-3 py-2 shadow-xs">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">Chiến thắng tuần 1</p>
                        <p className="mt-1 font-medium">{template.firstWeekWin}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {template.idealFor.map((item) => (
                        <span key={`${template.id}_${item}`} className={cn(chipClass, "border-app-line/60 bg-white dark:bg-[#26231D] text-[11px] font-medium")}>
                          {item}
                        </span>
                      ))}
                      {template.tactics.slice(0, 2).map((tactic) => (
                        <span key={`${template.id}_${tactic.name}`} className={cn(chipClass, "border-app-line/60 bg-white dark:bg-[#26231D] text-[11px] font-medium")}>
                          {tactic.name}
                        </span>
                      ))}
                    </div>
                    {isLocked ? (
                      <div className="mt-4 flex items-center justify-between border-t border-app-line pt-3 text-xs font-semibold text-app-accent">
                        <span>Cần nâng cấp gói Plus để dùng khung này</span>
                        <span>Mở khóa ngay →</span>
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
        <details className="group surface-raised rounded-2xl border border-app-line bg-app-surface p-5 transition-all duration-300 [&::-webkit-details-marker]:hidden">
          <summary id="selected-template-title" className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-sm font-semibold text-app-ink focus-visible:outline-none p-1">
            <span className="text-violet-600 dark:text-violet-400">Khung mẫu đang áp dụng: {selectedTemplate.name}</span>
            <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="mt-3 border-t border-app-line/60 pt-3 flex flex-wrap items-start justify-between gap-3 animate-fade-in">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Khung đang dùng</p>
              <p className="mt-1 text-base font-bold text-app-ink tracking-tight">{selectedTemplate.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">{selectedTemplate.subtitle}</p>
            </div>
            <span className="rounded-full border border-app-line bg-app-bg px-3.5 py-1 text-xs font-medium text-app-ink-muted shadow-xs">
              {selectedTemplate.requiredPlan ? getPlanLabel(selectedTemplate.requiredPlan) : "Miễn phí"}
            </span>
          </div>
        </details>
      ) : null}

      <details className="group rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-4.5 transition-all duration-300 [&::-webkit-details-marker]:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-sm font-semibold text-app-ink focus-visible:outline-none p-1">
          <span>Xem lại cấu trúc SMART Goal của bạn</span>
          <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-4 md:grid-cols-2 animate-fade-in">
          <div className="rounded-2xl border border-app-line/50 bg-white/60 dark:bg-[#26231D]/50 p-4.5 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">Mục tiêu cụ thể (Specific)</p>
            <p className="mt-2 text-sm leading-relaxed text-app-ink-soft font-medium">{smartGoal.specific}</p>
          </div>
          <div className="rounded-2xl border border-app-line/50 bg-white/60 dark:bg-[#26231D]/50 p-4.5 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">Cách đo kết quả (Measurable)</p>
            <p className="mt-2 text-sm leading-relaxed text-app-ink-soft font-medium">{smartGoal.measurable}</p>
          </div>
        </div>
      </details>

      {planRationaleReasons.length > 0 ? (
        <details className="group rounded-2xl border border-app-line bg-app-bg/50 p-4.5 transition-all duration-300 [&::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-sm font-semibold text-app-ink focus-visible:outline-none p-1">
            <span>Vì sao kế hoạch 12 tuần này được đề xuất?</span>
            <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="mt-4 border-t border-app-line/60 pt-4 animate-fade-in">
            <ul className="grid gap-3.5 md:grid-cols-2">
              {planRationaleReasons.map((reason) => (
                <li key={reason.id} className="rounded-2xl border border-app-line/50 bg-white dark:bg-[#26231D] p-4.5 shadow-xs">
                  <p className="text-sm font-bold text-app-ink tracking-tight">{reason.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft/90">{reason.detail}</p>
                </li>
              ))}
            </ul>
            {feasibility.smartGoalQualityNote ? (
              <div className="mt-3.5 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300/80">
                {feasibility.smartGoalQualityNote}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {(feasibility.bottleneck || feasibility.firstWeekGuidance || feasibility.scopeRecommendation) && (
        <details className="group rounded-2xl border border-app-line bg-app-bg/50 p-4.5 transition-all duration-300 [&::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between list-none rounded-md px-2 text-sm font-semibold text-app-ink focus-visible:outline-none p-1">
            <span>Gợi ý khả thi từ chuyên gia AI (Feasibility Hints)</span>
            <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-3.5 md:grid-cols-3 animate-fade-in">
            <div className="rounded-2xl border border-app-line bg-app-surface p-4.5 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">Điểm nghẽn cần chú ý</p>
                <p className="mt-1.5 text-sm font-bold text-app-ink tracking-tight">{feasibility.bottleneck?.label ?? "Chưa phát hiện"}</p>
              </div>
              {feasibility.bottleneck?.action ? <p className="mt-2.5 text-[11px] text-app-ink-soft leading-normal bg-app-bg px-2.5 py-1.5 rounded-lg border border-app-line">{feasibility.bottleneck.action}</p> : null}
            </div>
            <div className="rounded-2xl border border-app-line bg-app-surface p-4.5 shadow-xs">
              <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">Hướng dẫn tuần đầu tiên</p>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-app-ink-soft">{feasibility.firstWeekGuidance ?? "Giữ tuần đầu vừa sức để tạo nhịp đều."}</p>
            </div>
            <div className="rounded-2xl border border-app-line bg-app-surface p-4.5 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">Mức độ chịu tải</p>
                <p className="mt-1.5 text-sm font-bold text-app-ink tracking-tight">{getPlanLoadLabel(feasibility.planLoad)}</p>
              </div>
              <p className="mt-2 text-[11px] text-app-ink-soft leading-normal">{feasibility.scopeRecommendation ?? "Giữ 2-3 việc lặp lại và một buổi nhìn lại cố định."}</p>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
