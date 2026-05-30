import { useMemo } from "react";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
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

  const selectedQuote = useMemo(() => {
    const quotes = [
      "Chậm lại một chút để nhìn rõ hơn hướng đi của mình.",
      "Mỗi ngày một hành động nhỏ, kiên trì tạo nên hành trình lớn.",
      "Tập trung vào hiện tại, kết quả sẽ tự an bài.",
      "Giữ tâm tĩnh tại giữa những ồn ào của cuộc sống.",
      "Sự nhất quán quan trọng hơn tốc độ.",
      "Lắng nghe bản thân và bước tiếp với sự rõ ràng.",
      "Một tuần trôi qua ý nghĩa bắt đầu từ một ngày sống trọn vẹn."
    ];
    const day = new Date().getDate();
    return quotes[day % quotes.length];
  }, []);

  return (
    <section
      data-testid="dashboard-primary-action-card"
      data-tour-id="dashboard-next-card"
      className="relative overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-neutral-800/85 bg-gradient-to-br from-white via-white to-emerald-50/10 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900/10 p-6 md:p-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-center shadow-[0_12px_36px_rgba(0,0,0,0.008)] select-none"
    >
      {/* Decorative ambient light */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-app-accent/5 blur-[80px]" />
      
      {/* 📌 Pin indicator on top header corner to echo Variant B vibe */}
      <span className="absolute top-4 left-4 text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">📌</span>

      {/* Welcome content */}
      <div className="relative z-10 space-y-5 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-app-accent shrink-0" />
            {caption}
          </p>
          <span className="rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 px-3 py-0.5 text-xs font-semibold text-app-accent flex items-center gap-1.5 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-app-accent/80" />
            {weekLabel}
          </span>
        </div>

        <h1 className="font-serif text-3xl font-normal leading-[1.25] tracking-tight text-app-ink sm:text-4xl md:text-[2.75rem]">
          Chào tuần mới, <span className="font-medium underline decoration-amber-400/50 decoration-wavy underline-offset-4 italic">{displayName}</span>.
        </h1>
        
        <p className="text-xs font-semibold text-neutral-500 max-w-xl leading-relaxed">
          Tập trung năng lượng vào các cam kết cốt lõi dưới đây. Một chu kỳ hành động tĩnh tại và chất lượng đang chờ đón bạn.
        </p>

        {/* Life Quote Banner with deep and delicate design */}
        <div className="border-l-2 border-amber-400/60 bg-amber-500/5 pl-4 py-2.5 mt-5 max-w-xl rounded-r-xl">
          <p className="font-serif italic text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
            “{selectedQuote}”
          </p>
        </div>
      </div>

      {/* Featured Goal focus card - premium frosted layout */}
      <div
        data-tour-id="dashboard-plan-card"
        className="group/card relative z-10 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md p-6 shadow-sm transition-all duration-300 hover:border-app-accent/35 hover:shadow-md -rotate-[1deg] hover:rotate-0"
      >
        {/* 📌 Floating pin on the goal card itself */}
        <span className="absolute -top-3 left-4 text-lg select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">📌</span>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-app-accent animate-pulse" />
          Tiêu điểm chu kỳ
        </p>
        
        <p className="mt-3 line-clamp-2 break-words text-xs font-bold leading-relaxed text-neutral-800 dark:text-neutral-200 group-hover/card:text-app-accent transition-colors duration-200">
          {featuredGoalTitle}
        </p>

        {/* Slender modern progress line */}
        <div className="mt-4.5 flex items-center gap-3">
          <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden="true">
            <div
              className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <span className="text-xs font-extrabold text-app-accent tabular-nums">{safeProgress}%</span>
        </div>

        <Link
          to={planHref}
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:-translate-y-px transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 group"
        >
          <span>Mở kế hoạch 12 tuần</span>
          <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
