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
    <div className="rounded-card border border-dashed border-app-line bg-app-bg-subtle/40 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-app-line bg-app-surface text-app-ink-muted">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </div>

      <h3 className="font-serif text-lg font-bold text-app-ink">Tuần {weekNo} chưa bắt đầu</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-app-ink-soft">
        Tuần {weekNo} thuộc tương lai của chu kỳ. Hãy tập trung hoàn thành tuần hiện tại (Tuần {currentWeek}) để giữ
        vững đà hành động.
      </p>

      {tasks.length > 0 && (
        <div className="mx-auto mt-7 max-w-md rounded-card border border-app-line bg-app-surface p-5 text-left shadow-app-sm">
          <span className="mb-3 block border-b border-app-line pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
            Kế hoạch hành động dự kiến
          </span>
          <ul className="max-h-[160px] space-y-2.5 overflow-y-auto pr-1">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${task.isCore ? "bg-app-accent" : "bg-app-status-warning"}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-medium leading-tight text-app-ink">{task.title}</span>
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-app-ink-muted">
                  {task.isCore ? "Cốt lõi" : "Tùy chọn"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 inline-flex items-center gap-2 rounded-pill border border-app-line bg-app-accent-soft px-4 py-2 text-xs font-semibold text-app-accent">
        <Play className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Quay lại Tuần {currentWeek}</span>
      </div>
    </div>
  );
}
