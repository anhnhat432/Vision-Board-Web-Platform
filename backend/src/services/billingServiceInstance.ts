/**
 * Singleton BillingService instance.
 *
 * Currently wired with in-memory repositories so the billing domain
 * can be tested end-to-end without MongoDB. When the Mongo repository
 * implementations are added, swap the constructors here.
 *
 * This file exists to decouple the service class from its repository
 * wiring, following the same pattern as syncMutationService.ts.
 */

import {
  BillingService,
  type BillingEntitlementKey,
  type BillingEventEntity,
  type BillingEventRepository,
  type BillingPlanCode,
  type BillingSource,
  type BillingSubscriptionEntity,
  type BillingSubscriptionRepository,
  type ProviderSubscriptionEvent,
} from "./billingService";

// ─── In-Memory Repository (will be replaced by Mongo repositories) ───────────

function createInMemorySubscriptionRepo(): BillingSubscriptionRepository {
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

    async findByProviderSubscriptionId(provider, providerSubscriptionId) {
      for (const sub of store.values()) {
        if (sub.provider === provider && sub.providerSubscriptionId === providerSubscriptionId) {
          return sub;
        }
      }
      return null;
    },

    async upsertFromProviderEvent(event: ProviderSubscriptionEvent) {
      let existing: BillingSubscriptionEntity | null = null;
      if (event.providerSubscriptionId) {
        for (const sub of store.values()) {
          if (sub.provider === event.provider && sub.providerSubscriptionId === event.providerSubscriptionId) {
            existing = sub;
            break;
          }
        }
      }

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

      counter++;
      const newSub: BillingSubscriptionEntity = {
        id: `sub_${counter}`,
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

function createInMemoryEventRepo(): BillingEventRepository {
  const store = new Map<string, BillingEventEntity>();
  let counter = 0;

  return {
    async findByProviderEventId(provider, providerEventId) {
      for (const evt of store.values()) {
        if (evt.provider === provider && evt.providerEventId === providerEventId) return evt;
      }
      return null;
    },

    async createEvent(event) {
      counter++;
      const now = new Date();
      const entity: BillingEventEntity = { ...event, id: `evt_${counter}`, createdAt: now, updatedAt: now };
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

// ─── Singleton ───────────────────────────────────────────────────────────────

export const billingService = new BillingService(
  createInMemorySubscriptionRepo(),
  createInMemoryEventRepo(),
);
