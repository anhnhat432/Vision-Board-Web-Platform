import { apiClient, toAppError } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { sendVerificationEmail } from "@/lib/auth/firebase";
import { CheckCircle2, CreditCard, Loader2, LockKeyhole, Mail, ReceiptText, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { BillingTrustSignals } from "../components/BillingTrustSignals";
import { BillingPlusIllustration } from "../components/illustrations";
import { isPaidCheckoutDisabled } from "../utils/app-mode";
import { formatVndAmount, PLUS_MONTHLY_PRICE_VND, PLUS_PRICE_CYCLE_LABEL } from "../utils/billing-pricing";
import {
  canUpgradeToPlus,
  getEmailVerificationRequiredMessage,
  rememberEmailVerificationReturnPath,
} from "../utils/email-verification-guard";
import { getUserData } from "../utils/storage";

interface CheckoutInfoResponse {
  amount: number;
  currency: string;
  billingCycle: string;
  provider: string;
}

interface CheckoutSessionResponse {
  checkoutSessionId: string;
  checkoutUrl: string;
  expiresAt?: string;
  provider: string;
}

const BILLING_SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getPlanName(billingCycle: string): string {
  if (billingCycle === "yearly") return "Plus yearly";
  if (billingCycle === "monthly") return "Plus monthly";
  return `Plus ${PLUS_PRICE_CYCLE_LABEL}`;
}

function getAmount(info: CheckoutInfoResponse | null): number {
  return info?.amount && Number.isFinite(info.amount) ? info.amount : PLUS_MONTHLY_PRICE_VND;
}

export function BillingConfirm() {
  const navigate = useNavigate();
  const { authLoading, user } = useAuthContext();
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfoResponse | null>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paidCheckoutDisabled = isPaidCheckoutDisabled();
  const userEmail = user?.email?.trim() ?? "";
  const emailVerified = user?.emailVerified === true;
  const emailVerificationRequired = Boolean(user) && !canUpgradeToPlus(user);
  const canEditEmail = !user || !emailVerified;
  const amount = getAmount(checkoutInfo);
  const planName = getPlanName(checkoutInfo?.billingCycle ?? "monthly");
  const emailInvalid = receiptEmail.trim().length > 0 && !isValidEmail(receiptEmail);
  const canSubmit =
    !paidCheckoutDisabled &&
    agreed &&
    isValidEmail(receiptEmail) &&
    !submitting &&
    !authLoading &&
    !emailVerificationRequired;

  useEffect(() => {
    if (authLoading) return;
    const fallbackEmail = userEmail || "";
    setReceiptEmail((current) => current || fallbackEmail);
  }, [authLoading, userEmail]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<CheckoutInfoResponse>("/billing/checkout-info")
      .then((data) => {
        if (cancelled) return;
        setCheckoutInfo(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không lấy được thông tin thanh toán.");
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const submitLabel = useMemo(() => {
    if (paidCheckoutDisabled) return "Tạm khóa thanh toán";
    if (submitting) return "Đang tạo thanh toán...";
    if (emailVerificationRequired) return "Cần xác thực email trước";
    if (!agreed) return "Cần đồng ý điều khoản trước";
    if (!isValidEmail(receiptEmail)) return "Nhập email nhận biên nhận";
    return "Xác nhận và tạo thanh toán";
  }, [agreed, emailVerificationRequired, paidCheckoutDisabled, receiptEmail, submitting]);

  const handleSendVerification = useCallback(async () => {
    setSendingVerification(true);
    setError(null);
    try {
      rememberEmailVerificationReturnPath("/billing/confirm");
      await sendVerificationEmail();
    } catch (err: unknown) {
      setError(toAppError(err).message || "Không gửi được email xác thực.");
    } finally {
      setSendingVerification(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (paidCheckoutDisabled) {
      setError(
        "Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh hưởng. " +
          `Nếu bạn muốn nâng cấp ngay, liên hệ ${BILLING_SUPPORT_EMAIL} để mở Plus thủ công.`,
      );
      return;
    }
    if (emailVerificationRequired) {
      rememberEmailVerificationReturnPath("/billing/confirm");
      setError(getEmailVerificationRequiredMessage("upgrade"));
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const isPublicCheckout = !user;
      const result = await apiClient.post<CheckoutSessionResponse>(
        isPublicCheckout ? "/billing/public-checkout-session" : "/billing/checkout-session",
        {
          planCode: "PLUS",
          billingCycle: checkoutInfo?.billingCycle ?? "twelve_week",
          returnUrl: `${window.location.origin}/billing/checkout`,
          cancelUrl: `${window.location.origin}/billing/plan`,
          receiptEmail: receiptEmail.trim(),
          receiptName: user?.displayName ?? undefined,
          ...(isPublicCheckout ? { clientUserId: getUserData().userId } : {}),
        },
      );

      if (result?.checkoutSessionId) {
        navigate(`/billing/checkout/${result.checkoutSessionId}`, { replace: true });
        return;
      }

      throw new Error("Không nhận được mã đơn hàng.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tạo phiên thanh toán.");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, checkoutInfo?.billingCycle, emailVerificationRequired, navigate, paidCheckoutDisabled, receiptEmail, user]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-app-accent-soft text-app-accent">
              <ReceiptText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">
                Xác nhận trước khi thanh toán
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-app-ink">Bạn đang mua gì?</h1>
              <p className="mt-2 text-sm leading-6 text-app-ink-soft">
                Vui lòng kiểm tra gói, số tiền và email nhận biên nhận trước khi tạo phiên thanh toán.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-xl border border-app-line bg-app-bg p-4">
            <ConfirmRow label="Tên gói" value={planName} />
            <ConfirmRow
              label="Số tiền"
              value={loadingInfo ? "Đang tải..." : `${formatVndAmount(amount)} ${checkoutInfo?.currency ?? "VND"}`}
              highlight
            />
            <ConfirmRow label="Phương thức" value="Thanh toán tự động qua nhà cung cấp thanh toán" />
          </div>

          <BillingTrustSignals className="mt-6" supportEmail={BILLING_SUPPORT_EMAIL} />

          <div className="mt-6 rounded-xl border border-app-line bg-app-bg p-4">
            <label htmlFor="receipt-email" className="flex items-center gap-2 text-sm font-semibold text-app-ink">
              <Mail className="h-4 w-4 text-app-accent" />
              Email sẽ nhận biên nhận
            </label>
            <input
              id="receipt-email"
              type="email"
              value={receiptEmail}
              onChange={(event) => setReceiptEmail(event.target.value)}
              disabled={!canEditEmail}
              className="mt-3 w-full rounded-[var(--r-control)] border border-app-line bg-app-surface px-3 py-2 text-sm text-app-ink shadow-sm outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 disabled:bg-app-bg disabled:text-app-ink-muted"
              placeholder="you@example.com"
            />
            <p className="mt-2 text-xs leading-5 text-app-ink-soft">
              {emailVerified
                ? "Email tài khoản đã xác minh nên biên nhận sẽ gửi về địa chỉ này."
                : "Nếu email tài khoản chưa xác minh hoặc bạn chưa đăng nhập, bạn có thể sửa email nhận biên nhận."}
            </p>
            {emailInvalid && (
              <p className="mt-2 text-xs font-medium text-red-600">Email nhận biên nhận chưa đúng định dạng.</p>
            )}
          </div>

          <label className="mt-6 flex items-start gap-3 surface-raised rounded-xl border border-app-line bg-app-surface p-4 text-sm leading-6 text-app-ink-soft">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-app-line text-app-accent focus:ring-app-accent/30"
            />
            <span>
              Tôi đồng ý với{" "}
              <Link
                to="/terms"
                className="font-semibold text-app-accent underline-offset-4 hover:text-app-ink hover:underline"
              >
                Điều khoản
              </Link>{" "}
              và{" "}
              <Link
                to="/refund-policy"
                className="font-semibold text-app-accent underline-offset-4 hover:text-app-ink hover:underline"
              >
                Chính sách hoàn tiền
              </Link>
              .
            </span>
          </label>

          {paidCheckoutDisabled ? (
            <div
              data-testid="paid-checkout-disabled-banner"
              className="mt-4 rounded-xl border border-app-warm-border bg-app-warm-soft p-4 text-sm text-app-warm-strong"
            >
              <p className="flex items-center gap-2 font-semibold">
                <LockKeyhole className="h-4 w-4 text-app-warm" />
                Thanh toán đang tạm khóa.
              </p>
              <p className="mt-2 leading-6 text-app-ink-soft">
                Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh
                hưởng. Nếu bạn muốn nâng cấp ngay, liên hệ {" "}
                <a
                  href={`mailto:${BILLING_SUPPORT_EMAIL}`}
                  className="font-medium text-app-ink underline-offset-4 hover:underline"
                >
                  {BILLING_SUPPORT_EMAIL}
                </a>
                {" "}để mở Plus thủ công.
              </p>
            </div>
          ) : null}

          {emailVerificationRequired ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Vui lòng xác thực email trước khi thanh toán.</p>
              <p className="mt-1 leading-6">
                Email là cách chúng tôi gửi biên nhận và liên hệ khi cần hỗ trợ hoàn tiền. Địa chỉ đang chờ xác thực:{" "}
                {userEmail || "chưa có email"}.
              </p>
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={sendingVerification}
                className="mt-3 rounded-[var(--r-control)] border border-amber-300 bg-app-surface px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-60"
              >
                {sendingVerification ? "Đang gửi..." : "Gửi email xác thực"}
              </button>
            </div>
          ) : null}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--r-tile)] bg-app-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-app-ink disabled:cursor-not-allowed disabled:bg-app-line disabled:text-app-ink-muted disabled:shadow-none"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : paidCheckoutDisabled ? (
                <LockKeyhole className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={() => navigate("/billing/plan")}
              className="text-sm font-medium text-app-ink-muted underline decoration-app-line transition hover:text-app-ink"
            >
              Quay lại trang gói
            </button>
          </div>
        </section>

        <aside className="surface-raised rounded-2xl border border-app-accent-soft bg-app-accent-soft/40 p-5 sm:p-6">
          <BillingPlusIllustration className="mx-auto w-44 text-app-accent opacity-80" />
          <div className="mt-6 space-y-4">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
              <p className="text-sm leading-6 text-app-ink-soft">
                Phiên thanh toán chỉ được tạo sau khi bạn xác nhận rõ số tiền và email nhận biên nhận.
              </p>
            </div>
            <div className="flex gap-3">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
              <p className="text-sm leading-6 text-app-ink-soft">
                Sau khi hệ thống xác nhận giao dịch, Dear Our Future gửi biên nhận thanh toán đơn giản qua email.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ConfirmRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-app-ink-muted">{label}</span>
      <span className={highlight ? "text-lg font-bold text-app-accent" : "font-semibold text-app-ink"}>{value}</span>
    </div>
  );
}
