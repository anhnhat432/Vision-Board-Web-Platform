import { Calendar, CalendarDays, Clock, Flag, Play, Sliders, ChevronDown, Settings } from "lucide-react";
import { useState } from "react";

import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/components/ui/utils";
import { soundService } from "@/app/services/soundService";
import { formatDateInputValue } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { helperTextClass, inputClass, labelClass } from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
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
  Monday: "Thứ 2",
  Tuesday: "Thứ 3",
  Wednesday: "Thứ 4",
  Thursday: "Thứ 5",
  Friday: "Thứ 6",
  Saturday: "Thứ 7",
  Sunday: "Chủ Nhật",
};

const LOAD_HINTS: Record<TwelveWeekSetupDraft["tacticLoadPreference"], string> = {
  lighter: "Tối giản. Phù hợp khi ít thời gian hoặc mới bắt đầu.",
  balanced: "Cân bằng. Phù hợp cho đa số để giữ nhịp bền bỉ.",
  push: "Tăng tốc. Đòi hỏi nhiều thời gian và năng lượng.",
};

const formatShortDateLabel = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
};

export function ScheduleStepLab({ draft, cycleStartDate: _cycleStartDate, cycleEndDate, todayDateKey, onChange }: ScheduleStepProps) {
  const localTodayDateKey = todayDateKey ?? formatDateInputValue(new Date());
  
  // Tính toán Thứ Hai tới
  const today = new Date(`${localTodayDateKey}T00:00:00`);
  const dayOfWeek = today.getDay();
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today.setDate(today.getDate() + daysUntilNextMonday));
  const nextMondayKey = formatDateInputValue(nextMonday);

  const [isCustomDate, setIsCustomDate] = useState(
    draft.startDate !== localTodayDateKey && draft.startDate !== nextMondayKey
  );
  
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

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

  const reflectionDayLabel = REVIEW_DAY_SHORT_LABEL[draft.reviewDay] ?? "Chủ Nhật";

  // Phân bổ Indicators vào các ngày trong tuần (giả lập trực quan)
  const getTacticsForDay = (dayName: string) => {
    return draft.leadIndicators
      .filter((ind) => ind.name.trim().length > 0)
      .filter((ind) => {
        const targetNum = parseInt(ind.target, 10) || 0;
        if (targetNum >= 5) return true; // Hằng ngày
        if (targetNum === 4) return ["Monday", "Wednesday", "Friday", "Saturday"].includes(dayName);
        if (targetNum === 3) return ["Monday", "Wednesday", "Friday"].includes(dayName);
        if (targetNum === 2) return ["Tuesday", "Thursday"].includes(dayName);
        if (targetNum === 1) return ["Saturday"].includes(dayName);
        return false;
      });
  };

  const WEEK_DAYS = [
    { key: "Monday", label: "T2", fullName: "Thứ Hai" },
    { key: "Tuesday", label: "T3", fullName: "Thứ Ba" },
    { key: "Wednesday", label: "T4", fullName: "Thứ Tư" },
    { key: "Thursday", label: "T5", fullName: "Thứ Năm" },
    { key: "Friday", label: "T6", fullName: "Thứ Sáu" },
    { key: "Saturday", label: "T7", fullName: "Thứ Bảy" },
    { key: "Sunday", label: "CN", fullName: "Chủ Nhật" },
  ];

  return (
    <div className="space-y-6">
      {/* KHU VỰC 1: BIỂU MẪU LỊCH TRÌNH CHÍNH */}
      <section
        className="relative overflow-hidden rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm space-y-6 animate-in fade-in duration-300"
        aria-labelledby="schedule-main-title"
      >
        <div className="flex items-center gap-2.5 border-b border-app-line/60 pb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent border border-app-accent/15">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 id="schedule-main-title" className="text-xs font-extrabold uppercase tracking-wider text-app-accent">
              Chốt lịch trình cam kết
            </h3>
            <p className="mt-0.5 text-[11px] text-app-ink-muted">
              Xây dựng thời gian bắt đầu và nhịp độ kỷ luật cho hành trình 12 tuần của bạn
            </p>
          </div>
        </div>

        {/* Ngày bắt đầu - Nút chọn nhanh thông minh giúp giảm click */}
        <div className="space-y-3">
          <div className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1.5")}>
            <Play className="h-4 w-4 text-app-accent" />
            <span>Ngày bắt đầu chu kỳ 12 tuần</span>
          </div>

          <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.02] px-3.5 py-2.5 text-xs leading-relaxed text-app-ink-soft space-y-1 mb-2 select-none">
            <div className="font-semibold text-blue-600 dark:text-blue-400">💡 Gợi ý chọn ngày bắt đầu:</div>
            <p>Khuyên dùng chọn **Thứ 2 tuần tới** để bạn có trọn vẹn 1 tuần khởi động từ đầu. Nếu muốn làm ngay hôm nay để lấy đà, hãy chọn **Hôm nay**.</p>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundService.click();
                setIsCustomDate(false);
                onChange("startDate", nextMondayKey);
              }}
              className={cn(
                "flex-1 min-w-[130px] rounded-xl border px-3.5 py-2.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95",
                !isCustomDate && draft.startDate === nextMondayKey
                  ? "border-app-accent bg-app-accent text-white shadow-sm shadow-app-accent/20 scale-102"
                  : "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30"
              )}
            >
              <span className="block font-bold text-xs">Thứ 2 tuần tới</span>
              <span className="text-[10px] opacity-85 block mt-0.5">({formatShortDateLabel(nextMondayKey)} - Khuyên dùng)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.click();
                setIsCustomDate(false);
                onChange("startDate", localTodayDateKey);
              }}
              className={cn(
                "flex-1 min-w-[130px] rounded-xl border px-3.5 py-2.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95",
                !isCustomDate && draft.startDate === localTodayDateKey
                  ? "border-app-accent bg-app-accent text-white shadow-sm shadow-app-accent/20 scale-102"
                  : "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30"
              )}
            >
              <span className="block font-bold text-xs">Hôm nay</span>
              <span className="text-[10px] opacity-85 block mt-0.5">({formatShortDateLabel(localTodayDateKey)})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.click();
                setIsCustomDate(true);
              }}
              className={cn(
                "flex-1 min-w-[130px] rounded-xl border px-3.5 py-2.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95",
                isCustomDate
                  ? "border-indigo-500 bg-indigo-500 text-white shadow-sm scale-102"
                  : "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30"
              )}
            >
              <span className="block font-bold text-xs">Chọn ngày khác</span>
              <span className="text-[10px] opacity-85 block mt-0.5">Tùy chọn lịch</span>
            </button>
          </div>

          {isCustomDate && (
            <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
              <Input
                id="cycle-start-date"
                type="date"
                value={draft.startDate}
                min={localTodayDateKey}
                aria-invalid={Boolean(startDateValidation.error)}
                aria-describedby={startDateDescription}
                className={cn(
                  inputClass,
                  "rounded-xl",
                  startDateValidation.error && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-150",
                )}
                onChange={(event) => onChange("startDate", event.target.value)}
              />
              {startDateValidation.error && (
                <p role="alert" className="text-[10px] font-bold text-red-500 mt-1">
                  {startDateValidation.error}
                </p>
              )}
              {startDateValidation.warning && (
                <p role="status" className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                  {startDateValidation.warning}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Ngày hoàn thành tự động tính */}
        <div className="space-y-1.5 border-t border-app-line/40 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-app-ink flex items-center gap-1.5">
              <Flag className="h-4 w-4 text-emerald-500" />
              <span>Ngày cán đích (Tự động 12 tuần)</span>
            </span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/10">
              {cycleEndDate}
            </span>
          </div>
          <p className="text-[10px] text-app-ink-muted leading-relaxed">
            * Kế hoạch sẽ kết thúc chính xác sau 84 ngày phi hành bền bỉ.
          </p>
        </div>

        {/* Ngày nhìn lại tuần (Reflection Day) - Dải chip tròn dẹt to bản micro-animation */}
        <fieldset className="space-y-2.5 border-t border-app-line/40 pt-4">
          <legend className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1.5 mb-1")}>
            <Calendar className="h-4 w-4 text-app-accent" />
            <span>Ngày nhìn lại tuần (Reflection Day)</span>
          </legend>

          <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02] px-3.5 py-2.5 text-xs leading-relaxed text-app-ink-soft space-y-1.5 mb-2 select-none">
            <div className="font-semibold text-indigo-600 dark:text-indigo-400">📊 Lựa chọn thời điểm phản tư tốt nhất:</div>
            <p>Chọn ngày cuối tuần khi tâm trí thư giãn nhất để tổng kết, ví dụ: **9:00 - 10:00 sáng Chủ nhật** (thư thái nhâm nhi cà phê) hoặc **16:00 - 17:00 chiều thứ Bảy** để hoàn thành và tận hưởng tối Chủ Nhật trọn vẹn.</p>
          </div>

          <div className="flex flex-wrap gap-2">
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
                    "flex-1 min-w-[70px] h-10 items-center justify-center rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95",
                    isActive
                      ? "border-app-accent bg-app-accent text-white shadow-sm shadow-app-accent/20 scale-105"
                      : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/30",
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

        {/* ⚙️ Cài đặt nâng cao: Ẩn gọn tinh tế dưới accordion để tránh ngộp */}
        <div className="border-t border-app-line/40 pt-4">
          <button
            type="button"
            onClick={() => {
              soundService.click();
              setIsAdvancedOpen(!isAdvancedOpen);
            }}
            className="flex w-full items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 py-1.5 px-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/10 hover:bg-indigo-50 transition-all select-none"
          >
            <span className="flex items-center gap-1.5">
              <Settings className="h-4 w-4 animate-spin-slow" />
              <span>⚙️ Tùy chỉnh nâng cao (Đã tự động tối ưu - Customize Later)</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isAdvancedOpen && "rotate-180")} />
          </button>

          {isAdvancedOpen && (
            <div className="mt-4 space-y-5 animate-in slide-in-from-top-2 duration-300">
              {/* Thời lượng dành cho mục tiêu mỗi ngày (dailyTimeBudget) */}
              <fieldset className="space-y-2">
                <legend className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1.5 mb-1.5")}>
                  <Clock className="h-4 w-4 text-app-accent" />
                  <span>Thời lượng dành cho mục tiêu mỗi ngày</span>
                </legend>
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.02] px-3 py-2 text-[10px] text-app-ink-soft leading-normal mb-1">
                  * Ví dụ: Dành **30-60 phút** tập trung cao độ mỗi ngày (ví dụ khung giờ cố định **20:00 - 21:00 tối**) để xây dựng thói quen kỷ luật tự nhiên mà không gây căng thẳng.
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "30min", label: "30 phút", hint: "🚴 Tối giản" },
                    { value: "1h", label: "1 giờ", hint: "🚗 Duy trì ổn định" },
                    { value: "1.5h", label: "1.5 giờ", hint: "🚀 Tăng tốc nhẹ" },
                    { value: "2h+", label: "2+ giờ", hint: "⚡ Chuyên sâu" },
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
                          "flex flex-col items-center justify-center rounded-xl border bg-app-surface p-2 text-center text-xs transition-all duration-200 active:scale-[0.98]",
                          isActive
                            ? "border-app-accent bg-app-accent-soft/20 text-app-accent shadow-sm"
                            : "border-app-line text-app-ink-soft hover:border-app-accent/30",
                        )}
                      >
                        <span className="font-bold text-xs">{option.label}</span>
                        <span className="text-[9px] opacity-75 mt-0.5 leading-none">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Mức tải hành động tuần đầu (tacticLoadPreference) */}
              <fieldset className="space-y-2">
                <legend className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1.5 mb-1.5")}>
                  <Sliders className="h-4 w-4 text-app-accent" />
                  <span>Mức tải hành động tuần đầu</span>
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { value: "lighter" as const, label: "🚴 Nhẹ nhàng" },
                    { value: "balanced" as const, label: "🚗 Cân bằng" },
                    { value: "push" as const, label: "🚀 Tăng tốc" },
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
                          "flex flex-col items-start rounded-xl border bg-app-surface p-2.5 text-left transition-all duration-200 active:scale-[0.98]",
                          isActive
                            ? "border-app-accent bg-app-accent-soft/20 text-app-ink shadow-sm"
                            : "border-app-line text-app-ink-soft hover:border-app-accent/30",
                        )}
                      >
                        <span className="font-bold text-xs text-app-ink">{option.label}</span>
                        <span className="text-[9px] text-app-ink-soft leading-normal mt-0.5">{LOAD_HINTS[option.value]}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </section>

      {/* WIDGET LIVE PREVIEW: Xem trước tuần đầu tiên của bạn */}
      <section
        className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-[#fafaff] dark:bg-[#1a1b24]/40 p-5 sm:p-6 shadow-sm space-y-4 select-none animate-in fade-in duration-400"
        aria-labelledby="week-preview-title"
      >
        <div className="flex items-center gap-2 mb-2 border-b border-indigo-150/40 pb-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <h3 id="week-preview-title" className="text-xs font-extrabold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
            👀 Xem trước tuần đầu tiên của bạn (Live Preview)
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Bản phân bổ hoạt động thực tế 7 ngày của Tuần 1. Nhịp điệu sẽ tự động thay đổi khi bạn điều chỉnh ngày bắt đầu, ngày nhìn lại hoặc hành động lặp lại.
        </p>

        {/* Lưới 7 ngày dọc trên di động, dàn ngang trên desktop */}
        <div className="grid gap-2.5 sm:grid-cols-7 pt-1">
          {WEEK_DAYS.map((day) => {
            const isReflectionDay = draft.reviewDay === day.key;
            const dailyTactics = getTacticsForDay(day.key);
            const hasTactics = dailyTactics.length > 0;

            return (
              <div
                key={day.key}
                className={cn(
                  "rounded-xl border p-3 flex flex-row sm:flex-col justify-between sm:justify-start gap-2.5 min-h-[75px] transition-all duration-300",
                  isReflectionDay
                    ? "border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 shadow-3xs"
                    : hasTactics
                      ? "border-indigo-100 bg-white dark:bg-slate-900 text-app-ink shadow-3xs hover:border-indigo-200"
                      : "border-slate-100 bg-slate-50/40 dark:bg-slate-900/10 text-slate-400 opacity-60"
                )}
              >
                {/* Ngày trong tuần */}
                <div className="text-left sm:text-center sm:border-b sm:border-app-line/30 sm:pb-1 shrink-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block sm:hidden">
                    {day.fullName}
                  </span>
                  <span className="text-sm font-extrabold hidden sm:block">
                    {day.label}
                  </span>
                </div>

                {/* Nội dung ngày */}
                <div className="flex-1 text-right sm:text-left space-y-1.5 min-w-0">
                  {isReflectionDay && (
                    <div className="inline-flex sm:flex flex-col gap-0.5 items-center sm:items-start text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10 w-fit select-none">
                      <span>📊 Nhìn lại tuần</span>
                      <span className="text-[7.5px] uppercase font-bold tracking-wide hidden sm:inline-block mt-0.5">Hạn chốt {reflectionDayLabel}</span>
                    </div>
                  )}

                  {hasTactics ? (
                    <div className="flex flex-col gap-1 items-end sm:items-start overflow-hidden">
                      {dailyTactics.map((tactic) => (
                        <div
                          key={tactic.id}
                          className="text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100/40 truncate max-w-full block"
                          title={`${tactic.name} (${tactic.target} ${tactic.unit})`}
                        >
                          🏃 {tactic.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isReflectionDay && (
                      <span className="text-[8px] font-medium text-slate-400 dark:text-slate-500 italic block mt-1">
                        Không có lịch
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
