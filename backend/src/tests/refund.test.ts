import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it, mock } from "node:test";
import express, { type Express } from "express";

import { BillingEventModel } from "../models/BillingEventModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { RefundRequestModel, type RefundRequestStatus } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { adminRoutes } from "../routes/adminRoutes";
import { billingRoutes } from "../routes/billingRoutes";
import * as emailNotificationService from "../services/emailNotificationService";

const ownerUserId = "refund_user_1";
const adminUserId = "refund_admin_1";
const requestId = "507f1f77bcf86cd799439099";
const orderId = "VBREF00001";

type MockableModel = {
  create: unknown;
  find: unknown;
  findById: unknown;
  findOne: unknown;
};

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

interface MockRefundRequest {
  _id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  contactEmail: string;
  reason: string;
  refundAccount: string;
  status: RefundRequestStatus;
  adminNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  saveCalls: number;
  save(): Promise<MockRefundRequest>;
}

const originalPaymentOrderFindOne = PaymentOrderModel.findOne;
const originalRefundFindOne = RefundRequestModel.findOne;
const originalRefundCreate = RefundRequestModel.create;
const originalRefundFind = RefundRequestModel.find;
const originalRefundFindById = RefundRequestModel.findById;
const originalBillingEventCreate = BillingEventModel.create;
const originalUserFindOne = UserModel.findOne;

function createRefundTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "user-token") {
          return { uid: ownerUserId, email: "buyer@example.test", emailVerified: true };
        }
        if (token === "admin-token") {
          return { uid: adminUserId, email: "admin@example.test", emailVerified: true };
        }
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", billingRoutes);
  app.use("/api", adminRoutes);
  app.use(errorMiddleware);
  return app;
}

async function requestJson(
  app: Express,
  method: string,
  path: string,
  options: { token?: string | null; body?: unknown } = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.token !== null) headers.authorization = `Bearer ${options.token ?? "user-token"}`;
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

function createRequestStore(): { getRequest(): MockRefundRequest | null; events: Array<Record<string, unknown>> } {
  let refundRequest: MockRefundRequest | null = null;
  const events: Array<Record<string, unknown>> = [];

  (PaymentOrderModel as unknown as MockableModel).findOne = async (query: unknown) => {
    const filter = query as Record<string, unknown>;
    if (filter.orderId !== orderId || filter.userId !== ownerUserId) return null;
    return {
      orderId,
      userId: ownerUserId,
      status: "completed",
      completedAt: new Date(),
    };
  };

  (RefundRequestModel as unknown as MockableModel).findOne = async () =>
    refundRequest?.status === "pending" ? refundRequest : null;

  (RefundRequestModel as unknown as MockableModel).create = async (payload: Record<string, unknown>) => {
    refundRequest = {
      _id: requestId,
      orderId: String(payload.orderId),
      userId: String(payload.userId),
      userEmail: String(payload.userEmail),
      contactEmail: String(payload.contactEmail),
      reason: String(payload.reason),
      refundAccount: String(payload.refundAccount),
      status: "pending",
      adminNote: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date("2026-05-15T00:00:00.000Z"),
      updatedAt: new Date("2026-05-15T00:00:00.000Z"),
      saveCalls: 0,
      async save() {
        this.saveCalls += 1;
        this.updatedAt = new Date("2026-05-15T01:00:00.000Z");
        return this;
      },
    };
    return refundRequest;
  };

  (RefundRequestModel as unknown as MockableModel).find = () => {
    const chain = {
      sort() {
        return chain;
      },
      limit() {
        return chain;
      },
      async then(resolve: (value: MockRefundRequest[]) => unknown) {
        return resolve(refundRequest ? [refundRequest] : []);
      },
    };
    return chain;
  };

  (RefundRequestModel as unknown as MockableModel).findById = async (id: string) =>
    id === requestId ? refundRequest : null;

  (BillingEventModel as unknown as MockableModel).create = async (payload: Record<string, unknown>) => {
    events.push(payload);
    return payload;
  };

  (UserModel as unknown as MockableModel).findOne = (query: unknown) => {
    const filter = query as Record<string, unknown>;
    const chain = {
      async lean() {
        if (filter.firebaseUid === adminUserId) {
          return { firebaseUid: adminUserId, email: "admin@example.test", role: "admin" };
        }
        return null;
      },
    };
    return chain;
  };

  return { getRequest: () => refundRequest, events };
}

afterEach(() => {
  mock.restoreAll();
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (RefundRequestModel as unknown as MockableModel).findOne = originalRefundFindOne;
  (RefundRequestModel as unknown as MockableModel).create = originalRefundCreate;
  (RefundRequestModel as unknown as MockableModel).find = originalRefundFind;
  (RefundRequestModel as unknown as MockableModel).findById = originalRefundFindById;
  (BillingEventModel as unknown as MockableModel).create = originalBillingEventCreate;
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  delete process.env.BILLING_SUPPORT_EMAIL;
  delete process.env.REFUND_WINDOW_DAYS;
});

describe("refund request flow", () => {
  it("creates a refund request and lets admin mark it completed with audit events", async () => {
    process.env.BILLING_SUPPORT_EMAIL = "support@example.test";
    process.env.REFUND_WINDOW_DAYS = "7";
    const store = createRequestStore();
    const sendEmailMock = mock.method(emailNotificationService, "sendEmail", async () => ({
      status: "sent" as const,
      provider: "smtp",
    }));
    const app = createRefundTestApp();

    const createResponse = await requestJson(app, "POST", `/api/billing/orders/${orderId}/refund-request`, {
      token: "user-token",
      body: {
        contactEmail: "buyer@example.test",
        reason: "Không còn nhu cầu dùng Plus.",
        refundAccount: "VCB - 0123456789 - Nguyen Van A",
      },
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.success, true);
    const createdData = createResponse.body.data as Record<string, unknown>;
    const createdRequest = createdData.request as Record<string, unknown>;
    assert.equal(createdRequest.status, "pending");
    assert.equal(createdRequest.orderId, orderId);

    const listResponse = await requestJson(app, "GET", "/api/admin/billing/refund-requests", {
      token: "admin-token",
    });
    assert.equal(listResponse.status, 200);
    const listData = listResponse.body.data as Record<string, unknown>;
    const items = listData.items as Array<Record<string, unknown>>;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.refundAccount, "VCB - 0123456789 - Nguyen Van A");

    const completeResponse = await requestJson(app, "POST", `/api/admin/billing/refund-requests/${requestId}/complete`, {
      token: "admin-token",
      body: { adminNote: "Đã chuyển khoản hoàn tiền thủ công." },
    });

    assert.equal(completeResponse.status, 200);
    const completeData = completeResponse.body.data as Record<string, unknown>;
    const completedRequest = completeData.request as Record<string, unknown>;
    assert.equal(completedRequest.status, "completed");
    assert.equal(completedRequest.resolvedBy, adminUserId);
    assert.equal(store.getRequest()?.saveCalls, 1);

    assert.equal(sendEmailMock.mock.callCount(), 2);
    const supportEmailCall = sendEmailMock.mock.calls[0]?.arguments[0] as unknown as Record<string, unknown>;
    assert.equal(supportEmailCall.to, "support@example.test");
    assert.equal(supportEmailCall.replyTo, "buyer@example.test");

    assert.deepEqual(
      store.events.map((event) => event.eventType),
      ["refund_request_created", "refund_request_completed"],
    );
    assert.ok(store.events.every((event) => typeof event.payloadHash === "string"));
    assert.ok(store.events.every((event) => !JSON.stringify(event).includes("0123456789")));
  });
});
