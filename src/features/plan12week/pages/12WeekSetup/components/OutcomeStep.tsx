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

interface OutcomeStepProps {
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
  "h-auto rounded-lg border border-app-line bg-app-surface px-3.5 py-2.5 text-sm font-normal text-app-ink shadow-none focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/30";
const selectContentClass = "surface-elevated rounded-xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]";
const selectItemClass = "cursor-pointer text-sm text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink";
const infoBoxClass = "rounded-lg border border-app-line bg-app-bg p-3 text-xs leading-5 text-app-ink-soft";
const chipClass =
  "rounded-full border border-app-line px-3 py-1 text-xs text-app-ink-soft transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft hover:text-app-accent";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

export function OutcomeStep({
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
}: OutcomeStepProps) {
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
    <div className="mx-auto max-w-4xl space-y-5">
      {smartGoal.measurable ? (
        <div role="note" className={cn(infoBoxClass, "flex items-start gap-2")}>
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <p>
            <span className="font-medium text-app-ink">Đã suy ra từ SMART Goal của bạn:</span> {smartGoal.measurable}
          </p>
        </div>
      ) : null}

      {planRationaleReasons.length > 0 ? (
        <details className="group rounded-xl border border-app-line bg-app-bg p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus:outline-none">
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
        <div className="grid gap-3 md:grid-cols-3">
          <div className={infoBoxClass}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Cần chú ý</p>
            <p className="mt-1 text-sm font-medium text-app-ink">{feasibility.bottleneck?.label ?? "Chưa có"}</p>
            {feasibility.bottleneck?.action ? <p className="mt-2">{feasibility.bottleneck.action}</p> : null}
          </div>
          <div className={infoBoxClass}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Tuần 1</p>
            <p className="mt-1">{feasibility.firstWeekGuidance ?? "Giữ tuần đầu vừa sức để tạo nhịp."}</p>
          </div>
          <div className={infoBoxClass}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Mức tải</p>
            <p className="mt-1 text-sm font-medium text-app-ink">{getPlanLoadLabel(feasibility.planLoad)}</p>
            <p className="mt-2">
              {feasibility.scopeRecommendation ?? "Giữ 2-3 việc lặp lại và một buổi nhìn lại cố định."}
            </p>
          </div>
        </div>
      )}

      <section
        className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 sm:p-6"
        aria-labelledby="outcome-required-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p id="outcome-required-title" className="text-sm font-medium text-app-ink">
              Chốt phần bắt buộc trước
            </p>
            <p className="mt-1 text-sm leading-6 text-app-ink-soft">
              Ba mục này đủ để đi tiếp. Khung gợi ý phía dưới chỉ giúp thiết lập nhanh hơn.
            </p>
          </div>
          <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs font-medium text-app-ink-muted">
            Bắt buộc
          </span>
        </div>

        <div className="mt-5 space-y-4">
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

          <div>
            <label htmlFor="week-12-outcome" className={labelClass}>
              Outcome statement
            </label>
            <Textarea
              id="week-12-outcome"
              rows={4}
              value={draft.week12Outcome}
              aria-invalid={Boolean(milestoneError)}
              aria-describedby={milestoneError ? "week-12-outcome-error" : "week-12-outcome-helper"}
              className={cn(
                textareaClass,
                "min-h-[150px]",
                milestoneError &&
                  "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
              )}
              onChange={(event) => onChange("week12Outcome", event.target.value)}
              placeholder="Ví dụ: Hoàn thành bản portfolio có 3 case study đủ gửi đi ứng tuyển."
            />
            {milestoneError ? (
              <p id="week-12-outcome-error" role="alert" className={errorTextClass}>
                {milestoneError}
              </p>
            ) : (
              <p id="week-12-outcome-helper" className={helperTextClass}>
                Viết kết quả bạn muốn nhìn thấy ở cuối tuần 12, không phải danh sách việc cần làm.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="vision-12-week" className={labelClass}>
              Why this matters
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
            <div>
              <label htmlFor="lag-metric-target" className={labelClass}>
                Metric
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
                Unit
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
            <label htmlFor="lag-metric-name" className={labelClass}>
              Tên chỉ số kết quả
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
                Đang theo dõi: <span>{lagMetricPreview}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {selectedTemplate ? (
        <section
          className="surface-raised rounded-xl border border-app-line bg-app-surface p-5"
          aria-labelledby="template-personalize-title"
        >
          <div>
            <p
              id="template-personalize-title"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent"
            >
              Cá nhân hóa khung
            </p>
            <p className="mt-1 text-sm leading-6 text-app-ink-soft">
              Trả lời nhanh 3 câu để khung tự điều chỉnh số việc và nhịp phù hợp.
            </p>
          </div>

          <div className="mt-4 space-y-4">
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
                        "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
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
        </section>
      ) : null}

      <section
        className="surface-raised rounded-xl border border-app-line bg-app-surface p-5"
        aria-labelledby="template-picker-title"
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <div>
            <p id="template-picker-title" className="text-sm font-medium text-app-ink">
              Bắt đầu nhanh bằng khung gợi ý
            </p>
            <p className="mt-1 text-sm leading-6 text-app-ink-soft">
              Dùng khung nếu muốn có nhịp ban đầu. Bạn vẫn sửa được mọi trường.
            </p>
          </div>
        </div>

        {recommendedTemplate && adaptiveTemplateRecommendation ? (
          <div className="mt-4 rounded-lg border border-app-line bg-app-bg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
                  Gợi ý cho mục tiêu này
                </p>
                <p className="mt-2 text-lg font-medium text-app-ink">{recommendedTemplate.name}</p>
                <p className="mt-2 text-sm leading-6 text-app-ink-soft">{adaptiveTemplateRecommendation.reason}</p>
              </div>
              <span className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs text-app-ink-muted">
                {recommendedTemplate.requiredPlan ? getPlanLabel(recommendedTemplate.requiredPlan) : "Miễn phí"}
              </span>
            </div>
            <button
              type="button"
              className={cn(
                "mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                selectedTemplate?.id === recommendedTemplate.id
                  ? "border border-app-accent bg-app-accent-soft text-app-accent"
                  : "bg-app-accent text-white hover:bg-[#284f45]",
              )}
              onClick={() => onTemplateSelect(recommendedTemplate)}
            >
              {selectedTemplate?.id === recommendedTemplate.id ? "Đang dùng khung gợi ý" : "Dùng khung gợi ý này"}
            </button>
            {recommendedTemplateSupport ? (
              <details className="mt-4 rounded-lg border border-app-line bg-app-surface px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-app-ink">
                  Xem gợi ý tuần 1 và nhịp giữ
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className={infoBoxClass}>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                      Tuần 1 nên thắng ở đâu
                    </p>
                    <p className="mt-2 text-sm font-medium text-app-ink">
                      {recommendedTemplateSupport.week1Headline}
                    </p>
                    <p className="mt-2">{recommendedTemplateSupport.week1Support}</p>
                  </div>
                  <div className={infoBoxClass}>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                      Nhịp nên giữ
                    </p>
                    <p className="mt-2">{recommendedTemplateSupport.week1CadenceHint}</p>
                  </div>
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        <details className="group mt-4 rounded-xl border border-dashed border-app-line bg-app-bg p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus:outline-none">
            <span>Xem tất cả khung mẫu</span>
            <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-3.5 md:grid-cols-2">
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
                    "rounded-xl border p-4.5 text-left transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                    isSelected && "border-app-accent bg-gradient-to-br from-app-accent-soft/30 to-app-accent-soft/10 text-app-accent shadow-sm font-semibold",
                    !isSelected &&
                      isLocked &&
                      "border-app-line bg-app-bg text-app-ink-soft hover:border-app-accent/30 hover:bg-app-accent-soft/5",
                    !isSelected && !isLocked && "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30 hover:bg-app-bg",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{template.name}</p>
                        <span className="rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-[11px] font-semibold text-app-ink-muted">
                          {template.requiredPlan ? `Khung ${getPlanLabel(template.requiredPlan)}` : "Khung miễn phí"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft">{template.subtitle}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-[11px] font-semibold text-app-ink-muted">
                      {isLocked ? <Lock className="h-3 w-3" aria-hidden="true" /> : null}
                      {isSelected ? "Đang dùng" : isLocked ? "Đang khóa" : "Sẵn sàng"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-app-ink-soft">{template.description}</p>
                  <div className="mt-3.5 grid gap-2.5 text-xs leading-relaxed text-app-ink-soft sm:grid-cols-2">
                    <div className="rounded-xl border border-app-line bg-app-surface px-3 py-2.5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
                        Hợp khi
                      </p>
                      <p className="mt-1 font-medium">{template.bestFor}</p>
                    </div>
                    <div className="rounded-xl border border-app-line bg-app-surface px-3 py-2.5 shadow-sm">
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
      </section>

      {selectedTemplate ? (
        <section
          className="surface-raised rounded-xl border border-app-line bg-app-surface p-4"
          aria-labelledby="selected-template-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                id="selected-template-title"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted"
              >
                Khung đang dùng
              </p>
              <p className="mt-2 text-base font-medium text-app-ink">{selectedTemplate.name}</p>
              <p className="mt-1 text-sm leading-5 text-app-ink-soft">{selectedTemplate.subtitle}</p>
            </div>
            <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs text-app-ink-muted">
              {selectedTemplate.requiredPlan ? getPlanLabel(selectedTemplate.requiredPlan) : "Miễn phí"}
            </span>
          </div>
        </section>
      ) : null}

      <details className="group rounded-xl border border-dashed border-app-line bg-app-bg p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus:outline-none">
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
    </div>
  );
}
