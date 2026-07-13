import { get, getFile, patch, post } from "@/lib/api/apiClient";
import type {
  AdminClassificationMutationPayload,
  AdminClassificationMutationResult,
  AdminOperationalClassificationSummary,
  AdminOperationalScope,
} from "./adminService";

export type ApiOrderStatus = "pending" | "confirmed" | "printing" | "shipping" | "delivered" | "cancelled";

export type ApiOrderLineType = "frame" | "theme" | "sticker";

export interface ApiOrderLine {
  itemId: string;
  label: string;
  type: ApiOrderLineType;
  qty: number;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

export interface ApiShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  country: string;
}

export interface ApiGoalSnapshot {
  goalId: string;
  title: string;
  focusArea?: string;
}

export interface ApiOrderDiscount {
  source: "coupon" | "sale_event" | "env_fallback";
  discountCode?: string;
  discountId?: string;
  discountName?: string;
  discountPercent?: number;
  discountType?: "percentage" | "fixed";
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
}

export interface ApiOrder {
  id: string;
  userId: string;
  status: ApiOrderStatus;
  schemaVersion?: number;
  lines?: ApiOrderLine[];
  subtotalVnd?: number;
  shippingVnd?: number;
  totalVnd?: number;
  discount?: ApiOrderDiscount;
  keywords?: string[];
  // Deprecated v2: kitType vẫn có thể tồn tại trên đơn cũ.
  kitType?: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: ApiShippingAddress;
  note?: string;
  goalSnapshot?: ApiGoalSnapshot;
  statusHistory: Array<{
    status: ApiOrderStatus;
    changedAt: string;
    changedBy: string;
  }>;
  adminNote?: string;
  cancelledAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  itemIds: string[];
  sticker?: { itemId: string; qty: number } | null;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  goalId?: string | null;
  goalTitle?: string;
  keywords?: string[];
  note?: string;
  couponCode?: string;
}

export function getOrders(): Promise<ApiOrder[]> {
  return get<ApiOrder[]>("/orders");
}

export function getOrder(orderId: string): Promise<ApiOrder> {
  return get<ApiOrder>(`/orders/${orderId}`);
}

export function cancelOrder(orderId: string): Promise<ApiOrder> {
  return patch<ApiOrder>(`/orders/${orderId}/cancel`);
}

export function createOrder(payload: CreateOrderPayload): Promise<ApiOrder> {
  return post<ApiOrder, CreateOrderPayload>("/orders", payload);
}

export interface KitPaymentSessionResponse {
  paymentOrderId: string;
  checkoutUrl: string;
  provider: string;
  expiresAt?: string;
  amount: number;
  currency: string;
}

export function createKitPaymentSession(orderId: string): Promise<KitPaymentSessionResponse> {
  return post<KitPaymentSessionResponse>(`/orders/${orderId}/payment-session`);
}

// --- Admin endpoints ---

export interface AdminUpdateStatusPayload {
  status: ApiOrderStatus;
  adminNote?: string;
}

export interface AdminOrderListParams {
  q?: string;
  status?: ApiOrderStatus | "all";
  frame?: string | "all";
  dateFrom?: string;
  dateTo?: string;
  operationalScope?: AdminOperationalScope;
  page?: number;
  limit?: number;
}

export interface AdminApiOrder extends ApiOrder {
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminOrderListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  operationalScope: AdminOperationalScope;
  query: string;
  status: ApiOrderStatus | "all";
  frame: string | "all";
  dateFrom: string | null;
  dateTo: string | null;
  statusCounts: Record<ApiOrderStatus | "all", number>;
  frameOptions: string[];
  items: AdminApiOrder[];
}

function buildAdminOrderQuery(params: AdminOrderListParams, includePagination: boolean): string {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.status && params.status !== "all") searchParams.set("status", params.status);
  if (params.frame && params.frame !== "all") searchParams.set("frame", params.frame);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.operationalScope) searchParams.set("operationalScope", params.operationalScope);
  if (includePagination && params.page) searchParams.set("page", String(params.page));
  if (includePagination && params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export function adminGetOrders(params: AdminOrderListParams): Promise<AdminOrderListResponse> {
  const query = buildAdminOrderQuery(params, true);
  return get<AdminOrderListResponse>(`/admin/orders${query ? `?${query}` : ""}`);
}

export function adminExportOrders(params: AdminOrderListParams = {}): Promise<{ blob: Blob; filename: string | null }> {
  const query = buildAdminOrderQuery(params, false);
  return getFile(`/admin/orders/export${query ? `?${query}` : ""}`);
}

export function adminGetOrder(orderId: string): Promise<AdminApiOrder> {
  return get<AdminApiOrder>(`/admin/orders/${orderId}`);
}

export function adminClassifyPhysicalOrder(
  orderId: string,
  payload: AdminClassificationMutationPayload,
): Promise<AdminClassificationMutationResult> {
  return patch<AdminClassificationMutationResult, AdminClassificationMutationPayload>(
    `/admin/orders/${encodeURIComponent(orderId)}/operational-classification`,
    payload,
  );
}

export function adminUpdateOrderStatus(orderId: string, payload: AdminUpdateStatusPayload): Promise<AdminApiOrder> {
  return patch<AdminApiOrder, AdminUpdateStatusPayload>(`/admin/orders/${orderId}/status`, payload);
}

// ─── Admin Order Edit ────────────────────────────────────────────────────────

export interface AdminUpdateOrderPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  shippingAddress?: ApiShippingAddress;
  note?: string;
  adminNote?: string;
}

export function adminUpdateOrder(orderId: string, payload: AdminUpdateOrderPayload): Promise<AdminApiOrder> {
  return patch<AdminApiOrder, AdminUpdateOrderPayload>(`/admin/orders/${orderId}`, payload);
}
