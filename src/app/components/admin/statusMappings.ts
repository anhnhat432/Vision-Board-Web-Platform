import type { AdminPaymentOrderSummary, AdminRefundRequestSummary } from "@/services/adminService";
import type { ApiOrderStatus } from "@/services/orderService";
import type { AdminBadgeTone } from "./AdminStatusBadge";

export const ADMIN_STATUS_TRANSITIONS: Record<ApiOrderStatus, ApiOrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["printing", "cancelled"],
  printing: ["shipping", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const ORDER_STATUS_LABELS: Record<ApiOrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  printing: "Đang in",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export const ORDER_STATUS_TONES: Record<ApiOrderStatus, AdminBadgeTone> = {
  pending: "pending",
  confirmed: "confirmed",
  printing: "printing",
  shipping: "shipping",
  delivered: "delivered",
  cancelled: "cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<AdminPaymentOrderSummary["status"], string> = {
  pending: "Chờ xác nhận",
  completed: "Đã mở Plus",
  expired: "Hết hạn",
  failed: "Thất bại",
};

export const PAYMENT_STATUS_TONES: Record<AdminPaymentOrderSummary["status"], AdminBadgeTone> = {
  pending: "pending",
  completed: "completed",
  expired: "expired",
  failed: "failed",
};

export const PAYMENT_STATUS_FILTERS: Array<AdminPaymentOrderSummary["status"] | "all"> = [
  "all",
  "pending",
  "completed",
  "expired",
  "failed",
];

export const REFUND_STATUS_LABELS: Record<AdminRefundRequestSummary["status"], string> = {
  pending: "Đang chờ",
  completed: "Đã hoàn tiền",
  rejected: "Đã từ chối",
};

export const REFUND_STATUS_TONES: Record<AdminRefundRequestSummary["status"], AdminBadgeTone> = {
  pending: "pending",
  completed: "completed",
  rejected: "rejected",
};
