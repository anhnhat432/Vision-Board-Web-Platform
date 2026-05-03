/**
 * CLI: Reconcile Billing Entitlements
 *
 * Usage:
 *   npx ts-node backend/scripts/reconcile-entitlements.ts [options]
 *
 * Or after build:
 *   node backend/dist/scripts/reconcile-entitlements.js [options]
 *
 * Options:
 *   --write          Actually write fixes (default: dry-run)
 *   --user <uid>     Reconcile a single user (can repeat)
 *   --help           Show help
 *
 * Examples:
 *   npx ts-node backend/scripts/reconcile-entitlements.ts
 *   npx ts-node backend/scripts/reconcile-entitlements.ts --write
 *   npx ts-node backend/scripts/reconcile-entitlements.ts --user uid1 --user uid2
 *   npx ts-node backend/scripts/reconcile-entitlements.ts --user uid1 --write
 *
 * Safety:
 *   - Default mode is DRY-RUN (no writes to DB)
 *   - Only --write flag enables actual updates
 *   - No sensitive data is logged (no card numbers, no raw webhook payloads)
 *   - No external provider API calls
 *   - No deletion of billing events
 */

import {
  reconcileAllEntitlements,
  type ReconciliableSubscriptionRepository,
  type ReconciliationSummary,
} from "../src/services/billingReconciliation";
import {
  type BillingEntitlementKey,
  type BillingPlanCode,
  type BillingSource,
  type BillingSubscriptionEntity,
  type ProviderSubscriptionEvent,
} from "../src/services/billingService";

// ─── Argument Parsing ────────────────────────────────────────────────────────

function parseArgs(args: string[]): { write: boolean; userIds: string[]; help: boolean } {
  const result = { write: false, userIds: [] as string[], help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--write") {
      result.write = true;
    } else if (arg === "--user" && i + 1 < args.length) {
      i++;
      result.userIds.push(args[i]);
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    }
  }
  return result;
}

function printHelp(): void {
  console.log(`
Billing Entitlement Reconciliation Tool

Usage:
  npx ts-node backend/scripts/reconcile-entitlements.ts [options]

Options:
  --write          Actually write fixes (default: dry-run)
  --user <uid>     Reconcile a single user (can repeat)
  --help, -h       Show this help message

Examples:
  # Dry-run check all users
  npx ts-node backend/scripts/reconcile-entitlements.ts

  # Fix all mismatches
  npx ts-node backend/scripts/reconcile-entitlements.ts --write

  # Check specific user
  npx ts-node backend/scripts/reconcile-entitlements.ts --user user_abc123

Safety:
  Default mode is DRY-RUN. No writes unless --write is specified.
  No sensitive data logged. No external API calls. No event deletion.
`);
}

// ─── In-Memory Repo (for testing without MongoDB) ────────────────────────────
// This matches the singleton pattern. When Mongo repos are ready,
// this script would import the Mongo-backed instance instead.

function createInMemoryReconciliableRepo(): ReconciliableSubscriptionRepository {
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

// ─── Report Formatting ───────────────────────────────────────────────────────

function printSummary(summary: ReconciliationSummary): void {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  Billing Entitlement Reconciliation Report");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  Mode:          ${summary.dryRun ? "DRY-RUN (no writes)" : "WRITE MODE"}`);
  console.log(`  Started:       ${summary.startedAt}`);
  console.log(`  Completed:     ${summary.completedAt}`);
  console.log(`  Total checked: ${summary.totalChecked}`);
  console.log(`  Consistent:    ${summary.consistent}`);
  console.log(`  Inconsistent:  ${summary.inconsistent}`);
  console.log(`  Updated:       ${summary.updated}`);
  console.log(`  Skipped:       ${summary.skipped}`);
  console.log("──────────────────────────────────────────────────────\n");

  if (summary.inconsistent > 0) {
    console.log("Mismatches found:\n");
    for (const r of summary.results) {
      if (r.isConsistent) continue;
      console.log(`  userId:   ${r.userId}`);
      console.log(`  subId:    ${r.subscriptionId ?? "none"}`);
      console.log(`  plan:     ${r.planCode} (${r.status})`);
      console.log(`  current:  [${r.currentKeys.join(", ")}]`);
      console.log(`  expected: [${r.expectedKeys.join(", ")}]`);
      console.log(`  reason:   ${r.mismatchReason}`);
      console.log(`  updated:  ${r.updated}`);
      console.log();
    }
  } else {
    console.log("  ✓ All entitlements are consistent.\n");
  }

  if (summary.dryRun && summary.inconsistent > 0) {
    console.log("  Re-run with --write to apply fixes.\n");
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`\n[reconcile] Starting reconciliation...`);
  console.log(`[reconcile] Mode: ${args.write ? "WRITE" : "DRY-RUN"}`);
  if (args.userIds.length > 0) {
    console.log(`[reconcile] Target users: ${args.userIds.join(", ")}`);
  } else {
    console.log(`[reconcile] Target: ALL users with subscriptions`);
  }

  // TODO: When Mongo repos are ready, connect to MongoDB and use the real repo.
  // For now, this script demonstrates the reconciliation flow with in-memory data.
  // In production, replace with:
  //   await mongoose.connect(env.MONGODB_URI);
  //   const repo = createMongoReconciliableRepo();
  const repo = createInMemoryReconciliableRepo();

  const summary = await reconcileAllEntitlements(repo, {
    write: args.write,
    userIds: args.userIds.length > 0 ? args.userIds : undefined,
  });

  printSummary(summary);

  process.exit(summary.inconsistent > 0 && !args.write ? 1 : 0);
}

main().catch((error) => {
  console.error("[reconcile] Fatal error:", error instanceof Error ? error.message : error);
  process.exit(2);
});
