import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it, beforeEach, afterEach } from "node:test";
import express, { type Express } from "express";

import { errorMiddleware } from "../middleware/errorMiddleware";
import { PaymentOrderModel, type PaymentOrderStatus } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import { webhookRoutes } from "../routes/webhookRoutes";
import { billingService } from "../services/billingServiceInstance";
import {
  _resetAdapterCacheForTesting,
} from "../services/paymentProviderRegistry";
import {
  createMockWebhookBody,
  MOCK_VALID_SIGNATURE,
} from "../services/mockPaymentAdapter";

// ─── Test Helpers ────────────────────────────────────────────────────────────

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
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

afterEach(() => {
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  delete process.env.CASSO_WEBHOOK_SECRET;
  delete process.env.CASSO_WEBHOOK_CHECKSUM_KEY;
  delete process.env.CASSO_CHECKSUM_KEY;
  delete process.env.CASSO_SECURE_TOKEN;
});

/**
 * Create a test app that mounts webhook routes WITHOUT auth middleware,
 * matching production behavior.
 */
function createWebhookTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", webhookRoutes);
  app.use(errorMiddleware);
  return app;
}

async function postWebhook(
  app: Express,
  provider: string,
  body: string,
  headers: Record<string, string> = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/billing/webhook/${provider}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...headers,
        },
        body,
      },
    );
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

// ─── Tests ───────────────────────────────────────────────────────────────────

function createMockCassoPaymentOrder(overrides: Partial<MockCassoPaymentOrder> = {}): MockCassoPaymentOrder {
  const order: MockCassoPaymentOrder = {
    orderId: "VBQA000001",
    userId: "user_casso_webhook",
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

  return order;
}

function createCassoWebhookBody(input: { orderId?: string; amount: number; transactionId: string }): string {
  return JSON.stringify({
    error: 0,
    data: [
      {
        id: input.transactionId,
        tid: input.transactionId,
        description: input.orderId ? `Thanh toan ${input.orderId}` : "Thanh toan sai noi dung",
        amount: input.amount,
        when: "2026-05-08 12:00:00",
      },
    ],
  });
}

function mockCassoPersistence(order: MockCassoPaymentOrder | null): { paymentOrderQueries: unknown[] } {
  const paymentOrderQueries: unknown[] = [];

  (PaymentOrderModel as unknown as MockableModel).findOne = async (query: unknown) => {
    paymentOrderQueries.push(query);
    const filters = query as Record<string, unknown>;

    if ("cassoTransactionId" in filters) {
      if (order && filters.cassoTransactionId === order.cassoTransactionId) {
        return order;
      }
      return null;
    }

    if (
      order &&
      filters.orderId === order.orderId &&
      filters.status === "pending" &&
      order.status === "pending"
    ) {
      return order;
    }

    return null;
  };

  (UserModel as unknown as MockableModel).findOne = () => ({
    select() {
      return {
        async lean() {
          return null;
        },
      };
    },
  });

  return { paymentOrderQueries };
}

function cassoHeaders(): Record<string, string> {
  process.env.CASSO_WEBHOOK_SECRET = "casso_test_secret";
  return { "secure-token": "casso_test_secret" };
}

describe("POST /api/billing/webhook/:provider", () => {
  const testUserId = "user_webhook_test";
  let eventCounter = 0;

  function uniqueEventId(): string {
    eventCounter++;
    return `webhook_test_evt_${eventCounter}_${Date.now()}`;
  }

  function uniqueSubId(): string {
    return `webhook_test_sub_${eventCounter}_${Date.now()}`;
  }

  beforeEach(() => {
    _resetAdapterCacheForTesting();
    delete process.env.BILLING_PROVIDER;
    process.env.BILLING_PAID_DISABLED = "true";
  });

  afterEach(() => {
    _resetAdapterCacheForTesting();
    delete process.env.BILLING_PROVIDER;
    delete process.env.BILLING_PAID_DISABLED;
  });

  it("accepts a valid mock webhook and updates subscription", async () => {
    const eventId = uniqueEventId();
    const subId = uniqueSubId();
    const body = createMockWebhookBody({
      userId: testUserId,
      planCode: "PLUS",
      status: "active",
      eventType: "checkout_completed",
      eventId,
      subscriptionId: subId,
    });

    const response = await postWebhook(createWebhookTestApp(), "mock", body);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.status, "processed");
    assert.equal(response.body.eventId, eventId);

    // Verify entitlement was actually granted
    const snapshot = await billingService.getCurrentEntitlementForUser(testUserId);
    assert.equal(snapshot.planCode, "PLUS");
    assert.equal(snapshot.status, "active");
    assert.ok(snapshot.activeKeys.length > 0);
    assert.ok(snapshot.activeKeys.includes("premium_templates"));
  });

  it("returns 200 no-op for duplicate event (idempotent)", async () => {
    const eventId = uniqueEventId();
    const subId = uniqueSubId();
    const userId = "user_webhook_dup_test";
    const body = createMockWebhookBody({
      userId,
      planCode: "PLUS",
      status: "active",
      eventType: "checkout_completed",
      eventId,
      subscriptionId: subId,
    });

    // First call
    const first = await postWebhook(createWebhookTestApp(), "mock", body);
    assert.equal(first.status, 200);
    assert.equal(first.body.status, "processed");

    // Duplicate call
    const second = await postWebhook(createWebhookTestApp(), "mock", body);
    assert.equal(second.status, 200);
    assert.equal(second.body.status, "duplicate");
  });

  it("handles subscription_canceled and removes entitlements", async () => {
    const userId = "user_webhook_cancel_test";
    const subId = uniqueSubId();

    // First: activate
    const activateBody = createMockWebhookBody({
      userId,
      planCode: "PLUS",
      status: "active",
      eventType: "checkout_completed",
      eventId: uniqueEventId(),
      subscriptionId: subId,
    });
    await postWebhook(createWebhookTestApp(), "mock", activateBody);

    // Verify active
    let snapshot = await billingService.getCurrentEntitlementForUser(userId);
    assert.equal(snapshot.planCode, "PLUS");
    assert.ok(snapshot.activeKeys.length > 0);

    // Then: cancel
    const cancelBody = createMockWebhookBody({
      userId,
      planCode: "PLUS",
      status: "canceled",
      eventType: "subscription_canceled",
      eventId: uniqueEventId(),
      subscriptionId: subId,
    });
    await postWebhook(createWebhookTestApp(), "mock", cancelBody);

    // Verify entitlements revoked
    snapshot = await billingService.getCurrentEntitlementForUser(userId);
    assert.equal(snapshot.status, "canceled");
    assert.deepEqual(snapshot.activeKeys, []);
  });

  it("payment_failed does NOT grant entitlements", async () => {
    const userId = "user_webhook_fail_test";
    const body = createMockWebhookBody({
      userId,
      planCode: "PLUS",
      status: "active", // Intentionally wrong — webhook controller must override
      eventType: "payment_failed",
      eventId: uniqueEventId(),
      subscriptionId: uniqueSubId(),
    });

    const response = await postWebhook(createWebhookTestApp(), "mock", body);
    assert.equal(response.status, 200);
    assert.equal(response.body.status, "processed");

    // Verify NO entitlements granted
    const snapshot = await billingService.getCurrentEntitlementForUser(userId);
    assert.equal(snapshot.status, "past_due");
    assert.deepEqual(snapshot.activeKeys, []);
  });

  it("acknowledges unknown event types with 200 (no processing)", async () => {
    const body = createMockWebhookBody({
      userId: "user_webhook_unknown_test",
      eventType: "unknown",
      eventId: uniqueEventId(),
    });

    const response = await postWebhook(createWebhookTestApp(), "mock", body);
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.status, "ignored");
  });

  it("ignores events with no userId", async () => {
    const body = JSON.stringify({
      eventId: uniqueEventId(),
      eventType: "checkout_completed",
      rawEventType: "mock.checkout.completed",
      userId: "", // empty
      planCode: "PLUS",
      status: "active",
      subscriptionId: uniqueSubId(),
    });

    const response = await postWebhook(createWebhookTestApp(), "mock", body);
    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ignored");
  });

  it("returns 200 for non-active provider (acknowledged, not processed)", async () => {
    process.env.BILLING_PROVIDER = "casso";
    const body = createMockWebhookBody({
      userId: testUserId,
      eventId: uniqueEventId(),
    });

    // Send to a generic inactive provider when active provider is "casso".
    // PayOS has a dedicated checksum-verified controller and no longer uses the generic handler.
    const response = await postWebhook(createWebhookTestApp(), "vnpay", body);
    assert.equal(response.status, 200);
    assert.ok((response.body.message as string).includes("not active"));
  });

  it("webhook does not require Firebase auth (no auth header needed)", async () => {
    const body = createMockWebhookBody({
      userId: "user_webhook_noauth",
      eventId: uniqueEventId(),
      subscriptionId: uniqueSubId(),
    });

    // No Authorization header — should still work
    const response = await postWebhook(createWebhookTestApp(), "mock", body);
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
  });

  it("rejects malformed provider parameters before adapter lookup", async () => {
    const body = createMockWebhookBody({
      userId: "user_webhook_bad_provider",
      eventId: uniqueEventId(),
      subscriptionId: uniqueSubId(),
    });

    const response = await postWebhook(createWebhookTestApp(), "mock!", body);

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_provider");
  });
});

describe("POST /api/billing/webhook/casso validation", () => {
  it("rejects malformed Casso transaction payloads", async () => {
    const response = await postWebhook(
      createWebhookTestApp(),
      "casso",
      JSON.stringify({ error: 0, data: "not-an-array" }),
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_payload");
  });
});

describe("POST /api/billing/webhook/casso payment matching", () => {
  it("does not grant PLUS twice for a duplicate Casso webhook", async () => {
    const userId = `user_casso_duplicate_${Date.now()}`;
    const order = createMockCassoPaymentOrder({
      orderId: "VBDUP00001",
      userId,
      amount: 2000,
    });
    mockCassoPersistence(order);
    const body = createCassoWebhookBody({
      orderId: order.orderId,
      amount: 2000,
      transactionId: `tx_dup_${Date.now()}`,
    });

    const first = await postWebhook(createWebhookTestApp(), "casso", body, cassoHeaders());

    assert.equal(first.status, 200);
    assert.equal(first.body.processedCount, 1);
    assert.equal(order.status, "completed");
    assert.equal(order.saveCalls, 1);

    const firstSnapshot = await billingService.getCurrentEntitlementForUser(userId);
    assert.equal(firstSnapshot.planCode, "PLUS");
    assert.equal(firstSnapshot.activeKeys.length, 4);

    const second = await postWebhook(createWebhookTestApp(), "casso", body, cassoHeaders());
    const secondSnapshot = await billingService.getCurrentEntitlementForUser(userId);

    assert.equal(second.status, 200);
    assert.equal(second.body.processedCount, 0);
    assert.deepEqual(secondSnapshot.activeKeys, firstSnapshot.activeKeys);
    assert.equal(order.saveCalls, 1);
  });

  it("does not grant PLUS when transferred amount is too low", async () => {
    const userId = `user_casso_underpaid_${Date.now()}`;
    const order = createMockCassoPaymentOrder({
      orderId: "VBLOW00001",
      userId,
      amount: 2000,
    });
    mockCassoPersistence(order);

    const response = await postWebhook(
      createWebhookTestApp(),
      "casso",
      createCassoWebhookBody({
        orderId: order.orderId,
        amount: 1000,
        transactionId: `tx_low_${Date.now()}`,
      }),
      cassoHeaders(),
    );
    const snapshot = await billingService.getCurrentEntitlementForUser(userId);

    assert.equal(response.status, 200);
    assert.equal(response.body.processedCount, 0);
    assert.equal(order.status, "pending");
    assert.equal(order.saveCalls, 0);
    assert.equal(snapshot.planCode, "FREE");
    assert.deepEqual(snapshot.activeKeys, []);
  });

  it("does not grant PLUS when transfer description has no order id", async () => {
    const order = createMockCassoPaymentOrder({
      orderId: "VBMISS001",
      userId: `user_casso_wrong_description_${Date.now()}`,
    });
    const { paymentOrderQueries } = mockCassoPersistence(order);

    const response = await postWebhook(
      createWebhookTestApp(),
      "casso",
      createCassoWebhookBody({
        amount: 2000,
        transactionId: `tx_wrong_desc_${Date.now()}`,
      }),
      cassoHeaders(),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.processedCount, 0);
    assert.equal(order.status, "pending");
    assert.equal(order.saveCalls, 0);
    assert.equal(paymentOrderQueries.length, 0);
  });

  it("expires a stale pending order without granting PLUS", async () => {
    const userId = `user_casso_expired_${Date.now()}`;
    const order = createMockCassoPaymentOrder({
      orderId: "VBEXP00001",
      userId,
      amount: 2000,
      expiresAt: new Date(Date.now() - 1000),
    });
    mockCassoPersistence(order);

    const response = await postWebhook(
      createWebhookTestApp(),
      "casso",
      createCassoWebhookBody({
        orderId: order.orderId,
        amount: 2000,
        transactionId: `tx_expired_${Date.now()}`,
      }),
      cassoHeaders(),
    );
    const snapshot = await billingService.getCurrentEntitlementForUser(userId);

    assert.equal(response.status, 200);
    assert.equal(response.body.processedCount, 0);
    assert.equal(order.status, "expired");
    assert.equal(order.saveCalls, 1);
    assert.equal(snapshot.planCode, "FREE");
    assert.deepEqual(snapshot.activeKeys, []);
  });
});

describe("Webhook signature verification", () => {
  // To test signature rejection, we need the signature-checking adapter.
  // We test this at the unit level since the route uses getPaymentProviderAdapter().

  it("rejects invalid signature via adapter", () => {
    const { createMockPaymentAdapterWithSignature: createSigAdapter } =
      require("../services/mockPaymentAdapter");
    const adapter = createSigAdapter();

    const result = adapter.verifyWebhookSignature({
      rawBody: '{"test": true}',
      headers: { "x-mock-signature": "wrong-signature" },
    });
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes("Invalid"));
  });

  it("accepts valid signature via adapter", () => {
    const { createMockPaymentAdapterWithSignature: createSigAdapter } =
      require("../services/mockPaymentAdapter");
    const adapter = createSigAdapter();

    const result = adapter.verifyWebhookSignature({
      rawBody: '{"test": true}',
      headers: { "x-mock-signature": MOCK_VALID_SIGNATURE },
    });
    assert.equal(result.valid, true);
  });

  it("rejects missing signature via adapter", () => {
    const { createMockPaymentAdapterWithSignature: createSigAdapter } =
      require("../services/mockPaymentAdapter");
    const adapter = createSigAdapter();

    const result = adapter.verifyWebhookSignature({
      rawBody: '{"test": true}',
      headers: {},
    });
    assert.equal(result.valid, false);
  });
});
