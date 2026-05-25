import { Link } from "react-router";

import type { TwelveWeekTaskInstance } from "@/app/utils/storage";

interface TodayMiniCardProps {
  title?: string;
  tasks: TwelveWeekTaskInstance[];
  completedCount: number;
  totalCount: number;
}

export function TodayMiniCard({ title = "Việc hôm nay", tasks, completedCount, totalCount }: TodayMiniCardProps) {
  const visibleTasks = tasks.slice(0, 3);

  return (
    <section
      className="surface-raised rounded-xl border border-app-line bg-app-surface p-5"
      aria-labelledby="dashboard-today-mini-title"
    >
      <div>
        <h2 id="dashboard-today-mini-title" className="text-base font-semibold text-app-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-app-ink-muted">
          {completedCount}/{totalCount} việc
        </p>
      </div>

      <div className="mt-5 space-y-2">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 rounded-xl border border-app-line bg-app-bg px-3 py-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-[14px] shrink-0 items-center justify-center rounded-[4px] border ${
                  task.completed ? "border-app-accent bg-app-accent" : "border-[#C8C2B6] bg-app-surface"
                }`}
              />
              <p
                className={`min-w-0 flex-1 line-clamp-1 text-sm leading-5 ${task.completed ? "text-app-ink-muted line-through" : "text-app-ink"}`}
              >
                {task.title}
              </p>
            </div>
          ))
        ) : (
          <p className="surface-empty rounded-xl border border-dashed border-app-line bg-app-bg/50 px-3 py-3 text-sm leading-5 text-app-ink-muted">
            Hôm nay chưa có việc mở. Mở Today để thêm hoặc xem lại tuần.
          </p>
        )}
      </div>

      <Link
        to="/today-v2"
        className="mt-5 inline-flex text-sm font-medium text-app-accent transition-colors duration-150 hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
      >
        Mở Today →
      </Link>
    </section>
  );
}
