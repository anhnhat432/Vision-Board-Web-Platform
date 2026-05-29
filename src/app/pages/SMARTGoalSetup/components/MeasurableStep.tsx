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
        
        {/* 1-Click Metric Suggestions */}
        <div className="mt-3 bg-app-bg/40 p-3 rounded-xl border border-app-line/60">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-app-accent mb-2 flex items-center gap-1">
            <span>📊</span> Gợi ý đo lường nhanh (1-Click Suggestions):
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(() => {
              const suggestions = (() => {
                switch (activeArchetype) {
                  case "habit_building":
                    return [
                      { label: "Chạy bộ: 0 -> 3 buổi/tuần", name: "Số buổi chạy bộ/tuần", baseline: "0", target: "3" },
                      { label: "Đọc sách: 0 -> 30 trang/ngày", name: "Số trang sách đã đọc/ngày", baseline: "0", target: "30" }
                    ];
                  case "skill_learning":
                    return [
                      { label: "React: 0 -> 12 chương", name: "Số chương React hoàn thành", baseline: "0", target: "12" },
                      { label: "Tiếng Anh: 0 -> 300 từ mới", name: "Số từ vựng tiếng Anh học được", baseline: "0", target: "300" }
                    ];
                  case "project_completion":
                    return [
                      { label: "Bàn giao: 0% -> 100% tiến độ", name: "Phần trăm tiến độ dự án", baseline: "0", target: "100" },
                      { label: "Blog: 0 -> 3 bài xuất bản", name: "Số bài viết blog đã đăng", baseline: "0", target: "3" }
                    ];
                  case "financial_goal":
                    return [
                      { label: "Tiết kiệm: 0 -> 15 triệu", name: "Số tiền tích lũy (triệu đồng)", baseline: "0", target: "15" },
                      { label: "Chi tiêu: 0% -> 15% cắt giảm", name: "Tỷ lệ cắt giảm chi phí sinh hoạt (%)", baseline: "0", target: "15" }
                    ];
                  default:
                    return [
                      { label: "Hành động: 0 -> 10 lần thực hiện", name: "Số lần thực hiện hành động", baseline: "0", target: "10" },
                      { label: "Thiền định: 0 -> 15 phút/ngày", name: "Số phút ngồi thiền hàng ngày", baseline: "0", target: "15" }
                    ];
                }
              })();

              return suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => {
                    setSmartData((previous) => ({
                      ...previous,
                      measurable: {
                        metric_name: suggestion.name,
                        baseline_value: suggestion.baseline,
                        target_value: suggestion.target,
                      },
                    }));
                    setBlurredFields({ metricName: true, targetValue: true });
                  }}
                  className="text-xs text-left bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-3 py-2 rounded-lg border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.99] w-full block shadow-sm"
                >
                  ⚡ <span className="font-semibold">{suggestion.label}</span>
                </button>
              ));
            })()}
          </div>
        </div>

        <p id="smart-metric-name-hint" className={helperTextClass}>
          Chọn chỉ số đo được — tăng hay đứng yên phải nhìn ra ngay.
        </p>
        {intentMetricHint && (
          <div
            data-testid="smart-intent-metric-hint"
            id="smart-metric-intent-hint"
            role="note"
            className="mt-3 flex items-start gap-2 rounded-[14px] border border-app-line bg-app-bg p-3 text-xs leading-relaxed text-app-ink-soft"
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
