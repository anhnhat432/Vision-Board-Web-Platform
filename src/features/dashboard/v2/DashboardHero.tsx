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
      className="grid w-full select-none gap-5 lg:grid-cols-[minmax(0,1fr)_312px]"
    >
      {/* Hero — forest green panel */}
      <div className="relative overflow-hidden rounded-card-lg bg-[#0C5E3A] p-7 text-white shadow-[0_18px_44px_-34px_rgba(12,94,58,0.85)] dark:bg-[#1A3A2A] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-app-highlight/[0.08]"
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

          <h1 className="mb-3 font-serif text-[clamp(1.9rem,3.6vw,2.7rem)] font-bold leading-[1.08] tracking-[-0.018em] text-white">
            Chào tuần mới,{" "}
            <span className="font-serif italic text-app-highlight">{displayName}.</span>
          </h1>

          <p className="mb-5 max-w-[44ch] text-sm leading-relaxed text-white/85">
            Tập trung vào vài việc quan trọng nhất tuần này. Ít màn hình hơn, rõ việc tiếp theo hơn.
          </p>

          <div className="max-w-[48ch] rounded-[14px] border border-white/12 bg-white/[0.07] px-4 py-3">
            <p className="font-serif text-[13.5px] italic leading-relaxed text-white/90">“{selectedQuote}”</p>
          </div>
        </div>
      </div>

      {/* Featured Goal focus card */}
      <div data-tour-id="dashboard-plan-card" className="flex flex-col rounded-card-lg border border-app-line bg-app-surface p-5 shadow-app-sm">
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-accent">
          <Target className="h-3.5 w-3.5" />
          Tiêu điểm chu kỳ
        </p>

        <img
          src="/vision_board_detail.png"
          alt="Bảng tầm nhìn"
          width={312}
          height={78}
          className="mb-3 block h-[78px] w-full rounded-[var(--r-control)] object-cover ring-1 ring-inset ring-app-line"
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
            className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--r-control)] bg-app-accent px-4 py-3 text-[13px] font-bold text-white shadow-[0_8px_18px_-13px_rgba(12,94,58,0.62)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-app-accent-hover hover:shadow-[0_10px_22px_-14px_rgba(12,94,58,0.7)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          >
            <span>Mở kế hoạch 12 tuần</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
