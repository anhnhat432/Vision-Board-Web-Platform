import { get, post } from "@/lib/api/apiClient";

export interface AdminEmailStatus {
  provider: string;
  configured: boolean;
  reason?: string;
}

export interface AdminSubscriptionSummary {
  planCode: string;
  status: string;
  provider: string;
  billingCycle?: string;
  currentPeriodEnd?: string;
}

export interface AdminUserSummary {
  firebaseUid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  createdAt?: string;
  subscription: AdminSubscriptionSummary | null;
}

export interface AdminPaymentOrderSummary {
  orderId: string;
  userId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "expired" | "failed";
  provider: string;
  bankAccount?: string;
  bankName?: string;
  accountName?: string;
  description?: string;
  cassoTransactionId?: string;
  manualCompletedBy?: string;
  manualCompletedAt?: string;
  manualCompletionNote?: string;
  createdAt?: string;
  completedAt?: string;
  expiresAt?: string;
  updatedAt?: string;
  user: {
    firebaseUid: string;
    email: string;
    displayName: string;
    role: "user" | "admin";
    createdAt?: string;
  } | null;
}

export type AdminRefundRequestStatus = "pending" | "completed" | "rejected";

export interface AdminRefundRequestSummary {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  contactEmail: string;
  reason: string;
  refundAccount: string;
  status: AdminRefundRequestStatus;
  adminNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRefundRequestListResponse {
  status: AdminRefundRequestStatus | "all";
  total: number;
  items: AdminRefundRequestSummary[];
}

export interface AdminResolveRefundPayload {
  adminNote?: string;
}

export interface AdminResolveRefundResult {
  request: AdminRefundRequestSummary;
}

export interface AdminOverview {
  generatedAt: string;
  email: AdminEmailStatus;
  summary: {
    totalUsers: number;
    adminUsers: number;
    activePlusSubscriptions: number;
    expiringSoonSubscriptions: number;
    pendingPaymentOrders: number;
    completedPaymentOrders: number;
    physicalOrders: number;
    revenueTotalVnd: number;
    revenueLast30DaysVnd: number;
  };
  recentUsers: AdminUserSummary[];
  recentPayments: AdminPaymentOrderSummary[];
}

export interface AdminReminderRequest {
  daysAhead?: number;
}

export interface AdminReminderRunResult {
  configured: boolean;
  email: AdminEmailStatus;
  daysAhead: number;
  windowEnd: string;
  scanned: number;
  sent: number;
  skipped: number;
  duplicate: number;
  failed: number;
}

export interface AdminPaymentOrderListResponse {
  generatedAt: string;
  query: string;
  status: AdminPaymentOrderSummary["status"] | "all";
  limit: number;
  total: number;
  items: AdminPaymentOrderSummary[];
}

export interface AdminPaymentOrderListParams {
  q?: string;
  status?: AdminPaymentOrderSummary["status"] | "all";
  limit?: number;
}

export interface AdminManualCompletePaymentPayload {
  manualCompletionNote?: string;
}

export interface AdminManualCompletePaymentResult {
  orderId: string;
  status: "completed";
  completedAt: string | null;
  manualCompletedBy?: string | null;
  manualCompletedAt?: string | null;
  manualCompletionNote?: string | null;
  subscriptionId?: string;
  eventStatus: "processed" | "duplicate" | "failed" | "already_completed";
}

export function adminGetOverview(): Promise<AdminOverview> {
  return get<AdminOverview>("/admin/overview");
}

export function adminListPaymentOrders(
  params: AdminPaymentOrderListParams = {},
): Promise<AdminPaymentOrderListResponse> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.status && params.status !== "all") searchParams.set("status", params.status);
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return get<AdminPaymentOrderListResponse>(`/admin/billing/payment-orders${query ? `?${query}` : ""}`);
}

export function adminListRefundRequests(
  status: AdminRefundRequestStatus | "all" = "pending",
): Promise<AdminRefundRequestListResponse> {
  const searchParams = new URLSearchParams();
  if (status !== "pending") searchParams.set("status", status);
  const query = searchParams.toString();
  return get<AdminRefundRequestListResponse>(`/admin/billing/refund-requests${query ? `?${query}` : ""}`);
}

export function adminCompleteRefundRequest(
  requestId: string,
  payload: AdminResolveRefundPayload = {},
): Promise<AdminResolveRefundResult> {
  return post<AdminResolveRefundResult, AdminResolveRefundPayload>(
    `/admin/billing/refund-requests/${requestId}/complete`,
    payload,
  );
}

export function adminRejectRefundRequest(
  requestId: string,
  payload: AdminResolveRefundPayload = {},
): Promise<AdminResolveRefundResult> {
  return post<AdminResolveRefundResult, AdminResolveRefundPayload>(
    `/admin/billing/refund-requests/${requestId}/reject`,
    payload,
  );
}

export function adminSendExpiringBillingReminders(payload: AdminReminderRequest = {}): Promise<AdminReminderRunResult> {
  return post<AdminReminderRunResult, AdminReminderRequest>("/admin/billing/reminders/expiring", payload);
}

export function adminCompletePaymentOrderManually(
  orderId: string,
  payload: AdminManualCompletePaymentPayload = {},
): Promise<AdminManualCompletePaymentResult> {
  return post<AdminManualCompletePaymentResult, AdminManualCompletePaymentPayload>(
    `/admin/billing/payment-orders/${orderId}/complete`,
    payload,
  );
}
