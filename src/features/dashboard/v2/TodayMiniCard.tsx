import { Link } from "react-router";
import { ArrowRight, CheckCircle2, Circle, ListTodo } from "lucide-react";

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
      className="rounded-3xl border-2 border-app-accent/15 bg-white dark:bg-neutral-900 shadow-[0_16px_40px_-12px_rgba(47,93,80,0.04),0_4px_12px_-6px_rgba(0,0,0,0.01)] transition-all duration-300 hover:border-app-accent/30 hover:shadow-[0_20px_48px_-12px_rgba(47,93,80,0.06)] overflow-hidden relative select-none"
      aria-labelledby="dashboard-today-mini-title"
    >
      {/* 📌 Floating wood pin at the header */}
      <span className="absolute -top-3 left-6 text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">📌</span>

      <div className="flex flex-col gap-1.5 p-6 pb-4 bg-gradient-to-b from-app-accent-soft/10 to-transparent border-b border-neutral-200/60 dark:border-neutral-800/60 pt-7">
        <div className="flex items-center justify-between">
          <h2 id="dashboard-today-mini-title" className="text-xs font-bold uppercase tracking-[0.2em] text-app-accent flex items-center gap-2">
            <ListTodo className="h-4.5 w-4.5 text-app-accent" />
            {title}
          </h2>
          <span className="text-[10px] font-extrabold text-app-accent tabular-nums bg-app-accent-soft px-2.5 py-0.5 rounded-full border border-app-accent/10">
            {completedCount}/{totalCount} Việc
          </span>
        </div>
        
        <p className="text-xs font-medium leading-relaxed text-neutral-500 font-serif italic mt-1.5">
          “Duy trì sự nhất quán mỗi ngày để đạt mục tiêu lớn.”
        </p>

        {completedCount > 0 && totalCount > 0 && (
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            {completedCount >= totalCount
              ? "Tuyệt vời! Bạn đã hoàn thành toàn bộ công việc hôm nay."
              : "Tiếp tục đà tiến bước của bạn!"}
          </p>
        )}
      </div>

      <div className="p-6 pt-4 space-y-4">
        <div className="space-y-2.5">
          {visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-950/20 px-4 py-3 hover:border-app-accent/20 hover:bg-white dark:hover:bg-neutral-950 hover:shadow-sm transition-all duration-300 cursor-pointer"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4.5 w-4.5 text-neutral-300 dark:text-neutral-700 shrink-0 group-hover:text-app-accent transition-all duration-200" />
                )}
                <p
                  className={`min-w-0 flex-1 line-clamp-1 text-xs font-semibold leading-relaxed transition-all duration-200 ${
                    task.completed ? "text-neutral-400 line-through opacity-60" : "text-neutral-800 dark:text-neutral-200 group-hover:text-app-accent"
                  }`}
                >
                  {task.title}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/10 p-6 text-center flex flex-col items-center justify-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <ListTodo className="h-4.5 w-4.5 text-neutral-400" />
              </div>
              <p className="text-xs font-semibold leading-relaxed text-neutral-500 max-w-[24ch]">
                Hôm nay bạn chưa có việc cần làm. Hãy bắt đầu lên kế hoạch hành động.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-200/60 dark:border-neutral-800/60 flex justify-end">
          <Link
            to="/today-v2"
            className="group inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-[10px] font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 hover:border-app-accent/30 hover:text-app-accent shadow-sm transition-all duration-200 focus-visible:outline-none"
          >
            <span>Mở trang thực thi Today</span>
            <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
