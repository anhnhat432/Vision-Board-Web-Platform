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
      className="rounded-[18px] border border-app-line bg-app-surface shadow-sm transition-all duration-medium hover:border-app-accent/20 hover:shadow-md overflow-hidden"
      aria-labelledby="dashboard-today-mini-title"
    >
      <div className="flex flex-col gap-1 p-5 pb-4 border-b border-app-line/60">
        <h2 id="dashboard-today-mini-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <ListTodo className="h-4.5 w-4.5 text-app-accent" />
          {title}
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">
          Đã hoàn thành <span className="text-app-accent font-extrabold">{completedCount}</span> trên tổng số <span className="text-app-ink font-extrabold">{totalCount}</span> việc
        </p>
        {completedCount > 0 && totalCount > 0 && (
          <p className="text-[10px] font-semibold text-app-accent mt-1 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-app-accent" />
            {completedCount >= totalCount
              ? "Hoàn thành tất cả xuất sắc!"
              : "Đang duy trì đà thực hiện tốt."}
          </p>
        )}
      </div>

      <div className="p-5 pt-4 space-y-3">
        <div className="space-y-2.5">
          {visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-[12px] border border-app-line/80 bg-app-surface px-4 py-3 hover:border-app-accent/20 hover:bg-app-bg-subtle/30 transition-all duration-medium"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-app-accent shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-app-ink-muted shrink-0 group-hover:text-app-accent transition-colors duration-medium" />
                )}
                <p
                  className={`min-w-0 flex-1 line-clamp-1 text-xs font-medium leading-relaxed transition-all duration-medium ${
                    task.completed ? "text-app-ink-muted/70 line-through" : "text-app-ink group-hover:text-app-accent"
                  }`}
                >
                  {task.title}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-[12px] border border-dashed border-app-line bg-app-bg-subtle/30 p-6 text-center flex flex-col items-center justify-center gap-2.5">
              <ListTodo className="h-7 w-7 text-app-ink-muted/40 stroke-[1.25]" />
              <p className="text-xs font-medium leading-relaxed text-app-ink-soft max-w-[24ch]">
                Hôm nay chưa có việc mở. Hãy mở Today để lên lịch thói quen hoặc nhiệm vụ mới!
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-app-line/60 flex justify-end">
          <Link
            to="/today-v2"
            className="group inline-flex items-center gap-1 text-xs font-semibold text-app-accent hover:text-app-accent-hover transition-all duration-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          >
            <span>Mở Today</span>
            <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
