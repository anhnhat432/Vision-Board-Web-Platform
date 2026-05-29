import { Link } from "react-router";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";

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
      className="relative overflow-hidden rounded-[18px] border border-app-line bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-green-100/40 dark:from-neutral-900 dark:via-green-950/20 dark:to-neutral-950 p-6 md:p-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-center shadow-app-md transition-all duration-300 hover:shadow-app-lg"
    >
      {/* Decorative background glows */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-app-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-app-accent flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
            </span>
            {caption}
          </p>
          <span className="rounded-full border border-app-line/60 bg-app-surface/90 px-3 py-1 text-xs font-bold text-app-accent shadow-app-sm flex items-center gap-1.5 backdrop-blur-sm">
            <Calendar className="h-3.5 w-3.5" />
            {weekLabel}
          </span>
        </div>
        
        <h1 className="font-serif text-3xl font-medium leading-[1.25] tracking-normal text-app-ink sm:text-4xl md:text-5xl">
          Đây là bức tranh tuần <span className="text-app-accent font-bold relative inline-block">
            {currentWeek ?? "--"}
            <span className="absolute bottom-1 left-0 w-full h-[3px] bg-app-accent/20 rounded-full" />
          </span>, {displayName}.
        </h1>
        <p className="text-sm text-app-ink-soft max-w-xl leading-relaxed font-sans">
          Chào ngày mới! Hãy theo sát kế hoạch 12 tuần của bạn, tập trung vào các cam kết cốt lõi để tạo ra bước chuyển dịch thực sự.
        </p>
      </div>

      <div
        data-tour-id="dashboard-plan-card"
        className="group/card relative z-10 rounded-[16px] border border-white/40 dark:border-neutral-800/40 bg-white/70 dark:bg-neutral-900/60 p-5 shadow-app-md backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:bg-white/80 dark:hover:bg-neutral-900/80 hover:shadow-app-lg"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-app-accent animate-pulse" />
          Mục tiêu nổi bật
        </p>
        <p className="mt-3 line-clamp-2 break-words text-sm font-bold leading-relaxed text-app-ink">
          {featuredGoalTitle}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-app-accent-soft" aria-hidden="true">
            <div className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out" style={{ width: `${safeProgress}%` }} />
          </div>
          <span className="text-xs font-bold text-app-accent tabular-nums">{safeProgress}%</span>
        </div>
        <Link
          to={planHref}
          className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-app-accent hover:text-app-accent-hover transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 group"
        >
          <span>Mở kế hoạch tuần</span>
          <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
