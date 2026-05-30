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
      className="relative overflow-hidden rounded-[18px] border border-app-line bg-gradient-to-br from-white via-white to-app-accent-soft/10 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900/5 p-6 md:p-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-center shadow-sm"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-app-accent/5 blur-[80px]" />
      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-app-accent/80 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-app-accent shrink-0" />
            {caption}
          </p>
          <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs font-semibold text-app-accent flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-app-accent/80" />
            {weekLabel}
          </span>
        </div>

        <h1 className="font-serif text-3xl font-medium leading-tight tracking-normal text-app-ink sm:text-4xl md:text-5xl">
          Đây là bức tranh tuần <span className="text-app-accent font-medium">{currentWeek ?? "--"}</span>, {displayName}.
        </h1>
        <p className="text-sm font-normal text-app-ink-soft/90 max-w-xl leading-relaxed font-sans">
          Chào ngày mới! Hãy theo sát hành trình 12 tuần của bạn và tập trung vào các cam kết cốt lõi ngày hôm nay.
        </p>
        <div className="border-l border-app-warm/30 pl-4 py-2.5 mt-5 max-w-xl">
          <p className="font-serif italic text-app-warm text-xs leading-relaxed opacity-90">
            “{selectedQuote}”
          </p>
        </div>
      </div>

      <div
        data-tour-id="dashboard-plan-card"
        className="group/card relative z-10 rounded-2xl border border-app-line bg-white/40 dark:bg-neutral-900/20 backdrop-blur-sm p-5 shadow-sm transition-all duration-medium hover:border-app-accent/20 hover:shadow-md"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-app-ink-muted flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-app-accent" />
          Mục tiêu nổi bật
        </p>
        <p className="mt-3.5 line-clamp-2 break-words text-sm font-bold leading-relaxed text-app-ink group-hover/card:text-app-accent transition-colors duration-200">
          {featuredGoalTitle}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-bg" aria-hidden="true">
            <div
              className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-app-accent tabular-nums">{safeProgress}%</span>
        </div>
        <Link
          to={planHref}
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-app-accent px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-app-accent-hover hover:-translate-y-0.5 transition-all duration-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 group"
        >
          <span>Mở kế hoạch tuần</span>
          <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
