import { ArrowRight, Calendar, Sparkles, Target } from "lucide-react";
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

// Nền forest nhiều lớp (layered depth) — giữ bản sắc Forest Green nhưng có chiều
// sâu editorial: gradient trầm → accent, quầng sáng highlight, và lớp hạt mịn.
// Dùng literal thuộc palette brand (green-950/900/800/accent) để không tạo drift.
const HERO_SURFACE_LIGHT =
  "radial-gradient(120% 140% at 12% 0%, rgba(91,165,144,0.22) 0%, rgba(91,165,144,0) 42%)," +
  "linear-gradient(158deg, #0a4a2d 0%, var(--app-accent) 46%, #0a5233 72%, #0b4831 100%)";
const HERO_SURFACE_DARK =
  "radial-gradient(120% 140% at 12% 0%, rgba(91,165,144,0.16) 0%, rgba(91,165,144,0) 44%)," +
  "linear-gradient(158deg, #12281f 0%, #1a3a2a 52%, #163425 100%)";

// Lớp hạt/grain mịn (SVG fractal noise) tăng chất "paper studio", rất nhạt.
const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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
      className="grid w-full select-none gap-[18px] lg:grid-cols-[minmax(0,1fr)_324px]"
    >
      {/* Hero — layered forest panel */}
      <div className="group/hero relative isolate overflow-hidden rounded-[26px] p-7 text-white shadow-app-lg ring-1 ring-inset ring-white/10 sm:p-9">
        {/* Nền gradient nhiều lớp (light + dark) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 dark:hidden"
          style={{ backgroundImage: HERO_SURFACE_LIGHT }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 hidden dark:block"
          style={{ backgroundImage: HERO_SURFACE_DARK }}
        />
        {/* Lớp hạt mịn */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.06] mix-blend-soft-light"
          style={{ backgroundImage: GRAIN_DATA_URI, backgroundSize: "180px 180px" }}
        />
        {/* Quầng sáng highlight lime dịu ở góc phải trên */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-app-highlight/20 blur-3xl transition-opacity duration-[var(--duration-base)] ease-[var(--ease-standard)] group-hover/hero:opacity-80"
        />
        {/* Hairline highlight trên mép */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-app-highlight/50 to-transparent"
        />

        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-app-highlight">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-app-highlight/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-app-highlight" />
              </span>
              {caption}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <Calendar className="h-3.5 w-3.5 text-app-highlight" />
              {weekLabel}
            </span>
          </div>

          <h1 className="mb-3 font-serif text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-white">
            Chào tuần mới,
            <br className="hidden sm:block" />{" "}
            <span className="font-serif italic text-app-highlight">{displayName}.</span>
          </h1>

          <p className="mb-6 max-w-[46ch] text-[15px] leading-relaxed text-white/85">
            Tập trung vào vài việc quan trọng nhất tuần này. Ít màn hình hơn, rõ việc tiếp theo hơn.
          </p>

          <div className="mt-auto max-w-[50ch] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
            <p className="flex items-start gap-2.5 font-serif text-sm italic leading-relaxed text-white/90">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-app-highlight" aria-hidden="true" />
              <span>{selectedQuote}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Featured Goal focus card */}
      <div
        data-tour-id="dashboard-plan-card"
        className="group/goal flex flex-col overflow-hidden rounded-[26px] border border-app-line bg-app-surface p-5 shadow-app-md transition-shadow duration-[var(--duration-base)] ease-[var(--ease-standard)] hover:shadow-app-lg"
      >
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
          <Target className="h-3.5 w-3.5" />
          Tiêu điểm chu kỳ
        </p>

        <div className="relative mb-3.5 overflow-hidden rounded-2xl ring-1 ring-app-line">
          <img
            src="/vision_board_detail.png"
            alt="Bảng tầm nhìn"
            width={324}
            height={84}
            loading="lazy"
            decoding="async"
            className="block h-[84px] w-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-standard)] group-hover/goal:scale-[1.04]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        <p className="mb-4 line-clamp-2 break-words font-serif text-[15px] font-bold leading-snug text-app-ink">
          {featuredGoalTitle}
        </p>

        <div className="mt-auto">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-app-ink-muted">Tiến độ chu kỳ</span>
            <span className="font-mono text-sm font-bold tabular-nums text-app-accent">{safeProgress}%</span>
          </div>
          <div
            className="mb-4 h-2 w-full overflow-hidden rounded-full bg-app-bg-subtle ring-1 ring-inset ring-app-line/60"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-grad-aspire transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-decelerate)]"
              style={{ width: `${Math.max(safeProgress, 2)}%` }}
            />
          </div>
          <Link
            to={planHref}
            className="group/cta inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-app-accent px-4 py-3 text-[13px] font-bold text-white shadow-app-sm transition-all duration-[var(--duration-base)] ease-[var(--ease-emphasized)] hover:-translate-y-0.5 hover:bg-app-accent-hover hover:shadow-app-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
          >
            <span>Mở kế hoạch 12 tuần</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-[var(--duration-base)] ease-[var(--ease-emphasized)] group-hover/cta:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
