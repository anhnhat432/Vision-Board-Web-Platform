import type { Request, Response, NextFunction } from "express";

import { adminAuth } from "../config/firebase";
import { requireAuthUser } from "./controllerHelpers";
import { BillingEventModel } from "../models/BillingEventModel";
import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { GoalModel } from "../models/GoalModel";
import { LeadMetricModel } from "../models/LeadMetricModel";
import { OrderModel } from "../models/OrderModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { PlanModel } from "../models/PlanModel";
import { SyncMutationLogModel } from "../models/SyncMutationLogModel";
import { TaskModel } from "../models/TaskModel";
import { UserModel } from "../models/UserModel";
import { VisionBoardModel } from "../models/VisionBoardModel";
import { WeekModel } from "../models/WeekModel";
import { WeekReviewModel } from "../models/WeekReviewModel";
import { successResponse } from "../utils/apiResponse";

interface AccountDeleteCounts {
  billingEvents: number;
  billingSubscriptions: number;
  dailyCheckIns: number;
  goals: number;
  leadMetrics: number;
  orders: number;
  paymentOrders: number;
  plans: number;
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
  dailyCheckIns: number;
  goals: number;
  leadMetrics: number;
  orders: number;
  paymentOrders: number;
  plans: number;
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

async function deleteUserCollections(userId: string): Promise<AccountDeleteCounts> {
  const plans = await PlanModel.find({ userId }).select("_id").lean();
  const planIds = plans.map((plan) => plan._id);
  const weeks = planIds.length > 0 ? await WeekModel.find({ planId: { $in: planIds } }).select("_id").lean() : [];
  const weekIds = weeks.map((week) => week._id);

  const [
    billingEvents,
    billingSubscriptions,
    dailyCheckIns,
    goals,
    leadMetrics,
    orders,
    paymentOrders,
    syncMutationLogs,
    tasks,
    visionBoards,
    weeklyReviews,
    weeksDeleted,
    plansDeleted,
    users,
  ] = await Promise.all([
    BillingEventModel.deleteMany({ userId }),
    BillingSubscriptionModel.deleteMany({ userId }),
    DailyCheckInModel.deleteMany({ userId }),
    GoalModel.deleteMany({ userId }),
    LeadMetricModel.deleteMany({
      $or: [{ userId }, ...(weekIds.length > 0 ? [{ weekId: { $in: weekIds } }] : [])],
    }),
    OrderModel.deleteMany({ userId }),
    PaymentOrderModel.deleteMany({ userId }),
    SyncMutationLogModel.deleteMany({ userId }),
    weekIds.length > 0 ? TaskModel.deleteMany({ weekId: { $in: weekIds } }) : Promise.resolve({ deletedCount: 0 }),
    VisionBoardModel.deleteMany({ userId }),
    WeekReviewModel.deleteMany({
      $or: [
        { userId },
        ...(planIds.length > 0 ? [{ planId: { $in: planIds } }] : []),
        ...(weekIds.length > 0 ? [{ weekId: { $in: weekIds } }] : []),
      ],
    }),
    planIds.length > 0 ? WeekModel.deleteMany({ planId: { $in: planIds } }) : Promise.resolve({ deletedCount: 0 }),
    PlanModel.deleteMany({ userId }),
    UserModel.deleteOne({ firebaseUid: userId }),
  ]);

  return {
    billingEvents: deletedCount(billingEvents),
    billingSubscriptions: deletedCount(billingSubscriptions),
    dailyCheckIns: deletedCount(dailyCheckIns),
    goals: deletedCount(goals),
    leadMetrics: deletedCount(leadMetrics),
    orders: deletedCount(orders),
    paymentOrders: deletedCount(paymentOrders),
    plans: deletedCount(plansDeleted),
    syncMutationLogs: deletedCount(syncMutationLogs),
    tasks: deletedCount(tasks),
    users: deletedCount(users),
    visionBoards: deletedCount(visionBoards),
    weeks: deletedCount(weeksDeleted),
    weeklyReviews: deletedCount(weeklyReviews),
  };
}

async function deleteFirebaseAccount(uid: string): Promise<boolean> {
  try {
    await adminAuth.deleteUser(uid);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
      return true;
    }

    console.error(`[accountController] Failed to delete Firebase user ${uid}:`, error);
    return false;
  }
}

async function getUserAccountExport(userId: string) {
  const [profile, goals, plans, orders, paymentOrders, billingSubscriptions, billingEvents, syncMutationLogs, visionBoards] =
    await Promise.all([
      UserModel.findOne({ firebaseUid: userId }).select("-__v").lean(),
      GoalModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      PlanModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      OrderModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      PaymentOrderModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      BillingSubscriptionModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      BillingEventModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      SyncMutationLogModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
      VisionBoardModel.find({ userId }).select("-__v").sort({ createdAt: 1 }).lean(),
    ]);

  const planIds = plans.map((plan) => plan._id);
  const weeks = planIds.length > 0
    ? await WeekModel.find({ planId: { $in: planIds } }).select("-__v").sort({ weekNumber: 1 }).lean()
    : [];
  const weekIds = weeks.map((week) => week._id);

  const [tasks, leadMetrics, dailyCheckIns, weeklyReviews] = await Promise.all([
    weekIds.length > 0 ? TaskModel.find({ weekId: { $in: weekIds } }).select("-__v").sort({ createdAt: 1 }).lean() : [],
    LeadMetricModel.find({
      $or: [{ userId }, ...(weekIds.length > 0 ? [{ weekId: { $in: weekIds } }] : [])],
    }).select("-__v").sort({ createdAt: 1 }).lean(),
    DailyCheckInModel.find({ userId }).select("-__v").sort({ localDate: 1 }).lean(),
    WeekReviewModel.find({
      $or: [
        { userId },
        ...(planIds.length > 0 ? [{ planId: { $in: planIds } }] : []),
        ...(weekIds.length > 0 ? [{ weekId: { $in: weekIds } }] : []),
      ],
    }).select("-__v").sort({ createdAt: 1 }).lean(),
  ]);

  const counts: AccountExportCounts = {
    billingEvents: billingEvents.length,
    billingSubscriptions: billingSubscriptions.length,
    dailyCheckIns: dailyCheckIns.length,
    goals: goals.length,
    leadMetrics: leadMetrics.length,
    orders: orders.length,
    paymentOrders: paymentOrders.length,
    plans: plans.length,
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
      paymentOrders,
      billingSubscriptions,
      billingEvents,
      syncMutationLogs,
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
    const firebaseAccountDeleted = await deleteFirebaseAccount(user.uid);

    res.status(200).json(
      successResponse(
        {
          deleted: true,
          deletedAt,
          counts,
          firebaseAccountDeleted,
        },
        firebaseAccountDeleted
          ? "Account and all associated data have been deleted."
          : "Account data was deleted, but Firebase account removal needs manual retry.",
      ),
    );
  } catch (error) {
    next(error);
  }
}
