/**
 * Billing Reconciliation Service
 *
 * Pure-ish service that detects and optionally fixes mismatches between
 * subscription records and their entitlement grants.
 *
 * Rules:
 * - active/trialing PLUS subscription → full PLUS entitlements
 * - canceled/past_due/incomplete/unpaid subscription → no entitlements
 * - expired currentPeriodEnd on active sub → no entitlements (treated as expired)
 * - FREE plan → no entitlements regardless of status
 * - No subscription → no entitlements (FREE)
 * - pending checkout → does NOT grant entitlements
 * - payment_failed → does NOT grant entitlements
 *
 * Safety:
 * - Default is dry-run (no writes)
 * - No external provider API calls
 * - No sensitive data in logs
 * - No deletion of billing events
 */

import {
  resolveActiveEntitlementKeys,
  type BillingEntitlementKey,
  type BillingSubscriptionEntity,
  type BillingSubscriptionRepository,
} from "./billingService";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReconciliationResult {
  userId: string;
  subscriptionId: string | null;
  planCode: string;
  status: string;
  /** Entitlement keys currently stored on the subscription record. */
  currentKeys: BillingEntitlementKey[];
  /** Entitlement keys that SHOULD be on the subscription according to rules. */
  expectedKeys: BillingEntitlementKey[];
  /** Whether the current and expected keys match. */
  isConsistent: boolean;
  /** Description of the mismatch, if any. */
  mismatchReason?: string;
  /** Whether a write was performed (only true when write=true and isConsistent=false). */
  updated: boolean;
}

export interface ReconciliationSummary {
  totalChecked: number;
  consistent: number;
  inconsistent: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  results: ReconciliationResult[];
  startedAt: string;
  completedAt: string;
}

export interface ReconcileOptions {
  /** If true, actually write fixes to the repository. Default: false (dry-run). */
  write?: boolean;
  /** Optional list of userIds to check. If empty, checks all. */
  userIds?: string[];
}

// ─── Extended Repository Interface ───────────────────────────────────────────

/**
 * The reconciliation service needs a few extra methods beyond the base
 * BillingSubscriptionRepository. These are added here so the base
 * interface stays minimal.
 */
export interface ReconciliableSubscriptionRepository extends BillingSubscriptionRepository {
  /** Return all unique userIds that have at least one subscription. */
  findAllUserIds(): Promise<string[]>;
  /** Update the entitlements array on a subscription. */
  updateEntitlements(
    subscriptionId: string,
    entitlements: BillingSubscriptionEntity["entitlements"],
  ): Promise<void>;
}

// ─── Core Logic (Pure) ───────────────────────────────────────────────────────

/**
 * Check whether a subscription's stored entitlements match what the
 * current rules say they should be.
 *
 * This is a pure function — no side effects.
 */
export function checkSubscriptionConsistency(
  subscription: BillingSubscriptionEntity | null,
  userId: string,
): ReconciliationResult {
  if (!subscription) {
    return {
      userId,
      subscriptionId: null,
      planCode: "FREE",
      status: "none",
      currentKeys: [],
      expectedKeys: [],
      isConsistent: true,
      updated: false,
    };
  }

  // Check if currentPeriodEnd has passed (expired)
  const isExpired =
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd < new Date();

  // For expired active/trialing subs, expected keys should be empty
  let expectedKeys: BillingEntitlementKey[];
  let effectiveStatus = subscription.status;

  if (
    isExpired &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    expectedKeys = [];
    effectiveStatus = subscription.status; // keep original status in output
  } else {
    expectedKeys = resolveActiveEntitlementKeys(subscription);
  }

  // Get currently stored active keys (filtering revoked/expired)
  const now = new Date();
  const currentKeys = subscription.entitlements
    .filter((g) => {
      if (g.revokedAt) return false;
      if (g.expiresAt && g.expiresAt < now) return false;
      return true;
    })
    .map((g) => g.key);

  // Compare sets
  const expectedSet = new Set(expectedKeys);
  const currentSet = new Set(currentKeys);
  const isConsistent =
    expectedSet.size === currentSet.size &&
    [...expectedSet].every((k) => currentSet.has(k));

  let mismatchReason: string | undefined;
  if (!isConsistent) {
    const missing = expectedKeys.filter((k) => !currentSet.has(k));
    const extra = currentKeys.filter((k) => !expectedSet.has(k));
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing: [${missing.join(", ")}]`);
    if (extra.length > 0) parts.push(`extra: [${extra.join(", ")}]`);
    if (isExpired) parts.push("subscription period expired");
    mismatchReason = parts.join("; ");
  }

  return {
    userId,
    subscriptionId: subscription.id,
    planCode: subscription.planCode,
    status: effectiveStatus,
    currentKeys,
    expectedKeys,
    isConsistent,
    mismatchReason,
    updated: false,
  };
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Reconcile entitlements for a single user.
 */
export async function reconcileEntitlementForUser(
  repo: ReconciliableSubscriptionRepository,
  userId: string,
  write: boolean,
): Promise<ReconciliationResult> {
  const subscription = await repo.findLatestByUserId(userId);
  const result = checkSubscriptionConsistency(subscription, userId);

  if (!result.isConsistent && write && result.subscriptionId) {
    const now = new Date();
    const newEntitlements: BillingSubscriptionEntity["entitlements"] =
      result.expectedKeys.map((key) => ({
        key,
        grantedAt: now,
      }));

    await repo.updateEntitlements(result.subscriptionId, newEntitlements);
    result.updated = true;
  }

  return result;
}

/**
 * Reconcile entitlements for all users (or a subset).
 */
export async function reconcileAllEntitlements(
  repo: ReconciliableSubscriptionRepository,
  options: ReconcileOptions = {},
): Promise<ReconciliationSummary> {
  const startedAt = new Date().toISOString();
  const write = options.write ?? false;

  const userIds = options.userIds?.length
    ? options.userIds
    : await repo.findAllUserIds();

  const results: ReconciliationResult[] = [];
  let consistent = 0;
  let inconsistent = 0;
  let updated = 0;
  let skipped = 0;

  for (const userId of userIds) {
    try {
      const result = await reconcileEntitlementForUser(repo, userId, write);
      results.push(result);
      if (result.isConsistent) {
        consistent++;
      } else {
        inconsistent++;
        if (result.updated) updated++;
      }
    } catch {
      skipped++;
      results.push({
        userId,
        subscriptionId: null,
        planCode: "unknown",
        status: "error",
        currentKeys: [],
        expectedKeys: [],
        isConsistent: false,
        mismatchReason: "Error during reconciliation",
        updated: false,
      });
    }
  }

  return {
    totalChecked: userIds.length,
    consistent,
    inconsistent,
    updated,
    skipped,
    dryRun: !write,
    results,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}
