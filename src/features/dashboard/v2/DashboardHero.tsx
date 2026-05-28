import { Link } from "react-router";
import { Sparkles, Calendar } from "lucide-react";

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
      className="relative overflow-hidden rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-md p-6 md:p-8 shadow-xl transition-all duration-300 hover:shadow-2xl grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:items-center"
    >
      {/* Decorative gradient glow */}
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-app-accent/15 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {caption}
          </p>
          <span className="rounded-full border border-emerald-300/50 bg-app-surface/80 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-sm flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {weekLabel}
          </span>
        </div>
        <h1 className="mt-5 max-w-3xl font-serif text-3xl font-bold leading-[1.2] tracking-tight text-app-ink sm:text-4xl md:text-5xl">
          Đây là bức tranh tuần <span className="text-emerald-600 dark:text-emerald-400">{currentWeek ?? "--"}</span>, {displayName}.
        </h1>
        <p className="mt-3 text-sm text-app-ink-soft max-w-xl">
          Chào ngày mới! Hãy theo sát kế hoạch 12 tuần của bạn, tập trung vào các cam kết cốt lõi để tạo ra bước chuyển dịch thực sự.
        </p>
      </div>

      <div
        data-tour-id="dashboard-plan-card"
        className="surface-raised relative z-10 rounded-2xl border border-emerald-300/30 bg-app-surface/90 backdrop-blur-sm p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-ink-muted flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          Mục tiêu nổi bật
        </p>
        <p className="mt-2.5 line-clamp-2 break-words text-sm font-semibold leading-relaxed text-app-ink">
          {featuredGoalTitle}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/40" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${safeProgress}%` }} />
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{safeProgress}%</span>
        </div>
        <Link
          to={planHref}
          className="mt-4 inline-flex items-center text-sm font-bold text-app-accent hover:text-emerald-600 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Mở kế hoạch tuần →
        </Link>
      </div>
    </section>
  );
}
