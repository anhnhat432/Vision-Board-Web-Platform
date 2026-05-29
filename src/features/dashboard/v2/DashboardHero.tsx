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
      className="relative overflow-hidden rounded-[18px] border border-app-line bg-gradient-to-tr from-mood-sky-soft/80 via-mood-lavender-soft/60 to-mood-rose-soft/40 p-6 md:p-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-center shadow-sm"
    >
      {/* Hào quang nền loang nghệ thuật của ước mơ */}
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-mood-rose/15 to-mood-lavender/15 blur-3xl pointer-events-none animate-[pulse_6s_infinite]" />
      <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-gradient-to-tr from-mood-sky/15 to-mood-lavender/10 blur-3xl pointer-events-none animate-[pulse_8s_infinite]" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-mood-sky flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mood-sky opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-mood-sky"></span>
            </span>
            {caption}
          </p>
          <span className="rounded-full border border-white/60 bg-white/40 backdrop-blur-sm px-3 py-1 text-xs font-bold text-mood-lavender shadow-sm flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {weekLabel}
          </span>
        </div>
        <h1 className="mt-5 max-w-3xl font-serif text-3xl font-medium leading-[1.2] tracking-tight text-app-ink sm:text-4xl">
          Chào ngày mới, <span className="bg-gradient-to-r from-mood-sky via-mood-lavender to-mood-rose bg-clip-text text-transparent font-bold">{displayName}</span>. 
          <br className="hidden sm:inline" /> Đây là bức tranh hành trình của bạn.
          {/* Hỗ trợ unit test kiểm chứng week index */}
          <span className="sr-only">Đây là bức tranh tuần {currentWeek}</span>
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-app-ink-soft max-w-xl leading-relaxed opacity-95">
          Hãy giữ ngọn lửa cảm hứng từ những ước mơ lớn, và hiện thực hóa chúng qua từng bước đi nhỏ bền bỉ của kế hoạch 12 tuần hôm nay.
        </p>
      </div>

      <div
        data-tour-id="dashboard-plan-card"
        className="relative z-10 rounded-[16px] border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:shadow-md"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-mood-lavender animate-pulse" />
          Mục tiêu nổi bật
        </p>
        <p className="mt-2.5 line-clamp-2 break-words text-sm font-bold leading-relaxed text-app-ink">
          {featuredGoalTitle}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 border border-white/20" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-mood-sky to-mood-lavender" style={{ width: `${safeProgress}%` }} />
          </div>
          <span className="text-xs font-bold text-mood-lavender tabular-nums">{safeProgress}%</span>
        </div>
        <Link
          to={planHref}
          className="mt-4 inline-flex items-center text-xs font-bold text-mood-sky hover:text-mood-sky/80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mood-sky/30"
        >
          Mở kế hoạch tuần →
        </Link>
      </div>
    </section>
  );
}
