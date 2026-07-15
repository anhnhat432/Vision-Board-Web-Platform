import { Check, Lock } from "lucide-react";
import { cn } from "../ui/utils";

interface WeeklyRailProps {
  totalWeeks: number;
  currentWeek: number;
  selectedWeek: number;
  reviews: Array<{ weekNumber: number; reviewCompleted?: boolean }>;
  getCompletion: (weekNo: number) => { completed: number; total: number; percent: number; isEmpty: boolean };
  onSelectWeek: (weekNo: number) => void;
}

export function WeeklyRail({
  totalWeeks,
  currentWeek,
  selectedWeek,
  reviews,
  getCompletion,
  onSelectWeek,
}: WeeklyRailProps) {
  return (
    <div
      className="relative w-full rounded-card-lg border border-app-line/45 bg-app-surface/90 p-4 shadow-app-sm backdrop-blur-md sm:p-5"
      data-testid="weekly-week-selector"
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-app-line/20 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-3.5 bg-app-accent rounded-full" />
          <span className="text-xs font-serif font-bold text-app-ink">
            Nhịp độ chu kỳ 12 tuần
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-app-accent bg-app-accent-soft/60 px-2.5 py-0.5 rounded-full border border-app-line/10">
          Tuần {currentWeek}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative mt-5">
        {/* Track line behind nodes (desktop) */}
        <div className="hidden sm:block absolute top-[22px] left-5 right-5 h-0.5 bg-app-line/40 rounded-full z-0" />

        <div className="flex overflow-x-auto gap-2 sm:gap-1 pb-1.5 scrollbar-none snap-x select-none relative z-10">
          {Array.from({ length: totalWeeks || 12 }, (_, index) => {
            const weekNo = index + 1;
            const isSelected = selectedWeek === weekNo;
            const isSystemCurrent = currentWeek === weekNo;
            const review = reviews.find((r) => r.weekNumber === weekNo);
            const isCompleted = Boolean(review?.reviewCompleted);
            const completion = getCompletion(weekNo);
            const isFuture = weekNo > currentWeek;
            const isMissed = weekNo < currentWeek && !isCompleted;

            let nodeClass = "border border-dashed border-app-line bg-app-bg-subtle text-app-ink-muted/50";
            if (isCompleted) {
              nodeClass = "bg-app-status-success text-white border border-app-status-success shadow-sm";
            } else if (isMissed) {
              nodeClass = "border-2 border-app-status-error/45 bg-app-status-error/5 text-app-status-error";
            } else if (isSystemCurrent) {
              nodeClass = "bg-app-accent text-white border-2 border-app-accent shadow-app-sm";
            } else if (!isFuture) {
              nodeClass = "border border-app-line bg-app-surface text-app-ink-soft";
            }

            return (
              <button
                key={weekNo}
                type="button"
                className={cn(
                  "snap-start flex flex-col items-center justify-start gap-1.5 cursor-pointer relative",
                  "min-w-[44px] flex-1 pt-5 pb-1",
                )}
                onClick={() => onSelectWeek(weekNo)}
                aria-label={`Chọn tuần ${weekNo}`}
                aria-current={isSelected ? "true" : undefined}
              >
                {isSystemCurrent && (
                  <span className="absolute -top-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-app-accent px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                    Hiện tại
                  </span>
                )}
                <span
                  className={cn(
                    "relative flex items-center justify-center rounded-full transition-all duration-200",
                    isSystemCurrent ? "h-11 w-11" : "h-9 w-9",
                    isSelected && !isSystemCurrent && "ring-2 ring-app-accent ring-offset-2 ring-offset-app-surface",
                    nodeClass,
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : isFuture ? (
                    <Lock className="h-3 w-3 opacity-50" aria-hidden="true" />
                  ) : (
                    <span className="text-[11px] font-extrabold leading-none">{weekNo}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-mono font-bold leading-none tabular-nums",
                    isSelected ? "text-app-ink" : "text-app-ink-soft",
                  )}
                >
                  {isCompleted ? "✓" : completion.isEmpty ? "—" : `${completion.percent}%`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
