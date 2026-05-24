import type { Dispatch, SetStateAction } from "react";
import { Lightbulb } from "lucide-react";

import type { GoalArchetype } from "@/lib/smart-goal";
import { parseNumberInput } from "@/lib/smart-goal";

import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { Input } from "../../../components/ui/input";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { errorTextClass, helperTextClass, inputClass, labelClass } from "./formStyles";

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
  const activeArchetype = archetype ?? intentArchetype ?? "other";
  const parsedBaselineValue = parseNumberInput(smartData.measurable.baseline_value);
  const parsedTargetValue = parseNumberInput(smartData.measurable.target_value);
  const metricNameMissing = smartData.measurable.metric_name.trim().length === 0;
  const baselineInvalid = smartData.measurable.baseline_value.trim().length > 0 && parsedBaselineValue === undefined;
  const targetNotAboveBaseline =
    parsedBaselineValue !== undefined && parsedTargetValue !== undefined && parsedTargetValue <= parsedBaselineValue;
  const targetInvalid = parsedTargetValue === undefined || targetNotAboveBaseline;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="smart-metric-name" className={labelClass}>
          Con số hoặc dấu hiệu theo dõi
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
          className={inputClass}
          aria-invalid={metricNameMissing && currentStepHasDraftContent}
          aria-describedby={
            intentMetricHint ? "smart-metric-name-hint smart-metric-intent-hint" : "smart-metric-name-hint"
          }
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
            <p id="smart-baseline-error" className={errorTextClass}>
              Nhập một con số hợp lệ.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="smart-target" className={labelClass}>
            Mốc mục tiêu
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
            className={inputClass}
            aria-invalid={targetInvalid && currentStepHasDraftContent}
            aria-describedby={targetNotAboveBaseline ? "smart-target-error" : undefined}
          />
          {targetNotAboveBaseline ? (
            <p id="smart-target-error" className={errorTextClass}>
              Mục tiêu cần lớn hơn mốc hiện tại
            </p>
          ) : null}
        </div>
      </div>
      <p className={helperTextClass}>Nhập cả hai mốc thì mốc mục tiêu phải lớn hơn mốc hiện tại.</p>
      <ArchetypeHint archetype={activeArchetype} variant="metric" />
      <GoalArchetypeExamples archetype={intentArchetype} variant="metric" />
    </div>
  );
}
