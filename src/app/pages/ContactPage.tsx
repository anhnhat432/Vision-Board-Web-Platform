import { Clock3, CreditCard, LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router";

const SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Dear Our Future support")}`;

const SUPPORT_TOPICS = [
  {
    icon: ShieldCheck,
    title: "Tài khoản và dữ liệu",
    description: "Đăng nhập, khôi phục quyền truy cập, xuất dữ liệu hoặc yêu cầu xóa tài khoản.",
  },
  {
    icon: CreditCard,
    title: "Thanh toán Plus",
    description: "Đơn nâng cấp, biên nhận, trạng thái kích hoạt, hủy gia hạn hoặc yêu cầu hoàn tiền.",
  },
  {
    icon: LifeBuoy,
    title: "Trải nghiệm 12 tuần",
    description: "Lỗi khi lập kế hoạch, theo dõi Today, weekly review hoặc đồng bộ giữa thiết bị.",
  },
];

export function ContactPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-section px-4 py-8 sm:px-6">
      <header className="surface-raised overflow-hidden rounded-card border border-app-line bg-app-surface p-card-pad sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-app-accent-soft text-app-accent">
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">
              Dear Our Future support
            </span>
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-medium tracking-tight text-app-ink">Liên hệ hỗ trợ</h1>
              <p className="max-w-2xl text-sm leading-6 text-app-ink-soft">
                Nếu bạn gặp vấn đề với tài khoản, dữ liệu, thanh toán hoặc flow 12 tuần, hãy gửi email cho support.
                Trang này không yêu cầu đăng nhập, nên bạn vẫn có thể liên hệ khi tài khoản đang gặp lỗi.
              </p>
            </div>
            <a
              href={SUPPORT_MAILTO}
              className="inline-flex items-center justify-center gap-2 rounded-control bg-app-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
            >
              <Mail className="h-4 w-4" />
              Gửi email hỗ trợ
            </a>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Các nhóm hỗ trợ">
        {SUPPORT_TOPICS.map(({ description, icon: Icon, title }) => (
          <div key={title} className="surface-raised rounded-card border border-app-line bg-app-surface p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-serif text-lg font-medium text-app-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">{description}</p>
          </div>
        ))}
      </section>

      <section className="surface-raised rounded-card border border-app-line bg-app-surface p-card-pad sm:p-7">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-medium text-app-ink">Thông tin nên gửi kèm</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-app-ink-soft">
              <li>Email tài khoản bạn dùng để đăng nhập.</li>
              <li>Đường dẫn hoặc màn hình đang gặp lỗi.</li>
              <li>Mã đơn hàng hoặc thời điểm thanh toán nếu liên quan đến Plus.</li>
              <li>Ảnh chụp màn hình nếu lỗi chỉ xuất hiện trong một bước cụ thể.</li>
            </ul>
          </div>
          <aside className="rounded-card border border-app-line bg-app-bg p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-base font-medium text-app-ink">Kênh hỗ trợ</h2>
                <p className="text-sm text-app-ink-soft">Email chính thức</p>
              </div>
            </div>
            <a
              href={SUPPORT_MAILTO}
              className="mt-4 inline-flex break-all text-sm font-medium text-app-accent underline underline-offset-2 hover:text-app-ink"
            >
              {SUPPORT_EMAIL}
            </a>
          </aside>
        </div>
      </section>

      <nav className="flex flex-wrap gap-3 text-sm" aria-label="Liên kết hỗ trợ liên quan">
        <Link className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink" to="/help">
          Trung tâm trợ giúp
        </Link>
        <Link className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink" to="/billing/faq">
          FAQ thanh toán
        </Link>
        <Link className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink" to="/privacy">
          Chính sách bảo mật
        </Link>
        <Link className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink" to="/terms">
          Điều khoản dịch vụ
        </Link>
      </nav>
    </article>
  );
}
