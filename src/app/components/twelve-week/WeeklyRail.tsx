import { AlertCircle, Check, Lock, Play } from "lucide-react";
import { cn } from "../ui/utils";

interface WeeklyRailProps {
  totalWeeks: number;
  currentWeek: number;
  selectedWeek: number;
  reviews: Array<{ weekNumber: number; reviewCompleted?: boolean }>;
  getCompletion: (weekNo: number) => { completed: number; total: number; percent: number; isEmpty: boolean };
  onSelectWeek: (weekNo: number) => void;
}

type WeekState = "completed" | "missed" | "current" | "future";

function getWeekState(weekNo: number, currentWeek: number, isCompleted: boolean): WeekState {
  if (weekNo > currentWeek) return "future";
  if (isCompleted) return "completed";
  if (weekNo < currentWeek) return "missed";
  return "current";
}

export function WeeklyRail({
  totalWeeks,
  currentWeek,
  selectedWeek,
  reviews,
  getCompletion,
  onSelectWeek,
}: WeeklyRailProps) {
  const weeks = totalWeeks || 12;
  const cycleProgress = Math.min(100, Math.round((currentWeek / weeks) * 100));

  return (
    <div
      data-testid="weekly-week-selector"
      className="rounded-card border border-app-line bg-app-surface px-4 pb-3.5 pt-4 shadow-app-sm sm:px-5"
    >
      {/* Cycle header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-3.5 w-1.5 shrink-0 rounded-full bg-app-accent" aria-hidden="true" />
          <span className="truncate text-xs font-bold text-app-ink">Hành trình 12 tuần</span>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-app-ink-muted">
          Tuần <span className="font-mono font-bold text-app-ink">{currentWeek}</span>
          <span className="text-app-ink-disabled">/{weeks}</span>
          <span className="mx-1.5 text-app-line-strong">·</span>
          <span className="font-mono font-bold text-app-accent tabular-nums">{cycleProgress}%</span> chặng đường
        </span>
      </div>

      {/* Cadence spine */}
      <div className="mt-3.5 flex gap-0 overflow-x-auto scrollbar-none snap-x select-none">
        {Array.from({ length: weeks }, (_, index) => {
          const weekNo = index + 1;
          const isSelected = selectedWeek === weekNo;
          const review = reviews.find((r) => r.weekNumber === weekNo);
          const isCompleted = Boolean(review?.reviewCompleted);
          const state = getWeekState(weekNo, currentWeek, isCompleted);
          const completion = getCompletion(weekNo);

          // Spine segments: filled up to the current week (frontier = current).
          const leftFilled = weekNo <= currentWeek; // segment between n-1 and n
          const rightFilled = weekNo < currentWeek; // segment between n and n+1

          let Icon = Play;
          let dotClass = "border-app-line bg-app-bg-subtle text-app-ink-disabled";
          let labelClass = "text-app-ink-muted";
          let barClass = "bg-app-line-strong/40";
          if (state === "completed") {
            Icon = Check;
            dotClass = "border-app-status-success/40 bg-app-status-success/12 text-app-status-success";
            labelClass = "text-app-ink-soft";
            barClass = "bg-app-status-success";
          } else if (state === "missed") {
            Icon = AlertCircle;
            dotClass = "border-app-status-error/40 bg-app-status-error/10 text-app-status-error";
            labelClass = "text-app-ink-soft";
            barClass = "bg-app-status-error";
          } else if (state === "current") {
            Icon = Play;
            dotClass = "border-app-accent bg-app-accent text-white";
            labelClass = "text-app-accent";
            barClass = "bg-app-accent";
          } else {
            Icon = Lock;
            dotClass = "border-app-line bg-app-bg-subtle text-app-ink-disabled";
            labelClass = "text-app-ink-disabled";
          }

          return (
            <button
              key={weekNo}
              type="button"
              onClick={() => onSelectWeek(weekNo)}
              aria-label={`Chọn tuần ${weekNo}`}
              aria-current={isSelected ? "true" : undefined}
              className="group relative flex min-w-[52px] flex-1 snap-start flex-col items-center gap-1.5 rounded-control px-0.5 py-1.5 outline-none transition-colors focus-visible:bg-app-accent-subtle/40"
            >
              {state === "current" && (
                <span className="absolute -top-0.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-pill bg-app-accent px-2 py-px text-[8px] font-extrabold uppercase tracking-[0.12em] text-white">
                  Hiện tại
                </span>
              )}

              <span className={cn("mt-2 text-[10px] font-bold uppercase tracking-wide", labelClass, isSelected && "text-app-accent")}>
                W{weekNo}
              </span>

              {/* Dot row with connecting spine */}
              <div className="relative flex h-7 w-full items-center justify-center">
                {weekNo > 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2",
                      leftFilled ? "bg-app-accent" : "bg-app-line",
                    )}
                  />
                )}
                {weekNo < weeks && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute right-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2",
                      rightFilled ? "bg-app-accent" : "bg-app-line",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200",
                    dotClass,
                    isSelected && "ring-2 ring-app-accent ring-offset-2 ring-offset-app-surface",
                    state === "current" && "scale-110",
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                </span>
              </div>

              {/* Completion micro-bar */}
              <div className="flex w-full flex-col items-center gap-1">
                <span className={cn("text-[9px] font-mono font-bold leading-none", isSelected ? "text-app-ink" : "text-app-ink-muted")}>
                  {completion.isEmpty ? "—" : `${completion.percent}%`}
                </span>
                <span className="h-1 w-full max-w-[34px] overflow-hidden rounded-full bg-app-bg-subtle">
                  <span
                    className={cn("block h-full rounded-full transition-all duration-300", barClass)}
                    style={{ width: `${completion.percent}%` }}
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
