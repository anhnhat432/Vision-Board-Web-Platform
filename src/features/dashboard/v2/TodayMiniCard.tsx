import { ArrowRight, ListChecks, ListTodo } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage";

interface TodayMiniCardProps {
  title?: string;
  tasks: TwelveWeekTaskInstance[];
  completedCount: number;
  totalCount: number;
  companion?: ReactNode;
}

export function TodayMiniCard({
  title = "Hôm nay",
  tasks,
  completedCount,
  totalCount,
  companion,
}: TodayMiniCardProps) {
  const visibleTasks = tasks.slice(0, 3);
  const hiddenTaskCount = Math.max(0, tasks.length - visibleTasks.length);
  const emptyMessage =
    totalCount === 0
      ? "Hôm nay không có việc được lên lịch"
      : completedCount >= totalCount
        ? "Không còn việc mở cho hôm nay"
        : "Sau việc ưu tiên này, hôm nay không còn việc nào khác";

  return (
    <section
      className="overflow-hidden rounded-card border border-app-line bg-app-surface shadow-app-sm"
      aria-labelledby="dashboard-today-mini-title"
    >
      <div className="flex flex-col gap-3 border-b border-app-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="dashboard-today-mini-title"
            className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-app-accent"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-1 text-xs text-app-ink-soft">Các việc còn lại sau ưu tiên đầu tiên.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-app-accent-subtle px-3 py-1 font-mono text-xs font-bold text-app-accent">
            {completedCount}/{totalCount} việc
          </span>
          {companion}
        </div>
      </div>

      <div className="space-y-2.5 px-5 py-4">
        {visibleTasks.length > 0 ? (
          <>
            {visibleTasks.map((task, index) => (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-control border border-app-line bg-app-bg-subtle/50 px-4 py-3"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-app-accent-soft font-mono text-[11px] font-bold text-app-accent">
                  {index + 2}
                </span>
                <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-5 text-app-ink">{task.title}</p>
              </div>
            ))}
            {hiddenTaskCount > 0 ? (
              <p className="text-xs text-app-ink-muted">+ {hiddenTaskCount} việc khác trong Today workspace</p>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-control border border-dashed border-app-line bg-app-bg-subtle/30 p-5 text-center">
            <ListTodo className="h-5 w-5 text-app-ink-muted" aria-hidden="true" />
            <p className="max-w-[34ch] text-xs font-semibold leading-5 text-app-ink-muted">{emptyMessage}</p>
          </div>
        )}

        <Link
          to="/12-week-system?tab=today"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-app-line px-4 py-2.5 text-xs font-bold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Mở Today workspace
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
