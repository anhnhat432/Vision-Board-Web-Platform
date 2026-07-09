import { CheckCircle2, CreditCard, Loader2, LockKeyhole, Mail, ReceiptText, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { apiClient, toAppError } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { BillingTrustSignals } from "../components/BillingTrustSignals";
import { BillingPlusIllustration } from "../components/illustrations";
import { isPaidCheckoutDisabled } from "../utils/app-mode";
import { formatVndAmount, PLUS_MONTHLY_PRICE_VND, PLUS_PRICE_CYCLE_LABEL } from "../utils/billing-pricing";
import { getEmailVerificationRequiredMessage } from "../utils/email-verification-guard";
import { getBillingProvider, getBillingProviderStatus } from "../utils/production/billingProvider";
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

type CheckoutRedirectTarget = { kind: "internal"; path: string } | { kind: "external"; url: string };

const BILLING_SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";
const GENERIC_CHECKOUT_ERROR_MESSAGE =
  `Không thể tạo phiên thanh toán lúc này. Vui lòng thử lại sau hoặc liên hệ ${BILLING_SUPPORT_EMAIL}.`;

type CheckoutAppError = ReturnType<typeof toAppError> & {
  errorCode?: string;
  isNetworkError?: boolean;
  rateLimited?: boolean;
};

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

function getCheckoutErrorMessage(error: unknown): string {
  const appError = toAppError(error) as CheckoutAppError;

  if (appError.rateLimited || appError.status === 429) {
    return "Bạn vừa thử tạo phiên thanh toán quá nhanh. Vui lòng đợi một lát rồi thử lại.";
  }

  if (appError.errorCode === "EMAIL_NOT_VERIFIED") {
    return getEmailVerificationRequiredMessage("critical");
  }

  if (appError.status === 401) {
    return "Vui lòng đăng nhập lại trước khi tạo phiên thanh toán.";
  }

  if (appError.status === 403) {
    return "Tài khoản hiện chưa đủ điều kiện tạo phiên thanh toán. Vui lòng kiểm tra email xác thực hoặc liên hệ hỗ trợ.";
  }

  if (appError.errorCode === "checkout_disabled") {
    return (
      "Thanh toán đang tạm khóa trong lúc hệ thống được hoàn tất. " +
      `Nếu bạn muốn nâng cấp ngay, liên hệ ${BILLING_SUPPORT_EMAIL} để được hỗ trợ.`
    );
  }

  if (appError.errorCode === "invalid_coupon" || appError.errorCode === "invalid_coupon_code") {
    return "Mã giảm giá không hợp lệ. Vui lòng kiểm tra lại mã hoặc bỏ mã để tiếp tục thanh toán.";
  }

  if (appError.isNetworkError) {
    return "Không thể kết nối đến hệ thống thanh toán. Kiểm tra mạng rồi thử lại.";
  }

  return GENERIC_CHECKOUT_ERROR_MESSAGE;
}

export function getCheckoutRedirectTarget(
  result: CheckoutSessionResponse | null | undefined,
  currentOrigin: string,
): CheckoutRedirectTarget | null {
  if (!result) return null;

  const provider = result.provider?.trim().toLowerCase() ?? "";
  const checkoutUrl = result.checkoutUrl?.trim() ?? "";

  if (provider !== "casso" && checkoutUrl) {
    try {
      const parsedUrl = new URL(checkoutUrl, currentOrigin);
      if (parsedUrl.origin === currentOrigin) {
        return { kind: "internal", path: `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` };
      }
      return { kind: "external", url: parsedUrl.toString() };
    } catch {
      return null;
    }
  }

  if (result.checkoutSessionId) {
    return { kind: "internal", path: `/billing/checkout/${encodeURIComponent(result.checkoutSessionId)}` };
  }

  return null;
}

interface SaleEventInfo {
  name: string;
  discountPercent?: number;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  discountAmount?: number;
  finalAmount?: number;
}

function getNumberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function BillingConfirm() {
  const navigate = useNavigate();
  const { authLoading, user } = useAuthContext();
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfoResponse | null>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saleEvent, setSaleEvent] = useState<SaleEventInfo | null>(null);

  const paidCheckoutDisabled = isPaidCheckoutDisabled();
  const billingProviderMode = getBillingProviderStatus().mode;
  const requiresCheckoutInfo = billingProviderMode === "api_contract";
  const checkoutInfoReady = !requiresCheckoutInfo || (!loadingInfo && checkoutInfo !== null);
  const userEmail = user?.email?.trim() ?? "";
  const emailVerified = user?.emailVerified === true;
  const canEditEmail = !user || !emailVerified;
  const baseAmount = getAmount(checkoutInfo);
  const saleFinalAmount = saleEvent?.finalAmount ?? (saleEvent?.discountPercent
    ? Math.round(baseAmount * (100 - saleEvent.discountPercent) / 100)
    : saleEvent?.discountValue
      ? Math.max(baseAmount - saleEvent.discountValue, 1000)
      : undefined);
  const amount = saleFinalAmount ?? baseAmount;
  const hasActiveSale = saleEvent !== null && saleFinalAmount !== undefined && saleFinalAmount < baseAmount;
  const planName = getPlanName(checkoutInfo?.billingCycle ?? "monthly");
  const emailInvalid = receiptEmail.trim().length > 0 && !isValidEmail(receiptEmail);
  const receiptEmailHelpId = "receipt-email-help";
  const receiptEmailErrorId = "receipt-email-error";
  const receiptEmailDescription = emailInvalid
    ? `${receiptEmailHelpId} ${receiptEmailErrorId}`
    : receiptEmailHelpId;
  const canSubmit =
    !paidCheckoutDisabled &&
    agreed &&
    isValidEmail(receiptEmail) &&
    checkoutInfoReady &&
    !submitting &&
    !authLoading;

  useEffect(() => {
    if (authLoading) return;
    const fallbackEmail = userEmail || "";
    setReceiptEmail((current) => current || fallbackEmail);
  }, [authLoading, userEmail]);

  useEffect(() => {
    if (paidCheckoutDisabled) {
      setLoadingInfo(false);
      return;
    }

    let cancelled = false;
    apiClient
      .get<CheckoutInfoResponse>("/billing/checkout-info")
      .then((data) => {
        if (cancelled) return;
        setCheckoutInfo(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getCheckoutErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paidCheckoutDisabled]);

  // Fetch active sale event so the confirmed amount matches what the user
  // saw on /billing/plan (backend getCheckoutInfo returns base price only).
  useEffect(() => {
    if (paidCheckoutDisabled) return;

    let cancelled = false;
    const params = new URLSearchParams({
      purpose: "plus_subscription",
      amount: String(PLUS_MONTHLY_PRICE_VND),
    });

    apiClient.get<{ active: boolean } & Record<string, unknown>>(`/billing/active-sale-event?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        if (data?.active) {
          const discountType = data.discountType === "percentage" || data.discountType === "fixed" ? data.discountType : undefined;
          setSaleEvent({
            name: typeof data.name === "string" && data.name.trim() ? data.name : "Đang giảm giá",
            discountPercent: discountType === "percentage" ? getNumberField(data.discountValue) : undefined,
            discountValue: discountType === "fixed" ? getNumberField(data.discountValue) : undefined,
            discountType,
            discountAmount: getNumberField(data.discountAmount),
            finalAmount: getNumberField(data.finalAmount),
          });
        }
      })
      .catch(() => { /* sale event is optional */ });

    return () => { cancelled = true; };
  }, [paidCheckoutDisabled]);

  const submitLabel = useMemo(() => {
    if (paidCheckoutDisabled) return "Tạm khóa thanh toán";
    if (submitting) return "Đang tạo thanh toán...";
    if (requiresCheckoutInfo && loadingInfo) return "Đang tải thông tin thanh toán";
    if (requiresCheckoutInfo && !checkoutInfo) return "Không thể tải thông tin thanh toán";
    if (!agreed) return "Cần đồng ý điều khoản trước";
    if (!isValidEmail(receiptEmail)) return "Nhập email nhận biên nhận";
    return "Xác nhận và tạo thanh toán";
  }, [
    agreed,
    checkoutInfo,
    loadingInfo,
    paidCheckoutDisabled,
    receiptEmail,
    requiresCheckoutInfo,
    submitting,
  ]);

  const handleConfirm = useCallback(async () => {
    if (paidCheckoutDisabled) {
      setError(
        "Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh hưởng. " +
          `Nếu bạn muốn nâng cấp ngay, liên hệ ${BILLING_SUPPORT_EMAIL} để mở Plus thủ công.`,
      );
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    let couponCode: string | undefined;
    try {
      couponCode = sessionStorage.getItem("billing:couponCode")?.trim() || undefined;
      if (couponCode) sessionStorage.removeItem("billing:couponCode");
    } catch { /* non-critical */ }

    const billingStatus = getBillingProviderStatus();
    const isNonContractMode = billingStatus.mode !== "api_contract";

    // In local_test / mock_provider modes, delegate to the billing provider
    // so local upgrade or mock checkout works without a real backend.
    if (isNonContractMode) {
      try {
        const provider = getBillingProvider();
        const checkoutResult = await provider.startCheckout({
          planCode: "PLUS",
          context: "plan",
          returnUrl: `${window.location.origin}/billing/plan`,
        });

        if (checkoutResult.status === "upgraded" || checkoutResult.status === "already_active") {
          toast.success(checkoutResult.message);
          navigate("/billing/plan", { replace: true });
          return;
        }

        if (checkoutResult.checkoutUrl) {
          // Resolve redirect target (internal like /billing/mock-checkout or external)
          const redirectTarget = getCheckoutRedirectTarget(
            { checkoutSessionId: "", checkoutUrl: checkoutResult.checkoutUrl, provider: billingStatus.mode },
            window.location.origin,
          );
          if (redirectTarget?.kind === "external") {
            window.location.assign(redirectTarget.url);
            return;
          }
          if (redirectTarget?.kind === "internal") {
            navigate(redirectTarget.path, { replace: true });
            return;
          }
          // Fallback: navigate directly
          window.location.assign(checkoutResult.checkoutUrl);
          return;
        }

        setError(checkoutResult.message || "Không thể tạo phiên thanh toán.");
      } catch (err: unknown) {
        setError(getCheckoutErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // api_contract (real) mode: use the backend checkout-session endpoint directly
    // so we can pass receiptEmail, billingCycle, couponCode, and clientUserId.
    if (!checkoutInfo) {
      setError(GENERIC_CHECKOUT_ERROR_MESSAGE);
      return;
    }

    try {
      const isPublicCheckout = !user;
      const result = await apiClient.post<CheckoutSessionResponse>(
        isPublicCheckout ? "/billing/public-checkout-session" : "/billing/checkout-session",
        {
          planCode: "PLUS",
          billingCycle: checkoutInfo.billingCycle,
          returnUrl: `${window.location.origin}/billing/checkout/__session_id__`,
          cancelUrl: `${window.location.origin}/billing/plan`,
          receiptEmail: receiptEmail.trim(),
          receiptName: user?.displayName ?? undefined,
          ...(couponCode ? { couponCode } : {}),
          ...(isPublicCheckout ? { clientUserId: getUserData().userId } : {}),
        },
      );

      const redirectTarget = getCheckoutRedirectTarget(result, window.location.origin);

      if (redirectTarget?.kind === "external") {
        window.location.assign(redirectTarget.url);
        return;
      }

      if (redirectTarget?.kind === "internal") {
        navigate(redirectTarget.path, { replace: true });
        return;
      }

      throw new Error("Không nhận được mã đơn hàng.");
    } catch (err: unknown) {
      setError(getCheckoutErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    checkoutInfo,
    navigate,
    paidCheckoutDisabled,
    receiptEmail,
    user,
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-raised rounded-card-lg border border-app-line bg-app-surface p-5 sm:p-6">
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

          <div className="mt-6 grid gap-4 rounded-card border border-app-line bg-app-bg p-4">
            <ConfirmRow label="Tên gói" value={planName} />
            {loadingInfo ? (
              <ConfirmRow label="Số tiền" value="Đang tải..." highlight />
            ) : hasActiveSale ? (
              <div className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] bg-app-accent-soft/40 px-4 py-3">
                <span className="text-sm font-medium text-app-ink">Số tiền</span>
                <div className="text-right">
                  <span className="text-sm text-app-ink-muted line-through">{formatVndAmount(baseAmount)}</span>
                  <span className="ml-2 text-lg font-bold text-app-accent">{formatVndAmount(amount)} {checkoutInfo?.currency ?? "VND"}</span>
                  {saleEvent?.name && (
                    <p className="mt-0.5 text-xs font-medium text-app-accent">{saleEvent.name}</p>
                  )}
                </div>
              </div>
            ) : (
              <ConfirmRow
                label="Số tiền"
                value={`${formatVndAmount(amount)} ${checkoutInfo?.currency ?? "VND"}`}
                highlight
              />
            )}
            <ConfirmRow label="Phương thức" value="Thanh toán tự động qua nhà cung cấp thanh toán" />
          </div>

          <BillingTrustSignals className="mt-6" supportEmail={BILLING_SUPPORT_EMAIL} />

          <div className="mt-6 rounded-card border border-app-line bg-app-bg p-4">
            <label htmlFor="receipt-email" className="flex items-center gap-2 text-sm font-semibold text-app-ink">
              <Mail className="h-4 w-4 text-app-accent" />
              Email sẽ nhận biên nhận
            </label>
            <input
              id="receipt-email"
              name="receiptEmail"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={receiptEmail}
              onChange={(event) => setReceiptEmail(event.target.value)}
              disabled={!canEditEmail}
              aria-invalid={emailInvalid}
              aria-describedby={receiptEmailDescription}
              className="mt-3 w-full rounded-[var(--r-control)] border border-app-line bg-app-surface px-3 py-2 text-sm text-app-ink shadow-app-sm outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 disabled:bg-app-bg disabled:text-app-ink-muted"
              placeholder="you@example.com"
            />
            <p id={receiptEmailHelpId} className="mt-2 text-xs leading-5 text-app-ink-soft">
              {emailVerified
                ? "Email tài khoản đã xác minh nên biên nhận sẽ gửi về địa chỉ này."
                : "Nếu email tài khoản chưa xác minh hoặc bạn chưa đăng nhập, bạn có thể sửa email nhận biên nhận."}
            </p>
            {emailInvalid && (
              <p id={receiptEmailErrorId} role="alert" className="mt-2 text-xs font-medium text-[color:var(--color-danger-fg)]">
                Email nhận biên nhận chưa đúng định dạng.
              </p>
            )}
          </div>

          <label className="mt-6 flex items-start gap-3 surface-raised rounded-card border border-app-line bg-app-surface p-4 text-sm leading-6 text-app-ink-soft">
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
              className="mt-4 rounded-card border border-app-warm-border bg-app-warm-soft p-4 text-sm text-app-warm-strong"
            >
              <p className="flex items-center gap-2 font-semibold">
                <LockKeyhole className="h-4 w-4 text-app-warm" />
                Thanh toán đang tạm khóa.
              </p>
              <p className="mt-2 leading-6 text-app-ink-soft">
                Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh
                hưởng. Nếu bạn muốn nâng cấp ngay, liên hệ{" "}
                <a
                  href={`mailto:${BILLING_SUPPORT_EMAIL}`}
                  className="font-medium text-app-ink underline-offset-4 hover:underline"
                >
                  {BILLING_SUPPORT_EMAIL}
                </a>{" "}
                để mở Plus thủ công.
              </p>
            </div>
          ) : null}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-card border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-fg)]"
            >
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--r-tile)] bg-app-accent px-5 py-3 text-sm font-semibold text-white shadow-app-sm transition hover:bg-app-ink disabled:cursor-not-allowed disabled:bg-app-line disabled:text-app-ink-muted disabled:shadow-none"
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

        <aside className="surface-raised rounded-card-lg border border-app-accent-soft bg-app-accent-soft/40 p-5 sm:p-6">
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
