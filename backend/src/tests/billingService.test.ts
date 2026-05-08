import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BillingService,
  resolveActiveEntitlementKeys,
  type BillingEntitlementKey,
  type BillingEventEntity,
  type BillingEventRepository,
  type BillingSource,
  type BillingSubscriptionEntity,
  type BillingSubscriptionRepository,
  type BillingSubscriptionStatus,
  type BillingPlanCode,
  type ProviderSubscriptionEvent,
} from "../services/billingService";

// ─── In-Memory Mock Repositories ─────────────────────────────────────────────

function createMockSubscriptionRepo(): BillingSubscriptionRepository & {
  getAll(): BillingSubscriptionEntity[];
} {
  const store = new Map<string, BillingSubscriptionEntity>();
  let counter = 0;

  function nextId(): string {
    counter++;
    return `sub_${counter}`;
  }

  return {
    getAll(): BillingSubscriptionEntity[] {
      return [...store.values()];
    },

    async findLatestByUserId(
      userId: string,
    ): Promise<BillingSubscriptionEntity | null> {
      let latest: BillingSubscriptionEntity | null = null;
      for (const sub of store.values()) {
        if (sub.userId !== userId) continue;
        if (!latest || sub.createdAt > latest.createdAt) {
          latest = sub;
        }
      }
      return latest;
    },

    async findByProviderSubscriptionId(
      provider: string,
      providerSubscriptionId: string,
    ): Promise<BillingSubscriptionEntity | null> {
      for (const sub of store.values()) {
        if (
          sub.provider === provider &&
          sub.providerSubscriptionId === providerSubscriptionId
        ) {
          return sub;
        }
      }
      return null;
    },

    async upsertFromProviderEvent(
      event: ProviderSubscriptionEvent,
    ): Promise<BillingSubscriptionEntity> {
      // Find existing by provider subscription ID.
      let existing: BillingSubscriptionEntity | null = null;
      if (event.providerSubscriptionId) {
        for (const sub of store.values()) {
          if (
            sub.provider === event.provider &&
            sub.providerSubscriptionId === event.providerSubscriptionId
          ) {
            existing = sub;
            break;
          }
        }
      }

      const now = new Date();
      const entitlements =
        event.planCode === "PLUS" &&
        (event.status === "active" || event.status === "trialing")
          ? [
              { key: "premium_templates" as BillingEntitlementKey, grantedAt: now },
              { key: "premium_review_insights" as BillingEntitlementKey, grantedAt: now },
              { key: "priority_reminders" as BillingEntitlementKey, grantedAt: now },
              { key: "advanced_analytics" as BillingEntitlementKey, grantedAt: now },
            ]
          : [];

      if (existing) {
        const updated: BillingSubscriptionEntity = {
          ...existing,
          planCode: event.planCode,
          status: event.status,
          billingCycle: event.billingCycle,
          currentPeriodStart: event.currentPeriodStart,
          currentPeriodEnd: event.currentPeriodEnd,
          cancelAtPeriodEnd: event.cancelAtPeriodEnd,
          canceledAt: event.canceledAt,
          entitlements,
          lastSyncedAt: now,
          updatedAt: now,
        };
        store.set(existing.id, updated);
        return updated;
      }

      const newSub: BillingSubscriptionEntity = {
        id: nextId(),
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
      store.set(newSub.id, newSub);
      return newSub;
    },

    async createMockOrManual(
      userId: string,
      planCode: BillingPlanCode,
      source: BillingSource,
    ): Promise<BillingSubscriptionEntity> {
      const now = new Date();
      const entitlements =
        planCode === "PLUS"
          ? [
              { key: "premium_templates" as BillingEntitlementKey, grantedAt: now },
              { key: "premium_review_insights" as BillingEntitlementKey, grantedAt: now },
              { key: "priority_reminders" as BillingEntitlementKey, grantedAt: now },
              { key: "advanced_analytics" as BillingEntitlementKey, grantedAt: now },
            ]
          : [];

      const sub: BillingSubscriptionEntity = {
        id: nextId(),
        userId,
        planCode,
        status: "active",
        provider: "none",
        source,
        entitlements,
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

function createMockEventRepo(): BillingEventRepository & {
  getAll(): BillingEventEntity[];
} {
  const store = new Map<string, BillingEventEntity>();
  let counter = 0;

  function nextId(): string {
    counter++;
    return `evt_${counter}`;
  }

  return {
    getAll(): BillingEventEntity[] {
      return [...store.values()];
    },

    async findByProviderEventId(
      provider: string,
      providerEventId: string,
    ): Promise<BillingEventEntity | null> {
      for (const evt of store.values()) {
        if (evt.provider === provider && evt.providerEventId === providerEventId) {
          return evt;
        }
      }
      return null;
    },

    async createEvent(
      event: Omit<BillingEventEntity, "id" | "createdAt" | "updatedAt">,
    ): Promise<BillingEventEntity> {
      const now = new Date();
      const entity: BillingEventEntity = {
        ...event,
        id: nextId(),
        createdAt: now,
        updatedAt: now,
      };
      store.set(entity.id, entity);
      return entity;
    },

    async markProcessed(id: string, processedAt: Date): Promise<void> {
      const evt = store.get(id);
      if (evt) {
        store.set(id, { ...evt, status: "processed", processedAt, updatedAt: new Date() });
      }
    },

    async markFailed(id: string, error: string): Promise<void> {
      const evt = store.get(id);
      if (evt) {
        store.set(id, { ...evt, status: "failed", error, updatedAt: new Date() });
      }
    },
  };
}

// ─── Test Helpers ────────────────────────────────────────────────────────────

const userA = "user_billing_a";
const userB = "user_billing_b";

function createService(): {
  service: BillingService;
  subRepo: ReturnType<typeof createMockSubscriptionRepo>;
  eventRepo: ReturnType<typeof createMockEventRepo>;
} {
  const subRepo = createMockSubscriptionRepo();
  const eventRepo = createMockEventRepo();
  const service = new BillingService(subRepo, eventRepo);
  return { service, subRepo, eventRepo };
}

function makeProviderEvent(
  overrides: Partial<ProviderSubscriptionEvent> = {},
): ProviderSubscriptionEvent {
  return {
    provider: "test_provider",
    providerEventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    eventType: "subscription_created",
    payloadHash: `hash_${Math.random().toString(36).slice(2, 10)}`,
    userId: userA,
    planCode: "PLUS",
    status: "active",
    billingCycle: "monthly",
    providerSubscriptionId: "prov_sub_1",
    ...overrides,
  };
}

// ─── Pure Function Tests ─────────────────────────────────────────────────────

describe("resolveActiveEntitlementKeys", () => {
  it("returns empty array for null subscription", () => {
    assert.deepEqual(resolveActiveEntitlementKeys(null), []);
  });

  it("returns empty array for FREE plan", () => {
    const sub: BillingSubscriptionEntity = {
      id: "sub_1",
      userId: userA,
      planCode: "FREE",
      status: "active",
      provider: "none",
      source: "mock",
      entitlements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    assert.deepEqual(resolveActiveEntitlementKeys(sub), []);
  });

  it("returns all keys for active PLUS subscription with no explicit grants", () => {
    const sub: BillingSubscriptionEntity = {
      id: "sub_2",
      userId: userA,
      planCode: "PLUS",
      status: "active",
      provider: "none",
      source: "mock",
      entitlements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const keys = resolveActiveEntitlementKeys(sub);
    assert.equal(keys.length, 4);
    assert.ok(keys.includes("premium_templates"));
    assert.ok(keys.includes("premium_review_insights"));
    assert.ok(keys.includes("priority_reminders"));
    assert.ok(keys.includes("advanced_analytics"));
  });

  it("returns all keys for trialing PLUS subscription", () => {
    const sub: BillingSubscriptionEntity = {
      id: "sub_3",
      userId: userA,
      planCode: "PLUS",
      status: "trialing",
      provider: "none",
      source: "mock",
      entitlements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const keys = resolveActiveEntitlementKeys(sub);
    assert.equal(keys.length, 4);
  });

  it("returns empty array for canceled PLUS subscription", () => {
    const sub: BillingSubscriptionEntity = {
      id: "sub_4",
      userId: userA,
      planCode: "PLUS",
      status: "canceled",
      provider: "none",
      source: "mock",
      entitlements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    assert.deepEqual(resolveActiveEntitlementKeys(sub), []);
  });

  it("returns empty array for past_due PLUS subscription", () => {
    const sub: BillingSubscriptionEntity = {
      id: "sub_5",
      userId: userA,
      planCode: "PLUS",
      status: "past_due",
      provider: "none",
      source: "mock",
      entitlements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    assert.deepEqual(resolveActiveEntitlementKeys(sub), []);
  });

  it("returns empty array for incomplete PLUS subscription", () => {
    const sub: BillingSubscriptionEntity = {
      id: "sub_6",
      userId: userA,
      planCode: "PLUS",
      status: "incomplete",
      provider: "none",
      source: "mock",
      entitlements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    assert.deepEqual(resolveActiveEntitlementKeys(sub), []);
  });

  it("filters revoked entitlement grants", () => {
    const sub: BillingSubscriptionEntity = {
      id: "sub_7",
      userId: userA,
      planCode: "PLUS",
      status: "active",
      provider: "none",
      source: "provider",
      entitlements: [
        { key: "premium_templates", grantedAt: new Date() },
        { key: "premium_review_insights", grantedAt: new Date(), revokedAt: new Date() },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const keys = resolveActiveEntitlementKeys(sub);
    assert.equal(keys.length, 1);
    assert.equal(keys[0], "premium_templates");
  });

  it("filters expired entitlement grants", () => {
    const past = new Date("2020-01-01T00:00:00Z");
    const sub: BillingSubscriptionEntity = {
      id: "sub_8",
      userId: userA,
      planCode: "PLUS",
      status: "active",
      provider: "none",
      source: "provider",
      entitlements: [
        { key: "premium_templates", grantedAt: new Date(), expiresAt: past },
        { key: "advanced_analytics", grantedAt: new Date() },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const keys = resolveActiveEntitlementKeys(sub);
    assert.equal(keys.length, 1);
    assert.equal(keys[0], "advanced_analytics");
  });

  it("returns empty array when the subscription period has expired", () => {
    const past = new Date("2020-01-01T00:00:00Z");
    const sub: BillingSubscriptionEntity = {
      id: "sub_expired_period",
      userId: userA,
      planCode: "PLUS",
      status: "active",
      provider: "casso",
      source: "provider",
      currentPeriodEnd: past,
      entitlements: [
        { key: "premium_templates", grantedAt: new Date() },
        { key: "premium_review_insights", grantedAt: new Date() },
        { key: "priority_reminders", grantedAt: new Date() },
        { key: "advanced_analytics", grantedAt: new Date() },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    assert.deepEqual(resolveActiveEntitlementKeys(sub), []);
  });
});

// ─── Service Tests ───────────────────────────────────────────────────────────

describe("BillingService.getCurrentEntitlementForUser", () => {
  it("returns FREE with no active keys for a new user", async () => {
    const { service } = createService();
    const snapshot = await service.getCurrentEntitlementForUser(userA);

    assert.equal(snapshot.userId, userA);
    assert.equal(snapshot.planCode, "FREE");
    assert.equal(snapshot.status, "none");
    assert.deepEqual(snapshot.activeKeys, []);
    assert.equal(snapshot.source, "default");
    assert.equal(snapshot.subscriptionId, undefined);
    assert.ok(snapshot.resolvedAt);
  });

  it("returns PLUS with all keys for active subscription", async () => {
    const { service, subRepo } = createService();
    await subRepo.createMockOrManual(userA, "PLUS", "mock");

    const snapshot = await service.getCurrentEntitlementForUser(userA);

    assert.equal(snapshot.planCode, "PLUS");
    assert.equal(snapshot.status, "active");
    assert.equal(snapshot.activeKeys.length, 4);
    assert.equal(snapshot.source, "mock");
    assert.ok(snapshot.subscriptionId);
  });

  it("returns FREE with no keys for canceled subscription", async () => {
    const { service, subRepo } = createService();
    const sub = await subRepo.createMockOrManual(userA, "PLUS", "mock");
    // Simulate cancellation by directly updating the mock.
    const store = subRepo.getAll();
    const entry = store.find((s) => s.id === sub.id)!;
    entry.status = "canceled";
    entry.entitlements = [];

    const snapshot = await service.getCurrentEntitlementForUser(userA);

    assert.equal(snapshot.planCode, "FREE");
    assert.equal(snapshot.status, "canceled");
    assert.deepEqual(snapshot.activeKeys, []);
  });

  it("does not leak entitlements across users", async () => {
    const { service, subRepo } = createService();
    await subRepo.createMockOrManual(userA, "PLUS", "mock");

    const snapshotA = await service.getCurrentEntitlementForUser(userA);
    const snapshotB = await service.getCurrentEntitlementForUser(userB);

    assert.equal(snapshotA.planCode, "PLUS");
    assert.equal(snapshotA.activeKeys.length, 4);
    assert.equal(snapshotB.planCode, "FREE");
    assert.deepEqual(snapshotB.activeKeys, []);
  });

  it("returns no active keys after a PLUS period ends", async () => {
    const { service } = createService();

    await service.upsertSubscriptionFromProviderEvent(
      makeProviderEvent({
        providerEventId: "evt_expired_period_test",
        providerSubscriptionId: "prov_sub_expired_period",
        billingCycle: "twelve_week",
        currentPeriodStart: new Date("2019-10-01T00:00:00Z"),
        currentPeriodEnd: new Date("2020-01-01T00:00:00Z"),
      }),
    );

    const snapshot = await service.getCurrentEntitlementForUser(userA);

    assert.equal(snapshot.planCode, "FREE");
    assert.equal(snapshot.status, "active");
    assert.deepEqual(snapshot.activeKeys, []);
  });
});

describe("BillingService.upsertSubscriptionFromProviderEvent", () => {
  it("creates subscription from first provider event", async () => {
    const { service, subRepo, eventRepo } = createService();
    const event = makeProviderEvent();

    const result = await service.upsertSubscriptionFromProviderEvent(event);

    assert.equal(result.eventStatus, "processed");
    assert.equal(result.subscription.userId, userA);
    assert.equal(result.subscription.planCode, "PLUS");
    assert.equal(result.subscription.status, "active");
    assert.equal(result.subscription.source, "provider");
    assert.equal(result.subscription.provider, "test_provider");

    // Event log should exist.
    const events = eventRepo.getAll();
    assert.equal(events.length, 1);
    assert.equal(events[0].status, "processed");
    assert.ok(events[0].processedAt);

    // Subscription should be findable.
    const subs = subRepo.getAll();
    assert.equal(subs.length, 1);
  });

  it("returns duplicate for repeated providerEventId", async () => {
    const { service, eventRepo } = createService();
    const event = makeProviderEvent({ providerEventId: "evt_idempotent_1" });

    const first = await service.upsertSubscriptionFromProviderEvent(event);
    const second = await service.upsertSubscriptionFromProviderEvent(event);

    assert.equal(first.eventStatus, "processed");
    assert.equal(second.eventStatus, "duplicate");

    // Only one event log entry.
    const events = eventRepo.getAll();
    assert.equal(events.length, 1);
  });

  it("retries a provider event that was previously marked failed", async () => {
    const subRepo = createMockSubscriptionRepo();
    const eventRepo = createMockEventRepo();
    let shouldFail = true;
    const flakySubRepo: BillingSubscriptionRepository = {
      ...subRepo,
      async upsertFromProviderEvent(event) {
        if (shouldFail) {
          shouldFail = false;
          throw new Error("temporary billing write failure");
        }
        return subRepo.upsertFromProviderEvent(event);
      },
    };
    const service = new BillingService(flakySubRepo, eventRepo);
    const event = makeProviderEvent({ providerEventId: "evt_retry_after_failure" });

    await assert.rejects(
      () => service.upsertSubscriptionFromProviderEvent(event),
      /temporary billing write failure/,
    );
    assert.equal(eventRepo.getAll().length, 1);
    assert.equal(eventRepo.getAll()[0].status, "failed");

    const result = await service.upsertSubscriptionFromProviderEvent(event);

    assert.equal(result.eventStatus, "processed");
    assert.equal(eventRepo.getAll().length, 1);
    assert.equal(eventRepo.getAll()[0].status, "processed");
    assert.equal(result.subscription.planCode, "PLUS");
  });

  it("updates subscription status when subscription_canceled event arrives", async () => {
    const { service } = createService();

    // First: create active subscription.
    const createEvent = makeProviderEvent({
      providerEventId: "evt_create_1",
      eventType: "subscription_created",
      status: "active",
    });
    await service.upsertSubscriptionFromProviderEvent(createEvent);

    // Second: cancel it.
    const cancelEvent = makeProviderEvent({
      providerEventId: "evt_cancel_1",
      eventType: "subscription_canceled",
      status: "canceled",
      canceledAt: new Date(),
    });
    const result = await service.upsertSubscriptionFromProviderEvent(cancelEvent);

    assert.equal(result.eventStatus, "processed");
    assert.equal(result.subscription.status, "canceled");

    // Entitlements should be empty after cancel.
    const snapshot = await service.getCurrentEntitlementForUser(userA);
    assert.deepEqual(snapshot.activeKeys, []);
  });

  it("isolates provider events between users", async () => {
    const { service } = createService();

    await service.upsertSubscriptionFromProviderEvent(
      makeProviderEvent({
        providerEventId: "evt_user_a",
        userId: userA,
        providerSubscriptionId: "prov_sub_a",
      }),
    );
    await service.upsertSubscriptionFromProviderEvent(
      makeProviderEvent({
        providerEventId: "evt_user_b",
        userId: userB,
        providerSubscriptionId: "prov_sub_b",
      }),
    );

    const snapshotA = await service.getCurrentEntitlementForUser(userA);
    const snapshotB = await service.getCurrentEntitlementForUser(userB);

    assert.equal(snapshotA.planCode, "PLUS");
    assert.equal(snapshotB.planCode, "PLUS");
    assert.notEqual(snapshotA.subscriptionId, snapshotB.subscriptionId);
  });
});

describe("BillingService.createMockOrManualEntitlement", () => {
  it("creates mock PLUS subscription", async () => {
    const { service } = createService();
    const sub = await service.createMockOrManualEntitlement(userA, "PLUS", "mock");

    assert.equal(sub.userId, userA);
    assert.equal(sub.planCode, "PLUS");
    assert.equal(sub.source, "mock");
    assert.equal(sub.status, "active");
    assert.equal(sub.entitlements.length, 4);
  });

  it("creates manual FREE subscription with no entitlements", async () => {
    const { service } = createService();
    const sub = await service.createMockOrManualEntitlement(userA, "FREE", "manual");

    assert.equal(sub.planCode, "FREE");
    assert.equal(sub.source, "manual");
    assert.equal(sub.entitlements.length, 0);
  });

  it("does not affect other users", async () => {
    const { service } = createService();
    await service.createMockOrManualEntitlement(userA, "PLUS", "mock");

    const snapshotB = await service.getCurrentEntitlementForUser(userB);
    assert.deepEqual(snapshotB.activeKeys, []);
  });
});

describe("billing status transitions", () => {
  const allNonActiveStatuses: BillingSubscriptionStatus[] = [
    "past_due",
    "canceled",
    "incomplete",
    "unpaid",
  ];

  for (const status of allNonActiveStatuses) {
    it(`${status} subscription does not grant entitlements`, async () => {
      const { service } = createService();

      await service.upsertSubscriptionFromProviderEvent(
        makeProviderEvent({
          providerEventId: `evt_${status}_test`,
          status,
          providerSubscriptionId: `prov_sub_${status}`,
        }),
      );

      const snapshot = await service.getCurrentEntitlementForUser(userA);
      assert.deepEqual(snapshot.activeKeys, []);
      assert.equal(snapshot.status, status);
    });
  }

  it("trialing subscription grants entitlements", async () => {
    const { service } = createService();

    await service.upsertSubscriptionFromProviderEvent(
      makeProviderEvent({
        providerEventId: "evt_trialing_test",
        status: "trialing",
        providerSubscriptionId: "prov_sub_trial",
      }),
    );

    const snapshot = await service.getCurrentEntitlementForUser(userA);
    assert.equal(snapshot.activeKeys.length, 4);
    assert.equal(snapshot.status, "trialing");
  });
});
