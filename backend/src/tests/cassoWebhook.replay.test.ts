import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { Request, Response } from "express";

import { handleCassoWebhook } from "../controllers/cassoWebhookController";
import { PaymentOrderModel, type PaymentOrderStatus } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import type { ProviderSubscriptionEvent } from "../services/billingService";
import { billingService } from "../services/billingServiceInstance";
import * as receiptEmailService from "../services/receiptEmailService";

interface MockResponse {
  statusCode: number;
  body: unknown;
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

import { FailedReceiptQueueModel } from "../models/FailedReceiptQueueModel";

type MockableModel = {
  findOne: unknown;
  findOneAndUpdate: unknown;
};

const originalPaymentOrderFindOne = PaymentOrderModel.findOne;
const originalPaymentOrderFindOneAndUpdate = PaymentOrderModel.findOneAndUpdate;
const originalUserFindOne = UserModel.findOne;
const originalFailedReceiptDeleteOne = FailedReceiptQueueModel.deleteOne;
const originalFailedReceiptUpdateOne = FailedReceiptQueueModel.updateOne;

(FailedReceiptQueueModel as any).deleteOne = async () => ({ acknowledged: true, deletedCount: 1 });
(FailedReceiptQueueModel as any).updateOne = async () => ({ acknowledged: true, modifiedCount: 1 });

function createResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
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
  return { body, headers } as Request;
}

function createOrder(overrides: Partial<MockCassoPaymentOrder> = {}): MockCassoPaymentOrder {
  return {
    _id: `payment_order_${Date.now()}`,
    orderId: "VBREPLAY01",
    userId: `user_casso_replay_${Date.now()}`,
    amount: 99000,
    currency: "VND",
    status: "pending",
    receiptEmail: "buyer@example.test",
    receiptName: "Buyer",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    saveCalls: 0,
    async save() {
      this.saveCalls++;
      return this;
    },
    ...overrides,
  };
}

function createPayload(orderId: string, transactionId: string) {
  return {
    error: 0,
    data: [
      {
        id: transactionId,
        tid: transactionId,
        description: `Thanh toan ${orderId}`,
        amount: 99000,
        when: "2026-05-14 12:00:00",
      },
    ],
  };
}

function mockPaymentOrderPersistence(order: MockCassoPaymentOrder): void {
  (PaymentOrderModel as unknown as MockableModel).findOne = async (query: unknown) => {
    const filters = query as Record<string, unknown>;
    if (filters.cassoTransactionId) {
      return filters.cassoTransactionId === order.cassoTransactionId ? order : null;
    }
    if (filters.orderId === order.orderId && filters.status === "pending" && order.status === "pending") return order;
    if (filters.orderId === order.orderId && !("status" in filters)) return order;
    return null;
  };
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = async (query: unknown, update: unknown) => {
    const filters = query as Record<string, unknown>;
    if (filters._id !== order._id || filters.status !== "pending" || order.status !== "pending") {
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
          return { email: "buyer@example.test", displayName: "Buyer" };
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
  (FailedReceiptQueueModel as any).deleteOne = originalFailedReceiptDeleteOne;
  (FailedReceiptQueueModel as any).updateOne = originalFailedReceiptUpdateOne;
  delete process.env.CASSO_WEBHOOK_SECRET;
});

describe("Casso webhook replay protection", () => {
  it("skips a duplicate transaction linked to a non-completed order", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const duplicateOrder = createOrder({ status: "pending", cassoTransactionId: "tx_replay_pending" });
    const payload = createPayload(duplicateOrder.orderId, "tx_replay_pending");
    mockPaymentOrderPersistence(duplicateOrder);

    let grantCalls = 0;
    mock.method(billingService, "upsertSubscriptionFromProviderEvent", async () => {
      grantCalls++;
      throw new Error("should_not_grant_duplicate_pending_transaction");
    });

    const response = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "secure-token": "expected-secret" }),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      success: true,
      processedCount: 0,
      message: "Không có giao dịch nào khớp với đơn hàng đang chờ.",
    });
    assert.equal(grantCalls, 0);
    assert.equal(duplicateOrder.status, "pending");
  });

  it("does not grant entitlement when atomic claim loses race", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const order = createOrder();
    const payload = createPayload(order.orderId, "tx_race_11000");
    mockPaymentOrderPersistence(order);
    (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = async (query: unknown) => {
      const filters = query as Record<string, unknown>;
      if (filters._id === order._id && filters.status === "pending") {
        order.status = "completed";
        order.completedAt = new Date();
        order.cassoTransactionId = "tx_race_11000";
      }
      return null;
    };

    let grantCalls = 0;
    mock.method(billingService, "upsertSubscriptionFromProviderEvent", async () => {
      grantCalls++;
      throw new Error("should_not_grant_after_losing_atomic_claim");
    });
    const info = mock.method(console, "info", () => undefined);

    const response = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "secure-token": "expected-secret" }),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      success: true,
      processedCount: 0,
      message: "Không có giao dịch nào khớp với đơn hàng đang chờ.",
    });
    assert.equal(grantCalls, 0);
    assert.equal(order.saveCalls, 0);
    assert.equal(order.status, "completed");
    assert.equal(order.cassoTransactionId, "tx_race_11000");
    const replayLog = info.mock.calls
      .map((call) => call.arguments[0])
      .find((arg): arg is Record<string, unknown> => {
        return Boolean(arg) && typeof arg === "object" && (arg as Record<string, unknown>).event === "casso_webhook_replay_ignored";
      });
    assert.ok(replayLog);
    assert.equal(replayLog.reason, "claim_lost");
    assert.equal(replayLog.transactionId, "tx_race_11000");
  });

  it("returns 200 for replayed webhook without granting entitlement again", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const order = createOrder();
    const payload = createPayload(order.orderId, "tx_replay_1");
    mockPaymentOrderPersistence(order);

    const grantCalls: string[] = [];
    mock.method(billingService, "upsertSubscriptionFromProviderEvent", async (event: ProviderSubscriptionEvent) => {
      grantCalls.push(event.providerEventId);
      return {
        subscription: {
          id: "sub_replay_1",
          userId: event.userId,
          planCode: event.planCode,
          status: event.status,
          provider: event.provider,
          source: "provider" as const,
          providerSubscriptionId: event.providerSubscriptionId,
          billingCycle: event.billingCycle,
          currentPeriodStart: event.currentPeriodStart,
          currentPeriodEnd: event.currentPeriodEnd,
          entitlements: [{ key: "premium_templates" as const, grantedAt: new Date() }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        eventStatus: "processed" as const,
        eventId: "evt_replay_1",
      };
    });
    mock.method(receiptEmailService, "sendPaymentReceipt", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));
    const info = mock.method(console, "info", () => undefined);

    const firstResponse = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "secure-token": "expected-secret" }),
      firstResponse as unknown as Response,
    );

    const grantCountAfterFirstWebhook = grantCalls.length;
    const completedAtAfterFirstWebhook = order.completedAt;
    const receiptSentAtAfterFirstWebhook = order.receiptSentAt;

    const secondResponse = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "secure-token": "expected-secret" }),
      secondResponse as unknown as Response,
    );

    assert.equal(firstResponse.statusCode, 200);
    assert.deepEqual(firstResponse.body, {
      success: true,
      processedCount: 1,
      message: "Đã xử lý 1 giao dịch.",
    });
    assert.equal(order.status, "completed");
    assert.equal(order.cassoTransactionId, "tx_replay_1");
    assert.equal(grantCountAfterFirstWebhook, 1);

    assert.equal(secondResponse.statusCode, 200);
    assert.deepEqual(secondResponse.body, {
      success: true,
      processedCount: 0,
      message: "Không có giao dịch nào khớp với đơn hàng đang chờ.",
    });
    assert.equal(grantCalls.length, grantCountAfterFirstWebhook);
    assert.equal(order.completedAt, completedAtAfterFirstWebhook);
    assert.equal(order.receiptSentAt, receiptSentAtAfterFirstWebhook);

    const replayLog = info.mock.calls
      .map((call) => call.arguments[0])
      .find((arg): arg is Record<string, unknown> => {
        return Boolean(arg) && typeof arg === "object" && (arg as Record<string, unknown>).event === "casso_webhook_replay_ignored";
      });
    assert.ok(replayLog);
    assert.equal(replayLog.message, "webhook replay ignored");
    assert.equal(replayLog.transactionId, "tx_replay_1");
  });
});
