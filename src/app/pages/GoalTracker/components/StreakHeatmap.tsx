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

        // Thang một tông xanh + neutral (calm, không phán xét): xong = xanh đậm,
        // xong dở = xanh nhạt, có việc mà chưa làm = xám trung tính (không đỏ/hồng
        // gây cảm giác "toàn lỗi"), không có việc = nền rất nhạt.
        let colorClass = "bg-app-bg-subtle border border-app-line/10";
        if (stats.total > 0) {
          if (stats.completed === stats.total) {
            colorClass = "bg-app-accent";
          } else if (stats.completed > 0) {
            colorClass = "bg-app-accent/45";
          } else {
            colorClass = "bg-app-line/45";
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
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-app-ink-muted">
        <span>Nhịp độ hành động</span>
        <span className="text-[10px] font-semibold normal-case tracking-normal text-app-ink-muted/75">
          Chạm hoặc hover từng ô để xem ngày
        </span>
      </div>

      <div className="rounded-2xl border border-app-line/60 bg-app-bg-subtle/40 p-2.5">
        <div className="space-y-[3px]">
          {DAY_ROWS.map((row, rowIdx) => {
            return (
              <div key={`dayrow-${row.key}`} className="grid grid-cols-[22px_repeat(12,1fr)] items-center gap-[3px]">
                <span className="font-mono text-[9px] text-app-ink-muted">{row.label}</span>
                {weeks.map((weekDays) => {
                  const day = weekDays[rowIdx];
                  if (!day) return null;
                  return (
                    <div key={day.dateStr} className="group relative">
                      <button
                        type="button"
                        className={cn(
                          "block h-[12px] w-full cursor-default rounded-[4px] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                          day.colorClass,
                        )}
                        aria-label={day.label}
                        title={day.label}
                      />
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded border border-app-line/40 bg-app-ink px-2 py-1 text-[10px] leading-normal text-app-bg shadow-[var(--app-shadow-md)] group-hover:block group-focus-within:block">
                        {day.label}
                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-app-ink" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}