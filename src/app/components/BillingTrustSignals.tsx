import { Banknote, LifeBuoy, MailCheck, ShieldCheck } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router";

interface BillingTrustSignalsProps {
  className?: string;
  compact?: boolean;
  supportEmail?: string;
}

const DEFAULT_SUPPORT_EMAIL = "support@dearourfuture.com";

function getSupportEmail(supportEmail?: string): string {
  return supportEmail?.trim() || import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;
}

export function BillingTrustSignals({ className = "", compact = false, supportEmail }: BillingTrustSignalsProps) {
  const titleId = useId();
  const resolvedSupportEmail = getSupportEmail(supportEmail);
  const itemClassName = compact
    ? "flex gap-3 rounded-lg border border-app-line bg-app-surface px-4 py-3"
    : "flex gap-3 rounded-card border border-app-line bg-app-surface p-4";

  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-card border border-app-line bg-app-surface p-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-app-accent">Tin cậy khi thanh toán</p>
          <h2 id={titleId} className="mt-1 text-[20px] font-medium text-app-ink">
            Chuyển khoản rõ ràng, hỗ trợ sau thanh toán.
          </h2>
        </div>
        <div
          className="flex items-center gap-2 rounded-full border border-app-line bg-app-bg px-3 py-2 text-[15px] font-medium text-app-accent"
          role="img"
          aria-label="Logo ngân hàng đại diện"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-app-accent text-[13px] text-white">
            VN
          </span>
          <span>Bank</span>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className={itemClassName}>
          <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
          <p className="text-[15px] leading-6 text-app-ink-soft">
            Thanh toán tự động được xác nhận qua nhà cung cấp thanh toán.
          </p>
        </div>
        <div className={itemClassName}>
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
          <p className="text-[15px] leading-6 text-app-ink-soft">Biên nhận điện tử gửi qua email trong 1-2 phút.</p>
        </div>
        <div className={itemClassName}>
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
          <p className="text-[15px] leading-6 text-app-ink-soft">
            Hoàn tiền linh hoạt theo{" "}
            <Link to="/refund-policy" className="font-medium text-app-accent underline-offset-4 hover:underline">
              chính sách hoàn tiền
            </Link>
            .
          </p>
        </div>
        <div className={itemClassName}>
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
          <p className="min-w-0 break-words text-[15px] leading-6 text-app-ink-soft">
            Liên hệ hỗ trợ:{" "}
            <a
              href={`mailto:${resolvedSupportEmail}`}
              className="font-medium text-app-ink underline-offset-4 break-all hover:underline"
            >
              {resolvedSupportEmail}
            </a>{" "}
            — phản hồi trong 24h.
          </p>
        </div>
      </div>
    </section>
  );
}
