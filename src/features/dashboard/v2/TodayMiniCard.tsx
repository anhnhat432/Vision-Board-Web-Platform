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
      className="rounded-[18px] border border-app-line bg-app-surface p-5 shadow-app-sm transition-all duration-300 hover:shadow-app-md"
      aria-labelledby="dashboard-today-mini-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-4">
        <h2 id="dashboard-today-mini-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-app-accent animate-pulse" />
          {title}
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">
          Đã hoàn thành <span className="text-app-accent font-extrabold">{completedCount}</span> trên tổng số <span className="text-app-ink font-extrabold">{totalCount}</span> việc
        </p>
      </div>

      <div className="space-y-3">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-3 rounded-[12px] border border-app-line bg-app-surface px-4 py-3 hover:border-app-accent/30 hover:bg-app-accent-subtle/20 hover:shadow-app-sm transition-all duration-300"
            >
              {task.completed ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-app-accent shrink-0 group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Circle className="h-4.5 w-4.5 text-app-ink-muted shrink-0 group-hover:text-app-accent group-hover:scale-110 transition-all duration-200" />
              )}
              <p
                className={`min-w-0 flex-1 line-clamp-1 text-xs font-semibold leading-relaxed transition-all duration-200 ${
                  task.completed ? "text-app-ink-muted line-through opacity-60" : "text-app-ink group-hover:text-app-accent"
                }`}
              >
                {task.title}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[12px] border border-dashed border-app-line bg-app-bg-subtle/30 p-6 text-center flex flex-col items-center justify-center gap-2.5">
            <ListTodo className="h-7 w-7 text-app-ink-muted/40 stroke-[1.25]" />
            <p className="text-xs font-semibold leading-relaxed text-app-ink-soft max-w-[24ch]">
              Hôm nay chưa có việc mở. Hãy mở Today để lên lịch thói quen hoặc nhiệm vụ mới!
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-app-line flex justify-end">
        <Link
          to="/today-v2"
          className="group inline-flex items-center gap-1 text-xs font-bold text-app-accent hover:text-app-accent-hover transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          <span>Mở Today</span>
          <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
