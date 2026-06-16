import { AlertTriangle, CalendarDays } from "lucide-react";

import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/components/ui/utils";
import { formatDateInputValue } from "@/app/utils/storage";
import { formatDisplayDate } from "@/app/utils/storage-date-utils";
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
  { value: "2h+", label: "2+ giờ", hint: "Tập trung sâu" },
] as const;

const radioButtonClass =
  "flex flex-col items-start gap-1 rounded-lg border border-app-line bg-app-surface p-3 text-left text-sm font-medium text-app-ink-soft transition-colors duration-150 hover:border-app-ink-muted hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30";
const radioButtonActiveClass = "border-app-accent bg-app-accent-soft text-app-accent";

export function ScheduleStep({
  draft,
  cycleStartDate,
  cycleEndDate,
  setupGuideSupport,
  setupGuideTemplate,
  hasPreviewTasks,
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
        className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 sm:p-6"
        aria-labelledby="schedule-main-title"
      >
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <div>
            <p id="schedule-main-title" className="text-sm font-medium text-app-ink">
              Khóa lịch trước khi lưu
            </p>
            <p className="mt-1 text-sm leading-6 text-app-ink-soft">
              Ngày bắt đầu, ngày nhìn lại và quỹ thời gian giúp tuần đầu không bị trôi.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cycle-start-date" className={labelClass}>
              Ngày bắt đầu chu kỳ
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
                startDateValidation.error &&
                  "border-[color:var(--color-danger-border)] focus-visible:border-[color:var(--color-danger-fg)] focus-visible:ring-[color:var(--color-danger-border)]",
              )}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
            {draft.startDate ? (
              <p className={helperTextClass}>Đã chọn: {formatDisplayDate(draft.startDate)}</p>
            ) : null}
            {startDateValidation.error ? (
              <p id="cycle-start-date-error" role="alert" className={errorTextClass}>
                {startDateValidation.error}
              </p>
            ) : null}
            {startDateValidation.warning ? (
              <p id="cycle-start-date-warning" role="status" className={helperTextClass}>
                {startDateValidation.warning}
              </p>
            ) : null}
            <p id="cycle-start-date-helper" className={helperTextClass}>
              Kế hoạch sẽ canh chu kỳ về Thứ Hai để việc và điểm tuần khớp nhau.
            </p>
          </div>

          <div>
            <label htmlFor="cycle-end-date" className={labelClass}>
              Ngày kết thúc
            </label>
            <Input
              id="cycle-end-date"
              value={cycleEndDate}
              readOnly
              className={cn(inputClass, "border-app-line bg-app-bg text-app-ink-muted")}
            />
            <p className={helperTextClass}>Tự tính 83 ngày sau ngày bắt đầu chu kỳ.</p>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className={labelClass}>Ngày trong tuần để nhìn lại</legend>
          <div className="grid grid-cols-7 gap-1">
            {REVIEW_DAYS.map((day) => {
              const isActive = draft.reviewDay === day.value;
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange("reviewDay", day.value)}
                  className={cn(
                    "rounded-md border border-app-line bg-app-surface px-2 py-2 text-sm text-app-ink-soft transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                    isActive && "border-app-accent bg-app-accent-soft font-medium text-app-accent",
                  )}
                >
                  {REVIEW_DAY_SHORT_LABEL[day.value] ?? day.label}
                </button>
              );
            })}
          </div>
          <p className={helperTextClass}>Một buổi nhìn lại cố định giúp bạn chỉnh sớm trước khi tuần lệch nhịp.</p>
        </fieldset>

        <fieldset className="mt-5">
          <legend className={labelClass}>Khung thời gian ưu tiên</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DAILY_TIME_OPTIONS.map((option) => {
              const isActive = draft.dailyTimeBudget === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange("dailyTimeBudget", option.value)}
                  className={cn(radioButtonClass, isActive && radioButtonActiveClass)}
                >
                  <span>{option.label}</span>
                  <span className="text-xs font-normal opacity-80">{option.hint}</span>
                </button>
              );
            })}
          </div>
          <p className={helperTextClass}>
            Ứng dụng lưu quỹ thời gian, không lưu giờ trong ngày, để giữ local-first gọn.
          </p>
        </fieldset>

        <fieldset className="mt-5">
          <legend className={labelClass}>Nhịp tuần mặc định</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {LOAD_PREFERENCE_OPTIONS.map((option) => {
              const isActive = draft.tacticLoadPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange("tacticLoadPreference", option.value)}
                  className={cn(radioButtonClass, isActive && radioButtonActiveClass)}
                >
                  <span>{option.label}</span>
                  <span className="text-xs font-normal opacity-80">
                    {option.value === "lighter" ? "Giữ sức" : option.value === "push" ? "Đẩy hơn" : "Vừa tay"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className={helperTextClass}>Đây là nhịp khởi đầu. Bạn vẫn có thể chỉnh lại sau trong phần Cài đặt.</p>
        </fieldset>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label htmlFor="lag-metric-name" className={labelClass}>
              Chỉ số kết quả chính
            </label>
            <Input
              id="lag-metric-name"
              value={draft.lagMetricName}
              onChange={(event) => onChange("lagMetricName", event.target.value)}
              placeholder="Ví dụ: số kg giảm, số bài xuất bản, doanh thu mới..."
              className={inputClass}
            />
            <p className={helperTextClass}>Đây là chỉ số kết quả cuối chu kỳ, khác với việc hằng tuần.</p>
          </div>
          <div>
            <label htmlFor="lag-metric-target" className={labelClass}>
              Mục tiêu
            </label>
            <Input
              id="lag-metric-target"
              value={draft.lagMetricTarget}
              onChange={(event) => onChange("lagMetricTarget", event.target.value)}
              placeholder="Ví dụ: 12"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="lag-metric-unit" className={labelClass}>
              Đơn vị của chỉ số
            </label>
            <Input
              id="lag-metric-unit"
              value={draft.lagMetricUnit}
              onChange={(event) => onChange("lagMetricUnit", event.target.value)}
              placeholder="kg, bài, triệu đồng..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-app-line bg-app-bg p-3" aria-labelledby="schedule-summary-title">
        <p id="schedule-summary-title" className="text-sm font-medium text-app-ink">
          Chu kỳ 12 tuần
        </p>
        <p className="mt-1 text-sm leading-6 text-app-ink-soft">
          {cycleStartDate} đến {cycleEndDate}
        </p>
      </section>

      {setupGuideSupport && setupGuideTemplate ? (
        <section className="rounded-lg border border-app-line bg-app-bg p-3" aria-labelledby="schedule-guide-title">
          <p id="schedule-guide-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
            Nhịp tuần 1 theo khung
          </p>
          <p className="mt-2 text-sm font-medium text-app-ink">{setupGuideSupport.week1Headline}</p>
          <p className="mt-2 text-sm leading-6 text-app-ink-soft">{setupGuideSupport.week1Support}</p>
          <div className="mt-3 rounded-lg border border-app-line bg-app-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Gợi ý duy trì</p>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">{setupGuideSupport.week1CadenceHint}</p>
          </div>
        </section>
      ) : null}

      {setupGuideSupport ? (
        <section
          className="rounded-lg border border-app-line bg-app-bg p-3"
          aria-labelledby="schedule-recommendation-title"
        >
          <p
            id="schedule-recommendation-title"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted"
          >
            Ngày nhìn lại và mức tải tuần gợi ý
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Nhìn lại</p>
              <p className="mt-2 text-sm font-medium text-app-ink">{draft.reviewDay}</p>
              <p className="mt-2 text-sm leading-6 text-app-ink-soft">{setupGuideSupport.recommendedReviewReason}</p>
            </div>
            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Nhịp tuần</p>
              <p className="mt-2 text-sm font-medium text-app-ink">
                {getLoadPreferenceLabel(draft.tacticLoadPreference)}
              </p>
              <p className="mt-2 text-sm leading-6 text-app-ink-soft">{setupGuideSupport.recommendedLoadReason}</p>
            </div>
          </div>
        </section>
      ) : null}

      {(draft.week4Milestone || draft.week8Milestone) && (
        <section
          className="rounded-lg border border-app-line bg-app-bg p-3"
          aria-labelledby="schedule-milestones-title"
        >
          <p
            id="schedule-milestones-title"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted"
          >
            Mốc gợi ý theo khung
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Tuần 4", value: draft.week4Milestone },
              { label: "Tuần 8", value: draft.week8Milestone },
            ].map((milestone) => (
              <div key={milestone.label} className="rounded-lg border border-app-line bg-app-surface p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                  {milestone.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-app-ink-soft">{milestone.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-app-line bg-app-bg p-3" aria-labelledby="schedule-week-one-title">
        <p
          id="schedule-week-one-title"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted"
        >
          {hasPreviewTasks ? "Những việc sẽ hiện ở màn Hôm nay" : "Tuần đầu nên mở bằng"}
        </p>
        <div className="mt-3 space-y-2">
          {weekOneTaskPreview.length === 0 ? (
            <p className="text-sm leading-6 text-app-ink-soft">
              Khi bạn chốt khung hoặc thêm việc, tuần đầu sẽ hiện rõ các việc cần mở ở màn Hôm nay.
            </p>
          ) : (
            weekOneTaskPreview.map((task) => (
              <div
                key={task}
                className="rounded-lg border border-app-line bg-app-surface px-4 py-3 text-sm text-app-ink-soft"
              >
                {task}
              </div>
            ))
          )}
        </div>
        {weekOneTaskWarning ? (
          <p
            role="status"
            className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-[color:var(--color-danger-fg)]"
          >
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">Cảnh báo:</span> {weekOneTaskWarning}
            </span>
          </p>
        ) : null}
      </section>
    </div>
  );
}
