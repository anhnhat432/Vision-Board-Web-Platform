import type { Dispatch, SetStateAction } from "react";

import { parseNumberInput } from "@/lib/smart-goal";

import { Input } from "../../../components/ui/input";
import { DEFAULT_TARGET_WEEKS } from "../constants";
import type { SMARTData } from "../types";
import { helperTextClass, inputClass, labelClass } from "./formStyles";

interface TimeBoundStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
}

export function TimeBoundStep({ smartData, setSmartData }: TimeBoundStepProps) {
  const parsedTargetWeeks = parseNumberInput(smartData.timeBound.target_weeks);
  const targetWeeksInvalid =
    smartData.timeBound.mode === "weeks" && (parsedTargetWeeks === undefined || parsedTargetWeeks <= 0);
  const targetDateInvalid = smartData.timeBound.mode === "date" && smartData.timeBound.target_date.trim().length === 0;

  return (
    <div className="space-y-5">
      <p className="text-[14px] leading-6 text-app-ink-soft">Chọn cách chốt thời hạn phù hợp với bạn.</p>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Chọn cách chốt thời hạn">
        <button
          type="button"
          aria-pressed={smartData.timeBound.mode === "weeks"}
          className={
            smartData.timeBound.mode === "weeks"
              ? "rounded-lg border border-app-accent bg-app-accent-soft px-4 py-2.5 text-[14px] font-medium text-app-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              : "rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-[14px] font-medium text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
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
              ? "rounded-lg border border-app-accent bg-app-accent-soft px-4 py-2.5 text-[14px] font-medium text-app-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              : "rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-[14px] font-medium text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
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
            className={inputClass}
            aria-invalid={targetWeeksInvalid}
          />
          <p className={helperTextClass}>12 tuần phù hợp nhất với bước lập kế hoạch tiếp theo.</p>
        </div>
      ) : (
        <div>
          <label htmlFor="smart-target-date" className={labelClass}>
            Ngày mục tiêu
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
            className={inputClass}
            aria-invalid={targetDateInvalid}
          />
          <p className={helperTextClass}>Chọn ngày đủ rõ để nhìn lại tiến độ.</p>
        </div>
      )}
    </div>
  );
}
