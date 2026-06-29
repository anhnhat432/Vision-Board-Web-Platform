import { Lock, Play } from "lucide-react";
import type { TwelveWeekSystem } from "../../utils/storage-types";

interface WeeklyEmptyFutureProps {
  weekNo: number;
  currentWeek: number;
  system: TwelveWeekSystem;
}

export function WeeklyEmptyFuture({ weekNo, currentWeek, system }: WeeklyEmptyFutureProps) {
  const tasks = system.taskInstances.filter((t) => t.weekNumber === weekNo && !t.skipped);

  return (
    <div className="relative overflow-hidden rounded-card-lg border border-dashed border-app-line bg-gradient-to-br from-app-bg/40 via-app-surface/60 to-app-accent-soft/15 p-8 pt-12 pb-12 text-center shadow-xs">
      {/* Decorative pin */}
      <div className="absolute -top-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center pointer-events-none select-none">
        <div className="w-3.5 h-3.5 rounded-full bg-app-warm shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2),0_1.5px_3px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        </div>
      </div>

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-bg-subtle border border-app-line/45 text-app-ink-muted mb-4 shadow-3xs">
        <Lock className="h-5 w-5 text-app-ink-muted/50" />
      </div>

      <h3 className="font-serif text-lg font-bold text-app-ink">Tuần {weekNo} chưa bắt đầu</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-app-ink-soft">
        Tuần {weekNo} thuộc tương lai của chu kỳ. Hãy tập trung hoàn thành tuần hiện tại (Tuần {currentWeek}) để giữ vững đà hành động.
      </p>

      {tasks.length > 0 && (
        <div className="relative mt-8 max-w-md mx-auto text-left rounded-2xl border border-app-line/45 bg-app-surface p-5 shadow-3xs">
          {/* Washi tape */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-5.5 bg-app-warm-soft/40 backdrop-blur-[0.5px] rotate-[1deg] border border-dashed border-app-warm-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.01)] pointer-events-none select-none z-20" />
          
          <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted block mb-3 pb-1.5 border-b border-app-line/25">
            Kế hoạch hành động dự kiến
          </span>
          <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${task.isCore ? "bg-app-accent" : "bg-app-status-warning"}`}
                />
                <span className="flex-1 min-w-0 truncate text-app-ink font-medium leading-tight">
                  {task.title}
                </span>
                <span className="text-[9px] font-bold text-app-ink-soft bg-app-bg px-1.5 py-0.5 rounded border border-app-line/20 shrink-0">
                  {task.isCore ? "Cốt lõi" : "Tùy chọn"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-app-accent-soft/60 border border-app-line/20 px-4 py-2 text-xs font-semibold text-app-accent">
        <Play className="h-3.5 w-3.5" />
        <span>Quay lại Tuần {currentWeek}</span>
      </div>
    </div>
  );
}