import { Link } from "react-router";
import { Facebook } from "lucide-react";

type ProductLink = { label: string; to: string };
type CompanyLink = { label: string; to?: string; href?: string };
type LegalLink = { label: string; to: string };

const PRODUCT_LINKS: ProductLink[] = [
  { label: "Trang chính", to: "/" },
  { label: "Tính năng", to: "/#features" },
  { label: "Gói & thanh toán", to: "/billing/plan" },
  { label: "Hỏi đáp thanh toán", to: "/billing/faq" },
];

const COMPANY_LINKS: CompanyLink[] = [
  { label: "Về Dear Our Future", to: "/" },
  { label: "Liên hệ", href: "mailto:dearourfuture123@gmail.com" },
];

const LEGAL_LINKS: LegalLink[] = [
  { label: "Điều khoản dịch vụ", to: "/terms" },
  { label: "Chính sách bảo mật", to: "/privacy" },
  { label: "Chính sách hoàn tiền", to: "/refund-policy" },
];

const FACEBOOK_HREF = "https://www.facebook.com/profile.php?id=61589773962146";
const SOCIAL_ICON_CLASS =
  "flex size-9 items-center justify-center rounded-full border border-app-line bg-app-bg text-app-ink-soft transition-colors duration-150 hover:border-app-accent/40 hover:text-app-accent";

export function AppPublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-app-line bg-app-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          {/* Brand block */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/favicon-512.png" alt="" width={32} height={32} className="size-8 rounded-md" />
              <span className="font-serif text-lg font-medium text-app-ink">Dear Our Future</span>
            </Link>
            <p className="mt-3 max-w-xs text-[14px] leading-6 text-app-ink-soft">
              Một chỗ tĩnh để lập kế hoạch 12 tuần, nhìn lại tuần sống và sống có chủ đích hơn mỗi ngày.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={FACEBOOK_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className={SOCIAL_ICON_CLASS}
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Product column */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Sản phẩm</h4>
            <ul className="mt-3 space-y-2">
              {PRODUCT_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-[14px] text-app-ink-soft transition-colors duration-150 hover:text-app-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Công ty</h4>
            <ul className="mt-3 space-y-2">
              {COMPANY_LINKS.map((item) => {
                if (item.href) {
                  return (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="text-[14px] text-app-ink-soft transition-colors duration-150 hover:text-app-ink"
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={item.label}>
                    <Link
                      to={item.to!}
                      className="text-[14px] text-app-ink-soft transition-colors duration-150 hover:text-app-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Pháp lý</h4>
            <ul className="mt-3 space-y-2">
              {LEGAL_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-[14px] text-app-ink-soft transition-colors duration-150 hover:text-app-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-app-line pt-6 text-[13px] text-app-ink-muted sm:flex-row sm:items-center">
          <p>
            © {year} Dear Our Future. Made with{" "}
            <span aria-hidden="true">❤️</span>
            <span className="sr-only">tình yêu</span> ở Việt Nam.
          </p>
          <p>Local-first · Hoạt động trên mọi thiết bị</p>
        </div>
      </div>
    </footer>
  );
}
