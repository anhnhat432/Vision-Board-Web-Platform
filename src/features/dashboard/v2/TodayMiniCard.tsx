import { Link } from "react-router";
import { ArrowRight, CheckCircle2, Circle, ListTodo } from "lucide-react";

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
      className="rounded-[14px] border border-app-line bg-app-surface p-5"
      aria-labelledby="dashboard-today-mini-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-4">
        <h2 id="dashboard-today-mini-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-app-accent" />
          {title}
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">
          Đã chốt <span className="text-app-accent font-extrabold">{completedCount}</span> trên tổng số <span className="text-app-ink font-extrabold">{totalCount}</span> việc
        </p>
      </div>

      <div className="space-y-3.5">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-[14px] border border-app-line bg-app-surface px-4 py-3 hover:bg-app-accent-soft transition-colors duration-150"
            >
              {task.completed ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-app-accent shrink-0" />
              ) : (
                <Circle className="h-4.5 w-4.5 text-app-ink-muted hover:text-app-accent transition-colors duration-200 shrink-0" />
              )}
              <p
                className={`min-w-0 flex-1 line-clamp-1 text-sm font-medium leading-relaxed ${task.completed ? "text-app-ink-muted line-through" : "text-app-ink"}`}
              >
                {task.title}
              </p>
            </div>
          ))
        ) : (
          <div className="surface-empty rounded-[14px] border border-dashed border-app-line bg-app-bg/50 p-6 text-sm leading-relaxed text-app-ink-muted text-center italic">
            Hôm nay chưa có việc mở. Mở Today để thêm hoặc xem lại tuần.
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-app-line flex justify-end">
        <Link
          to="/today-v2"
          className="inline-flex items-center gap-1 text-xs font-bold text-app-accent hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Mở Today
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
