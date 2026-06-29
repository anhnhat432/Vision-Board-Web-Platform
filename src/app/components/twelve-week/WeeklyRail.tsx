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
      className="relative w-full rounded-card-lg border border-app-line/45 bg-app-surface/90 p-4 shadow-app-sm backdrop-blur-md overflow-hidden"
      data-testid="weekly-week-selector"
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-app-line/20 pb-2.5 mb-0.5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-3.5 bg-app-accent rounded-full" />
          <span className="text-xs font-serif font-bold text-app-ink">
            Nhịp độ chu kỳ 12 tuần
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-app-accent bg-app-accent-soft/60 px-2.5 py-0.5 rounded border border-app-line/10">
          Tuần thực tế: {currentWeek}
        </span>
      </div>

      {/* Rail track */}
      <div className="relative mt-3">
        {/* Track line running behind cards on desktop/tablet screens */}
        <div className="hidden sm:block absolute top-[26px] left-10 right-10 h-0.5 bg-app-line/40 rounded-full z-0" />

        <div className="flex overflow-x-auto gap-3 pb-1 scrollbar-none snap-x select-none relative z-10">
          {Array.from({ length: totalWeeks || 12 }, (_, index) => {
            const weekNo = index + 1;
            const isSelected = selectedWeek === weekNo;
            const isSystemCurrent = currentWeek === weekNo;
            const review = reviews.find((r) => r.weekNumber === weekNo);
            const isCompleted = Boolean(review?.reviewCompleted);
            const completion = getCompletion(weekNo);

            let StatusIcon = Play;
            let statusColorClass = "text-app-ink-muted";
            let statusCardClass = "weekly-rail-card-locked";

            if (weekNo > currentWeek) {
              StatusIcon = Lock;
              statusColorClass = "text-app-ink-muted/30";
              statusCardClass = "weekly-rail-card-locked";
            } else if (isCompleted) {
              StatusIcon = Check;
              statusColorClass = "text-app-status-success";
              statusCardClass = isSelected ? "weekly-rail-card-active" : "weekly-rail-card-completed";
            } else if (weekNo < currentWeek) {
              StatusIcon = AlertCircle;
              statusColorClass = "text-app-status-error";
              statusCardClass = isSelected ? "weekly-rail-card-active" : "weekly-rail-card-missed";
            } else {
              StatusIcon = Play;
              statusColorClass = "text-app-accent";
              statusCardClass = isSystemCurrent
                ? (isSelected ? "weekly-rail-card-active weekly-rail-card-current" : "weekly-rail-card-current")
                : (isSelected ? "weekly-rail-card-active" : "border-app-accent/40 bg-app-accent-soft/10");
            }

            return (
              <button
                key={weekNo}
                type="button"
                className={cn(
                  "snap-start flex flex-col items-center justify-between min-w-[70px] flex-1 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-center relative weekly-rail-card",
                  statusCardClass
                )}
                onClick={() => onSelectWeek(weekNo)}
                aria-label={`Chọn tuần ${weekNo}`}
                aria-current={isSelected ? "true" : undefined}
              >
                {isSystemCurrent && (
                  <span className="weekly-rail-current-badge">Hiện tại</span>
                )}
                <span
                  className={cn(
                    "text-[10px] uppercase font-bold tracking-wider mb-0.5",
                    isSelected ? "text-app-accent font-extrabold" : "text-app-ink-soft"
                  )}
                >
                  W{weekNo}
                </span>

                <div className="flex items-center justify-center my-1.5">
                  <StatusIcon className={cn("h-3.5 w-3.5", statusColorClass)} />
                </div>

                <div className="w-full mt-0.5 flex flex-col gap-1">
                  <span
                    className={cn(
                      "text-[9px] font-mono font-bold leading-none block",
                      isSelected ? "text-app-ink" : "text-app-ink-soft"
                    )}
                  >
                    {completion.isEmpty ? "—" : `${completion.percent}%`}
                  </span>

                  <div className="w-full h-1 bg-app-bg/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isCompleted
                          ? "bg-app-status-success"
                          : weekNo < currentWeek
                            ? "bg-app-status-error"
                            : "bg-app-accent"
                      )}
                      style={{ width: `${completion.percent}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}