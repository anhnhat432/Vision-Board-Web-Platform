import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it, beforeEach, afterEach } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { DiscountModel } from "../models/DiscountModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { billingRoutes, publicBillingRoutes } from "../routes/billingRoutes";
import { billingService } from "../services/billingServiceInstance";
import type { PaymentProviderAdapter } from "../services/paymentProviderAdapter";
import { _resetAdapterCacheForTesting, _setAdapterForTesting } from "../services/paymentProviderRegistry";

// ─── Test Helpers ────────────────────────────────────────────────────────────

const ownerUserId = "user_billing_route_owner";
const otherUserId = "user_billing_route_other";
const checkoutUserId = "user_checkout_test";

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

interface MockableDiscountModel {
  find: unknown;
}

const originalDiscountFind = DiscountModel.find;
const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;

function setCheckoutTestFrontendOrigin(): void {
  process.env.FRONTEND_ORIGIN = "https://example.com";
}

function restoreFrontendOrigin(): void {
  if (originalFrontendOrigin === undefined) {
    delete process.env.FRONTEND_ORIGIN;
    return;
  }
  process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
}

function mockDiscountFindThrows(message = "DiscountModel.find should be skipped when Mongo is disconnected."): void {
  (DiscountModel as unknown as MockableDiscountModel).find = () => {
    throw new Error(message);
  };
}

function restoreDiscountModel(): void {
  (DiscountModel as unknown as MockableDiscountModel).find = originalDiscountFind;
}

function createBillingTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", publicBillingRoutes);
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") return { uid: ownerUserId, email: "owner@test.com", emailVerified: true };
        if (token === "other-token") return { uid: otherUserId, email: "other@test.com", emailVerified: true };
        if (token === "checkout-token") return { uid: checkoutUserId, email: "checkout@test.com", emailVerified: true };
        if (token === "unverified-token") return { uid: "user_unverified_claim", email: "owner@test.com", emailVerified: false };
        if (token === "no-email-token") return { uid: "user_no_email_claim", emailVerified: true };
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

function createCheckoutSpyAdapter(providerId: PaymentProviderAdapter["providerId"]): {
  adapter: PaymentProviderAdapter;
  getCheckoutCallCount: () => number;
} {
  let checkoutCallCount = 0;

  return {
    adapter: {
      providerId,
      isConfigured: true,
      async createCheckoutSession() {
        checkoutCallCount += 1;
        throw new Error("Adapter createCheckoutSession should not be called when checkout is disabled.");
      },
      verifyWebhookSignature: () => ({ valid: false }),
      parseWebhookEvent: () => {
        throw new Error("Not used in billing route tests.");
      },
      mapSubscriptionStatus: () => null,
      createCustomerPortalSession: async () => null,
    },
    getCheckoutCallCount: () => checkoutCallCount,
  };
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
          if (token === "plus-token") return { uid: testUserId, email: "plus@test.com", emailVerified: true };
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
          if (token === "canceled-token") return { uid: testUserId, email: "canceled@test.com", emailVerified: true };
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
    assert.equal(data.planCode, "FREE");
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
    restoreDiscountModel();
    setCheckoutTestFrontendOrigin();
    delete process.env.BILLING_PROVIDER;
    delete process.env.BILLING_PAID_DISABLED;
    delete process.env.CASSO_WEBHOOK_SECRET;
    delete process.env.CASSO_BANK_ACCOUNT;
    delete process.env.CASSO_BANK_NAME;
    delete process.env.CASSO_ACCOUNT_NAME;
    delete process.env.PLUS_PRICE_VND;
  });

  afterEach(() => {
    _resetAdapterCacheForTesting();
    restoreDiscountModel();
    restoreFrontendOrigin();
    delete process.env.BILLING_PROVIDER;
    delete process.env.BILLING_PAID_DISABLED;
    delete process.env.CASSO_WEBHOOK_SECRET;
    delete process.env.CASSO_BANK_ACCOUNT;
    delete process.env.CASSO_BANK_NAME;
    delete process.env.CASSO_ACCOUNT_NAME;
    delete process.env.PLUS_PRICE_VND;
  });

  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: null,
        body: { ...validBody, receiptEmail: "buyer@example.test" },
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

  for (const endpoint of ["/api/billing/checkout-session", "/api/billing/orders"] as const) {
    it(`creates a checkout session for an unverified signed-in account (${endpoint})`, async () => {
      const response = await requestJson(createBillingTestApp(), "POST", endpoint, {
        token: "unverified-token",
        body: validBody,
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      const data = response.body.data as Record<string, unknown>;
      assert.equal(data.provider, "mock");
      assert.ok(typeof data.checkoutSessionId === "string");
    });
  }

  it("creates a checkout session with mock provider even when sale lookup is unavailable", async () => {
    mockDiscountFindThrows();

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

  it("returns 503 when PayOS provider env is missing even if sale lookup is unavailable", async () => {
    mockDiscountFindThrows();
    process.env.BILLING_PROVIDER = "payos";
    process.env.BILLING_PAID_DISABLED = "false";
    delete process.env.PAYOS_CLIENT_ID;
    delete process.env.PAYOS_API_KEY;
    delete process.env.PAYOS_CHECKSUM_KEY;
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
      token: "checkout-token",
      body: validBody,
    });

    assert.equal(response.status, 503);
    assert.equal(response.body.errorCode, "provider_not_configured");
    assert.equal(response.body.success, false);
    assert.equal(response.body.data, undefined);
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

  for (const providerId of ["mock", "casso", "payos"] as const) {
    it(`returns 503 checkout_disabled and does not call adapter when BILLING_PAID_DISABLED=1 (${providerId})`, async () => {
      process.env.BILLING_PROVIDER = providerId;
      process.env.BILLING_PAID_DISABLED = "1";
      const spy = createCheckoutSpyAdapter(providerId);
      _setAdapterForTesting(providerId, spy.adapter);

      const token = providerId === "mock" ? "checkout-token" : providerId === "casso" ? "owner-token" : "other-token";
      const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/checkout-session", {
        token,
        body: validBody,
      });

      assert.equal(response.status, 503);
      assert.equal(response.body.errorCode, "checkout_disabled");
      assert.equal(spy.getCheckoutCallCount(), 0);
    });
  }
});

// ─── POST /api/billing/customer-portal Tests ─────────────────────────────────

describe("POST /api/billing/public-checkout-session", () => {
  const validBody = {
    planCode: "PLUS",
    returnUrl: "https://example.com/billing?status=success",
    cancelUrl: "https://example.com/billing?status=cancel",
    clientUserId: "local_browser_user",
  };

  beforeEach(() => {
    _resetAdapterCacheForTesting();
    restoreDiscountModel();
    setCheckoutTestFrontendOrigin();
    delete process.env.BILLING_PROVIDER;
    delete process.env.BILLING_PAID_DISABLED;
    delete process.env.CASSO_WEBHOOK_SECRET;
    delete process.env.CASSO_BANK_ACCOUNT;
    delete process.env.CASSO_BANK_NAME;
    delete process.env.CASSO_ACCOUNT_NAME;
    delete process.env.PLUS_PRICE_VND;
  });

  afterEach(() => {
    _resetAdapterCacheForTesting();
    restoreDiscountModel();
    restoreFrontendOrigin();
    delete process.env.BILLING_PROVIDER;
    delete process.env.BILLING_PAID_DISABLED;
    delete process.env.CASSO_WEBHOOK_SECRET;
    delete process.env.CASSO_BANK_ACCOUNT;
    delete process.env.CASSO_BANK_NAME;
    delete process.env.CASSO_ACCOUNT_NAME;
    delete process.env.PLUS_PRICE_VND;
  });

  it("creates a checkout session without requiring a Firebase token when sale lookup is unavailable", async () => {
    mockDiscountFindThrows();

    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/public-checkout-session", {
      token: null,
      body: {
        ...validBody,
        receiptEmail: "buyer@example.test",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const data = response.body.data as Record<string, unknown>;
    assert.ok(typeof data.checkoutSessionId === "string");
    assert.ok(typeof data.checkoutUrl === "string");
    assert.equal(data.provider, "mock");
  });

  it("requires a receipt email for public checkout so a completed order can be claimed", async () => {
    const spy = createCheckoutSpyAdapter("mock");
    _setAdapterForTesting("mock", spy.adapter);

    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/public-checkout-session", {
      token: null,
      body: validBody,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "receipt_email_required");
    assert.equal(spy.getCheckoutCallCount(), 0);
  });

  it("requires login for coupon usage on public checkout", async () => {
    const spy = createCheckoutSpyAdapter("mock");
    _setAdapterForTesting("mock", spy.adapter);

    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/public-checkout-session", {
      token: null,
      body: {
        ...validBody,
        receiptEmail: "buyer@example.test",
        couponCode: "LAUNCH30",
      },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "coupon_requires_login");
    assert.equal(spy.getCheckoutCallCount(), 0);
  });

  it("returns 503 for public checkout when PayOS provider env is missing even if sale lookup is unavailable", async () => {
    mockDiscountFindThrows();
    process.env.BILLING_PROVIDER = "payos";
    process.env.BILLING_PAID_DISABLED = "false";
    delete process.env.PAYOS_CLIENT_ID;
    delete process.env.PAYOS_API_KEY;
    delete process.env.PAYOS_CHECKSUM_KEY;
    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/public-checkout-session", {
      token: null,
        body: { ...validBody, receiptEmail: "buyer@example.test" },
    });

    assert.equal(response.status, 503);
    assert.equal(response.body.errorCode, "provider_not_configured");
    assert.equal(response.body.success, false);
    assert.equal(response.body.data, undefined);
  });

  for (const providerId of ["mock", "casso", "payos"] as const) {
    it(`returns 503 checkout_disabled and does not call adapter when BILLING_PAID_DISABLED=true (public, ${providerId})`, async () => {
      process.env.BILLING_PROVIDER = providerId;
      process.env.BILLING_PAID_DISABLED = "true";
      const spy = createCheckoutSpyAdapter(providerId);
      _setAdapterForTesting(providerId, spy.adapter);

      const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/public-checkout-session", {
        token: null,
        body: { ...validBody, receiptEmail: "buyer@example.test" },
    });

      assert.equal(response.status, 503);
      assert.equal(response.body.errorCode, "checkout_disabled");
      assert.equal(spy.getCheckoutCallCount(), 0);
    });
  }
});

describe("GET /api/billing/order-status/:orderId", () => {
  it("returns 400 for malformed order ids before database lookup", async () => {
    const response = await requestJson(createBillingTestApp(), "GET", "/api/billing/order-status/not-valid", {
      token: "checkout-token",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_order_id");
  });
});

describe("GET /api/billing/public-order-status/:orderId", () => {
  it("validates malformed order ids without requiring a Firebase token", async () => {
    const response = await requestJson(createBillingTestApp(), "GET", "/api/billing/public-order-status/not-valid", {
      token: null,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_order_id");
  });
});

describe("POST /api/billing/orders/:orderId/claim", () => {
  const claimOrderId = "VBCLAIM001";

  type ClaimOrder = {
    orderId: string;
    userId: string;
    status: "pending" | "completed" | "expired" | "failed";
    purpose: "plus_subscription" | "physical_order";
    provider: string;
    receiptEmail?: string | null;
    save: () => Promise<void>;
  };

  const paymentOrderModel = PaymentOrderModel as unknown as {
    findOne: (query: unknown) => Promise<ClaimOrder | null>;
  };
  const billingSubscriptionModel = BillingSubscriptionModel as unknown as {
    updateMany: (filter: unknown, update: unknown) => Promise<{ modifiedCount: number }>;
  };
  const billingServiceMock = billingService as unknown as {
    getCurrentEntitlementForUser: typeof billingService.getCurrentEntitlementForUser;
  };

  const originalFindOne = paymentOrderModel.findOne;
  const originalUpdateMany = billingSubscriptionModel.updateMany;
  const originalGetCurrentEntitlementForUser = billingServiceMock.getCurrentEntitlementForUser;

  afterEach(() => {
    paymentOrderModel.findOne = originalFindOne;
    billingSubscriptionModel.updateMany = originalUpdateMany;
    billingServiceMock.getCurrentEntitlementForUser = originalGetCurrentEntitlementForUser;
  });

  function createPublicClaimOrder(overrides: Partial<ClaimOrder> = {}): ClaimOrder {
    return {
      orderId: claimOrderId,
      userId: "public:local_browser_user",
      status: "completed",
      purpose: "plus_subscription",
      provider: "payos",
      receiptEmail: "owner@test.com",
      save: async () => undefined,
      ...overrides,
    };
  }

  function mockEntitlementSnapshot() {
    billingServiceMock.getCurrentEntitlementForUser = async (userId) => ({
      userId,
      planCode: "PLUS",
      status: "active",
      activeKeys: ["premium_templates"],
      source: "provider",
      resolvedAt: "2026-07-08T00:00:00.000Z",
    });
  }

  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: null,
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "unauthorized");
  });

  it("validates malformed order ids before database lookup", async () => {
    let lookupCount = 0;
    paymentOrderModel.findOne = async () => {
      lookupCount += 1;
      throw new Error("PaymentOrderModel.findOne should not run for malformed order id.");
    };

    const response = await requestJson(createBillingTestApp(), "POST", "/api/billing/orders/not-valid/claim", {
      token: "owner-token",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "invalid_order_id");
    assert.equal(lookupCount, 0);
  });

  it("returns 404 when the order does not exist", async () => {
    paymentOrderModel.findOne = async () => null;

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "owner-token",
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.errorCode, "order_not_found");
  });

  it("requires a verified account email before database lookup", async () => {
    let lookupCount = 0;
    paymentOrderModel.findOne = async () => {
      lookupCount += 1;
      throw new Error("PaymentOrderModel.findOne should not run for unverified email.");
    };

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "unverified-token",
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.errorCode, "EMAIL_NOT_VERIFIED");
    assert.equal(lookupCount, 0);
  });

  it("rejects a receipt-email order when the authenticated token has no email", async () => {
    let saveCount = 0;
    let subscriptionUpdateCount = 0;
    const order = createPublicClaimOrder({
      save: async () => {
        saveCount += 1;
      },
    });
    paymentOrderModel.findOne = async () => order;
    billingSubscriptionModel.updateMany = async () => {
      subscriptionUpdateCount += 1;
      return { modifiedCount: 0 };
    };
    mockEntitlementSnapshot();

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "no-email-token",
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.errorCode, "email_mismatch");
    assert.equal(order.userId, "public:local_browser_user");
    assert.equal(saveCount, 0);
    assert.equal(subscriptionUpdateCount, 0);
  });

  it("rejects automatic claim when the public order has no receipt email", async () => {
    let saveCount = 0;
    let subscriptionUpdateCount = 0;
    const order = createPublicClaimOrder({
      receiptEmail: null,
      save: async () => {
        saveCount += 1;
      },
    });
    paymentOrderModel.findOne = async () => order;
    billingSubscriptionModel.updateMany = async () => {
      subscriptionUpdateCount += 1;
      return { modifiedCount: 0 };
    };
    mockEntitlementSnapshot();

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "owner-token",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "claim_email_required");
    assert.equal(order.userId, "public:local_browser_user");
    assert.equal(saveCount, 0);
    assert.equal(subscriptionUpdateCount, 0);
  });

  it("rejects a receipt-email order when the authenticated email does not match", async () => {
    let saveCount = 0;
    let subscriptionUpdateCount = 0;
    const order = createPublicClaimOrder({
      save: async () => {
        saveCount += 1;
      },
    });
    paymentOrderModel.findOne = async () => order;
    billingSubscriptionModel.updateMany = async () => {
      subscriptionUpdateCount += 1;
      return { modifiedCount: 0 };
    };
    mockEntitlementSnapshot();

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "other-token",
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.errorCode, "email_mismatch");
    assert.equal(order.userId, "public:local_browser_user");
    assert.equal(saveCount, 0);
    assert.equal(subscriptionUpdateCount, 0);
  });

  it("rejects orders that are not completed", async () => {
    paymentOrderModel.findOne = async () => createPublicClaimOrder({ status: "pending" });

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "owner-token",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "order_not_completed");
  });

  it("rejects physical orders", async () => {
    paymentOrderModel.findOne = async () => createPublicClaimOrder({ purpose: "physical_order" });

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "owner-token",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "physical_order_not_claimable");
  });

  it("rejects orders that are already linked to an account", async () => {
    paymentOrderModel.findOne = async () => createPublicClaimOrder({ userId: otherUserId });

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "owner-token",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "order_already_claimed");
  });

  it("leaves the public order claimable when subscription migration fails", async () => {
    let saveCount = 0;
    const order = createPublicClaimOrder({
      save: async () => {
        saveCount += 1;
      },
    });
    paymentOrderModel.findOne = async () => order;
    billingSubscriptionModel.updateMany = async () => {
      throw new Error("subscription migration failed");
    };
    mockEntitlementSnapshot();

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "owner-token",
    });

    assert.equal(response.status, 500);
    assert.equal(order.userId, "public:local_browser_user");
    assert.equal(saveCount, 0);
  });

  it("allows the same verified user to retry an already-linked claim", async () => {
    let subscriptionUpdateCount = 0;
    const order = createPublicClaimOrder({ userId: ownerUserId });
    paymentOrderModel.findOne = async () => order;
    billingSubscriptionModel.updateMany = async () => {
      subscriptionUpdateCount += 1;
      return { modifiedCount: 0 };
    };
    mockEntitlementSnapshot();

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "owner-token",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(subscriptionUpdateCount, 0);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.alreadyClaimed, true);
    assert.equal(data.orderId, claimOrderId);
  });

  it("transfers a completed public order and subscription to the matching verified user", async () => {
    let saveCount = 0;
    let subscriptionFilter: unknown;
    let subscriptionUpdate: unknown;
    const order = createPublicClaimOrder({
      save: async () => {
        saveCount += 1;
      },
    });
    paymentOrderModel.findOne = async (query) => {
      assert.deepEqual(query, { orderId: claimOrderId });
      return order;
    };
    billingSubscriptionModel.updateMany = async (filter, update) => {
      subscriptionFilter = filter;
      subscriptionUpdate = update;
      return { modifiedCount: 1 };
    };
    mockEntitlementSnapshot();

    const response = await requestJson(createBillingTestApp(), "POST", `/api/billing/orders/${claimOrderId}/claim`, {
      token: "owner-token",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(order.userId, ownerUserId);
    assert.equal(saveCount, 1);
    assert.deepEqual(subscriptionFilter, { provider: "payos", providerSubscriptionId: claimOrderId });
    assert.deepEqual(subscriptionUpdate, { $set: { userId: ownerUserId } });

    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.claimed, true);
    assert.equal(data.orderId, claimOrderId);
    assert.equal(data.previousUserId, "public:local_browser_user");
    assert.equal(data.migratedSubscriptions, 1);
    assert.deepEqual(data.currentEntitlement, {
      planCode: "PLUS",
      status: "active",
      entitlements: ["premium_templates"],
    });
  });
});

describe("GET /api/billing/payment-history", () => {
  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createBillingTestApp(), "GET", "/api/billing/payment-history", {
      token: null,
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  it("does not share rate-limit quota with entitlement polling", async () => {
    const historyUserId = "user_payment_history_rate_limit";
    const paymentOrderModel = PaymentOrderModel as unknown as {
      updateMany: (...args: unknown[]) => Promise<unknown>;
      find: (...args: unknown[]) => {
        select: (...selectArgs: unknown[]) => {
          sort: (...sortArgs: unknown[]) => {
            limit: (...limitArgs: unknown[]) => {
              lean: () => Promise<unknown[]>;
            };
          };
        };
      };
    };
    const originalUpdateMany = paymentOrderModel.updateMany;
    const originalFind = paymentOrderModel.find;

    paymentOrderModel.updateMany = async () => ({ modifiedCount: 0 });
    paymentOrderModel.find = () => ({
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [],
          }),
        }),
      }),
    });

    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createAuthMiddleware({
        async verifyIdToken(token: string) {
          if (token === "history-token") return { uid: historyUserId, email: "history@test.com", emailVerified: true };
          throw new Error("Invalid test token");
        },
      }),
    );
    app.use("/api", billingRoutes);
    app.use(errorMiddleware);

    try {
      for (let index = 0; index < 40; index += 1) {
        const entitlementResponse = await requestJson(app, "GET", "/api/billing/entitlement", {
          token: "history-token",
        });
        assert.equal(entitlementResponse.status, 200);
      }

      const response = await requestJson(app, "GET", "/api/billing/payment-history", {
        token: "history-token",
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.deepEqual((response.body.data as { orders: unknown[] }).orders, []);
    } finally {
      paymentOrderModel.updateMany = originalUpdateMany;
      paymentOrderModel.find = originalFind;
    }
  });
});

describe("POST /api/billing/customer-portal", () => {
  const portalUserId = "user_portal_test";

  afterEach(() => {
    _resetAdapterCacheForTesting();
    delete process.env.BILLING_SUPPORT_EMAIL;
    delete process.env.SUPPORT_EMAIL;
  });

  function createPortalTestApp(): Express {
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createAuthMiddleware({
        async verifyIdToken(token: string) {
          if (token === "portal-token") return { uid: portalUserId, email: "portal@test.com", emailVerified: true };
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

  it("uses the configured support email when customer portal creation is unavailable", async () => {
    process.env.BILLING_SUPPORT_EMAIL = "billing-support@example.test";
    _setAdapterForTesting("mock", {
      providerId: "mock",
      isConfigured: true,
      async createCheckoutSession() {
        throw new Error("Not used in customer portal support email test.");
      },
      verifyWebhookSignature: () => ({ valid: false }),
      parseWebhookEvent: () => {
        throw new Error("Not used in customer portal support email test.");
      },
      mapSubscriptionStatus: () => null,
      createCustomerPortalSession: async () => null,
    });
    await billingService.createMockOrManualEntitlement(portalUserId, "PLUS", "mock");

    const response = await requestJson(createPortalTestApp(), "POST", "/api/billing/customer-portal", {
      token: "portal-token",
      body: { returnUrl: "https://example.com/billing" },
    });

    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.supported, false);
    assert.equal(data.supportEmail, "billing-support@example.test");
    assert.match(String(data.message), /billing-support@example\.test/);
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
          if (token === "cancel-token") return { uid: cancelUserId, email: "cancel@test.com", emailVerified: true };
          if (token === "free-token") return { uid: "user_cancel_free", email: "free@test.com", emailVerified: true };
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
