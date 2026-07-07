import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { adminAuth } from "../config/firebase";
import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
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
import { accountRoutes } from "../routes/accountRoutes";

interface JsonResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    data?: {
      deleted?: boolean;
      firebaseAccountDeleted?: boolean;
      counts?: Record<string, number>;
    };
    errorCode?: string;
  };
}

type MockableModel = {
  find?: unknown;
  deleteMany?: unknown;
  deleteOne?: unknown;
};

const ownerUserId = "user_owner";
const ownerPlanId = "plan_owner_1";
const ownerWeekId = "week_owner_1";

const originals = {
  adminDeleteUser: adminAuth.deleteUser,
  billingEventDeleteMany: BillingEventModel.deleteMany,
  billingSubscriptionDeleteMany: BillingSubscriptionModel.deleteMany,
  dailyCheckInDeleteMany: DailyCheckInModel.deleteMany,
  goalDeleteMany: GoalModel.deleteMany,
  leadMetricDeleteMany: LeadMetricModel.deleteMany,
  orderDeleteMany: OrderModel.deleteMany,
  paymentOrderDeleteMany: PaymentOrderModel.deleteMany,
  planDeleteMany: PlanModel.deleteMany,
  planFind: PlanModel.find,
  syncMutationLogDeleteMany: SyncMutationLogModel.deleteMany,
  taskDeleteMany: TaskModel.deleteMany,
  userDeleteOne: UserModel.deleteOne,
  visionBoardDeleteMany: VisionBoardModel.deleteMany,
  weekDeleteMany: WeekModel.deleteMany,
  weekFind: WeekModel.find,
  weekReviewDeleteMany: WeekReviewModel.deleteMany,
};

const deleteFilters: Record<string, unknown[]> = {};
let firebaseDeleteUid: string | null = null;
let firebaseDeleteBehavior: "success" | "not-found" | "failure" = "success";
let originalConsoleError: typeof console.error;

function queryResult<T>(items: T[]) {
  return {
    select() {
      return {
        async lean() {
          return items;
        },
      };
    },
  };
}

function mockDeleteMany(model: MockableModel, key: string, deletedCount: number): void {
  model.deleteMany = async (filter: unknown) => {
    deleteFilters[key] = [...(deleteFilters[key] ?? []), filter];
    return { deletedCount };
  };
}

function mockDeleteManyFailure(model: MockableModel, key: string): void {
  model.deleteMany = async (filter: unknown) => {
    deleteFilters[key] = [...(deleteFilters[key] ?? []), filter];
    throw new Error(`${key}_delete_failed`);
  };
}

function mockDeleteOne(model: MockableModel, key: string, deletedCount: number): void {
  model.deleteOne = async (filter: unknown) => {
    deleteFilters[key] = [...(deleteFilters[key] ?? []), filter];
    return { deletedCount };
  };
}

function restoreModels(): void {
  (adminAuth as unknown as { deleteUser: typeof adminAuth.deleteUser }).deleteUser = originals.adminDeleteUser;
  (BillingEventModel as unknown as MockableModel).deleteMany = originals.billingEventDeleteMany;
  (BillingSubscriptionModel as unknown as MockableModel).deleteMany = originals.billingSubscriptionDeleteMany;
  (DailyCheckInModel as unknown as MockableModel).deleteMany = originals.dailyCheckInDeleteMany;
  (GoalModel as unknown as MockableModel).deleteMany = originals.goalDeleteMany;
  (LeadMetricModel as unknown as MockableModel).deleteMany = originals.leadMetricDeleteMany;
  (OrderModel as unknown as MockableModel).deleteMany = originals.orderDeleteMany;
  (PaymentOrderModel as unknown as MockableModel).deleteMany = originals.paymentOrderDeleteMany;
  (PlanModel as unknown as MockableModel).deleteMany = originals.planDeleteMany;
  (PlanModel as unknown as MockableModel).find = originals.planFind;
  (SyncMutationLogModel as unknown as MockableModel).deleteMany = originals.syncMutationLogDeleteMany;
  (TaskModel as unknown as MockableModel).deleteMany = originals.taskDeleteMany;
  (UserModel as unknown as MockableModel).deleteOne = originals.userDeleteOne;
  (VisionBoardModel as unknown as MockableModel).deleteMany = originals.visionBoardDeleteMany;
  (WeekModel as unknown as MockableModel).deleteMany = originals.weekDeleteMany;
  (WeekModel as unknown as MockableModel).find = originals.weekFind;
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

  mockDeleteMany(BillingEventModel as unknown as MockableModel, "billingEvents", 1);
  mockDeleteMany(BillingSubscriptionModel as unknown as MockableModel, "billingSubscriptions", 1);
  mockDeleteMany(DailyCheckInModel as unknown as MockableModel, "dailyCheckIns", 1);
  mockDeleteMany(GoalModel as unknown as MockableModel, "goals", 1);
  mockDeleteMany(LeadMetricModel as unknown as MockableModel, "leadMetrics", 2);
  mockDeleteMany(OrderModel as unknown as MockableModel, "orders", 1);
  mockDeleteMany(PaymentOrderModel as unknown as MockableModel, "paymentOrders", 1);
  mockDeleteMany(PlanModel as unknown as MockableModel, "plans", 1);
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

async function requestJson(app: Express, path: string, token: string | null = "owner-token"): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });
  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = { accept: "application/json" };
  if (token !== null) headers.authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "DELETE",
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
    assert.equal(response.body.data?.counts?.tasks, 2);
    assert.equal(response.body.data?.counts?.weeklyReviews, 2);
    assert.equal(firebaseDeleteUid, ownerUserId);
    assert.deepEqual(deleteFilters.goals, [{ userId: ownerUserId }]);
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

  it("does not delete owner account data when Firebase user removal fails", async () => {
    firebaseDeleteBehavior = "failure";

    const response = await requestJson(createTestApp(), "/api/account/delete");

    assert.equal(response.status, 502);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "firebase_account_delete_failed");
    assert.match(response.body.message ?? "", /dữ liệu tài khoản trên cloud chưa bị xóa/i);
    assert.equal(firebaseDeleteUid, ownerUserId);
    assert.equal(deleteFilters.users, undefined);
    assert.equal(deleteFilters.goals, undefined);
    assert.equal(deleteFilters.paymentOrders, undefined);
    assert.equal(deleteFilters.plans, undefined);
  });

  it("returns a specific recovery error when account data deletion fails after Firebase removal", async () => {
    mockDeleteManyFailure(GoalModel as unknown as MockableModel, "goals");

    const response = await requestJson(createTestApp(), "/api/account/delete");

    assert.equal(response.status, 502);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "account_data_delete_failed_after_auth_delete");
    assert.match(response.body.message ?? "", /đăng nhập tài khoản có thể đã được xóa/i);
    assert.match(response.body.message ?? "", /liên hệ hỗ trợ/i);
    assert.equal(firebaseDeleteUid, ownerUserId);
    assert.deepEqual(deleteFilters.goals, [{ userId: ownerUserId }]);
  });
});
