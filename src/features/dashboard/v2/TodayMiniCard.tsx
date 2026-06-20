import { ArrowRight, CheckCircle2, Circle, ListTodo } from "lucide-react";
import { Link } from "react-router";

import type { TwelveWeekTaskInstance } from "@/app/utils/storage";

interface TodayMiniCardProps {
  title?: string;
  tasks: TwelveWeekTaskInstance[];
  completedCount: number;
  totalCount: number;
}

export function TodayMiniCard({ title = "Hành động hôm nay", tasks, completedCount, totalCount }: TodayMiniCardProps) {
  const visibleTasks = tasks.slice(0, 3);

  return (
    <section
      className="rounded-card border border-app-accent/20 bg-app-surface shadow-app-sm transition-all duration-300 hover:border-app-accent/35 hover:shadow-app-md overflow-hidden relative"
      aria-labelledby="dashboard-today-mini-title"
    >
      {/* 📌 Floating wood pin at the header */}
      <span className="hidden sm:inline absolute -top-3 left-6 text-base opacity-70 select-none cursor-default z-10">
        📌
      </span>

      <div className="flex flex-col gap-1.5 p-6 pb-4 bg-app-accent-subtle border-b border-app-line pt-7 relative z-10">
        <div className="flex items-center justify-between">
          <h2
            id="dashboard-today-mini-title"
            className="text-xs font-bold uppercase tracking-[0.2em] text-app-accent flex items-center gap-2"
          >
            <ListTodo className="h-4.5 w-4.5 text-app-accent" />
            {title}
          </h2>
          <span className="text-[10px] font-extrabold text-app-accent tabular-nums bg-app-accent-soft px-2.5 py-0.5 rounded-full border border-app-accent/10 shadow-[0_2px_8px_-3px_rgba(16,185,129,0.15)]">
            {completedCount}/{totalCount} Việc
          </span>
        </div>

        <p className="text-xs font-medium leading-relaxed text-app-ink-muted font-serif italic mt-1.5">
          “Duy trì sự nhất quán mỗi ngày để đạt mục tiêu lớn.”
        </p>

        {completedCount > 0 && totalCount > 0 && (
          <p className="text-[10px] font-bold text-app-status-success mt-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-app-status-success shrink-0" />
            {completedCount >= totalCount
              ? "Tuyệt vời! Bạn đã hoàn thành toàn bộ công việc hôm nay."
              : "Tiếp tục đà tiến bước của bạn!"}
          </p>
        )}
      </div>

      <div className="p-6 pt-4 space-y-4 relative z-10">
        <div className="space-y-2.5">
          {visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <div
                key={task.id}
                className="group/item flex items-center gap-3 rounded-control border border-app-line bg-app-bg-subtle px-4 py-3 hover:border-app-accent/35 hover:bg-app-surface hover:shadow-app-sm transition-all duration-300 hover:translate-x-1 cursor-pointer"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-app-status-success shrink-0 transition-transform duration-250 group-hover/item:scale-110" />
                ) : (
                  <Circle className="h-4.5 w-4.5 text-app-ink-disabled shrink-0 group-hover/item:text-app-accent group-hover/item:scale-110 transition-all duration-200" />
                )}
                <p
                  className={`min-w-0 flex-1 line-clamp-1 text-xs font-semibold leading-relaxed transition-all duration-200 ${
                    task.completed
                      ? "text-app-ink-muted line-through opacity-60"
                      : "text-app-ink group-hover/item:text-app-accent"
                  }`}
                >
                  {task.title}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-control border border-dashed border-app-line bg-app-bg-subtle p-6 text-center flex flex-col items-center justify-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-app-bg-subtle flex items-center justify-center">
                <ListTodo className="h-4.5 w-4.5 text-app-ink-muted" />
              </div>
              <p className="text-xs font-semibold leading-relaxed text-app-ink-muted max-w-[24ch]">
                Hôm nay bạn chưa có việc cần làm. Hãy bắt đầu lên kế hoạch hành động.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-app-line flex justify-end">
          <Link
            to="/12-week-system?tab=today"
            className="group inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-4 py-2 text-[10px] font-bold text-app-ink-soft hover:bg-app-accent-subtle hover:border-app-accent/30 hover:text-app-accent shadow-app-sm transition-all duration-200 focus-visible:outline-none"
          >
            <span>Mở trang thực thi Today</span>
            <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
