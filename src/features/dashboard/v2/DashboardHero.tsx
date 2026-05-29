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
      className="relative overflow-hidden rounded-[14px] border border-app-line bg-app-accent-soft p-6 md:p-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:items-center"
    >
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-app-accent flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
            </span>
            {caption}
          </p>
          <span className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-bold text-app-accent shadow-none flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {weekLabel}
          </span>
        </div>
        <h1 className="mt-5 max-w-3xl font-serif text-3xl font-medium leading-[1.2] tracking-normal text-app-ink sm:text-4xl md:text-5xl">
          Đây là bức tranh tuần <span className="text-app-accent font-semibold">{currentWeek ?? "--"}</span>, {displayName}.
        </h1>
        <p className="mt-4 text-sm text-app-ink-soft max-w-xl leading-relaxed">
          Chào ngày mới! Hãy theo sát kế hoạch 12 tuần của bạn, tập trung vào các cam kết cốt lõi để tạo ra bước chuyển dịch thực sự.
        </p>
      </div>

      <div
        data-tour-id="dashboard-plan-card"
        className="relative z-10 rounded-[14px] border border-app-line bg-app-surface p-5 shadow-none"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-ink-muted flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-app-accent" />
          Mục tiêu nổi bật
        </p>
        <p className="mt-2.5 line-clamp-2 break-words text-sm font-semibold leading-relaxed text-app-ink">
          {featuredGoalTitle}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-app-accent-soft" aria-hidden="true">
            <div className="h-full rounded-full bg-app-accent" style={{ width: `${safeProgress}%` }} />
          </div>
          <span className="text-xs font-bold text-app-accent tabular-nums">{safeProgress}%</span>
        </div>
        <Link
          to={planHref}
          className="mt-4 inline-flex items-center text-sm font-bold text-app-accent hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Mở kế hoạch tuần →
        </Link>
      </div>
    </section>
  );
}
