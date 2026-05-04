import type { Dispatch, SetStateAction } from "react";

import { parseNumberInput } from "@/lib/smart-goal";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";

import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";

interface MeasurableStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
  archetype: GoalArchetype;
}

export function MeasurableStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
  archetype,
}: MeasurableStepProps) {
  const parsedBaselineValue = parseNumberInput(smartData.measurable.baseline_value);
  const parsedTargetValue = parseNumberInput(smartData.measurable.target_value);
  const metricNameMissing = smartData.measurable.metric_name.trim().length === 0;
  const baselineInvalid = smartData.measurable.baseline_value.trim().length > 0 && parsedBaselineValue === undefined;
  const targetInvalid =
    parsedTargetValue === undefined ||
    (parsedBaselineValue !== undefined && parsedTargetValue !== undefined && parsedTargetValue <= parsedBaselineValue);

  return (
    <div className="space-y-5">
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
        />
        <p className="text-sm text-slate-500">Chọn chỉ số đo được — tăng hay đứng yên phải nhìn ra ngay.</p>
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
          />
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Nếu bạn nhập cả hai mốc, hệ thống sẽ kiểm tra để mốc mục tiêu lớn hơn mốc hiện tại.
      </p>

      <ArchetypeHint archetype={archetype} variant="metric" />
    </div>
  );
}
