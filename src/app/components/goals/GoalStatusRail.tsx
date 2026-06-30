/**
 * GoalStatusRail — 12-dot journey rail
 *
 * Thay thế StreakHeatmap dày đặc bằng một dải 12 chấm gọn gàng,
 * mỗi chấm đại diện cho một tuần. Current week được highlight.
 *
 * Concept: Studio Desk / Mission Board
 */

import { useMemo } from "react";
import { cn } from "@/app/components/ui/utils";
import {
  getTwelveWeekCurrentWeek,
  type TwelveWeekSystem,
} from "@/app/utils/storage";

interface GoalStatusRailProps {
  system: TwelveWeekSystem;
  className?: string;
}

export function GoalStatusRail({ system, className }: GoalStatusRailProps) {
  const currentWeek = getTwelveWeekCurrentWeek(system);

  const weeks = useMemo(() => {
    const result: Array<{
      week: number;
      status: "completed" | "current" | "upcoming" | "missed";
    }> = [];

    for (let w = 1; w <= 12; w++) {
      const weekTasks = system.taskInstances.filter((t) => {
        if (!t.scheduledDate) return false;
        const taskDate = new Date(t.scheduledDate);
        const startDate = new Date(system.startDate);
        const daysDiff = Math.floor(
          (taskDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        const taskWeek = Math.floor(daysDiff / 7) + 1;
        return taskWeek === w;
      });

      const allCompleted =
        weekTasks.length > 0 && weekTasks.every((t) => t.completed || t.skipped);
      const hasProgress = weekTasks.some((t) => t.completed);

      let status: "completed" | "current" | "upcoming" | "missed";
      if (w === currentWeek) {
        status = "current";
      } else if (w < currentWeek) {
        status = allCompleted ? "completed" : hasProgress ? "missed" : "missed";
      } else {
        status = "upcoming";
      }

      result.push({ week: w, status });
    }

    return result;
  }, [system, currentWeek]);

  const completedCount = weeks.filter((w) => w.status === "completed").length;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-app-ink-muted">
          Hành trình 12 tuần
        </span>
        <span className="text-[10px] font-bold text-app-accent tabular-nums">
          {completedCount}/12 tuần
        </span>
      </div>

      {/* Rail */}
      <div className="flex items-center gap-1">
        {weeks.map(({ week, status }) => (
          <button
            key={week}
            type="button"
            className={cn(
              "relative flex-1 h-2 rounded-full transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:ring-offset-1",
              status === "completed" && "bg-app-accent",
              status === "current" && "bg-app-accent animate-pulse motion-safe:animate-pulse",
              status === "missed" && "bg-app-status-warning/40",
              status === "upcoming" && "bg-app-bg-subtle dark:bg-app-bg-subtle/60",
            )}
            aria-label={`Tuần ${week}: ${
              status === "completed"
                ? "Đã hoàn thành"
                : status === "current"
                  ? "Tuần hiện tại"
                  : status === "missed"
                    ? "Cần chú ý"
                    : "Sắp tới"
            }`}
            title={`Tuần ${week}`}
          >
            {/* Current week indicator */}
            {status === "current" && (
              <span
                className="absolute -top-0.5 -bottom-0.5 left-0 right-0 rounded-full border-2 border-app-accent/30 pointer-events-none"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[9px] text-app-ink-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-app-accent" aria-hidden="true" />
          <span>Đã xong</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-app-accent/50 animate-pulse motion-safe:animate-pulse" aria-hidden="true" />
          <span>Hiện tại</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-app-status-warning/40" aria-hidden="true" />
          <span>Cần chú ý</span>
        </span>
      </div>
    </div>
  );
}