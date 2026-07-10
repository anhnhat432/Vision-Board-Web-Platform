import type { Request, Response, NextFunction } from "express";

import { adminAuth } from "../config/firebase";
import { requireAuthUser } from "./controllerHelpers";
import { BillingEventModel } from "../models/BillingEventModel";
import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { CouponUsageModel } from "../models/CouponUsageModel";
import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { FailedReceiptQueueModel } from "../models/FailedReceiptQueueModel";
import { GoalModel } from "../models/GoalModel";
import { GoalProgressModel } from "../models/GoalProgressModel";
import { LeadMetricModel } from "../models/LeadMetricModel";
import { OrderModel } from "../models/OrderModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { PlanModel } from "../models/PlanModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { SyncMutationLogModel } from "../models/SyncMutationLogModel";
import { TaskModel } from "../models/TaskModel";
import { UserModel } from "../models/UserModel";
import { VisionBoardModel } from "../models/VisionBoardModel";
import { WeekModel } from "../models/WeekModel";
import { WeekReviewModel } from "../models/WeekReviewModel";
import { successResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { withoutTombstones } from "../utils/tombstone";

interface AccountDeleteCounts {
  billingEvents: number;
  billingSubscriptions: number;
  couponUsages: number;
  dailyCheckIns: number;
  failedReceiptQueue: number;
  goals: number;
  goalProgress: number;
  leadMetrics: number;
  orders: number;
  paymentOrders: number;
  plans: number;
  refundRequests: number;
  syncMutationLogs: number;
  tasks: number;
  users: number;
  visionBoards: number;
  weeks: number;
  weeklyReviews: number;
}

interface AccountExportCounts {
  billingEvents: number;
  billingSubscriptions: number;
  couponUsages: number;
  dailyCheckIns: number;
  failedReceiptQueue: number;
  goals: number;
  goalProgress: number;
  leadMetrics: number;
  orders: number;
  paymentOrders: number;
  plans: number;
  refundRequests: number;
  syncMutationLogs: number;
  tasks: number;
  users: number;
  visionBoards: number;
  weeks: number;
  weeklyReviews: number;
}

function deletedCount(result: { deletedCount?: number }): number {
  return result.deletedCount ?? 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function copySafeString(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
): void {
  if (typeof source[key] === "string") target[key] = source[key];
}

function serializePayosPayerForAccountExport(value: unknown): Record<string, unknown> | null {
  const payer = asRecord(value);
  if (!payer) return null;

  const safePayer: Record<string, unknown> = {};
  copySafeString(payer, safePayer, "classification");
  copySafeString(payer, safePayer, "accountLast4");
  copySafeString(payer, safePayer, "accountMasked");
  copySafeString(payer, safePayer, "accountNameMasked");
  copySafeString(payer, safePayer, "bankName");
  copySafeString(payer, safePayer, "transactionReference");
  copySafeString(payer, safePayer, "transactionDateTime");
  copySafeString(payer, safePayer, "source");
  if (payer.observedAt instanceof Date || typeof payer.observedAt === "string") {
    safePayer.observedAt = payer.observedAt;
  }

  return Object.keys(safePayer).length > 0 ? safePayer : null;
}

function serializePayosMetadataForAccountExport(value: unknown): Record<string, unknown> | null {
  const payos = asRecord(value);
  if (!payos) return null;

  const safePayos: Record<string, unknown> = {};
  if (typeof payos.orderCode === "number" && Number.isFinite(payos.orderCode)) {
    safePayos.orderCode = payos.orderCode;
  }
  copySafeString(payos, safePayos, "paymentLinkId");
  copySafeString(payos, safePayos, "status");
  copySafeString(payos, safePayos, "webhookReference");
  copySafeString(payos, safePayos, "webhookCode");
  copySafeString(payos, safePayos, "transactionDateTime");

  const payer = serializePayosPayerForAccountExport(payos.payer);
  if (payer) safePayos.payer = payer;

  return Object.keys(safePayos).length > 0 ? safePayos : null;
}

function serializePaymentOrderForAccountExport<T extends { metadata?: unknown }>(paymentOrder: T): T {
  const metadata = asRecord(paymentOrder.metadata);
  if (!metadata) return paymentOrder;

  const { payos: _, ...otherMetadata } = metadata;
  const safePayos = serializePayosMetadataForAccountExport(metadata.payos);
  const safeMetadata = safePayos ? { ...otherMetadata, payos: safePayos } : otherMetadata;

  return {
    ...paymentOrder,
    metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : undefined,
  } as T;
}

async function deleteUserCollections(userId: string): Promise<AccountDeleteCounts> {
  const plans = await PlanModel.find({ userId }).select("_id").lean();
  const planIds = plans.map((plan) => plan._id);
  const weeks = planIds.length > 0 ? await WeekModel.find({ planId: { $in: planIds } }).select("_id").lean() : [];
  const weekIds = weeks.map((week) => week._id);
  const paymentOrdersForUser = await PaymentOrderModel.find({ userId }).select("orderId").lean();
  const paymentOrderIds = paymentOrdersForUser
    .map((order) => (typeof order.orderId === "string" ? order.orderId.trim() : ""))
    .filter(Boolean);

  const billingEvents = await BillingEventModel.deleteMany({ userId });
  const billingSubscriptions = await BillingSubscriptionModel.deleteMany({ userId });
  const couponUsages = await CouponUsageModel.deleteMany({ userId });
  const dailyCheckIns = await DailyCheckInModel.deleteMany({ userId });
  const goalProgress = planIds.length > 0
    ? await GoalProgressModel.deleteMany({ planId: { $in: planIds } })
    : { deletedCount: 0 };
  const goals = await GoalModel.deleteMany({ userId });
  const leadMetrics = await LeadMetricModel.deleteMany({
    $or: [{ userId }, ...(weekIds.length > 0 ? [{ weekId: { $in: weekIds } }] : [])],
  });
  const refundRequests = await RefundRequestModel.deleteMany({ userId });
  const syncMutationLogs = await SyncMutationLogModel.deleteMany({ userId });
  const tasks = weekIds.length > 0 ? await TaskModel.deleteMany({ weekId: { $in: weekIds } }) : { deletedCount: 0 };
  const visionBoards = await VisionBoardModel.deleteMany({ userId });
  const weeklyReviews = await WeekReviewModel.deleteMany({
    $or: [
      { userId },
      ...(planIds.length > 0 ? [{ planId: { $in: planIds } }] : []),
      ...(weekIds.length > 0 ? [{ weekId: { $in: weekIds } }] : []),
    ],
  });
  const failedReceiptQueue = paymentOrderIds.length > 0
    ? await FailedReceiptQueueModel.deleteMany({ orderId: { $in: paymentOrderIds } })
    : { deletedCount: 0 };
  const orders = await OrderModel.deleteMany({ userId });
  const paymentOrders = await PaymentOrderModel.deleteMany({ userId });
  const weeksDeleted = planIds.length > 0 ? await WeekModel.deleteMany({ planId: { $in: planIds } }) : { deletedCount: 0 };
  const plansDeleted = await PlanModel.deleteMany({ userId });
  const users = await UserModel.deleteOne({ firebaseUid: userId });

  return {
    billingEvents: deletedCount(billingEvents),
    billingSubscriptions: deletedCount(billingSubscriptions),
    couponUsages: deletedCount(couponUsages),
    dailyCheckIns: deletedCount(dailyCheckIns),
    failedReceiptQueue: deletedCount(failedReceiptQueue),
    goals: deletedCount(goals),
    goalProgress: deletedCount(goalProgress),
    leadMetrics: deletedCount(leadMetrics),
    orders: deletedCount(orders),
    paymentOrders: deletedCount(paymentOrders),
    plans: deletedCount(plansDeleted),
    refundRequests: deletedCount(refundRequests),
    syncMutationLogs: deletedCount(syncMutationLogs),
    tasks: deletedCount(tasks),
    users: deletedCount(users),
    visionBoards: deletedCount(visionBoards),
    weeks: deletedCount(weeksDeleted),
    weeklyReviews: deletedCount(weeklyReviews),
  };
}

async function deleteFirebaseAccount(uid: string): Promise<void> {
  try {
    await adminAuth.deleteUser(uid);
    return;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
      return;
    }

    console.error("[accountController] Failed to delete Firebase user during account deletion:", error);
    throw new ApiError(
      502,
      "Account app data was deleted, but Firebase account removal failed. The client must clear local data to prevent re-syncing deleted data.",
      undefined,
      "firebase_account_delete_failed",
    );
  }
}

async function getUserAccountExport(userId: string) {
  const [
    profile,
    goals,
    plans,
    orders,
    paymentOrders,
    billingSubscriptions,
    billingEvents,
    couponUsages,
    refundRequests,
    syncMutationLogs,
    visionBoards,
  ] =
    await Promise.all([
      UserModel.findOne({ firebaseUid: userId }).select("-__v").lean(),
      GoalModel.find(withoutTombstones({ userId })).select("-__v").sort({ createdAt: 1 }).lean(),
      PlanModel.find(withoutTombstones({ userId })).select("-__v").sort({ createdAt: 1 }).lean(),
      OrderModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      PaymentOrderModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      BillingSubscriptionModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      BillingEventModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      CouponUsageModel.find({ userId }).select("-__v").sort({ usedAt: 1 }).lean(),
      RefundRequestModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      SyncMutationLogModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      VisionBoardModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
    ]);

  const exportedPaymentOrders = paymentOrders.map(serializePaymentOrderForAccountExport);
  const planIds = plans.map((plan) => plan._id);
  const paymentOrderIds = paymentOrders
    .map((order) => (typeof order.orderId === "string" ? order.orderId.trim() : ""))
    .filter(Boolean);
  const weeks = planIds.length > 0
    ? await WeekModel.find(withoutTombstones({ planId: { $in: planIds } })).select("-__v").sort({ weekNumber: 1 }).lean()
    : [];
  const weekIds = weeks.map((week) => week._id);

  const [tasks, leadMetrics, dailyCheckIns, weeklyReviews, goalProgress, failedReceiptQueue] = await Promise.all([
    weekIds.length > 0 ? TaskModel.find(withoutTombstones({ weekId: { $in: weekIds } })).select("-__v").sort({ createdAt: 1 }).lean() : [],
    LeadMetricModel.find(withoutTombstones({
      $or: [{ userId }, ...(weekIds.length > 0 ? [{ weekId: { $in: weekIds } }] : [])],
    })).select("-__v").sort({ createdAt: 1 }).lean(),
    DailyCheckInModel.find(withoutTombstones({ userId })).select("-__v").sort({ localDate: 1 }).lean(),
    WeekReviewModel.find(withoutTombstones({
      $or: [
        { userId },
        ...(planIds.length > 0 ? [{ planId: { $in: planIds } }] : []),
        ...(weekIds.length > 0 ? [{ weekId: { $in: weekIds } }] : []),
      ],
    })).select("-__v").sort({ createdAt: 1 }).lean(),
    planIds.length > 0 ? GoalProgressModel.find({ planId: { $in: planIds } }).select("-__v").sort({ createdAt: 1 }).lean() : [],
    paymentOrderIds.length > 0
      ? FailedReceiptQueueModel.find({ orderId: { $in: paymentOrderIds } }).select("-__v").sort({ createdAt: 1 }).lean()
      : [],
  ]);

  const counts: AccountExportCounts = {
    billingEvents: billingEvents.length,
    billingSubscriptions: billingSubscriptions.length,
    couponUsages: couponUsages.length,
    dailyCheckIns: dailyCheckIns.length,
    failedReceiptQueue: failedReceiptQueue.length,
    goals: goals.length,
    goalProgress: goalProgress.length,
    leadMetrics: leadMetrics.length,
    orders: orders.length,
    paymentOrders: paymentOrders.length,
    plans: plans.length,
    refundRequests: refundRequests.length,
    syncMutationLogs: syncMutationLogs.length,
    tasks: tasks.length,
    users: profile ? 1 : 0,
    visionBoards: visionBoards.length,
    weeks: weeks.length,
    weeklyReviews: weeklyReviews.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    version: 1,
    userId,
    profile,
    data: {
      goals,
      plans,
      weeks,
      tasks,
      leadMetrics,
      dailyCheckIns,
      weeklyReviews,
      visionBoards,
      orders,
      paymentOrders: exportedPaymentOrders,
      billingSubscriptions,
      billingEvents,
      couponUsages,
      refundRequests,
      syncMutationLogs,
      goalProgress,
      failedReceiptQueue,
    },
    counts,
  };
}

export async function exportAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireAuthUser(req);
    const exported = await getUserAccountExport(user.uid);
    res.status(200).json(successResponse(exported, "Account export generated."));
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireAuthUser(req);
    const deletedAt = new Date().toISOString();
    const counts = await deleteUserCollections(user.uid);
    await deleteFirebaseAccount(user.uid);

    res.status(200).json(
      successResponse(
        {
          deleted: true,
          deletedAt,
          counts,
          firebaseAccountDeleted: true,
        },
        "Account and all associated data have been deleted.",
      ),
    );
  } catch (error) {
    next(error);
  }
}
