import { delete as apiDelete, get, getFile, patch, post, put } from "@/lib/api/apiClient";

export type AdminOperationalCategory = "real" | "test" | "internal";
export type AdminOperationalScope = "real" | "excluded" | "all";
export type AdminOperationalClassificationReason =
  | "confirmed_real"
  | "test_account"
  | "internal_team"
  | "automated_qa"
  | "other";

export interface AdminOperationalClassificationSummary {
  effectiveCategory: AdminOperationalCategory;
  source: "default" | "user" | "record" | "legacy_sales_review";
  reason?: AdminOperationalClassificationReason | "legacy_sales_test" | "legacy_sales_internal";
  note?: string;
  classifiedAt?: string;
}

export interface AdminClassificationMutationPayload {
  requestId: string;
  category: AdminOperationalCategory;
  reason: AdminOperationalClassificationReason;
  note?: string;
}

export interface AdminClassifyUsersPayload extends Omit<AdminClassificationMutationPayload, "requestId"> {
  changes: Array<{ userUid: string; requestId: string }>;
}

export interface AdminClassificationMutationResult {
  status: "updated" | "unchanged";
  classification: AdminOperationalClassificationSummary;
}

export interface AdminClassifyUsersResult {
  category: AdminOperationalCategory;
  results: Array<
    | { userUid: string; status: "updated" | "unchanged" }
    | { userUid: string; status: "failed"; errorCode: string }
  >;
}

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
  operationalClassification?: AdminOperationalClassificationSummary;
}

export interface AdminUserSummary {
  firebaseUid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  createdAt?: string;
  subscription: AdminSubscriptionSummary | null;
  operationalClassification: AdminOperationalClassificationSummary;
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
  payer: AdminPaymentPayerSource | null;
  user: {
    firebaseUid: string;
    email: string;
    displayName: string;
    role: "user" | "admin";
    createdAt?: string;
  } | null;
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminPaymentPayerSource {
  classification: "internal" | "external" | "unknown";
  accountLast4?: string;
  accountNameMasked?: string;
  accountMasked?: string;
  bankName?: string;
  transactionReference?: string;
  transactionDateTime?: string;
  source: "webhook" | "reconciliation";
  observedAt: string;
}

export type AdminSalesProvider = "payos" | "casso";
export type AdminSalesKpiStatus = "pending" | "included" | "excluded";
export type AdminSalesExclusionReason = "internal_team" | "test" | "duplicate" | "other";

export interface AdminSalesReportRow {
  orderId: string;
  customerLabelMasked: string;
  customerEmailMasked: string;
  provider: AdminSalesProvider;
  providerReference: string | null;
  amountVnd: number;
  currency: "VND";
  completedAt: string;
  isManualCompletion: boolean;
  payer: AdminPaymentPayerSource | null;
  refund: {
    status: "none" | "completed";
    amountVnd: number;
    completedAt: string | null;
  };
  reporting: {
    kpiStatus: AdminSalesKpiStatus;
    exclusionReason: AdminSalesExclusionReason | null;
    reviewedAt: string | null;
  };
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminSalesReportResult {
  generatedAt: string;
  filters: {
    from: string;
    to: string;
    provider: "all" | AdminSalesProvider;
    kpiStatus: AdminSalesKpiStatus;
    timezone: "Asia/Ho_Chi_Minh";
  };
  availableProviders: AdminSalesProvider[];
  summary: {
    successfulTransactions: number;
    uniquePaidUsers: number;
    grossRevenueVnd: number;
    refundedAmountVnd: number;
    netRevenueVnd: number;
    pendingReviews: number;
  };
  tabCounts: Record<AdminSalesKpiStatus, number>;
  dailyBuckets: Array<{
    date: string;
    transactions: number;
    grossRevenueVnd: number;
    refundedAmountVnd: number;
    netRevenueVnd: number;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AdminSalesReportRow[];
}

export interface AdminSalesReportParams {
  from: string;
  to: string;
  provider?: "all" | AdminSalesProvider;
  kpiStatus: AdminSalesKpiStatus;
  page?: number;
  limit?: number;
}

export interface AdminSalesReviewDecisionPayload {
  kpiStatus: "included" | "excluded";
  exclusionReason?: AdminSalesExclusionReason;
  reviewNote?: string;
}

export interface AdminReviewSalesOrderPayload extends AdminSalesReviewDecisionPayload {
  reviewRequestId: string;
}

function buildSalesReportQuery(params: AdminSalesReportParams, includePagination: boolean): string {
  const searchParams = new URLSearchParams();
  searchParams.set("from", params.from);
  searchParams.set("to", params.to);
  if (params.provider && params.provider !== "all") searchParams.set("provider", params.provider);
  searchParams.set("kpiStatus", params.kpiStatus);
  if (includePagination && params.page) searchParams.set("page", String(params.page));
  if (includePagination && params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export function adminGetSalesReport(params: AdminSalesReportParams): Promise<AdminSalesReportResult> {
  return get<AdminSalesReportResult>(`/admin/reports/sales?${buildSalesReportQuery(params, true)}`);
}

export function adminReviewSalesOrder(
  orderId: string,
  payload: AdminReviewSalesOrderPayload,
): Promise<{ item: AdminSalesReportRow }> {
  return patch<{ item: AdminSalesReportRow }, AdminReviewSalesOrderPayload>(
    `/admin/reports/sales/${encodeURIComponent(orderId)}/review`,
    payload,
  );
}

export function adminExportSalesReport(
  params: AdminSalesReportParams,
): Promise<{ blob: Blob; filename: string | null }> {
  return getFile(`/admin/reports/sales/export?${buildSalesReportQuery(params, false)}`);
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
  operationalScope: AdminOperationalScope;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AdminPaymentOrderSummary[];
}

export interface AdminPaymentOrderListParams {
  q?: string;
  status?: AdminPaymentOrderSummary["status"] | "all";
  operationalScope?: AdminOperationalScope;
  page?: number;
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

export interface AdminReconcilePaymentOrderPayerSourceResult {
  orderId: string;
  payer: AdminPaymentPayerSource;
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
  if (params.operationalScope) searchParams.set("operationalScope", params.operationalScope);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return get<AdminPaymentOrderListResponse>(`/admin/billing/payment-orders${query ? `?${query}` : ""}`);
}

export function adminClassifyPaymentOrder(
  orderId: string,
  payload: AdminClassificationMutationPayload,
): Promise<AdminClassificationMutationResult> {
  return patch<AdminClassificationMutationResult, AdminClassificationMutationPayload>(
    `/admin/billing/payment-orders/${encodeURIComponent(orderId)}/operational-classification`,
    payload,
  );
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

export function adminReconcilePaymentOrderPayerSource(
  orderId: string,
): Promise<AdminReconcilePaymentOrderPayerSourceResult> {
  return post<AdminReconcilePaymentOrderPayerSourceResult>(
    `/admin/billing/payment-orders/${orderId}/reconcile-payer-source`,
  );
}

// ─── Discount Admin ──────────────────────────────────────────────────────────

export interface AdminDiscountSummary {
  _id: string;
  type: "coupon" | "sale_event";
  code: string;
  name: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  startsAt: string;
  endsAt?: string | null;
  appliesTo: ("PLUS" | "physical_order")[];
  active: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDiscountListResponse {
  items: AdminDiscountSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminDiscountCreatePayload {
  type: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  minAmount?: number | null;
  maxUses?: number | null;
  startsAt?: string;
  endsAt?: string | null;
  appliesTo?: string[];
  active?: boolean;
}

export interface AdminDiscountUpdatePayload extends Partial<AdminDiscountCreatePayload> {
  active?: boolean;
}

export interface AdminCouponUsageSummary {
  _id: string;
  discountId: string;
  code: string;
  userId: string;
  orderId: string;
  usedAt: string;
}

export interface AdminCouponUsageListResponse {
  items: AdminCouponUsageSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminDiscountListParams {
  q?: string;
  type?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

export function adminListDiscounts(
  params: AdminDiscountListParams = {},
): Promise<AdminDiscountListResponse> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.type) searchParams.set("type", params.type);
  if (params.active !== undefined) searchParams.set("active", String(params.active));
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return get<AdminDiscountListResponse>(`/admin/discounts${query ? `?${query}` : ""}`);
}

export function adminCreateDiscount(
  payload: AdminDiscountCreatePayload,
): Promise<AdminDiscountSummary> {
  return post<AdminDiscountSummary, AdminDiscountCreatePayload>("/admin/discounts", payload);
}

export function adminUpdateDiscount(
  id: string,
  payload: AdminDiscountUpdatePayload,
): Promise<AdminDiscountSummary> {
  return put<AdminDiscountSummary, AdminDiscountUpdatePayload>(`/admin/discounts/${id}`, payload);
}

export function adminDeleteDiscount(id: string): Promise<{ id: string; active: boolean }> {
  return apiDelete<{ id: string; active: boolean }>(`/admin/discounts/${id}`);
}

export function adminListCouponUsages(
  discountId: string,
  page = 1,
  limit = 20,
): Promise<AdminCouponUsageListResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  return get<AdminCouponUsageListResponse>(`/admin/discounts/${discountId}/usages?${searchParams.toString()}`);
}

// ─── User Management ─────────────────────────────────────────────────────────

export interface AdminUserListItem {
  firebaseUid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  onboardingCompletedAt: string | null;
  locale: string;
  createdAt: string;
  updatedAt: string | null;
  subscription: AdminSubscriptionSummary | null;
  goalCount: number;
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminUserListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AdminUserListItem[];
}

export interface AdminUserListParams {
  q?: string;
  role?: string;
  operationalCategory?: AdminOperationalCategory | "all";
  page?: number;
  limit?: number;
}

export interface AdminGoalSummary {
  id: string;
  title: string;
  category: string;
  description: string;
  deadline: string;
  status: string;
  focusArea?: string;
  readinessScore?: number;
  createdAt: string;
}

export interface AdminUserPaymentOrderSummary {
  orderId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  completedAt?: string;
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminPhysicalOrderSummary {
  id: string;
  status: string;
  totalVnd: number;
  fullName: string;
  createdAt: string;
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminUserDetail {
  user: {
    firebaseUid: string;
    email: string;
    displayName: string;
    role: "user" | "admin";
    onboardingCompletedAt: string | null;
    termsAcceptedAt: string | null;
    avatarUrl: string | null;
    locale: string;
    createdAt: string;
    updatedAt: string | null;
    operationalClassification: AdminOperationalClassificationSummary;
  };
  subscription: AdminSubscriptionSummary | null;
  goals: AdminGoalSummary[];
  paymentOrders: AdminUserPaymentOrderSummary[];
  physicalOrders: AdminPhysicalOrderSummary[];
}

export interface AdminUpdateUserRoleResult {
  firebaseUid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
}

export function adminListUsers(params: AdminUserListParams = {}): Promise<AdminUserListResponse> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.role && params.role !== "all") searchParams.set("role", params.role);
  if (params.operationalCategory !== undefined) searchParams.set("operationalCategory", params.operationalCategory);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return get<AdminUserListResponse>(`/admin/users${query ? `?${query}` : ""}`);
}

export function adminClassifyUsers(payload: AdminClassifyUsersPayload): Promise<AdminClassifyUsersResult> {
  return patch<AdminClassifyUsersResult, AdminClassifyUsersPayload>("/admin/users/operational-classification", payload);
}

export function adminGetUserDetail(uid: string): Promise<AdminUserDetail> {
  return get<AdminUserDetail>(`/admin/users/${uid}`);
}

export function adminUpdateUserRole(uid: string, role: "user" | "admin"): Promise<AdminUpdateUserRoleResult> {
  return patch<AdminUpdateUserRoleResult, { role: string }>(`/admin/users/${uid}/role`, { role });
}

// ─── Manual Subscription Management ──────────────────────────────────────────

export interface AdminUpdateSubscriptionPayload {
  planCode: "PLUS" | "FREE";
  billingCycle?: string;
}

export function adminUpdateUserSubscription(
  uid: string,
  payload: AdminUpdateSubscriptionPayload,
): Promise<AdminUserDetail> {
  return patch<AdminUserDetail, AdminUpdateSubscriptionPayload>(`/admin/users/${uid}/subscription`, payload);
}

// ─── Subscription List ──────────────────────────────────────────────────────

export interface AdminSubscriptionListItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  planCode: string;
  status: string;
  provider: string;
  billingCycle: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminSubscriptionListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AdminSubscriptionListItem[];
}

export interface AdminSubscriptionListParams {
  status?: string;
  planCode?: string;
  operationalScope?: AdminOperationalScope;
  page?: number;
  limit?: number;
}

export function adminListSubscriptions(params: AdminSubscriptionListParams = {}): Promise<AdminSubscriptionListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== "all") searchParams.set("status", params.status);
  if (params.planCode && params.planCode !== "all") searchParams.set("planCode", params.planCode);
  if (params.operationalScope) searchParams.set("operationalScope", params.operationalScope);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  return get<AdminSubscriptionListResponse>(`/admin/subscriptions${query ? `?${query}` : ""}`);
}

// ─── Email Events ────────────────────────────────────────────────────────────

export interface AdminEmailEventItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  status: string;
  providerEventId: string;
  processedAt: string | null;
  error: string | null;
  createdAt: string;
}

export interface AdminEmailEventListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AdminEmailEventItem[];
}

export function adminListEmailEvents(params: {
  page?: number;
  limit?: number;
} = {}): Promise<AdminEmailEventListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  return get<AdminEmailEventListResponse>(`/admin/email-events${query ? `?${query}` : ""}`);
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export interface AdminAuditLogEntry {
  _id?: string;
  actorUid: string;
  actorEmail?: string | null;
  action: string;
  target: string;
  targetId?: string | null;
  payload?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  timestamp: string;
  success: boolean;
}

export interface AdminAuditLogListResponse {
  page: number;
  limit: number;
  total: number;
  items: AdminAuditLogEntry[];
}

export interface AdminAuditLogListParams {
  actorUid?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export function adminListAuditLogs(params: AdminAuditLogListParams = {}): Promise<AdminAuditLogListResponse> {
  const searchParams = new URLSearchParams();
  if (params.actorUid?.trim()) searchParams.set("actorUid", params.actorUid.trim());
  if (params.action?.trim()) searchParams.set("action", params.action.trim());
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.page) searchParams.set("page", String(params.page));

  const query = searchParams.toString();
  return get<AdminAuditLogListResponse>(`/admin/audit-logs${query ? `?${query}` : ""}`);
}
