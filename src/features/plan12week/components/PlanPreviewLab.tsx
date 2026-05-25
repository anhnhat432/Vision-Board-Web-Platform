import { CalendarDays, ClipboardCheck, Target, Zap } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import type { TwelveWeekSetupDraft } from "@/app/pages/12WeekSetup/types";

interface PlanPreviewLabProps {
  draft: TwelveWeekSetupDraft;
  previewPlan: {
    vision: string;
    weeks: Array<{
      weekNumber: number;
      focus: string;
      expectedOutput: string;
      leadMetrics: Array<{ name: string; weeklyTarget: number }>;
      tasks: Array<{ id: string; title: string; scheduledDate: string }>;
    }>;
  };
}

const formatDateLabel = (value: string) => {
  if (!value) return "Chưa chọn";

  return new Date(value).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
};

const REVIEW_DAY_LABELS: Record<string, string> = {
  Monday: "Thứ Hai",
  Tuesday: "Thứ Ba",
  Wednesday: "Thứ Tư",
  Thursday: "Thứ Năm",
  Friday: "Thứ Sáu",
  Saturday: "Thứ Bảy",
  Sunday: "Chủ Nhật",
};

const formatReviewDayLabel = (value: string) => REVIEW_DAY_LABELS[value] ?? (value || "Chưa chọn");

export function PlanPreviewLab({ draft, previewPlan }: PlanPreviewLabProps) {
  const week1 = previewPlan.weeks.find((week) => week.weekNumber === 1);
  const leadMetrics = week1?.leadMetrics ?? [];
  const weekOneTasks = week1?.tasks ?? [];
  const repeatedItems = leadMetrics.slice(0, 4);
  const lagMetricLabel = draft.lagMetricName.trim()
    ? `${draft.lagMetricName.trim()}: ${[draft.lagMetricTarget.trim(), draft.lagMetricUnit.trim()].filter(Boolean).join(" ")}`.trim()
    : "";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="overflow-hidden surface-raised rounded-xl border border-app-line bg-app-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Xác nhận kế hoạch</p>
            <h3 className="mt-2 text-xl font-semibold text-app-ink">Tóm tắt để rà soát nhanh</h3>
            <p className="mt-1 text-sm leading-6 text-app-ink-soft">
              Sau khi lưu, bạn sẽ tiếp tục vào phần thực thi hằng tuần và màn Hôm nay để bắt đầu việc đầu tiên.
            </p>
          </div>
          <Badge variant="brand" className="inline-flex min-h-10 shrink-0 items-center px-3 py-2">
            12 tuần
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-[var(--r-tile)] border border-app-line bg-app-bg p-3">
            <Target className="h-4 w-4 text-app-accent" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-app-ink-muted">Đích đến sau 12 tuần</p>
            <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-app-ink">{draft.week12Outcome || "Chưa có nội dung"}</p>
          </div>

          <div className="rounded-[var(--r-tile)] border border-app-line bg-app-bg p-3">
            <Zap className="h-4 w-4 text-app-ink-soft" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-app-ink-muted">Chỉ số kết quả</p>
            <p className="mt-1 text-sm font-semibold text-app-ink">
              {lagMetricLabel || "Chưa có chỉ số kết quả"}
            </p>
          </div>

          <div className="rounded-[var(--r-tile)] border border-app-line bg-app-bg p-3 sm:col-span-2 lg:col-span-3">
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-app-ink-soft" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.14em] text-app-ink-muted">Vì sao mục tiêu này quan trọng</p>
                <p className="mt-2 line-clamp-4 max-w-3xl text-sm font-medium leading-6 text-app-ink">
                  {draft.vision12Week || "Chưa có nội dung"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--r-tile)] border border-app-line bg-app-bg p-3">
            <CalendarDays className="h-4 w-4 text-app-ink-soft" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-app-ink-muted">Ngày bắt đầu</p>
            <p className="mt-1 text-sm font-semibold text-app-ink">{formatDateLabel(draft.startDate)}</p>
          </div>

          <div className="rounded-[var(--r-tile)] border border-app-line bg-app-bg p-3">
            <CalendarDays className="h-4 w-4 text-app-ink-soft" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-app-ink-muted">Ngày xem lại tuần</p>
            <p className="mt-1 text-sm font-semibold text-app-ink">{formatReviewDayLabel(draft.reviewDay)}</p>
          </div>

          <div className="rounded-[var(--r-tile)] border border-app-line bg-app-bg p-3 sm:col-span-2 lg:col-span-1">
            <CalendarDays className="h-4 w-4 text-app-ink-soft" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-app-ink-muted">Tuần 1 sẽ bắt đầu bằng gì</p>
            <p className="mt-1 text-sm font-semibold text-app-ink">
              {weekOneTasks.length > 0 ? `${weekOneTasks.length} việc đầu tiên` : "Giữ nhịp việc lặp lại"}
            </p>
          </div>
        </div>
      </section>

      <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-base font-semibold text-app-ink">2–4 việc lặp lại</h4>
            <p className="mt-1 text-sm leading-6 text-app-ink-soft">Giữ danh sách ngắn để dễ kiểm tra và không bị quá tải.</p>
          </div>
          <Badge variant="neutral" className="inline-flex min-h-10 shrink-0 items-center px-3 py-2">
            {leadMetrics.length} việc
          </Badge>
        </div>

        <div className="mt-3 flex gap-2 rounded-[var(--r-tile)] border border-app-line bg-app-bg p-3 text-sm leading-6 text-app-ink-soft">
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <p>
            Điểm thực thi chỉ đo bạn đã hoàn thành bao nhiêu việc lặp lại trong tuần. Đây không phải điểm đánh giá năng lực hay thành công chung. Ví dụ 8/10 việc = 80%.
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {repeatedItems.length > 0 ? (
            repeatedItems.map((leadMetric) => (
              <div key={leadMetric.name} className="rounded-[var(--r-tile)] border border-app-line bg-app-bg p-3">
                <p className="text-sm font-medium text-app-ink">{leadMetric.name}</p>
                <p className="mt-1 text-sm text-app-ink-soft">Mục tiêu tuần: {leadMetric.weeklyTarget}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-app-ink-soft">Chưa có việc lặp lại.</p>
          )}
        </div>
      </section>

      <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-4 sm:p-5">
        <h4 className="text-base font-semibold text-app-ink">Tuần 1</h4>
        {week1 ? (
          <div className="mt-4 space-y-2 text-sm text-app-ink-soft">
            {week1.focus ? (
              <p>
                <span className="font-medium text-app-ink">Trọng tâm:</span> {week1.focus}
              </p>
            ) : null}
            {week1.expectedOutput ? (
              <p className="whitespace-pre-line">
                <span className="font-medium text-app-ink">Kết quả dự kiến:</span> {week1.expectedOutput}
              </p>
            ) : null}
            {weekOneTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="rounded-[var(--r-tile)] border border-app-line bg-app-bg px-3 py-2">
                <p className="font-medium text-app-ink">{task.title}</p>
                <p>{formatDateLabel(task.scheduledDate)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-app-ink-soft">Chưa có dữ liệu tuần 1.</p>
        )}
      </section>
    </div>
  );
}
