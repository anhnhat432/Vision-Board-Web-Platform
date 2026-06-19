import { ArrowRight, Calendar, ImageIcon } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";

import { getDashboardHeroMessage } from "./dashboard-hero-message";

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

  const { subheading, quote } = useMemo(
    () => getDashboardHeroMessage({ currentWeek, totalWeeks, progressPercent, featuredGoalTitle }),
    [currentWeek, totalWeeks, progressPercent, featuredGoalTitle],
  );

  return (
    <section
      data-testid="dashboard-primary-action-card"
      data-tour-id="dashboard-next-card"
      className="grid w-full select-none gap-6 rounded-3xl border border-app-line bg-app-surface p-6 shadow-app-sm md:grid-cols-[minmax(0,1fr)_340px] md:items-center md:p-8 lg:p-10"
    >
      {/* Welcome content */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-accent">{caption}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-bg px-3 py-0.5 text-xs font-semibold text-app-ink-soft">
            <Calendar className="h-3.5 w-3.5 text-app-accent" />
            {weekLabel}
          </span>
        </div>

        <h1 className="font-serif text-3xl font-medium leading-[1.15] tracking-tight text-app-ink sm:text-4xl md:text-[2.6rem]">
          Chào tuần mới, <span className="italic text-app-accent">{displayName}</span>
        </h1>

        <p className="max-w-xl text-sm leading-relaxed text-app-ink-soft">{subheading}</p>

        <div className="mt-4 max-w-xl rounded-r-xl border-l-2 border-app-accent/50 bg-app-accent-soft/40 py-2 pl-4">
          <p className="font-serif text-sm italic leading-relaxed text-app-ink-soft">“{quote}”</p>
        </div>
      </div>

      {/* Featured goal focus card */}
      <div
        data-tour-id="dashboard-plan-card"
        className="group/card rounded-3xl border border-app-line bg-app-bg-subtle p-6 transition-colors hover:border-app-accent/40"
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-accent">
          <ImageIcon className="h-3.5 w-3.5" />
          Tiêu điểm chu kỳ
        </p>

        <div className="my-3 flex h-20 w-full items-center justify-center overflow-hidden rounded-2xl border border-app-line bg-app-surface">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Bảng tầm nhìn</span>
        </div>

        <p className="line-clamp-2 break-words font-serif text-base font-medium leading-snug text-app-ink transition-colors group-hover/card:text-app-accent">
          {featuredGoalTitle}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-line" aria-hidden="true">
            <div
              className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-app-accent">{safeProgress}%</span>
        </div>

        <Link
          to={planHref}
          className="group mt-5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-app-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          <span>Mở kế hoạch 12 tuần</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
