import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it, beforeEach, afterEach } from "node:test";
import express, { type Express } from "express";

import { errorMiddleware } from "../middleware/errorMiddleware";
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
  });

  afterEach(() => {
    _resetAdapterCacheForTesting();
    delete process.env.BILLING_PROVIDER;
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

    // Send to "payos" when active provider is "casso"
    const response = await postWebhook(createWebhookTestApp(), "payos", body);
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
