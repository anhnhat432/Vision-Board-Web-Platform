import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it, mock } from "node:test";
import express, { type Express } from "express";
import mongoose, { type ClientSession } from "mongoose";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/audit-log-test";
process.env.FIREBASE_PROJECT_ID ??= "audit-log-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { clearAdminRoleCache } from "../middleware/requireAdmin";
import { AdminAuditOutboxModel } from "../models/AdminAuditOutboxModel";
import { AuditLogModel, type AuditLogEntity } from "../models/auditLogModel";
import { PaymentOrderModel, type PaymentOrderStatus } from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import { adminRoutes } from "../routes/adminRoutes";
import { orderRoutes } from "../routes/orderRoutes";
import { billingService } from "../services/billingServiceInstance";
import { listAuditLogs } from "../services/auditLogService";
import { orderService } from "../services/orderService";

type MockableModel = {
  create: unknown;
  countDocuments: unknown;
  find: unknown;
  findOne: unknown;
  findOneAndUpdate: unknown;
};

type MockableBillingService = {
  upsertSubscriptionFromProviderEvent: unknown;
};

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

interface MockPaymentOrder {
  orderId: string;
  userId: string;
  amount: number;
  status: PaymentOrderStatus;
  completedAt?: Date;
  cassoTransactionId?: string;
  manualCompletedBy?: string;
  manualCompletedAt?: Date;
  manualCompletionNote?: string;
  save(): Promise<MockPaymentOrder>;
}

const originalAuditCreate = AuditLogModel.create;
const originalAuditCountDocuments = AuditLogModel.countDocuments;
const originalAuditFind = AuditLogModel.find;
const originalPaymentOrderFindOne = PaymentOrderModel.findOne;
const originalPaymentOrderFindOneAndUpdate = PaymentOrderModel.findOneAndUpdate;
const originalRefundFindOne = RefundRequestModel.findOne;
const originalUserFindOne = UserModel.findOne;
const originalOutboxCreate = AdminAuditOutboxModel.create;
const originalOutboxFindOne = AdminAuditOutboxModel.findOne;
const originalOutboxFindOneAndUpdate = AdminAuditOutboxModel.findOneAndUpdate;
const originalStartSession = mongoose.startSession;
const originalBillingUpsert = billingService.upsertSubscriptionFromProviderEvent;

function createMockPaymentOrder(overrides: Partial<MockPaymentOrder> = {}): MockPaymentOrder {
  return {
    orderId: "VBQA000001",
    userId: "customer_uid_should_not_log",
    amount: 2000,
    status: "pending",
    async save() {
      return this;
    },
    ...overrides,
  };
}

function createSessionMock(): ClientSession {
  return {
    async withTransaction(callback: () => Promise<void>) {
      await callback();
    },
    async endSession() {},
  } as unknown as ClientSession;
}

function createAdminTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "admin-token") {
          return { uid: "admin_uid", email: "admin@example.com", emailVerified: true, role: "admin" };
        }
        if (token === "non-admin-token") {
          return { uid: "non_admin_uid", email: "viewer@example.com", emailVerified: true, role: "user" };
        }
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", adminRoutes);
  app.use("/api", orderRoutes);
  app.use(errorMiddleware);
  return app;
}

async function requestJson(
  app: Express,
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = {
    accept: "application/json",
    authorization: `Bearer ${options.token ?? "admin-token"}`,
  };
  if (options.body !== undefined) headers["content-type"] = "application/json";

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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

function mockUserRole(role: "user" | "admin"): void {
  (UserModel as unknown as MockableModel).findOne = () => {
    const chain = {
      select() {
        return chain;
      },
      maxTimeMS(ms: number) {
        assert.equal(ms, 5000);
        return chain;
      },
      async lean() {
        return { role };
      },
    };
    return chain;
  };
}

afterEach(() => {
  mock.restoreAll();
  (AuditLogModel as unknown as MockableModel).create = originalAuditCreate;
  (AuditLogModel as unknown as MockableModel).countDocuments = originalAuditCountDocuments;
  (AuditLogModel as unknown as MockableModel).find = originalAuditFind;
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = originalPaymentOrderFindOneAndUpdate;
  (RefundRequestModel as unknown as MockableModel).findOne = originalRefundFindOne;
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  (AdminAuditOutboxModel as unknown as { create: unknown }).create = originalOutboxCreate;
  (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = originalOutboxFindOne;
  (AdminAuditOutboxModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = originalOutboxFindOneAndUpdate;
  (mongoose as unknown as { startSession: unknown }).startSession = originalStartSession;
  (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = originalBillingUpsert;
  clearAdminRoleCache();
});

describe("admin audit logging", () => {
  it("excludes durable command fingerprints when listing audit logs", async () => {
    let projection: unknown;
    (AuditLogModel as unknown as MockableModel).countDocuments = async () => 0;
    (AuditLogModel as unknown as MockableModel).find = () => {
      const chain = {
        select(value: unknown) {
          projection = value;
          return chain;
        },
        sort() {
          return chain;
        },
        skip() {
          return chain;
        },
        limit() {
          return chain;
        },
        async lean() {
          return [];
        },
      };
      return chain;
    };

    await listAuditLogs({});
    assert.equal(projection, "-commandFingerprint -commandFingerprintVersion");
  });

  it("creates an audit log entry when completePaymentOrderManually succeeds", async () => {
    const createdLogs: AuditLogEntity[] = [];
    const order = createMockPaymentOrder();
    mockUserRole("admin");

    (AuditLogModel as unknown as MockableModel).create = async (entry: AuditLogEntity) => {
      createdLogs.push(entry);
      return entry;
    };
    (PaymentOrderModel as unknown as MockableModel).findOne = async () => order;
    (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = async () => ({
      subscription: { id: "sub_manual_1" },
      eventStatus: "processed",
      eventId: "evt_manual_1",
    });

    const response = await requestJson(createAdminTestApp(), "POST", "/api/admin/billing/payment-orders/VBQA000001/complete", {
      body: {
        manualCompletionNote: "Matched transfer manually.",
        customerEmail: "customer@example.com",
        userId: "customer_uid_should_not_log",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(createdLogs.length, 1);
    assert.equal(createdLogs[0]?.actorUid, "admin_uid");
    assert.equal(createdLogs[0]?.actorEmail, "admin@example.com");
    assert.equal(createdLogs[0]?.action, "completePaymentOrderManually");
    assert.equal(createdLogs[0]?.target, "payment_order");
    assert.equal(createdLogs[0]?.targetId, "VBQA000001");
    assert.equal(createdLogs[0]?.success, true);
    assert.ok(createdLogs[0]?.timestamp instanceof Date);
    assert.equal(typeof createdLogs[0]?.ip, "string");
    assert.equal(createdLogs[0]?.payload?.manualCompletionNote, "Matched transfer manually.");
    assert.equal("customerEmail" in (createdLogs[0]?.payload ?? {}), false);
    assert.equal("userId" in (createdLogs[0]?.payload ?? {}), false);
    assert.equal(JSON.stringify(createdLogs[0]).includes("customer@example.com"), false);
    assert.equal(JSON.stringify(createdLogs[0]).includes("customer_uid_should_not_log"), false);
  });

  it("creates an audit log entry when admin updates physical order status", async () => {
    const createdLogs: AuditLogEntity[] = [];
    mockUserRole("admin");

    (AuditLogModel as unknown as MockableModel).create = async (entry: AuditLogEntity) => {
      createdLogs.push(entry);
      return entry;
    };
    mock.method(orderService, "adminUpdateStatus", async () => ({
      id: "507f1f77bcf86cd799439011",
      status: "confirmed",
    }));

    const response = await requestJson(createAdminTestApp(), "PATCH", "/api/admin/orders/507f1f77bcf86cd799439011/status", {
      body: {
        status: "confirmed",
        adminNote: "Customer paid.",
        customerEmail: "customer@example.com",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(createdLogs.length, 1);
    assert.equal(createdLogs[0]?.actorUid, "admin_uid");
    assert.equal(createdLogs[0]?.action, "adminUpdateOrderStatus");
    assert.equal(createdLogs[0]?.target, "physical_order");
    assert.equal(createdLogs[0]?.targetId, "507f1f77bcf86cd799439011");
    assert.equal(createdLogs[0]?.success, true);
    assert.equal(createdLogs[0]?.payload?.status, "confirmed");
    assert.equal(createdLogs[0]?.payload?.adminNote, "Customer paid.");
    assert.equal("customerEmail" in (createdLogs[0]?.payload ?? {}), false);
  });

  it("returns reconciliation last-run status for admins", async () => {
    mockUserRole("admin");

    const response = await requestJson(createAdminTestApp(), "GET", "/api/admin/reconciliation/last-run");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok("data" in response.body);
    assert.ok(
      (response.body.data as Record<string, unknown>).lastRun === null ||
        typeof (response.body.data as Record<string, unknown>).lastRun === "object",
    );
  });

  it("creates a failed audit log entry when non-admin calls completePaymentOrderManually", async () => {
    const createdLogs: AuditLogEntity[] = [];
    mockUserRole("user");

    (AuditLogModel as unknown as MockableModel).create = async (entry: AuditLogEntity) => {
      createdLogs.push(entry);
      return entry;
    };
    (PaymentOrderModel as unknown as MockableModel).findOne = async () => {
      throw new Error("payment lookup should not run");
    };

    const response = await requestJson(createAdminTestApp(), "POST", "/api/admin/billing/payment-orders/VBQA000001/complete", {
      token: "non-admin-token",
      body: {
        manualCompletionNote: "Should not pass.",
        customerEmail: "customer@example.com",
        userId: "customer_uid_should_not_log",
      },
    });

    assert.equal(response.status, 403);
    assert.equal(createdLogs.length, 1);
    assert.equal(createdLogs[0]?.actorUid, "non_admin_uid");
    assert.equal(createdLogs[0]?.actorEmail, "viewer@example.com");
    assert.equal(createdLogs[0]?.action, "completePaymentOrderManually");
    assert.equal(createdLogs[0]?.target, "payment_order");
    assert.equal(createdLogs[0]?.targetId, "VBQA000001");
    assert.equal(createdLogs[0]?.success, false);
    assert.equal(createdLogs[0]?.payload?.manualCompletionNote, "Should not pass.");
    assert.equal("customerEmail" in (createdLogs[0]?.payload ?? {}), false);
    assert.equal("userId" in (createdLogs[0]?.payload ?? {}), false);
    assert.equal(JSON.stringify(createdLogs[0]).includes("customer@example.com"), false);
    assert.equal(JSON.stringify(createdLogs[0]).includes("customer_uid_should_not_log"), false);
  });

  it("records only safe sales review facts on success and failure", async () => {
    const createdLogs: AuditLogEntity[] = [];
    const original = {
      _id: "order_doc_1",
      orderId: "VBREVIEW01",
      userId: "customer_uid",
      status: "completed",
      purpose: "plus_subscription",
      currency: "VND",
      provider: "payos",
      amount: 99000,
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      reporting: undefined,
      updatedAt: new Date("2026-07-10T03:06:00.000Z"),
    };
    const createLeanResult = <T,>(value: T) => {
      const chain = {
        select() {
          return chain;
        },
        sort() {
          return chain;
        },
        async lean() {
          return value;
        },
      };
      return chain;
    };
    mockUserRole("admin");
    (AuditLogModel as unknown as MockableModel).create = async (entry: AuditLogEntity) => {
      createdLogs.push(entry);
      return entry;
    };
    (PaymentOrderModel as unknown as MockableModel).findOne = () => createLeanResult(original);
    (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = () => createLeanResult({
      ...original,
      reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date("2026-07-11T02:00:00.000Z") },
    });
    (RefundRequestModel as unknown as MockableModel).findOne = () => createLeanResult(null);
    (AuditLogModel as unknown as MockableModel).findOne = () => createLeanResult(null);
    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async () => [];
    (AdminAuditOutboxModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => createLeanResult(null);
    (mongoose as unknown as { startSession: unknown }).startSession = async () => createSessionMock();

    const success = await requestJson(createAdminTestApp(), "PATCH", "/api/admin/reports/sales/VBREVIEW01/review", {
      body: {
        kpiStatus: "excluded",
        exclusionReason: "test",
        reviewNote: "raw private review note",
        reviewRequestId: "11111111-1111-4111-8111-111111111111",
      },
    });
    assert.equal(success.status, 200);
    assert.equal(createdLogs.length, 0);

    const failed = await requestJson(createAdminTestApp(), "PATCH", "/api/admin/reports/sales/VBREVIEW01/review", {
      body: {
        kpiStatus: "customer@example.com",
        exclusionReason: "customer_uid_should_not_log",
        reviewNote: "raw private review note",
        reviewRequestId: "22222222-2222-4222-8222-222222222222",
      },
    });
    assert.equal(failed.status, 400);
    assert.equal(failed.body.errorCode, "invalid_sales_review_status");
    assert.deepEqual(createdLogs[0]?.payload, { noteProvided: true });
    assert.equal(JSON.stringify(createdLogs[0]).includes("raw private review note"), false);
    assert.equal(JSON.stringify(createdLogs[0]).includes("customer@example.com"), false);
    assert.equal(JSON.stringify(createdLogs[0]).includes("customer_uid_should_not_log"), false);
  });
});
