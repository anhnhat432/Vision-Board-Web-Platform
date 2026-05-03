import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkSubscriptionConsistency,
  reconcileEntitlementForUser,
  reconcileAllEntitlements,
  type ReconciliableSubscriptionRepository,
} from "../services/billingReconciliation";
import type {
  BillingEntitlementKey,
  BillingPlanCode,
  BillingSource,
  BillingSubscriptionEntity,
  ProviderSubscriptionEvent,
} from "../services/billingService";

// ─── In-Memory Reconciliable Repo ────────────────────────────────────────────

function createTestReconciliableRepo(): ReconciliableSubscriptionRepository & {
  getAll(): BillingSubscriptionEntity[];
  insertRaw(sub: BillingSubscriptionEntity): void;
} {
  const store = new Map<string, BillingSubscriptionEntity>();
  let counter = 0;

  return {
    getAll() {
      return [...store.values()];
    },
    insertRaw(sub: BillingSubscriptionEntity) {
      store.set(sub.id, sub);
    },
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
        id: `sub_${counter}`,
        userId: event.userId,
        planCode: event.planCode,
        status: event.status,
        provider: event.provider,
        source: "provider",
        entitlements,
        createdAt: now,
        updatedAt: now,
      };
      store.set(sub.id, sub);
      return sub;
    },
    async createMockOrManual(userId: string, planCode: BillingPlanCode, source: BillingSource) {
      counter++;
      const now = new Date();
      const entitlements: BillingSubscriptionEntity["entitlements"] =
        planCode === "PLUS"
          ? [
              { key: "premium_templates" as BillingEntitlementKey, grantedAt: now },
              { key: "premium_review_insights" as BillingEntitlementKey, grantedAt: now },
              { key: "priority_reminders" as BillingEntitlementKey, grantedAt: now },
              { key: "advanced_analytics" as BillingEntitlementKey, grantedAt: now },
            ]
          : [];
      const sub: BillingSubscriptionEntity = {
        id: `sub_${counter}`,
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
      const updated = { ...latest, cancelAtPeriodEnd: true, updatedAt: new Date() };
      store.set(latest.id, updated);
      return updated;
    },
    async findAllUserIds() {
      const ids = new Set<string>();
      for (const sub of store.values()) {
        ids.add(sub.userId);
      }
      return [...ids];
    },
    async updateEntitlements(subscriptionId, entitlements) {
      const sub = store.get(subscriptionId);
      if (sub) {
        store.set(subscriptionId, { ...sub, entitlements, updatedAt: new Date() });
      }
    },
  };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const NOW = new Date();
const PAST = new Date("2020-01-01T00:00:00Z");
const FUTURE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

function makeSub(
  overrides: Partial<BillingSubscriptionEntity> & { userId: string },
): BillingSubscriptionEntity {
  return {
    id: `sub_manual_${Math.random().toString(36).slice(2, 8)}`,
    planCode: "PLUS",
    status: "active",
    provider: "mock",
    source: "provider",
    entitlements: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ─── Pure Function Tests ─────────────────────────────────────────────────────

describe("checkSubscriptionConsistency", () => {
  it("returns consistent for null subscription (FREE user)", () => {
    const result = checkSubscriptionConsistency(null, "user_free");
    assert.equal(result.isConsistent, true);
    assert.equal(result.planCode, "FREE");
    assert.deepEqual(result.currentKeys, []);
    assert.deepEqual(result.expectedKeys, []);
  });

  it("detects missing entitlements on active PLUS subscription", () => {
    const sub = makeSub({
      userId: "user_missing",
      planCode: "PLUS",
      status: "active",
      entitlements: [], // Should have 4 keys
    });
    const result = checkSubscriptionConsistency(sub, "user_missing");
    assert.equal(result.isConsistent, false);
    assert.equal(result.expectedKeys.length, 4);
    assert.equal(result.currentKeys.length, 0);
    assert.ok(result.mismatchReason?.includes("missing"));
  });

  it("returns consistent for active PLUS with correct entitlements", () => {
    const sub = makeSub({
      userId: "user_ok",
      planCode: "PLUS",
      status: "active",
      entitlements: [
        { key: "premium_templates", grantedAt: NOW },
        { key: "premium_review_insights", grantedAt: NOW },
        { key: "priority_reminders", grantedAt: NOW },
        { key: "advanced_analytics", grantedAt: NOW },
      ],
    });
    const result = checkSubscriptionConsistency(sub, "user_ok");
    assert.equal(result.isConsistent, true);
  });

  it("detects extra entitlements on canceled subscription", () => {
    const sub = makeSub({
      userId: "user_canceled",
      planCode: "PLUS",
      status: "canceled",
      entitlements: [
        { key: "premium_templates", grantedAt: NOW },
        { key: "advanced_analytics", grantedAt: NOW },
      ],
    });
    const result = checkSubscriptionConsistency(sub, "user_canceled");
    assert.equal(result.isConsistent, false);
    assert.equal(result.expectedKeys.length, 0);
    assert.equal(result.currentKeys.length, 2);
    assert.ok(result.mismatchReason?.includes("extra"));
  });

  it("detects extra entitlements on past_due subscription (payment_failed)", () => {
    const sub = makeSub({
      userId: "user_pastdue",
      planCode: "PLUS",
      status: "past_due",
      entitlements: [
        { key: "premium_templates", grantedAt: NOW },
      ],
    });
    const result = checkSubscriptionConsistency(sub, "user_pastdue");
    assert.equal(result.isConsistent, false);
    assert.equal(result.expectedKeys.length, 0);
  });

  it("returns consistent for FREE plan with no entitlements", () => {
    const sub = makeSub({
      userId: "user_free_plan",
      planCode: "FREE",
      status: "active",
      entitlements: [],
    });
    const result = checkSubscriptionConsistency(sub, "user_free_plan");
    assert.equal(result.isConsistent, true);
  });

  it("counts revoked entitlements correctly in current keys", () => {
    // When explicit grants exist, resolveActiveEntitlementKeys filters them
    // and returns only the active ones. So 4 grants with 1 revoked = 3 expected.
    // current = 3 (revoked filtered out), expected = 3 (same).
    // This IS consistent per the explicit-grant design.
    const sub = makeSub({
      userId: "user_revoked",
      planCode: "PLUS",
      status: "active",
      entitlements: [
        { key: "premium_templates", grantedAt: NOW },
        { key: "premium_review_insights", grantedAt: NOW, revokedAt: NOW },
        { key: "priority_reminders", grantedAt: NOW },
        { key: "advanced_analytics", grantedAt: NOW },
      ],
    });
    const result = checkSubscriptionConsistency(sub, "user_revoked");
    // Both current and expected are 3 (the active explicit grants)
    assert.equal(result.currentKeys.length, 3);
    assert.equal(result.expectedKeys.length, 3);
    assert.equal(result.isConsistent, true);
  });

  it("detects expired period on active sub as needing no entitlements", () => {
    const sub = makeSub({
      userId: "user_expired",
      planCode: "PLUS",
      status: "active",
      currentPeriodEnd: PAST, // expired
      entitlements: [
        { key: "premium_templates", grantedAt: NOW },
        { key: "advanced_analytics", grantedAt: NOW },
      ],
    });
    const result = checkSubscriptionConsistency(sub, "user_expired");
    assert.equal(result.isConsistent, false);
    assert.equal(result.expectedKeys.length, 0);
    assert.ok(result.mismatchReason?.includes("expired"));
  });
});

// ─── Service Function Tests ──────────────────────────────────────────────────

describe("reconcileEntitlementForUser", () => {
  it("dry-run does NOT write updates", async () => {
    const repo = createTestReconciliableRepo();
    // Insert a sub with missing entitlements
    repo.insertRaw(
      makeSub({
        userId: "user_dryrun",
        planCode: "PLUS",
        status: "active",
        entitlements: [],
      }),
    );

    const result = await reconcileEntitlementForUser(repo, "user_dryrun", false);
    assert.equal(result.isConsistent, false);
    assert.equal(result.updated, false);

    // Verify repo was NOT updated
    const sub = await repo.findLatestByUserId("user_dryrun");
    assert.equal(sub!.entitlements.length, 0);
  });

  it("write mode updates entitlements for inconsistent subscription", async () => {
    const repo = createTestReconciliableRepo();
    repo.insertRaw(
      makeSub({
        userId: "user_write",
        planCode: "PLUS",
        status: "active",
        entitlements: [],
      }),
    );

    const result = await reconcileEntitlementForUser(repo, "user_write", true);
    assert.equal(result.isConsistent, false);
    assert.equal(result.updated, true);

    // Verify repo WAS updated
    const sub = await repo.findLatestByUserId("user_write");
    assert.equal(sub!.entitlements.length, 4);
    assert.ok(sub!.entitlements.some((e) => e.key === "premium_templates"));
  });

  it("write mode clears entitlements for canceled subscription", async () => {
    const repo = createTestReconciliableRepo();
    repo.insertRaw(
      makeSub({
        userId: "user_cancel_fix",
        planCode: "PLUS",
        status: "canceled",
        entitlements: [
          { key: "premium_templates", grantedAt: NOW },
          { key: "advanced_analytics", grantedAt: NOW },
        ],
      }),
    );

    const result = await reconcileEntitlementForUser(repo, "user_cancel_fix", true);
    assert.equal(result.isConsistent, false);
    assert.equal(result.updated, true);

    const sub = await repo.findLatestByUserId("user_cancel_fix");
    assert.equal(sub!.entitlements.length, 0);
  });

  it("does nothing for consistent subscription", async () => {
    const repo = createTestReconciliableRepo();
    await repo.createMockOrManual("user_consistent", "PLUS", "mock");

    const result = await reconcileEntitlementForUser(repo, "user_consistent", true);
    assert.equal(result.isConsistent, true);
    assert.equal(result.updated, false);
  });
});

describe("reconcileAllEntitlements", () => {
  it("checks all users and reports summary", async () => {
    const repo = createTestReconciliableRepo();

    // Consistent user
    await repo.createMockOrManual("user_a", "PLUS", "mock");

    // Inconsistent user (missing entitlements)
    repo.insertRaw(
      makeSub({
        userId: "user_b",
        planCode: "PLUS",
        status: "active",
        entitlements: [],
      }),
    );

    const summary = await reconcileAllEntitlements(repo, { write: false });

    assert.equal(summary.totalChecked, 2);
    assert.equal(summary.consistent, 1);
    assert.equal(summary.inconsistent, 1);
    assert.equal(summary.updated, 0); // dry-run
    assert.equal(summary.dryRun, true);
    assert.equal(summary.results.length, 2);
  });

  it("write mode updates inconsistent records", async () => {
    const repo = createTestReconciliableRepo();

    repo.insertRaw(
      makeSub({
        userId: "user_fix1",
        planCode: "PLUS",
        status: "active",
        entitlements: [],
      }),
    );
    repo.insertRaw(
      makeSub({
        userId: "user_fix2",
        planCode: "PLUS",
        status: "canceled",
        entitlements: [{ key: "premium_templates", grantedAt: NOW }],
      }),
    );

    const summary = await reconcileAllEntitlements(repo, { write: true });

    assert.equal(summary.totalChecked, 2);
    assert.equal(summary.inconsistent, 2);
    assert.equal(summary.updated, 2);
    assert.equal(summary.dryRun, false);

    // Verify actual writes
    const sub1 = await repo.findLatestByUserId("user_fix1");
    assert.equal(sub1!.entitlements.length, 4);

    const sub2 = await repo.findLatestByUserId("user_fix2");
    assert.equal(sub2!.entitlements.length, 0);
  });

  it("supports filtering by userIds", async () => {
    const repo = createTestReconciliableRepo();
    await repo.createMockOrManual("user_x", "PLUS", "mock");
    await repo.createMockOrManual("user_y", "PLUS", "mock");

    const summary = await reconcileAllEntitlements(repo, {
      userIds: ["user_x"],
    });

    assert.equal(summary.totalChecked, 1);
    assert.equal(summary.results[0].userId, "user_x");
  });

  it("handles users with no subscription gracefully", async () => {
    const repo = createTestReconciliableRepo();

    const summary = await reconcileAllEntitlements(repo, {
      userIds: ["user_nonexistent"],
    });

    assert.equal(summary.totalChecked, 1);
    assert.equal(summary.consistent, 1);
    assert.equal(summary.results[0].planCode, "FREE");
  });
});
