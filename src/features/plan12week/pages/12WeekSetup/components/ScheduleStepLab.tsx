import type { ReactNode } from "react";
import { AlertTriangle, CalendarDays, ChevronDown } from "lucide-react";

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
import { getLoadPreferenceLabel, getStartDateValidation } from "../helpers";
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
  lighter: "Ít việc hơn. Hợp khi thiếu thời gian, năng lượng hoặc cần giữ nhịp trước.",
  balanced: "Vừa đủ để tiến bộ mà không quá tải. Mặc định tốt cho hầu hết mục tiêu.",
  push: "Nhiều việc hơn. Chỉ chọn khi bạn có lịch rộng và muốn tăng tốc có kiểm soát.",
};

function CollapsibleScheduleSection({
  id,
  title,
  children,
  emoji = "💡",
}: {
  id: string;
  title: string;
  children: ReactNode;
  emoji?: string;
}) {
  return (
    <details className="group rounded-3xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-4 sm:p-5 relative z-10 transition-all duration-300 [&::-webkit-details-marker]:hidden">
      <summary
        id={id}
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-2 text-sm font-bold text-slate-850 dark:text-slate-200 focus-visible:outline-none p-1 marker:hidden"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span>{title}</span>
        </span>
        <ChevronDown className="h-4.5 w-4.5 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="mt-4 border-t border-slate-200/40 dark:border-slate-850/40 pt-4 relative z-10">
        {children}
      </div>
    </details>
  );
}

export function ScheduleStepLab({
  draft,
  cycleStartDate,
  cycleEndDate,
  setupGuideSupport,
  setupGuideTemplate,
  weekOneTaskPreview,
  weekOneTaskWarning,
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
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-slate-850/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 sm:p-8 transition-all duration-300 group"
        aria-labelledby="schedule-main-title"
      >
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-3.5 relative z-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <CalendarDays className="h-5.5 w-5.5" aria-hidden="true" />
          </div>
          <div>
            <p id="schedule-main-title" className="text-base font-extrabold text-slate-850 dark:text-slate-100">
              📅 Chốt lịch trình & Lịch biểu
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
              Xây dựng khung giờ cam kết thực thi đều đặn. Chọn ngày bắt đầu, ngày nhìn lại tuần, và thời gian biểu tối ưu mỗi ngày.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 relative z-10">
          <div className="rounded-xl border border-white/10 dark:border-slate-850/30 bg-slate-50/20 dark:bg-slate-950/10 p-4">
            <label htmlFor="cycle-start-date" className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>
              <span className="text-lg">🚀</span>
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
                "bg-white/80 dark:bg-slate-950/40 border-slate-200 focus:border-indigo-500",
                startDateValidation.error &&
                  "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
              )}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
            {startDateValidation.error ? (
              <p id="cycle-start-date-error" role="alert" className={cn(errorTextClass, "mt-1.5 text-xs font-bold text-rose-500")}>
                {startDateValidation.error}
              </p>
            ) : null}
            {startDateValidation.warning ? (
              <p id="cycle-start-date-warning" role="status" className={cn(helperTextClass, "mt-1.5 text-xs font-semibold text-slate-450")}>
                {startDateValidation.warning}
              </p>
            ) : null}
            <p id="cycle-start-date-helper" className={cn(helperTextClass, "mt-1.5 text-[11px] font-semibold text-slate-450")}>
              Kế hoạch sẽ tự xếp tuần làm việc từ Thứ Hai để việc trong tuần dễ theo dõi.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 dark:border-slate-850/30 bg-slate-50/20 dark:bg-slate-950/10 p-4">
            <label htmlFor="cycle-end-date" className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>
              <span className="text-lg">🏁</span>
              <span>Ngày kết thúc viễn chinh</span>
            </label>
            <Input
              id="cycle-end-date"
              value={cycleEndDate}
              readOnly
              className={cn(inputClass, "border-slate-200 bg-slate-100/70 dark:bg-slate-950/60 text-slate-400 dark:text-slate-500 font-bold")}
            />
            <p className={cn(helperTextClass, "mt-1.5 text-[11px] font-semibold text-slate-450")}>Tự động tính toán 12 tuần (83 ngày) sau ngày khởi hành.</p>
          </div>
        </div>

        <fieldset className="mt-6 rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 relative z-10">
          <legend className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-3")}>
            <span className="text-lg">📆</span>
            <span>Ngày nhìn lại tuần (Reflection Day)</span>
          </legend>
          <div className="flex flex-wrap gap-2.5 justify-start">
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
                    "flex h-12 w-12 items-center justify-center rounded-full border text-xs font-bold transition-all duration-350 transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20",
                    isActive
                      ? "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-105"
                      : "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-500 hover:border-indigo-500/40 hover:text-indigo-500 hover:bg-indigo-500/[0.02]"
                  )}
                >
                  {REVIEW_DAY_SHORT_LABEL[day.value] ?? day.label}
                </button>
              );
            })}
          </div>
          <p className={cn(helperTextClass, "mt-2.5 text-[11px] font-semibold text-slate-450")}>
            Chọn một ngày cố định để xem tuần vừa rồi làm được gì và tuần tới cần chỉnh gì. Nên chọn ngày ít bận, dễ nhớ.
          </p>
        </fieldset>

        <fieldset className="mt-6 rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 relative z-10">
          <legend className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-3")}>
            <span className="text-lg">⏳</span>
            <span>Mỗi ngày bạn có thể dành bao lâu?</span>
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "30min", label: "30 phút ⏱️", hint: "Ngày bận rộn" },
              { value: "1h", label: "1 giờ ⌛", hint: "Vừa vặn sức" },
              { value: "1.5h", label: "1.5 giờ ⚡", hint: "Dư dả lực" },
              { value: "2h+", label: "2+ giờ 🧘", hint: "Chuyên sâu" },
            ].map((option) => {
              const isActive = draft.dailyTimeBudget === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    soundService.click();
                    onChange("dailyTimeBudget", option.value);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-2xl border bg-white/60 dark:bg-slate-900/60 p-4 text-left text-sm font-bold transition-all duration-350 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 active:scale-[0.98]",
                    isActive
                      ? "border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/[0.03] ring-1 ring-indigo-500/20"
                      : "border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:border-slate-350 hover:bg-slate-50/50"
                  )}
                >
                  <span className="text-sm font-extrabold">{option.label}</span>
                  <span className="text-xs font-semibold opacity-75">{option.hint}</span>
                </button>
              );
            })}
          </div>
          <p className={cn(helperTextClass, "mt-2.5 text-[11px] font-semibold text-slate-450")}>
            Chọn theo ngày thường của bạn. Ứng dụng chỉ lưu khoảng thời gian có thể dành cho mục tiêu, không lưu giờ cụ thể.
            Mốc 2+ giờ chỉ nên chọn khi bạn thật sự có nhiều thời gian.
          </p>
        </fieldset>

        <fieldset className="mt-6 rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 relative z-10">
          <legend className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-3")}>
            <span className="text-lg">🌱</span>
            <span>Mức tải hành động tuần đầu</span>
          </legend>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {[
              { value: "lighter" as const, label: "Nhẹ nhàng 🌱", emoji: "🟢" },
              { value: "balanced" as const, label: "Cân bằng ⚖️", emoji: "🟡" },
              { value: "push" as const, label: "Bứt tốc 🔥", emoji: "🔴" },
            ].map((option) => {
              const isActive = draft.tacticLoadPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    soundService.click();
                    onChange("tacticLoadPreference", option.value);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-2xl border bg-white/60 dark:bg-slate-900/60 p-4.5 text-left text-sm font-bold transition-all duration-350 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 active:scale-[0.98]",
                    isActive
                      ? "border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/[0.03] ring-1 ring-indigo-500/20"
                      : "border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:border-slate-350 hover:bg-slate-50/50"
                  )}
                >
                  <span className="text-sm font-extrabold flex items-center gap-1.5">
                    <span>{option.emoji}</span>
                    <span>{option.label}</span>
                  </span>
                  <span className="text-xs font-semibold opacity-85 leading-relaxed">{LOAD_HINTS[option.value]}</span>
                </button>
              );
            })}
          </div>

          {/* Load Gauge Meter */}
          <div className="mt-5 rounded-xl border border-white/20 bg-slate-50/60 dark:bg-slate-950/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Load Gauge Meter (Đồng hồ đo mức tải)</p>
                <p className="text-[10px] font-bold text-slate-400">Độ phức tạp của hành trình</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:max-w-[240px]">
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    draft.tacticLoadPreference === "lighter" && "w-1/3 bg-emerald-500",
                    draft.tacticLoadPreference === "balanced" && "w-2/3 bg-amber-500",
                    draft.tacticLoadPreference === "push" && "w-full bg-rose-500"
                  )}
                />
              </div>
              <span className={cn(
                "text-[10px] font-extrabold shrink-0 px-2.5 py-0.5 rounded-full border",
                draft.tacticLoadPreference === "lighter" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
                draft.tacticLoadPreference === "balanced" && "border-amber-500/20 bg-amber-500/10 text-amber-500",
                draft.tacticLoadPreference === "push" && "border-rose-500/20 bg-rose-500/10 text-rose-500"
              )}>
                {draft.tacticLoadPreference === "lighter" && "DỄ THỞ"}
                {draft.tacticLoadPreference === "balanced" && "VỪA SỨC"}
                {draft.tacticLoadPreference === "push" && "QUÁ TẢI!"}
              </span>
            </div>
          </div>
          <p className={cn(helperTextClass, "mt-2.5 text-[11px] font-semibold text-slate-450")}>Đây chỉ là nhịp bắt đầu cho tuần 1. Bạn vẫn có thể chỉnh lại sau trong phần Cài đặt.</p>
        </fieldset>

        <div className="mt-6 grid gap-5 md:grid-cols-3 relative z-10">
          <div className="md:col-span-2 rounded-xl border border-white/10 dark:border-slate-850/30 bg-slate-50/20 dark:bg-slate-950/10 p-4">
            <label htmlFor="lag-metric-name" className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>
              <span className="text-lg">🎯</span>
              <span>Chỉ số kết quả chính</span>
            </label>
            <Input
              id="lag-metric-name"
              value={draft.lagMetricName}
              onChange={(event) => onChange("lagMetricName", event.target.value)}
              placeholder="Ví dụ: số kg giảm, số bài xuất bản, doanh thu mới..."
              className={cn(inputClass, "bg-white/80 dark:bg-slate-950/40 border-slate-200 focus:border-indigo-500")}
            />
            <p className={cn(helperTextClass, "mt-1.5 text-[11px] font-semibold text-slate-450")}>Đây là chỉ số kết quả cuối chu kỳ, khác với việc hằng tuần.</p>
          </div>
          <div className="rounded-xl border border-white/10 dark:border-slate-850/30 bg-slate-50/20 dark:bg-slate-950/10 p-4">
            <label htmlFor="lag-metric-target" className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>
              <span className="text-lg">📊</span>
              <span>Con số mục tiêu</span>
            </label>
            <Input
              id="lag-metric-target"
              value={draft.lagMetricTarget}
              onChange={(event) => onChange("lagMetricTarget", event.target.value)}
              placeholder="Ví dụ: 12"
              className={cn(inputClass, "bg-white/80 dark:bg-slate-950/40 border-slate-200 focus:border-indigo-500")}
            />
            <p className={cn(helperTextClass, "mt-1.5 text-[11px] font-semibold text-slate-450")}>Con số cụ thể giúp biết 12 tuần đã về đích hay chưa.</p>
          </div>
          <div className="md:col-span-3 rounded-xl border border-white/10 dark:border-slate-850/30 bg-slate-50/20 dark:bg-slate-950/10 p-4">
            <label htmlFor="lag-metric-unit" className={cn(labelClass, "font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2")}>
              <span className="text-lg">🏷️</span>
              <span>Đơn vị của chỉ số</span>
            </label>
            <Input
              id="lag-metric-unit"
              value={draft.lagMetricUnit}
              onChange={(event) => onChange("lagMetricUnit", event.target.value)}
              placeholder="kg, bài, triệu đồng..."
              className={cn(inputClass, "bg-white/80 dark:bg-slate-950/40 border-slate-200 focus:border-indigo-500")}
            />
            <p className={cn(helperTextClass, "mt-1.5 text-[11px] font-semibold text-slate-450")}>Đơn vị nên khớp với con số ở trên để review cuối chu kỳ rõ hơn.</p>
          </div>
        </div>
      </section>

      <CollapsibleScheduleSection id="schedule-summary-title" title="Chu kỳ viễn chinh 12 tuần" emoji="🗺️">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          🗓️ Diễn ra từ ngày: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{cycleStartDate}</span> đến ngày <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{cycleEndDate}</span>
        </p>
      </CollapsibleScheduleSection>

      {setupGuideSupport && setupGuideTemplate ? (
        <CollapsibleScheduleSection id="schedule-guide-title" title="Gợi ý giữ nhịp chiến thắng cho tuần 1" emoji="💡">
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{setupGuideSupport.week1Headline}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">{setupGuideSupport.week1Support}</p>
          <div className="mt-3.5 rounded-xl border border-white/20 bg-slate-50/60 dark:bg-slate-950/30 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">💡 Gợi ý duy trì</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">{setupGuideSupport.week1CadenceHint}</p>
          </div>
        </CollapsibleScheduleSection>
      ) : null}

      {setupGuideSupport ? (
        <CollapsibleScheduleSection id="schedule-recommendation-title" title="Ngày nhìn lại và mức tải tối ưu gợi ý" emoji="🛡️">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/40 dark:bg-slate-950/10 p-4.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">🔍 Ngày nhìn lại tuần</p>
              <p className="mt-1.5 text-sm font-extrabold text-slate-855 dark:text-slate-150">{draft.reviewDay}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
                {setupGuideSupport.recommendedReviewReason}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/40 dark:bg-slate-950/10 p-4.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">📊 Mức tải tuần đầu</p>
              <p className="mt-1.5 text-sm font-extrabold text-slate-855 dark:text-slate-150">
                {getLoadPreferenceLabel(draft.tacticLoadPreference)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">{setupGuideSupport.recommendedLoadReason}</p>
            </div>
          </div>
        </CollapsibleScheduleSection>
      ) : null}

      {(draft.week4Milestone || draft.week8Milestone) && (
        <CollapsibleScheduleSection id="schedule-milestones-title" title="Các trạm cột mốc viễn chinh gợi ý" emoji="🚩">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "🚀 Tuần 4 (Trạm 1)", value: draft.week4Milestone },
              { label: "🚩 Tuần 8 (Trạm 2)", value: draft.week8Milestone },
            ].map((milestone) => (
              <div key={milestone.label} className="rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/40 dark:bg-slate-950/10 p-4.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                  {milestone.label}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">{milestone.value}</p>
              </div>
            ))}
          </div>
        </CollapsibleScheduleSection>
      )}

      <CollapsibleScheduleSection id="schedule-week-one-title" title="Danh sách việc Hôm nay của tuần 1" emoji="⚡">
        <div className="space-y-2.5">
          {weekOneTaskPreview.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
              Khi bạn chốt khung hoặc thêm việc, tuần đầu sẽ hiện rõ các việc cần mở ở màn Hôm nay. Mục tiêu là làm
              ít nhưng đều.
            </p>
          ) : (
            weekOneTaskPreview.map((task) => (
              <div
                key={task}
                className="rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 px-4 py-3 text-xs text-slate-600 dark:text-slate-350 font-bold flex items-center gap-2"
              >
                <span>⚡</span>
                <span>{task}</span>
              </div>
            ))
          )}
        </div>
        {weekOneTaskWarning ? (
          <p
            role="status"
            className="mt-3.5 flex items-start gap-1.5 text-xs leading-relaxed text-rose-500 font-bold"
          >
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-extrabold">Cảnh báo:</span> {weekOneTaskWarning}
            </span>
          </p>
        ) : null}
      </CollapsibleScheduleSection>
    </div>
  );
}
