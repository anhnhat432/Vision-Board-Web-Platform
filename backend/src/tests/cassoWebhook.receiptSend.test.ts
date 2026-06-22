import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { Request, Response } from "express";

import { handleCassoWebhook } from "../controllers/cassoWebhookController";
import { PaymentOrderModel, type PaymentOrderStatus } from "../models/PaymentOrderModel";
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
  planCode: string;
  billingCycle: string;
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
  updateOne: unknown;
};

const originalPaymentOrderFindOne = PaymentOrderModel.findOne;
const originalPaymentOrderFindOneAndUpdate = PaymentOrderModel.findOneAndUpdate;
const originalPaymentOrderUpdateOne = PaymentOrderModel.updateOne;
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
    orderId: "VBRCPT0001",
    userId: "user_casso_receipt",
    planCode: "PLUS",
    billingCycle: "twelve_week",
    amount: 99000,
    currency: "VND",
    status: "pending",
    receiptEmail: "buyer@example.test",
    receiptName: "Người mua",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    saveCalls: 0,
    async save() {
      this.saveCalls++;
      return this;
    },
    ...overrides,
  };
}

function createPayload(orderId: string) {
  return {
    error: 0,
    data: [
      {
        id: "tx_receipt_1",
        tid: "tx_receipt_1",
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
    if (filters.cassoTransactionId) return null;
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
  (PaymentOrderModel as unknown as MockableModel).updateOne = async () => ({ acknowledged: true, modifiedCount: 1 });
}

afterEach(() => {
  mock.restoreAll();
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = originalPaymentOrderFindOneAndUpdate;
  (PaymentOrderModel as unknown as MockableModel).updateOne = originalPaymentOrderUpdateOne;
  (FailedReceiptQueueModel as any).deleteOne = originalFailedReceiptDeleteOne;
  (FailedReceiptQueueModel as any).updateOne = originalFailedReceiptUpdateOne;
  delete process.env.CASSO_WEBHOOK_SECRET;
});

describe("Casso webhook receipt sending", () => {
  it("sends a payment receipt with the completed order payload", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const order = createOrder();
    mockPaymentOrderPersistence(order);
    const sendPaymentReceiptMock = mock.method(receiptEmailService, "sendPaymentReceipt", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));
    const response = createResponse();

    await handleCassoWebhook(
      createRequest(createPayload(order.orderId), { "secure-token": "expected-secret" }),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(order.status, "completed");
    assert.ok(order.completedAt);
    assert.equal(order.cassoTransactionId, "tx_receipt_1");
    assert.equal(order.receiptSentAt instanceof Date, true);
    assert.equal(sendPaymentReceiptMock.mock.callCount(), 1);
    const firstCall = sendPaymentReceiptMock.mock.calls[0];
    assert.ok(firstCall);
    const [payload] = firstCall.arguments;
    assert.ok(payload);
    assert.equal(payload.orderId, order.orderId);
    assert.equal(payload.userEmail, "buyer@example.test");
    assert.equal(payload.userName, "Người mua");
    assert.equal(payload.amount, 99000);
    assert.equal(payload.currency, "VND");
    assert.equal(payload.planName, "Plus 12 tuần");
    assert.equal(payload.paymentRef, "tx_receipt_1");
    assert.equal(payload.paidAt, order.completedAt);
  });
});
