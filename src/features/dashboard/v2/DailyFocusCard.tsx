import { CalendarDays, Check, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/app/components/ui/button";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage-types";

interface DailyFocusCardProps {
  task: TwelveWeekTaskInstance | null;
  goalTitle: string;
  completedCount: number;
  totalCount: number;
  reviewDueToday: boolean;
  completing: boolean;
  onComplete: (taskId: string) => void;
}

export function DailyFocusCard({
  task,
  goalTitle,
  completedCount,
  totalCount,
  reviewDueToday,
  completing,
  onComplete,
}: DailyFocusCardProps) {
  if (task) {
    return (
      <section
        data-testid="dashboard-primary-action-card"
        data-tour-id="dashboard-next-card"
        className="relative overflow-hidden rounded-card-lg border border-app-accent/20 bg-app-surface p-5 shadow-app-md sm:p-7"
        aria-labelledby="dashboard-daily-focus-title"
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-app-accent" aria-hidden="true" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
          Việc quan trọng nhất hôm nay
        </p>
        <h2
          id="dashboard-daily-focus-title"
          data-testid="dashboard-daily-focus"
          className="mt-3 max-w-[28ch] break-words font-serif text-2xl font-bold leading-tight text-app-ink sm:text-3xl"
        >
          {task.title}
        </h2>
        <p className="mt-3 text-sm text-app-ink-soft">
          Mục tiêu: <span className="font-semibold text-app-ink">{goalTitle}</span>
        </p>
        <Button
          data-testid="dashboard-primary-mark-done"
          size="lg"
          loading={completing}
          className="mt-6 min-h-11 w-full sm:w-auto"
          aria-label={`Đánh dấu xong: ${task.title}`}
          onClick={() => onComplete(task.id)}
        >
          <Check aria-hidden="true" />
          Đánh dấu xong
        </Button>
      </section>
    );
  }

  const allDone = totalCount > 0 && completedCount >= totalCount;
  const title = allDone
    ? `Hôm nay đã hoàn thành ${completedCount}/${totalCount}`
    : "Hôm nay không có việc được lên lịch";
  const description = allDone
    ? "Bạn đã khép lại toàn bộ việc được lên lịch hôm nay."
    : "Giữ ngày trống đúng nghĩa hoặc mở tuần để xem việc sắp tới.";

  return (
    <section
      data-testid="dashboard-primary-action-card"
      data-tour-id="dashboard-next-card"
      className="rounded-card-lg border border-app-accent/20 bg-app-accent-subtle/45 p-5 shadow-app-sm sm:p-7"
      aria-labelledby="dashboard-daily-closure-title"
    >
      <span
        className="flex size-11 items-center justify-center rounded-full bg-app-accent-soft text-app-accent"
        aria-hidden="true"
      >
        {allDone ? <CheckCircle2 /> : <CalendarDays />}
      </span>
      <h2
        id="dashboard-daily-closure-title"
        data-testid="dashboard-daily-closure"
        className="mt-4 font-serif text-2xl font-bold text-app-ink"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-[48ch] text-sm leading-6 text-app-ink-soft">{description}</p>
      <Link
        to="/12-week-system?tab=week"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-control border border-app-line bg-app-surface px-4 py-2 text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
      >
        {reviewDueToday ? "Review tuần" : "Xem tuần này"}
      </Link>
    </section>
  );
}
