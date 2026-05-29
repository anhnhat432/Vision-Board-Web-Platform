import { CalendarDays, Play, Flag, Calendar, Clock, Sliders } from "lucide-react";

import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/components/ui/utils";
import { formatDateInputValue } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { soundService } from "@/app/services/soundService";
import {
  errorTextClass,
  helperTextClass,
  inputClass,
  labelClass,
} from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import { REVIEW_DAYS } from "../constants";
import { getStartDateValidation } from "../helpers";
import type { TwelveWeekSetupDraft } from "../types";

interface ScheduleStepProps {
  draft: TwelveWeekSetupDraft;
  cycleStartDate: string;
  cycleEndDate: string;
  setupGuideSupport: AdaptiveTemplateSupport | null;
  setupGuideTemplate: TwelveWeekTemplateDefinition | null;
  hasPreviewTasks: boolean;
  weekOneTaskPreview: string[];
  weekOneTaskWarning: string | null;
  todayDateKey?: string;
  onChange: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
}

const REVIEW_DAY_SHORT_LABEL: Record<string, string> = {
  Monday: "T2",
  Tuesday: "T3",
  Wednesday: "T4",
  Thursday: "T5",
  Friday: "T6",
  Saturday: "T7",
  Sunday: "CN",
};

const LOAD_HINTS: Record<TwelveWeekSetupDraft["tacticLoadPreference"], string> = {
  lighter: "Tối giản. Phù hợp khi ít thời gian hoặc mới bắt đầu.",
  balanced: "Cân bằng. Phù hợp cho đa số để giữ nhịp bền bỉ.",
  push: "Tăng tốc. Đòi hỏi nhiều thời gian và năng lượng.",
};

export function ScheduleStepLab({
  draft,
  cycleStartDate,
  cycleEndDate,
  todayDateKey,
  onChange,
}: ScheduleStepProps) {
  const localTodayDateKey = todayDateKey ?? formatDateInputValue(new Date());
  const referenceDate = new Date(`${localTodayDateKey}T00:00:00`);
  const startDateValidation = getStartDateValidation(
    draft.startDate,
    Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate,
  );
  const startDateDescription = [
    "cycle-start-date-helper",
    startDateValidation.error ? "cycle-start-date-error" : null,
    startDateValidation.warning ? "cycle-start-date-warning" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      
      {/* KHU VỰC 1: BIỂU MẪU LỊCH TRÌNH CHÍNH */}
      <section
        className="relative overflow-hidden rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm space-y-6"
        aria-labelledby="schedule-main-title"
      >
        <div className="flex items-center gap-2.5 border-b border-app-line/60 pb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 id="schedule-main-title" className="text-xs font-extrabold uppercase tracking-wider text-app-accent">
              Chốt lịch trình & Nhịp độ thực thi
            </h3>
            <p className="mt-0.5 text-[11px] text-app-ink-muted">
              Xây dựng khung giờ cam kết thực thi đều đặn và có kỷ luật
            </p>
          </div>
        </div>

        {/* Ngày bắt đầu & Ngày kết thúc - Gom lên một hàng ngang */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="cycle-start-date" className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1")}>
              <Play className="h-4 w-4 text-app-accent" />
              <span>Ngày bắt đầu chu kỳ</span>
            </label>
            <Input
              id="cycle-start-date"
              type="date"
              value={draft.startDate}
              min={localTodayDateKey}
              aria-invalid={Boolean(startDateValidation.error)}
              aria-describedby={startDateDescription}
              className={cn(
                inputClass,
                startDateValidation.error && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-150"
              )}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
            {startDateValidation.error && (
              <p role="alert" className="text-[10px] font-bold text-red-500">
                {startDateValidation.error}
              </p>
            )}
            {startDateValidation.warning && (
              <p role="status" className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                {startDateValidation.warning}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cycle-end-date" className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1")}>
              <Flag className="h-4 w-4 text-app-accent" />
              <span>Ngày hoàn thành kế hoạch</span>
            </label>
            <Input
              id="cycle-end-date"
              value={cycleEndDate}
              readOnly
              className={cn(inputClass, "bg-slate-100/70 dark:bg-slate-900/60 text-app-ink-muted font-semibold cursor-not-allowed")}
            />
          </div>
        </div>

        {/* Ngày nhìn lại tuần (Reflection Day) */}
        <fieldset className="space-y-2">
          <legend className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1 mb-2")}>
            <Calendar className="h-4 w-4 text-app-accent" />
            <span>Ngày nhìn lại tuần (Reflection Day)</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {REVIEW_DAYS.map((day) => {
              const isActive = draft.reviewDay === day.value;
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    soundService.click();
                    onChange("reviewDay", day.value);
                  }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-200 active:scale-95",
                    isActive
                      ? "border-app-accent bg-app-accent text-white shadow-sm"
                      : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/40"
                  )}
                >
                  {REVIEW_DAY_SHORT_LABEL[day.value] ?? day.label}
                </button>
              );
            })}
          </div>
          <p className={helperTextClass}>
            Chọn một ngày cố định cuối tuần để tổng kết tuần cũ và lên kế hoạch tuần tiếp theo.
          </p>
        </fieldset>

        {/* Thời lượng dành cho mục tiêu mỗi ngày (dailyTimeBudget) */}
        <fieldset className="space-y-2 border-t border-app-line/40 pt-4">
          <legend className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1 mb-2")}>
            <Clock className="h-4 w-4 text-app-accent" />
            <span>Thời lượng hành động mỗi ngày</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { value: "30min", label: "30 phút", hint: "Tối giản" },
              { value: "1h", label: "1 giờ", hint: "Duy trì ổn định" },
              { value: "1.5h", label: "1.5 giờ", hint: "Tăng tốc nhẹ" },
              { value: "2h+", label: "2+ giờ", hint: "Chuyên sâu" },
            ].map((option) => {
              const isActive = draft.dailyTimeBudget === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    soundService.click();
                    onChange("dailyTimeBudget", option.value);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border bg-app-surface p-2.5 text-center text-xs transition-all duration-200 active:scale-[0.98]",
                    isActive
                      ? "border-app-accent bg-app-accent-soft/20 text-app-accent shadow-sm"
                      : "border-app-line text-app-ink-soft hover:border-app-accent/30"
                  )}
                >
                  <span className="font-bold text-xs">{option.label}</span>
                  <span className="text-[10px] opacity-75 mt-0.5 leading-none">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Mức tải hành động tuần đầu (tacticLoadPreference) */}
        <fieldset className="space-y-2 border-t border-app-line/40 pt-4">
          <legend className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1 mb-2")}>
            <Sliders className="h-4 w-4 text-app-accent" />
            <span>Mức tải hành động tuần đầu</span>
          </legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              { value: "lighter" as const, label: "Nhẹ nhàng" },
              { value: "balanced" as const, label: "Cân bằng" },
              { value: "push" as const, label: "Tăng tốc" },
            ].map((option) => {
              const isActive = draft.tacticLoadPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    soundService.click();
                    onChange("tacticLoadPreference", option.value);
                  }}
                  className={cn(
                    "flex flex-col items-start rounded-xl border bg-app-surface p-3 text-left transition-all duration-200 active:scale-[0.98]",
                    isActive
                      ? "border-app-accent bg-app-accent-soft/20 text-app-ink shadow-sm"
                      : "border-app-line text-app-ink-soft hover:border-app-accent/30"
                  )}
                >
                  <span className="font-bold text-xs text-app-ink">{option.label}</span>
                  <span className="text-[10px] text-app-ink-soft leading-snug mt-1">{LOAD_HINTS[option.value]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>
      
    </div>
  );
}
