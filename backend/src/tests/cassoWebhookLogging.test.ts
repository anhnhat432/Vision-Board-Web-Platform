import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { Request, Response } from "express";

import { getCassoWebhookHealth, handleCassoWebhook } from "../controllers/cassoWebhookController";
import * as backendMonitoring from "../monitoring/sentry";
import { PaymentOrderModel, type PaymentOrderStatus } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  setHeader(name: string, value: string): MockResponse;
  status(code: number): MockResponse;
  json(body: unknown): MockResponse;
}

interface MockCassoPaymentOrder {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  expiresAt: Date;
  completedAt?: Date;
  cassoTransactionId?: string;
  receiptEmail?: string;
  receiptName?: string;
  receiptSentAt?: Date;
  receiptLastError?: string;
  saveCalls: number;
  save(): Promise<MockCassoPaymentOrder>;
}

type MockableModel = {
  findOne: unknown;
  findOneAndUpdate: unknown;
};

const originalPaymentOrderFindOne = PaymentOrderModel.findOne;
const originalPaymentOrderFindOneAndUpdate = PaymentOrderModel.findOneAndUpdate;
const originalUserFindOne = UserModel.findOne;

function createResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

function createRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return {
    body,
    headers,
  } as Request;
}

function createOrder(overrides: Partial<MockCassoPaymentOrder> = {}): MockCassoPaymentOrder {
  return {
    _id: `payment_order_${Date.now()}`,
    orderId: "VBLOG00001",
    userId: "user_casso_logging",
    amount: 2000,
    currency: "VND",
    status: "pending",
    receiptEmail: "paid@example.test",
    receiptName: "Paid User",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    saveCalls: 0,
    async save() {
      this.saveCalls++;
      return this;
    },
    ...overrides,
  };
}

function createPayload(input: { orderId?: string; amount?: number; transactionId?: string } = {}) {
  return {
    error: 0,
    data: [
      {
        id: input.transactionId ?? "tx_logging_1",
        tid: input.transactionId ?? "tx_logging_1",
        description: input.orderId ? `Thanh toan ${input.orderId}` : "Thanh toan khong co ma don",
        amount: input.amount ?? 2000,
        when: "2026-05-10 12:00:00",
      },
    ],
  };
}

function mockPersistence(order: MockCassoPaymentOrder | null): void {
  (PaymentOrderModel as unknown as MockableModel).findOne = async (query: unknown) => {
    const filters = query as Record<string, unknown>;
    if ("cassoTransactionId" in filters) return null;
    if (order && filters.orderId === order.orderId && filters.status === "pending") return order;
    return null;
  };
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = async (query: unknown, update: unknown) => {
    const filters = query as Record<string, unknown>;
    if (!order || filters._id !== order._id || filters.status !== "pending" || order.status !== "pending") {
      return null;
    }

    const set = (update as { $set?: Record<string, unknown> }).$set ?? {};
    if (typeof set.status === "string") {
      order.status = set.status as PaymentOrderStatus;
    }
    if (set.completedAt instanceof Date) {
      order.completedAt = set.completedAt;
    }
    if (typeof set.cassoTransactionId === "string") {
      order.cassoTransactionId = set.cassoTransactionId;
    }
    return order;
  };

  (UserModel as unknown as MockableModel).findOne = () => ({
    select() {
      return {
        async lean() {
          return { email: "paid@example.test", displayName: "Paid User" };
        },
      };
    },
  });
}

afterEach(() => {
  mock.restoreAll();
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = originalPaymentOrderFindOneAndUpdate;
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  delete process.env.CASSO_WEBHOOK_SECRET;
});

describe("Casso webhook security logging", () => {
  it("keeps webhook health responses generic and uncached", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const response = createResponse();

    await getCassoWebhookHealth(createRequest({}), response as unknown as Response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store, max-age=0");
    assert.deepEqual(response.body, {
      success: true,
      data: {
        provider: "casso",
        status: "ok",
      },
    });
  });

  it("captures signature mismatches with sanitized context", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const capture = mock.method(backendMonitoring, "captureBackendException", () => undefined);
    const response = createResponse();

    await handleCassoWebhook(
      createRequest(createPayload({ orderId: "VBLOG00001" }), { "secure-token": "wrong-secret" }),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 401);
    assert.equal(capture.mock.callCount(), 1);
    const [, rawContext] = capture.mock.calls[0].arguments;
    const context = rawContext as { tags?: Record<string, unknown>; extra?: Record<string, unknown> };
    assert.equal(context?.tags?.event, "casso_webhook_signature_mismatch");
    assert.equal(context?.extra?.hasSecureToken, true);
    assert.equal(context?.extra?.signatureSecretConfigured, true);
  });

  it("logs successful Casso payment processing as a structured event", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const order = createOrder();
    mockPersistence(order);
    const info = mock.method(console, "info", () => undefined);
    const response = createResponse();

    await handleCassoWebhook(
      createRequest(createPayload({ orderId: order.orderId, amount: 2000, transactionId: "tx_success_1" }), {
        "secure-token": "expected-secret",
      }),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(order.status, "completed");
    const structuredSuccess = info.mock.calls
      .map((call) => call.arguments[0])
      .find((arg): arg is Record<string, unknown> => {
        return Boolean(arg) && typeof arg === "object" && (arg as Record<string, unknown>).event === "casso_webhook_success";
      });
    assert.ok(structuredSuccess);
    assert.equal(structuredSuccess.transactionId, "tx_success_1");
    assert.equal(structuredSuccess.accountId, order.orderId);
    assert.equal(structuredSuccess.amount, 2000);
    assert.equal(structuredSuccess.planCode, "PLUS");
    assert.equal(structuredSuccess.userId, order.userId);
  });
});
