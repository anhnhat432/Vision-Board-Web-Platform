import type { Request, Response, NextFunction } from "express";
import type { FilterQuery } from "mongoose";

import { requireAuthUser } from "./controllerHelpers";
import { billingService } from "../services/billingServiceInstance";
import { BillingEventModel } from "../models/BillingEventModel";
import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { OrderModel } from "../models/OrderModel";
import {
  PaymentOrderModel,
  type PaymentOrderDocument,
  type PaymentOrderStatus,
} from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import {
  getEmailRuntimeStatus,
  hashEmailPayload,
  sendBillingExpirationReminderEmail,
} from "../services/emailNotificationService";
import { getPaymentPayerSourceConfig, type PaymentPayerSourceClassification } from "../services/paymentPayerSource";
import * as payosPaymentAdapter from "../services/payosPaymentAdapter";
import * as payosPayerReconciliation from "../services/payosPayerReconciliation";
import { ApiError } from "../utils/apiError";
import { getLastPaymentReconciliationRun } from "../jobs/reconciliationJob";
import { successResponse } from "../utils/apiResponse";
import { clearAdminRoleCache } from "../middleware/requireAdmin";

const DEFAULT_EXPIRING_REMINDER_DAYS = 7;
const MAX_EXPIRING_REMINDER_DAYS = 30;
const MAX_REMINDERS_PER_RUN = 100;
const DEFAULT_PAYMENT_ORDER_LIMIT = 50;
const MAX_PAYMENT_ORDER_LIMIT = 100;
const MAX_PAYMENT_ORDER_SEARCH_LENGTH = 120;
const MAX_MANUAL_COMPLETION_NOTE_LENGTH = 500;
const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;
const PAYMENT_ORDER_STATUSES = new Set<PaymentOrderStatus>(["pending", "completed", "expired", "failed"]);

type UserRole = "user" | "admin";

interface LeanUserSummary {
  firebaseUid: string;
  email: string;
  displayName?: string | null;
  role: UserRole;
  createdAt?: Date;
}

interface LeanSubscriptionSummary {
  _id: unknown;
  userId: string;
  planCode: string;
  status: string;
  provider: string;
  billingCycle?: string;
  currentPeriodEnd?: Date;
  createdAt?: Date;
}

interface LeanPaymentOrderSummary {
  orderId: string;
  userId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  bankAccount?: string;
  bankName?: string;
  accountName?: string;
  description?: string;
  cassoTransactionId?: string;
  manualCompletedBy?: string;
  manualCompletedAt?: Date;
  manualCompletionNote?: string;
  createdAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  updatedAt?: Date;
  metadata?: PaymentOrderDocument["metadata"];
}

interface AdminPaymentPayerSummary {
  classification: PaymentPayerSourceClassification;
  accountLast4?: string;
  accountNameMasked?: string;
  bankName?: string;
  source: "webhook" | "reconciliation";
  observedAt: Date;
}

function parseDaysAhead(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_EXPIRING_REMINDER_DAYS;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_EXPIRING_REMINDER_DAYS);
}

function getDateKey(value: Date | undefined): string {
  if (!value || !Number.isFinite(value.valueOf())) return "unknown";
  return value.toISOString().slice(0, 10);
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePaymentOrderLimit(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value.trim()) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_PAYMENT_ORDER_LIMIT;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_PAYMENT_ORDER_LIMIT);
}

function normalizePaymentOrderSearch(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_PAYMENT_ORDER_SEARCH_LENGTH);
}

function normalizePaymentOrderStatus(value: unknown): PaymentOrderStatus | "all" {
  if (typeof value !== "string") return "all";
  const normalized = value.trim().toLowerCase();
  return PAYMENT_ORDER_STATUSES.has(normalized as PaymentOrderStatus)
    ? (normalized as PaymentOrderStatus)
    : "all";
}

function normalizeManualCompletionNote(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, "manualCompletionNote must be a string.", undefined, "invalid_payload");
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, MAX_MANUAL_COMPLETION_NOTE_LENGTH);
}

function serializeSubscription(subscription: LeanSubscriptionSummary | undefined) {
  if (!subscription) return null;
  const isExpired =
    subscription.currentPeriodEnd &&
    Number.isFinite(subscription.currentPeriodEnd.valueOf()) &&
    subscription.currentPeriodEnd < new Date();
  const hasActiveAccess =
    subscription.planCode === "PLUS" &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    !isExpired;

  return {
    planCode: hasActiveAccess ? subscription.planCode : "FREE",
    status: subscription.status,
    provider: subscription.provider,
    billingCycle: subscription.billingCycle,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

function serializeUserSummary(user: LeanUserSummary | undefined) {
  if (!user) return null;
  return {
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName ?? "",
    role: user.role,
    createdAt: user.createdAt,
  };
}

function serializePaymentPayer(payer: AdminPaymentPayerSummary | undefined) {
  if (!payer) return null;
  return {
    classification: payer.classification,
    accountLast4: payer.accountLast4,
    accountNameMasked: payer.accountNameMasked,
    bankName: payer.bankName,
    source: payer.source,
    observedAt: payer.observedAt,
  };
}

function serializePaymentOrder(order: LeanPaymentOrderSummary, userById: Map<string, LeanUserSummary>) {
  const payer = order.metadata?.payos?.payer as AdminPaymentPayerSummary | undefined;
  return {
    orderId: order.orderId,
    userId: order.userId,
    planCode: order.planCode,
    billingCycle: order.billingCycle,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    provider: order.provider,
    bankAccount: order.bankAccount,
    bankName: order.bankName,
    accountName: order.accountName,
    description: order.description,
    cassoTransactionId: order.cassoTransactionId,
    manualCompletedBy: order.manualCompletedBy,
    manualCompletedAt: order.manualCompletedAt,
    manualCompletionNote: order.manualCompletionNote,
    createdAt: order.createdAt,
    completedAt: order.completedAt,
    expiresAt: order.expiresAt,
    updatedAt: order.updatedAt,
    payer: serializePaymentPayer(payer),
    user: serializeUserSummary(userById.get(order.userId)),
  };
}

async function getUserMapByFirebaseIds(userIds: string[]): Promise<Map<string, LeanUserSummary>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return new Map();

  const users = await UserModel.find({ firebaseUid: { $in: uniqueUserIds } })
    .select("firebaseUid email displayName role createdAt")
    .lean<LeanUserSummary[]>();

  return new Map(users.map((user) => [user.firebaseUid, user]));
}

async function buildPaymentOrderFilter(
  status: PaymentOrderStatus | "all",
  search: string,
): Promise<FilterQuery<PaymentOrderDocument>> {
  const filter: FilterQuery<PaymentOrderDocument> = {};

  if (status !== "all") {
    filter.status = status;
  }

  if (!search) return filter;

  const escapedSearch = escapeRegex(search);
  const searchRegex = new RegExp(escapedSearch, "i");
  const matchedUsers = await UserModel.find({
    $or: [
      { firebaseUid: searchRegex },
      { email: searchRegex },
      { displayName: searchRegex },
    ],
  })
    .select("firebaseUid")
    .limit(50)
    .lean<Array<Pick<LeanUserSummary, "firebaseUid">>>();

  const userIds = matchedUsers.map((user) => user.firebaseUid);
  filter.$or = [
    { orderId: searchRegex },
    { userId: searchRegex },
    { description: searchRegex },
    { cassoTransactionId: searchRegex },
  ];
  if (userIds.length > 0) {
    filter.$or.push({ userId: { $in: userIds } });
  }

  return filter;
}

export async function getReconciliationLastRun(_req: Request, res: Response): Promise<void> {
  res.status(200).json(successResponse({ lastRun: getLastPaymentReconciliationRun() }));
}

export async function getAdminOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const expiringWindowEnd = new Date(now.getTime() + DEFAULT_EXPIRING_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      adminUsers,
      activePlusSubscriptions,
      expiringSoonSubscriptions,
      pendingPaymentOrders,
      completedPaymentOrders,
      physicalOrders,
      recentUsers,
      recentPayments,
      revenueTotal,
      revenueLast30Days,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: "admin" }),
      BillingSubscriptionModel.countDocuments({
        planCode: "PLUS",
        status: "active",
        $or: [{ currentPeriodEnd: { $exists: false } }, { currentPeriodEnd: null }, { currentPeriodEnd: { $gte: now } }],
      }),
      BillingSubscriptionModel.countDocuments({
        planCode: "PLUS",
        status: "active",
        currentPeriodEnd: { $gte: now, $lte: expiringWindowEnd },
      }),
      PaymentOrderModel.countDocuments({ status: "pending" }),
      PaymentOrderModel.countDocuments({ status: "completed" }),
      OrderModel.countDocuments(),
      UserModel.find()
        .select("firebaseUid email displayName role createdAt")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean<LeanUserSummary[]>(),
      PaymentOrderModel.find()
        .select(
          "orderId userId planCode billingCycle amount currency status provider bankAccount bankName accountName description cassoTransactionId manualCompletedBy manualCompletedAt manualCompletionNote metadata.payos.orderCode metadata.payos.paymentLinkId metadata.payos.payer createdAt completedAt expiresAt updatedAt",
        )
        .sort({ createdAt: -1 })
        .limit(12)
        .lean<LeanPaymentOrderSummary[]>(),
      PaymentOrderModel.aggregate<{ total: number }>([
        { $match: { status: "completed", currency: "VND" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      PaymentOrderModel.aggregate<{ total: number }>([
        { $match: { status: "completed", currency: "VND", completedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const userIds = recentUsers.map((user) => user.firebaseUid);
    const recentUserSubscriptions = userIds.length
      ? await BillingSubscriptionModel.find({ userId: { $in: userIds } })
          .select("userId planCode status provider billingCycle currentPeriodEnd createdAt")
          .sort({ createdAt: -1 })
          .lean<LeanSubscriptionSummary[]>()
      : [];
    const subscriptionByUserId = new Map<string, LeanSubscriptionSummary>();
    for (const subscription of recentUserSubscriptions) {
      if (!subscriptionByUserId.has(subscription.userId)) {
        subscriptionByUserId.set(subscription.userId, subscription);
      }
    }
    const paymentUserById = await getUserMapByFirebaseIds(recentPayments.map((payment) => payment.userId));

    res.status(200).json(
      successResponse(
        {
          generatedAt: now.toISOString(),
          email: getEmailRuntimeStatus(),
          summary: {
            totalUsers,
            adminUsers,
            activePlusSubscriptions,
            expiringSoonSubscriptions,
            pendingPaymentOrders,
            completedPaymentOrders,
            physicalOrders,
            revenueTotalVnd: revenueTotal[0]?.total ?? 0,
            revenueLast30DaysVnd: revenueLast30Days[0]?.total ?? 0,
          },
          recentUsers: recentUsers.map((user) => ({
            firebaseUid: user.firebaseUid,
            email: user.email,
            displayName: user.displayName ?? "",
            role: user.role,
            createdAt: user.createdAt,
            subscription: serializeSubscription(subscriptionByUserId.get(user.firebaseUid)),
          })),
          recentPayments: recentPayments.map((payment) => serializePaymentOrder(payment, paymentUserById)),
        },
        "Admin overview loaded.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getAdminPaymentOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = normalizePaymentOrderStatus(req.query.status);
    const query = normalizePaymentOrderSearch(req.query.q ?? req.query.query ?? req.query.search);
    const limit = parsePaymentOrderLimit(req.query.limit);
    const filter = await buildPaymentOrderFilter(status, query);

    const [total, orders] = await Promise.all([
      PaymentOrderModel.countDocuments(filter),
      PaymentOrderModel.find(filter)
        .select(
          "orderId userId planCode billingCycle amount currency status provider bankAccount bankName accountName description cassoTransactionId manualCompletedBy manualCompletedAt manualCompletionNote metadata.payos.orderCode metadata.payos.paymentLinkId metadata.payos.payer createdAt completedAt expiresAt updatedAt",
        )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean<LeanPaymentOrderSummary[]>(),
    ]);
    const userById = await getUserMapByFirebaseIds(orders.map((order) => order.userId));

    res.status(200).json(
      successResponse(
        {
          generatedAt: new Date().toISOString(),
          query,
          status,
          limit,
          total,
          items: orders.map((order) => serializePaymentOrder(order, userById)),
        },
        "Admin payment orders loaded.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function reconcileAdminPaymentOrderPayerSource(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = req.params.orderId?.trim().toUpperCase();
    const order = await PaymentOrderModel.findOne({ orderId });
    if (!order) {
      throw new ApiError(404, "Payment order not found.", undefined, "payment_order_not_found");
    }

    const payos = order.metadata?.payos;
    let result: payosPayerReconciliation.PayosPayerReconciliationResult;
    try {
      result = await payosPayerReconciliation.reconcilePayosPayerSource({
        order: {
          orderId: order.orderId,
          amount: order.amount,
          provider: order.provider,
          status: order.status,
          paymentLinkId: payos?.paymentLinkId,
          orderCode: payos?.orderCode,
        },
        client: payosPaymentAdapter.getPayosPaymentLinkClient(),
        payerSourceConfig: getPaymentPayerSourceConfig(),
      });
    } catch {
      throw new ApiError(
        422,
        "Không thể đối chiếu nguồn tiền của đơn này từ PayOS.",
        undefined,
        "payos_payer_reconciliation_failed",
      );
    }

    const observedAt = new Date();
    order.metadata = {
      ...(order.metadata ?? {}),
      payos: {
        ...(payos ?? {}),
        payer: {
          ...result.payer,
          source: "reconciliation",
          observedAt,
        },
      },
    };
    await order.save();

    res.status(200).json(
      successResponse(
        {
          orderId: order.orderId,
          payer: serializePaymentPayer({
            ...result.payer,
            source: "reconciliation",
            observedAt,
          }),
        },
        "PayOS payer source reconciled.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function sendExpiringBillingReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const emailStatus = getEmailRuntimeStatus();
    const daysAhead = parseDaysAhead(req.body?.daysAhead);
    const now = new Date();
    const windowEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    if (!emailStatus.configured) {
      res.status(200).json(
        successResponse(
          {
            configured: false,
            email: emailStatus,
            daysAhead,
            windowEnd,
            scanned: 0,
            sent: 0,
            skipped: 0,
            duplicate: 0,
            failed: 0,
          },
          "Email provider is not configured; no reminders were sent.",
        ),
      );
      return;
    }

    const subscriptions = await BillingSubscriptionModel.find({
      planCode: "PLUS",
      status: "active",
      currentPeriodEnd: { $gte: now, $lte: windowEnd },
    })
      .select("userId planCode status provider billingCycle currentPeriodEnd createdAt")
      .sort({ currentPeriodEnd: 1 })
      .limit(MAX_REMINDERS_PER_RUN)
      .lean<LeanSubscriptionSummary[]>();

    const userIds = [...new Set(subscriptions.map((subscription) => subscription.userId))];
    const users = userIds.length
      ? await UserModel.find({ firebaseUid: { $in: userIds } })
          .select("firebaseUid email displayName role createdAt")
          .lean<LeanUserSummary[]>()
      : [];
    const userById = new Map(users.map((user) => [user.firebaseUid, user]));

    let sent = 0;
    let skipped = 0;
    let duplicate = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      const user = userById.get(subscription.userId);
      const providerEventId = [
        "billing_expiring",
        String(subscription._id),
        getDateKey(subscription.currentPeriodEnd),
      ].join(":");

      try {
        const event = await BillingEventModel.create({
          provider: "email",
          providerEventId,
          eventType: "billing_expiration_reminder",
          userId: subscription.userId,
          status: "received",
          payloadHash: hashEmailPayload(providerEventId),
        });

        const result = await sendBillingExpirationReminderEmail({
          to: user?.email,
          displayName: user?.displayName,
          planCode: subscription.planCode,
          currentPeriodEnd: subscription.currentPeriodEnd ?? now,
        });

        if (result.status === "sent") sent += 1;
        if (result.status === "skipped") skipped += 1;
        if (result.status === "failed") failed += 1;

        event.status = result.status === "sent" ? "processed" : result.status === "skipped" ? "ignored" : "failed";
        event.processedAt = new Date();
        event.error = result.reason;
        await event.save();
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          duplicate += 1;
          continue;
        }

        failed += 1;
        console.error("[adminController] Failed to send billing expiration reminder:", error);
      }
    }

    res.status(200).json(
      successResponse(
        {
          configured: true,
          email: emailStatus,
          daysAhead,
          windowEnd,
          scanned: subscriptions.length,
          sent,
          skipped,
          duplicate,
          failed,
        },
        "Billing reminder run completed.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function completePaymentOrderManually(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUser = requireAuthUser(req);
    const orderId = req.params.orderId?.trim().toUpperCase();
    const manualCompletionNote = normalizeManualCompletionNote(
      req.body?.manualCompletionNote ?? req.body?.adminNote ?? req.body?.note,
    );
    const order = await PaymentOrderModel.findOne({ orderId });

    if (!order) {
      throw new ApiError(404, "Payment order not found.", undefined, "payment_order_not_found");
    }

    if (order.status === "completed") {
      res.status(200).json(
        successResponse(
          {
            orderId: order.orderId,
            status: order.status,
            completedAt: order.completedAt?.toISOString() ?? null,
            manualCompletedBy: order.manualCompletedBy ?? null,
            manualCompletedAt: order.manualCompletedAt?.toISOString() ?? null,
            manualCompletionNote: order.manualCompletionNote ?? null,
            eventStatus: "already_completed",
          },
          "Payment order is already completed.",
        ),
      );
      return;
    }

    if (order.status !== "pending" && order.status !== "expired" && order.status !== "failed") {
      throw new ApiError(409, "Payment order cannot be manually completed.", undefined, "invalid_payment_order_status");
    }
    if (order.purpose === "physical_order") {
      throw new ApiError(
        400,
        "Không thể mở Plus thủ công cho đơn hàng vật lý. Đơn này chỉ dành cho sản phẩm giao hàng.",
        undefined,
        "physical_order_not_claimable",
      );
    }


    const now = new Date();
    const currentPeriodEnd = new Date(now.getTime() + TWELVE_WEEKS_MS);
    const eventPayloadHash = hashEmailPayload(
      JSON.stringify({
        orderId: order.orderId,
        userId: order.userId,
        amount: order.amount,
        status: "manual_completed",
        note: manualCompletionNote,
      }),
    );

    const result = await billingService.upsertSubscriptionFromProviderEvent({
      provider: "manual",
      providerEventId: `manual_payment_${order.orderId}`,
      eventType: "manual_checkout_completed",
      payloadHash: eventPayloadHash,
      userId: order.userId,
      planCode: "PLUS",
      status: "active",
      billingCycle: "twelve_week",
      currentPeriodStart: now,
      currentPeriodEnd,
      providerSubscriptionId: order.orderId,
    });

    order.status = "completed";
    order.completedAt = now;
    order.cassoTransactionId = order.cassoTransactionId ?? `manual_${now.getTime()}`;
    order.manualCompletedBy = adminUser.uid;
    order.manualCompletedAt = now;
    if (manualCompletionNote !== undefined) {
      order.manualCompletionNote = manualCompletionNote;
    }
    await order.save();

    res.status(200).json(
      successResponse(
        {
          orderId: order.orderId,
          status: order.status,
          completedAt: order.completedAt?.toISOString() ?? null,
          manualCompletedBy: order.manualCompletedBy ?? null,
          manualCompletedAt: order.manualCompletedAt?.toISOString() ?? null,
          manualCompletionNote: order.manualCompletionNote ?? null,
          subscriptionId: result.subscription.id,
          eventStatus: result.eventStatus,
        },
        "Payment order completed manually.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

// ─── User Management ─────────────────────────────────────────────────────────

const DEFAULT_USER_LIMIT = 20;
const MAX_USER_LIMIT = 100;
const MAX_USER_SEARCH_LENGTH = 120;

function parseUserLimit(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value.trim()) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_USER_LIMIT;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_USER_LIMIT);
}

function parseUserPage(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value.trim()) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(Math.floor(parsed), 1);
}

function normalizeUserSearch(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_USER_SEARCH_LENGTH);
}

function normalizeUserRoleFilter(value: unknown): UserRole | "all" {
  if (typeof value !== "string") return "all";
  const normalized = value.trim().toLowerCase();
  if (normalized === "admin" || normalized === "user") return normalized;
  return "all";
}

export async function getAdminUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = normalizeUserSearch(req.query.q ?? req.query.query ?? req.query.search);
    const role = normalizeUserRoleFilter(req.query.role);
    const limit = parseUserLimit(req.query.limit);
    const page = parseUserPage(req.query.page);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<typeof UserModel> = {};

    if (role !== "all") {
      filter.role = role;
    }

    if (query) {
      const escapedSearch = escapeRegex(query);
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { firebaseUid: searchRegex },
        { email: searchRegex },
        { displayName: searchRegex },
      ];
    }

    const [total, users] = await Promise.all([
      UserModel.countDocuments(filter),
      UserModel.find(filter)
        .select("firebaseUid email displayName role onboardingCompletedAt locale createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Array<LeanUserSummary & { onboardingCompletedAt?: Date | null; locale?: string; updatedAt?: Date }>>(),
    ]);

    const userIds = users.map((user) => user.firebaseUid);
    const subscriptions = userIds.length
      ? await BillingSubscriptionModel.find({ userId: { $in: userIds } })
          .select("userId planCode status provider billingCycle currentPeriodEnd createdAt")
          .sort({ createdAt: -1 })
          .lean<LeanSubscriptionSummary[]>()
      : [];
    const subscriptionByUserId = new Map<string, LeanSubscriptionSummary>();
    for (const subscription of subscriptions) {
      if (!subscriptionByUserId.has(subscription.userId)) {
        subscriptionByUserId.set(subscription.userId, subscription);
      }
    }

    // Count goals per user
    const GoalModel = (await import("../models/GoalModel")).GoalModel;
    const goalCounts = userIds.length
      ? await GoalModel.aggregate<{ _id: string; count: number }>([
          { $match: { userId: { $in: userIds }, deletedAt: null } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ])
      : [];
    const goalCountByUserId = new Map(goalCounts.map((g) => [g._id, g.count]));

    res.status(200).json(
      successResponse(
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          items: users.map((user) => ({
            firebaseUid: user.firebaseUid,
            email: user.email,
            displayName: user.displayName ?? "",
            role: user.role,
            onboardingCompletedAt: (user as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt ?? null,
            locale: (user as { locale?: string }).locale ?? "vi",
            createdAt: user.createdAt,
            updatedAt: (user as { updatedAt?: Date }).updatedAt ?? null,
          subscription: serializeSubscription(subscriptionByUserId.get(user.firebaseUid) ?? undefined),
          goalCount: goalCountByUserId.get(user.firebaseUid) ?? 0,
          })),
        },
        "Admin users loaded.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getAdminUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = req.params.uid?.trim();
    if (!uid) {
      throw new ApiError(400, "User uid is required.", undefined, "missing_uid");
    }

    const [user, subscription] = await Promise.all([
      UserModel.findOne({ firebaseUid: uid })
        .lean<LeanUserSummary & { onboardingCompletedAt?: Date | null; locale?: string; termsAcceptedAt?: Date | null; avatarUrl?: string | null; updatedAt?: Date }>(),
      BillingSubscriptionModel.findOne({ userId: uid })
        .sort({ createdAt: -1 })
        .lean<LeanSubscriptionSummary>(),
    ]);

    if (!user) {
      throw new ApiError(404, "User not found.", undefined, "user_not_found");
    }

    // Get goals
    const GoalModel = (await import("../models/GoalModel")).GoalModel;
    const goals = await GoalModel.find({ userId: uid, deletedAt: null })
      .select("title category description deadline status focusArea readinessScore createdAt")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get payment orders
    const paymentOrders = await PaymentOrderModel.find({ userId: uid })
      .select("orderId planCode billingCycle amount currency status provider createdAt completedAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get physical orders
    const physicalOrders = await OrderModel.find({ userId: uid })
      .select("status totalVnd fullName email phone createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json(
      successResponse(
        {
          user: {
            firebaseUid: user.firebaseUid,
            email: user.email,
            displayName: user.displayName ?? "",
            role: user.role,
            onboardingCompletedAt: user.onboardingCompletedAt ?? null,
            termsAcceptedAt: user.termsAcceptedAt ?? null,
            avatarUrl: user.avatarUrl ?? null,
            locale: user.locale ?? "vi",
            createdAt: user.createdAt,
            updatedAt: user.updatedAt ?? null,
          },
          subscription: serializeSubscription(subscription ?? undefined),
          goals: goals.map((g) => ({
            id: String(g._id),
            title: g.title,
            category: g.category,
            description: g.description,
            deadline: g.deadline,
            status: g.status,
            focusArea: g.focusArea,
            readinessScore: g.readinessScore,
            createdAt: g.createdAt,
          })),
          paymentOrders: paymentOrders.map((po) => ({
            orderId: po.orderId,
            planCode: po.planCode,
            billingCycle: po.billingCycle,
            amount: po.amount,
            currency: po.currency,
            status: po.status,
            provider: po.provider,
            createdAt: po.createdAt,
            completedAt: po.completedAt,
          })),
          physicalOrders: physicalOrders.map((o) => ({
            id: String(o._id),
            status: o.status,
            totalVnd: o.totalVnd,
            fullName: o.fullName,
            createdAt: o.createdAt,
          })),
        },
        "Admin user detail loaded.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function updateAdminUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = req.params.uid?.trim();
    if (!uid) {
      throw new ApiError(400, "User uid is required.", undefined, "missing_uid");
    }

    const newRole = req.body?.role;
    if (newRole !== "user" && newRole !== "admin") {
      throw new ApiError(400, "Role must be 'user' or 'admin'.", undefined, "invalid_role");
    }

    const user = await UserModel.findOne({ firebaseUid: uid });
    if (!user) {
      throw new ApiError(404, "User not found.", undefined, "user_not_found");
    }

    // Prevent self-demotion
    const adminUser = requireAuthUser(req);
    if (adminUser.uid === uid && newRole !== "admin") {
      throw new ApiError(400, "Cannot remove your own admin role.", undefined, "self_demotion");
    }

    user.role = newRole;
    await user.save();
    clearAdminRoleCache(uid);

    res.status(200).json(
      successResponse(
        {
          firebaseUid: user.firebaseUid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
        `User role updated to ${newRole}.`,
      ),
    );
  } catch (error) {
    next(error);
  }
}

// ─── Manual Subscription Management ──────────────────────────────────────────

const VALID_PLAN_CODES = new Set(["PLUS", "FREE"]);
const TWELVE_WEEKS_MS_SUB = 12 * 7 * 24 * 60 * 60 * 1000;

function normalizePlanCode(value: unknown): string {
  if (typeof value !== "string") {
    throw new ApiError(400, "planCode must be a string.", undefined, "invalid_payload");
  }
  const normalized = value.trim().toUpperCase();
  if (!VALID_PLAN_CODES.has(normalized)) {
    throw new ApiError(400, 'planCode must be "PLUS" or "FREE".', undefined, "invalid_plan_code");
  }
  return normalized;
}

function normalizeBillingCycle(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "twelve_week" || normalized === "monthly" || normalized === "yearly") {
    return normalized;
  }
  return undefined;
}

export async function updateAdminUserSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uid = req.params.uid?.trim();
    if (!uid) {
      throw new ApiError(400, "User uid is required.", undefined, "missing_uid");
    }

    const planCode = normalizePlanCode(req.body?.planCode);
    const billingCycle = normalizeBillingCycle(req.body?.billingCycle) ?? "twelve_week";

    const user = await UserModel.findOne({ firebaseUid: uid });
    if (!user) {
      throw new ApiError(404, "User not found.", undefined, "user_not_found");
    }

    const adminUser = requireAuthUser(req);

    if (planCode === "PLUS") {
      // Upsert a PLUS subscription via the billing service (manual provider)
      const now = new Date();
      const currentPeriodEnd = new Date(now.getTime() + TWELVE_WEEKS_MS_SUB);
      const providerEventId = `manual_admin_${uid}_${now.getTime()}`;
      const payloadHash = hashEmailPayload(
        JSON.stringify({ userId: uid, planCode: "PLUS", billingCycle, adminUid: adminUser.uid }),
      );

      await billingService.upsertSubscriptionFromProviderEvent({
        provider: "manual",
        providerEventId,
        eventType: "manual_admin_upgrade",
        payloadHash,
        userId: uid,
        planCode: "PLUS",
        status: "active",
        billingCycle: billingCycle as "twelve_week" | "monthly" | "yearly",
        currentPeriodStart: now,
        currentPeriodEnd,
        providerSubscriptionId: providerEventId,
      });
    } else {
      // FREE: cancel any existing active subscription
      const existingSub = await BillingSubscriptionModel.findOne({
        userId: uid,
        status: { $in: ["active", "trialing"] },
      }).sort({ createdAt: -1 });

      if (existingSub) {
        existingSub.status = "canceled";
        existingSub.currentPeriodEnd = new Date();
        existingSub.canceledAt = new Date();
        await existingSub.save();
      }
    }

    // Return updated user detail (same shape as getAdminUserDetail)
    const [updatedUser, subscription, goals, paymentOrders, physicalOrders] = await Promise.all([
      UserModel.findOne({ firebaseUid: uid }).lean(),
      BillingSubscriptionModel.findOne({ userId: uid }).sort({ createdAt: -1 }).lean(),
      (await import("../models/GoalModel")).GoalModel.find({ userId: uid, deletedAt: null })
        .select("title category description deadline status focusArea readinessScore createdAt")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      PaymentOrderModel.find({ userId: uid })
        .select("orderId planCode billingCycle amount currency status provider createdAt completedAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      OrderModel.find({ userId: uid })
        .select("status totalVnd fullName email phone createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    if (!updatedUser) {
      throw new ApiError(404, "User not found after update.", undefined, "user_not_found");
    }

    res.status(200).json(
      successResponse(
        {
          user: {
            firebaseUid: updatedUser.firebaseUid,
            email: updatedUser.email,
            displayName: updatedUser.displayName ?? "",
            role: updatedUser.role,
            onboardingCompletedAt: (updatedUser as Record<string, unknown>).onboardingCompletedAt ?? null,
            termsAcceptedAt: (updatedUser as Record<string, unknown>).termsAcceptedAt ?? null,
            avatarUrl: (updatedUser as Record<string, unknown>).avatarUrl ?? null,
            locale: (updatedUser as Record<string, unknown>).locale ?? "vi",
            createdAt: updatedUser.createdAt,
            updatedAt: (updatedUser as Record<string, unknown>).updatedAt ?? null,
          },
          subscription: serializeSubscription(
            subscription
              ? {
                  ...subscription,
                  billingCycle: subscription.billingCycle ?? undefined,
                  currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
                } as LeanSubscriptionSummary
              : undefined,
          ),
          goals: (goals as Array<Record<string, unknown>>).map((g) => ({
            id: String(g._id),
            title: g.title,
            category: g.category,
            description: g.description,
            deadline: g.deadline,
            status: g.status,
            focusArea: g.focusArea,
            readinessScore: g.readinessScore,
            createdAt: g.createdAt,
          })),
          paymentOrders: (paymentOrders as Array<Record<string, unknown>>).map((po) => ({
            orderId: po.orderId,
            planCode: po.planCode,
            billingCycle: po.billingCycle,
            amount: po.amount,
            currency: po.currency,
            status: po.status,
            provider: po.provider,
            createdAt: po.createdAt,
            completedAt: po.completedAt,
          })),
          physicalOrders: (physicalOrders as Array<Record<string, unknown>>).map((o) => ({
            id: String(o._id),
            status: o.status,
            totalVnd: o.totalVnd,
            fullName: o.fullName,
            createdAt: o.createdAt,
          })),
        },
        planCode === "PLUS"
          ? "User upgraded to PLUS."
          : "User subscription cancelled (FREE).",
      ),
    );
  } catch (error) {
    next(error);
  }
}

// ─── Subscription List ──────────────────────────────────────────────────────

export async function getAdminSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const planCode = req.query.planCode as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: FilterQuery<any> = {};
    if (status && status !== "all") filter.status = status;
    if (planCode && planCode !== "all") filter.planCode = planCode;

    const [total, subscriptions] = await Promise.all([
      BillingSubscriptionModel.countDocuments(filter),
      BillingSubscriptionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const userIds = [...new Set(subscriptions.map((s) => s.userId))];
    const users = userIds.length
      ? await UserModel.find({ firebaseUid: { $in: userIds } })
          .select("firebaseUid email displayName")
          .lean()
      : [];
    const userByUid = new Map(users.map((u) => [u.firebaseUid, u]));

    res.status(200).json(
      successResponse({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        items: subscriptions.map((sub) => ({
          id: (sub as Record<string, unknown>)._id as string,
          userId: sub.userId,
          userEmail: userByUid.get(sub.userId)?.email ?? sub.userId,
          userDisplayName: userByUid.get(sub.userId)?.displayName ?? "",
          planCode: sub.planCode,
          status: sub.status,
          provider: sub.provider,
          billingCycle: sub.billingCycle ?? null,
          currentPeriodStart: sub.currentPeriodStart ?? null,
          currentPeriodEnd: sub.currentPeriodEnd ?? null,
          canceledAt: sub.canceledAt ?? null,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        })),
      }, "Admin subscriptions loaded."),
    );
  } catch (error) {
    next(error);
  }
}

// ─── Email Events List ──────────────────────────────────────────────────────

export async function getAdminEmailEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    const filter: FilterQuery<typeof BillingEventModel> = {
      eventType: "billing_expiration_reminder",
    };

    const [total, events] = await Promise.all([
      BillingEventModel.countDocuments(filter),
      BillingEventModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const userIds = [...new Set(events.map((e) => e.userId).filter(Boolean))];
    const users = userIds.length
      ? await UserModel.find({ firebaseUid: { $in: userIds } })
          .select("firebaseUid email displayName")
          .lean()
      : [];
    const userByUid = new Map(users.map((u) => [u.firebaseUid, u]));

    res.status(200).json(
      successResponse({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        items: events.map((evt) => {
          const uid = String(evt.userId ?? "");
          return {
            id: (evt as Record<string, unknown>)._id as string,
            userId: uid,
            userEmail: userByUid.get(uid)?.email ?? uid,
            userDisplayName: userByUid.get(uid)?.displayName ?? "",
            status: evt.status,
            providerEventId: evt.providerEventId,
            processedAt: evt.processedAt ?? null,
            error: evt.error ?? null,
            createdAt: evt.createdAt,
          };
        }),
      }, "Admin email events loaded."),
    );
  } catch (error) {
    next(error);
  }
}
