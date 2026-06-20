import { Calendar, Hourglass } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { cn } from "@/app/components/ui/utils";
import { formatDisplayDate } from "@/app/utils/storage-date-utils";
import { parseNumberInput } from "@/lib/smart-goal";
import type { QualityLevel } from "@/lib/smart-goal/quality";

import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import { DEFAULT_TARGET_WEEKS } from "../constants";
import type { GoalClarityItem, SMARTData, SmartGoalSummaryRow, SmartStepKey } from "../types";
import { helperTextClass, inputClass, labelClass, requiredMarkerClass } from "./formStyles";
import { QualityFeedbackPanel } from "./QualityFeedbackPanel";
import { ReviewStep } from "./ReviewStep";

interface TimeBoundStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
  clarityItems: GoalClarityItem[];
  clarityDoneCount: number;
  summaryRows: SmartGoalSummaryRow[];
  onJumpToStep: (stepKey: SmartStepKey) => void;
  qualityFeedback: {
    level: QualityLevel;
    overallScore: number;
    warnings: string[];
    suggestions: string[];
    canProceedToFeasibility: boolean;
  } | null;
  focusArea?: string;
}

export function TimeBoundStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
  clarityItems,
  clarityDoneCount,
  summaryRows,
  onJumpToStep,
  qualityFeedback,
}: TimeBoundStepProps) {
  const [blurredFields, setBlurredFields] = useState({ targetWeeks: false, targetDate: false });
  const parsedTargetWeeks = parseNumberInput(smartData.timeBound.target_weeks) ?? 0;
  const targetWeeksInvalid =
    smartData.timeBound.mode === "weeks" && (parsedTargetWeeks === undefined || parsedTargetWeeks <= 0);
  const targetDateInvalid = smartData.timeBound.mode === "date" && smartData.timeBound.target_date.trim().length === 0;
  const showTargetWeeksError = targetWeeksInvalid && (blurredFields.targetWeeks || currentStepHasDraftContent);
  const showTargetDateError = targetDateInvalid && (blurredFields.targetDate || currentStepHasDraftContent);

  const handleWeeksChange = (val: string) => {
    setSmartData((previous) => ({
      ...previous,
      timeBound: {
        ...previous.timeBound,
        target_weeks: val,
      },
    }));
  };

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      <p className="text-sm leading-6 text-app-ink-soft">Chọn cách chốt thời hạn phù hợp với bạn.</p>

      {/* Selector chọn chế độ */}
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Chọn cách chốt thời hạn">
        {/* biome-ignore lint/a11y/useSemanticElements: using button with role="radio" is intentional for custom layout styling */}
        <button
          type="button"
          role="radio"
          aria-checked={smartData.timeBound.mode === "weeks"}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 cursor-pointer",
            smartData.timeBound.mode === "weeks"
              ? "border-app-accent bg-app-accent-soft text-app-accent shadow-sm"
              : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:text-app-ink",
          )}
          onClick={() =>
            setSmartData((previous) => ({
              ...previous,
              timeBound: {
                ...previous.timeBound,
                mode: "weeks",
                target_date: "",
                target_weeks: previous.timeBound.target_weeks || DEFAULT_TARGET_WEEKS,
              },
            }))
          }
        >
          <Hourglass className="h-4 w-4" />
          Theo số tuần
        </button>
        {/* biome-ignore lint/a11y/useSemanticElements: using button with role="radio" is intentional for custom layout styling */}
        <button
          type="button"
          role="radio"
          aria-checked={smartData.timeBound.mode === "date"}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 cursor-pointer",
            smartData.timeBound.mode === "date"
              ? "border-app-accent bg-app-accent-soft text-app-accent shadow-sm"
              : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:text-app-ink",
          )}
          onClick={() =>
            setSmartData((previous) => ({
              ...previous,
              timeBound: {
                ...previous.timeBound,
                mode: "date",
              },
            }))
          }
        >
          <Calendar className="h-4 w-4" />
          Theo ngày cụ thể
        </button>
      </div>

      {smartData.timeBound.mode === "weeks" ? (
        <div className="pb-6 mb-6 border-b border-dashed border-app-line/80 space-y-4 relative bg-transparent shadow-none p-0 border-0">
          <label htmlFor="smart-target-weeks-slider" className={cn(labelClass, "text-base font-bold text-app-ink")}>
            Số tuần bạn cam kết hoàn thành mục tiêu
            <span className={requiredMarkerClass} aria-hidden="true">
              *
            </span>
            <span className="sr-only"> bắt buộc</span>
          </label>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Vòng hiển thị số tuần */}
            <div
              className={cn(
                "flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed transition-all duration-300 shadow-[2px_4px_12px_rgba(44,38,33,0.04)] relative rotate-[-1.5deg] bg-app-surface",
                parsedTargetWeeks === 12
                  ? "border-app-accent/30 text-app-accent"
                  : parsedTargetWeeks <= 6
                    ? "border-app-status-success/30 text-app-status-success"
                    : "border-app-line text-app-ink-soft",
              )}
            >
              {/* Kẹp giấy giả lập */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-app-line-strong rounded-full border border-app-line-strong opacity-80 z-10 flex items-center justify-center">
                <div className="w-1.5 h-2.5 border border-app-ink-muted rounded-full" />
              </div>
              <span className="text-3xl font-serif italic font-extrabold tracking-tight mt-1">{parsedTargetWeeks}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest">tuần</span>
            </div>

            {/* Slider chọn tuần */}
            <div className="w-full space-y-3">
              <input
                id="smart-target-weeks-slider"
                type="range"
                min="1"
                max="24"
                step="1"
                value={parsedTargetWeeks || 12}
                onChange={(e) => handleWeeksChange(e.target.value)}
                onBlur={() => setBlurredFields((previous) => ({ ...previous, targetWeeks: true }))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-app-line accent-app-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2"
                aria-invalid={showTargetWeeksError}
                aria-describedby={showTargetWeeksError ? "smart-target-weeks-error" : undefined}
              />

              <div className="flex items-center justify-between text-xs text-app-ink-muted">
                <span>1 tuần</span>
                <span className="text-app-accent font-semibold">12 tuần (Chu kỳ chuẩn)</span>
                <span>24 tuần</span>
              </div>

              {/* Card mốc ngày dự kiến được thiết kế lại đẹp mắt, đầy cảm hứng */}
              <div className="rounded-xl border border-dashed border-app-line bg-app-surface dark:bg-app-surface/50 px-4 py-3 flex items-center gap-3 shadow-none">
                <Calendar className="h-5 w-5 text-app-accent shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-app-accent font-extrabold">
                    Thời khắc cán đích dự kiến
                  </p>
                  <p className="text-xs font-semibold text-app-ink mt-0.5">
                    {(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + parsedTargetWeeks * 7);
                      return d.toLocaleDateString("vi-VN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    })()}
                  </p>
                </div>
              </div>

              {/* Thông điệp chánh niệm theo số tuần đã chọn */}
              {(() => {
                if (parsedTargetWeeks === 12) {
                  return (
                    <div className="rounded-xl border border-app-accent/30 bg-app-accent-soft/30 text-app-accent px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-all duration-300">
                      <span className="flex h-2 w-2 rounded-full bg-app-accent animate-pulse" />
                      <span>Chu kỳ vàng 12 tuần giúp tối đa hóa khả năng thực thi và giữ sự tập trung cao độ!</span>
                    </div>
                  );
                }
                if (parsedTargetWeeks <= 4) {
                  return (
                    <div className="rounded-xl border border-app-status-success/30 bg-app-status-success/10 text-app-status-success px-3 py-2 text-xs font-semibold flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-app-status-success" />
                      <span>Thử thách ngắn hạn giúp bạn tập trung tuyệt đối vào mục tiêu trước mắt!</span>
                    </div>
                  );
                }
                if (parsedTargetWeeks >= 16) {
                  return (
                    <div className="rounded-xl border border-app-status-info/30 bg-app-status-info/10 text-app-status-info px-3 py-2 text-xs font-semibold flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-app-status-info" />
                      <span>Hành trình dài hơi đòi hỏi sự kiên trì và kỷ luật đều đặn mỗi tuần!</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* 1-Click Weeks Suggestions */}
          <div className="mt-4 bg-app-bg-subtle/30 dark:bg-app-bg-subtle/15 p-3 rounded-xl border border-dashed border-app-line/80">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-app-accent mb-2 flex items-center gap-1.5 select-none">
              <span>💡</span> Chọn nhanh số tuần:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none snap-x">
              {["4", "8", "12", "16"].map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() => {
                    handleWeeksChange(weeks);
                    setBlurredFields((previous) => ({ ...previous, targetWeeks: true }));
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center text-xs px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm cursor-pointer whitespace-nowrap snap-start flex-shrink-0 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none",
                    parsedTargetWeeks === Number(weeks)
                      ? "bg-app-accent text-white border-app-accent shadow-md shadow-app-accent/20"
                      : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/10",
                  )}
                >
                  {weeks} tuần {weeks === "12" ? " (Khuyên dùng)" : ""}
                </button>
              ))}
            </div>
          </div>

          <p className={helperTextClass}>
            Hệ thống 12 tuần giúp chia nhỏ kế hoạch hành động thành từng tuần dễ dàng hơn.
          </p>
          {showTargetWeeksError ? (
            <FieldError id="smart-target-weeks-error" message="Nhập số tuần mục tiêu lớn hơn 0." role="alert" />
          ) : null}
        </div>
      ) : (
        <div className="pb-6 mb-6 border-b border-dashed border-app-line/80 space-y-4 relative bg-transparent shadow-none p-0 border-0">
          <label htmlFor="smart-target-date" className={cn(labelClass, "text-base font-bold text-app-ink")}>
            Ngày bạn muốn hoàn thành mục tiêu
            <span className={requiredMarkerClass} aria-hidden="true">
              *
            </span>
            <span className="sr-only"> bắt buộc</span>
          </label>
          <Input
            id="smart-target-date"
            type="date"
            value={smartData.timeBound.target_date}
            onChange={(event) =>
              setSmartData((previous) => ({
                ...previous,
                timeBound: {
                  ...previous.timeBound,
                  target_date: event.target.value,
                },
              }))
            }
            onBlur={() => setBlurredFields((previous) => ({ ...previous, targetDate: true }))}
            className={inputClass}
            aria-invalid={showTargetDateError}
            aria-describedby={showTargetDateError ? "smart-target-date-error" : undefined}
          />
          {smartData.timeBound.target_date ? (
            <p className="mt-1 text-xs text-app-ink-soft">
              Đã chọn: {formatDisplayDate(smartData.timeBound.target_date)}
            </p>
          ) : null}

          {/* 1-Click Date Suggestions */}
          <div className="mt-4 bg-app-bg-subtle/30 dark:bg-app-bg-subtle/15 p-3 rounded-xl border border-dashed border-app-line/80">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-app-accent mb-2 flex items-center gap-1.5 select-none">
              <span>💡</span> Chọn nhanh mốc thời gian:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none snap-x">
              {[4, 8, 12].map((weeks) => {
                const getFutureDateString = (w: number): string => {
                  const date = new Date();
                  date.setDate(date.getDate() + w * 7);
                  return date.toISOString().split("T")[0];
                };
                const futureDate = getFutureDateString(weeks);
                const isSelected = smartData.timeBound.target_date === futureDate;
                return (
                  <button
                    key={weeks}
                    type="button"
                    onClick={() => {
                      setSmartData((previous) => ({
                        ...previous,
                        timeBound: {
                          ...previous.timeBound,
                          target_date: futureDate,
                        },
                      }));
                      setBlurredFields((previous) => ({ ...previous, targetDate: true }));
                    }}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center text-xs px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm cursor-pointer whitespace-nowrap snap-start flex-shrink-0 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none",
                      isSelected
                        ? "bg-app-accent text-white border-app-accent shadow-md shadow-app-accent/20"
                        : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/10",
                    )}
                  >
                    Sau {weeks} tuần ({weeks === 12 ? "12 tuần" : `${weeks} tuần`})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card mốc ngày dự kiến được thiết kế lại đẹp mắt, đầy cảm hứng cho chế độ chọn ngày */}
          {smartData.timeBound.target_date && (
            <div className="rounded-xl border border-dashed border-app-line bg-app-surface dark:bg-app-surface/50 px-4 py-3 flex items-center gap-3 shadow-none">
              <Calendar className="h-5 w-5 text-app-accent shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-app-accent font-extrabold">
                  Thời gian thực thi dự kiến
                </p>
                <p className="text-xs font-semibold text-app-ink mt-0.5">
                  {(() => {
                    const diffTime = new Date(smartData.timeBound.target_date).getTime() - Date.now();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const diffWeeks = Math.ceil(diffDays / 7);
                    if (diffDays <= 0) return "Ngày đã chọn nằm ở quá khứ";
                    return `khoảng ~${diffWeeks} tuần (${diffDays} ngày)`;
                  })()}
                </p>
              </div>
            </div>
          )}

          <p className={helperTextClass}>
            Chọn một thời hạn thực tế. Ví dụ chu kỳ chuẩn 12 tuần sẽ rơi vào ngày:{" "}
            <span className="font-semibold text-app-ink">
              {(() => {
                const d = new Date();
                d.setDate(d.getDate() + 12 * 7);
                return d.toLocaleDateString("vi-VN");
              })()}
            </span>
            .
          </p>
          {showTargetDateError ? (
            <FieldError id="smart-target-date-error" message="Chọn ngày mục tiêu cho kế hoạch này." role="alert" />
          ) : null}
        </div>
      )}

      {/* Bảng Checklist Chẩn đoán SMART & Xem lại mục tiêu trực quan, to rõ */}
      <div className="mt-8 pt-6 border-t border-app-line/80 space-y-4">
        <div className="rounded-[18px] bg-gradient-to-br from-teal-50/[0.04] to-indigo-50/[0.02] dark:from-teal-950/[0.06] dark:to-indigo-950/[0.03] border border-app-line p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-app-accent animate-pulse" />
            <h4 className="text-sm font-bold text-app-accent uppercase tracking-wider">
              Checklist Chẩn đoán SMART &amp; Xem lại mục tiêu
            </h4>
          </div>
          <p className="text-xs text-app-ink-soft leading-relaxed mb-5">
            Đánh giá toàn diện các tiêu chí cụ thể (S), đo lường (M), khả thi (A), liên quan (R) và thời hạn (T) trước
            khi chốt mục tiêu.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <ReviewStep
              clarityDoneCount={clarityDoneCount}
              clarityItemCount={clarityItems.length}
              summaryRows={summaryRows}
              onJumpToStep={onJumpToStep}
            />
            {qualityFeedback && (
              <QualityFeedbackPanel
                level={qualityFeedback.level}
                overallScore={qualityFeedback.overallScore}
                warnings={qualityFeedback.warnings}
                suggestions={qualityFeedback.suggestions}
                canProceedToFeasibility={qualityFeedback.canProceedToFeasibility}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
