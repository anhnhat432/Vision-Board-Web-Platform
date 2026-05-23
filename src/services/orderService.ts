import { get, post, patch } from "@/lib/api/apiClient";

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

export interface ApiOrder {
  id: string;
  userId: string;
  status: ApiOrderStatus;
  schemaVersion?: number;
  lines?: ApiOrderLine[];
  subtotalVnd?: number;
  shippingVnd?: number;
  totalVnd?: number;
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
  kitType: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: ApiShippingAddress;
  note?: string;
  goalId?: string;
}

export function createOrder(payload: CreateOrderPayload): Promise<ApiOrder> {
  return post<ApiOrder, CreateOrderPayload>("/orders", payload);
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

// --- Admin endpoints ---

export interface AdminUpdateStatusPayload {
  status: ApiOrderStatus;
  adminNote?: string;
}

export function adminGetOrders(): Promise<ApiOrder[]> {
  return get<ApiOrder[]>("/admin/orders");
}

export function adminUpdateOrderStatus(orderId: string, payload: AdminUpdateStatusPayload): Promise<ApiOrder> {
  return patch<ApiOrder, AdminUpdateStatusPayload>(`/admin/orders/${orderId}/status`, payload);
}
