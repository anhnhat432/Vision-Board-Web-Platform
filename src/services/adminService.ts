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
  createdAt?: string;
  completedAt?: string;
  expiresAt?: string;
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

export function adminGetOverview(): Promise<AdminOverview> {
  return get<AdminOverview>("/admin/overview");
}

export function adminSendExpiringBillingReminders(
  payload: AdminReminderRequest = {},
): Promise<AdminReminderRunResult> {
  return post<AdminReminderRunResult, AdminReminderRequest>("/admin/billing/reminders/expiring", payload);
}
