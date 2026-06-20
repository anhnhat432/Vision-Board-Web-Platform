import { ArrowRight, Calendar, Target } from "lucide-react";
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
      className="grid w-full select-none gap-[18px] lg:grid-cols-[minmax(0,1fr)_312px]"
    >
      {/* Hero — forest green panel */}
      <div className="relative overflow-hidden rounded-[22px] bg-[#0C5E3A] dark:bg-[#1A3A2A] p-7 text-white sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-12 h-52 w-52 rounded-full bg-app-highlight/[0.13]"
        />
        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-app-highlight">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-app-highlight" />
              {caption}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.12] px-3 py-1.5 text-xs font-semibold text-white">
              <Calendar className="h-3.5 w-3.5 text-app-highlight" />
              {weekLabel}
            </span>
          </div>

          <h1 className="mb-3 font-serif text-[clamp(1.9rem,3.6vw,2.75rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-white">
            Chào tuần mới,{" "}
            <span className="font-serif italic text-app-highlight">{displayName}.</span>
          </h1>

          <p className="mb-5 max-w-[44ch] text-sm leading-relaxed text-white/85">
            Tập trung vào vài việc quan trọng nhất tuần này. Ít màn hình hơn, rõ việc tiếp theo hơn.
          </p>

          <div className="max-w-[48ch] border-l-[3px] border-app-highlight py-1 pl-4">
            <p className="font-serif text-[13.5px] italic leading-relaxed text-white/90">“{selectedQuote}”</p>
          </div>
        </div>
      </div>

      {/* Featured Goal focus card */}
      <div
        data-tour-id="dashboard-plan-card"
        className="flex flex-col rounded-[22px] border border-app-line bg-app-surface p-5 shadow-app-md"
      >
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-accent">
          <Target className="h-3.5 w-3.5" />
          Tiêu điểm chu kỳ
        </p>

        <img
          src="/vision_board_detail.png"
          alt="Bảng tầm nhìn"
          width={312}
          height={78}
          className="mb-3 block h-[78px] w-full rounded-xl object-cover"
        />

        <p className="mb-3 line-clamp-2 break-words text-[13.5px] font-bold leading-snug text-app-ink">
          {featuredGoalTitle}
        </p>

        <div className="mt-auto">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-app-ink-muted">Tiến độ chu kỳ</span>
            <span className="font-mono text-xs font-bold text-app-accent tabular-nums">{safeProgress}%</span>
          </div>
          <div className="mb-3.5 h-1.5 w-full overflow-hidden rounded-full bg-app-bg-subtle" aria-hidden="true">
            <div
              className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
              style={{ width: `${Math.max(safeProgress, 2)}%` }}
            />
          </div>
          <Link
            to={planHref}
            className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-3 text-[13px] font-bold text-white transition-all duration-200 hover:bg-app-accent-hover hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          >
            <span>Mở kế hoạch 12 tuần</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
