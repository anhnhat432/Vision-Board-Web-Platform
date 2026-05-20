import { Lightbulb, Lock, Sparkles } from "lucide-react";

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
  "h-auto rounded-lg border border-app-line bg-app-surface px-3.5 py-2.5 text-[15px] font-normal text-app-ink shadow-none focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/30";
const selectContentClass = "rounded-card border border-app-line bg-app-surface shadow-md";
const selectItemClass = "cursor-pointer text-[15px] text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink";
const infoBoxClass = "rounded-lg border border-app-line bg-app-bg p-3 text-[13px] leading-5 text-app-ink-soft";
const chipClass =
  "rounded-full border border-app-line px-3 py-1 text-[13px] text-app-ink-soft transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft hover:text-app-accent";

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

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 sm:space-y-5 sm:px-0">
      {smartGoal.measurable ? (
        <div role="note" className={cn(infoBoxClass, "flex items-start gap-2")}>
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <p>
            <span className="font-medium text-app-ink">Đã suy ra từ SMART Goal của bạn:</span> {smartGoal.measurable}
          </p>
        </div>
      ) : null}

      <section className="rounded-card border border-app-line bg-app-surface p-4 shadow-sm sm:p-5" aria-labelledby="outcome-required-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p id="outcome-required-title" className="text-[15px] font-medium text-app-ink">
              Chốt phần bắt buộc trước
            </p>
            <p className="mt-1 text-[14px] leading-6 text-app-ink-soft">
              Ba mục này đủ để đi tiếp. Khung gợi ý phía dưới chỉ là phần hỗ trợ nhanh.
            </p>
          </div>
          <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-[13px] font-medium text-app-ink-muted">
            Bắt buộc
          </span>
        </div>

        <div className="mt-4 space-y-4 sm:mt-5">
          <div>
            <label htmlFor="week-12-outcome" className={labelClass}>
              Kết quả cuối 12 tuần
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
                Đang theo dõi: <span>{lagMetricPreview}</span>
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
        <details className="rounded-card border border-app-line bg-app-surface p-4 sm:p-5" aria-labelledby="template-personalize-title">
          <summary
            id="template-personalize-title"
            className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-app-accent"
          >
            Cá nhân hóa khung
          </summary>
          <div>
            <p className="mt-1 text-[14px] leading-6 text-app-ink-soft">
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
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
                {WEEKDAY_LABELS.map((dayLabel, dayIndex) => {
                  const isActive = draft.preferredDays.includes(dayIndex);
                  return (
                    <button
                      key={dayLabel}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onPreferredDayToggle(dayIndex)}
                      className={cn(
                        "rounded-md border border-app-line bg-app-surface px-2 py-2 text-[14px] text-app-ink-soft transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                        isActive && "border-app-accent bg-app-accent-soft font-medium text-app-accent",
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

      <details className="rounded-card border border-app-line bg-app-surface p-4 shadow-sm sm:p-5" aria-labelledby="template-picker-title">
        <summary className="flex cursor-pointer list-none items-start gap-2 py-1">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <span>
            <span id="template-picker-title" className="block text-[15px] font-medium text-app-ink">
              Bắt đầu nhanh bằng khung gợi ý
            </span>
            <span className="mt-1 block text-[14px] leading-6 text-app-ink-soft">
              Dùng khung nếu muốn có nhịp ban đầu. Bạn vẫn sửa được mọi trường.
            </span>
          </span>
        </summary>

        {recommendedTemplate && adaptiveTemplateRecommendation ? (
          <div className="mt-4 rounded-lg border border-app-line bg-app-bg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-accent">
                  Gợi ý cho mục tiêu này
                </p>
                <p className="mt-2 text-[17px] font-medium text-app-ink">{recommendedTemplate.name}</p>
                <p className="mt-2 text-[14px] leading-6 text-app-ink-soft">{adaptiveTemplateRecommendation.reason}</p>
              </div>
              <span className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-[13px] text-app-ink-muted">
                {recommendedTemplate.requiredPlan ? getPlanLabel(recommendedTemplate.requiredPlan) : "Miễn phí"}
              </span>
            </div>
            <button
              type="button"
              className={cn(
                "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto",
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
                <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-2 text-[14px] font-medium text-app-ink">
                  Xem gợi ý tuần 1 và nhịp giữ
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className={infoBoxClass}>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                      Tuần 1 nên thắng ở đâu
                    </p>
                    <p className="mt-2 text-[14px] font-medium text-app-ink">
                      {recommendedTemplateSupport.week1Headline}
                    </p>
                    <p className="mt-2">{recommendedTemplateSupport.week1Support}</p>
                  </div>
                  <div className={infoBoxClass}>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                      Nhịp nên giữ
                    </p>
                    <p className="mt-2">{recommendedTemplateSupport.week1CadenceHint}</p>
                  </div>
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        <details className="mt-4 rounded-lg border border-dashed border-app-line bg-app-bg px-3 py-3 sm:px-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-2 text-[14px] font-medium text-app-ink">
            Xem tất cả khung mẫu
          </summary>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
                    "min-h-11 rounded-lg border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                    isSelected && "border-app-accent bg-app-accent-soft text-app-accent",
                    !isSelected &&
                      isLocked &&
                      "border-app-line bg-app-bg text-app-ink-soft hover:border-app-accent hover:bg-app-accent-soft",
                    !isSelected && !isLocked && "border-app-line bg-app-surface text-app-ink hover:bg-app-bg",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-medium">{template.name}</p>
                        <span className="rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-[12px] text-app-ink-muted">
                          {template.requiredPlan ? `Khung ${getPlanLabel(template.requiredPlan)}` : "Khung miễn phí"}
                        </span>
                      </div>
                      <p className="mt-1 text-[14px] leading-5 text-app-ink-soft">{template.subtitle}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-[12px] text-app-ink-muted">
                      {isLocked ? <Lock className="h-3 w-3" aria-hidden="true" /> : null}
                      {isSelected ? "Đang dùng" : isLocked ? "Đang khóa" : "Sẵn sàng"}
                    </span>
                  </div>
                  <p className="mt-3 text-[14px] leading-6 text-app-ink-soft">{template.description}</p>
                  <div className="mt-3 grid gap-2 text-[13px] leading-5 text-app-ink-soft sm:grid-cols-2">
                    <div className="rounded-lg border border-app-line bg-app-surface px-3 py-2">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                        Hợp khi
                      </p>
                      <p className="mt-1">{template.bestFor}</p>
                    </div>
                    <div className="rounded-lg border border-app-line bg-app-surface px-3 py-2">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Tuần 1</p>
                      <p className="mt-1">{template.firstWeekWin}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                    <div className="mt-4 flex items-center justify-between border-t border-app-line pt-3 text-[13px] font-medium text-app-accent">
                      <span>Cần gói Plus để dùng khung này</span>
                      <span>Mở khóa →</span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </details>
      </details>

      {selectedTemplate ? (
        <details className="rounded-card border border-app-line bg-app-surface p-4" aria-labelledby="selected-template-title">
          <summary id="selected-template-title" className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-2 text-[14px] font-medium text-app-ink">
            Khung đang dùng: {selectedTemplate.name}
          </summary>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Khung đang dùng</p>
              <p className="mt-2 text-[16px] font-medium text-app-ink">{selectedTemplate.name}</p>
              <p className="mt-1 text-[14px] leading-5 text-app-ink-soft">{selectedTemplate.subtitle}</p>
            </div>
            <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-[13px] text-app-ink-muted">
              {selectedTemplate.requiredPlan ? getPlanLabel(selectedTemplate.requiredPlan) : "Miễn phí"}
            </span>
          </div>
        </details>
      ) : null}

      <details className="rounded-lg border border-dashed border-app-line bg-app-bg p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-2 text-[14px] font-medium text-app-ink">
          Xem mục tiêu đã viết
        </summary>
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg border border-app-line bg-app-surface p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Mục tiêu cụ thể</p>
            <p className="mt-2 text-[14px] leading-6 text-app-ink-soft">{smartGoal.specific}</p>
          </div>
          <div className="rounded-lg border border-app-line bg-app-surface p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Cách đo kết quả</p>
            <p className="mt-2 text-[14px] leading-6 text-app-ink-soft">{smartGoal.measurable}</p>
          </div>
        </div>
      </details>

      {planRationaleReasons.length > 0 ? (
        <details className="rounded-lg border border-app-line bg-app-bg p-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-2 text-[14px] font-medium text-app-ink">Vì sao kế hoạch này được đề xuất</summary>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {planRationaleReasons.map((reason) => (
              <li key={reason.id} className="rounded-lg border border-app-line bg-app-surface p-3">
                <p className="text-[14px] font-medium text-app-ink">{reason.title}</p>
                <p className="mt-1 text-[13px] leading-5 text-app-ink-soft">{reason.detail}</p>
              </li>
            ))}
          </ul>
          {feasibility.smartGoalQualityNote ? (
            <div className="mt-3 rounded-lg border border-app-line bg-app-surface px-3 py-2 text-[13px] leading-5 text-app-ink-soft">
              {feasibility.smartGoalQualityNote}
            </div>
          ) : null}
        </details>
      ) : null}

      {(feasibility.bottleneck || feasibility.firstWeekGuidance || feasibility.scopeRecommendation) && (
        <details className="rounded-lg border border-app-line bg-app-bg p-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-2 text-[14px] font-medium text-app-ink">Các hint từ feasibility</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className={infoBoxClass}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Cần chú ý</p>
              <p className="mt-1 text-[14px] font-medium text-app-ink">{feasibility.bottleneck?.label ?? "Chưa có"}</p>
              {feasibility.bottleneck?.action ? <p className="mt-2">{feasibility.bottleneck.action}</p> : null}
            </div>
            <div className={infoBoxClass}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Tuần 1</p>
              <p className="mt-1">{feasibility.firstWeekGuidance ?? "Giữ tuần đầu vừa sức để tạo nhịp."}</p>
            </div>
            <div className={infoBoxClass}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Mức tải</p>
              <p className="mt-1 text-[14px] font-medium text-app-ink">{getPlanLoadLabel(feasibility.planLoad)}</p>
              <p className="mt-2">{feasibility.scopeRecommendation ?? "Giữ 2-3 việc lặp lại và một buổi nhìn lại cố định."}</p>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
