import { useMemo, useState } from "react";
import { AlertTriangle, GripVertical, Plus, Trash2 } from "lucide-react";

import { GoalArchetypeExamples } from "@/app/components/GoalArchetypeExamples";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import type { TacticType } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import {
  getArchetypeForIntent,
  getUserIntentId,
  hasActionableArchetypeHint,
} from "@/app/utils/user-intent";
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
  onIndicatorChange: <K extends keyof LeadIndicatorDraft>(
    index: number,
    key: K,
    value: LeadIndicatorDraft[K],
  ) => void;
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

const LEAD_EXAMPLES = [
  { name: "Viết bản nháp 800 từ", target: "2", unit: "lần/tuần" },
  { name: "Tập gym 45 phút", target: "3", unit: "buổi/tuần" },
  { name: "Gửi 5 email chủ động", target: "2", unit: "lần/tuần" },
  { name: "Học flashcard tiếng Anh", target: "4", unit: "buổi/tuần" },
] as const;

const selectTriggerClass =
  "h-auto rounded-lg border border-app-line bg-app-surface px-3.5 py-2.5 text-[15px] font-normal text-app-ink shadow-none focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/30";
const selectContentClass = "rounded-card border border-app-line bg-app-surface shadow-md";
const selectItemClass = "cursor-pointer text-[15px] text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink";
const optionButtonClass =
  "flex flex-col items-start gap-1 rounded-lg border border-app-line bg-app-surface p-3 text-left text-[14px] font-medium text-app-ink-soft transition-colors duration-150 hover:border-app-ink-muted hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30";
const optionButtonActiveClass = "border-app-accent bg-app-accent-soft text-app-accent";

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

export function LeadIndicatorsStep({
  draft,
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
    validateLeadIndicatorDraft(indicator, validationOptions).warnings.filter(
      (warning) => !indicatorUnitErrors[index] || !warning.toLocaleLowerCase("vi-VN").includes("đơn vị"),
    ),
  );
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

  const addExampleIndicator = (example: (typeof LEAD_EXAMPLES)[number]) => {
    if (!canAddIndicator) return;

    const nextIndex = draft.leadIndicators.length;
    onAddIndicator();

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        onIndicatorChange(nextIndex, "name", example.name);
        onIndicatorChange(nextIndex, "target", example.target);
        onIndicatorChange(nextIndex, "unit", example.unit);
      }, 0);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-lg border border-app-line bg-app-bg p-3" aria-labelledby="lead-step-hero">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p id="lead-step-hero" className="text-[14px] leading-6 text-app-ink-soft">
              Chọn 1-3 việc lặp lại tạo ra kết quả. Nếu cần, thêm việc thứ 4 như phần tùy chọn.
            </p>
            <p className="mt-1 text-[13px] leading-5 text-app-ink-muted">
              Việc lặp lại là hành động bạn kiểm soát được, không phải kết quả cuối.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddIndicator}
            disabled={!canAddIndicator}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-app-line bg-app-bg p-3 text-[15px] font-medium text-app-accent transition-colors duration-150 hover:bg-app-accent-soft disabled:cursor-not-allowed disabled:text-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm việc lặp lại
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-app-line bg-app-bg p-3" aria-labelledby="lead-examples-title">
        <p id="lead-examples-title" className="text-[14px] font-medium text-app-ink">
          Ví dụ nhanh
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LEAD_EXAMPLES.map((example) => (
            <button
              key={example.name}
              type="button"
              onClick={() => addExampleIndicator(example)}
              disabled={!canAddIndicator}
              className="rounded-full border border-app-line px-3 py-1 text-[13px] text-app-ink-soft transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft hover:text-app-accent disabled:cursor-not-allowed disabled:text-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              {example.name}
            </button>
          ))}
        </div>
        {!canAddIndicator ? <p className={helperTextClass}>Bạn đã có tối đa 4 việc lặp lại.</p> : null}
      </section>

      <details className="rounded-lg border border-app-line bg-app-surface p-4">
        <summary className="cursor-pointer list-none text-[14px] font-medium text-app-ink">
          Việc lặp lại là gì? Khác kết quả cuối thế nào?
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-app-line bg-app-bg p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-accent">Ví dụ tốt</p>
            <ul className="mt-2 space-y-1 text-[14px] leading-6 text-app-ink-soft">
              <li>• Viết bản nháp 800 từ</li>
              <li>• Tập gym 45 phút</li>
              <li>• Gửi 5 email chủ động liên hệ</li>
              <li>• Học flashcard tiếng Anh 30 phút</li>
            </ul>
          </div>
          <div className="rounded-lg border border-app-line bg-app-bg p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Chưa hợp</p>
            <ul className="mt-2 space-y-1 text-[14px] leading-6 text-app-ink-soft">
              <li>• Tăng 100 followers</li>
              <li>• Giảm 5kg</li>
              <li>• Có job mới</li>
              <li>• Đạt IELTS 7.0</li>
            </ul>
            <p className="mt-2 text-[13px] leading-5 text-app-ink-muted">
              Đây là kết quả cuối — đo ở chỉ số chính, không phải việc tuần.
            </p>
          </div>
        </div>
      </details>

      <GoalArchetypeExamples archetype={intentArchetype} variant="lead_indicator" />

      <div className="space-y-3">
        {draft.leadIndicators.map((indicator, index) => (
          <article
            key={indicator.id}
            className="rounded-lg border border-app-line bg-app-surface p-3"
            aria-labelledby={`tactic-card-title-${index}`}
          >
            <div className="flex items-start gap-3">
              <GripVertical className="mt-1 h-4 w-4 shrink-0 text-app-ink-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p id={`tactic-card-title-${index}`} className="text-[15px] font-medium text-app-ink">
                      Việc {index + 1}
                    </p>
                    <p className="mt-0.5 text-[13px] text-app-ink-muted">
                      {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                    </p>
                  </div>
                  {draft.leadIndicators.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => onRemoveIndicator(index)}
                      aria-label={`Xóa việc ${index + 1}${indicator.name ? `: ${indicator.name}` : ""}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium text-app-ink-muted transition-colors duration-150 hover:text-[color:var(--color-danger-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Xoá
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3">
                  <div>
                    <label htmlFor={`tactic-name-${index}`} className={labelClass}>
                      Tên việc
                    </label>
                    <Input
                      id={`tactic-name-${index}`}
                      value={indicator.name}
                      onChange={(event) => onIndicatorChange(index, "name", event.target.value)}
                      placeholder="Ví dụ: viết 3 bài, tập 2 buổi, gửi 5 lời nhắn chủ động..."
                      className={inputClass}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className={labelClass}>Loại</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { value: "core", label: "Cốt lõi", hint: "Tính vào điểm tuần" },
                          { value: "optional", label: "Tùy chọn", hint: "Làm thêm khi còn sức" },
                        ] as const).map((option) => {
                          const active = indicator.type === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={active}
                              onClick={() => onIndicatorChange(index, "type", option.value as TacticType)}
                              className={cn(optionButtonClass, active && optionButtonActiveClass)}
                            >
                              <span>{option.label}</span>
                              <span className="text-[12px] font-normal opacity-80">{option.hint}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`tactic-cadence-${index}`} className={labelClass}>
                        Nhịp
                      </label>
                      <Select
                        value={indicator.cadence}
                        onValueChange={(value) =>
                          onIndicatorChange(index, "cadence", value as LeadIndicatorDraft["cadence"])
                        }
                      >
                        <SelectTrigger id={`tactic-cadence-${index}`} aria-label={`Chọn nhịp cho việc ${index + 1}`} className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          <SelectItem value="spread" className={selectItemClass}>Trải đều</SelectItem>
                          <SelectItem value="frontload" className={selectItemClass}>Đầu tuần</SelectItem>
                          <SelectItem value="backload" className={selectItemClass}>Cuối tuần</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label htmlFor={`tactic-target-${index}`} className={labelClass}>
                        Tần suất / tuần
                      </label>
                      <Input
                        id={`tactic-target-${index}`}
                        value={indicator.target}
                        aria-invalid={Boolean(indicatorTargetErrors[index])}
                        aria-describedby={indicatorTargetErrors[index] ? `tactic-target-${index}-error` : undefined}
                        className={cn(
                          inputClass,
                          indicatorTargetErrors[index] &&
                            "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
                        )}
                        onChange={(event) => onIndicatorChange(index, "target", event.target.value)}
                        placeholder="Ví dụ: 2"
                      />
                      {indicatorTargetErrors[index] ? (
                        <p id={`tactic-target-${index}-error`} role="alert" className={errorTextClass}>
                          {indicatorTargetErrors[index]}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor={`tactic-unit-${index}`} className={labelClass}>
                        Đơn vị
                      </label>
                      <Input
                        id={`tactic-unit-${index}`}
                        value={indicator.unit}
                        aria-invalid={Boolean(indicatorUnitErrors[index])}
                        aria-describedby={indicatorUnitErrors[index] ? `tactic-unit-${index}-error` : undefined}
                        className={cn(
                          inputClass,
                          indicatorUnitErrors[index] &&
                            "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
                        )}
                        onChange={(event) => onIndicatorChange(index, "unit", event.target.value)}
                        placeholder="buổi, bài, lần..."
                      />
                      {indicatorUnitErrors[index] ? (
                        <p id={`tactic-unit-${index}-error`} role="alert" className={errorTextClass}>
                          {indicatorUnitErrors[index]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-app-line bg-app-bg p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left text-[14px] font-medium text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                    aria-expanded={Boolean(expandedCommitments[indicator.id])}
                    aria-controls={`tactic-commitment-${index}`}
                    onClick={() => toggleCommitmentEditor(indicator.id)}
                  >
                    <span>Cam kết với chính mình (tuỳ chọn)</span>
                    <span className="text-[13px] font-medium text-app-ink-muted">
                      {expandedCommitments[indicator.id] ? "Thu gọn" : "Mở"}
                    </span>
                  </button>
                  <p className={helperTextClass}>
                    Điền 5 câu này giúp bạn rõ tại sao mình cam kết và bớt bỏ cuộc giữa chu kỳ.
                  </p>
                  {expandedCommitments[indicator.id] ? (
                    <div id={`tactic-commitment-${index}`} className="mt-4 grid gap-3">
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
                            className={textareaClass}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {indicatorWarnings[index]?.length > 0 ? (
                  <ul
                    className="mt-3 space-y-1 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-3 py-2 text-[13px] leading-5 text-[color:var(--color-danger-fg)]"
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
          <p id="week-one-preview-title" className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
            Xem trước tuần 1
          </p>
          <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-[13px] font-medium text-app-accent">
            {coreCount} cốt lõi · {optionalCount} tùy chọn
          </span>
        </div>

        {setupGuideSupport && setupGuideTemplate ? (
          <div className="mt-3 rounded-lg border border-app-line bg-app-surface p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
              {selectedTemplate ? "Tuần 1 theo khung đang dùng" : "Nếu đi theo khung gợi ý này"}
            </p>
            <p className="mt-2 text-[15px] font-medium text-app-ink">{setupGuideSupport.week1Headline}</p>
            <p className="mt-2 text-[14px] leading-6 text-app-ink-soft">{setupGuideSupport.week1Support}</p>
            <p className="mt-3 rounded-lg border border-app-line bg-app-bg px-3 py-2 text-[14px] leading-6 text-app-ink-soft">
              {setupGuideSupport.week1CadenceHint}
            </p>
          </div>
        ) : null}

        <p className="mt-3 text-[13px] leading-5 text-app-ink-muted">
          Từ mỗi việc lặp lại bên trên, việc hôm nay sẽ được tạo vào các ngày sau:
        </p>
        <div className="mt-3 space-y-2">
          {weekOneTaskGroups.length === 0 ? (
            <p className="text-[14px] text-app-ink-soft">Thêm việc để thấy tuần đầu tiên sẽ trông như thế nào.</p>
          ) : (
            weekOneTaskGroups.map((group) => (
              <div key={group.id} className="rounded-lg border border-app-line bg-app-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-medium text-app-ink">{group.name}</p>
                  <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-[13px] font-medium text-app-accent">
                    {group.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-app-ink-muted">
                  {group.taskTitles.length} việc / tuần · Lịch: {formatScheduleDayLabels(group.scheduleDays)}
                </p>
                {group.taskTitles.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[13px] leading-5 text-app-ink-soft">
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
          <p role="status" className="mt-3 flex items-start gap-1.5 text-[13px] leading-5 text-[color:var(--color-danger-fg)]">
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
