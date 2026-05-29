import type { ReactNode } from "react";
import { AlertTriangle, CalendarDays } from "lucide-react";

import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/components/ui/utils";
import { formatDateInputValue } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import {
  errorTextClass,
  helperTextClass,
  inputClass,
  labelClass,
} from "../../../../../app/pages/SMARTGoalSetup/components/formStyles";
import { LOAD_PREFERENCE_OPTIONS, REVIEW_DAYS } from "../constants";
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

const DAILY_TIME_OPTIONS = [
  { value: "30min", label: "30 phút", hint: "Ngày bận" },
  { value: "1h", label: "1 giờ", hint: "Vừa tay" },
  { value: "1.5h", label: "1.5 giờ", hint: "Có dư lực" },
  { value: "2h+", label: "2+ giờ", hint: "Review rất sâu" },
] as const;

const LOAD_HINTS: Record<TwelveWeekSetupDraft["tacticLoadPreference"], string> = {
  lighter: "Ít việc hơn. Hợp khi thiếu thời gian, năng lượng hoặc cần giữ nhịp trước.",
  balanced: "Vừa đủ để tiến bộ mà không quá tải. Mặc định tốt cho hầu hết mục tiêu.",
  push: "Nhiều việc hơn. Chỉ chọn khi bạn có lịch rộng và muốn tăng tốc có kiểm soát.",
};

const radioButtonClass =
  "flex flex-col items-start gap-1 rounded-lg border border-app-line bg-app-surface p-3 text-left text-sm font-medium text-app-ink-soft transition-colors duration-150 hover:border-app-ink-muted hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 active:scale-[0.98]";
const radioButtonActiveClass = "border-app-accent bg-app-accent-soft text-app-accent";

function CollapsibleScheduleSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-app-line bg-app-bg p-3 sm:p-4">
      <summary
        id={id}
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-2 text-sm font-medium text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 p-1 marker:hidden"
      >
        <span>{title}</span>
        <span className="text-xs font-medium text-app-ink-muted group-open:hidden">Mở</span>
        <span className="hidden text-xs font-medium text-app-ink-muted group-open:inline">Thu gọn</span>
      </summary>
      <div className="mt-3">{children}</div>
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
    <div className="mx-auto max-w-4xl space-y-5">
      <section
        className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-[#1C1A15]/50 p-5 sm:p-6 shadow-sm backdrop-blur-sm"
        aria-labelledby="schedule-main-title"
      >
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-500 shrink-0">
            <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div>
            <p id="schedule-main-title" className="text-sm font-bold text-app-ink tracking-tight">
              Chốt lịch trình và Nhịp độ thực thi
            </p>
            <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
              Chọn ngày bắt đầu chu kỳ, thời gian bạn có thể cam kết thực tế hằng ngày, và ngày nhìn lại tuần cố định.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cycle-start-date" className={labelClass}>
              Ngày bắt đầu chu kỳ 12 tuần
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
                "rounded-xl focus:ring-violet-400 focus:border-violet-400",
                startDateValidation.error &&
                  "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
              )}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
            {startDateValidation.error ? (
              <p id="cycle-start-date-error" role="alert" className={errorTextClass}>
                {startDateValidation.error}
              </p>
            ) : null}
            {startDateValidation.warning ? (
              <p id="cycle-start-date-warning" role="status" className={cn(helperTextClass, "text-amber-600 dark:text-amber-500 font-medium")}>
                ⚠️ {startDateValidation.warning}
              </p>
            ) : null}
            <p id="cycle-start-date-helper" className={helperTextClass}>
              💡 Ứng dụng sẽ tự động xếp tuần làm việc từ Thứ Hai để bạn dễ quản lý công việc trong tuần.
            </p>
          </div>

          <div>
            <label htmlFor="cycle-end-date" className={labelClass}>
              Ngày kết thúc (Dự kiến)
            </label>
            <Input
              id="cycle-end-date"
              value={cycleEndDate}
              readOnly
              className={cn(inputClass, "rounded-xl border-app-line bg-app-bg/50 text-app-ink-muted cursor-not-allowed")}
            />
            <p className={helperTextClass}>Tự động tính toán 83 ngày (12 tuần + 1 tuần đệm) kể từ ngày bắt đầu.</p>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className={labelClass}>Ngày xem lại tuần (Weekly Review)</legend>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 mt-2">
            {REVIEW_DAYS.map((day) => {
              const isActive = draft.reviewDay === day.value;
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange("reviewDay", day.value)}
                  className={cn(
                    "min-h-10 rounded-full border text-xs font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 focus-visible:outline-none",
                    isActive 
                      ? "border-none bg-gradient-to-r from-violet-500 to-indigo-500 dark:from-violet-600 dark:to-indigo-600 text-white shadow-md scale-110" 
                      : "border-app-line bg-app-surface text-app-ink-soft hover:border-violet-400 hover:text-violet-500 dark:hover:text-violet-400",
                  )}
                >
                  {REVIEW_DAY_SHORT_LABEL[day.value] ?? day.label}
                </button>
              );
            })}
          </div>
          <p className={helperTextClass}>
            Chọn một ngày thảnh thơi cố định để AI giúp bạn tổng hợp kết quả tuần qua và lên lịch tuần mới.
          </p>
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>Mỗi ngày bạn có thể dành bao lâu cho mục tiêu này?</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-2">
            {DAILY_TIME_OPTIONS.map((option) => {
              const isActive = draft.dailyTimeBudget === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange("dailyTimeBudget", option.value)}
                  className={cn(
                    radioButtonClass, 
                    "min-h-11 px-4 py-3 rounded-2xl border transition-all duration-300", 
                    isActive 
                      ? "border-violet-400 bg-violet-50/50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300 font-semibold shadow-xs scale-[1.01]" 
                      : "border-app-line hover:border-violet-300 hover:bg-violet-50/10"
                  )}
                >
                  <span className="text-xs">{option.label}</span>
                  <span className="text-[10px] font-normal opacity-80 leading-tight">{option.hint}</span>
                </button>
              );
            })}
          </div>
          <p className={helperTextClass}>
            Ước lượng quỹ thời gian rảnh rỗi thực tế. AI sẽ tự động phân bổ khối lượng Todolist tuần đầu dựa trên mốc này.
          </p>
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>Tuần đầu tiên nên chịu tải thế nào?</legend>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 mt-2">
            {LOAD_PREFERENCE_OPTIONS.map((option) => {
              const isActive = draft.tacticLoadPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange("tacticLoadPreference", option.value)}
                  className={cn(
                    radioButtonClass, 
                    "min-h-11 px-4 py-3 rounded-2xl border transition-all duration-300", 
                    isActive 
                      ? "border-violet-400 bg-violet-50/50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300 font-semibold shadow-xs scale-[1.01]" 
                      : "border-app-line hover:border-violet-300 hover:bg-violet-50/10"
                  )}
                >
                  <span className="text-xs">{option.label}</span>
                  <span className="text-[10px] font-normal opacity-85 leading-normal">{LOAD_HINTS[option.value]}</span>
                </button>
              );
            })}
          </div>
          <p className={helperTextClass}>Nhịp bắt đầu khởi động cho tuần 1. Bạn luôn có thể chủ động tăng/giảm khối lượng việc sau đó.</p>
        </fieldset>

        <div className="mt-6 grid gap-4 border-t border-app-line/65 pt-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <label htmlFor="lag-metric-name" className={labelClass}>
              Chỉ số kết quả cốt lõi cần đo lường (Lag Metric)
            </label>
            <Input
              id="lag-metric-name"
              value={draft.lagMetricName}
              onChange={(event) => onChange("lagMetricName", event.target.value)}
              placeholder="Ví dụ: số kg giảm, số bài viết xuất bản, doanh thu..."
              className={cn(inputClass, "rounded-xl focus:ring-violet-400 focus:border-violet-400")}
            />
            <p className={helperTextClass}>Chỉ số kiểm chứng cuối chu kỳ 12 tuần để xác nhận thành công.</p>
          </div>
          <div>
            <label htmlFor="lag-metric-target" className={labelClass}>
              Mục tiêu số
            </label>
            <Input
              id="lag-metric-target"
              value={draft.lagMetricTarget}
              onChange={(event) => onChange("lagMetricTarget", event.target.value)}
              placeholder="Ví dụ: 12"
              className={cn(inputClass, "rounded-xl focus:ring-violet-400 focus:border-violet-400")}
            />
            <p className={helperTextClass}>Con số cụ thể cần chạm tới.</p>
          </div>
          <div className="md:col-span-3">
            <label htmlFor="lag-metric-unit" className={labelClass}>
              Đơn vị đo lường
            </label>
            <Input
              id="lag-metric-unit"
              value={draft.lagMetricUnit}
              onChange={(event) => onChange("lagMetricUnit", event.target.value)}
              placeholder="kg, bài viết, khách hàng, triệu đồng..."
              className={cn(inputClass, "rounded-xl focus:ring-violet-400 focus:border-violet-400")}
            />
          </div>
        </div>
      </section>

      <CollapsibleScheduleSection id="schedule-summary-title" title="📅 Chi tiết chu kỳ 12 tuần">
        <div className="rounded-xl border border-app-line bg-white/50 dark:bg-black/20 p-4 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted">Thời gian diễn ra</p>
          <p className="mt-1.5 text-sm font-bold text-app-ink">
            Từ {cycleStartDate} đến {cycleEndDate}
          </p>
          <p className="mt-1 text-xs text-app-ink-soft/90">Chu kỳ gồm 12 tuần thực thi tập trung và 1 tuần đệm để đánh giá, nghỉ ngơi.</p>
        </div>
      </CollapsibleScheduleSection>

      {setupGuideSupport && setupGuideTemplate ? (
        <CollapsibleScheduleSection id="schedule-guide-title" title="💡 Chiến thuật gợi ý cho Tuần 1">
          <div className="rounded-xl border border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-violet-50/20 to-indigo-50/10 dark:from-violet-950/5 p-4.5 animate-fade-in">
            <p className="text-sm font-bold text-app-ink tracking-tight">{setupGuideSupport.week1Headline}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft/90">{setupGuideSupport.week1Support}</p>
            <div className="mt-3 rounded-lg border border-app-line bg-white/70 dark:bg-[#1C1A15]/75 px-3 py-2 text-xs leading-normal italic text-app-ink-soft/90">
              📌 {setupGuideSupport.week1CadenceHint}
            </div>
          </div>
        </CollapsibleScheduleSection>
      ) : null}

      {setupGuideSupport ? (
        <CollapsibleScheduleSection id="schedule-recommendation-title" title="⚡ Ngày xem lại & Nhịp tuần đề xuất">
          <div className="grid gap-3.5 sm:grid-cols-2 animate-fade-in">
            <div className="rounded-xl border border-app-line bg-white/50 dark:bg-black/20 p-4 shadow-xs">
              <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">Buổi nhìn lại tuần</p>
              <p className="mt-1.5 text-sm font-bold text-app-ink">{draft.reviewDay}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft/90">
                {setupGuideSupport.recommendedReviewReason}
              </p>
            </div>
            <div className="rounded-xl border border-app-line bg-white/50 dark:bg-black/20 p-4 shadow-xs">
              <p className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">Nhịp độ tải tuần</p>
              <p className="mt-1.5 text-sm font-bold text-app-ink">
                {getLoadPreferenceLabel(draft.tacticLoadPreference)}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft/90">{setupGuideSupport.recommendedLoadReason}</p>
            </div>
          </div>
        </CollapsibleScheduleSection>
      ) : null}

      {(draft.week4Milestone || draft.week8Milestone) && (
        <CollapsibleScheduleSection id="schedule-milestones-title" title="🚩 Các cột mốc quan trọng (Milestones)">
          <div className="grid gap-3.5 sm:grid-cols-2 animate-fade-in">
            {[
              { label: "Cột mốc Tuần 4", value: draft.week4Milestone, color: "border-sky-100 bg-sky-50/10 dark:border-sky-950/20 dark:bg-sky-950/10 text-sky-600 dark:text-sky-400" },
              { label: "Cột mốc Tuần 8", value: draft.week8Milestone, color: "border-rose-100 bg-rose-50/10 dark:border-rose-950/20 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400" },
            ].map((milestone) => (
              <div key={milestone.label} className={cn("rounded-xl border p-4 shadow-xs", milestone.color)}>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">
                  {milestone.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft/95 font-medium">{milestone.value}</p>
              </div>
            ))}
          </div>
        </CollapsibleScheduleSection>
      )}

      <CollapsibleScheduleSection id="schedule-week-one-title" title="📋 Danh sách việc ngày thường sẽ hiện ở màn Hôm nay">
        <div className="space-y-2 mt-1.5 animate-fade-in">
          {weekOneTaskPreview.length === 0 ? (
            <p className="text-xs leading-relaxed text-app-ink-muted italic">
              Khi bạn chốt việc lặp lại, Todolist cụ thể cho từng ngày sẽ hiển thị tự động tại đây. Hãy bắt đầu bằng cách làm ít nhưng đều đặn.
            </p>
          ) : (
            weekOneTaskPreview.map((task) => (
              <div
                key={task}
                className="rounded-xl border border-app-line bg-white/40 dark:bg-[#1C1A15]/40 px-4 py-2.5 text-xs text-app-ink-soft/90 transition-all duration-200 hover:bg-white/60 dark:hover:bg-black/20 flex items-center gap-2"
              >
                <span className="text-violet-400 font-semibold">•</span>
                <span>{task}</span>
              </div>
            ))
          )}
        </div>
        {weekOneTaskWarning ? (
          <div
            role="status"
            className="mt-3.5 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90 shadow-xs"
          >
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
            <span>
              <span className="font-bold">Lời khuyên chịu tải:</span> {weekOneTaskWarning}
            </span>
          </div>
        ) : null}
      </CollapsibleScheduleSection>
    </div>
  );
}
