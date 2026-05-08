import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CheckCircle2, Clock, Copy, Loader2, QrCode, RefreshCw, XCircle } from "lucide-react";

import { apiClient } from "@/lib/api/apiClient";
import { syncEntitlementsWithProvider } from "../utils/production";

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderStatusResponse {
  orderId: string;
  status: "pending" | "completed" | "expired" | "failed";
  amount: number;
  currency: string;
  bankAccount: string;
  bankName: string;
  accountName: string;
  qrDataUrl: string;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
}

interface CheckoutSessionResponse {
  checkoutSessionId: string;
  checkoutUrl: string;
  expiresAt?: string;
  provider: string;
}

type EntitlementSyncStatus = "idle" | "syncing" | "synced" | "failed";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

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

  const [order, setOrder] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [entitlementSyncStatus, setEntitlementSyncStatus] = useState<EntitlementSyncStatus>("idle");
  const [entitlementSyncMessage, setEntitlementSyncMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSyncedOrderRef = useRef<string | null>(null);

  // Create a new order if no orderId in URL
  const createOrder = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await apiClient.post<CheckoutSessionResponse>("/billing/checkout-session", {
        planCode: "PLUS",
        billingCycle: "twelve_week",
        returnUrl: `${window.location.origin}/billing/checkout`,
        cancelUrl: `${window.location.origin}/billing/plan`,
      });
      if (result?.checkoutSessionId) {
        navigate(`/billing/checkout/${result.checkoutSessionId}`, { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tạo đơn hàng";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }, [navigate]);

  // Fetch order status
  const fetchStatus = useCallback(async (oid: string) => {
    try {
      const data = await apiClient.get<OrderStatusResponse>(`/billing/order-status/${oid}`);
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
      const msg = err instanceof Error ? err.message : "Lỗi khi kiểm tra đơn hàng";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Init: create or fetch
  useEffect(() => {
    if (!paramOrderId) {
      createOrder();
      return;
    }
    fetchStatus(paramOrderId);
    // Poll every 5s
    pollRef.current = setInterval(() => fetchStatus(paramOrderId), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paramOrderId, createOrder, fetchStatus]);

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
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const syncCompletedOrderAccess = useCallback(async () => {
    if (!order || order.status !== "completed") return false;

    setEntitlementSyncStatus("syncing");
    setEntitlementSyncMessage(null);

    const result = await syncEntitlementsWithProvider();
    if (result.ok && result.planCode !== "FREE") {
      setEntitlementSyncStatus("synced");
      setEntitlementSyncMessage(result.message);
      return true;
    }

    setEntitlementSyncStatus("failed");
    setEntitlementSyncMessage(
      result.message ||
        "Đã nhận thanh toán nhưng chưa cập nhật được quyền Plus trên thiết bị này. Vui lòng thử lại.",
    );
    return false;
  }, [order]);

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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-emerald-800">Thanh toán thành công!</h2>
          <p className="mt-2 text-sm text-emerald-700">
            {isSyncingEntitlement
              ? "Đã nhận thanh toán. Đang cập nhật quyền Plus trên tài khoản của bạn..."
              : syncFailed
                ? "Đã nhận thanh toán, nhưng thiết bị này chưa lấy được quyền Plus từ server."
                : "Gói Plus đã được kích hoạt. Chúc bạn có 12 tuần hiệu quả!"}
          </p>
          {entitlementSyncMessage && (
            <p className={`mt-3 text-xs leading-5 ${syncFailed ? "text-amber-700" : "text-emerald-700"}`}>
              {entitlementSyncMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handleCompletedOrderContinue}
            disabled={isSyncingEntitlement}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-amber-800">Hết thời gian thanh toán</h2>
          <p className="mt-2 text-sm text-amber-700">Đơn hàng đã hết hạn. Bạn có thể tạo đơn mới để tiếp tục.</p>
          <button
            type="button"
            onClick={() => navigate("/billing/checkout")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4" />
            Tạo đơn mới
          </button>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────

  if (error && !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-red-800">Có lỗi xảy ra</h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/billing/plan")}
            className="mt-6 rounded-xl bg-slate-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading || creating || !order) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">{creating ? "Đang tạo đơn hàng..." : "Đang tải..."}</p>
        </div>
      </div>
    );
  }

  // ─── Pending — QR checkout ──────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.38)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(320px,0.86fr)_minmax(0,1fr)]">
          <section className="border-b border-slate-200 bg-slate-50/80 p-5 text-center sm:p-7 lg:border-b-0 lg:border-r">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <QrCode className="h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Thanh toán VietQR</p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">Nâng cấp gói Plus</h1>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {formatVND(order.amount)}
              <span className="ml-1 text-sm font-normal text-slate-500">/ chu kỳ 12 tuần</span>
            </p>

            <div className="mt-6 flex justify-center">
              <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
                <img
                  src={order.qrDataUrl}
                  alt="Mã QR chuyển khoản"
                  className="h-56 w-56 object-contain sm:h-64 sm:w-64"
                  loading="eager"
                />
              </div>
            </div>

            <div className="mt-5 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span className="text-sm font-medium text-indigo-700">Đang chờ xác nhận...</span>
              </div>
              {timeLeft > 0 && (
                <p className="mt-2 text-xs text-slate-500">Còn {formatCountdown(timeLeft)} để thanh toán</p>
              )}
            </div>
          </section>

          <section className="p-5 sm:p-7">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Thông tin chuyển khoản</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Chuyển đúng số tiền và giữ nguyên nội dung để hệ thống tự kích hoạt Plus sau khi nhận giao dịch.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <InfoRow
                  label="Ngân hàng"
                  value={order.bankName}
                  onCopy={() => copyToClipboard(order.bankName, "bank")}
                  isCopied={copied === "bank"}
                />
                <InfoRow
                  label="Số tài khoản"
                  value={order.bankAccount}
                  onCopy={() => copyToClipboard(order.bankAccount, "account")}
                  isCopied={copied === "account"}
                />
                <InfoRow
                  label="Chủ tài khoản"
                  value={order.accountName}
                  onCopy={() => copyToClipboard(order.accountName, "name")}
                  isCopied={copied === "name"}
                />
                <InfoRow
                  label="Số tiền"
                  value={formatVND(order.amount)}
                  onCopy={() => copyToClipboard(String(order.amount), "amount")}
                  isCopied={copied === "amount"}
                />
                <InfoRow
                  label="Nội dung CK"
                  value={order.orderId}
                  onCopy={() => copyToClipboard(order.orderId, "desc")}
                  isCopied={copied === "desc"}
                  highlight
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium leading-5 text-amber-800">
                  Quan trọng: Vui lòng <strong>không sửa nội dung chuyển khoản</strong>. Nếu nội dung khác mã đơn, giao
                  dịch có thể cần kiểm tra thủ công.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">Cách thanh toán</h3>
                <ol className="grid gap-2 text-sm text-slate-600">
                  {[
                    "Mở app ngân hàng trên điện thoại.",
                    "Chọn quét mã QR hoặc chuyển khoản.",
                    "Kiểm tra số tiền và nội dung chuyển khoản.",
                    "Xác nhận giao dịch và giữ trang này mở.",
                    "Plus sẽ được kích hoạt sau khi hệ thống nhận thanh toán.",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
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
                className="text-sm font-medium text-slate-500 underline decoration-slate-300 transition hover:text-slate-700"
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
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={`min-w-0 break-all text-sm font-semibold ${
            highlight ? "rounded bg-indigo-100 px-2 py-0.5 text-indigo-700" : "text-slate-800"
          }`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          title="Sao chép"
        >
          {isCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
