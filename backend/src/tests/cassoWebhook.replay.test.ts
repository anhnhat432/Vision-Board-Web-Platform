import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
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
  provider: string;
  expiresAt: Date;
  completedAt?: Date;
  cassoTransactionId?: string;
  receiptEmail?: string;
  receiptName?: string;
  receiptSentAt?: Date;
  receiptLastError?: string;
  metadata?: {
    casso?: {
      webhookProcessingStartedAt?: Date;
    };
  };
  updatedAt: Date;
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

beforeEach(() => {
  (FailedReceiptQueueModel as any).deleteOne = async () => ({ acknowledged: true, deletedCount: 1 });
  (FailedReceiptQueueModel as any).updateOne = async () => ({ acknowledged: true, modifiedCount: 1 });
});

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

function createRequest(body: unknown, headers: Record<string, string> = {}, rawBody?: string): Request {
  return {
    body,
    headers,
    ...(rawBody ? { rawBody: Buffer.from(rawBody, "utf-8") } : {}),
  } as Request;
}

function createOrder(overrides: Partial<MockCassoPaymentOrder> = {}): MockCassoPaymentOrder {
  return {
    _id: `payment_order_${Date.now()}`,
    orderId: "VBREPLAY01",
    userId: `user_casso_replay_${Date.now()}`,
    amount: 99000,
    currency: "VND",
    status: "pending",
    provider: "casso",
    receiptEmail: "buyer@example.test",
    receiptName: "Buyer",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    updatedAt: new Date(),
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

function createPayloadWithDescription(description: string, transactionId: string) {
  return {
    error: 0,
    data: [
      {
        id: transactionId,
        tid: transactionId,
        description,
        amount: 99000,
        when: "2026-05-14 12:00:00",
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getOrderCassoProcessingStartedAt(order: MockCassoPaymentOrder): Date | undefined {
  return order.metadata?.casso?.webhookProcessingStartedAt;
}

function isBeforeDate(value: unknown, before: unknown): boolean {
  return value instanceof Date && before instanceof Date && value.getTime() < before.getTime();
}

function matchesClaimCondition(condition: Record<string, unknown>, order: MockCassoPaymentOrder): boolean {
  if ("cassoTransactionId" in condition) {
    const cassoCondition = condition.cassoTransactionId;
    if (isRecord(cassoCondition) && cassoCondition.$exists === false) {
      if (order.cassoTransactionId !== undefined) return false;
    } else if (cassoCondition === null) {
      if (order.cassoTransactionId !== null && order.cassoTransactionId !== undefined) return false;
    } else if (cassoCondition !== order.cassoTransactionId) {
      return false;
    }
  }

  const processingStartedCondition = condition["metadata.casso.webhookProcessingStartedAt"];
  if (processingStartedCondition !== undefined) {
    const processingStartedAt = getOrderCassoProcessingStartedAt(order);
    if (isRecord(processingStartedCondition) && processingStartedCondition.$exists === false) {
      if (processingStartedAt !== undefined) return false;
    } else if (isRecord(processingStartedCondition) && "$lt" in processingStartedCondition) {
      if (!isBeforeDate(processingStartedAt, processingStartedCondition.$lt)) return false;
    }
  }

  const updatedAtCondition = condition.updatedAt;
  if (isRecord(updatedAtCondition) && "$lt" in updatedAtCondition) {
    if (!isBeforeDate(order.updatedAt, updatedAtCondition.$lt)) return false;
  }

  return true;
}

function setNestedOrderValue(order: MockCassoPaymentOrder, key: string, value: unknown): void {
  if (key === "metadata.casso.webhookProcessingStartedAt" && value instanceof Date) {
    order.metadata = {
      ...order.metadata,
      casso: {
        ...order.metadata?.casso,
        webhookProcessingStartedAt: value,
      },
    };
  }
}

function unsetNestedOrderValue(order: MockCassoPaymentOrder, key: string): void {
  if (key === "metadata.casso.webhookProcessingStartedAt" && order.metadata?.casso) {
    delete order.metadata.casso.webhookProcessingStartedAt;
  }
}

function mockPaymentOrderPersistence(order: MockCassoPaymentOrder): void {
  (PaymentOrderModel as unknown as MockableModel).findOne = async (query: unknown) => {
    const filters = query as Record<string, unknown>;
    if (typeof filters.provider === "string" && filters.provider !== order.provider) return null;
    if (filters.cassoTransactionId) {
      return filters.cassoTransactionId === order.cassoTransactionId ? order : null;
    }
    if (filters.orderId === order.orderId && filters.status === "pending" && order.status === "pending") return order;
    if (filters.orderId === order.orderId && !("status" in filters)) return order;
    return null;
  };
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = async (query: unknown, update: unknown) => {
    const filters = query as Record<string, unknown>;
    if (typeof filters.provider === "string" && filters.provider !== order.provider) return null;
    if (filters._id !== order._id || filters.status !== "pending" || order.status !== "pending") {
      return null;
    }
    const claimConditions = filters.$or;
    if (Array.isArray(claimConditions) && !claimConditions.some((condition) => {
      return isRecord(condition) && matchesClaimCondition(condition, order);
    })) {
      return null;
    }

    const patch = update as { $set?: Record<string, unknown>; $unset?: Record<string, unknown> };
    const set = patch.$set ?? {};
    if (typeof set.status === "string") {
      order.status = set.status as PaymentOrderStatus;
    }
    if (set.completedAt instanceof Date) {
      order.completedAt = set.completedAt;
    }
    if (typeof set.cassoTransactionId === "string") {
      order.cassoTransactionId = set.cassoTransactionId;
    }
    for (const [key, value] of Object.entries(set)) {
      setNestedOrderValue(order, key, value);
    }
    for (const key of Object.keys(patch.$unset ?? {})) {
      unsetNestedOrderValue(order, key);
    }
    order.updatedAt = new Date();
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
  delete process.env.CASSO_WEBHOOK_CHECKSUM_KEY;
  delete process.env.CASSO_CHECKSUM_KEY;
  delete process.env.CASSO_SECURE_TOKEN;
});

describe("Casso webhook replay protection", () => {
  it("does not complete a non-Casso order even when the transfer description contains its orderId", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const payosOrder = createOrder({ provider: "payos" });
    const payload = createPayload(payosOrder.orderId, "tx_cross_provider_payos");
    mockPaymentOrderPersistence(payosOrder);

    let grantCalls = 0;
    mock.method(billingService, "upsertSubscriptionFromProviderEvent", async () => {
      grantCalls++;
      throw new Error("should_not_grant_for_non_casso_order");
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
    assert.equal(payosOrder.status, "pending");
    assert.equal(payosOrder.cassoTransactionId, undefined);
  });

  it("uses a provider-scoped atomic claim before granting a Casso order", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const order = createOrder();
    const payload = createPayload(order.orderId, "tx_provider_scoped_claim");
    mockPaymentOrderPersistence(order);

    const originalFindOneAndUpdate = (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate;
    (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = async (query: unknown, update: unknown) => {
      const filters = query as Record<string, unknown>;
      if (filters._id === order._id && filters.status === "pending" && filters.provider !== "casso") {
        return null;
      }
      return (originalFindOneAndUpdate as (query: unknown, update: unknown) => Promise<MockCassoPaymentOrder | null>)(
        query,
        update,
      );
    };

    const grantCalls: string[] = [];
    mock.method(billingService, "upsertSubscriptionFromProviderEvent", async (event: ProviderSubscriptionEvent) => {
      grantCalls.push(event.providerEventId);
      return {
        subscription: {
          id: "sub_provider_scoped_claim",
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
        eventId: "evt_provider_scoped_claim",
      };
    });
    mock.method(receiptEmailService, "sendPaymentReceipt", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));

    const response = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "secure-token": "expected-secret" }),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      success: true,
      processedCount: 1,
      message: "Đã xử lý 1 giao dịch.",
    });
    assert.equal(order.status, "completed");
    assert.equal(order.cassoTransactionId, "tx_provider_scoped_claim");
    assert.equal(grantCalls.length, 1);
  });

  it("does not log raw bank transfer descriptions when no order id is present", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const sensitiveDescription = "Thanh toan cua Nguyen Van A so dien thoai 0901234567";
    const payload = createPayloadWithDescription(sensitiveDescription, "tx_missing_order_id");
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
    assert.equal(
      info.mock.calls.some((call) => JSON.stringify(call.arguments).includes(sensitiveDescription)),
      false,
    );
  });

  it("accepts an x-casso-signature generated from the raw webhook body", async () => {
    process.env.CASSO_WEBHOOK_CHECKSUM_KEY = "expected-checksum-secret";
    const order = createOrder();
    const rawBody = JSON.stringify(createPayload(order.orderId, "tx_hmac_raw_body"));
    const payload = JSON.parse(rawBody);
    const signature = createHmac("sha512", "expected-checksum-secret").update(rawBody).digest("hex");
    mockPaymentOrderPersistence(order);

    const grantCalls: string[] = [];
    mock.method(billingService, "upsertSubscriptionFromProviderEvent", async (event: ProviderSubscriptionEvent) => {
      grantCalls.push(event.providerEventId);
      return {
        subscription: {
          id: "sub_hmac_raw_body",
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
        eventId: "evt_hmac_raw_body",
      };
    });
    mock.method(receiptEmailService, "sendPaymentReceipt", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));

    const response = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "x-casso-signature": signature }, rawBody),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      success: true,
      processedCount: 1,
      message: "Đã xử lý 1 giao dịch.",
    });
    assert.equal(order.status, "completed");
    assert.equal(grantCalls.length, 1);
  });

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

  it("keeps a failed subscription grant retryable instead of completing the order", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const order = createOrder();
    const payload = createPayload(order.orderId, "tx_retry_after_grant_failure");
    mockPaymentOrderPersistence(order);

    const grantCalls: string[] = [];
    mock.method(billingService, "upsertSubscriptionFromProviderEvent", async (event: ProviderSubscriptionEvent) => {
      grantCalls.push(event.providerEventId);
      if (grantCalls.length === 1) {
        throw new Error("temporary entitlement store outage");
      }
      return {
        subscription: {
          id: "sub_retry_after_failure",
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
        eventId: "evt_retry_after_failure",
      };
    });
    mock.method(receiptEmailService, "sendPaymentReceipt", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));

    const firstResponse = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "secure-token": "expected-secret" }),
      firstResponse as unknown as Response,
    );

    assert.equal(firstResponse.statusCode, 500);
    assert.equal(order.status, "pending");
    assert.equal(order.completedAt, undefined);
    assert.equal(order.cassoTransactionId, undefined);
    assert.equal(grantCalls.length, 1);

    const secondResponse = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "secure-token": "expected-secret" }),
      secondResponse as unknown as Response,
    );

    assert.equal(secondResponse.statusCode, 200);
    assert.deepEqual(secondResponse.body, {
      success: true,
      processedCount: 1,
      message: "Đã xử lý 1 giao dịch.",
    });
    assert.equal(order.status, "completed");
    assert.equal(order.cassoTransactionId, "tx_retry_after_grant_failure");
    assert.equal(grantCalls.length, 2);
  });

  it("retries a stale pending Casso processing claim instead of skipping a paid order", async () => {
    process.env.CASSO_WEBHOOK_SECRET = "expected-secret";
    const staleStartedAt = new Date(Date.now() - 11 * 60 * 1000);
    const order = createOrder({
      status: "pending",
      cassoTransactionId: "tx_stale_claim",
      updatedAt: staleStartedAt,
    });
    const payload = createPayload(order.orderId, "tx_stale_claim");
    mockPaymentOrderPersistence(order);

    const grantCalls: string[] = [];
    mock.method(billingService, "upsertSubscriptionFromProviderEvent", async (event: ProviderSubscriptionEvent) => {
      grantCalls.push(event.providerEventId);
      return {
        subscription: {
          id: "sub_stale_claim",
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
        eventId: "evt_stale_claim",
      };
    });
    mock.method(receiptEmailService, "sendPaymentReceipt", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));

    const response = createResponse();
    await handleCassoWebhook(
      createRequest(payload, { "secure-token": "expected-secret" }),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      success: true,
      processedCount: 1,
      message: "Đã xử lý 1 giao dịch.",
    });
    assert.equal(order.status, "completed");
    assert.equal(order.cassoTransactionId, "tx_stale_claim");
    assert.equal(grantCalls.length, 1);
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
