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
    ? "flex gap-3 rounded-[var(--r-tile)] border border-white/70 bg-white/90 px-4 py-3"
    : "flex gap-3 rounded-[var(--r-card)] border border-slate-200 bg-white/88 p-4";

  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-[var(--r-card)] border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Tin cậy khi thanh toán</p>
          <h2 id={titleId} className="mt-1 text-lg font-semibold text-slate-950">
            Chuyển khoản rõ ràng, hỗ trợ sau thanh toán.
          </h2>
        </div>
        <div
          className="flex items-center gap-2 rounded-[var(--r-pill)] border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-800"
          role="img"
          aria-label="Logo ngân hàng đại diện"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">VN</span>
          <span>Bank</span>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className={itemClassName}>
          <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm leading-6 text-slate-700">Thanh toán qua chuyển khoản ngân hàng VN (Casso xác thực).</p>
        </div>
        <div className={itemClassName}>
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <p className="text-sm leading-6 text-slate-700">Biên nhận điện tử gửi qua email trong 1-2 phút.</p>
        </div>
        <div className={itemClassName}>
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <p className="text-sm leading-6 text-slate-700">
            Hoàn tiền linh hoạt theo{" "}
            <Link to="/refund-policy" className="font-semibold text-violet-700 underline-offset-4 hover:underline">
              chính sách hoàn tiền
            </Link>
            .
          </p>
        </div>
        <div className={itemClassName}>
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm leading-6 text-slate-700">
            Liên hệ hỗ trợ:{" "}
            <a
              href={`mailto:${resolvedSupportEmail}`}
              className="font-semibold text-slate-900 underline-offset-4 hover:underline"
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
