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
      className="rounded-[18px] border border-app-line/75 bg-app-surface shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all duration-300 hover:border-app-accent/25 hover:shadow-[0_8px_24_rgba(47,93,80,0.03)] overflow-hidden"
      aria-labelledby="dashboard-today-mini-title"
    >
      <div className="flex flex-col gap-1 p-5 pb-4 bg-gradient-to-b from-app-accent-soft/10 to-transparent border-b border-app-line/50">
        <h2 id="dashboard-today-mini-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-app-accent/80" />
          {title}
        </h2>
        <p className="text-xs font-medium tracking-wide text-app-ink-muted/90">
          Đã hoàn thành <span className="text-app-accent font-semibold">{completedCount}</span> trên tổng số <span className="text-app-ink font-semibold">{totalCount}</span> việc
        </p>
        {completedCount > 0 && totalCount > 0 && (
          <p className="text-[10px] font-medium text-app-accent mt-1 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-app-accent" />
            {completedCount >= totalCount
              ? "Hoàn thành tất cả chuỗi việc ngày hôm nay"
              : "Đang duy trì đà hoàn thành tốt"}
          </p>
        )}
      </div>

      <div className="p-5 pt-4 space-y-3">
        <div className="space-y-2">
          {visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-[12px] border border-app-line/60 bg-app-surface/40 px-4 py-3 hover:border-app-accent/25 hover:bg-app-surface hover:shadow-[0_4px_12px_rgba(47,93,80,0.02)] transition-all duration-300"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-app-accent shrink-0 transition-transform duration-200" />
                ) : (
                  <Circle className="h-4.5 w-4.5 text-app-ink-muted/80 shrink-0 group-hover:text-app-accent transition-all duration-200" />
                )}
                <p
                  className={`min-w-0 flex-1 line-clamp-1 text-xs font-medium leading-relaxed transition-all duration-200 ${
                    task.completed ? "text-app-ink-muted line-through opacity-55" : "text-app-ink group-hover:text-app-accent"
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
            className="group inline-flex items-center gap-1 text-xs font-medium text-app-accent hover:text-app-accent-hover transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          >
            <span>Mở Today</span>
            <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
