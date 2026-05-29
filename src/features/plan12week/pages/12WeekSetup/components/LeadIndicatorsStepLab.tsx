import { useMemo, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Activity,
  Hash,
  Tag,
  Settings,
  Target,
  Hourglass,
  AlertCircle,
  Award,
  Compass,
} from "lucide-react";

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
import { validateLeadIndicatorDraft } from "../helpers";
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

interface CommitmentField {
  key: "want" | "cost" | "means" | "tradeoff" | "reward";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
}

const COMMITMENT_FIELDS: CommitmentField[] = [
  {
    key: "want",
    label: "Tôi thực sự muốn điều này vì...",
    icon: Target,
    placeholder: "Tại sao bạn muốn điều này nhất? Động lực sâu thẳm..."
  },
  {
    key: "cost",
    label: "Tôi sẵn sàng chịu chi phí/nỗ lực nào...",
    icon: Hourglass,
    placeholder: "Mất đi thời gian rảnh, công sức, sự lười biếng..."
  },
  {
    key: "means",
    label: "Tôi sẽ thực hiện cụ thể thế nào...",
    icon: Compass,
    placeholder: "Cách thực hiện chi tiết, các bước nhỏ nhất..."
  },
  {
    key: "tradeoff",
    label: "Tôi sẽ phải bỏ qua/giảm điều gì...",
    icon: AlertCircle,
    placeholder: "Bỏ lướt điện thoại, giảm tụ tập không cần thiết..."
  },
  {
    key: "reward",
    label: "Phần thưởng tự khích lệ khi hoàn thành...",
    icon: Award,
    placeholder: "Một ly cà phê ngon, một buổi xem phim thư giãn..."
  },
];

const optionButtonClass =
  "flex flex-col items-start gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-2.5 text-left text-[11px] font-bold text-slate-600 dark:text-slate-400 transition-all duration-200 active:scale-[0.97]";
const optionButtonActiveClass = "border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/10";

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
  onAddIndicator,
  onRemoveIndicator,
  onIndicatorChange,
}: LeadIndicatorsStepProps) {
  const validationOptions = {
    tacticLoadPreference: draft.tacticLoadPreference,
    dailyTimeBudget: draft.dailyTimeBudget,
  };
  const intentArchetype: GoalArchetype | null = useMemo(() => {
    const intent = getUserIntentId();
    if (!intent || !hasActionableArchetypeHint(intent)) return null;
    return getArchetypeForIntent(intent);
  }, []);

  const [expandedCommitments, setExpandedCommitments] = useState<Record<string, boolean>>({});
  const canAddIndicator = draft.leadIndicators.length < 4;

  const toggleCommitmentEditor = (indicatorId: string) => {
    setExpandedCommitments((previous) => ({
      ...previous,
      [indicatorId]: !previous[indicatorId],
    }));
  };

  const showNameError = (indicator: LeadIndicatorDraft) =>
    showValidationErrors && !indicator.name.trim();

  return (
    <div className="space-y-5">
      
      {/* KHU VỰC 1: TIÊU ĐỀ & NÚT THÊM HÀNH ĐỘNG */}
      <div className="flex items-center justify-between border-b border-app-line pb-3">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-app-accent flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span>Xác định 2-4 hành động lặp lại (Lead Indicators)</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-app-ink-muted">
            Chọn các việc bạn hoàn toàn kiểm soát được và lặp lại đều đặn mỗi tuần
          </p>
        </div>
        <button
          type="button"
          onClick={onAddIndicator}
          disabled={!canAddIndicator}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-app-accent text-white hover:brightness-105 disabled:opacity-50 transition-all px-3 py-1.5 text-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          Thêm việc mới
        </button>
      </div>

      {/* HIỂN THỊ CÁC GỢI Ý MỤC TIÊU THEO KIỂU MỤC TIÊU */}
      <GoalArchetypeExamples archetype={intentArchetype} variant="lead_indicator" />

      {/* DANH SÁCH CÁC CARD HÀNH ĐỘNG */}
      <div className="space-y-4">
        {draft.leadIndicators.map((indicator, index) => {
          const hasExpanded = expandedCommitments[indicator.id];
          return (
            <article
              key={indicator.id}
              className="relative overflow-hidden rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5 shadow-sm space-y-4"
              aria-labelledby={`tactic-card-title-${index}`}
            >
              {/* Header card hành động */}
              <div className="flex items-center justify-between border-b border-app-line/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-[10px] font-extrabold">
                    {index + 1}
                  </span>
                  <h4 id={`tactic-card-title-${index}`} className="text-xs font-bold text-app-ink">
                    Hành động lặp lại hằng tuần
                  </h4>
                </div>
                {draft.leadIndicators.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemoveIndicator(index)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-app-ink-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                )}
              </div>

              {/* Nhập liệu cơ bản (Tên, Tần suất, Đơn vị) */}
              <div className="grid gap-4 sm:grid-cols-12">
                
                {/* Tên hành động */}
                <div className="sm:col-span-6 space-y-1.5">
                  <label htmlFor={`tactic-name-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                    Mô tả hành động lặp lại
                  </label>
                  <Input
                    id={`tactic-name-${index}`}
                    value={indicator.name}
                    onChange={(event) => onIndicatorChange(index, "name", event.target.value)}
                    placeholder="Ví dụ: Lập trình tính năng chính, tập thể dục, gửi email..."
                    className={cn(inputClass, "text-xs")}
                  />
                  {showNameError(indicator) && (
                    <p role="alert" className="text-[10px] font-bold text-red-500">
                      Vui lòng nhập mô tả hành động.
                    </p>
                  )}
                </div>

                {/* Tần suất / Tuần */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label htmlFor={`tactic-target-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                    Tần suất / Tuần
                  </label>
                  <div className="flex items-center bg-slate-100/70 dark:bg-slate-900/60 border border-app-line rounded-full p-1 w-full max-w-[140px] shadow-inner focus-within:ring-2 focus-within:ring-app-accent/20">
                    <button
                      type="button"
                      onClick={() => {
                        soundService.click();
                        const val = parseInt(indicator.target.trim(), 10);
                        const currentVal = Number.isNaN(val) ? 0 : val;
                        const newVal = Math.max(1, currentVal - 1);
                        onIndicatorChange(index, "target", newVal.toString());
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-app-surface border border-app-line text-app-ink-soft hover:text-app-accent transition-all active:scale-90"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <Input
                      id={`tactic-target-${index}`}
                      value={indicator.target}
                      className="w-10 bg-transparent border-0 text-center font-bold text-app-ink text-xs focus:ring-0 focus:outline-none p-0 h-7"
                      onChange={(event) => onIndicatorChange(index, "target", event.target.value)}
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
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-app-surface border border-app-line text-app-ink-soft hover:text-app-accent transition-all active:scale-90"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Đơn vị đo lường */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label htmlFor={`tactic-unit-${index}`} className={cn(labelClass, "text-xs font-bold text-app-ink")}>
                    Đơn vị đo
                  </label>
                  <Input
                    id={`tactic-unit-${index}`}
                    value={indicator.unit}
                    className={cn(inputClass, "text-xs")}
                    onChange={(event) => onIndicatorChange(index, "unit", event.target.value)}
                    placeholder="buổi, bài, khách..."
                  />
                </div>
              </div>

              {/* NÚT THIẾT LẬP CAM KẾT & PHÂN BỔ NÂNG CAO */}
              <div className="border-t border-app-line/60 pt-3">
                <button
                  type="button"
                  onClick={() => toggleCommitmentEditor(indicator.id)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-app-accent hover:underline focus:outline-none"
                  aria-expanded={hasExpanded}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>{hasExpanded ? "🔒 Đóng thiết lập cam kết nâng cao" : "🔒 Cấu hình cam kết & nhịp độ nâng cao (Tùy chọn)"}</span>
                </button>

                {hasExpanded && (
                  <div className="mt-4 border-t border-app-line/40 pt-4 space-y-4 text-xs animate-in fade-in-50 duration-200">
                    
                    {/* Phân loại & Phân bổ */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <span className="font-bold text-app-ink block">Phân loại vai trò</span>
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              { value: "core", label: "Cốt lõi", hint: "Bắt buộc tối thiểu" },
                              { value: "optional", label: "Tùy chọn", hint: "Khi có dư lực" },
                            ] as const
                          ).map((option) => {
                            const active = indicator.type === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  soundService.click();
                                  onIndicatorChange(index, "type", option.value as TacticType);
                                }}
                                className={cn(optionButtonClass, active && optionButtonActiveClass)}
                              >
                                <span>{option.label}</span>
                                <span className="opacity-70 text-[9px] font-normal leading-none mt-0.5">{option.hint}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="font-bold text-app-ink block">Phân bổ nhịp độ</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              { value: "spread", label: "Trải đều", hint: "Cả tuần" },
                              { value: "frontload", label: "Đầu tuần", hint: "Làm sớm" },
                              { value: "backload", label: "Cuối tuần", hint: "Cuối tuần" },
                            ] as const
                          ).map((option) => {
                            const active = indicator.cadence === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  soundService.click();
                                  onIndicatorChange(index, "cadence", option.value);
                                }}
                                className={cn(optionButtonClass, active && optionButtonActiveClass)}
                              >
                                <span>{option.label}</span>
                                <span className="opacity-70 text-[9px] font-normal leading-none mt-0.5">{option.hint}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Câu hỏi Stoic Reflection */}
                    <div className="space-y-3 border-t border-app-line/40 pt-4">
                      <p className="font-bold text-app-ink text-[11px] uppercase tracking-wide">Tâm thế cam kết (Stoic Reflection)</p>
                      
                      <div className="grid gap-3 sm:grid-cols-2">
                        {COMMITMENT_FIELDS.map((field) => {
                          const FieldIcon = field.icon;
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <label htmlFor={`tactic-commitment-${field.key}-${index}`} className="flex items-center gap-1 font-bold text-app-ink-soft">
                                <FieldIcon className="h-3.5 w-3.5 text-app-accent" />
                                <span>{field.label}</span>
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
                                className={cn(textareaClass, "min-h-[50px] text-xs")}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
