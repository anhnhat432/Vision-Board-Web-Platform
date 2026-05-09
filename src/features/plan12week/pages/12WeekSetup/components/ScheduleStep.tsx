import { AlertTriangle, CalendarDays } from "lucide-react";

import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { formatDateInputValue } from "@/app/utils/storage";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { LOAD_PREFERENCE_OPTIONS, REVIEW_DAYS } from "../constants";
import { getLoadPreferenceLabel, getStartDateValidation } from "../helpers";
import type { TwelveWeekSetupDraft } from "../types";
import { SecondaryPanel } from "@/app/components/layout/SecondaryPanel";
import { useBreakpoint } from "@/app/hooks/useBreakpoint";

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
  const isDesktop = useBreakpoint();
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
    <div className="mx-auto max-w-4xl stack-section">
      <div className="stack-stack">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cycle-start-date">Ngày bắt đầu chu kỳ</Label>
            <Input
              id="cycle-start-date"
              type="date"
              value={draft.startDate}
              min={localTodayDateKey}
              aria-invalid={Boolean(startDateValidation.error)}
              aria-describedby={startDateDescription}
              className={startDateValidation.error ? "border-rose-300 focus-visible:ring-rose-200" : undefined}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
            {startDateValidation.error ? (
              <p id="cycle-start-date-error" role="alert" className="text-xs font-medium text-rose-700">
                {startDateValidation.error}
              </p>
            ) : null}
            {startDateValidation.warning ? (
              <p id="cycle-start-date-warning" role="status" className="text-xs font-medium text-amber-700">
                {startDateValidation.warning}
              </p>
            ) : null}
            <p id="cycle-start-date-helper" className="text-xs text-slate-500">Kế hoạch sẽ canh chu kỳ về Thứ Hai để việc và điểm tuần khớp nhau.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-day">Ngày nhìn lại hằng tuần</Label>
            <Select value={draft.reviewDay} onValueChange={(value) => onChange("reviewDay", value)}>
              <SelectTrigger id="review-day" aria-label="Chọn ngày nhìn lại hằng tuần">
                <SelectValue placeholder="Chọn ngày nhìn lại" />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_DAYS.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="week-load-preference">Nhịp tuần mặc định</Label>
          <Select
            value={draft.tacticLoadPreference}
            onValueChange={(value) =>
              onChange("tacticLoadPreference", value as TwelveWeekSetupDraft["tacticLoadPreference"])
            }
          >
            <SelectTrigger id="week-load-preference" aria-label="Chọn nhịp tuần mặc định">
              <SelectValue placeholder="Chọn nhịp tuần mặc định" />
            </SelectTrigger>
            <SelectContent>
              {LOAD_PREFERENCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Đây là nhịp khởi đầu của chu kỳ. Bạn vẫn có thể chỉnh lại sau trong phần Cài đặt.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="lag-metric-name">Chỉ số kết quả chính</Label>
            <Input
              id="lag-metric-name"
              value={draft.lagMetricName}
              onChange={(event) => onChange("lagMetricName", event.target.value)}
              placeholder="Ví dụ: số kg giảm, số bài xuất bản, doanh thu mới..."
            />
            <p className="text-xs text-slate-500">Đây là chỉ số kết quả cuối chu kỳ, khác với việc hằng tuần.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lag-metric-target">Mục tiêu</Label>
            <Input
              id="lag-metric-target"
              value={draft.lagMetricTarget}
              onChange={(event) => onChange("lagMetricTarget", event.target.value)}
              placeholder="Ví dụ: 12"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lag-metric-unit">Đơn vị của chỉ số</Label>
          <Input
            id="lag-metric-unit"
            value={draft.lagMetricUnit}
            onChange={(event) => onChange("lagMetricUnit", event.target.value)}
            placeholder="kg, bài, triệu đồng..."
          />
        </div>
      </div>
      <div className="stack-section rounded-[var(--r-card)] border border-white/70 bg-white/72 p-5">
        <SecondaryPanel title="Việc lặp lại và chỉ số" collapsible defaultOpen={isDesktop}>
          <p className="text-sm leading-7 text-slate-700">
            Việc lặp lại là việc bạn làm mỗi tuần. Chỉ số kết quả chính là con số dùng để nhìn lại xem chu kỳ có đi đúng
            hướng không.
          </p>
        </SecondaryPanel>
        <SecondaryPanel
          icon={<CalendarDays className="h-4 w-4" />}
          title="Chu kỳ 12 tuần"
          collapsible
          defaultOpen={isDesktop}
        >
          <p className="text-sm text-slate-600">
            {cycleStartDate} đến {cycleEndDate}
          </p>
        </SecondaryPanel>
        {setupGuideSupport && setupGuideTemplate && (
          <SecondaryPanel
            title="Nhịp tuần 1 theo khung"
            collapsible
            defaultOpen={isDesktop}
          >
            <div className="rounded-[var(--r-card)] border border-slate-900 bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-white/54">Nhịp nên giữ ở tuần 1</p>
              <p className="mt-2 text-base font-semibold">{setupGuideSupport.week1Headline}</p>
              <p className="mt-2 text-sm leading-7 text-white/78">{setupGuideSupport.week1Support}</p>
              <div className="mt-[var(--space-inline)] rounded-[var(--r-card)] border border-white/12 bg-white/8 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/54">Gợi ý duy trì</p>
                <p className="mt-2 text-sm leading-7 text-white/78">{setupGuideSupport.week1CadenceHint}</p>
              </div>
            </div>
          </SecondaryPanel>
        )}
        {setupGuideSupport && (
          <SecondaryPanel
            title="Khuyến nghị từ khung"
            collapsible
            defaultOpen={isDesktop}
          >
            <div className="rounded-[var(--r-card)] border border-white/70 bg-white/78 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ngày nhìn lại và mức tải tuần gợi ý</p>
              <div className="mt-[var(--space-inline)] grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--r-card)] border border-white/70 bg-slate-50/80 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Nhìn lại</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{draft.reviewDay}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{setupGuideSupport.recommendedReviewReason}</p>
                </div>
                <div className="rounded-[var(--r-card)] border border-white/70 bg-slate-50/80 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Nhịp tuần</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {getLoadPreferenceLabel(draft.tacticLoadPreference)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{setupGuideSupport.recommendedLoadReason}</p>
                </div>
              </div>
            </div>
          </SecondaryPanel>
        )}
        {(draft.week4Milestone || draft.week8Milestone) && (
          <SecondaryPanel
            title="Mốc quan trọng"
            collapsible
            defaultOpen={isDesktop}
          >
            <div className="rounded-[var(--r-card)] border border-white/70 bg-white/78 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mốc gợi ý theo khung</p>
              <div className="mt-[var(--space-inline)] stack-tight">
                <div className="rounded-[var(--r-card)] border border-white/70 bg-slate-50/80 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần 4</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{draft.week4Milestone}</p>
                </div>
                <div className="rounded-[var(--r-card)] border border-white/70 bg-slate-50/80 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần 8</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{draft.week8Milestone}</p>
                </div>
              </div>
            </div>
          </SecondaryPanel>
        )}
        <SecondaryPanel
          title="Xem trước tuần đầu"
          collapsible
          defaultOpen={isDesktop}
        >
          <div className="rounded-[var(--r-card)] border border-white/70 bg-white/78 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              {hasPreviewTasks ? "Những việc sẽ hiện ở màn Hôm nay" : "Tuần đầu nên mở bằng"}
            </p>
            <div className="mt-[var(--space-inline)] space-y-2">
              {weekOneTaskPreview.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Khi bạn chốt khung hoặc thêm việc, tuần đầu sẽ hiện rõ các việc cần mở ở màn Hôm nay.
                </p>
              ) : (
                weekOneTaskPreview.map((task) => (
                  <div key={task} className="rounded-[var(--r-card)] border border-white/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                    {task}
                  </div>
                ))
              )}
            </div>
            {weekOneTaskWarning ? (
              <p
                role="status"
                className="mt-[var(--space-inline)] flex items-start gap-1.5 text-xs leading-5 text-amber-700"
              >
                <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold">Cảnh báo:</span> {weekOneTaskWarning}
                </span>
              </p>
            ) : null}
          </div>
        </SecondaryPanel>
      </div>
    </div>
  );
}
