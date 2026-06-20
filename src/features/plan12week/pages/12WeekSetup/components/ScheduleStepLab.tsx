import { Calendar, CalendarDays, ChevronDown, Clock, Flag, Play, Settings, Sliders } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Input } from "@/app/components/ui/input";
import { useReducedMotion } from "@/app/components/ui/use-reduced-motion";
import { cn } from "@/app/components/ui/utils";
import { soundService } from "@/app/services/soundService";
import { formatDateInputValue } from "@/app/utils/storage";
import { formatDisplayDate } from "@/app/utils/storage-date-utils";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { helperTextClass, inputClass, labelClass } from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import { REVIEW_DAYS } from "../constants";
import { buildLeadIndicatorSchedules, getStartDateValidation } from "../helpers";
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

export function ScheduleStepLab({
  draft,
  cycleStartDate: _cycleStartDate,
  cycleEndDate,
  setupGuideSupport,
  setupGuideTemplate: _setupGuideTemplate,
  hasPreviewTasks: _hasPreviewTasks,
  weekOneTaskPreview: _weekOneTaskPreview,
  weekOneTaskWarning: _weekOneTaskWarning,
  todayDateKey,
  onChange,
}: ScheduleStepProps) {
  const prefersReducedMotion = useReducedMotion();
  const localTodayDateKey = todayDateKey ?? formatDateInputValue(new Date());

  // Tính toán Thứ Hai tới
  const today = new Date(`${localTodayDateKey}T00:00:00`);
  const dayOfWeek = today.getDay();
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today.setDate(today.getDate() + daysUntilNextMonday));
  const nextMondayKey = formatDateInputValue(nextMonday);

  const [isCustomDate, setIsCustomDate] = useState(
    draft.startDate !== localTodayDateKey && draft.startDate !== nextMondayKey,
  );

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState(0);

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

  // Phân bổ Indicators thực tế phản ứng thời gian thực (real-time reactive schedule)
  const scheduledIndicators = buildLeadIndicatorSchedules(
    draft.leadIndicators.filter((ind) => ind.name.trim().length > 0),
    {
      tacticLoadPreference: draft.tacticLoadPreference,
      preferredDays: draft.preferredDays,
    },
  );

  const getTacticsForDay = (dayIndex: number) => {
    return scheduledIndicators.filter((ind) => ind.schedule.includes(dayIndex));
  };

  const handleDayClick = (dayIndex: number) => {
    soundService.click();
    const isActive = draft.preferredDays.includes(dayIndex);
    const nextPreferredDays = isActive
      ? draft.preferredDays.filter((d) => d !== dayIndex)
      : [...draft.preferredDays, dayIndex];
    onChange("preferredDays", nextPreferredDays);
  };

  const WEEK_DAYS = [
    { index: 0, key: "Monday", label: "T2", fullName: "Thứ Hai" },
    { index: 1, key: "Tuesday", label: "T3", fullName: "Thứ Ba" },
    { index: 2, key: "Wednesday", label: "T4", fullName: "Thứ Tư" },
    { index: 3, key: "Thursday", label: "T5", fullName: "Thứ Năm" },
    { index: 4, key: "Friday", label: "T6", fullName: "Thứ Sáu" },
    { index: 5, key: "Saturday", label: "T7", fullName: "Thứ Bảy" },
    { index: 6, key: "Sunday", label: "CN", fullName: "Chủ Nhật" },
  ];

  return (
    <div className="space-y-6">
      {/* KHU VỰC 1: BIỂU MẪU LỊCH TRÌNH CHÍNH */}
      <section
        className="relative overflow-hidden rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-app-sm space-y-6 animate-in fade-in duration-300"
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

        {/* Lời khuyên nhịp độ hành động từ Copilot */}
        {setupGuideSupport?.week1CadenceHint && (
          <div className="rounded-xl border border-app-accent/30 bg-app-accent-soft/20 p-3.5 text-xs text-app-ink-soft flex gap-2.5 items-start">
            <span className="text-base shrink-0 select-none">💡</span>
            <div>
              <p className="font-bold text-app-accent">Đề xuất nhịp độ tối ưu:</p>
              <p className="mt-0.5 leading-relaxed font-medium">{setupGuideSupport.week1CadenceHint}</p>
            </div>
          </div>
        )}

        {/* Ngày bắt đầu - Nút chọn nhanh thông minh giúp giảm click */}
        <div className="space-y-3">
          <div className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1.5")}>
            <Play className="h-4 w-4 text-app-accent" />
            <span>Ngày bắt đầu chu kỳ 12 tuần</span>
          </div>

          <div className="rounded-xl border border-app-status-info/20 bg-app-status-info/5 px-3.5 py-2.5 text-xs leading-relaxed text-app-ink-soft space-y-1 mb-2 select-none">
            <div className="font-semibold text-app-status-info">💡 Gợi ý chọn ngày bắt đầu:</div>
            <p>
              Khuyên dùng chọn **Thứ 2 tuần tới** để bạn có trọn vẹn 1 tuần khởi động từ đầu. Nếu muốn làm ngay hôm nay
              để lấy đà, hãy chọn **Hôm nay**.
            </p>
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
                "flex-1 min-w-[130px] rounded-xl border px-3.5 py-3 sm:py-2.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus:outline-none",
                 !isCustomDate && draft.startDate === nextMondayKey
                  ? "border-app-accent bg-app-accent text-white shadow-app-sm shadow-app-accent/20 scale-102"
                  : "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30",
              )}
            >
              <span className="block font-bold text-xs">Thứ 2 tuần tới</span>
              <span className="text-[10px] opacity-85 block mt-0.5">
                ({formatShortDateLabel(nextMondayKey)} – Khuyên dùng)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.click();
                setIsCustomDate(false);
                onChange("startDate", localTodayDateKey);
              }}
              className={cn(
                "flex-1 min-w-[130px] rounded-xl border px-3.5 py-3 sm:py-2.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus:outline-none",
                !isCustomDate && draft.startDate === localTodayDateKey
                  ? "border-app-accent bg-app-accent text-white shadow-app-sm shadow-app-accent/20 scale-102"
                  : "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30",
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
                "flex-1 min-w-[130px] rounded-xl border px-3.5 py-3 sm:py-2.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus:outline-none",
                isCustomDate
                  ? "border-app-accent bg-app-accent text-white shadow-app-sm scale-102"
                  : "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30",
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
                className={cn(inputClass, "rounded-xl h-11 sm:h-10")}
                onChange={(event) => onChange("startDate", event.target.value)}
              />
              {draft.startDate ? (
                <p className="mt-1 text-[10px] text-app-ink-soft">Đã chọn: {formatDisplayDate(draft.startDate)}</p>
              ) : null}
              {startDateValidation.error && (
                <p role="alert" className="text-[10px] font-bold text-app-status-error mt-1">
                  {startDateValidation.error}
                </p>
              )}
              {startDateValidation.warning && (
                <p role="status" className="text-[10px] text-app-status-warning font-semibold mt-1">
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
              <Flag className="h-4 w-4 text-app-status-success" />
              <span>Ngày cán đích (Tự động 12 tuần)</span>
            </span>
            <span className="text-xs font-extrabold text-app-status-success bg-app-status-success/10 px-2.5 py-0.5 rounded-md border border-app-status-success/20">
              {cycleEndDate}
            </span>
          </div>
          <p className="text-[10px] text-app-ink-muted leading-relaxed">
            Kế hoạch sẽ kết thúc chính xác sau 84 ngày phi hành bền bỉ.
          </p>
        </div>

        {/* Ngày nhìn lại tuần (Reflection Day) - Dải chip tròn dẹt to bản micro-animation */}
        <fieldset className="space-y-2.5 border-t border-app-line/40 pt-4">
          <legend className={cn(labelClass, "font-bold text-app-ink flex items-center gap-1.5 mb-1")}>
            <Calendar className="h-4 w-4 text-app-accent" />
            <span>Ngày nhìn lại tuần (Reflection Day)</span>
          </legend>

          <div className="rounded-xl border border-app-accent/15 bg-app-accent-soft/10 px-3.5 py-2.5 text-xs leading-relaxed text-app-ink-soft space-y-1.5 mb-2 select-none">
            <div className="font-semibold text-app-accent">📊 Lựa chọn thời điểm phản tư tốt nhất:</div>
            <p>
              Chọn ngày cuối tuần khi tâm trí thư giãn nhất để tổng kết, ví dụ: 9:00–10:00 sáng Chủ nhật (thư thái nhâm
              nhi cà phê) hoặc 16:00–17:00 chiều thứ Bảy để hoàn thành và tận hưởng tối Chủ Nhật trọn vẹn.
            </p>
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
                    "flex-1 min-w-[70px] h-11 sm:h-10 items-center justify-center rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus:outline-none",
                    isActive
                      ? "border-app-accent bg-app-accent text-white shadow-app-sm shadow-app-accent/20 scale-105"
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
            className="flex w-full items-center justify-between text-xs font-bold text-app-accent py-1.5 px-3 rounded-lg bg-app-accent-soft/20 border border-app-line hover:bg-app-accent-soft/30 transition-all select-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none"
          >
            <span className="flex items-center gap-1.5">
              <Settings className="h-4 w-4 animate-spin-slow text-app-accent" />
              <span>⚙️ Tùy chỉnh nâng cao (Đã tự động tối ưu – Customize Later)</span>
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
                <div className="rounded-xl border border-app-status-warning/20 bg-app-status-warning/5 px-3 py-2 text-[10px] text-app-ink-soft leading-normal mb-1">
                  * Ví dụ: Dành 30–60 phút tập trung cao độ mỗi ngày (ví dụ khung giờ cố định 20:00–21:00 tối) để xây
                  dựng thói quen kỷ luật tự nhiên mà không gây căng thẳng.
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
                          "flex flex-col items-center justify-center rounded-xl border bg-app-surface p-2.5 text-center text-xs transition-all duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none",
                          isActive
                            ? "border-app-accent bg-app-accent-soft/20 text-app-accent shadow-app-sm"
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
                          "flex flex-col items-start rounded-xl border bg-app-surface p-3 text-left transition-all duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none",
                          isActive
                            ? "border-app-accent bg-app-accent-soft/20 text-app-ink shadow-app-sm"
                            : "border-app-line text-app-ink-soft hover:border-app-accent/30",
                        )}
                      >
                        <span className="font-bold text-xs text-app-ink">{option.label}</span>
                        <span className="text-[9px] text-app-ink-soft leading-normal mt-0.5">
                          {LOAD_HINTS[option.value]}
                        </span>
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
        className="relative overflow-hidden rounded-2xl border border-app-line bg-app-bg-subtle/50 p-5 sm:p-6 shadow-app-sm space-y-4 select-none animate-in fade-in duration-400"
        aria-labelledby="week-preview-title"
      >
        <div className="flex items-center gap-2 mb-2 border-b border-app-line/60 pb-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-app-accent animate-pulse" />
          <h3 id="week-preview-title" className="text-xs font-extrabold uppercase tracking-wider text-app-accent">
            👀 Xem trước & Tự sắp xếp Lịch hành động (Interactive LWW Schedule)
          </h3>
        </div>
        <p className="text-[11px] text-app-ink-soft leading-relaxed">
          Phân bổ hoạt động thực tế 7 ngày của Tuần 1.
          <strong className="text-app-accent block mt-1">
            📌 Mẹo nhỏ: Chạm vào bất kỳ ngày nào bên dưới để bật/tắt ghim gán hành động lên ngày đó hằng tuần!
          </strong>
        </p>

        {/* Mobile Horizontal Carousel */}
        <div className="sm:hidden space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {WEEK_DAYS.map((day) => {
              const isSelected = selectedMobileDay === day.index;
              const isReflectionDay = draft.reviewDay === day.key;
              const isPreferredDay = draft.preferredDays.includes(day.index);
              const dailyTactics = getTacticsForDay(day.index);
              const hasTactics = dailyTactics.length > 0;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => {
                    soundService.click();
                    setSelectedMobileDay(day.index);
                  }}
                  className={cn(
                    "flex-shrink-0 snap-center rounded-xl border px-3 py-2 flex flex-col items-center justify-center min-w-[70px] transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent",
                    isSelected
                      ? "border-app-accent bg-app-accent-soft/30 text-app-accent ring-2 ring-app-accent/25 font-extrabold"
                      : isReflectionDay
                        ? "border-app-status-warning/40 bg-app-status-warning/5 text-app-ink-soft"
                        : isPreferredDay
                          ? "border-app-accent bg-app-accent-soft/10 text-app-ink-soft"
                          : "border-app-line bg-app-surface text-app-ink-soft",
                  )}
                >
                  <span className="text-xs">{day.label}</span>
                  <div className="flex gap-0.5 mt-1 items-center h-2">
                    {isPreferredDay && <span className="text-[10px] leading-none">📌</span>}
                    {isReflectionDay && <span className="text-[10px] leading-none">📊</span>}
                    {hasTactics && <span className="h-1.5 w-1.5 rounded-full bg-app-accent" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chi tiết ngày đang chọn trên Mobile */}
          <div className="rounded-xl border border-app-line bg-app-surface p-4 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-app-line/40 pb-2">
              <h4 className="text-xs font-bold text-app-ink flex items-center gap-1.5">
                <span>{WEEK_DAYS[selectedMobileDay].fullName}</span>
                {draft.reviewDay === WEEK_DAYS[selectedMobileDay].key && (
                  <span className="text-[9px] font-extrabold text-app-status-warning bg-app-status-warning/10 px-1.5 py-0.5 rounded border border-app-status-warning/20">
                    📊 Báo cáo tuần
                  </span>
                )}
              </h4>
              <span className="text-[10px] text-app-ink-muted">{getTacticsForDay(selectedMobileDay).length} việc</span>
            </div>

            {/* Nút Ghim ưu tiên */}
            <button
              type="button"
              onClick={() => handleDayClick(selectedMobileDay)}
              className={cn(
                "w-full rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border active:scale-95 focus-visible:ring-2 focus-visible:ring-app-accent focus:outline-none",
                draft.preferredDays.includes(selectedMobileDay)
                  ? "bg-app-accent text-white border-app-accent shadow-app-sm shadow-app-accent/20"
                  : "bg-app-surface text-app-ink-soft border-app-line hover:border-app-accent/30",
              )}
            >
              <span>
                {draft.preferredDays.includes(selectedMobileDay) ? "📌 Đã ghim ưu tiên" : "📌 Ghim làm ngày ưu tiên"}
              </span>
            </button>

            {/* Danh sách công việc của ngày */}
            <div className="space-y-2">
              {getTacticsForDay(selectedMobileDay).length > 0 ? (
                getTacticsForDay(selectedMobileDay).map((tactic) => (
                  <div
                    key={tactic.id}
                    className="text-xs font-semibold bg-app-bg-subtle/70 text-app-ink-soft px-3 py-2.5 rounded-xl border border-app-line flex items-center justify-between"
                  >
                    <span className="truncate pr-2">🏃 {tactic.name}</span>
                    <span className="text-[10px] font-extrabold text-app-accent shrink-0">
                      {tactic.target} {tactic.unit}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-app-ink-muted italic text-center py-2">
                  {draft.reviewDay === WEEK_DAYS[selectedMobileDay].key
                    ? "Hạn chốt nhìn lại tuần - Dành thời gian tự ngẫm và đánh giá."
                    : "Ngày nghỉ ngơi. Ghim thêm việc để lên lịch."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lưới 7 ngày dọc trên di động, dàn ngang trên desktop (Desktop Grid) */}
        <div className="hidden sm:grid gap-2.5 sm:grid-cols-7 pt-1">
          {WEEK_DAYS.map((day) => {
            const isReflectionDay = draft.reviewDay === day.key;
            const isPreferredDay = draft.preferredDays.includes(day.index);
            const dailyTactics = getTacticsForDay(day.index);
            const hasTactics = dailyTactics.length > 0;

            return (
              <motion.button
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                key={day.key}
                type="button"
                onClick={() => handleDayClick(day.index)}
                className={cn(
                  "rounded-xl border p-3 flex flex-row sm:flex-col justify-between sm:justify-start gap-2.5 min-h-[85px] transition-all duration-300 hover:scale-102 hover:shadow-xs active:scale-[0.97] cursor-pointer text-left sm:text-center focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus:outline-none",
                  isReflectionDay
                    ? "border-app-status-warning/45 bg-app-status-warning/5 text-app-ink shadow-3xs"
                    : isPreferredDay
                      ? "border-app-accent bg-app-accent-soft/20 text-app-ink shadow-app-sm ring-2 ring-app-accent-soft/35"
                      : hasTactics
                        ? "border-app-line bg-app-surface text-app-ink shadow-3xs hover:border-app-accent/30"
                        : "border-app-line/40 bg-app-surface text-app-ink-muted opacity-60 hover:opacity-100 hover:border-app-line",
                )}
              >
                {/* Ngày trong tuần */}
                <div className="text-left sm:text-center sm:border-b sm:border-app-line/30 sm:pb-1 shrink-0 w-full flex items-center justify-between sm:justify-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block sm:hidden">
                    {day.fullName}
                  </span>
                  <span className="text-sm font-extrabold hidden sm:block">{day.label}</span>

                  {/* Nhãn Ghim cho ngày ưu tiên */}
                  {isPreferredDay && (
                    <span
                      className="text-[9px] font-bold text-app-accent bg-app-accent-soft px-1 rounded sm:ml-1 scale-95 shrink-0"
                      title="Ngày được ghim ưu tiên"
                    >
                      📌
                    </span>
                  )}
                </div>

                {/* Nội dung ngày */}
                <div className="flex-1 text-right sm:text-left space-y-1.5 min-w-0 w-full">
                  {isReflectionDay && (
                    <div className="inline-flex sm:flex flex-col gap-0.5 items-center sm:items-start text-[8px] font-extrabold text-app-status-warning bg-app-status-warning/10 px-1.5 py-0.5 rounded border border-app-status-warning/20 w-fit select-none mx-auto sm:mx-0">
                      <span>📊 Báo cáo tuần</span>
                      <span className="text-[8px] uppercase tracking-wide hidden sm:inline-block mt-0.5">
                        Hạn chốt {reflectionDayLabel}
                      </span>
                    </div>
                  )}

                  {hasTactics ? (
                    <div className="flex flex-col gap-1 items-end sm:items-start overflow-hidden w-full">
                      {dailyTactics.map((tactic) => (
                        <div
                          key={tactic.id}
                          className="text-[9px] font-bold bg-app-accent-soft text-app-accent px-1.5 py-0.5 rounded border border-app-accent/10 truncate max-w-full block w-full text-right sm:text-left"
                          title={`${tactic.name} (${tactic.target} ${tactic.unit})`}
                        >
                          🏃 {tactic.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isReflectionDay && (
                      <span className="text-[8px] font-bold text-app-ink-muted italic block mt-1 text-center sm:text-left">
                        Nghỉ ngơi
                      </span>
                    )
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
