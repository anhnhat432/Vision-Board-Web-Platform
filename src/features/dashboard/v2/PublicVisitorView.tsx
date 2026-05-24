import {
  ArrowRight,
  CalendarRange,
  Check,
  Compass,
  HardDrive,
  Lock,
  LogIn,
  RefreshCw,
  Smartphone,
  Sun,
  Target,
  UserPlus,
} from "lucide-react";

interface PublicVisitorViewProps {
  isDemo: boolean;
  hasLocalData: boolean;
  onStart: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    icon: Compass,
    title: "Chấm điểm hiện tại",
    description: "Nhìn nhanh các lĩnh vực sống để biết điểm nào đang kéo bạn xuống.",
    duration: "≈3 phút",
  },
  {
    step: "02",
    icon: Target,
    title: "Chọn một mục tiêu đáng làm",
    description: "Viết mục tiêu đo được, có hạn rõ ràng, rồi kiểm tra tính khả thi.",
    duration: "≈5 phút",
  },
  {
    step: "03",
    icon: CalendarRange,
    title: "Dựng chu kỳ 12 tuần",
    description: "Chia mục tiêu thành 2-4 thói quen tuần và cột mốc tuần 4/8/12.",
    duration: "≈10 phút",
  },
  {
    step: "04",
    icon: Sun,
    title: "Today + Review tuần",
    description: "Mở Today biết việc hôm nay, cuối tuần review để chỉnh tải.",
    duration: "Mỗi ngày 1-2 phút",
  },
] as const;

const FIRST_RUN_FLOW = [
  "Chấm điểm cuộc sống",
  "Chọn mục tiêu chính",
  "Chia kế hoạch 12 tuần",
  "Mở Today để làm việc hôm nay",
] as const;

const FEATURE_ROWS = [
  {
    tag: "Miễn phí",
    title: "Bắt đầu không tốn xu nào",
    description: "Dữ liệu lưu trên thiết bị, đồng bộ giữa điện thoại và máy tính khi bạn đăng nhập.",
    href: "/life-balance",
    icon: Lock,
  },
  {
    tag: "Đúng thứ tự",
    title: "Không phải trang trắng như Notion",
    description: "App dẫn bạn qua đúng các bước có nghiên cứu sau lưng, không bị rối khi mới bắt đầu.",
    href: "/12-week-setup",
    icon: Compass,
  },
  {
    tag: "Mobile-ready",
    title: "Đủ nhẹ cho buổi sáng vội",
    description: "Mở Today, tick xong việc, đóng lại. Không cần học UI phức tạp hay setup dài dòng.",
    href: "/today-v2",
    icon: Smartphone,
  },
] as const;

export function PublicVisitorView({ isDemo, hasLocalData, onStart, onSignIn, onSignUp }: PublicVisitorViewProps) {
  const primaryLabel = isDemo ? "Đăng ký miễn phí" : "Tạo tài khoản để bắt đầu";
  const heroStartLabel = isDemo ? "Dùng thử lộ trình 4 bước" : "Bắt đầu với mục tiêu của bạn";
  const scrollToHowItWorks = () => {
    document.getElementById("dashboard-how-it-works-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)] md:items-center md:gap-10">
        <div>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
              Dear Our Future · App lập kế hoạch cá nhân
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-[38px] font-medium leading-[1.12] text-app-ink sm:text-[44px]">
              App biến mục tiêu lớn thành{" "}
              <span className="relative inline-block">
                <span className="relative z-10">kế hoạch 12 tuần</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  className="absolute inset-x-0 -bottom-1 h-2.5 w-full text-app-warm"
                >
                  <path
                    d="M2 8 C 40 2, 80 10, 120 4 S 180 8, 198 5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>{" "}
              và việc hôm nay.
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-7 text-app-ink-soft">
              Dear Our Future dẫn bạn qua một luồng cố định: nhìn lại cuộc sống, chọn một mục tiêu chính, kiểm tra tính
              khả thi, rồi chia thành việc cần làm theo tuần và theo ngày.
            </p>

            <div className="mt-5 border-l-2 border-app-accent pl-4">
              <p className="text-[14px] font-semibold text-app-ink">Nói ngắn gọn</p>
              <p className="mt-1 max-w-2xl text-[14px] leading-6 text-app-ink-muted">
                Đây không phải trang ghi chú tự do. App là lộ trình từng bước để biến một mong muốn lớn thành kế hoạch
                có thể làm thật.
              </p>
            </div>

            <ol className="mt-5 grid grid-cols-2 gap-2">
              {FIRST_RUN_FLOW.map((step, index) => (
                <li
                  key={step}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-app-line bg-app-surface px-3 py-2 text-[13px] text-app-ink-soft"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-app-accent-soft text-[12px] font-semibold text-app-accent">
                    {index + 1}
                  </span>
                  <span className="min-w-0 leading-5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-[#264d43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                {heroStartLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={scrollToHowItWorks}
                className="inline-flex items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-[15px] font-medium text-app-ink transition-colors duration-150 hover:border-app-accent/40 hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                Xem cách app hoạt động
              </button>
            </div>

            <ul className="mt-5 flex flex-wrap gap-2">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-[13px] text-app-ink-soft">
                <Lock className="h-3.5 w-3.5 text-app-accent" />
                Mở trang là dùng được, không cần email
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-[13px] text-app-ink-soft">
                <RefreshCw className="h-3.5 w-3.5 text-app-accent" />
                Đồng bộ khi sẵn sàng
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-[13px] text-app-ink-soft">
                <Smartphone className="h-3.5 w-3.5 text-app-accent" />
                Hoạt động trên mobile
              </li>
            </ul>
          </div>
        </div>

        {/* Mockup preview card — desktop only */}
        <div className="hidden rounded-card border border-app-line bg-app-surface p-5 shadow-sm md:block">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-app-accent-soft text-app-accent">
                <Target className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Mục tiêu</p>
                <p className="truncate text-[13px] font-medium text-app-ink">Đọc 12 cuốn sách trong năm</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-app-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-app-accent">
              Tuần 4/12
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[12px] text-app-ink-soft">
              <span>Tiến độ chu kỳ</span>
              <span className="font-semibold tabular-nums text-app-accent">42%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-app-bg">
              <div className="h-full rounded-full bg-app-accent" style={{ width: "42%" }} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
              Việc hôm nay · 7/14
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-app-accent text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <span className="text-[13px] text-app-ink-muted line-through">Đọc 30 trang "Atomic Habits"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded-[4px] border border-app-line" aria-hidden="true" />
                <span className="text-[13px] text-app-ink">Ghi 3 dòng phản tư</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded-[4px] border border-app-line" aria-hidden="true" />
                <span className="text-[13px] text-app-ink">Review tuần lúc 21h</span>
              </div>
            </div>
          </div>

          <p className="mt-4 border-t border-app-line pt-3 text-[11px] italic text-app-ink-muted">
            Ảnh chụp giao diện · dữ liệu mô phỏng
          </p>
        </div>
      </section>

      {hasLocalData ? (
        <section
          className="rounded-card border border-app-warm-border bg-app-warm-soft p-5 md:p-6"
          aria-labelledby="dashboard-local-data-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-surface text-app-warm">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h2 id="dashboard-local-data-title" className="text-[16px] font-semibold text-app-warm-strong">
                  Có dữ liệu đã lưu trên thiết bị này
                </h2>
                <p className="mt-1 text-[14px] leading-6 text-app-warm-strong">
                  Đăng nhập để kiểm tra, sao lưu và nhập dữ liệu này vào tài khoản. Chúng tôi không ghi đè dữ liệu tài
                  khoản nếu chưa có xác nhận của bạn.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-warm px-3.5 py-2 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#c56b4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập để khôi phục
              </button>
              <button
                type="button"
                onClick={onSignUp}
                className="inline-flex items-center justify-center rounded-lg border border-app-warm-border bg-app-surface px-3.5 py-2 text-[14px] font-medium text-app-warm-strong transition-colors duration-150 hover:bg-app-warm-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
              >
                Tạo tài khoản mới
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section
        className="rounded-card border border-app-line bg-app-surface p-5 md:p-6"
        aria-labelledby="dashboard-how-it-works-title"
      >
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Cách hoạt động</p>
          <h2 id="dashboard-how-it-works-title" className="font-serif text-[24px] font-medium leading-8 text-app-ink">
            Từ mục tiêu mơ hồ đến việc hôm nay, trong 4 bước.
          </h2>
        </div>

        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.step} className="rounded-card border border-app-line bg-app-bg p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-app-accent">
                    Bước {step.step}
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-app-ink">{step.title}</h3>
                <p className="mt-1 text-[14px] leading-6 text-app-ink-muted">{step.description}</p>
                <p className="mt-3 text-[12px] font-medium text-app-ink-soft">{step.duration}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Vì sao chọn Dear Our Future">
        {FEATURE_ROWS.map((feature) => {
          const Icon = feature.icon;

          return (
            <a
              key={feature.title}
              href={feature.href}
              className="group rounded-card border border-app-line bg-app-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-app-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent transition-colors duration-200 group-hover:bg-app-accent group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent">{feature.tag}</p>
                  <h2 className="mt-1 text-[16px] font-semibold text-app-ink">{feature.title}</h2>
                  <p className="mt-1 text-[14px] leading-6 text-app-ink-muted">{feature.description}</p>
                  <span className="mt-3 inline-flex text-[14px] font-medium text-app-accent transition-transform duration-200 group-hover:translate-x-0.5">
                    Tìm hiểu →
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </section>

      <section
        className="rounded-card border border-app-line bg-app-surface p-5 md:p-6"
        aria-labelledby="dashboard-public-cta-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
              Bắt đầu đúng thứ tự
            </p>
            <h2
              id="dashboard-public-cta-title"
              className="mt-2 font-serif text-[26px] font-medium leading-8 text-app-ink"
            >
              Sẵn sàng dựng chu kỳ 12 tuần đầu tiên?
            </h2>
            <p className="mt-2 text-[15px] leading-6 text-app-ink-soft">
              Đăng ký miễn phí trong 30 giây. Dữ liệu của bạn tự đồng bộ giữa điện thoại và máy tính.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-[#264d43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <UserPlus className="h-4 w-4" />
              {primaryLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
