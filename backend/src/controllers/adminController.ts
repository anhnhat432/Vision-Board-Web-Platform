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
import { ApiError } from "../utils/apiError";
import { getLastPaymentReconciliationRun } from "../jobs/reconciliationJob";
import { successResponse } from "../utils/apiResponse";

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

function serializePaymentOrder(order: LeanPaymentOrderSummary, userById: Map<string, LeanUserSummary>) {
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
          "orderId userId planCode billingCycle amount currency status provider bankAccount bankName accountName description cassoTransactionId manualCompletedBy manualCompletedAt manualCompletionNote createdAt completedAt expiresAt updatedAt",
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
          "orderId userId planCode billingCycle amount currency status provider bankAccount bankName accountName description cassoTransactionId manualCompletedBy manualCompletedAt manualCompletionNote createdAt completedAt expiresAt updatedAt",
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
