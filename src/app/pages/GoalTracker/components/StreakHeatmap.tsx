import { useMemo } from "react";
import type { TwelveWeekSystem } from "@/app/utils/storage";
import { cn } from "@/app/components/ui/utils";
import { formatDateStr, formatDayLabel, parseDateStr } from "./helpers";

interface StreakHeatmapProps {
  system: TwelveWeekSystem;
}

const DAY_ROWS = [
  { key: "monday", label: "T2" },
  { key: "tuesday", label: "" },
  { key: "wednesday", label: "T4" },
  { key: "thursday", label: "" },
  { key: "friday", label: "T6" },
  { key: "saturday", label: "" },
  { key: "sunday", label: "CN" },
] as const;

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

        let colorClass = "bg-app-bg border border-app-line/5";
        if (stats.total > 0) {
          if (stats.completed === stats.total) {
            colorClass = "bg-app-accent";
          } else if (stats.completed > 0) {
            colorClass = "bg-app-accent/50";
          } else {
            colorClass = "bg-app-energy/30";
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
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-app-ink-muted">
        <span>Nhịp độ hành động</span>
        <span className="text-[10px] font-normal normal-case tracking-normal text-app-ink-muted/70">Hover xem chi tiết</span>
      </div>

      <div className="space-y-[3px]">
        {DAY_ROWS.map((row, rowIdx) => {
          return (
            <div key={`dayrow-${row.key}`} className="grid grid-cols-[22px_repeat(12,1fr)] gap-[3px] items-center">
              <span className="text-[9px] text-app-ink-muted font-mono">{row.label}</span>
              {weeks.map((weekDays) => {
                const day = weekDays[rowIdx];
                if (!day) return null;
                return (
                  <div key={day.dateStr} className="relative group">
                    <div
                      className={cn(
                        "w-full h-[12px] rounded-[3px] block transition-colors duration-150 cursor-pointer hover:scale-105",
                        day.colorClass,
                      )}
                    />
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 bg-app-ink text-app-bg text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-[var(--app-shadow-md)] pointer-events-none border border-app-line/40 leading-normal">
                      {day.label}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-app-ink" />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}