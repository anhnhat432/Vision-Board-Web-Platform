import { Check, Lightbulb, X } from "lucide-react";
import { motion } from "motion/react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
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
import { FOCUS_AREA_EXAMPLES } from "../constants";
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
  focusArea?: string;
}

export function MeasurableStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
  intentMetricHint,
  intentArchetype,
  archetype,
  focusArea,
}: MeasurableStepProps) {
  const [blurredFields, setBlurredFields] = useState({ metricName: false, targetValue: false });
  const parsedInit = parseMetricAndUnit(smartData.measurable.metric_name);
  const [metricNameInput, setMetricNameInput] = useState(parsedInit.name);
  const [metricUnitInput, setMetricUnitInput] = useState(parsedInit.unit);
  const [showTips, setShowTips] = useState(false);

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
    "smart-target-hint",
    targetNotAboveBaseline ? "smart-target-error" : null,
    showTargetError && !targetNotAboveBaseline ? "smart-target-required-error" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const baselineDescribedBy = ["smart-baseline-hint", baselineInvalid ? "smart-baseline-error" : null]
    .filter(Boolean)
    .join(" ");
  const activeMetricUnit = metricUnitInput.trim();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="smart-metric-name" className={labelClass}>
            Tên chỉ số đo lường
            <span className={requiredMarkerClass} aria-hidden="true">
              *
            </span>
            <span className="sr-only"> bắt buộc</span>
          </label>
          <Input
            id="smart-metric-name"
            placeholder="Ví dụ: Số buổi chạy bộ, Số tiền tiết kiệm, Từ vựng..."
            value={metricNameInput}
            onChange={(event) => handleNameChange(event.target.value)}
            onBlur={() => setBlurredFields((previous) => ({ ...previous, metricName: true }))}
            className={inputClass}
            aria-invalid={showMetricNameError}
            aria-describedby={metricNameDescribedBy}
          />
          <p id="smart-metric-name-hint" className="mt-1 text-[11px] text-app-ink-muted leading-normal">
            Chọn con số để đo tiến trình mỗi tuần.
          </p>
        </div>
        <div>
          <label htmlFor="smart-metric-unit" className={labelClass}>
            Đơn vị đo lường
            <span className={requiredMarkerClass} aria-hidden="true">
              *
            </span>
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
          <div className="mt-2 flex flex-wrap gap-2 items-center select-none">
            <span className="text-[11px] text-app-ink-muted font-bold">Đơn vị gợi ý:</span>
            {(() => {
              const unitSuggestions = (() => {
                if (focusArea === "Career") return ["dự án", "giờ/tuần", "nhiệm vụ"];
                if (focusArea === "Finance") return ["triệu VNĐ", "triệu đồng", "%"];
                if (focusArea === "Health") return ["buổi/tuần", "km", "bữa/tuần", "phút/ngày"];
                if (focusArea === "Education") return ["điểm", "từ mới", "chương", "giờ/tuần"];
                if (focusArea === "Relationships") return ["buổi/tuần", "cuộc hẹn", "lần/tuần"];
                if (focusArea === "Family") return ["bữa tối/tuần", "buổi/tuần", "lần/tuần"];
                if (focusArea === "Personal Growth") return ["phút/ngày", "trang sách", "lần/tuần"];
                if (focusArea === "Leisure") return ["chuyến/tháng", "giờ/tuần", "lần"];
                return ["buổi/tuần", "lần/tuần", "giờ/tuần", "%"];
              })();

              return unitSuggestions.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => handleUnitChange(unit)}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center text-xs px-3 sm:px-2.5 py-1.5 sm:py-0.5 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none",
                    metricUnitInput === unit
                      ? "bg-app-accent text-white border-app-accent"
                      : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/15",
                  )}
                >
                  {unit}
                </button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* 1-Click Suggestions trượt ngang */}
      <div className="mt-3 bg-app-bg-subtle/30 dark:bg-app-bg-subtle/15 p-3.5 rounded-xl border border-dashed border-app-line/80">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-app-accent mb-2 flex items-center gap-1.5 select-none">
          <span>📊</span> Gợi ý đo lường nhanh:
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none snap-x">
          {(() => {
            const suggestions = (() => {
              if (focusArea && FOCUS_AREA_EXAMPLES[focusArea]) {
                return FOCUS_AREA_EXAMPLES[focusArea].measurable.map((e) => ({
                  label: `${e.name}: ${e.baseline} -> ${e.target} ${e.unit}`,
                  name: `${e.name} (${e.unit})`,
                  baseline: e.baseline,
                  target: e.target,
                }));
              }
              const text = smartData.specific.goal_statement.toLowerCase();

              if (text.includes("chạy bộ") || text.includes("thể dục") || text.includes("workout")) {
                return [
                  { label: "Chạy bộ: 0 -> 3 buổi/tuần", name: "Số buổi chạy bộ/tuần", baseline: "0", target: "3" },
                  { label: "Tập gym: 0 -> 4 buổi/tuần", name: "Số buổi tập luyện/tuần", baseline: "0", target: "4" },
                ];
              }
              if (text.includes("tiếng anh") || text.includes("ielts") || text.includes("từ vựng")) {
                return [
                  { label: "IELTS: 5.5 -> 7.0 điểm", name: "Điểm số IELTS tổng quát", baseline: "5.5", target: "7.0" },
                  {
                    label: "Từ vựng: 0 -> 300 từ mới",
                    name: "Số từ vựng tiếng Anh học được",
                    baseline: "0",
                    target: "300",
                  },
                ];
              }
              if (text.includes("lập trình") || text.includes("code") || text.includes("react")) {
                return [
                  {
                    label: "React: 0 -> 12 chương",
                    name: "Số chương học lập trình React",
                    baseline: "0",
                    target: "12",
                  },
                  {
                    label: "Dự án: 0 -> 2 sản phẩm",
                    name: "Số sản phẩm lập trình thực tế hoàn thành",
                    baseline: "0",
                    target: "2",
                  },
                ];
              }
              if (text.includes("tiết kiệm") || text.includes("tiền") || text.includes("tài chính")) {
                return [
                  {
                    label: "Tích lũy: 0 -> 20 triệu",
                    name: "Số tiền tiết kiệm được (triệu đồng)",
                    baseline: "0",
                    target: "20",
                  },
                  {
                    label: "Chi tiêu: 0% -> 15% cắt giảm",
                    name: "Tỷ lệ cắt giảm chi tiêu không cần thiết (%)",
                    baseline: "0",
                    target: "15",
                  },
                ];
              }
              if (text.includes("viết") || text.includes("blog") || text.includes("sách")) {
                return [
                  { label: "Blog: 0 -> 6 bài viết", name: "Số bài viết blog xuất bản", baseline: "0", target: "6" },
                  {
                    label: "Trang sách: 0 -> 200 trang",
                    name: "Số trang sách đã viết xong",
                    baseline: "0",
                    target: "200",
                  },
                ];
              }
              switch (activeArchetype) {
                case "habit_building":
                  return [
                    { label: "Chạy bộ: 0 -> 3 buổi/tuần", name: "Số buổi chạy bộ/tuần", baseline: "0", target: "3" },
                    {
                      label: "Đọc sách: 0 -> 30 trang/ngày",
                      name: "Số trang sách đã đọc/ngày",
                      baseline: "0",
                      target: "30",
                    },
                  ];
                case "skill_learning":
                  return [
                    { label: "React: 0 -> 12 chương", name: "Số chương React hoàn thành", baseline: "0", target: "12" },
                    {
                      label: "Tiếng Anh: 0 -> 300 từ mới",
                      name: "Số từ vựng tiếng Anh học được",
                      baseline: "0",
                      target: "300",
                    },
                  ];
                default:
                  return [
                    {
                      label: "Hành động: 0 -> 10 lần",
                      name: "Số lần thực hiện hành động",
                      baseline: "0",
                      target: "10",
                    },
                    {
                      label: "Thiền định: 0 -> 15 phút/ngày",
                      name: "Số phút ngồi thiền hàng ngày",
                      baseline: "0",
                      target: "15",
                    },
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
                className="inline-flex min-h-11 items-center text-xs text-left bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-xl border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:outline-none whitespace-nowrap snap-start shadow-sm flex-shrink-0 cursor-pointer"
              >
                ⚡ <span className="font-medium">{suggestion.label}</span>
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Mẹo đo lường sụp mở */}
      <div className="mt-2.5 select-none">
        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          className="inline-flex items-center gap-1 text-xs text-app-accent hover:underline font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:rounded-sm"
        >
          <span>💡</span> {showTips ? "Thu gọn mẹo đo lường tốt ▲" : "Xem mẹo đo lường tốt ▼"}
        </button>

        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden origin-top",
            showTips ? "mt-3 max-h-[300px] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-app-accent/10 bg-app-accent-soft dark:bg-app-accent-soft/10 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-300 hover:shadow-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent dark:text-app-accent mt-0.5">
                💡
              </span>
              <div>
                <p className="font-bold text-app-accent dark:text-app-accent">Nên viết rõ (Đếm được):</p>
                <p className="text-app-ink-soft mt-0.5 font-serif italic">
                  "Số buổi vận động/tuần" (đơn vị: buổi), hoặc "Số tiền tích lũy" (đơn vị: triệu VNĐ).
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-rose-500/10 bg-rose-50/20 dark:bg-rose-950/5 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-305 hover:shadow-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-450 mt-0.5">
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <div>
                <p className="font-bold text-rose-750 dark:text-rose-400">Tránh viết chung chung (Không đếm được):</p>
                <p className="text-app-ink-soft mt-0.5 font-serif italic">
                  "Học tập chăm chỉ hơn" (không có mốc đo) hoặc "Vận động nhiều hơn."
                </p>
              </div>
            </div>
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
            Mức xuất phát (Tùy chọn)
          </label>
          <div className="relative">
            <Input
              id="smart-baseline"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Ví dụ: 0, 5.5, 60..."
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
              className={cn(inputClass, activeMetricUnit ? "pr-20 sm:pr-24" : undefined)}
              aria-invalid={baselineInvalid}
              aria-describedby={baselineDescribedBy}
            />
            {activeMetricUnit ? (
              <span className="pointer-events-none absolute right-1 top-1/2 max-w-[6.5rem] -translate-y-1/2 truncate rounded-full bg-app-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-app-ink-muted">
                {activeMetricUnit}
              </span>
            ) : null}
          </div>
          <p id="smart-baseline-hint" className={helperTextClass}>
            Giá trị hiện tại của bạn; chưa có thì để trống.
          </p>
          {baselineInvalid ? <FieldError id="smart-baseline-error" message="Nhập con số hợp lệ." /> : null}
        </div>
        <div>
          <label htmlFor="smart-target" className={labelClass}>
            Mức đích cần đạt
            <span className={requiredMarkerClass} aria-hidden="true">
              *
            </span>
          </label>
          <div className="relative">
            <Input
              id="smart-target"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Ví dụ: 3, 7.0, 75..."
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
              className={cn(inputClass, activeMetricUnit ? "pr-20 sm:pr-24" : undefined)}
              aria-invalid={showTargetError}
              aria-describedby={targetDescribedBy}
            />
            {activeMetricUnit ? (
              <span className="pointer-events-none absolute right-1 top-1/2 max-w-[6.5rem] -translate-y-1/2 truncate rounded-full bg-app-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-app-ink-muted">
                {activeMetricUnit}
              </span>
            ) : null}
          </div>
          <p id="smart-target-hint" className={helperTextClass}>
            Phải cao hơn mức xuất phát để thể hiện tiến bộ.
          </p>
          {targetNotAboveBaseline ? (
            <FieldError id="smart-target-error" message="Mục tiêu cần lớn hơn mốc hiện tại" role="alert" />
          ) : null}
          {showTargetError && !targetNotAboveBaseline ? (
            <FieldError id="smart-target-required-error" message="Nhập mốc hợp lệ." role="alert" />
          ) : null}
        </div>
      </div>

      {(() => {
        const hasBaseline = smartData.measurable.baseline_value.trim().length > 0 && parsedBaselineValue !== undefined;
        const hasTarget = smartData.measurable.target_value.trim().length > 0 && parsedTargetValue !== undefined;
        if (!hasTarget) return null;
        const baseline = hasBaseline ? (parsedBaselineValue ?? 0) : 0;
        const target = parsedTargetValue ?? 0;
        const unit = smartData.measurable.metric_name.trim()
          ? smartData.measurable.metric_name.includes("/")
            ? smartData.measurable.metric_name.split("/")[1].trim()
            : smartData.measurable.metric_name.trim()
          : "đơn vị";
        let growthPct = 0;
        let infoText = "";
        const themeColor = "bg-app-accent";
        const glowColor = "shadow-app-accent/20";
        let statusEmoji = "🚀";
        if (hasBaseline) {
          const diff = target - baseline;
          growthPct = baseline > 0 ? (diff / baseline) * 100 : 100;
          if (growthPct <= 20) {
            infoText = "Mức độ khả thi cao!";
            statusEmoji = "🟢";
          } else if (growthPct <= 50) {
            infoText = "Mục tiêu thách thức vừa phải!";
            statusEmoji = "🟡";
          } else {
            infoText = "Đột phá vượt bậc!";
            statusEmoji = "🔥";
          }
        } else {
          infoText = "Chinh phục cột mốc mới từ con số 0!";
        }
        return (
          <div className="rounded-2xl border border-app-line bg-app-bg-subtle/50 p-4 shadow-sm space-y-3 mt-4">
            <div className="flex items-center justify-between text-xs font-semibold select-none">
              <span className="text-app-ink-soft">Thước đo khoảng cách mục tiêu</span>
              <span className="text-app-accent font-extrabold">
                {hasBaseline ? `Tăng trưởng: +${growthPct.toFixed(0)}%` : "Bắt đầu từ 0"}
              </span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-app-line overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn("h-full rounded-full shadow-md", themeColor, glowColor)}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-app-ink-muted select-none">
              <span>{hasBaseline ? `Bắt đầu: ${baseline} ${unit}` : `Khởi điểm: 0 ${unit}`}</span>
              <span>
                🎯 Đích: {target} {unit}
              </span>
            </div>
            <div className="rounded-xl bg-app-surface border border-app-line px-3 py-2 text-xs text-app-ink-soft flex items-center gap-2">
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
