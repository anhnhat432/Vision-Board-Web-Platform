import { useState, type Dispatch, type SetStateAction } from "react";
import { Lightbulb } from "lucide-react";

import type { GoalArchetype } from "@/lib/smart-goal";
import { parseNumberInput } from "@/lib/smart-goal";

import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { helperTextClass, inputClass, labelClass, requiredMarkerClass } from "./formStyles";

interface MeasurableStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
  /**
   * Optional archetype-specific metric suggestion derived from the
   * user's onboarding intent. Rendered as a soft hint below the metric
   * name helper; does not affect validation or scoring. When absent,
   * the step renders identically to before.
   */
  intentMetricHint?: string;
  /**
   * Optional archetype derived from the user's onboarding intent. Drives
   * the collapsible "good vs bad metric" example panel. Renders nothing
   * for null, undefined, or `"other"`.
   */
  intentArchetype?: GoalArchetype | null;
  archetype?: GoalArchetype;
}

export function MeasurableStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
  intentMetricHint,
  intentArchetype,
  archetype,
}: MeasurableStepProps) {
  const [blurredFields, setBlurredFields] = useState({ metricName: false, targetValue: false });
  const activeArchetype = archetype ?? intentArchetype ?? "other";
  const parsedBaselineValue = parseNumberInput(smartData.measurable.baseline_value);
  const parsedTargetValue = parseNumberInput(smartData.measurable.target_value);
  const metricNameMissing = smartData.measurable.metric_name.trim().length === 0;
  const baselineInvalid = smartData.measurable.baseline_value.trim().length > 0 && parsedBaselineValue === undefined;
  const targetNotAboveBaseline =
    parsedBaselineValue !== undefined && parsedTargetValue !== undefined && parsedTargetValue <= parsedBaselineValue;
  const targetInvalid = parsedTargetValue === undefined || targetNotAboveBaseline;
  const showMetricNameError = metricNameMissing && (blurredFields.metricName || currentStepHasDraftContent);
  const showTargetError = targetInvalid && (blurredFields.targetValue || currentStepHasDraftContent);
  const metricNameDescribedBy = [
    "smart-metric-name-hint",
    intentMetricHint ? "smart-metric-intent-hint" : null,
    showMetricNameError ? "smart-metric-name-error" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const targetDescribedBy = [
    targetNotAboveBaseline ? "smart-target-error" : null,
    showTargetError && !targetNotAboveBaseline ? "smart-target-required-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="smart-metric-name" className={labelClass}>
          Con số hoặc dấu hiệu theo dõi
          <span className={requiredMarkerClass} aria-hidden="true">*</span>
          <span className="sr-only"> bắt buộc</span>
        </label>
        <Input
          id="smart-metric-name"
          placeholder="Ví dụ: điểm IELTS, số dự án hoàn thành, doanh thu..."
          value={smartData.measurable.metric_name}
          onChange={(event) =>
            setSmartData((previous) => ({
              ...previous,
              measurable: {
                ...previous.measurable,
                metric_name: event.target.value,
              },
            }))
          }
          onBlur={() => setBlurredFields((previous) => ({ ...previous, metricName: true }))}
          className={inputClass}
          aria-invalid={showMetricNameError}
          aria-describedby={metricNameDescribedBy}
        />
        <p id="smart-metric-name-hint" className={helperTextClass}>
          Chọn chỉ số đo được — tăng hay đứng yên phải nhìn ra ngay.
        </p>
        {intentMetricHint && (
          <div
            data-testid="smart-intent-metric-hint"
            id="smart-metric-intent-hint"
            role="note"
            className="mt-3 flex items-start gap-2 rounded-lg border border-app-line bg-app-bg p-3 text-xs leading-relaxed text-app-ink-soft"
          >
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
            <span>
              <span className="font-medium text-app-ink">Gợi ý theo hướng bạn chọn:</span> {intentMetricHint}
            </span>
          </div>
        )}
        {showMetricNameError ? (
          <FieldError id="smart-metric-name-error" message="Chọn một chỉ số để theo dõi tiến độ." role="alert" />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
        <div>
          <label htmlFor="smart-baseline" className={labelClass}>
            Mốc hiện tại (tuỳ chọn)
          </label>
          <Input
            id="smart-baseline"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="VD: 5.5"
            value={smartData.measurable.baseline_value}
            onChange={(event) =>
              setSmartData((previous) => ({
                ...previous,
                measurable: {
                  ...previous.measurable,
                  baseline_value: event.target.value,
                },
              }))
            }
            className={inputClass}
            aria-invalid={baselineInvalid}
            aria-describedby={baselineInvalid ? "smart-baseline-error" : undefined}
          />
          {baselineInvalid ? (
            <FieldError id="smart-baseline-error" message="Nhập một con số hợp lệ." />
          ) : null}
        </div>
        <div>
          <label htmlFor="smart-target" className={labelClass}>
            Mốc mục tiêu
            <span className={requiredMarkerClass} aria-hidden="true">*</span>
            <span className="sr-only"> bắt buộc</span>
          </label>
          <Input
            id="smart-target"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="VD: 7.0"
            value={smartData.measurable.target_value}
            onChange={(event) =>
              setSmartData((previous) => ({
                ...previous,
                measurable: {
                  ...previous.measurable,
                  target_value: event.target.value,
                },
              }))
            }
            onBlur={() => setBlurredFields((previous) => ({ ...previous, targetValue: true }))}
            className={inputClass}
            aria-invalid={showTargetError}
            aria-describedby={targetDescribedBy || undefined}
          />
          {targetNotAboveBaseline ? (
            <FieldError id="smart-target-error" message="Mục tiêu cần lớn hơn mốc hiện tại" role="alert" />
          ) : null}
          {showTargetError && !targetNotAboveBaseline ? (
            <FieldError id="smart-target-required-error" message="Nhập mốc mục tiêu hợp lệ." role="alert" />
          ) : null}
        </div>
      </div>
      <p className={helperTextClass}>Nhập cả hai mốc thì mốc mục tiêu phải lớn hơn mốc hiện tại.</p>
      <ArchetypeHint archetype={activeArchetype} variant="metric" />
      <GoalArchetypeExamples archetype={intentArchetype} variant="metric" />
    </div>
  );
}
