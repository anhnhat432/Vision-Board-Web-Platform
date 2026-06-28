import { ArrowRight, ListChecks, ListTodo } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";

import type { TwelveWeekTaskInstance } from "@/app/utils/storage";

interface TodayMiniCardProps {
  title?: string;
  tasks: TwelveWeekTaskInstance[];
  completedCount: number;
  totalCount: number;
  companion?: ReactNode;
}

export function TodayMiniCard(props: TodayMiniCardProps) {
  const { title = "Việc hôm nay", tasks, completedCount, totalCount, companion } = props;
  const visibleTasks = tasks.slice(0, 3);
  const allDone = totalCount > 0 && completedCount >= totalCount;
  const hint = allDone
    ? "Tuyệt vời! Bạn đã hoàn thành việc hôm nay."
    : "Duy trì sự nhất quán mỗi ngày để đạt mục tiêu lớn.";

  return (
    <section
      className="overflow-hidden rounded-[20px] glass-panel glass-panel-hover"
      aria-labelledby="dashboard-today-mini-title"
    >
      <div className="border-b border-app-line bg-gradient-to-b from-app-accent-subtle to-app-surface px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h2
                id="dashboard-today-mini-title"
                className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-app-accent"
              >
                <ListChecks className="h-[15px] w-[15px]" />
                {title}
              </h2>
              <motion.span
                key={`${completedCount}/${totalCount}`}
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: allDone ? [1, 1.15, 1] : 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 15 }}
                className={`rounded-full px-3 py-1 font-mono text-xs font-extrabold transition-all duration-300 ${
                  allDone
                    ? "bg-app-status-success text-white shadow-lg shadow-app-status-success/30"
                    : "bg-app-accent text-app-highlight"
                }`}
              >
                {completedCount}/{totalCount} việc
              </motion.span>
            </div>
            <p className="font-serif text-[12.5px] italic text-app-ink-soft">{hint}</p>
          </div>
          {companion ? <div className="flex shrink-0 justify-end md:block md:self-start">{companion}</div> : null}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-5 py-4">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 rounded-[13px] border px-4 py-3.5 ${
                task.completed
                  ? "border-app-accent/20 bg-app-accent-subtle/40"
                  : "border-app-line bg-app-bg-subtle/40"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                  task.completed
                    ? "border-2 border-app-accent bg-app-accent text-white"
                    : "border-2 border-app-line-strong bg-app-surface text-transparent"
                }`}
              >
                ✓
              </span>
              <p
                className={`min-w-0 flex-1 line-clamp-1 text-sm font-semibold ${
                  task.completed ? "text-app-ink-muted line-through" : "text-app-ink"
                }`}
              >
                {task.title}
              </p>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-[13px] border border-dashed border-app-line bg-app-bg-subtle/20 p-6 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-app-bg-subtle">
              <ListTodo className="h-[18px] w-[18px] text-app-ink-muted" />
            </div>
            <p className="max-w-[24ch] text-xs font-semibold leading-relaxed text-app-ink-muted">
              Hôm nay bạn chưa có việc cần làm. Hãy bắt đầu lên kế hoạch hành động.
            </p>
          </div>
        )}

        <Link
          to="/12-week-system?tab=today"
          className="group mt-1 inline-flex items-center gap-1.5 self-end rounded-full border border-app-line px-4 py-2.5 text-xs font-bold text-app-ink transition-all duration-200 hover:border-app-accent/30 hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          <span>Mở trang thực thi Today</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
