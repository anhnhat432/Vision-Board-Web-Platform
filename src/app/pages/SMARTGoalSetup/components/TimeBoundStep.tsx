import { useState, type Dispatch, type SetStateAction } from "react";

import { parseNumberInput } from "@/lib/smart-goal";

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
  const parsedTargetWeeks = parseNumberInput(smartData.timeBound.target_weeks);
  const targetWeeksInvalid =
    smartData.timeBound.mode === "weeks" && (parsedTargetWeeks === undefined || parsedTargetWeeks <= 0);
  const targetDateInvalid = smartData.timeBound.mode === "date" && smartData.timeBound.target_date.trim().length === 0;
  const showTargetWeeksError = targetWeeksInvalid && (blurredFields.targetWeeks || currentStepHasDraftContent);
  const showTargetDateError = targetDateInvalid && (blurredFields.targetDate || currentStepHasDraftContent);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-app-ink-soft">Chọn cách chốt thời hạn phù hợp với bạn.</p>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Chọn cách chốt thời hạn">
        <button
          type="button"
          aria-pressed={smartData.timeBound.mode === "weeks"}
          className={
            smartData.timeBound.mode === "weeks"
              ? "rounded-[14px] border border-app-accent bg-app-accent-soft px-4 py-2.5 text-sm font-medium text-app-accent transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              : "rounded-[14px] border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink-soft transition-all duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
          }
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
          Theo số tuần
        </button>
        <button
          type="button"
          aria-pressed={smartData.timeBound.mode === "date"}
          className={
            smartData.timeBound.mode === "date"
              ? "rounded-[14px] border border-app-accent bg-app-accent-soft px-4 py-2.5 text-sm font-medium text-app-accent transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              : "rounded-[14px] border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink-soft transition-all duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
          }
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
          Theo ngày cụ thể
        </button>
      </div>

      {smartData.timeBound.mode === "weeks" ? (
        <div>
          <label htmlFor="smart-target-weeks" className={labelClass}>
            Số tuần mục tiêu
            <span className={requiredMarkerClass} aria-hidden="true">*</span>
            <span className="sr-only"> bắt buộc</span>
          </label>
          <Input
            id="smart-target-weeks"
            type="number"
            inputMode="numeric"
            min={1}
            value={smartData.timeBound.target_weeks}
            onChange={(event) =>
              setSmartData((previous) => ({
                ...previous,
                timeBound: {
                  ...previous.timeBound,
                  target_weeks: event.target.value,
                },
              }))
            }
            onBlur={() => setBlurredFields((previous) => ({ ...previous, targetWeeks: true }))}
            className={inputClass}
            aria-invalid={showTargetWeeksError}
            aria-describedby={showTargetWeeksError ? "smart-target-weeks-error" : undefined}
          />
          
          {/* 1-Click Weeks Suggestions */}
          <div className="mt-2.5 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold text-app-accent">Chọn nhanh:</span>
            {["4", "8", "12"].map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => {
                  setSmartData((previous) => ({
                    ...previous,
                    timeBound: {
                      ...previous.timeBound,
                      target_weeks: weeks,
                    },
                  }));
                  setBlurredFields((previous) => ({ ...previous, targetWeeks: true }));
                }}
                className="text-xs bg-app-accent-soft/30 hover:bg-app-accent-soft text-app-accent px-2.5 py-1 rounded-full border border-app-accent/10 transition-all duration-150 active:scale-[0.97]"
              >
                {weeks} tuần {weeks === "12" ? " (Khuyên dùng)" : ""}
              </button>
            ))}
          </div>

          <p className={helperTextClass}>12 tuần phù hợp nhất với bước lập kế hoạch tiếp theo.</p>
          {showTargetWeeksError ? (
            <FieldError id="smart-target-weeks-error" message="Nhập số tuần mục tiêu lớn hơn 0." role="alert" />
          ) : null}
        </div>
      ) : (
        <div>
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
          <div className="mt-2.5 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold text-app-accent">Chọn nhanh:</span>
            {[4, 8, 12].map((weeks) => {
              const getFutureDateString = (w: number): string => {
                const date = new Date();
                date.setDate(date.getDate() + w * 7);
                return date.toISOString().split("T")[0];
              };
              const futureDate = getFutureDateString(weeks);
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
                  className="text-xs bg-app-accent-soft/30 hover:bg-app-accent-soft text-app-accent px-2.5 py-1 rounded-full border border-app-accent/10 transition-all duration-150 active:scale-[0.97]"
                >
                  Sau {weeks} tuần ({weeks === 12 ? "12 tuần" : `${weeks} tuần`})
                </button>
              );
            })}
          </div>

          <p className={helperTextClass}>Chọn ngày đủ rõ để nhìn lại tiến độ.</p>
          {showTargetDateError ? (
            <FieldError id="smart-target-date-error" message="Chọn ngày mục tiêu cho kế hoạch này." role="alert" />
          ) : null}
        </div>
      )}
    </div>
  );
}
