import { useState, type Dispatch, type SetStateAction } from "react";

import { parseNumberInput } from "@/lib/smart-goal";

import { Input } from "../../../components/ui/input";
import { DEFAULT_TARGET_WEEKS } from "../constants";
import type { SMARTData } from "../types";
import { errorTextClass, helperTextClass, inputClass, labelClass, requiredMarkerClass } from "./formStyles";

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
              ? "rounded-lg border border-app-accent bg-app-accent-soft px-4 py-2.5 text-sm font-medium text-app-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              : "rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
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
              ? "rounded-lg border border-app-accent bg-app-accent-soft px-4 py-2.5 text-sm font-medium text-app-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              : "rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
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
          <p className={helperTextClass}>12 tuần phù hợp nhất với bước lập kế hoạch tiếp theo.</p>
          {showTargetWeeksError ? (
            <p id="smart-target-weeks-error" className={errorTextClass} role="alert">
              Nhập số tuần mục tiêu lớn hơn 0.
            </p>
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
          <p className={helperTextClass}>Chọn ngày đủ rõ để nhìn lại tiến độ.</p>
          {showTargetDateError ? (
            <p id="smart-target-date-error" className={errorTextClass} role="alert">
              Chọn ngày mục tiêu cho kế hoạch này.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
