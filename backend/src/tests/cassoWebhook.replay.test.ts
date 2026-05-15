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
};

const originalPaymentOrderFindOne = PaymentOrderModel.findOne;
const originalUserFindOne = UserModel.findOne;

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
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  delete process.env.CASSO_WEBHOOK_SECRET;
});

describe("Casso webhook replay protection", () => {
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
