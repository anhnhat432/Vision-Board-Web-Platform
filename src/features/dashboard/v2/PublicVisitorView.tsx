import { Check, Compass, HardDrive, Lock, LogIn, RefreshCw, Smartphone, Target, UserPlus } from "lucide-react";

interface PublicVisitorViewProps {
  isDemo: boolean;
  hasLocalData: boolean;
  onStart: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

const FEATURE_ROWS = [
  {
    step: "01",
    title: "Cân bằng trước mục tiêu",
    description: "Chấm nhanh các lĩnh vực sống để biết nên bắt đầu ở đâu.",
    href: "/life-balance",
    icon: Compass,
  },
  {
    step: "02",
    title: "SMART Goal có nhịp",
    description: "Biến mong muốn thành mục tiêu đo được, rồi nối vào chu kỳ 12 tuần.",
    href: "/smart-goal-setup",
    icon: Target,
  },
  {
    step: "03",
    title: "Review để không trôi",
    description: "Mỗi tuần có một điểm dừng ngắn để nhìn lại và chỉnh tải.",
    href: "/journal",
    icon: RefreshCw,
  },
] as const;

export function PublicVisitorView({ isDemo, hasLocalData, onStart, onSignIn, onSignUp }: PublicVisitorViewProps) {
  const primaryLabel = isDemo ? "Bắt đầu demo" : "Đăng nhập để bắt đầu";

  return (
    <div className="space-y-6">
      <section className="space-y-5 md:space-y-6">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
            Xin chào, đây là Vision Board
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-[38px] font-medium leading-[1.12] tracking-[-0.02em] text-app-ink sm:text-[44px]">
            Một chỗ tĩnh để bạn nhìn lại tuần sống của mình.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-7 text-app-ink-soft">
            Đi từ cân bằng cuộc sống, mục tiêu SMART, kế hoạch 12 tuần đến việc hôm nay. Ít màn hình hơn, rõ việc tiếp
            theo hơn.
          </p>

          {/* 3 trust chip thay thế card sidebar cũ */}
          <ul className="mt-5 flex flex-wrap gap-2">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-[13px] text-app-ink-soft">
              <Lock className="h-3.5 w-3.5 text-app-accent" />
              Local-first, không cần đăng nhập để xem
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

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Điểm nổi bật">
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent">
                    Bước {feature.step}
                  </p>
                  <h2 className="mt-1 text-[16px] font-semibold text-app-ink">{feature.title}</h2>
                  <p className="mt-1 text-[14px] leading-6 text-app-ink-muted">{feature.description}</p>
                  <span className="mt-3 inline-flex text-[14px] font-medium text-app-accent transition-transform duration-200 group-hover:translate-x-0.5">
                    Khám phá →
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
              Tạo tài khoản hoặc đăng nhập để mở không gian 12 tuần và đồng bộ giữa các thiết bị.
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
