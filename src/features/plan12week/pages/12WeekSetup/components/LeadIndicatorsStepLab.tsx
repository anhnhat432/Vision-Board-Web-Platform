import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";

import { GoalArchetypeExamples } from "@/app/components/GoalArchetypeExamples";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import type { TacticType } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { getArchetypeForIntent, getUserIntentId, hasActionableArchetypeHint } from "@/app/utils/user-intent";
import type { GoalArchetype } from "@/lib/smart-goal";
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
  },
  {
    key: "cost",
    label: "Tôi sẵn sàng trả giá gì...",
  },
  {
    key: "means",
    label: "Tôi sẽ làm thế nào (cụ thể)...",
  },
  {
    key: "tradeoff",
    label: "Tôi sẽ phải bỏ qua/giảm điều gì...",
  },
  {
    key: "reward",
    label: "Tôi sẽ tự thưởng gì khi giữ được...",
  },
] as const;

const selectTriggerClass =
  "h-auto rounded-lg border border-app-line bg-app-surface px-3.5 py-2.5 text-sm font-normal text-app-ink shadow-none focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2";
const selectContentClass = "surface-elevated rounded-xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]";
const selectItemClass = "cursor-pointer text-sm text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink";
const optionButtonClass =
  "flex flex-col items-start gap-1 rounded-lg border border-app-line bg-app-surface p-3 text-left text-sm font-medium text-app-ink-soft transition-colors duration-150 hover:border-app-ink-muted hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 active:scale-[0.98]";
const optionButtonActiveClass = "border-app-accent bg-app-accent-soft text-app-accent shadow-sm";

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

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

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
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-[#1C1A15]/40 p-4 shadow-xs backdrop-blur-sm" aria-labelledby="lead-step-hero">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p id="lead-step-hero" className="text-sm leading-relaxed text-app-ink-soft">
              <span className="font-semibold text-app-ink">Việc lặp lại (Lead Indicators)</span> là việc bạn có thể chủ động kiểm soát và thực hiện đều đặn mỗi tuần để gián tiếp đạt được mục tiêu lớn.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-app-ink-muted/90">
              💡 Hãy chọn những việc vừa sức và đo bằng <span className="font-semibold text-violet-500">số lần thực hiện</span> chứ không đo bằng kết quả ngẫu nhiên.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddIndicator}
            disabled={!canAddIndicator}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-2.5 text-sm font-semibold text-violet-600 dark:text-violet-400 transition-all duration-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 active:scale-[0.97] disabled:cursor-not-allowed disabled:text-app-ink-muted focus-visible:outline-none sm:w-auto shrink-0 shadow-xs"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm việc lặp lại
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-app-line bg-app-surface/50 p-4.5 shadow-xs" aria-labelledby="lead-examples-title">
        <p id="lead-examples-title" className="text-xs font-bold uppercase tracking-wider text-app-ink-muted">
          Ví dụ giúp bạn dễ hình dung
        </p>
        <div className="mt-3.5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-rose-100 dark:border-rose-950/30 bg-rose-50/20 dark:bg-rose-950/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">❌ Chỉ số kết quả (Đừng nhập ở đây)</p>
            <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-app-ink-soft/90">
              <li className="flex items-center gap-1.5"><span>•</span> Có 100 khách hàng đầu tiên</li>
              <li className="flex items-center gap-1.5"><span>•</span> Hoàn thành khóa học 9.0 IELTS</li>
              <li className="flex items-center gap-1.5"><span>•</span> Giảm được 5kg mỡ thừa</li>
            </ul>
          </div>
          <div className="rounded-xl border border-mint-100 dark:border-mint-950/30 bg-mint-50/20 dark:bg-mint-950/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mint-600 dark:text-mint-400">✨ Việc lặp lại (Nên nhập ở đây)</p>
            <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-app-ink-soft/90">
              <li className="flex items-center gap-1.5"><span>•</span> Gọi điện chào hàng 5 khách / tuần</li>
              <li className="flex items-center gap-1.5"><span>•</span> Học từ vựng IELTS 5 buổi / tuần</li>
              <li className="flex items-center gap-1.5"><span>•</span> Tập kháng lực gym 3 buổi / tuần</li>
            </ul>
          </div>
        </div>
      </section>

      <details className="group rounded-2xl border border-app-line bg-app-surface p-4 transition-all duration-300 [&::-webkit-details-marker]:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md text-xs font-semibold text-app-ink focus-visible:outline-none p-1">
          <span>Sự khác nhau bản chất giữa Việc lặp lại và Chỉ số kết quả?</span>
          <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="mt-3.5 border-t border-app-line/60 pt-3.5 grid gap-4 sm:grid-cols-2 animate-fade-in">
          <div className="rounded-xl border border-app-line/60 bg-app-bg p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Việc lặp lại (Lead)</p>
            <p className="mt-2 text-xs leading-relaxed text-app-ink-soft/95">
              Những việc nằm trong tầm kiểm soát 100% của bạn, có thể lập lịch vào Todolist hằng tuần: viết 800 từ, tập 45 phút, gửi 5 email kết nối.
            </p>
          </div>
          <div className="rounded-xl border border-app-line/60 bg-app-bg p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">Chỉ số kết quả (Lag)</p>
            <p className="mt-2 text-xs leading-relaxed text-app-ink-soft/95">
              Con số hoặc trạng thái bạn nhận lại vào cuối chu kỳ (không thể kiểm soát trực tiếp): lượng follower tăng, số cân nặng giảm, đạt được IELTS 7.0.
            </p>
          </div>
        </div>
      </details>

      <GoalArchetypeExamples archetype={intentArchetype} variant="lead_indicator" />

      <div className="space-y-4">
        {draft.leadIndicators.map((indicator, index) => {
          // Assign dynamic emotional pastel themes to different tasks to make it feel alive
          const indicatorThemes = [
            { bg: "bg-mood-lavender-soft/40 dark:bg-mood-lavender-soft/5", border: "border-mood-lavender/20 dark:border-mood-lavender/10", accentText: "text-mood-lavender", accentBg: "bg-mood-lavender", borderFocus: "focus-visible:border-mood-lavender", softBg: "bg-mood-lavender-soft/60 dark:bg-mood-lavender-soft/15" },
            { bg: "bg-mood-mint-soft/40 dark:bg-mood-mint-soft/5", border: "border-mood-mint/20 dark:border-mood-mint/10", accentText: "text-mood-mint", accentBg: "bg-mood-mint", borderFocus: "focus-visible:border-mood-mint", softBg: "bg-mood-mint-soft/60 dark:bg-mood-mint-soft/15" },
            { bg: "bg-mood-sky-soft/40 dark:bg-mood-sky-soft/5", border: "border-mood-sky/20 dark:border-mood-sky/10", accentText: "text-mood-sky", accentBg: "bg-mood-sky", borderFocus: "focus-visible:border-mood-sky", softBg: "bg-mood-sky-soft/60 dark:bg-mood-sky-soft/15" },
            { bg: "bg-mood-rose-soft/40 dark:bg-mood-rose-soft/5", border: "border-mood-rose/20 dark:border-mood-rose/10", accentText: "text-mood-rose", accentBg: "bg-mood-rose", borderFocus: "focus-visible:border-mood-rose", softBg: "bg-mood-rose-soft/60 dark:bg-mood-rose-soft/15" }
          ];
          const theme = indicatorThemes[index % indicatorThemes.length];

          return (
            <article
              key={indicator.id}
              className={cn("overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md animate-fade-in", theme.bg, theme.border)}
              aria-labelledby={`tactic-card-title-${index}`}
            >
              <div className="flex items-start gap-2.5 sm:gap-3.5">
                <GripVertical className="mt-1 hidden h-4.5 w-4.5 shrink-0 text-app-ink-muted sm:block opacity-60" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p id={`tactic-card-title-${index}`} className="text-sm font-bold text-app-ink tracking-tight">
                        Hành động {index + 1}
                      </p>
                      <p className="mt-1 text-xs text-app-ink-soft">
                        {indicator.name || "Chưa đặt tên việc"} · <span className="font-semibold">{indicator.target || "0"}</span> {indicator.unit || "lần"} / tuần
                      </p>
                    </div>
                    {draft.leadIndicators.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => onRemoveIndicator(index)}
                        aria-label={`Xóa việc ${index + 1}${indicator.name ? `: ${indicator.name}` : ""}`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-app-ink-muted transition-all duration-200 hover:text-[color:var(--color-danger-fg)] hover:bg-[color:var(--color-danger-bg)]/30 active:scale-[0.96] focus-visible:outline-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Xoá việc
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label htmlFor={`tactic-name-${index}`} className={labelClass}>
                        Tên việc cụ thể
                      </label>
                      <Input
                        id={`tactic-name-${index}`}
                        value={indicator.name}
                        aria-describedby={showNameError(indicator, `name-${indicator.id}`) ? `tactic-name-${index}-error` : `tactic-name-${index}-helper`}
                        onChange={(event) => onIndicatorChange(index, "name", event.target.value)}
                        placeholder="Ví dụ: gọi 3 cuộc chào hàng, viết 1 bài blog, chạy bộ 30 phút..."
                        className={cn(inputClass, "rounded-xl focus:ring-violet-400 focus:border-violet-400")}
                      />
                      {showNameError(indicator, `name-${indicator.id}`) ? (
                        <p id={`tactic-name-${index}-error`} role="alert" className={errorTextClass}>
                          Hãy đặt một cái tên dễ hình dung cho việc lặp lại này.
                        </p>
                      ) : (
                        <p id={`tactic-name-${index}-helper`} className={helperTextClass}>
                          Đặt tên bằng một hành động cụ thể bạn có thể tự mình thực hiện trong tuần.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`tactic-target-${index}`} className={labelClass}>
                          Tần suất (lần/buổi/phút)
                        </label>
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
                            inputClass,
                            "rounded-xl",
                            indicatorTargetErrors[index] &&
                              shouldShowFieldError(`target-${indicator.id}`)
                              ? "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]"
                              : "focus:ring-violet-400 focus:border-violet-400",
                          )}
                          onChange={(event) => onIndicatorChange(index, "target", event.target.value)}
                          placeholder="Ví dụ: 3"
                        />
                        {indicatorTargetErrors[index] && shouldShowFieldError(`target-${indicator.id}`) ? (
                          <p id={`tactic-target-${index}-error`} role="alert" className={errorTextClass}>
                            {indicatorTargetErrors[index]}
                          </p>
                        ) : (
                          <p id={`tactic-target-${index}-helper`} className={helperTextClass}>
                            Tần suất lặp lại mục tiêu mong muốn trong tuần.
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={`tactic-unit-${index}`} className={labelClass}>
                          Đơn vị tính
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
                            "rounded-xl",
                            indicatorUnitErrors[index] &&
                              shouldShowFieldError(`unit-${indicator.id}`)
                              ? "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]"
                              : "focus:ring-violet-400 focus:border-violet-400",
                          )}
                          onChange={(event) => onIndicatorChange(index, "unit", event.target.value)}
                          placeholder="buổi, bài, lần..."
                        />
                        {indicatorUnitErrors[index] && shouldShowFieldError(`unit-${indicator.id}`) ? (
                          <p id={`tactic-unit-${index}-error`} role="alert" className={errorTextClass}>
                            {indicatorUnitErrors[index]}
                          </p>
                        ) : (
                          <p id={`tactic-unit-${index}-helper`} className={helperTextClass}>
                            Đơn vị đi liền với hành động để dễ cộng dồn.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-app-line bg-white/50 dark:bg-black/10 p-3.5">
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-1.5 text-left text-sm font-semibold text-app-ink focus-visible:outline-none active:scale-[0.99]"
                      aria-expanded={Boolean(expandedCommitments[indicator.id])}
                      aria-controls={`tactic-commitment-${index}`}
                      onClick={() => toggleCommitmentEditor(indicator.id)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-base">⚙️</span>
                        Cài đặt nâng cao & Cam kết
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200",
                          expandedCommitments[indicator.id] && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    <p className={cn(helperTextClass, "px-1.5")}>
                      Mở phần này nếu bạn muốn phân loại cốt lõi, chọn nhịp phân bổ tự động hoặc ghi chú cách vượt qua trở ngại.
                    </p>
                    {expandedCommitments[indicator.id] ? (
                      <div id={`tactic-commitment-${index}`} className="mt-4 grid gap-4 animate-fade-in px-1.5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className={labelClass}>Phân loại việc</p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {(
                                [
                                  { value: "core", label: "Cốt lõi", hint: "Bắt buộc, ảnh hưởng trực tiếp." },
                                  { value: "optional", label: "Tùy chọn", hint: "Làm thêm nếu còn sức." },
                                ] as const
                              ).map((option) => {
                                const active = indicator.type === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onIndicatorChange(index, "type", option.value as TacticType)}
                                    className={cn(
                                      optionButtonClass,
                                      "min-h-11 px-4 py-2.5 rounded-xl border border-app-line transition-all duration-300", 
                                      active 
                                        ? "border-violet-400 bg-violet-50/50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 font-semibold shadow-xs" 
                                        : "hover:border-violet-300 hover:bg-violet-50/10"
                                    )}
                                  >
                                    <span className="text-xs">{option.label}</span>
                                    <span className="text-[10px] font-normal opacity-85">{option.hint}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label htmlFor={`tactic-cadence-${index}`} className={labelClass}>
                              Nhịp tuần tự động phân bổ
                            </label>
                            <Select
                              value={indicator.cadence}
                              onValueChange={(value) =>
                                onIndicatorChange(index, "cadence", value as LeadIndicatorDraft["cadence"])
                              }
                            >
                              <SelectTrigger
                                id={`tactic-cadence-${index}`}
                                aria-label={`Chọn nhịp cho việc ${index + 1}`}
                                className={cn(selectTriggerClass, "rounded-xl")}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={selectContentClass}>
                                <SelectItem value="spread" className={selectItemClass}>
                                  Trải đều cả tuần
                                </SelectItem>
                                <SelectItem value="frontload" className={selectItemClass}>
                                  Dồn lực đầu tuần
                                </SelectItem>
                                <SelectItem value="backload" className={selectItemClass}>
                                  Dồn lực cuối tuần
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {COMMITMENT_FIELDS.map((field) => (
                          <div key={field.key}>
                            <label htmlFor={`tactic-commitment-${field.key}-${index}`} className={labelClass}>
                              {field.label}
                            </label>
                            <Textarea
                              id={`tactic-commitment-${field.key}-${index}`}
                              rows={3}
                              value={indicator.commitment?.[field.key] ?? ""}
                              onChange={(event) =>
                                onIndicatorChange(
                                  index,
                                  "commitment",
                                  normalizeCommitmentChange(indicator.commitment, field.key, event.target.value),
                                )
                              }
                              className={cn(textareaClass, "rounded-xl focus:ring-violet-400 focus:border-violet-400")}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {indicatorWarnings[index]?.length > 0 ? (
                    <ul
                      className="mt-3.5 space-y-1.5 rounded-xl border border-rose-100 bg-rose-50/30 dark:border-rose-950/20 dark:bg-rose-950/10 px-4 py-3 text-xs leading-normal text-rose-600 dark:text-rose-400 shadow-xs"
                      aria-label={`Cảnh báo cho việc ${index + 1}`}
                    >
                      {indicatorWarnings[index].map((warning) => (
                        <li key={warning} className="flex items-start gap-1">
                          <span className="mt-0.5">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm" aria-labelledby="week-one-preview-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line pb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <p
              id="week-one-preview-title"
              className="text-xs font-bold uppercase tracking-wider text-app-ink-muted"
            >
              Xem trước kế hoạch tuần 1
            </p>
          </div>
          <span className="inline-flex min-h-8 items-center rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
            {coreCount} cốt lõi · {optionalCount} tùy chọn
          </span>
        </div>

        {setupGuideSupport && setupGuideTemplate ? (
          <div className="mt-4 rounded-xl border border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-violet-50/10 to-indigo-50/5 dark:from-violet-950/5 p-4.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">
              {selectedTemplate ? "Tuần 1 theo khung bạn đang chọn" : "Nếu đi theo khung gợi ý này"}
            </p>
            <p className="mt-2 text-sm font-bold text-app-ink tracking-tight">{setupGuideSupport.week1Headline}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft/90">{setupGuideSupport.week1Support}</p>
            <div className="mt-3.5 rounded-lg border border-app-line bg-app-surface px-3 py-2 text-xs leading-normal italic text-app-ink-soft/90">
              📌 {setupGuideSupport.week1CadenceHint}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-xs font-medium text-app-ink-soft">
          Hệ thống sẽ tự động xếp việc vào các ngày dưới đây (bạn có thể thay đổi sau):
        </p>
        <div className="mt-3.5 space-y-3.5">
          {weekOneTaskGroups.length === 0 ? (
            <p className="text-xs italic text-app-ink-muted">Chưa có hành động nào được tạo. Hãy điền tên việc ở phía trên để thấy lịch phân bổ.</p>
          ) : (
            weekOneTaskGroups.map((group) => {
              // Map index to a specific pastel colored accent for groups
              const isOptional = group.type === "optional";
              return (
                <div key={group.id} className="rounded-xl border border-app-line bg-white/40 dark:bg-[#1C1A15]/40 px-4 py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-app-ink tracking-tight">{group.name}</p>
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-xs",
                        isOptional 
                          ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400" 
                          : "border-mint-200 bg-mint-50 text-mint-600 dark:border-mint-900 dark:bg-mint-950/20 dark:text-mint-400"
                      )}>
                        {isOptional ? "Tùy chọn" : "Cốt lõi"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-app-ink-muted">
                      Tần suất: <span className="font-semibold text-app-ink">{group.taskTitles.length} việc / tuần</span>
                    </p>
                    {group.taskTitles.length > 0 ? (
                      <ul className="mt-2.5 space-y-1 text-xs text-app-ink-soft/90 border-t border-app-line/40 pt-2 bg-white/30 dark:bg-black/10 p-2 rounded-lg">
                        {group.taskTitles.map((title) => (
                          <li key={title} className="flex items-center gap-1.5">
                            <span className="text-violet-400">→</span>
                            <span>{title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {/* Visual Days Indicator */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">Lịch phân bổ ngày</p>
                    <div className="flex gap-1">
                      {WEEKDAY_LABELS.map((dayLabel, index) => {
                        // index maps to 1..7 (T2 is 1, T3 is 2... CN is 0)
                        const rawDayNum = index === 6 ? 0 : index + 1;
                        const isScheduled = group.scheduleDays.includes(rawDayNum);
                        return (
                          <span
                            key={dayLabel}
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 border",
                              isScheduled
                                ? isOptional
                                  ? "border-none bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-xs"
                                  : "border-none bg-gradient-to-r from-mint-500 to-teal-500 text-white shadow-xs"
                                : "border-app-line/60 bg-white/50 dark:bg-[#26231D]/50 text-app-ink-muted/60"
                            )}
                          >
                            {dayLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {weekOneTaskWarning ? (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90 shadow-xs"
          >
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
            <span>
              <span className="font-bold">Lời khuyên chịu tải:</span> {weekOneTaskWarning}
            </span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
