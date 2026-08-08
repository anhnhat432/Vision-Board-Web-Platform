import { AlertTriangle, CalendarCheck2 } from "lucide-react";

interface WeeklyPulseCardProps {
  currentWeek: number;
  totalWeeks: number;
  completedCount: number;
  totalCount: number;
  percent: number;
  overdueOpenCount: number;
  reviewDueToday: boolean;
}

export function WeeklyPulseCard({
  currentWeek,
  totalWeeks,
  completedCount,
  totalCount,
  percent,
  overdueOpenCount,
  reviewDueToday,
}: WeeklyPulseCardProps) {
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;

  return (
    <section
      data-tour-id="dashboard-plan-card"
      className="flex h-full flex-col rounded-card-lg border border-app-line bg-app-surface p-5 shadow-app-sm sm:p-6"
      aria-labelledby="dashboard-weekly-pulse-title"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-ink-muted">
        Tuần {currentWeek} / {totalWeeks}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <h2 id="dashboard-weekly-pulse-title" className="font-serif text-xl font-bold text-app-ink">
          Tuần này
        </h2>
        <span className="font-mono text-2xl font-bold tabular-nums text-app-accent">{safePercent}%</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-app-ink-soft">
        {completedCount}/{totalCount} việc
      </p>
      <div
        role="progressbar"
        aria-label={`Tiến độ tuần ${currentWeek}: ${safePercent}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safePercent}
        className="mt-4 h-2 overflow-hidden rounded-full bg-app-accent-soft"
      >
        <div className="h-full rounded-full bg-app-accent" style={{ width: `${safePercent}%` }} />
      </div>
      <div className="mt-5 space-y-2 text-xs font-semibold">
        {overdueOpenCount > 0 ? (
          <p className="flex items-center gap-2 rounded-control border border-app-status-warning/30 bg-app-status-warning/10 px-3 py-2 text-app-status-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {overdueOpenCount} việc đang trễ
          </p>
        ) : null}
        {reviewDueToday ? (
          <p className="flex items-center gap-2 rounded-control border border-app-line bg-app-bg-subtle px-3 py-2 text-app-ink-soft">
            <CalendarCheck2 className="h-4 w-4 text-app-accent" aria-hidden="true" />
            Review tuần đến hạn
          </p>
        ) : null}
      </div>
    </section>
  );
}
