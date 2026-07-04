import { Calendar, Hourglass } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { cn } from "@/app/components/ui/utils";
import { formatDisplayDate } from "@/app/utils/storage-date-utils";
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
  focusArea?: string;
}

export function TimeBoundStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
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

  const milestoneMessage = (() => {
    if (parsedTargetWeeks === 12) return "Chu kỳ vàng 12 tuần giúp tối đa hóa khả năng thực thi.";
    if (parsedTargetWeeks <= 4) return "Thử thách ngắn hạn giúp bạn tập trung tuyệt đối.";
    if (parsedTargetWeeks >= 16) return "Hành trình dài hơi đòi hỏi kiên trì đều đặn.";
    return null;
  })();

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Chọn cách chốt thời hạn">
        <label
          className={cn(
            "relative flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-app-accent has-[:focus-visible]:ring-offset-2",
            smartData.timeBound.mode === "weeks"
              ? "border-app-accent bg-app-accent-soft text-app-accent shadow-sm"
              : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
          )}
        >
          <input
            type="radio"
            name="timebound-mode"
            value="weeks"
            checked={smartData.timeBound.mode === "weeks"}
            onChange={() =>
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
            className="sr-only"
          />
          <Hourglass className="h-4 w-4" aria-hidden="true" />
          Theo số tuần
        </label>
        <label
          className={cn(
            "relative flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-app-accent has-[:focus-visible]:ring-offset-2",
            smartData.timeBound.mode === "date"
              ? "border-app-accent bg-app-accent-soft text-app-accent shadow-sm"
              : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
          )}
        >
          <input
            type="radio"
            name="timebound-mode"
            value="date"
            checked={smartData.timeBound.mode === "date"}
            onChange={() =>
              setSmartData((previous) => ({
                ...previous,
                timeBound: {
                  ...previous.timeBound,
                  mode: "date",
                },
              }))
            }
            className="sr-only"
          />
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Theo ngày cụ thể
        </label>
      </div>

      {smartData.timeBound.mode === "weeks" ? (
        <div className="space-y-4">
          <label htmlFor="smart-target-weeks-slider" className={cn(labelClass, "flex items-center gap-1.5")}>
            <Calendar className="h-4 w-4 text-app-accent" />
            Bạn muốn hoàn thành trong bao nhiêu tuần?
            <span className={requiredMarkerClass} aria-hidden="true">
              *
            </span>
            <span className="sr-only"> bắt buộc</span>
          </label>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
            <div
              className={cn(
                "flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed transition-all duration-300 bg-app-surface",
                parsedTargetWeeks === 12
                  ? "border-app-accent/30 text-app-accent"
                  : parsedTargetWeeks <= 6
                    ? "border-app-status-success/30 text-app-status-success"
                    : "border-app-line text-app-ink-soft"
              )}
            >
              <span className="text-3xl font-extrabold tabular-nums tracking-[-0.03em]">{parsedTargetWeeks}</span>
              <span className="text-[10px] font-bold text-current/75">tuần</span>
            </div>

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
                <span className="text-app-accent font-semibold">12 tuần (Khuyên dùng)</span>
                <span>24 tuần</span>
              </div>

              {milestoneMessage && (
                <div className="rounded-xl border border-app-accent/30 bg-app-accent-soft/30 text-app-accent px-3 py-2 text-xs font-semibold flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-app-accent" />
                  <span>{milestoneMessage}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {["4", "8", "12", "16"].map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => {
                  handleWeeksChange(weeks);
                  setBlurredFields((previous) => ({ ...previous, targetWeeks: true }));
                }}
                className={cn(
                  "inline-flex min-h-9 items-center justify-center text-xs px-3 py-1.5 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none",
                  parsedTargetWeeks === Number(weeks)
                    ? "bg-app-accent text-white border-app-accent shadow-app-md shadow-app-accent/20"
                    : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/10"
                )}
              >
                {weeks} tuần {weeks === "12" ? " (Khuyên dùng)" : ""}
              </button>
            ))}
          </div>

          <p className={cn(helperTextClass, "!mt-2")}>
            Hệ thống 12 tuần giúp chia nhỏ kế hoạch hành động dễ dàng hơn.
          </p>
          {showTargetWeeksError ? (
            <FieldError id="smart-target-weeks-error" message="Nhập số tuần mục tiêu lớn hơn 0." role="alert" />
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <label htmlFor="smart-target-date" className={cn(labelClass, "flex items-center gap-1.5")}>
            <Calendar className="h-4 w-4 text-app-accent" />
            Chọn ngày hoàn thành
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

          <div className="flex flex-wrap gap-2 items-center">
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
                    "inline-flex min-h-9 items-center justify-center text-xs px-3 py-1.5 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none",
                    isSelected
                      ? "bg-app-accent text-white border-app-accent shadow-app-md shadow-app-accent/20"
                      : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/10"
                  )}
                >
                  Sau {weeks} tuần
                </button>
              );
            })}
          </div>

          {smartData.timeBound.target_date ? (
            <p className="text-xs text-app-ink-soft">Đã chọn: {formatDisplayDate(smartData.timeBound.target_date)}</p>
          ) : null}

          <p className={cn(helperTextClass, "!mt-2")}>
            Chọn một thời hạn thực tế. Ví dụ 12 tuần sẽ rơi vào ngày: {" "}
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
    </div>
  );
}
