import { CheckCircle2, Clock, Copy, Loader2, LockKeyhole, QrCode, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { apiClient } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { isPaidCheckoutDisabled } from "../utils/app-mode";
import { formatVndAmount } from "../utils/billing-pricing";
import { logBillingUiError, toastBillingNetworkError } from "../utils/billing-ui-monitoring";
import { syncEntitlementsWithProvider } from "../utils/production";
import { upgradePlanLocally } from "../utils/storage";

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderStatusResponse {
  orderId: string;
  status: "pending" | "completed" | "expired" | "failed";
  amount: number;
  currency: string;
  provider?: string | null;
  bankAccount: string;
  bankName: string;
  accountName: string;
  qrDataUrl: string;
  checkoutUrl?: string | null;
  expiresAt: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

type EntitlementSyncStatus = "idle" | "syncing" | "synced" | "failed";

const BILLING_SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BillingCheckoutQR() {
  const { orderId: paramOrderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();
  const { authLoading, user } = useAuthContext();

  const [order, setOrder] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [entitlementSyncStatus, setEntitlementSyncStatus] = useState<EntitlementSyncStatus>("idle");
  const [entitlementSyncMessage, setEntitlementSyncMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const paidCheckoutDisabled = isPaidCheckoutDisabled();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSyncedOrderRef = useRef<string | null>(null);

  // Fetch order status
  const fetchStatus = useCallback(
    async (oid: string) => {
      try {
        const data = await apiClient.get<OrderStatusResponse>(
          user ? `/billing/order-status/${oid}` : `/billing/public-order-status/${oid}`,
        );
        if (data) {
          setOrder(data);
          if (data.expiresAt) {
            setTimeLeft(Math.max(0, new Date(data.expiresAt).getTime() - Date.now()));
          }
          // Stop polling if terminal
          if (data.status === "completed" || data.status === "expired" || data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch (err: unknown) {
        if (
          toastBillingNetworkError(err, { surface: "BillingCheckoutQR", action: "fetch_order_status", orderId: oid })
        ) {
          setError("Mạng có vấn đề, vui lòng thử lại");
        } else {
          logBillingUiError(err, { surface: "BillingCheckoutQR", action: "fetch_order_status", orderId: oid });
          const msg = err instanceof Error ? err.message : "Lỗi khi kiểm tra đơn hàng";
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  // Init: create or fetch
  useEffect(() => {
    if (authLoading) return;

    if (!paramOrderId) {
      navigate("/billing/confirm", { replace: true });
      return;
    }
    fetchStatus(paramOrderId);
    // Poll every 5s
    pollRef.current = setInterval(() => fetchStatus(paramOrderId), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authLoading, paramOrderId, fetchStatus, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!order || order.status !== "pending" || timeLeft <= 0) return;
    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1000;
        if (next <= 0 && countdownRef.current) clearInterval(countdownRef.current);
        return Math.max(0, next);
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [order, timeLeft]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, label: string, displayLabel: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(label);
        setCopyMessage(`Đã sao chép ${displayLabel}.`);
        setTimeout(() => {
          setCopied(null);
          setCopyMessage("");
        }, 2000);
      })
      .catch(() => {
        setCopyMessage(`Không thể tự sao chép ${displayLabel}. Bạn có thể chọn và sao chép thủ công.`);
      });
  }, []);

  const isHostedPayosCheckout = order?.provider?.toLowerCase() === "payos" && Boolean(order.checkoutUrl);

  const openHostedCheckout = useCallback(() => {
    if (!order?.checkoutUrl) return;
    window.location.assign(order.checkoutUrl);
  }, [order?.checkoutUrl]);

  const syncCompletedOrderAccess = useCallback(async () => {
    if (!order || order.status !== "completed") return false;

    setEntitlementSyncStatus("syncing");
    setEntitlementSyncMessage(null);

    if (!user) {
      const planCode = upgradePlanLocally("PLUS");
      setEntitlementSyncStatus("synced");
      setEntitlementSyncMessage(`Đã mở gói ${planCode} trên thiết bị này.`);
      return true;
    }

    try {
      const result = await syncEntitlementsWithProvider();
      if (result.ok && result.planCode !== "FREE") {
        setEntitlementSyncStatus("synced");
        setEntitlementSyncMessage(result.message);
        return true;
      }

      setEntitlementSyncStatus("failed");
      setEntitlementSyncMessage(
        result.message || "Đã nhận thanh toán nhưng chưa cập nhật được quyền Plus trên thiết bị này. Vui lòng thử lại.",
      );
      return false;
    } catch (error: unknown) {
      if (
        toastBillingNetworkError(error, {
          surface: "BillingCheckoutQR",
          action: "sync_completed_order_access",
          orderId: order.orderId,
          amount: order.amount,
          status: order.status,
        })
      ) {
        setEntitlementSyncMessage("Mạng có vấn đề, vui lòng thử lại");
      } else {
        logBillingUiError(error, {
          surface: "BillingCheckoutQR",
          action: "sync_completed_order_access",
          orderId: order.orderId,
          amount: order.amount,
          status: order.status,
        });
        setEntitlementSyncMessage(
          "Đã nhận thanh toán nhưng chưa cập nhật được quyền Plus trên thiết bị này. Vui lòng thử lại.",
        );
      }
      setEntitlementSyncStatus("failed");
      return false;
    }
  }, [order, user]);

  useEffect(() => {
    if (order?.status !== "completed") return;
    if (autoSyncedOrderRef.current === order.orderId) return;

    autoSyncedOrderRef.current = order.orderId;
    void syncCompletedOrderAccess();
  }, [order?.orderId, order?.status, syncCompletedOrderAccess]);

  const handleCompletedOrderContinue = useCallback(async () => {
    if (entitlementSyncStatus !== "synced") {
      const synced = await syncCompletedOrderAccess();
      if (!synced) return;
    }

    navigate("/12-week-system");
  }, [entitlementSyncStatus, navigate, syncCompletedOrderAccess]);

  // ─── Success state ──────────────────────────────────────────────────────

  if (order?.status === "completed") {
    const isSyncingEntitlement = entitlementSyncStatus === "syncing";
    const syncFailed = entitlementSyncStatus === "failed";

    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-card border border-app-accent-soft bg-app-accent-soft p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-app-accent">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-serif text-xl font-medium text-app-ink">Thanh toán thành công!</h2>
          <p className="mt-2 text-sm text-app-ink-soft">
            {isSyncingEntitlement
              ? "Đã nhận thanh toán. Đang cập nhật quyền Plus trên tài khoản của bạn..."
              : syncFailed
                ? "Đã nhận thanh toán, nhưng thiết bị này chưa lấy được quyền Plus từ tài khoản."
                : "Gói Plus đã được kích hoạt. Chúc bạn có 12 tuần hiệu quả!"}
          </p>
          {entitlementSyncMessage && (
            <p className={`mt-2 text-xs leading-5 ${syncFailed ? "text-app-warm" : "text-app-accent"}`}>
              {entitlementSyncMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handleCompletedOrderContinue}
            disabled={isSyncingEntitlement}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-app-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-app-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSyncingEntitlement && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSyncingEntitlement ? "Đang cập nhật..." : syncFailed ? "Đồng bộ lại quyền Plus" : "Bắt đầu ngay"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Expired state ──────────────────────────────────────────────────────

  if (order?.status === "expired" || (order?.status === "pending" && timeLeft <= 0 && order?.expiresAt)) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-card border border-app-line bg-app-warm-soft p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-app-warm">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-serif text-xl font-medium text-app-ink">Hết thời gian thanh toán</h2>
          <p className="mt-2 text-sm text-app-ink-soft">
            {paidCheckoutDisabled
              ? "Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh hưởng."
              : "Đơn hàng đã hết hạn. Bạn có thể tạo đơn mới để tiếp tục."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (paidCheckoutDisabled) {
                navigate("/billing/plan");
                return;
              }
              navigate("/billing/confirm");
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-app-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-app-accent"
          >
            <RefreshCw className="h-4 w-4" />
            {paidCheckoutDisabled ? "Quay lại trang gói" : "Tạo đơn mới"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────

  if (error && !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-card border border-app-status-error/20 bg-app-status-error/8 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <XCircle className="h-8 w-8 text-app-status-error" />
          </div>
          <h2 className="font-serif text-lg font-medium text-app-ink">Có lỗi xảy ra</h2>
          <p className="mt-2 text-sm text-app-ink-soft">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/billing/plan")}
            className="mt-6 rounded-full bg-app-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-app-accent"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading || !order) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-app-accent" />
          <p className="text-sm text-app-ink-muted">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (paidCheckoutDisabled && order.status === "pending") {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div
          data-testid="paid-checkout-disabled-banner"
          className="rounded-card border border-app-warm-border bg-app-warm-soft p-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-app-warm">
            <LockKeyhole className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-serif text-xl font-medium text-app-ink">Thanh toán đang tạm khóa</h2>
          <p className="mt-2 text-sm leading-6 text-app-ink-soft">
            Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh hưởng.
            Nếu bạn muốn nâng cấp ngay, liên hệ{" "}
            <a
              href={`mailto:${BILLING_SUPPORT_EMAIL}`}
              className="font-medium text-app-ink underline-offset-4 hover:underline"
            >
              {BILLING_SUPPORT_EMAIL}
            </a>{" "}
            để mở Plus thủ công.
          </p>
          <button
            type="button"
            onClick={() => navigate("/billing/plan")}
            className="mt-6 rounded-full bg-app-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-app-accent"
          >
            Quay lại trang gói
          </button>
        </div>
      </div>
    );
  }

  // ─── Pending — QR checkout ──────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="sr-only" aria-live="polite">
        {copyMessage ||
          `Trạng thái đơn hàng: ${order.status}. ${timeLeft > 0 ? `Còn ${formatCountdown(timeLeft)} để thanh toán.` : ""}`}
      </div>
      <div className="overflow-hidden surface-raised rounded-xl border border-app-line bg-app-surface">
        <div className="grid gap-0 lg:grid-cols-[minmax(320px,0.86fr)_minmax(0,1fr)]">
          <section className="border-b border-app-line bg-app-bg p-5 text-center sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-app-accent-soft">
              <QrCode className="h-6 w-6 text-app-accent" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Thanh toán tự động</p>
            <h1 className="font-serif text-2xl font-medium text-app-ink mt-2">Nâng cấp gói Plus</h1>
            <p className="mt-2 text-3xl font-medium text-app-accent">
              {formatVndAmount(order.amount)}
              <span className="ml-1 text-sm font-normal text-app-ink-muted">/ chu kỳ 12 tuần</span>
            </p>

            <div className="mt-6 flex justify-center">
              {isHostedPayosCheckout ? (
                <div className="flex min-h-56 w-56 flex-col items-center justify-center rounded-lg border border-app-line bg-app-surface p-5 sm:min-h-64 sm:w-64">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-app-ink">Mở cổng thanh toán PayOS</p>
                  <p className="mt-2 text-xs leading-5 text-app-ink-muted">
                    Dùng liên kết thanh toán do PayOS cấp để quét mã hoặc xác nhận giao dịch.
                  </p>
                  <button
                    type="button"
                    onClick={openHostedCheckout}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-app-accent px-4 py-2 text-sm font-semibold text-white hover:bg-app-accent"
                  >
                    <QrCode className="h-4 w-4" />
                    Mở PayOS
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-app-line bg-app-surface p-3">
                  <img
                    src={order.qrDataUrl}
                    alt="Mã thanh toán tự động"
                    className="h-56 w-56 object-contain sm:h-64 sm:w-64"
                    loading="eager"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <div
                className="inline-flex items-center gap-2 rounded-full bg-app-warm-soft px-4 py-2"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin text-app-warm" />
                <span className="text-sm font-medium text-app-ink">Đang chờ xác nhận...</span>
              </div>
              {timeLeft > 0 && (
                <p className="mt-2 text-xs text-app-ink-muted">Còn {formatCountdown(timeLeft)} để thanh toán</p>
              )}
            </div>
          </section>

          <section className="p-5 sm:p-6">
            <div className="stack-stack">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div>
                  <h2 className="text-base font-semibold text-app-ink">Thông tin chuyển khoản</h2>
                  <p className="mt-1 text-sm leading-6 text-app-ink-muted">
                    Chuyển đúng số tiền và giữ nguyên nội dung để hệ thống tự kích hoạt Plus sau khi nhận giao dịch.
                  </p>
                </div>
              </div>

              <div className="stack-tight rounded-lg border border-app-line bg-app-bg p-4">
                <InfoRow
                  label="Ngân hàng"
                  value={order.bankName}
                  onCopy={() => copyToClipboard(order.bankName, "bank", "ngân hàng")}
                  isCopied={copied === "bank"}
                />
                <InfoRow
                  label="Số tài khoản"
                  value={order.bankAccount}
                  onCopy={() => copyToClipboard(order.bankAccount, "account", "số tài khoản")}
                  isCopied={copied === "account"}
                />
                <InfoRow
                  label="Chủ tài khoản"
                  value={order.accountName}
                  onCopy={() => copyToClipboard(order.accountName, "name", "chủ tài khoản")}
                  isCopied={copied === "name"}
                />
                <InfoRow
                  label="Số tiền"
                  value={formatVndAmount(order.amount)}
                  onCopy={() => copyToClipboard(String(order.amount), "amount", "số tiền")}
                  isCopied={copied === "amount"}
                />
                <InfoRow
                  label="Nội dung CK"
                  value={order.orderId}
                  onCopy={() => copyToClipboard(order.orderId, "desc", "nội dung chuyển khoản")}
                  isCopied={copied === "desc"}
                  highlight
                />
              </div>
              {copyMessage ? (
                <p className="text-xs font-medium text-app-accent" aria-live="polite">
                  {copyMessage}
                </p>
              ) : null}

              <div className="rounded-lg border border-app-warm-border/30 bg-app-warm-soft px-4 py-3">
                <p className="text-xs font-medium leading-5 text-app-warm-strong">
                  Quan trọng: Vui lòng <strong>không sửa nội dung chuyển khoản</strong>. Nếu nội dung khác mã đơn, giao
                  dịch có thể cần kiểm tra thủ công.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-app-ink">Cách thanh toán</h3>
                <ol className="grid gap-2 text-sm text-app-ink-soft">
                  {[
                    "Mở ứng dụng thanh toán hoặc ngân hàng trên điện thoại.",
                    "Làm theo hướng dẫn từ cổng thanh toán mới.",
                    "Kiểm tra số tiền và nội dung thanh toán.",
                    "Xác nhận giao dịch và giữ trang này mở.",
                    "Plus sẽ được kích hoạt sau khi hệ thống xác nhận giao dịch.",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-lg border border-app-line bg-app-surface px-3 py-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-accent text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="leading-6">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <button
                type="button"
                onClick={() => navigate("/billing/plan")}
                className="text-sm font-medium text-app-ink-muted underline decoration-app-line transition hover:text-app-ink"
              >
                Hủy thanh toán
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  onCopy,
  isCopied,
  highlight,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  isCopied: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-xs text-app-ink-muted">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={`min-w-0 break-all text-sm font-semibold ${
            highlight ? "rounded-full bg-app-warm-soft px-2 py-0.5 text-app-warm-strong" : "text-app-ink"
          }`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-full p-1 text-app-ink-muted transition hover:bg-app-bg hover:text-app-ink"
          title={`Sao chép ${label}`}
          aria-label={`Sao chép ${label}`}
        >
          {isCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-app-accent" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
