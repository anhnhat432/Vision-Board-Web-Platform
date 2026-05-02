import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { createMockPaymentAdapter, createMockWebhookBody } from "../services/mockPaymentAdapter";
import {
  getPaymentProviderAdapter,
  isPaymentProviderReady,
  getActiveProviderId,
  _resetAdapterCacheForTesting,
} from "../services/paymentProviderRegistry";
import { PaymentProviderNotConfiguredError } from "../services/paymentProviderAdapter";
import { BillingService, resolveActiveEntitlementKeys } from "../services/billingService";
import type {
  BillingSubscriptionRepository,
  BillingEventRepository,
  BillingSubscriptionEntity,
  BillingEventEntity,
  BillingEntitlementKey,
  ProviderSubscriptionEvent,
} from "../services/billingService";

// ─── In-Memory Repos (same pattern as billingServiceInstance.ts) ──────────────

function createTestSubscriptionRepo(): BillingSubscriptionRepository {
  const store = new Map<string, BillingSubscriptionEntity>();
  let counter = 0;
  return {
    async findLatestByUserId(userId) {
      let latest: BillingSubscriptionEntity | null = null;
      for (const sub of store.values()) {
        if (sub.userId !== userId) continue;
        if (!latest || sub.createdAt > latest.createdAt) latest = sub;
      }
      return latest;
    },
    async findByProviderSubscriptionId(provider, id) {
      for (const sub of store.values()) {
        if (sub.provider === provider && sub.providerSubscriptionId === id) return sub;
      }
      return null;
    },
    async upsertFromProviderEvent(event: ProviderSubscriptionEvent) {
      counter++;
      const now = new Date();
      const entitlements: BillingSubscriptionEntity["entitlements"] =
        event.planCode === "PLUS" && (event.status === "active" || event.status === "trialing")
          ? [
              { key: "premium_templates" as BillingEntitlementKey, grantedAt: now },
              { key: "premium_review_insights" as BillingEntitlementKey, grantedAt: now },
              { key: "priority_reminders" as BillingEntitlementKey, grantedAt: now },
              { key: "advanced_analytics" as BillingEntitlementKey, grantedAt: now },
            ]
          : [];
      const sub: BillingSubscriptionEntity = {
        id: `sub_test_${counter}`,
        userId: event.userId,
        planCode: event.planCode,
        status: event.status,
        provider: event.provider,
        source: "provider",
        providerCustomerId: event.providerCustomerId,
        providerSubscriptionId: event.providerSubscriptionId,
        billingCycle: event.billingCycle,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        canceledAt: event.canceledAt,
        entitlements,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      store.set(sub.id, sub);
      return sub;
    },
    async createMockOrManual(userId, planCode, source) {
      counter++;
      const now = new Date();
      const sub: BillingSubscriptionEntity = {
        id: `sub_test_${counter}`,
        userId,
        planCode,
        status: "active",
        provider: "none",
        source,
        entitlements: planCode === "PLUS"
          ? [
              { key: "premium_templates" as BillingEntitlementKey, grantedAt: now },
              { key: "premium_review_insights" as BillingEntitlementKey, grantedAt: now },
              { key: "priority_reminders" as BillingEntitlementKey, grantedAt: now },
              { key: "advanced_analytics" as BillingEntitlementKey, grantedAt: now },
            ]
          : [],
        createdAt: now,
        updatedAt: now,
      };
      store.set(sub.id, sub);
      return sub;
    },
    async markCancelAtPeriodEnd(userId: string) {
      let latest: BillingSubscriptionEntity | null = null;
      for (const sub of store.values()) {
        if (sub.userId !== userId) continue;
        if (!latest || sub.createdAt > latest.createdAt) latest = sub;
      }
      if (!latest) return null;
      const updated: BillingSubscriptionEntity = {
        ...latest,
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      };
      store.set(latest.id, updated);
      return updated;
    },
  };
}

function createTestEventRepo(): BillingEventRepository {
  const store = new Map<string, BillingEventEntity>();
  let counter = 0;
  return {
    async findByProviderEventId(provider, eventId) {
      for (const evt of store.values()) {
        if (evt.provider === provider && evt.providerEventId === eventId) return evt;
      }
      return null;
    },
    async createEvent(event) {
      counter++;
      const now = new Date();
      const entity: BillingEventEntity = { ...event, id: `evt_test_${counter}`, createdAt: now, updatedAt: now };
      store.set(entity.id, entity);
      return entity;
    },
    async markProcessed(id, processedAt) {
      const evt = store.get(id);
      if (evt) store.set(id, { ...evt, status: "processed", processedAt, updatedAt: new Date() });
    },
    async markFailed(id, error) {
      const evt = store.get(id);
      if (evt) store.set(id, { ...evt, status: "failed", error, updatedAt: new Date() });
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PaymentProviderAdapter", () => {
  describe("mock adapter: createCheckoutSession", () => {
    it("returns a checkout URL and session ID", async () => {
      const adapter = createMockPaymentAdapter();
      const result = await adapter.createCheckoutSession({
        userId: "user_1",
        planCode: "PLUS",
        billingCycle: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      assert.ok(result.sessionId.startsWith("mock_session_"));
      assert.ok(result.checkoutUrl.includes("success"));
      assert.ok(result.checkoutUrl.includes(result.sessionId));
      assert.ok(result.expiresAt);
    });

    it("does NOT grant entitlements — checkout alone is not enough", async () => {
      const adapter = createMockPaymentAdapter();
      const subRepo = createTestSubscriptionRepo();
      const service = new BillingService(subRepo, createTestEventRepo());

      // Step 1: create checkout session
      await adapter.createCheckoutSession({
        userId: "user_1",
        planCode: "PLUS",
        billingCycle: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      // Step 2: check entitlements BEFORE webhook
      const snapshot = await service.getCurrentEntitlementForUser("user_1");
      assert.equal(snapshot.planCode, "FREE");
      assert.equal(snapshot.status, "none");
      assert.deepEqual(snapshot.activeKeys, []);
    });
  });

  describe("mock adapter: webhook verification", () => {
    it("accepts any webhook body (mock always valid)", () => {
      const adapter = createMockPaymentAdapter();
      const result = adapter.verifyWebhookSignature({
        rawBody: '{"test": true}',
        headers: {},
      });
      assert.equal(result.valid, true);
    });
  });

  describe("mock adapter: parseWebhookEvent", () => {
    it("parses a mock webhook body into a normalized event", () => {
      const adapter = createMockPaymentAdapter();
      const body = createMockWebhookBody({
        userId: "user_1",
        planCode: "PLUS",
        status: "active",
        eventId: "evt_test_1",
      });

      const event = adapter.parseWebhookEvent(body);
      assert.equal(event.provider, "mock");
      assert.equal(event.providerEventId, "evt_test_1");
      assert.equal(event.userId, "user_1");
      assert.equal(event.planCode, "PLUS");
      assert.equal(event.status, "active");
      assert.equal(event.eventType, "checkout_completed");
      assert.ok(event.payloadHash.length > 0);
    });
  });

  describe("mock adapter: mapSubscriptionStatus", () => {
    it("maps known statuses", () => {
      const adapter = createMockPaymentAdapter();
      assert.equal(adapter.mapSubscriptionStatus("active"), "active");
      assert.equal(adapter.mapSubscriptionStatus("trialing"), "trialing");
      assert.equal(adapter.mapSubscriptionStatus("past_due"), "past_due");
      assert.equal(adapter.mapSubscriptionStatus("canceled"), "canceled");
      assert.equal(adapter.mapSubscriptionStatus("incomplete"), "incomplete");
      assert.equal(adapter.mapSubscriptionStatus("unpaid"), "unpaid");
    });

    it("returns null for unknown statuses", () => {
      const adapter = createMockPaymentAdapter();
      assert.equal(adapter.mapSubscriptionStatus("whatever"), null);
      assert.equal(adapter.mapSubscriptionStatus(""), null);
    });
  });

  describe("mock adapter: customer portal", () => {
    it("returns a portal URL", async () => {
      const adapter = createMockPaymentAdapter();
      const result = await adapter.createCustomerPortalSession!({
        userId: "user_1",
        providerCustomerId: "cus_1",
        returnUrl: "https://example.com/settings",
      });
      assert.ok(result);
      assert.ok(result.portalUrl.includes("settings"));
    });
  });

  describe("entitlement gating: checkout → webhook → entitlement", () => {
    it("grants entitlement ONLY after webhook event is processed", async () => {
      const adapter = createMockPaymentAdapter();
      const service = new BillingService(
        createTestSubscriptionRepo(),
        createTestEventRepo(),
      );

      // 1. Checkout session — no entitlement yet
      await adapter.createCheckoutSession({
        userId: "user_2",
        planCode: "PLUS",
        billingCycle: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      let snapshot = await service.getCurrentEntitlementForUser("user_2");
      assert.deepEqual(snapshot.activeKeys, []);

      // 2. Simulate webhook event
      const webhookBody = createMockWebhookBody({
        userId: "user_2",
        planCode: "PLUS",
        status: "active",
        eventId: "evt_checkout_1",
        subscriptionId: "sub_mock_1",
      });
      const event = adapter.parseWebhookEvent(webhookBody);

      // 3. Process through billing service
      const result = await service.upsertSubscriptionFromProviderEvent({
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        payloadHash: event.payloadHash,
        userId: event.userId,
        providerCustomerId: event.providerCustomerId,
        providerSubscriptionId: event.providerSubscriptionId,
        planCode: event.planCode,
        status: event.status,
        billingCycle: event.billingCycle,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        canceledAt: event.canceledAt,
      });

      assert.equal(result.eventStatus, "processed");

      // 4. NOW entitlements are active
      snapshot = await service.getCurrentEntitlementForUser("user_2");
      assert.equal(snapshot.planCode, "PLUS");
      assert.equal(snapshot.status, "active");
      assert.ok(snapshot.activeKeys.length > 0);
      assert.ok(snapshot.activeKeys.includes("premium_templates"));
    });
  });

  describe("provider event status mapping (pure)", () => {
    it("canceled subscription has no active entitlements", () => {
      const keys = resolveActiveEntitlementKeys({
        id: "sub_1",
        userId: "user_1",
        planCode: "PLUS",
        status: "canceled",
        provider: "mock",
        source: "provider",
        entitlements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      assert.deepEqual(keys, []);
    });

    it("past_due subscription has no active entitlements", () => {
      const keys = resolveActiveEntitlementKeys({
        id: "sub_1",
        userId: "user_1",
        planCode: "PLUS",
        status: "past_due",
        provider: "mock",
        source: "provider",
        entitlements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      assert.deepEqual(keys, []);
    });

    it("FREE plan never has entitlements even if active", () => {
      const keys = resolveActiveEntitlementKeys({
        id: "sub_1",
        userId: "user_1",
        planCode: "FREE",
        status: "active",
        provider: "mock",
        source: "provider",
        entitlements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      assert.deepEqual(keys, []);
    });

    it("trialing PLUS has all entitlements", () => {
      const keys = resolveActiveEntitlementKeys({
        id: "sub_1",
        userId: "user_1",
        planCode: "PLUS",
        status: "trialing",
        provider: "mock",
        source: "provider",
        entitlements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      assert.equal(keys.length, 4);
      assert.ok(keys.includes("premium_templates"));
      assert.ok(keys.includes("premium_review_insights"));
    });
  });
});

describe("PaymentProviderRegistry", () => {
  const originalEnv = process.env.BILLING_PROVIDER;

  beforeEach(() => {
    _resetAdapterCacheForTesting();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BILLING_PROVIDER;
    } else {
      process.env.BILLING_PROVIDER = originalEnv;
    }
    _resetAdapterCacheForTesting();
  });

  it("returns mock adapter by default (no env)", () => {
    delete process.env.BILLING_PROVIDER;
    const adapter = getPaymentProviderAdapter();
    assert.equal(adapter.providerId, "mock");
    assert.equal(adapter.isConfigured, true);
  });

  it("returns mock adapter when env is 'mock'", () => {
    process.env.BILLING_PROVIDER = "mock";
    const adapter = getPaymentProviderAdapter();
    assert.equal(adapter.providerId, "mock");
  });

  it("returns placeholder for unconfigured stripe", () => {
    process.env.BILLING_PROVIDER = "stripe";
    const adapter = getPaymentProviderAdapter();
    assert.equal(adapter.providerId, "stripe");
    assert.equal(adapter.isConfigured, false);
  });

  it("placeholder createCheckoutSession rejects with PaymentProviderNotConfiguredError", async () => {
    process.env.BILLING_PROVIDER = "payos";
    const adapter = getPaymentProviderAdapter();
    try {
      await adapter.createCheckoutSession({
        userId: "user_1",
        planCode: "PLUS",
        billingCycle: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
      assert.fail("Should have thrown");
    } catch (error) {
      assert.ok(error instanceof PaymentProviderNotConfiguredError);
      assert.equal(error.code, "PROVIDER_NOT_CONFIGURED");
    }
  });

  it("placeholder verifyWebhookSignature returns invalid", () => {
    process.env.BILLING_PROVIDER = "momo";
    const adapter = getPaymentProviderAdapter();
    const result = adapter.verifyWebhookSignature({
      rawBody: "{}",
      headers: {},
    });
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes("momo"));
  });

  it("isPaymentProviderReady returns false for mock", () => {
    delete process.env.BILLING_PROVIDER;
    assert.equal(isPaymentProviderReady(), false);
  });

  it("isPaymentProviderReady returns false for unconfigured real provider", () => {
    process.env.BILLING_PROVIDER = "vnpay";
    assert.equal(isPaymentProviderReady(), false);
  });

  it("getActiveProviderId returns the env value", () => {
    process.env.BILLING_PROVIDER = "stripe";
    assert.equal(getActiveProviderId(), "stripe");
  });

  it("unknown BILLING_PROVIDER falls back to mock", () => {
    process.env.BILLING_PROVIDER = "unknown_provider";
    const adapter = getPaymentProviderAdapter();
    assert.equal(adapter.providerId, "mock");
  });
});
