import { toAppError } from "@/lib/api/apiClient";
import type { PaymentHistoryOrder, PaymentOrderStatus, RefundRequestStatus } from "./types";

const DEFAULT_REFUND_WINDOW_DAYS = 7;
const REFUND_WINDOW_DAYS = Number.parseInt(
  import.meta.env.VITE_REFUND_WINDOW_DAYS?.trim() || String(DEFAULT_REFUND_WINDOW_DAYS),
  10,
);

export const BILLING_SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() ?? "";

const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  pending: "Đang chờ",
  completed: "Đã thanh toán",
  expired: "Đã hết hạn",
  failed: "Lỗi",
};

const PAYMENT_STATUS_CLASS_NAMES: Record<PaymentOrderStatus, string> = {
  pending: "border-app-line bg-app-warm-soft text-app-warm",
  completed: "border-app-accent-soft bg-app-accent-soft text-app-accent",
  expired: "border-app-line bg-app-bg text-app-ink-muted",
  failed: "border-app-line bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]",
};

export function getPaymentStatusLabel(status: PaymentOrderStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? "Không rõ";
}

export function getPaymentStatusClassName(status: PaymentOrderStatus): string {
  return PAYMENT_STATUS_CLASS_NAMES[status] ?? "border-slate-200 bg-slate-50 text-slate-600";
}

export function getBillingCycleLabel(billingCycle: string): string {
  return billingCycle === "twelve_week" ? "Chu kỳ 12 tuần" : billingCycle;
}

export function formatPaymentAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
  }
}

export function formatPaymentDate(iso: string | null): string {
  if (!iso) return "Chưa có";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function getRefundWindowDays(): number {
  return Number.isFinite(REFUND_WINDOW_DAYS) && REFUND_WINDOW_DAYS > 0
    ? REFUND_WINDOW_DAYS
    : DEFAULT_REFUND_WINDOW_DAYS;
}

export function isOrderRefundEligible(order: PaymentHistoryOrder): boolean {
  if (order.status !== "completed" || !order.completedAt) return false;
  const paidAt = new Date(order.completedAt);
  if (!Number.isFinite(paidAt.valueOf())) return false;
  const elapsedMs = Date.now() - paidAt.getTime();
  if (elapsedMs < 0) return true;
  return elapsedMs <= getRefundWindowDays() * 24 * 60 * 60 * 1000;
}

export function getRefundStatusLabel(status: RefundRequestStatus): string {
  if (status === "completed") return "Đã hoàn tiền";
  if (status === "rejected") return "Đã từ chối";
  return "Đang chờ xử lý";
}

export function getPaymentHistoryErrorMessage(error: unknown): string {
  const appError = toAppError(error) as ReturnType<typeof toAppError> & {
    rateLimited?: boolean;
    retryAfterMs?: number;
    errorCode?: string;
  };
  const isRateLimited =
    appError.status === 429 ||
    appError.rateLimited === true ||
    appError.errorCode === "rate_limited" ||
    /too many requests|rate limit/i.test(appError.message);

  if (isRateLimited) {
    const retryAfterSeconds =
      typeof appError.retryAfterMs === "number" && Number.isFinite(appError.retryAfterMs)
        ? Math.max(1, Math.ceil(appError.retryAfterMs / 1000))
        : null;
    if (retryAfterSeconds) {
      return `Bạn vừa kiểm tra lịch sử thanh toán quá nhanh. Hãy đợi khoảng ${retryAfterSeconds} giây rồi thử lại.`;
    }
    return "Bạn vừa kiểm tra lịch sử thanh toán quá nhanh. Hãy đợi một chút rồi thử lại.";
  }

  return appError.message || "Không thể tải lịch sử thanh toán.";
}
