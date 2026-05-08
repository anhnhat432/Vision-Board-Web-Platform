import type { Request, Response, NextFunction } from "express";

import { BillingEventModel } from "../models/BillingEventModel";
import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { OrderModel } from "../models/OrderModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import {
  getEmailRuntimeStatus,
  hashEmailPayload,
  sendBillingExpirationReminderEmail,
} from "../services/emailNotificationService";
import { successResponse } from "../utils/apiResponse";

const DEFAULT_EXPIRING_REMINDER_DAYS = 7;
const MAX_EXPIRING_REMINDER_DAYS = 30;
const MAX_REMINDERS_PER_RUN = 100;

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
  createdAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
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

function serializeSubscription(subscription: LeanSubscriptionSummary | undefined) {
  if (!subscription) return null;
  return {
    planCode: subscription.planCode,
    status: subscription.status,
    provider: subscription.provider,
    billingCycle: subscription.billingCycle,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
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
      BillingSubscriptionModel.countDocuments({ planCode: "PLUS", status: "active" }),
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
        .select("orderId userId planCode billingCycle amount currency status provider createdAt completedAt expiresAt")
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
          recentPayments,
        },
        "Admin overview loaded.",
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
