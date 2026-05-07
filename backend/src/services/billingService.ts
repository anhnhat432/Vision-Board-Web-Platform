/**
 * Provider-agnostic billing service.
 *
 * This service resolves entitlements from subscription state without
 * calling any external provider API. It uses a repository interface
 * so it can be tested with in-memory mocks and later wired to Mongo.
 *
 * Design principles:
 * - Server is the entitlement authority (not localStorage).
 * - No provider-specific code — provider adapters will be added later.
 * - No external API calls in this service.
 * - No sensitive data (card numbers, bank info) ever flows through here.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type BillingPlanCode = "FREE" | "PLUS";

export type BillingSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid";

export type BillingCycle = "monthly" | "quarterly" | "yearly" | "lifetime" | "twelve_week";

export type BillingSource = "mock" | "manual" | "provider";

export type BillingEntitlementKey =
  | "premium_templates"
  | "premium_review_insights"
  | "priority_reminders"
  | "advanced_analytics";

/** All entitlement keys granted to PLUS subscribers. */
const PLUS_ENTITLEMENT_KEYS: readonly BillingEntitlementKey[] = [
  "premium_templates",
  "premium_review_insights",
  "priority_reminders",
  "advanced_analytics",
] as const;

/** Subscription statuses that grant active entitlements. */
const ACTIVE_STATUSES = new Set<BillingSubscriptionStatus>([
  "trialing",
  "active",
]);

export interface EntitlementGrant {
  key: BillingEntitlementKey;
  grantedAt: Date;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}

export interface BillingSubscriptionEntity {
  id: string;
  userId: string;
  planCode: BillingPlanCode;
  status: BillingSubscriptionStatus;
  provider: string;
  source: BillingSource;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  billingCycle?: BillingCycle;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  entitlements: EntitlementGrant[];
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingEventEntity {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  userId?: string;
  status: "received" | "processed" | "ignored" | "failed";
  payloadHash: string;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEntitlementSnapshot {
  userId: string;
  planCode: BillingPlanCode;
  status: BillingSubscriptionStatus | "none";
  activeKeys: BillingEntitlementKey[];
  source: BillingSource | "default";
  subscriptionId?: string;
  resolvedAt: string;
}

// ─── Provider Event (input for upsert) ───────────────────────────────────────

export interface ProviderSubscriptionEvent {
  provider: string;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  userId: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  planCode: BillingPlanCode;
  status: BillingSubscriptionStatus;
  billingCycle?: BillingCycle;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
}

// ─── Repository Interfaces ───────────────────────────────────────────────────

export interface BillingSubscriptionRepository {
  findLatestByUserId(userId: string): Promise<BillingSubscriptionEntity | null>;
  findByProviderSubscriptionId(
    provider: string,
    providerSubscriptionId: string,
  ): Promise<BillingSubscriptionEntity | null>;
  upsertFromProviderEvent(
    event: ProviderSubscriptionEvent,
  ): Promise<BillingSubscriptionEntity>;
  createMockOrManual(
    userId: string,
    planCode: BillingPlanCode,
    source: BillingSource,
  ): Promise<BillingSubscriptionEntity>;
  markCancelAtPeriodEnd(
    userId: string,
  ): Promise<BillingSubscriptionEntity | null>;
}

export interface BillingEventRepository {
  findByProviderEventId(
    provider: string,
    providerEventId: string,
  ): Promise<BillingEventEntity | null>;
  createEvent(
    event: Omit<BillingEventEntity, "id" | "createdAt" | "updatedAt">,
  ): Promise<BillingEventEntity>;
  markProcessed(
    id: string,
    processedAt: Date,
  ): Promise<void>;
  markFailed(
    id: string,
    error: string,
  ): Promise<void>;
}

// ─── Entitlement Resolution (Pure Function) ──────────────────────────────────

/**
 * Resolves the current active entitlement keys for a subscription.
 *
 * Rules:
 * - Only "trialing" and "active" statuses grant entitlements.
 * - Only PLUS plan grants the standard entitlement set.
 * - FREE plan always returns an empty key set.
 * - If subscription has explicit entitlement grants, those are used
 *   (filtered by revocation/expiry). Otherwise, the default PLUS set
 *   is returned for active PLUS subscriptions.
 */
export function resolveActiveEntitlementKeys(
  subscription: BillingSubscriptionEntity | null,
): BillingEntitlementKey[] {
  if (!subscription) return [];
  if (subscription.planCode === "FREE") return [];
  if (!ACTIVE_STATUSES.has(subscription.status)) return [];

  // If subscription has explicit entitlement grants, filter them.
  if (subscription.entitlements.length > 0) {
    const now = new Date();
    return subscription.entitlements
      .filter((grant) => {
        if (grant.revokedAt) return false;
        if (grant.expiresAt && grant.expiresAt < now) return false;
        return true;
      })
      .map((grant) => grant.key);
  }

  // Default: PLUS subscribers get all standard entitlements.
  return [...PLUS_ENTITLEMENT_KEYS];
}

// ─── Service Class ───────────────────────────────────────────────────────────

export class BillingService {
  constructor(
    private readonly subscriptionRepo: BillingSubscriptionRepository,
    private readonly eventRepo: BillingEventRepository,
  ) {}

  /**
   * Returns the raw subscription entity for a user.
   * Used by portal/cancel endpoints to check subscription state.
   * Does not resolve entitlements — use getCurrentEntitlementForUser for that.
   */
  async getSubscriptionForUser(
    userId: string,
  ): Promise<BillingSubscriptionEntity | null> {
    return this.subscriptionRepo.findLatestByUserId(userId);
  }

  /**
   * Returns the current entitlement snapshot for a user.
   * If no subscription exists, returns FREE with no active keys.
   */
  async getCurrentEntitlementForUser(
    userId: string,
  ): Promise<UserEntitlementSnapshot> {
    const subscription = await this.subscriptionRepo.findLatestByUserId(userId);

    if (!subscription) {
      return {
        userId,
        planCode: "FREE",
        status: "none",
        activeKeys: [],
        source: "default",
        resolvedAt: new Date().toISOString(),
      };
    }

    const activeKeys = resolveActiveEntitlementKeys(subscription);

    return {
      userId,
      planCode: subscription.planCode,
      status: subscription.status,
      activeKeys,
      source: subscription.source,
      subscriptionId: subscription.id,
      resolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Marks a user's subscription to cancel at period end.
   * Does NOT immediately revoke entitlements.
   */
  async markCancelAtPeriodEnd(
    userId: string,
  ): Promise<BillingSubscriptionEntity | null> {
    return this.subscriptionRepo.markCancelAtPeriodEnd(userId);
  }

  /**
   * Processes a provider subscription event (e.g., from a webhook).
   *
   * Idempotency: if the same providerEventId has already been processed,
   * the event is ignored and the existing subscription is returned.
   *
   * Returns the updated subscription entity.
   */
  async upsertSubscriptionFromProviderEvent(
    event: ProviderSubscriptionEvent,
  ): Promise<{
    subscription: BillingSubscriptionEntity;
    eventStatus: "processed" | "duplicate" | "failed";
    eventId: string;
  }> {
    // Check for duplicate event.
    const existingEvent = await this.eventRepo.findByProviderEventId(
      event.provider,
      event.providerEventId,
    );
    if (existingEvent && existingEvent.status !== "failed") {
      const subscription =
        await this.subscriptionRepo.findLatestByUserId(event.userId);
      if (!subscription) {
        throw new Error(
          `Duplicate billing event "${event.providerEventId}" has no matching subscription.`,
        );
      }
      return {
        subscription,
        eventStatus: "duplicate",
        eventId: existingEvent.id,
      };
    }

    // Create event log entry, or retry a previous failed event without
    // creating a second idempotency record.
    const billingEvent =
      existingEvent ??
      (await this.eventRepo.createEvent({
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        userId: event.userId,
        status: "received",
        payloadHash: event.payloadHash,
      }));

    try {
      // Upsert the subscription.
      const subscription =
        await this.subscriptionRepo.upsertFromProviderEvent(event);

      // Mark event as processed.
      await this.eventRepo.markProcessed(billingEvent.id, new Date());

      return {
        subscription,
        eventStatus: "processed",
        eventId: billingEvent.id,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      await this.eventRepo.markFailed(billingEvent.id, message);
      throw error;
    }
  }

  /**
   * Creates a mock or manual subscription for dev/test.
   * This does NOT call any external provider.
   */
  async createMockOrManualEntitlement(
    userId: string,
    planCode: BillingPlanCode,
    source: Extract<BillingSource, "mock" | "manual">,
  ): Promise<BillingSubscriptionEntity> {
    return this.subscriptionRepo.createMockOrManual(userId, planCode, source);
  }
}
