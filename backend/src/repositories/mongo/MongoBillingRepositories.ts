import {
  type BillingEntitlementKey,
  type BillingEventEntity,
  type BillingEventRepository,
  type BillingPlanCode,
  type BillingSource,
  type BillingSubscriptionEntity,
  type BillingSubscriptionRepository,
  type BillingSubscriptionStatus,
  type ProviderSubscriptionEvent,
} from "../../services/billingService";
import { BillingEventModel } from "../../models/BillingEventModel";
import { BillingSubscriptionModel } from "../../models/BillingSubscriptionModel";
import type { ReconciliableSubscriptionRepository } from "../../services/billingReconciliation";

type EntityId = { toString(): string };

interface LeanEntitlementGrant {
  key: BillingEntitlementKey;
  grantedAt: Date;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}

interface LeanSubscription {
  _id: EntityId;
  userId: string;
  planCode: BillingPlanCode;
  status: BillingSubscriptionStatus;
  provider: string;
  source: BillingSource;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  billingCycle?: BillingSubscriptionEntity["billingCycle"];
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  entitlements?: LeanEntitlementGrant[];
  lastSyncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LeanBillingEvent {
  _id: EntityId;
  provider: string;
  providerEventId: string;
  eventType: string;
  userId?: string;
  status: BillingEventEntity["status"];
  payloadHash: string;
  processedAt?: Date;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PLUS_ENTITLEMENT_KEYS: readonly BillingEntitlementKey[] = [
  "premium_templates",
  "premium_review_insights",
  "priority_reminders",
  "advanced_analytics",
];

function buildEntitlementGrants(
  planCode: BillingPlanCode,
  status: BillingSubscriptionStatus,
  grantedAt: Date,
  expiresAt?: Date,
): BillingSubscriptionEntity["entitlements"] {
  if (planCode !== "PLUS") return [];
  if (status !== "active" && status !== "trialing") return [];
  return PLUS_ENTITLEMENT_KEYS.map((key) => ({ key, grantedAt, expiresAt }));
}

function toSubscriptionEntity(doc: LeanSubscription): BillingSubscriptionEntity {
  const now = new Date();
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    planCode: doc.planCode,
    status: doc.status,
    provider: doc.provider,
    source: doc.source,
    providerCustomerId: doc.providerCustomerId,
    providerSubscriptionId: doc.providerSubscriptionId,
    billingCycle: doc.billingCycle,
    currentPeriodStart: doc.currentPeriodStart,
    currentPeriodEnd: doc.currentPeriodEnd,
    cancelAtPeriodEnd: doc.cancelAtPeriodEnd,
    canceledAt: doc.canceledAt,
    entitlements: (doc.entitlements ?? []).map((grant) => ({
      key: grant.key,
      grantedAt: grant.grantedAt,
      expiresAt: grant.expiresAt,
      revokedAt: grant.revokedAt,
    })),
    lastSyncedAt: doc.lastSyncedAt,
    createdAt: doc.createdAt ?? now,
    updatedAt: doc.updatedAt ?? now,
  };
}

function toBillingEventEntity(doc: LeanBillingEvent): BillingEventEntity {
  const now = new Date();
  return {
    id: doc._id.toString(),
    provider: doc.provider,
    providerEventId: doc.providerEventId,
    eventType: doc.eventType,
    userId: doc.userId,
    status: doc.status,
    payloadHash: doc.payloadHash,
    processedAt: doc.processedAt,
    error: doc.error,
    createdAt: doc.createdAt ?? now,
    updatedAt: doc.updatedAt ?? now,
  };
}

export class MongoBillingSubscriptionRepository
  implements ReconciliableSubscriptionRepository
{
  async findLatestByUserId(
    userId: string,
  ): Promise<BillingSubscriptionEntity | null> {
    const doc = await BillingSubscriptionModel.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return doc ? toSubscriptionEntity(doc as unknown as LeanSubscription) : null;
  }

  async findByProviderSubscriptionId(
    provider: string,
    providerSubscriptionId: string,
  ): Promise<BillingSubscriptionEntity | null> {
    const doc = await BillingSubscriptionModel.findOne({
      provider,
      providerSubscriptionId,
    })
      .lean()
      .exec();
    return doc ? toSubscriptionEntity(doc as unknown as LeanSubscription) : null;
  }

  async upsertFromProviderEvent(
    event: ProviderSubscriptionEvent,
  ): Promise<BillingSubscriptionEntity> {
    const now = new Date();
    const entitlements = buildEntitlementGrants(
      event.planCode,
      event.status,
      now,
      event.currentPeriodEnd,
    );

    const update = {
      userId: event.userId,
      planCode: event.planCode,
      status: event.status,
      provider: event.provider,
      source: "provider" as BillingSource,
      providerCustomerId: event.providerCustomerId,
      providerSubscriptionId: event.providerSubscriptionId,
      billingCycle: event.billingCycle,
      currentPeriodStart: event.currentPeriodStart,
      currentPeriodEnd: event.currentPeriodEnd,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      canceledAt: event.canceledAt,
      entitlements,
      lastSyncedAt: now,
    };

    const doc = event.providerSubscriptionId
      ? await BillingSubscriptionModel.findOneAndUpdate(
          {
            provider: event.provider,
            providerSubscriptionId: event.providerSubscriptionId,
          },
          { $set: update },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        )
          .lean()
          .exec()
      : await BillingSubscriptionModel.create(update).then((created) =>
          created.toObject(),
        );

    return toSubscriptionEntity(doc as unknown as LeanSubscription);
  }

  async createMockOrManual(
    userId: string,
    planCode: BillingPlanCode,
    source: BillingSource,
  ): Promise<BillingSubscriptionEntity> {
    const now = new Date();
    const created = await BillingSubscriptionModel.create({
      userId,
      planCode,
      status: "active",
      provider: "none",
      source,
      entitlements: buildEntitlementGrants(planCode, "active", now),
    });

    return toSubscriptionEntity(created.toObject() as unknown as LeanSubscription);
  }

  async markCancelAtPeriodEnd(
    userId: string,
  ): Promise<BillingSubscriptionEntity | null> {
    const latest = await BillingSubscriptionModel.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (!latest) return null;

    const latestId = (latest as unknown as LeanSubscription)._id;
    const updated = await BillingSubscriptionModel.findByIdAndUpdate(
      latestId,
      { $set: { cancelAtPeriodEnd: true } },
      { new: true },
    )
      .lean()
      .exec();

    return updated
      ? toSubscriptionEntity(updated as unknown as LeanSubscription)
      : null;
  }

  async findAllUserIds(): Promise<string[]> {
    return BillingSubscriptionModel.distinct("userId").exec();
  }

  async updateEntitlements(
    subscriptionId: string,
    entitlements: BillingSubscriptionEntity["entitlements"],
  ): Promise<void> {
    await BillingSubscriptionModel.findByIdAndUpdate(subscriptionId, {
      $set: { entitlements },
    }).exec();
  }
}

export class MongoBillingEventRepository implements BillingEventRepository {
  async findByProviderEventId(
    provider: string,
    providerEventId: string,
  ): Promise<BillingEventEntity | null> {
    const doc = await BillingEventModel.findOne({
      provider,
      providerEventId,
    })
      .lean()
      .exec();
    return doc ? toBillingEventEntity(doc as unknown as LeanBillingEvent) : null;
  }

  async createEvent(
    event: Omit<BillingEventEntity, "id" | "createdAt" | "updatedAt">,
  ): Promise<BillingEventEntity> {
    const created = await BillingEventModel.create(event);
    return toBillingEventEntity(created.toObject() as unknown as LeanBillingEvent);
  }

  async markProcessed(id: string, processedAt: Date): Promise<void> {
    await BillingEventModel.findByIdAndUpdate(id, {
      $set: { status: "processed", processedAt },
    }).exec();
  }

  async markFailed(id: string, error: string): Promise<void> {
    await BillingEventModel.findByIdAndUpdate(id, {
      $set: { status: "failed", error },
    }).exec();
  }
}

export function createMongoBillingRepositories(): {
  subscriptionRepo: BillingSubscriptionRepository;
  eventRepo: BillingEventRepository;
} {
  return {
    subscriptionRepo: new MongoBillingSubscriptionRepository(),
    eventRepo: new MongoBillingEventRepository(),
  };
}
