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
      className="relative overflow-hidden rounded-3xl border border-emerald-100/50 dark:border-neutral-800/80 bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/20 dark:from-neutral-950 dark:via-neutral-950 dark:to-emerald-950/10 p-6 md:p-8 lg:p-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-center shadow-3xs select-none w-full"
    >
      {/* Decorative ambient light */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-app-accent/5 blur-[80px] dark:bg-app-accent/10" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px] dark:bg-amber-500/5" />
      
      {/* 📌 Pin indicator on top header corner */}
      <span className="absolute top-4 left-4 text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">📌</span>

      {/* Welcome content */}
      <div className="relative z-10 space-y-4 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-app-accent shrink-0 animate-ping" />
            {caption}
          </p>
          <span className="rounded-full border border-emerald-100/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/80 px-3.5 py-0.5 text-xs font-semibold text-app-accent flex items-center gap-1.5 shadow-3xs">
            <Calendar className="h-3.5 w-3.5 text-app-accent/80" />
            {weekLabel}
          </span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-semibold leading-[1.25] tracking-tight text-app-ink md:text-[2.5rem]">
          Chào tuần mới, <span className="font-semibold underline decoration-amber-400/50 decoration-wavy underline-offset-4 italic">{displayName}</span>
        </h1>
        
        <p className="text-xs sm:text-sm font-semibold text-neutral-500 max-w-xl leading-relaxed dark:text-neutral-400">
          Hãy tập trung năng lượng vào các cam kết cốt lõi. Một chu kỳ hành động tĩnh tại và chất lượng đang chờ đón bạn.
        </p>

        {/* Life Quote Banner with deep and delicate design */}
        <div className="border-l-2 border-amber-400/60 bg-amber-500/5 pl-4 py-2 mt-4 max-w-xl rounded-r-xl">
          <p className="font-serif italic text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
            “{selectedQuote}”
          </p>
        </div>
      </div>

      {/* Featured Goal focus card - premium dreamy wood layout */}
      <div
        data-tour-id="dashboard-plan-card"
        className="group/card relative z-10 rounded-3xl border border-neutral-200/60 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 p-6 shadow-md transition-all duration-300 hover:shadow-lg -rotate-[1deg] hover:rotate-0 overflow-hidden"
      >
        {/* Background gradient dreamy mờ ảo giả lập Vision Board */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-amber-500/5 to-violet-500/5 opacity-80 pointer-events-none" />

        {/* 📌 Floating pin on the goal card itself */}
        <span className="absolute top-2 left-6 text-xl select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)]">📌</span>

        <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-app-accent flex items-center gap-1.5 mt-2 relative z-10">
          <Sparkles className="h-3.5 w-3.5 text-app-accent animate-pulse" />
          Tiêu điểm chu kỳ
        </p>
        
        {/* Visual Dreamy Vision Anchor */}
        <div className="relative my-3 h-20 w-full rounded-2xl bg-gradient-to-tr from-emerald-100/40 via-amber-100/30 to-violet-100/40 dark:from-neutral-800 dark:to-neutral-900 overflow-hidden flex items-center justify-center border border-neutral-200/40 dark:border-neutral-800 shadow-inner z-10">
          <span className="text-3xl animate-bounce duration-1000">🎨</span>
          <div className="absolute inset-0 bg-black/2 flex items-end p-2">
            <span className="text-[8px] font-bold tracking-widest text-neutral-600 dark:text-neutral-400 bg-white/80 dark:bg-neutral-900/80 px-2 py-0.5 rounded-md backdrop-blur-xs">BẢNG TẦM NHÌN</span>
          </div>
        </div>
        
        <p className="mt-2 line-clamp-2 break-words text-xs font-bold leading-relaxed text-neutral-800 dark:text-neutral-200 group-hover/card:text-app-accent transition-colors duration-200 relative z-10">
          {featuredGoalTitle}
        </p>

        {/* Slender modern progress line */}
        <div className="mt-4 flex items-center gap-3 relative z-10">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-to-r from-app-accent to-green-600 transition-all duration-500 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <span className="text-xs font-extrabold text-app-accent tabular-nums">{safeProgress}%</span>
        </div>

        <Link
          to={planHref}
          className="mt-4.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent-hover px-4 py-3 text-xs font-bold text-white shadow-sm hover:-translate-y-px active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 group cursor-pointer relative z-10"
        >
          <span>Mở kế hoạch 12 tuần</span>
          <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
