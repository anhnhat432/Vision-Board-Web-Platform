import { BarChart3, ChevronDown, ChevronUp, Flame, Lightbulb, Target, X } from "lucide-react";
import { motion } from "motion/react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { cn } from "@/app/components/ui/utils";

import type { GoalArchetype } from "@/lib/smart-goal";
import { parseNumberInput } from "@/lib/smart-goal";

import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import { FOCUS_AREA_EXAMPLES } from "../constants";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { helperTextClass, inputClass, labelClass, requiredMarkerClass } from "./formStyles";

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

interface MeasurableStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
  intentMetricHint?: string;
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
  const activeMetricUnit = metricUnitInput.trim();

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

  const suggestions = (() => {
    if (focusArea && FOCUS_AREA_EXAMPLES[focusArea]) {
      return FOCUS_AREA_EXAMPLES[focusArea].measurable.map((e) => ({
        label: `${e.name}: ${e.baseline} → ${e.target} ${e.unit}`,
        name: `${e.name} (${e.unit})`,
        baseline: e.baseline,
        target: e.target,
      }));
    }
    const text = smartData.specific.goal_statement.toLowerCase();
    if (text.includes("chạy bộ") || text.includes("thể dục") || text.includes("workout") || text.includes("gym")) {
      return [
        { label: "Chạy bộ: 0 → 3 buổi/tuần", name: "Số buổi chạy bộ/tuần", baseline: "0", target: "3" },
        { label: "Tập gym: 0 → 4 buổi/tuần", name: "Số buổi tập luyện/tuần", baseline: "0", target: "4" },
        { label: "Yoga: 0 → 2 buổi/tuần", name: "Số buổi yoga/tuần", baseline: "0", target: "2" },
        { label: "Bước chân: 3.000 → 8.000 bước/ngày", name: "Số bước chân/ngày", baseline: "3000", target: "8000" },
      ];
    }
    if (text.includes("tiếng anh") || text.includes("ielts") || text.includes("từ vựng") || text.includes("toeic")) {
      return [
        { label: "IELTS: 5.5 → 7.0", name: "Điểm số IELTS tổng quát", baseline: "5.5", target: "7.0" },
        { label: "Từ vựng: 0 → 300", name: "Số từ vựng tiếng Anh học được", baseline: "0", target: "300" },
        { label: "TOEIC: 500 → 750", name: "Điểm số TOEIC", baseline: "500", target: "750" },
        { label: "Nghe podcast: 0 → 5 tập/tuần", name: "Số tập podcast tiếng Anh/ngày", baseline: "0", target: "5" },
      ];
    }
    if (text.includes("lập trình") || text.includes("code") || text.includes("react")) {
      return [
        { label: "React: 0 → 12 chương", name: "Số chương học lập trình React", baseline: "0", target: "12" },
        { label: "Dự án: 0 → 2 sản phẩm", name: "Số sản phẩm lập trình thực tế hoàn thành", baseline: "0", target: "2" },
        { label: "Bug fix: 0 → 20 vấn đề", name: "Số lỗi kỹ thuật giải quyết", baseline: "0", target: "20" },
        { label: "Commit: 0 → 30 commit/tháng", name: "Số commit Git cá nhân/tháng", baseline: "0", target: "30" },
      ];
    }
    if (text.includes("tiết kiệm") || text.includes("tiền") || text.includes("tài chính")) {
      return [
        { label: "Tích lũy: 0 → 20 triệu", name: "Số tiền tiết kiệm được (triệu đồng)", baseline: "0", target: "20" },
        { label: "Chi tiêu: 0% → 15%", name: "Tỷ lệ cắt giảm chi tiêu không cần thiết (%)", baseline: "0", target: "15" },
        { label: "Đầu tư: 0% → 10% thu nhập", name: "Tỷ lệ đầu tư so với thu nhập (%)", baseline: "0", target: "10" },
        { label: "Ngân sách: 0 → 12 tuần đúng hạn", name: "Số tuần chi tiêu trong ngân sách", baseline: "0", target: "12" },
      ];
    }
    if (text.includes("viết") || text.includes("blog") || text.includes("sách")) {
      return [
        { label: "Blog: 0 → 6 bài", name: "Số bài viết blog xuất bản", baseline: "0", target: "6" },
        { label: "Trang sách: 0 → 200", name: "Số trang sách đã viết xong", baseline: "0", target: "200" },
        { label: "Từ viết: 0 → 5000 từ/tuần", name: "Số từ viết ra mỗi tuần", baseline: "0", target: "5000" },
        { label: "Người đọc: 0 → 100 người", name: "Số người đọc mới mỗi tháng", baseline: "0", target: "100" },
      ];
    }
    if (text.includes("đọc") || text.includes("sách")) {
      return [
        { label: "Sách: 0 → 12 cuốn", name: "Số cuốn sách đọc xong", baseline: "0", target: "12" },
        { label: "Trang: 0 → 30 trang/ngày", name: "Số trang sách đọc/ngày", baseline: "0", target: "30" },
        { label: "Phút đọc: 0 → 30 phút/ngày", name: "Số phút đọc sách mỗi ngày", baseline: "0", target: "30" },
      ];
    }
    if (text.includes("sức khỏe") || text.includes("ngủ") || text.includes("ăn uống")) {
      return [
        { label: "Giờ ngủ: 5 → 7 tiếng", name: "Số giờ ngủ trung bình/đêm", baseline: "5", target: "7" },
        { label: "Bữa ăn lành mạnh: 0 → 5 bữa/tuần", name: "Số bữa ăn lành mạnh/tuần", baseline: "0", target: "5" },
        { label: "Bước chân: 3.000 → 8.000", name: "Số bước chân/ngày", baseline: "3000", target: "8000" },
      ];
    }
    if (text.includes("gia đình") || text.includes("người thân") || text.includes("bố mẹ")) {
      return [
        { label: "Bữa tối: 0 → 4 buổi/tuần", name: "Số bữa tối sum họp/tuần", baseline: "0", target: "4" },
        { label: "Trò chuyện: 0 → 30 phút/ngày", name: "Số phút trò chuyện/ngày", baseline: "0", target: "30" },
      ];
    }
    switch (activeArchetype) {
      case "habit_building":
        return [
          { label: "Chạy bộ: 0 → 3 buổi/tuần", name: "Số buổi chạy bộ/tuần", baseline: "0", target: "3" },
          { label: "Đọc sách: 0 → 30 trang/ngày", name: "Số trang sách đã đọc/ngày", baseline: "0", target: "30" },
          { label: "Ngủ đủ: 5 → 7 tiếng/đêm", name: "Số giờ ngủ/đêm", baseline: "5", target: "7" },
          { label: "Thiền: 0 → 15 phút/ngày", name: "Số phút thiền/ngày", baseline: "0", target: "15" },
        ];
      case "skill_learning":
        return [
          { label: "React: 0 → 12 chương", name: "Số chương React hoàn thành", baseline: "0", target: "12" },
          { label: "Tiếng Anh: 0 → 300 từ", name: "Số từ vựng tiếng Anh học được", baseline: "0", target: "300" },
          { label: "Design: 0 → 20 bài thực hành", name: "Số bài thực hành thiết kế", baseline: "0", target: "20" },
          { label: "Khóa học: 0 → 3 chứng chỉ", name: "Số chứng chỉ hoàn thành", baseline: "0", target: "3" },
        ];
      case "project_completion":
        return [
          { label: "Dự án: 0 → 1 sản phẩm hoàn chỉnh", name: "Số dự án hoàn thành", baseline: "0", target: "1" },
          { label: "Tài liệu: 0 → 10 trang", name: "Số trang tài liệu viết", baseline: "0", target: "10" },
          { label: "Người dùng: 0 → 50 beta tester", name: "Số người dùng thử nghiệm", baseline: "0", target: "50" },
        ];
      case "financial_goal":
        return [
          { label: "Quỹ khẩn cấp: 0 → 20 triệu", name: "Số tiền tích lũy (triệu)", baseline: "0", target: "20" },
          { label: "Chi tiêu: 0 → 15% giảm", name: "Tỷ lệ cắt giảm chi tiêu (%)", baseline: "0", target: "15" },
          { label: "Thu nhập phụ: 0 → 5 triệu", name: "Thu nhập thêm (triệu)", baseline: "0", target: "5" },
        ];
      default:
        return [
          { label: "Hành động: 0 → 10 lần", name: "Số lần thực hiện hành động", baseline: "0", target: "10" },
          { label: "Thiền: 0 → 15 phút/ngày", name: "Số phút ngồi thiền hàng ngày", baseline: "0", target: "15" },
          { label: "Đọc sách: 0 → 20 trang/ngày", name: "Số trang sách đọc/ngày", baseline: "0", target: "20" },
        ];
    }
  })();

  const hasBaseline = smartData.measurable.baseline_value.trim().length > 0 && parsedBaselineValue !== undefined;
  const hasTarget = smartData.measurable.target_value.trim().length > 0 && parsedTargetValue !== undefined;
  const unit = smartData.measurable.metric_name.trim()
    ? smartData.measurable.metric_name.includes("/")
      ? smartData.measurable.metric_name.split("/")[1].trim()
      : smartData.measurable.metric_name.trim()
    : "đơn vị";
  let growthPct = 0;
  let infoText = "";
  const themeColor = "bg-app-accent";
  let StatusIcon = Target;
  if (hasTarget) {
    const baseline = hasBaseline ? (parsedBaselineValue ?? 0) : 0;
    const target = parsedTargetValue ?? 0;
    const diff = target - baseline;
    growthPct = baseline > 0 ? (diff / baseline) * 100 : 100;
    if (growthPct <= 20) {
      infoText = "Mức độ khả thi cao!";
      StatusIcon = Target;
    } else if (growthPct <= 50) {
      infoText = "Mục tiêu thách thức vừa phải!";
      StatusIcon = Flame;
    } else {
      infoText = "Mục tiêu khá tham vọng.";
      StatusIcon = Flame;
    }
  } else {
    infoText = "Chinh phục cột mốc mới từ con số 0!";
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
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
            placeholder="Ví dụ: Số buổi chạy bộ, Số tiền tiết kiệm..."
            value={metricNameInput}
            onChange={(event) => handleNameChange(event.target.value)}
            onBlur={() => setBlurredFields((previous) => ({ ...previous, metricName: true }))}
            className={inputClass}
            aria-invalid={showMetricNameError}
            aria-describedby="smart-metric-name-hint"
          />
          <p id="smart-metric-name-hint" className={helperTextClass}>
            Con số để đo tiến trình mỗi tuần.
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
            className={inputClass}
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5 items-center select-none">
            {unitSuggestions.map((unitItem) => (
              <button
                key={unitItem}
                type="button"
                onClick={() => handleUnitChange(unitItem)}
                className={cn(
                  "inline-flex min-h-8 items-center justify-center text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none",
                  metricUnitInput === unitItem
                    ? "bg-app-accent text-white border-app-accent"
                    : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/15",
                )}
              >
                {unitItem}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 bg-app-surface p-4 rounded-[14px] border border-app-line/60 sm:grid-cols-2">
        <div>
          <label htmlFor="smart-baseline" className={labelClass}>
            Mức xuất phát <span className="text-app-ink-muted font-normal">(Tùy chọn)</span>
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
              className={cn(inputClass, activeMetricUnit ? "pr-24 sm:pr-28" : undefined)}
              aria-invalid={baselineInvalid}
            />
            {activeMetricUnit ? (
              <span className="pointer-events-none absolute right-2 top-1/2 max-w-[7.5rem] -translate-y-1/2 truncate rounded-full bg-app-bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-app-ink-muted">
                {activeMetricUnit}
              </span>
            ) : null}
          </div>
          <p id="smart-baseline-hint" className={helperTextClass}>
            Giá trị hiện tại; chưa có thì để trống.
          </p>
          {baselineInvalid ? <FieldError id="smart-baseline-error" message="Nhập con số hợp lệ." /> : null}
        </div>
        <div>
          <label htmlFor="smart-target" className={labelClass}>
            Mức đích
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
              placeholder="Ví dụ: 3, 7.0..."
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
              className={cn(inputClass, activeMetricUnit ? "pr-24 sm:pr-28" : undefined)}
              aria-invalid={showTargetError}
            />
            {activeMetricUnit ? (
              <span className="pointer-events-none absolute right-2 top-1/2 max-w-[7.5rem] -translate-y-1/2 truncate rounded-full bg-app-bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-app-ink-muted">
                {activeMetricUnit}
              </span>
            ) : null}
          </div>
          <p id="smart-target-hint" className={helperTextClass}>
            Phải cao hơn mức xuất phát.
          </p>
          {targetNotAboveBaseline ? (
            <FieldError id="smart-target-error" message="Mục tiêu cần lớn hơn mốc hiện tại" role="alert" />
          ) : null}
          {showTargetError && !targetNotAboveBaseline ? (
            <FieldError id="smart-target-required-error" message="Nhập mốc hợp lệ." role="alert" />
          ) : null}
        </div>
      </div>

      {hasTarget && (
        <div className="rounded-[14px] border border-app-line bg-app-bg-subtle/50 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold select-none">
            <span className="text-app-ink-soft">Khoảng cách mục tiêu</span>
            <span className="text-app-accent font-extrabold">
              {hasBaseline ? `Tăng +${growthPct.toFixed(0)}%` : "Bắt đầu từ 0"}
            </span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-app-line overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn("h-full rounded-full", themeColor)}
            />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-app-ink-muted select-none">
            <span>{hasBaseline ? `Bắt đầu: ${parsedBaselineValue ?? 0} ${unit}` : `Khởi điểm: 0 ${unit}`}</span>
            <span className="inline-flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-app-accent" aria-hidden="true" /> Đích: {parsedTargetValue ?? 0} {unit}
            </span>
          </div>
          <div className="rounded-xl bg-app-surface border border-app-line px-3 py-2 text-xs text-app-ink-soft flex items-center gap-2">
            <span className="flex-shrink-0">
              <StatusIcon className="h-4 w-4 text-app-accent" aria-hidden="true" />
            </span>
            <span>{infoText}</span>
          </div>
        </div>
      )}

      {/* Suggestions + tips */}
      <div className="rounded-[14px] border border-app-line bg-app-accent-subtle/20 p-3.5 space-y-3">
        <div>
          <p className="text-[11px] font-semibold text-app-accent mb-2 flex items-center gap-1.5 select-none">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Gợi ý đo lường nhanh
          </p>
          <div className="grid gap-2 select-none sm:grid-cols-2">
            {suggestions.map((suggestion) => (
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
                className="flex min-h-12 w-full items-start rounded-xl border border-app-line bg-app-surface px-3 py-2.5 text-left text-xs font-semibold leading-5 text-app-ink shadow-sm transition-all duration-150 hover:border-app-accent/20 hover:bg-app-accent-soft/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 cursor-pointer"
              >
                <span className="break-words">{suggestion.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-app-line/50 pt-2.5 select-none">
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-app-ink-muted hover:text-app-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:rounded-sm"
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            {showTips ? "Thu gọn mẹo đo lường" : "Mẹo chọn chỉ số"}
            {showTips ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
          </button>

          {showTips && (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-app-accent/10 bg-app-accent-soft/40 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent mt-0.5">
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-app-accent">Nên đo được:</p>
                  <p className="mt-0.5 text-app-ink-soft italic">
                    "Số buổi vận động/tuần" hoặc "Số tiền tích lũy (triệu VNĐ)."
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-rose-500/10 bg-rose-50/30 dark:bg-rose-950/5 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 mt-0.5">
                  <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-rose-750 dark:text-rose-400">Tránh chung chung:</p>
                  <p className="mt-0.5 text-app-ink-soft italic">
                    "Học tập chăm chỉ hơn" hoặc "Vận động nhiều hơn."
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {intentMetricHint && (
        <div
          data-testid="smart-intent-metric-hint"
          id="smart-metric-intent-hint"
          role="note"
          className="flex items-start gap-2 rounded-[14px] border border-app-line bg-app-bg p-3 text-xs leading-relaxed text-app-ink-soft"
        >
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <span>
            <span className="font-medium text-app-ink">Gợi ý:</span> {intentMetricHint}
          </span>
        </div>
      )}

      <ArchetypeHint archetype={activeArchetype} variant="metric" />
      <GoalArchetypeExamples archetype={intentArchetype} variant="metric" />
    </div>
  );
}