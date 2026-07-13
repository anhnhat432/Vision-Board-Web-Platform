import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { adminAuth } from "../config/firebase";
import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
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
import { accountRoutes } from "../routes/accountRoutes";

interface JsonResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    data?: Record<string, unknown> & {
      deleted?: boolean;
      firebaseAccountDeleted?: boolean;
      counts?: Record<string, number>;
    };
    errorCode?: string;
  };
}

type MockableModel = {
  find?: unknown;
  findOne?: unknown;
  deleteMany?: unknown;
  deleteOne?: unknown;
};

const ownerUserId = "user_owner";
const ownerPlanId = "plan_owner_1";
const ownerWeekId = "week_owner_1";
const ownerPaymentOrderId = "VBOWNER1";

const originals = {
  adminDeleteUser: adminAuth.deleteUser,
  billingEventFind: BillingEventModel.find,
  billingEventDeleteMany: BillingEventModel.deleteMany,
  billingSubscriptionFind: BillingSubscriptionModel.find,
  billingSubscriptionDeleteMany: BillingSubscriptionModel.deleteMany,
  couponUsageFind: CouponUsageModel.find,
  couponUsageDeleteMany: CouponUsageModel.deleteMany,
  dailyCheckInFind: DailyCheckInModel.find,
  dailyCheckInDeleteMany: DailyCheckInModel.deleteMany,
  failedReceiptQueueFind: FailedReceiptQueueModel.find,
  failedReceiptQueueDeleteMany: FailedReceiptQueueModel.deleteMany,
  goalFind: GoalModel.find,
  goalDeleteMany: GoalModel.deleteMany,
  goalProgressFind: GoalProgressModel.find,
  goalProgressDeleteMany: GoalProgressModel.deleteMany,
  leadMetricFind: LeadMetricModel.find,
  leadMetricDeleteMany: LeadMetricModel.deleteMany,
  orderFind: OrderModel.find,
  orderDeleteMany: OrderModel.deleteMany,
  paymentOrderFind: PaymentOrderModel.find,
  paymentOrderDeleteMany: PaymentOrderModel.deleteMany,
  planDeleteMany: PlanModel.deleteMany,
  planFind: PlanModel.find,
  refundRequestFind: RefundRequestModel.find,
  refundRequestDeleteMany: RefundRequestModel.deleteMany,
  syncMutationLogFind: SyncMutationLogModel.find,
  syncMutationLogDeleteMany: SyncMutationLogModel.deleteMany,
  taskFind: TaskModel.find,
  taskDeleteMany: TaskModel.deleteMany,
  userFindOne: UserModel.findOne,
  userDeleteOne: UserModel.deleteOne,
  visionBoardFind: VisionBoardModel.find,
  visionBoardDeleteMany: VisionBoardModel.deleteMany,
  weekDeleteMany: WeekModel.deleteMany,
  weekFind: WeekModel.find,
  weekReviewFind: WeekReviewModel.find,
  weekReviewDeleteMany: WeekReviewModel.deleteMany,
};

const deleteFilters: Record<string, unknown[]> = {};
const exportFilters: Record<string, unknown[]> = {};
const exportSelections: Record<string, string[]> = {};
let firebaseDeleteUid: string | null = null;
let firebaseDeleteBehavior: "success" | "not-found" | "failure" = "success";
let originalConsoleError: typeof console.error;

function queryResult<T>(result: T, selectionKey?: string) {
  let selectedResult = result;
  const chain = {
    select(projection: string) {
      if (selectionKey) exportSelections[selectionKey] = [...(exportSelections[selectionKey] ?? []), projection];
      if (projection.includes("-operationalClassification")) {
        selectedResult = structuredClone(result) as T;
        if (Array.isArray(selectedResult)) {
          for (const item of selectedResult) delete (item as Record<string, unknown>).operationalClassification;
        } else if (selectedResult && typeof selectedResult === "object") {
          delete (selectedResult as Record<string, unknown>).operationalClassification;
        }
      }
      return chain;
    },
    sort() {
      return chain;
    },
    async lean() {
      return selectedResult;
    },
  };

  return chain;
}

function mockDeleteMany(model: MockableModel, key: string, deletedCount: number): void {
  model.deleteMany = async (filter: unknown) => {
    deleteFilters[key] = [...(deleteFilters[key] ?? []), filter];
    return { deletedCount };
  };
}

function mockDeleteOne(model: MockableModel, key: string, deletedCount: number): void {
  model.deleteOne = async (filter: unknown) => {
    deleteFilters[key] = [...(deleteFilters[key] ?? []), filter];
    return { deletedCount };
  };
}

function mockDeleteManyFailure(model: MockableModel, key: string, message: string): void {
  model.deleteMany = async (filter: unknown) => {
    deleteFilters[key] = [...(deleteFilters[key] ?? []), filter];
    throw new Error(message);
  };
}

function mockFindMany<T>(model: MockableModel, key: string, items: T[]): void {
  model.find = (filter: unknown) => {
    exportFilters[key] = [...(exportFilters[key] ?? []), filter];
    return queryResult(items, key);
  };
}

function mockFindOne<T>(model: MockableModel, key: string, item: T): void {
  model.findOne = (filter: unknown) => {
    exportFilters[key] = [...(exportFilters[key] ?? []), filter];
    return queryResult(item, key);
  };
}

function restoreModels(): void {
  (adminAuth as unknown as { deleteUser: typeof adminAuth.deleteUser }).deleteUser = originals.adminDeleteUser;
  (BillingEventModel as unknown as MockableModel).find = originals.billingEventFind;
  (BillingEventModel as unknown as MockableModel).deleteMany = originals.billingEventDeleteMany;
  (BillingSubscriptionModel as unknown as MockableModel).find = originals.billingSubscriptionFind;
  (BillingSubscriptionModel as unknown as MockableModel).deleteMany = originals.billingSubscriptionDeleteMany;
  (CouponUsageModel as unknown as MockableModel).find = originals.couponUsageFind;
  (CouponUsageModel as unknown as MockableModel).deleteMany = originals.couponUsageDeleteMany;
  (DailyCheckInModel as unknown as MockableModel).find = originals.dailyCheckInFind;
  (DailyCheckInModel as unknown as MockableModel).deleteMany = originals.dailyCheckInDeleteMany;
  (FailedReceiptQueueModel as unknown as MockableModel).find = originals.failedReceiptQueueFind;
  (FailedReceiptQueueModel as unknown as MockableModel).deleteMany = originals.failedReceiptQueueDeleteMany;
  (GoalModel as unknown as MockableModel).find = originals.goalFind;
  (GoalModel as unknown as MockableModel).deleteMany = originals.goalDeleteMany;
  (GoalProgressModel as unknown as MockableModel).find = originals.goalProgressFind;
  (GoalProgressModel as unknown as MockableModel).deleteMany = originals.goalProgressDeleteMany;
  (LeadMetricModel as unknown as MockableModel).find = originals.leadMetricFind;
  (LeadMetricModel as unknown as MockableModel).deleteMany = originals.leadMetricDeleteMany;
  (OrderModel as unknown as MockableModel).find = originals.orderFind;
  (OrderModel as unknown as MockableModel).deleteMany = originals.orderDeleteMany;
  (PaymentOrderModel as unknown as MockableModel).find = originals.paymentOrderFind;
  (PaymentOrderModel as unknown as MockableModel).deleteMany = originals.paymentOrderDeleteMany;
  (PlanModel as unknown as MockableModel).deleteMany = originals.planDeleteMany;
  (PlanModel as unknown as MockableModel).find = originals.planFind;
  (RefundRequestModel as unknown as MockableModel).find = originals.refundRequestFind;
  (RefundRequestModel as unknown as MockableModel).deleteMany = originals.refundRequestDeleteMany;
  (SyncMutationLogModel as unknown as MockableModel).find = originals.syncMutationLogFind;
  (SyncMutationLogModel as unknown as MockableModel).deleteMany = originals.syncMutationLogDeleteMany;
  (TaskModel as unknown as MockableModel).find = originals.taskFind;
  (TaskModel as unknown as MockableModel).deleteMany = originals.taskDeleteMany;
  (UserModel as unknown as MockableModel).findOne = originals.userFindOne;
  (UserModel as unknown as MockableModel).deleteOne = originals.userDeleteOne;
  (VisionBoardModel as unknown as MockableModel).find = originals.visionBoardFind;
  (VisionBoardModel as unknown as MockableModel).deleteMany = originals.visionBoardDeleteMany;
  (WeekModel as unknown as MockableModel).deleteMany = originals.weekDeleteMany;
  (WeekModel as unknown as MockableModel).find = originals.weekFind;
  (WeekReviewModel as unknown as MockableModel).find = originals.weekReviewFind;
  (WeekReviewModel as unknown as MockableModel).deleteMany = originals.weekReviewDeleteMany;
}

function mockAccountDeletionModels(): void {
  (PlanModel as unknown as MockableModel).find = (filter: unknown) => {
    deleteFilters.planFind = [...(deleteFilters.planFind ?? []), filter];
    return queryResult([{ _id: ownerPlanId }]);
  };
  (WeekModel as unknown as MockableModel).find = (filter: unknown) => {
    deleteFilters.weekFind = [...(deleteFilters.weekFind ?? []), filter];
    return queryResult([{ _id: ownerWeekId }]);
  };
  (PaymentOrderModel as unknown as MockableModel).find = (filter: unknown) => {
    deleteFilters.paymentOrderFind = [...(deleteFilters.paymentOrderFind ?? []), filter];
    return queryResult([{ orderId: ownerPaymentOrderId }]);
  };

  mockDeleteMany(BillingEventModel as unknown as MockableModel, "billingEvents", 1);
  mockDeleteMany(BillingSubscriptionModel as unknown as MockableModel, "billingSubscriptions", 1);
  mockDeleteMany(CouponUsageModel as unknown as MockableModel, "couponUsages", 1);
  mockDeleteMany(DailyCheckInModel as unknown as MockableModel, "dailyCheckIns", 1);
  mockDeleteMany(FailedReceiptQueueModel as unknown as MockableModel, "failedReceiptQueue", 1);
  mockDeleteMany(GoalModel as unknown as MockableModel, "goals", 1);
  mockDeleteMany(GoalProgressModel as unknown as MockableModel, "goalProgress", 1);
  mockDeleteMany(LeadMetricModel as unknown as MockableModel, "leadMetrics", 2);
  mockDeleteMany(OrderModel as unknown as MockableModel, "orders", 1);
  mockDeleteMany(PaymentOrderModel as unknown as MockableModel, "paymentOrders", 1);
  mockDeleteMany(PlanModel as unknown as MockableModel, "plans", 1);
  mockDeleteMany(RefundRequestModel as unknown as MockableModel, "refundRequests", 1);
  mockDeleteMany(SyncMutationLogModel as unknown as MockableModel, "syncMutationLogs", 1);
  mockDeleteMany(TaskModel as unknown as MockableModel, "tasks", 2);
  mockDeleteOne(UserModel as unknown as MockableModel, "users", 1);
  mockDeleteMany(VisionBoardModel as unknown as MockableModel, "visionBoards", 1);
  mockDeleteMany(WeekModel as unknown as MockableModel, "weeks", 1);
  mockDeleteMany(WeekReviewModel as unknown as MockableModel, "weeklyReviews", 2);

  (adminAuth as unknown as { deleteUser(uid: string): Promise<void> }).deleteUser = async (uid: string) => {
    firebaseDeleteUid = uid;
    if (firebaseDeleteBehavior === "not-found") {
      throw { code: "auth/user-not-found" };
    }
    if (firebaseDeleteBehavior === "failure") {
      throw { code: "auth/internal-error" };
    }
  };
}

function mockAccountExportModels(): void {
  mockFindOne(UserModel as unknown as MockableModel, "users", {
    firebaseUid: ownerUserId,
    email: "owner@example.test",
    operationalClassification: { category: "test", classifiedBy: "admin_uid", note: "private profile note" },
  });
  mockFindMany(BillingEventModel as unknown as MockableModel, "billingEvents", [
    { _id: "billing_event_1", userId: ownerUserId },
  ]);
  mockFindMany(BillingSubscriptionModel as unknown as MockableModel, "billingSubscriptions", [
    { _id: "billing_subscription_1", userId: ownerUserId },
  ]);
  mockFindMany(CouponUsageModel as unknown as MockableModel, "couponUsages", [
    { _id: "coupon_usage_1", userId: ownerUserId, orderId: ownerPaymentOrderId },
  ]);
  mockFindMany(DailyCheckInModel as unknown as MockableModel, "dailyCheckIns", [
    { _id: "check_in_1", userId: ownerUserId },
  ]);
  mockFindMany(FailedReceiptQueueModel as unknown as MockableModel, "failedReceiptQueue", [
    { _id: "failed_receipt_1", orderId: ownerPaymentOrderId },
  ]);
  mockFindMany(GoalModel as unknown as MockableModel, "goals", [
    { _id: "goal_owner_1", userId: ownerUserId },
  ]);
  mockFindMany(GoalProgressModel as unknown as MockableModel, "goalProgress", [
    { _id: "goal_progress_1", planId: ownerPlanId },
  ]);
  mockFindMany(LeadMetricModel as unknown as MockableModel, "leadMetrics", [
    { _id: "metric_owner_1", userId: ownerUserId, weekId: ownerWeekId },
  ]);
  mockFindMany(OrderModel as unknown as MockableModel, "orders", [
    { _id: "order_owner_1", userId: ownerUserId, operationalClassification: { category: "test", classifiedBy: "admin_uid", note: "private order note" } },
  ]);
  mockFindMany(PaymentOrderModel as unknown as MockableModel, "paymentOrders", [
    {
      _id: "payment_order_owner_1",
      userId: ownerUserId,
      orderId: ownerPaymentOrderId,
      description: ownerPaymentOrderId,
      operationalClassification: { category: "test", classifiedBy: "admin_uid", note: "private payment note" },
      metadata: {
        payos: {
          orderCode: 123456,
          paymentLinkId: "payos_link_safe",
          status: "PAID",
          webhookReference: "TF_PAYOS_SAFE",
          webhookCode: "00",
          transactionDateTime: "2026-07-10 09:00:00",
          accountHash: "LEGACY_PAYOS_ACCOUNT_HASH_SENTINEL",
          accountNumber: "998877665544",
          webhookDescription: "LEGACY_RAW_PAYOS_WEBHOOK_TEXT_SENTINEL",
          payer: {
            classification: "internal",
            accountLast4: "5544",
            accountMasked: "9988****5544",
            accountNameMasked: "N*** V*** A***",
            bankName: "MB Bank",
            transactionReference: "TF_PAYOS_SAFE",
            transactionDateTime: "2026-07-10 09:00:00",
            source: "webhook",
            observedAt: new Date("2026-07-10T02:00:00.000Z"),
            accountHash: "LEGACY_NESTED_PAYOS_ACCOUNT_HASH_SENTINEL",
          },
        },
      },
    },
  ]);
  mockFindMany(PlanModel as unknown as MockableModel, "plans", [
    { _id: ownerPlanId, userId: ownerUserId },
  ]);
  mockFindMany(RefundRequestModel as unknown as MockableModel, "refundRequests", [
    { _id: "refund_request_1", userId: ownerUserId, orderId: ownerPaymentOrderId },
  ]);
  mockFindMany(SyncMutationLogModel as unknown as MockableModel, "syncMutationLogs", [
    { _id: "mutation_owner_1", userId: ownerUserId },
  ]);
  mockFindMany(TaskModel as unknown as MockableModel, "tasks", [
    { _id: "task_owner_1", weekId: ownerWeekId },
  ]);
  mockFindMany(VisionBoardModel as unknown as MockableModel, "visionBoards", [
    { _id: "vision_board_owner_1", userId: ownerUserId },
  ]);
  mockFindMany(WeekModel as unknown as MockableModel, "weeks", [
    { _id: ownerWeekId, planId: ownerPlanId },
  ]);
  mockFindMany(WeekReviewModel as unknown as MockableModel, "weeklyReviews", [
    { _id: "review_owner_1", userId: ownerUserId, weekId: ownerWeekId },
  ]);
}

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken() {
        return { uid: ownerUserId, email: "owner@example.test", email_verified: true };
      },
    }),
  );
  app.use("/api", accountRoutes);
  app.use(errorMiddleware);
  return app;
}

async function requestJson(
  app: Express,
  path: string,
  tokenOrOptions: string | null | { method?: string; token?: string | null } = "owner-token",
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });
  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = { accept: "application/json" };
  const options = typeof tokenOrOptions === "object" && tokenOrOptions !== null ? tokenOrOptions : { token: tokenOrOptions };
  const method = options.method ?? "DELETE";
  const token = "token" in options ? options.token : "owner-token";
  if (token !== null) headers.authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers,
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : {},
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

describe("GET /api/account/export", () => {
  beforeEach(() => {
    for (const key of Object.keys(exportFilters)) delete exportFilters[key];
    for (const key of Object.keys(exportSelections)) delete exportSelections[key];
    mockAccountExportModels();
  });

  afterEach(() => {
    restoreModels();
  });

  it("requires Firebase auth before account export", async () => {
    const response = await requestJson(createTestApp(), "/api/account/export", { method: "GET", token: null });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(exportFilters.users, undefined);
  });

  it("exports only the authenticated user's account-scoped data", async () => {
    const response = await requestJson(createTestApp(), "/api/account/export", { method: "GET" });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.version, 1);
    assert.equal(response.body.data?.userId, ownerUserId);
    assert.deepEqual(response.body.data?.counts, {
      billingEvents: 1,
      billingSubscriptions: 1,
      couponUsages: 1,
      dailyCheckIns: 1,
      failedReceiptQueue: 1,
      goals: 1,
      goalProgress: 1,
      leadMetrics: 1,
      orders: 1,
      paymentOrders: 1,
      plans: 1,
      refundRequests: 1,
      syncMutationLogs: 1,
      tasks: 1,
      users: 1,
      visionBoards: 1,
      weeks: 1,
      weeklyReviews: 1,
    });
    assert.deepEqual(exportFilters.users, [{ firebaseUid: ownerUserId }]);
    assert.deepEqual(exportFilters.goals, [{ userId: ownerUserId, deletedAt: null }]);
    assert.deepEqual(exportFilters.goalProgress, [{ planId: { $in: [ownerPlanId] } }]);
    assert.deepEqual(exportFilters.plans, [{ userId: ownerUserId, deletedAt: null }]);
    assert.deepEqual(exportFilters.weeks, [{ planId: { $in: [ownerPlanId] }, deletedAt: null }]);
    assert.deepEqual(exportFilters.tasks, [{ weekId: { $in: [ownerWeekId] }, deletedAt: null }]);
    assert.deepEqual(exportFilters.leadMetrics, [
      { $or: [{ userId: ownerUserId }, { weekId: { $in: [ownerWeekId] } }], deletedAt: null },
    ]);
    assert.deepEqual(exportFilters.weeklyReviews, [
      {
        $or: [{ userId: ownerUserId }, { planId: { $in: [ownerPlanId] } }, { weekId: { $in: [ownerWeekId] } }],
        deletedAt: null,
      },
    ]);
    assert.deepEqual(exportFilters.couponUsages, [{ userId: ownerUserId }]);
    assert.deepEqual(exportFilters.refundRequests, [{ userId: ownerUserId }]);
    assert.deepEqual(exportFilters.failedReceiptQueue, [{ orderId: { $in: [ownerPaymentOrderId] } }]);
    const exportedPaymentOrder = (response.body.data?.data as { paymentOrders?: Array<Record<string, unknown>> })
      .paymentOrders?.[0];
    assert.deepEqual(exportedPaymentOrder?.metadata, {
      payos: {
        orderCode: 123456,
        paymentLinkId: "payos_link_safe",
        status: "PAID",
        webhookReference: "TF_PAYOS_SAFE",
        webhookCode: "00",
        transactionDateTime: "2026-07-10 09:00:00",
        payer: {
          classification: "internal",
          accountLast4: "5544",
          accountMasked: "9988****5544",
          accountNameMasked: "N*** V*** A***",
          bankName: "MB Bank",
          transactionReference: "TF_PAYOS_SAFE",
          transactionDateTime: "2026-07-10 09:00:00",
          source: "webhook",
          observedAt: "2026-07-10T02:00:00.000Z",
        },
      },
    });
    assert.equal(JSON.stringify(response.body).includes("LEGACY_PAYOS_ACCOUNT_HASH_SENTINEL"), false);
    assert.equal(JSON.stringify(response.body).includes("998877665544"), false);
    assert.equal(JSON.stringify(response.body).includes("LEGACY_RAW_PAYOS_WEBHOOK_TEXT_SENTINEL"), false);
    assert.equal(JSON.stringify(response.body).includes("9988****5544"), true);
    assert.deepEqual(exportSelections.users, ["-__v -operationalClassification"]);
    assert.deepEqual(exportSelections.orders, ["-__v -operationalClassification"]);
    assert.deepEqual(exportSelections.paymentOrders, ["-__v -operationalClassification"]);
    assert.equal(JSON.stringify(response.body).includes("operationalClassification"), false);
    assert.equal(JSON.stringify(response.body).includes("classifiedBy"), false);
    assert.equal(JSON.stringify(response.body).includes("private profile note"), false);
    assert.equal(exportedPaymentOrder?.description, ownerPaymentOrderId);
  });
});

describe("DELETE /api/account/delete", () => {
  beforeEach(() => {
    for (const key of Object.keys(deleteFilters)) delete deleteFilters[key];
    firebaseDeleteUid = null;
    firebaseDeleteBehavior = "success";
    originalConsoleError = console.error;
    console.error = () => {};
    mockAccountDeletionModels();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    restoreModels();
  });

  it("requires Firebase auth before account deletion", async () => {
    const response = await requestJson(createTestApp(), "/api/account/delete", null);

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(firebaseDeleteUid, null);
    assert.equal(deleteFilters.users, undefined);
  });

  it("deletes owner account data and Firebase user on success", async () => {
    const response = await requestJson(createTestApp(), "/api/account/delete");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.deleted, true);
    assert.equal(response.body.data?.firebaseAccountDeleted, true);
    assert.equal(response.body.data?.counts?.couponUsages, 1);
    assert.equal(response.body.data?.counts?.failedReceiptQueue, 1);
    assert.equal(response.body.data?.counts?.goalProgress, 1);
    assert.equal(response.body.data?.counts?.refundRequests, 1);
    assert.equal(response.body.data?.counts?.tasks, 2);
    assert.equal(response.body.data?.counts?.weeklyReviews, 2);
    assert.equal(firebaseDeleteUid, ownerUserId);
    assert.deepEqual(deleteFilters.goals, [{ userId: ownerUserId }]);
    assert.deepEqual(deleteFilters.goalProgress, [{ planId: { $in: [ownerPlanId] } }]);
    assert.deepEqual(deleteFilters.tasks, [{ weekId: { $in: [ownerWeekId] } }]);
    assert.deepEqual(deleteFilters.leadMetrics, [
      { $or: [{ userId: ownerUserId }, { weekId: { $in: [ownerWeekId] } }] },
    ]);
    assert.deepEqual(deleteFilters.users, [{ firebaseUid: ownerUserId }]);
  });

  it("treats missing Firebase user as idempotent success", async () => {
    firebaseDeleteBehavior = "not-found";

    const response = await requestJson(createTestApp(), "/api/account/delete");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.firebaseAccountDeleted, true);
    assert.equal(firebaseDeleteUid, ownerUserId);
  });

  it("fails after deleting account data when Firebase user removal fails so the client can clear local data", async () => {
    firebaseDeleteBehavior = "failure";

    const response = await requestJson(createTestApp(), "/api/account/delete");

    assert.equal(response.status, 502);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "firebase_account_delete_failed");
    assert.match(response.body.message ?? "", /Account app data was deleted/i);
    assert.equal(firebaseDeleteUid, ownerUserId);
    assert.deepEqual(deleteFilters.goals, [{ userId: ownerUserId }]);
    assert.deepEqual(deleteFilters.users, [{ firebaseUid: ownerUserId }]);
    assert.deepEqual(deleteFilters.couponUsages, [{ userId: ownerUserId }]);
    assert.deepEqual(deleteFilters.refundRequests, [{ userId: ownerUserId }]);
    assert.deepEqual(deleteFilters.failedReceiptQueue, [{ orderId: { $in: [ownerPaymentOrderId] } }]);
  });

  it("does not delete the Firebase account when account data deletion fails", async () => {
    mockDeleteManyFailure(GoalModel as unknown as MockableModel, "goals", "mongo delete failed");

    const response = await requestJson(createTestApp(), "/api/account/delete");

    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
    assert.equal(firebaseDeleteUid, null);
    assert.deepEqual(deleteFilters.goals, [{ userId: ownerUserId }]);
  });

  it("keeps account anchors when dependent account data deletion fails so retry can clean up", async () => {
    mockDeleteManyFailure(TaskModel as unknown as MockableModel, "tasks", "task delete failed");

    const response = await requestJson(createTestApp(), "/api/account/delete");

    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
    assert.equal(firebaseDeleteUid, null);
    assert.deepEqual(deleteFilters.tasks, [{ weekId: { $in: [ownerWeekId] } }]);
    assert.equal(deleteFilters.weeks, undefined);
    assert.equal(deleteFilters.plans, undefined);
    assert.equal(deleteFilters.users, undefined);
  });
});
