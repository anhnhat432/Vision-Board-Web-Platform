import type { Dispatch, SetStateAction } from "react";
import { Lightbulb } from "lucide-react";

import type { GoalArchetype } from "@/lib/smart-goal";
import { parseNumberInput } from "@/lib/smart-goal";

import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";

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
  const targetInvalid =
    parsedTargetValue === undefined ||
    targetNotAboveBaseline;

  return (
    <div className="stack-stack">
      <div className="space-y-2">
        <Label htmlFor="smart-metric-name" className="text-base">
          Con số hoặc dấu hiệu theo dõi
        </Label>
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
          aria-invalid={metricNameMissing && currentStepHasDraftContent}
          aria-describedby={
            intentMetricHint
              ? "smart-metric-name-hint smart-metric-intent-hint"
              : "smart-metric-name-hint"
          }
        />
        <p id="smart-metric-name-hint" className="text-sm text-slate-500">
          Chọn chỉ số đo được — tăng hay đứng yên phải nhìn ra ngay.
        </p>
        {intentMetricHint && (
          <div
            data-testid="smart-intent-metric-hint"
            id="smart-metric-intent-hint"
            role="note"
            className="flex items-start gap-2 rounded-[var(--r-card)] border border-sky-200 bg-sky-50/82 px-3 py-2.5 text-sm leading-6 text-sky-900"
          >
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
            <span>
              <span className="font-semibold">Gợi ý theo hướng bạn chọn:</span> {intentMetricHint}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="smart-baseline">Mốc hiện tại (tuỳ chọn)</Label>
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
            aria-invalid={baselineInvalid}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smart-target">Mốc mục tiêu</Label>
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
            aria-invalid={targetInvalid && currentStepHasDraftContent}
            aria-describedby={targetNotAboveBaseline ? "smart-target-error" : undefined}
          />
          {targetNotAboveBaseline ? (
            <p id="smart-target-error" className="text-xs font-medium text-rose-700">
              Mục tiêu cần lớn hơn baseline
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Nhập cả hai mốc thì mốc mục tiêu phải lớn hơn mốc hiện tại.
      </p>
      <ArchetypeHint archetype={activeArchetype} variant="metric" />
      <GoalArchetypeExamples archetype={intentArchetype} variant="metric" />
    </div>
  );
}
