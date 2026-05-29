import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, GripVertical, Plus, Minus, Trash2 } from "lucide-react";

import { GoalArchetypeExamples } from "@/app/components/GoalArchetypeExamples";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import type { TacticType } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { getArchetypeForIntent, getUserIntentId, hasActionableArchetypeHint } from "@/app/utils/user-intent";
import type { GoalArchetype } from "@/lib/smart-goal";
import { soundService } from "@/app/services/soundService";
import {
  errorTextClass,
  helperTextClass,
  inputClass,
  labelClass,
  textareaClass,
} from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import {
  formatScheduleDayLabels,
  getLeadIndicatorTargetValidationError,
  getLeadIndicatorUnitValidationError,
  validateLeadIndicatorDraft,
} from "../helpers";
import type { IndicatorPreviewGroup } from "../helpers";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "../types";

interface LeadIndicatorsStepProps {
  draft: TwelveWeekSetupDraft;
  showValidationErrors: boolean;
  coreCount: number;
  optionalCount: number;
  setupGuideSupport: AdaptiveTemplateSupport | null;
  setupGuideTemplate: TwelveWeekTemplateDefinition | null;
  selectedTemplate: TwelveWeekTemplateDefinition | null;
  weekOneTaskPreview: string[];
  weekOneTaskWarning: string | null;
  weekOneTaskGroups: IndicatorPreviewGroup[];
  onAddIndicator: () => void;
  onRemoveIndicator: (index: number) => void;
  onIndicatorChange: <K extends keyof LeadIndicatorDraft>(index: number, key: K, value: LeadIndicatorDraft[K]) => void;
}

const COMMITMENT_FIELDS = [
  {
    key: "want",
    label: "Tôi thực sự muốn điều này vì...",
    emoji: "🔥",
    placeholder: "Tại sao bạn muốn điều này nhất? Động lực sâu thẳm..."
  },
  {
    key: "cost",
    label: "Tôi sẵn sàng trả giá gì...",
    emoji: "⏳",
    placeholder: "Mất đi thời gian rảnh, công sức, sự lười biếng..."
  },
  {
    key: "means",
    label: "Tôi sẽ làm thế nào (cụ thể)...",
    emoji: "⚙️",
    placeholder: "Cách thực hiện chi tiết, các bước nhỏ nhất..."
  },
  {
    key: "tradeoff",
    label: "Tôi sẽ phải bỏ qua/giảm điều gì...",
    emoji: "🛑",
    placeholder: "Bỏ lướt điện thoại, giảm tụ tập không cần thiết..."
  },
  {
    key: "reward",
    label: "Tôi sẽ tự thưởng gì khi giữ được...",
    emoji: "🎁",
    placeholder: "Một ly cà phê ngon, một buổi xem phim thư giãn..."
  },
] as const;

const optionButtonClass =
  "flex flex-col items-start gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3.5 text-left text-sm font-bold text-slate-650 dark:text-slate-350 transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] dark:hover:bg-indigo-500/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 active:scale-[0.97]";
const optionButtonActiveClass = "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 shadow-lg shadow-indigo-500/[0.03] ring-1 ring-indigo-500/20";

function normalizeCommitmentChange(
  current: LeadIndicatorDraft["commitment"],
  key: (typeof COMMITMENT_FIELDS)[number]["key"],
  value: string,
): LeadIndicatorDraft["commitment"] {
  const next = {
    want: current?.want ?? "",
    cost: current?.cost ?? "",
    means: current?.means ?? "",
    tradeoff: current?.tradeoff ?? "",
    reward: current?.reward ?? "",
    [key]: value,
  };

  const hasAnyAnswer = COMMITMENT_FIELDS.some((field) => next[field.key].trim().length > 0);
  return hasAnyAnswer ? { ...next, filledAt: new Date().toISOString() } : undefined;
}

export function LeadIndicatorsStepLab({
  draft,
  showValidationErrors,
  coreCount,
  optionalCount,
  setupGuideSupport,
  setupGuideTemplate,
  selectedTemplate,
  weekOneTaskWarning,
  weekOneTaskGroups,
  onAddIndicator,
  onRemoveIndicator,
  onIndicatorChange,
}: LeadIndicatorsStepProps) {
  const validationOptions = {
    tacticLoadPreference: draft.tacticLoadPreference,
    dailyTimeBudget: draft.dailyTimeBudget,
  };
  const indicatorTargetErrors = draft.leadIndicators.map((indicator, index) =>
    getLeadIndicatorTargetValidationError(indicator, index),
  );
  const indicatorUnitErrors = draft.leadIndicators.map((indicator, index) =>
    getLeadIndicatorUnitValidationError(indicator, index),
  );
  const indicatorWarnings = draft.leadIndicators.map((indicator, index) =>
    showValidationErrors
      ? validateLeadIndicatorDraft(indicator, validationOptions).warnings.filter(
          (warning) => !indicatorUnitErrors[index] || !warning.toLocaleLowerCase("vi-VN").includes("đơn vị"),
        )
      : [],
  );
  const intentArchetype: GoalArchetype | null = useMemo(() => {
    const intent = getUserIntentId();
    if (!intent || !hasActionableArchetypeHint(intent)) return null;
    return getArchetypeForIntent(intent);
  }, []);

  const [expandedCommitments, setExpandedCommitments] = useState<Record<string, boolean>>(() => {
    const firstIndicatorId = draft.leadIndicators[0]?.id;
    return firstIndicatorId ? { [firstIndicatorId]: true } : {};
  });
  const canAddIndicator = draft.leadIndicators.length < 4;

  const shouldShowFieldError = (fieldId: string) => {
    void fieldId;
    return showValidationErrors;
  };

  const toggleCommitmentEditor = (indicatorId: string) => {
    setExpandedCommitments((previous) => ({
      ...previous,
      [indicatorId]: !previous[indicatorId],
    }));
  };

  const showNameError = (indicator: LeadIndicatorDraft, fieldKey: string) =>
    shouldShowFieldError(fieldKey) && !indicator.name.trim();

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 group z-10" aria-labelledby="lead-step-hero">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <p id="lead-step-hero" className="text-sm font-bold text-slate-800 dark:text-slate-200">
              ⚡ Chỉ số dẫn dắt (Lead Indicators)
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Việc lặp lại là việc bạn chủ động làm đều mỗi tuần. Chỉ số kết quả là con số bạn xem lại để biết mình đã tiến tới đâu. Chọn việc nhỏ và đo bằng số lần thực hiện, không đo bằng kết quả cuối cùng.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddIndicator}
            disabled={!canAddIndicator}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 transition-all px-4 py-2.5 text-sm font-bold sm:w-auto"
          >
            <Plus className="h-4.5 w-4.5" aria-hidden="true" />
            Thêm chỉ số hành động
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-4 relative z-10" aria-labelledby="lead-examples-title">
        <p id="lead-examples-title" className="text-xs font-extrabold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-3.5">
          🎯 Ví dụ dễ phân biệt
        </p>
        <div className="grid gap-3.5 md:grid-cols-2">
          <div className="rounded-xl border border-rose-200/30 dark:border-rose-950/20 bg-rose-500/5 dark:bg-rose-950/10 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
              <span>❌</span> Chỉ số kết quả — không nhập ở bước này
            </p>
            <ul className="mt-2.5 space-y-1 text-xs leading-6 text-slate-500 dark:text-slate-400 font-semibold">
              <li>- Có 100 người dùng thực tế</li>
              <li>- Hoàn thành xong hoàn toàn app</li>
              <li>- Giảm nhanh 5kg cân nặng</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200/30 dark:border-emerald-950/20 bg-emerald-500/5 dark:bg-emerald-950/10 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
              <span>⚡</span> Việc lặp lại — nên nhập ở bước này
            </p>
            <ul className="mt-2.5 space-y-1 text-xs leading-6 text-slate-500 dark:text-slate-400 font-semibold">
              <li>- Demo sản phẩm trực tiếp cho 5 người / tuần</li>
              <li>- Code chức năng chính 5 buổi / tuần</li>
              <li>- Tập gym bền bỉ 3 buổi / tuần</li>
            </ul>
          </div>
        </div>
      </section>

      <details className="group rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-3 sm:p-4 [&::-webkit-details-marker]:hidden relative z-10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md px-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-350 focus-visible:outline-none p-1">
          <span>💡 Việc lặp lại khác chỉ số kết quả thế nào?</span>
          <ChevronDown className="h-4.5 w-4.5 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="mt-4 border-t border-slate-200/40 dark:border-slate-800/40 pt-4 grid gap-3.5 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 dark:border-slate-800/20 bg-slate-50/20 dark:bg-slate-950/10 p-3.5">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">Việc lặp lại (Lead)</p>
            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400 font-semibold">
              Việc bạn có thể chủ động mở lịch ra và hoàn thành ngay trong tuần: viết 800 từ, tập thể dục 45 phút, gửi 5 email kết nối khách hàng.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 dark:border-slate-800/20 bg-slate-50/20 dark:bg-slate-950/10 p-3.5">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Chỉ số kết quả (Lag)</p>
            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400 font-semibold">
              Con số hoặc trạng thái để xem lại cuối kỳ xem nỗ lực có hiệu quả không: tăng 1000 follower, giảm 3kg, đạt chứng chỉ IELTS 7.5.
            </p>
          </div>
        </div>
      </details>

      <GoalArchetypeExamples archetype={intentArchetype} variant="lead_indicator" />

      <div className="space-y-5 relative z-10">
        {draft.leadIndicators.map((indicator, index) => (
          <article
            key={indicator.id}
            className="relative overflow-hidden rounded-3xl border border-white/25 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/65 backdrop-blur-xl shadow-2xl p-5 sm:p-6 hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-indigo-500/5 transition-all duration-300 group"
            aria-labelledby={`tactic-card-title-${index}`}
          >
            {/* Background radial glow */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-2 sm:gap-3 relative z-10">
              <GripVertical className="mt-1 hidden h-4 w-4 shrink-0 text-slate-400 sm:block cursor-grab" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/40 dark:border-slate-800/40 pb-3.5">
                  <div>
                    <p id={`tactic-card-title-${index}`} className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                        {index + 1}
                      </span>
                      Hành động lặp lại
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      {indicator.name || "Chưa đặt tên"} · <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{indicator.target || "0"}</span> {indicator.unit || "chưa có đơn vị"} / tuần
                    </p>
                  </div>
                  {draft.leadIndicators.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => onRemoveIndicator(index)}
                      aria-label={`Xóa việc ${index + 1}${indicator.name ? `: ${indicator.name}` : ""}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200/30 transition-all duration-200 active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Xoá việc này
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-5">
                  <div className="rounded-xl border border-white/10 dark:border-slate-850/30 bg-slate-50/20 dark:bg-slate-950/10 p-4">
                    <label htmlFor={`tactic-name-${index}`} className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>
                      <span className="text-lg">🏃</span>
                      <span>Mô tả hành động lặp lại</span>
                    </label>
                    <Input
                      id={`tactic-name-${index}`}
                      value={indicator.name}
                      aria-describedby={showNameError(indicator, `name-${indicator.id}`) ? `tactic-name-${index}-error` : `tactic-name-${index}-helper`}
                      onChange={(event) => onIndicatorChange(index, "name", event.target.value)}
                      placeholder="Ví dụ: viết 3 bài, tập 2 buổi, gửi 5 lời nhắn chủ động..."
                      className={cn(inputClass, "bg-white/80 dark:bg-slate-950/40 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 rounded-xl")}
                    />
                    {showNameError(indicator, `name-${indicator.id}`) ? (
                      <p id={`tactic-name-${index}-error`} role="alert" className={cn(errorTextClass, "mt-1.5 text-xs font-bold text-rose-500")}>
                        Đặt tên cho việc lặp lại này.
                      </p>
                    ) : (
                      <p id={`tactic-name-${index}-helper`} className={cn(helperTextClass, "mt-1.5 text-[11px] font-semibold text-slate-450")}>
                        Đặt tên bằng một hành động cụ thể bạn có thể tự kiểm soát và lặp lại trong tuần.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 dark:border-slate-850/30 bg-slate-50/20 dark:bg-slate-950/10 p-4">
                      <label htmlFor={`tactic-target-${index}`} className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>
                        <span className="text-lg">🔢</span>
                        <span>Số lần / tuần</span>
                      </label>
                      
                      {/* Pill-shaped Picker cao cấp */}
                      <div className="flex items-center bg-slate-100/70 dark:bg-slate-900/60 border border-slate-250 dark:border-slate-800/80 rounded-full p-1.5 w-full max-w-[170px] mt-2 shadow-inner transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <button
                          type="button"
                          onClick={() => {
                            soundService.click();
                            const val = parseInt(indicator.target.trim(), 10);
                            const currentVal = Number.isNaN(val) ? 0 : val;
                            const newVal = Math.max(1, currentVal - 1);
                            onIndicatorChange(index, "target", newVal.toString());
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all active:scale-90 shadow-sm"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <Input
                          id={`tactic-target-${index}`}
                          value={indicator.target}
                          aria-invalid={Boolean(indicatorTargetErrors[index] && shouldShowFieldError(`target-${indicator.id}`))}
                          aria-describedby={
                            indicatorTargetErrors[index] && shouldShowFieldError(`target-${indicator.id}`)
                              ? `tactic-target-${index}-error`
                              : `tactic-target-${index}-helper`
                          }
                          className={cn(
                            "w-14 bg-transparent border-0 text-center font-extrabold text-slate-800 dark:text-slate-100 text-base focus:ring-0 focus:outline-none p-0 h-9 select-all mt-0",
                            indicatorTargetErrors[index] &&
                              shouldShowFieldError(`target-${indicator.id}`) &&
                              "text-red-500",
                          )}
                          onChange={(event) => onIndicatorChange(index, "target", event.target.value)}
                          placeholder="2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundService.click();
                            const val = parseInt(indicator.target.trim(), 10);
                            const currentVal = Number.isNaN(val) ? 0 : val;
                            const newVal = Math.min(21, currentVal + 1);
                            onIndicatorChange(index, "target", newVal.toString());
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all active:scale-90 shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {indicatorTargetErrors[index] && shouldShowFieldError(`target-${indicator.id}`) ? (
                        <p id={`tactic-target-${index}-error`} role="alert" className={cn(errorTextClass, "mt-1.5 text-xs font-bold text-rose-500")}>
                          {indicatorTargetErrors[index]}
                        </p>
                      ) : (
                        <p id={`tactic-target-${index}-helper`} className={cn(helperTextClass, "mt-2 text-[11px] font-semibold text-slate-450")}>
                          Nhập hoặc dùng nút xoay để tăng/giảm mục tiêu.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 dark:border-slate-850/30 bg-slate-50/20 dark:bg-slate-950/10 p-4">
                      <label htmlFor={`tactic-unit-${index}`} className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>
                        <span className="text-lg">🏷️</span>
                        <span>Đơn vị</span>
                      </label>
                      <Input
                        id={`tactic-unit-${index}`}
                        value={indicator.unit}
                        aria-invalid={Boolean(indicatorUnitErrors[index] && shouldShowFieldError(`unit-${indicator.id}`))}
                        aria-describedby={
                          indicatorUnitErrors[index] && shouldShowFieldError(`unit-${indicator.id}`)
                            ? `tactic-unit-${index}-error`
                            : `tactic-unit-${index}-helper`
                        }
                        className={cn(
                          inputClass,
                          "bg-white/80 dark:bg-slate-950/40 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 rounded-xl",
                          indicatorUnitErrors[index] &&
                            shouldShowFieldError(`unit-${indicator.id}`) &&
                            "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
                        )}
                        onChange={(event) => onIndicatorChange(index, "unit", event.target.value)}
                        placeholder="buổi, bài, lần..."
                      />
                      {indicatorUnitErrors[index] && shouldShowFieldError(`unit-${indicator.id}`) ? (
                        <p id={`tactic-unit-${index}-error`} role="alert" className={cn(errorTextClass, "mt-1.5 text-xs font-bold text-rose-500")}>
                          {indicatorUnitErrors[index]}
                        </p>
                      ) : (
                        <p id={`tactic-unit-${index}-helper`} className={cn(helperTextClass, "mt-1.5 text-[11px] font-semibold text-slate-450")}>
                          Dùng đơn vị gần với hành động: buổi, bài, lần, phút...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-white/10 dark:border-slate-850/20 bg-slate-50/20 dark:bg-slate-950/10 p-3.5">
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm font-bold text-slate-700 dark:text-slate-350 focus-visible:outline-none active:scale-[0.99]"
                    aria-expanded={Boolean(expandedCommitments[indicator.id])}
                    aria-controls={`tactic-commitment-${index}`}
                    onClick={() => toggleCommitmentEditor(indicator.id)}
                  >
                    <span>🛠️ Cài đặt cam kết nâng cao (Thử thách Stoic)</span>
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <ChevronDown
                        className={cn(
                          "h-4.5 w-4.5 transition-transform duration-150",
                          expandedCommitments[indicator.id] && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  <p className={helperTextClass}>
                    Mở phần này nếu bạn muốn thêm ràng buộc cho nhịp làm việc và cách tự nhắc mình giữ kỷ luật.
                  </p>
                  {expandedCommitments[indicator.id] ? (
                    <div id={`tactic-commitment-${index}`} className="mt-4 grid gap-3">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 dark:border-slate-850/20 bg-slate-50/10 dark:bg-slate-950/10 p-4">
                          <p className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>📌 Loại hành động</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {(
                              [
                                { value: "core", label: "Cốt lõi 🎯", hint: "Bắt buộc leo núi" },
                                { value: "optional", label: "Tùy chọn 🌱", hint: "Làm thêm khi có sức" },
                              ] as const
                            ).map((option) => {
                              const active = indicator.type === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => {
                                    soundService.click();
                                    onIndicatorChange(index, "type", option.value as TacticType);
                                  }}
                                  className={cn(optionButtonClass, "min-h-11 px-3 py-2.5", active && optionButtonActiveClass)}
                                >
                                  <span className="text-xs font-extrabold">{option.label}</span>
                                  <span className="text-[9px] font-semibold opacity-75 mt-0.5 leading-snug">{option.hint}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 dark:border-slate-850/20 bg-slate-50/10 dark:bg-slate-950/10 p-4">
                          <p className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>⚡ Nhịp phân bổ</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {(
                              [
                                { value: "spread", label: "Trải đều 🗓️", hint: "Cả tuần" },
                                { value: "frontload", label: "Đầu tuần 🚀", hint: "Xong sớm" },
                                { value: "backload", label: "Cuối tuần 🌅", hint: "Về đích" },
                              ] as const
                            ).map((option) => {
                              const active = indicator.cadence === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => {
                                    soundService.click();
                                    onIndicatorChange(index, "cadence", option.value);
                                  }}
                                  className={cn(optionButtonClass, "min-h-11 px-2.5 py-2.5", active && optionButtonActiveClass)}
                                >
                                  <span className="text-xs font-extrabold">{option.label}</span>
                                  <span className="text-[9px] font-semibold opacity-75 mt-0.5 leading-snug">{option.hint}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3.5">
                        {COMMITMENT_FIELDS.map((field) => (
                          <div key={field.key} className="rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/50 dark:bg-slate-950/20 p-4.5 transition-all duration-300 hover:border-indigo-500/20 focus-within:border-indigo-500/30 focus-within:ring-2 focus-within:ring-indigo-500/5">
                            <label htmlFor={`tactic-commitment-${field.key}-${index}`} className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2.5")}>
                              <span className="text-lg">{field.emoji}</span>
                              <span className="text-xs tracking-wide">{field.label}</span>
                            </label>
                            <Textarea
                              id={`tactic-commitment-${field.key}-${index}`}
                              rows={2}
                              value={indicator.commitment?.[field.key] ?? ""}
                              onChange={(event) =>
                                onIndicatorChange(
                                  index,
                                  "commitment",
                                  normalizeCommitmentChange(indicator.commitment, field.key, event.target.value),
                                )
                              }
                              placeholder={field.placeholder}
                              className={cn(
                                textareaClass,
                                "min-h-[70px] bg-white/80 dark:bg-slate-950/40 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl text-xs font-semibold leading-relaxed"
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {indicatorWarnings[index]?.length > 0 ? (
                  <ul
                    className="mt-3 space-y-1 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-3 py-2 text-xs leading-5 text-[color:var(--color-danger-fg)]"
                    aria-label={`Cảnh báo cho việc ${index + 1}`}
                  >
                    {indicatorWarnings[index].map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-app-line bg-app-bg p-3" aria-labelledby="week-one-preview-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            id="week-one-preview-title"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted"
          >
            Xem trước tuần 1
          </p>
          <span className="inline-flex min-h-10 items-center rounded-full bg-app-accent-soft px-3 py-2 text-xs font-medium text-app-accent">
            {coreCount} cốt lõi · {optionalCount} tùy chọn
          </span>
        </div>

        {setupGuideSupport && setupGuideTemplate ? (
          <div className="mt-3 rounded-lg border border-app-line bg-app-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
              {selectedTemplate ? "Tuần 1 theo khung đang dùng" : "Nếu đi theo khung gợi ý này"}
            </p>
            <p className="mt-2 text-sm font-medium text-app-ink">{setupGuideSupport.week1Headline}</p>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">{setupGuideSupport.week1Support}</p>
            <p className="mt-3 rounded-lg border border-app-line bg-app-bg px-3 py-2 text-sm leading-6 text-app-ink-soft">
              {setupGuideSupport.week1CadenceHint}
            </p>
          </div>
        ) : null}

        <p className="mt-3 text-xs leading-5 text-app-ink-muted">
          Từ mỗi việc lặp lại bên trên, việc hôm nay sẽ được tạo vào các ngày sau:
        </p>
        <div className="mt-3 space-y-2">
          {weekOneTaskGroups.length === 0 ? (
            <p className="text-sm text-app-ink-soft">Thêm việc để thấy tuần đầu tiên sẽ trông như thế nào.</p>
          ) : (
            weekOneTaskGroups.map((group) => (
              <div key={group.id} className="rounded-lg border border-app-line bg-app-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-app-ink">{group.name}</p>
                  <span className="inline-flex min-h-10 items-center rounded-full bg-app-accent-soft px-3 py-2 text-xs font-medium text-app-accent">
                    {group.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-app-ink-muted">
                  {group.taskTitles.length} việc / tuần · Lịch: {formatScheduleDayLabels(group.scheduleDays)}
                </p>
                {group.taskTitles.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-app-ink-soft">
                    {group.taskTitles.map((title) => (
                      <li key={title}>→ {title}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </div>

        {weekOneTaskWarning ? (
          <p
            role="status"
            className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-[color:var(--color-danger-fg)]"
          >
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">Cảnh báo:</span> {weekOneTaskWarning}
            </span>
          </p>
        ) : null}
      </section>
    </div>
  );
}
