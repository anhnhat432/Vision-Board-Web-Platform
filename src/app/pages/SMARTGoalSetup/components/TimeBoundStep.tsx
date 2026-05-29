import { useState, type Dispatch, type SetStateAction } from "react";
import { Calendar, Hourglass } from "lucide-react";

import { parseNumberInput } from "@/lib/smart-goal";
import { cn } from "@/app/components/ui/utils";

import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import { DEFAULT_TARGET_WEEKS } from "../constants";
import type { SMARTData } from "../types";
import { helperTextClass, inputClass, labelClass, requiredMarkerClass } from "./formStyles";

interface TimeBoundStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
}

export function TimeBoundStep({ smartData, setSmartData, currentStepHasDraftContent }: TimeBoundStepProps) {
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
    <div className="space-y-6">
      <p className="text-sm leading-6 text-app-ink-soft">Chọn cách chốt thời hạn phù hợp với bạn.</p>

      {/* Selector chọn chế độ */}
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Chọn cách chốt thời hạn">
        <button
          type="button"
          aria-pressed={smartData.timeBound.mode === "weeks"}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
            smartData.timeBound.mode === "weeks"
              ? "border-app-accent bg-app-accent-soft text-app-accent shadow-sm"
              : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
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
        <button
          type="button"
          aria-pressed={smartData.timeBound.mode === "date"}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
            smartData.timeBound.mode === "date"
              ? "border-app-accent bg-app-accent-soft text-app-accent shadow-sm"
              : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
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
        <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm space-y-4">
          <label htmlFor="smart-target-weeks-slider" className={labelClass}>
            Số tuần mục tiêu
            <span className={requiredMarkerClass} aria-hidden="true">*</span>
            <span className="sr-only"> bắt buộc</span>
          </label>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Vòng hiển thị số tuần */}
            <div className={cn(
              "flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border transition-all duration-300 shadow-sm",
              parsedTargetWeeks === 12
                ? "border-purple-500/30 text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30"
                : "border-app-line text-app-ink bg-app-bg"
            )}>
              <span className="text-3xl font-extrabold tracking-tight">{parsedTargetWeeks}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">tuần</span>
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
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-app-line accent-app-accent focus:outline-none"
                aria-invalid={showTargetWeeksError}
                aria-describedby={showTargetWeeksError ? "smart-target-weeks-error" : undefined}
              />
              
              <div className="flex items-center justify-between text-xs text-app-ink-muted">
                <span>1 tuần</span>
                <span className="text-purple-600 dark:text-purple-400 font-semibold">12 tuần (Chu kỳ chuẩn)</span>
                <span>24 tuần</span>
              </div>

              {parsedTargetWeeks === 12 && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2 animate-[pulse_2s_infinite]">
                  <span className="flex h-2 w-2 rounded-full bg-purple-500" />
                  <span>Chu kỳ vàng 12 tuần giúp tối đa hóa khả năng thực thi và tập trung!</span>
                </div>
              )}
            </div>
          </div>

          {/* 1-Click Weeks Suggestions */}
          <div className="mt-4 flex flex-wrap gap-2 items-center border-t border-app-line/60 pt-4">
            <span className="text-[10px] font-bold text-app-accent">Chọn nhanh:</span>
            {["4", "8", "12", "16"].map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => {
                  handleWeeksChange(weeks);
                  setBlurredFields((previous) => ({ ...previous, targetWeeks: true }));
                }}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm",
                  parsedTargetWeeks === Number(weeks)
                    ? "bg-app-accent text-white border-app-accent shadow-md shadow-app-accent/20"
                    : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/10"
                )}
              >
                {weeks} tuần {weeks === "12" ? " (Khuyên dùng)" : ""}
              </button>
            ))}
          </div>

          <p className={helperTextClass}>Hệ thống 12 tuần giúp chia nhỏ kế hoạch hành động thành từng tuần dễ dàng hơn.</p>
          {showTargetWeeksError ? (
            <FieldError id="smart-target-weeks-error" message="Nhập số tuần mục tiêu lớn hơn 0." role="alert" />
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm space-y-4">
          <label htmlFor="smart-target-date" className={labelClass}>
            Ngày mục tiêu
            <span className={requiredMarkerClass} aria-hidden="true">*</span>
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
          
          {/* 1-Click Date Suggestions */}
          <div className="mt-4 flex flex-wrap gap-2 items-center border-t border-app-line/60 pt-4">
            <span className="text-[10px] font-bold text-app-accent">Chọn nhanh:</span>
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
                    "text-xs px-3 py-1.5 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm",
                    isSelected
                      ? "bg-app-accent text-white border-app-accent shadow-md shadow-app-accent/20"
                      : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/10"
                  )}
                >
                  Sau {weeks} tuần ({weeks === 12 ? "12 tuần" : `${weeks} tuần`})
                </button>
              );
            })}
          </div>

          <p className={helperTextClass}>Hãy chọn một ngày rõ ràng trong tương lai để nhìn nhận lại kết quả mục tiêu.</p>
          {showTargetDateError ? (
            <FieldError id="smart-target-date-error" message="Chọn ngày mục tiêu cho kế hoạch này." role="alert" />
          ) : null}
        </div>
      )}
    </div>
  );
}
