import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { Lightbulb, Check, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/app/components/ui/utils";

function parseMetricAndUnit(metricName: string) {
  const openParenIndex = metricName.lastIndexOf("(");
  const closeParenIndex = metricName.lastIndexOf(")");
  if (openParenIndex !== -1 && closeParenIndex !== -1 && closeParenIndex > openParenIndex) {
    const name = metricName.substring(0, openParenIndex).trim();
    const unit = metricName.substring(openParenIndex + 1, closeParenIndex).trim();
    return { name, unit };
  }
  return { name: metricName, unit: "" };
}

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
  const parsedInit = parseMetricAndUnit(smartData.measurable.metric_name);
  const [metricNameInput, setMetricNameInput] = useState(parsedInit.name);
  const [metricUnitInput, setMetricUnitInput] = useState(parsedInit.unit);

  useEffect(() => {
    const { name, unit } = parseMetricAndUnit(smartData.measurable.metric_name);
    setMetricNameInput(name);
    setMetricUnitInput(unit);
  }, [smartData.measurable.metric_name]);

  const handleNameChange = (newName: string) => {
    setMetricNameInput(newName);
    const newFullMetric = metricUnitInput ? `${newName} (${metricUnitInput})` : newName;
    setSmartData((previous) => ({
      ...previous,
      measurable: {
        ...previous.measurable,
        metric_name: newFullMetric,
      },
    }));
  };

  const handleUnitChange = (newUnit: string) => {
    setMetricUnitInput(newUnit);
    const newFullMetric = newUnit ? `${metricNameInput} (${newUnit})` : metricNameInput;
    setSmartData((previous) => ({
      ...previous,
      measurable: {
        ...previous.measurable,
        metric_name: newFullMetric,
      },
    }));
  };
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="smart-metric-name" className={labelClass}>
            Tên chỉ số đo lường (Metric Name)
            <span className={requiredMarkerClass} aria-hidden="true">*</span>
            <span className="sr-only"> bắt buộc</span>
          </label>
          <Input
            id="smart-metric-name"
            placeholder="Ví dụ: Số buổi chạy bộ, Số tiền tiết kiệm, Từ vựng tiếng Anh học được..."
            value={metricNameInput}
            onChange={(event) => handleNameChange(event.target.value)}
            onBlur={() => setBlurredFields((previous) => ({ ...previous, metricName: true }))}
            className={inputClass}
            aria-invalid={showMetricNameError}
            aria-describedby={metricNameDescribedBy}
          />
          <p id="smart-metric-name-hint" className="mt-1 text-[11px] text-app-ink-muted leading-normal">
            Chỉ số giúp bạn biết tiến độ của mình đang tăng hay đứng yên.
          </p>
        </div>
        <div>
          <label htmlFor="smart-metric-unit" className={labelClass}>
            Đơn vị đo lường (Unit)
            <span className={requiredMarkerClass} aria-hidden="true">*</span>
            <span className="sr-only"> bắt buộc</span>
          </label>
          <Input
            id="smart-metric-unit"
            placeholder="Ví dụ: buổi/tuần, triệu VNĐ, từ mới..."
            value={metricUnitInput}
            onChange={(event) => handleUnitChange(event.target.value)}
            onBlur={() => setBlurredFields((previous) => ({ ...previous, metricName: true }))}
            className={inputClass}
          />
        </div>
      </div>
        
        {/* 1-Click Metric Suggestions */}
        <div className="mt-3 bg-app-bg/40 p-3 rounded-xl border border-app-line/60">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-app-accent mb-2 flex items-center gap-1">
            <span>📊</span> Gợi ý đo lường nhanh (1-Click Suggestions):
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(() => {
              const suggestions = (() => {
                const text = smartData.specific.goal_statement.toLowerCase();
                
                // Phân tích từ khóa động
                if (text.includes("chạy bộ") || text.includes("chạy") || text.includes("thể dục") || text.includes("gym") || text.includes("workout")) {
                  return [
                    { label: "Chạy bộ: 0 -> 3 buổi/tuần", name: "Số buổi chạy bộ/tuần", baseline: "0", target: "3" },
                    { label: "Tập gym: 0 -> 4 buổi/tuần", name: "Số buổi tập luyện/tuần", baseline: "0", target: "4" }
                  ];
                }
                if (text.includes("tiếng anh") || text.includes("ielts") || text.includes("english") || text.includes("từ vựng") || text.includes("học từ")) {
                  return [
                    { label: "IELTS: 5.5 -> 7.0 điểm", name: "Điểm số IELTS tổng quát", baseline: "5.5", target: "7.0" },
                    { label: "Từ vựng: 0 -> 300 từ mới", name: "Số từ vựng tiếng Anh học được", baseline: "0", target: "300" }
                  ];
                }
                if (text.includes("lập trình") || text.includes("code") || text.includes("web") || text.includes("react") || text.includes("javascript")) {
                  return [
                    { label: "React: 0 -> 12 chương", name: "Số chương học lập trình React", baseline: "0", target: "12" },
                    { label: "Dự án: 0 -> 2 sản phẩm", name: "Số sản phẩm lập trình thực tế hoàn thành", baseline: "0", target: "2" }
                  ];
                }
                if (text.includes("tiết kiệm") || text.includes("tiền") || text.includes("thu nhập") || text.includes("tài chính") || text.includes("đầu tư")) {
                  return [
                    { label: "Tích lũy: 0 -> 20 triệu đồng", name: "Số tiền tiết kiệm được (triệu đồng)", baseline: "0", target: "20" },
                    { label: "Chi tiêu: 0% -> 15% cắt giảm", name: "Tỷ lệ cắt giảm chi tiêu không cần thiết (%)", baseline: "0", target: "15" }
                  ];
                }
                if (text.includes("viết") || text.includes("blog") || text.includes("bài viết") || text.includes("đăng bài") || text.includes("sách")) {
                  return [
                    { label: "Blog: 0 -> 6 bài viết", name: "Số bài viết blog xuất bản", baseline: "0", target: "6" },
                    { label: "Trang sách: 0 -> 200 trang", name: "Số trang sách đã viết xong", baseline: "0", target: "200" }
                  ];
                }

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

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2 text-xs leading-relaxed">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <div>
              <p className="font-bold text-emerald-700 dark:text-emerald-400">Ví dụ Tốt (Có thước đo):</p>
              <p className="text-app-ink-soft mt-0.5">"Số buổi vận động/tuần" (đơn vị: buổi), hoặc "Số tiền tiết kiệm" (đơn vị: triệu VNĐ).</p>
            </div>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 flex items-start gap-2 text-xs leading-relaxed">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-450 mt-0.5">
              <X className="h-3 w-3" strokeWidth={3} />
            </span>
            <div>
              <p className="font-bold text-rose-750 dark:text-rose-400">Ví dụ Chưa tốt (Chung chung):</p>
              <p className="text-app-ink-soft mt-0.5">"Học chăm chỉ hơn" (không thể đếm) hoặc "Cải thiện bản thân."</p>
            </div>
          </div>
        </div>
        {intentMetricHint && (
          <div
            data-testid="smart-intent-metric-hint"
            id="smart-metric-intent-hint"
            role="note"
            className="mt-3 flex items-start gap-2 rounded-[14px] border border-app-line bg-app-bg p-3 text-xs leading-relaxed text-app-ink-soft"
          >
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
            <span>
              <span className="font-medium text-app-ink">Gợi ý đo lường:</span> {intentMetricHint}
            </span>
          </div>
        )}
        {showMetricNameError ? (
          <FieldError id="smart-metric-name-error" message="Chọn một chỉ số cụ thể để bắt đầu đo lường." role="alert" />
        ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px] bg-app-surface p-4 rounded-xl border border-app-line/60">
        <div>
          <label htmlFor="smart-baseline" className={labelClass}>
            Mức xuất phát (Mốc hiện tại - Tùy chọn)
          </label>
          <Input
            id="smart-baseline"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="Ví dụ: 0, hoặc 5.5, hoặc 60..."
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
          <p className="mt-1 text-[10px] text-app-ink-muted leading-normal">
            Điểm khởi đầu của bạn. Nếu bắt đầu từ đầu, hãy điền <span className="font-semibold text-app-ink">0</span>.
          </p>
          {baselineInvalid ? (
            <FieldError id="smart-baseline-error" message="Nhập một con số hợp lệ." />
          ) : null}
        </div>
        <div>
          <label htmlFor="smart-target" className={labelClass}>
            Mức đích cần đạt (Mục tiêu)
            <span className={requiredMarkerClass} aria-hidden="true">*</span>
            <span className="sr-only"> bắt buộc</span>
          </label>
          <Input
            id="smart-target"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="Ví dụ: 3, hoặc 7.0, hoặc 75..."
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
          <p className="mt-1 text-[10px] text-app-ink-muted leading-normal">
            Mốc bạn muốn đạt tới sau 12 tuần.
          </p>
          {targetNotAboveBaseline ? (
            <FieldError id="smart-target-error" message="Mục tiêu cần lớn hơn mốc hiện tại" role="alert" />
          ) : null}
          {showTargetError && !targetNotAboveBaseline ? (
            <FieldError id="smart-target-required-error" message="Nhập mốc mục tiêu hợp lệ." role="alert" />
          ) : null}
        </div>
      </div>
      <p className={helperTextClass}>Nếu bạn điền cả hai mức, mục tiêu phải lớn hơn mức xuất phát để thể hiện sự tiến bộ.</p>

      {/* Thước đo tiến độ động (Interactive Goal Gauge) */}
      {(() => {
        const hasBaseline = smartData.measurable.baseline_value.trim().length > 0 && parsedBaselineValue !== undefined;
        const hasTarget = smartData.measurable.target_value.trim().length > 0 && parsedTargetValue !== undefined;

        if (!hasTarget) return null;

        const baseline = hasBaseline ? (parsedBaselineValue ?? 0) : 0;
        const target = parsedTargetValue ?? 0;
        const unit = smartData.measurable.metric_name.trim()
          ? (smartData.measurable.metric_name.includes("/")
            ? smartData.measurable.metric_name.split("/")[1].trim()
            : smartData.measurable.metric_name.trim())
          : "đơn vị";

        let growthPct = 0;
        let infoText = "";
        let themeColor = "bg-blue-500";
        let glowColor = "shadow-blue-500/20";
        let statusEmoji = "🚀";

        if (hasBaseline) {
          const diff = target - baseline;
          growthPct = baseline > 0 ? (diff / baseline) * 100 : 100;

          if (growthPct <= 20) {
            infoText = "Mức độ khả thi cao! Rất thực tế để hoàn thành.";
            themeColor = "bg-emerald-500";
            glowColor = "shadow-emerald-500/20";
            statusEmoji = "🟢";
          } else if (growthPct <= 50) {
            infoText = "Mục tiêu thách thức vừa phải! Cần hành động kỷ luật.";
            themeColor = "bg-blue-500";
            glowColor = "shadow-blue-500/20";
            statusEmoji = "🟡";
          } else {
            infoText = "Đột phá vượt bậc! Hãy thiết lập kế hoạch hành động thật chi tiết.";
            themeColor = "bg-indigo-500";
            glowColor = "shadow-indigo-500/20";
            statusEmoji = "🔥";
          }
        } else {
          infoText = "Chinh phục cột mốc mới từ con số 0!";
        }

        return (
          <div className="rounded-2xl border border-teal-100/70 bg-gradient-to-r from-teal-50/10 to-emerald-50/10 dark:border-slate-800 dark:from-slate-900/40 p-4 shadow-sm space-y-3 mt-4 animate-[fade-in_0.3s_ease-out]">
            <div className="flex items-center justify-between text-xs font-semibold select-none">
              <span className="text-slate-500 dark:text-slate-400">Thước đo khoảng cách mục tiêu</span>
              <span className="text-app-accent font-extrabold">
                {hasBaseline ? `Tăng trưởng: +${growthPct.toFixed(0)}%` : "Bắt đầu từ mốc 0"}
              </span>
            </div>

            {/* Thanh Progress Bar trực quan */}
            <div className="relative h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn("h-full rounded-full shadow-md", themeColor, glowColor)}
              />
            </div>

            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 select-none">
              <span>{hasBaseline ? `Bắt đầu: ${baseline} ${unit}` : `Khởi điểm: 0 ${unit}`}</span>
              <span>🎯 Đích: {target} {unit}</span>
            </div>

            <div className="rounded-xl bg-app-surface border border-app-line px-3 py-2 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="flex-shrink-0">{statusEmoji}</span>
              <span>{infoText}</span>
            </div>
          </div>
        );
      })()}

      <ArchetypeHint archetype={activeArchetype} variant="metric" />
      <GoalArchetypeExamples archetype={intentArchetype} variant="metric" />
    </div>
  );
}
