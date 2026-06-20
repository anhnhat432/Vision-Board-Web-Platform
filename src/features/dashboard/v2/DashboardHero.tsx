import { ArrowRight, Calendar, ImageIcon, Sparkles } from "lucide-react";
import { useMemo } from "react";
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
      "Một tuần trôi qua ý nghĩa bắt đầu từ một ngày sống trọn vẹn.",
    ];
    const day = new Date().getDate();
    return quotes[day % quotes.length];
  }, []);

  return (
    <section
      data-testid="dashboard-primary-action-card"
      data-tour-id="dashboard-next-card"
      className="relative overflow-hidden rounded-3xl border border-app-line/50 bg-gradient-to-br from-app-accent-soft/60 via-app-surface to-app-status-warning/10 p-6 md:p-8 lg:p-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-center shadow-app-sm hover:shadow-app-md transition-shadow duration-300 select-none w-full"
    >
      {/* Welcome content */}
      <div className="relative z-10 space-y-4 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-app-accent flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-app-accent shrink-0" />
            {caption}
          </p>
          <span className="rounded-full border border-app-line/80 bg-app-surface/90 px-3.5 py-0.5 text-xs font-semibold text-app-accent flex items-center gap-1.5 shadow-[0_2px_8px_-4px_rgba(16,185,129,0.2)]">
            <Calendar className="h-3.5 w-3.5 text-app-accent/80" />
            {weekLabel}
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-[1.2] tracking-tight text-app-ink md:text-[2.75rem]">
          Chào tuần mới,{" "}
          <span className="font-serif font-bold underline decoration-app-energy/60 underline-offset-8 italic text-app-energy">
            {displayName}
          </span>
        </h1>

        <p className="text-xs sm:text-sm font-semibold text-app-ink-muted max-w-xl leading-relaxed">
          Tập trung vào vài việc quan trọng nhất tuần này.
        </p>

        {/* Life Quote Banner with deep and delicate design */}
        <div className="border-l-2 border-app-energy/50 bg-app-energy/5 pl-4 py-2 mt-4 max-w-xl rounded-r-xl shadow-2xs">
          <p className="font-serif italic text-app-energy text-xs leading-relaxed">
            “{selectedQuote}”
          </p>
        </div>
      </div>

      {/* Featured Goal focus card - premium dreamy polaroid layout */}
      <div
        data-tour-id="dashboard-plan-card"
        className="group/card relative z-10 rounded-3xl border border-app-line/50 bg-app-surface p-6 shadow-app-md hover:shadow-app-lg transition-all duration-300 overflow-hidden"
      >
        <p className="text-[9px] font-extrabold uppercase tracking-wide text-app-accent flex items-center gap-1.5 mt-2 relative z-10">
          <Sparkles className="h-3.5 w-3.5 text-app-accent" />
          Tiêu điểm chu kỳ
        </p>

        {/* Visual Dreamy Vision Anchor */}
          <div className="relative my-3 h-20 w-full rounded-2xl bg-gradient-to-tr from-app-accent-soft/40 via-app-status-warning/10 to-violet-100/40 overflow-hidden flex items-center justify-center border border-app-line/40 shadow-inner z-10">
            <ImageIcon className="h-6 w-6 text-app-ink-muted" />
          <div className="absolute inset-0 bg-black/2 flex items-end p-2">
            <span className="text-[8px] font-bold tracking-widest text-app-ink-soft bg-app-surface px-2 py-0.5 rounded-md backdrop-blur-xs">
              BẢNG TẦM NHÌN
            </span>
          </div>
        </div>

        <p className="mt-2 line-clamp-2 break-words text-xs font-bold leading-relaxed text-app-ink group-hover/card:text-app-accent transition-colors duration-200 relative z-10">
          {featuredGoalTitle}
        </p>

        {/* Slender modern progress line */}
        <div className="mt-4 flex items-center gap-3 relative z-10">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-app-bg-subtle"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-app-accent to-green-600 transition-all duration-500 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <span className="text-xs font-extrabold text-app-accent tabular-nums">{safeProgress}%</span>
        </div>

        <Link
          to={planHref}
          className="mt-4.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent-hover px-4 py-3 text-xs font-bold text-white shadow-app-sm hover:shadow-app-md hover:-translate-y-px active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 group cursor-pointer relative z-10"
        >
          <span>Mở kế hoạch 12 tuần</span>
          <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
