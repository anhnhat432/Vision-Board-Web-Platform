import { useMemo } from "react";
import type { TwelveWeekSystem } from "@/app/utils/storage";
import { cn } from "@/app/components/ui/utils";
import { formatDateStr, formatDayLabel, parseDateStr } from "./helpers";

interface StreakHeatmapProps {
  system: TwelveWeekSystem;
}

export function StreakHeatmap({ system }: StreakHeatmapProps) {
  const startDate = useMemo(() => {
    try {
      return parseDateStr(system.startDate);
    } catch {
      return new Date();
    }
  }, [system.startDate]);

  const weeks = useMemo(() => {
    const weeksList: Array<
      Array<{
        dateStr: string;
        total: number;
        completed: number;
        colorClass: string;
        label: string;
      }>
    > = [];

    const tasksMap = new Map<string, { total: number; completed: number }>();
    for (const task of system.taskInstances) {
      if (!task.scheduledDate) continue;
      const current = tasksMap.get(task.scheduledDate) || { total: 0, completed: 0 };
      current.total += 1;
      if (task.completed) {
        current.completed += 1;
      }
      tasksMap.set(task.scheduledDate, current);
    }

    for (let w = 0; w < 12; w++) {
      const days: Array<{
        dateStr: string;
        total: number;
        completed: number;
        colorClass: string;
        label: string;
      }> = [];

      for (let d = 0; d < 7; d++) {
        const dayIdx = w * 7 + d;
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + dayIdx);
        const dateKey = formatDateStr(targetDate);
        const stats = tasksMap.get(dateKey) || { total: 0, completed: 0 };

        let colorClass = "bg-app-bg-subtle dark:bg-app-bg-subtle/40 border border-transparent";
        if (stats.total > 0) {
          if (stats.completed === stats.total) {
            colorClass = "bg-app-accent border border-app-accent-hover/10";
          } else if (stats.completed > 0) {
            colorClass = "bg-app-accent-soft border border-app-accent/10";
          } else {
            colorClass = "bg-app-status-error/10 border border-app-status-error/20";
          }
        }

        const formattedDate = formatDayLabel(dateKey);
        const label =
          stats.total > 0
            ? `${formattedDate}: Chốt ${stats.completed}/${stats.total} việc`
            : `${formattedDate}: Không có việc lên lịch`;

        days.push({
          dateStr: dateKey,
          total: stats.total,
          completed: stats.completed,
          colorClass,
          label,
        });
      }
      weeksList.push(days);
    }
    return weeksList;
  }, [startDate, system.taskInstances]);

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-xs font-bold text-app-ink-soft">
        <span>Nhịp độ hành động</span>
        <span className="text-xs text-app-ink-muted font-normal">Hover xem chi tiết</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        <div className="flex flex-col justify-between h-[96px] text-[9px] font-bold text-app-ink-muted pr-1 select-none leading-none pt-0.5 pb-0.5">
          <span>T2</span>
          <span>T4</span>
          <span>T6</span>
          <span>CN</span>
        </div>

        <div className="flex gap-1">
          {weeks.map((weekDays) => (
            <div key={`week-${weekDays[0].dateStr}`} className="flex flex-col gap-1">
              {weekDays.map((day) => (
                <div key={day.dateStr} className="relative group flex justify-center">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-[2.5px] transition-colors duration-150 cursor-pointer hover:scale-125",
                      day.colorClass,
                    )}
                  />
                  <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-30 bg-app-ink text-app-bg text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-[var(--app-shadow-md)] pointer-events-none transform -translate-y-0.5 border border-app-line/40 leading-normal">
                    {day.label}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-app-ink dark:border-t-app-ink" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
