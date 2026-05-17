import { Link } from "react-router";

interface DashboardHeroProps {
  caption: string;
  currentWeek: number | null;
  totalWeeks: number;
  displayName: string;
  featuredGoalTitle: string;
  progressPercent: number;
  planHref: string;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function DashboardHero({
  caption,
  currentWeek,
  totalWeeks,
  displayName,
  featuredGoalTitle,
  progressPercent,
  planHref,
}: DashboardHeroProps) {
  const safeProgress = clampPercent(progressPercent);
  const weekLabel = currentWeek ? `Tuần ${currentWeek} / ${totalWeeks}` : "Tuần -- / 12";

  return (
    <section
      data-testid="dashboard-primary-action-card"
      data-tour-id="dashboard-next-card"
      className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-end"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">{caption}</p>
          <span className="rounded-full bg-app-accent-soft px-3 py-1 text-[13px] font-medium text-app-accent">
            {weekLabel}
          </span>
        </div>
        <h1 className="mt-4 max-w-3xl font-serif text-[38px] font-medium leading-[1.12] tracking-[-0.02em] text-app-ink sm:text-[44px]">
          Đây là bức tranh tuần {currentWeek ?? "--"}, {displayName}.
        </h1>
      </div>

      <div data-tour-id="dashboard-plan-card" className="hidden rounded-card border border-app-line bg-app-surface p-5 md:block">
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Mục tiêu nổi bật</p>
        <p className="mt-2 line-clamp-2 text-[15px] font-medium leading-5 text-app-ink">{featuredGoalTitle}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 w-[160px] overflow-hidden rounded-full bg-app-accent-soft" aria-hidden="true">
            <div className="h-full rounded-full bg-app-accent" style={{ width: `${safeProgress}%` }} />
          </div>
          <span className="text-[13px] font-semibold text-app-accent">{safeProgress}%</span>
        </div>
        <Link
          to={planHref}
          className="mt-4 inline-flex text-[14px] font-medium text-app-accent transition-colors duration-150 hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Mở kế hoạch tuần →
        </Link>
      </div>
    </section>
  );
}
