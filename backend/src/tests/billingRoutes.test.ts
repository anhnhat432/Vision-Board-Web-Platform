import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it, beforeEach, afterEach } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { billingRoutes } from "../routes/billingRoutes";
import { billingService } from "../services/billingServiceInstance";
import { _resetAdapterCacheForTesting } from "../services/paymentProviderRegistry";

// ─── Test Helpers ────────────────────────────────────────────────────────────

const ownerUserId = "user_billing_route_owner";
const otherUserId = "user_billing_route_other";
const checkoutUserId = "user_checkout_test";

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

function createBillingTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") return { uid: ownerUserId, email: "owner@test.com" };
        if (token === "other-token") return { uid: otherUserId, email: "other@test.com" };
        if (token === "checkout-token") return { uid: checkoutUserId, email: "checkout@test.com" };
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", billingRoutes);
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
  if (options.token !== null) headers.authorization = `Bearer ${options.token ?? "owner-token"}`;
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

// ─── GET /api/billing/entitlement Tests ──────────────────────────────────────

describe("GET /api/billing/entitlement", () => {
  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createBillingTestApp(), "GET", "/api/billing/entitlement", {
      token: null,
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "unauthorized");
  });

  it("returns FREE with no entitlements for new user", async () => {
    const response = await requestJson(createBillingTestApp(), "GET", "/api/billing/entitlement", {
      token: "owner-token",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.planCode, "FREE");
    assert.equal(data.status, "none");
    assert.deepEqual(data.entitlements, []);
    assert.equal(data.source, "default");
    assert.ok(data.resolvedAt);
  });

  it("returns PLUS with all entitlements for active subscription", async () => {
    // Create a mock PLUS subscription for a dedicated test user.
    const testUserId = "user_billing_route_plus_test";
    await billingService.createMockOrManualEntitlement(testUserId, "PLUS", "mock");

    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createAuthMiddleware({
        async verifyIdToken(token: string) {
          if (token === "plus-token") return { uid: testUserId, email: "plus@test.com" };
          throw new Error("Invalid test token");
        },
      }),
    );
    app.use("/api", billingRoutes);
    app.use(errorMiddleware);

    const response = await requestJson(app, "GET", "/api/billing/entitlement", {
      token: "plus-token",
    });

    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.planCode, "PLUS");
    assert.equal(data.status, "active");
    assert.equal(data.source, "mock");

    const entitlements = data.entitlements as string[];
    assert.equal(entitlements.length, 4);
    assert.ok(entitlements.includes("premium_templates"));
    assert.ok(entitlements.includes("premium_review_insights"));
    assert.ok(entitlements.includes("priority_reminders"));
    assert.ok(entitlements.includes("advanced_analytics"));
  });

  it("returns no active entitlements for canceled subscription", async () => {
    const testUserId = "user_billing_route_canceled_test";

    // Create then cancel via provider event.
    await billingService.upsertSubscriptionFromProviderEvent({
      provider: "test",
      providerEventId: "evt_route_create",
      eventType: "subscription_created",
      payloadHash: "hash_create",
      userId: testUserId,
      planCode: "PLUS",
      status: "active",
      providerSubscriptionId: "prov_route_sub_1",
    });
    await billingService.upsertSubscriptionFromProviderEvent({
      provider: "test",
      providerEventId: "evt_route_cancel",
      eventType: "subscription_canceled",
      payloadHash: "hash_cancel",
      userId: testUserId,
      planCode: "PLUS",
      status: "canceled",
      canceledAt: new Date(),
      providerSubscriptionId: "prov_route_sub_1",
    });

    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createAuthMiddleware({
        async verifyIdToken(token: string) {
          if (token === "canceled-token") return { uid: testUserId, email: "canceled@test.com" };
          throw new Error("Invalid test token");
        },
      }),
    );
    app.use("/api", billingRoutes);
    app.use(errorMiddleware);

    const response = await requestJson(app, "GET", "/api/billing/entitlement", {
      token: "canceled-token",
    });

    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.planCode, "PLUS");
    assert.equal(data.status, "canceled");
    assert.deepEqual(data.entitlements, []);
  });

  it("does not leak entitlements across users", async () => {
    // owner gets no subscription, other gets no subscription.
    const ownerResponse = await requestJson(createBillingTestApp(), "GET", "/api/billing/entitlement", {
      token: "owner-token",
    });
    const otherResponse = await requestJson(createBillingTestApp(), "GET", "/api/billing/entitlement", {
      token: "other-token",
    });

    const ownerData = ownerResponse.body.data as Record<string, unknown>;
    const otherData = otherResponse.body.data as Record<string, unknown>;

    assert.equal(ownerData.planCode, "FREE");
    assert.equal(otherData.planCode, "FREE");
    assert.deepEqual(ownerData.entitlements, []);
    assert.deepEqual(otherData.entitlements, []);
  });

  it("does not expose provider secrets in response", async () => {
    const response = await requestJson(createBillingTestApp(), "GET", "/api/billing/entitlement", {
      token: "owner-token",
    });

    assert.equal(response.status, 200);
    const body = JSON.stringify(response.body);
    assert.equal(body.includes("providerCustomerId"), false);
    assert.equal(body.includes("providerSubscriptionId"), false);
    assert.equal(body.includes("provider"), false);
    assert.equal(body.includes("payloadHash"), false);
  });
});

// ─── POST /api/billing/checkout-session Tests ────────────────────────────────

describe("POST /api/billing/checkout-session", () => {
  const validBody = {
    planCode: "PLUS",
    returnUrl: "https://example.com/billing?status=success",
    cancelUrl: "https://example.com/billing?status=cancel",
  };

  beforeEach(() => {
    _resetAdapterCacheForTesting();
    delete process.env.BILLING_PROVIDER;
    delete process.env.CASSO_WEBHOOK_SECRET;
    delete process.env.CASSO_BANK_ACCOUNT;
    delete process.env.CASSO_BANK_NAME;
    delete process.env.CASSO_ACCOUNT_NAME;
    delete process.env.PLUS_PRICE_VND;
  });

  afterEach(() => {
    _resetAdapterCacheForTesting();
    delete process.env.BILLING_PROVIDER;
    delete process.env.CASSO_WEBHOOK_SECRET;
    delete process.env.CASSO_BANK_ACCOUNT;
    delete process.env.CASSO_BANK_NAME;
    delete process.env.CASSO_ACCOUNT_NAME;
    delete process.env.PLUS_PRICE_VND;
  });

  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: null,
      body: validBody,
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  it("returns 400 for invalid planCode", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: { ...validBody, planCode: "ENTERPRISE" },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_plan_code");
  });

  it("returns 400 for FREE planCode", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: { ...validBody, planCode: "FREE" },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_plan_code");
  });

  it("returns 400 for missing returnUrl", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: { planCode: "PLUS", cancelUrl: "https://example.com/cancel" },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_return_url");
  });

  it("returns 400 for missing cancelUrl", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: { planCode: "PLUS", returnUrl: "https://example.com/success" },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_cancel_url");
  });

  it("normalizes checkout input before creating a session", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: {
        planCode: " plus ",
        returnUrl: " https://example.com/billing?status=success ",
        cancelUrl: " https://example.com/billing?status=cancel ",
        billingCycle: "twelve_week",
        locale: " vi-VN ",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
  });

  it("creates a checkout session with mock provider and returns checkoutUrl", async () => {
    // BILLING_PROVIDER defaults to mock
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: validBody,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const data = response.body.data as Record<string, unknown>;
    assert.ok(typeof data.checkoutSessionId === "string");
    assert.ok((data.checkoutSessionId as string).startsWith("mock_session_"));
    assert.ok(typeof data.checkoutUrl === "string");
    assert.ok((data.checkoutUrl as string).includes("example.com"));
    assert.equal(data.provider, "mock");
    assert.ok(data.expiresAt);
  });

  it("does NOT grant entitlement after checkout session creation", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: validBody,
    });

    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    const entitlement = data.currentEntitlement as Record<string, unknown>;

    // The critical assertion: entitlement must still be FREE
    assert.equal(entitlement.planCode, "FREE");
    assert.equal(entitlement.status, "none");
    assert.deepEqual(entitlement.entitlements, []);
  });

  it("returns 503 when provider is configured but not implemented", async () => {
    process.env.BILLING_PROVIDER = "payos";
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: validBody,
    });

    assert.equal(response.status, 503);
    assert.equal(response.body.errorCode, "provider_not_configured");
  });

  it("returns 503 when Casso provider env is missing", async () => {
    process.env.BILLING_PROVIDER = "casso";
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: validBody,
    });

    assert.equal(response.status, 503);
    assert.equal(response.body.errorCode, "provider_not_configured");
  });
});

// ─── POST /api/billing/customer-portal Tests ─────────────────────────────────

describe("GET /api/billing/order-status/:orderId", () => {
  it("returns 400 for malformed order ids before database lookup", async () => {
    const response = await requestJson(createBillingTestApp(), "GET", "/api/billing/order-status/not-valid", {
      token: "checkout-token",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_order_id");
  });
});

describe("POST /api/billing/customer-portal", () => {
  const portalUserId = "user_portal_test";

  function createPortalTestApp(): Express {
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createAuthMiddleware({
        async verifyIdToken(token: string) {
          if (token === "portal-token") return { uid: portalUserId, email: "portal@test.com" };
          throw new Error("Invalid test token");
        },
      }),
    );
    app.use("/api", billingRoutes);
    app.use(errorMiddleware);
    return app;
  }

  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createPortalTestApp(), "POST", "/api/billing/customer-portal", {
      token: null,
      body: {},
    });
    assert.equal(response.status, 401);
  });

  it("returns unsupported for user with no subscription", async () => {
    const response = await requestJson(createPortalTestApp(), "POST", "/api/billing/customer-portal", {
      token: "portal-token",
      body: {},
    });
    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.supported, false);
  });

  it("returns portalUrl for PLUS user with mock provider", async () => {
    await billingService.createMockOrManualEntitlement(portalUserId, "PLUS", "mock");

    const response = await requestJson(createPortalTestApp(), "POST", "/api/billing/customer-portal", {
      token: "portal-token",
      body: { returnUrl: "https://example.com/billing" },
    });
    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.supported, true);
    assert.ok(typeof data.portalUrl === "string");
    assert.ok((data.portalUrl as string).length > 0);
  });
});

// ─── POST /api/billing/subscription/cancel Tests ─────────────────────────────

describe("POST /api/billing/subscription/cancel", () => {
  const cancelUserId = "user_cancel_test";

  function createCancelTestApp(): Express {
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createAuthMiddleware({
        async verifyIdToken(token: string) {
          if (token === "cancel-token") return { uid: cancelUserId, email: "cancel@test.com" };
          if (token === "free-token") return { uid: "user_cancel_free", email: "free@test.com" };
          throw new Error("Invalid test token");
        },
      }),
    );
    app.use("/api", billingRoutes);
    app.use(errorMiddleware);
    return app;
  }

  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createCancelTestApp(), "POST", "/api/billing/subscription/cancel", {
      token: null,
      body: {},
    });
    assert.equal(response.status, 401);
  });

  it("returns 400 for user with no subscription", async () => {
    const response = await requestJson(createCancelTestApp(), "POST", "/api/billing/subscription/cancel", {
      token: "free-token",
      body: {},
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "no_active_subscription");
  });

  it("marks cancelAtPeriodEnd and keeps entitlements for active subscription", async () => {
    await billingService.createMockOrManualEntitlement(cancelUserId, "PLUS", "mock");

    // Verify entitlements exist before cancel
    let snapshot = await billingService.getCurrentEntitlementForUser(cancelUserId);
    assert.equal(snapshot.planCode, "PLUS");
    assert.ok(snapshot.activeKeys.length > 0);

    const response = await requestJson(createCancelTestApp(), "POST", "/api/billing/subscription/cancel", {
      token: "cancel-token",
      body: {},
    });

    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.status, "pending_cancel");

    const entitlement = data.currentEntitlement as Record<string, unknown>;
    assert.equal(entitlement.cancelAtPeriodEnd, true);
    // Entitlements are NOT removed at cancel time
    assert.equal(entitlement.planCode, "PLUS");
    assert.ok((entitlement.entitlements as string[]).length > 0);

    // Verify entitlements still active via service
    snapshot = await billingService.getCurrentEntitlementForUser(cancelUserId);
    assert.equal(snapshot.status, "active");
    assert.ok(snapshot.activeKeys.length > 0);
  });

  it("returns already_pending_cancel for duplicate cancel", async () => {
    const response = await requestJson(createCancelTestApp(), "POST", "/api/billing/subscription/cancel", {
      token: "cancel-token",
      body: {},
    });

    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.status, "already_pending_cancel");
  });
});
