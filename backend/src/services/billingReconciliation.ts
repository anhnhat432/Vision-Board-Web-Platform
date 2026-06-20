/**
 * Billing Reconciliation Service
 *
 * Detects and fixes subscription entitlement mismatches, and reconciles
 * pending Casso payment orders when provider webhooks are missed.
 *
 * Safety:
 * - Entitlement reconciliation defaults to dry-run.
 * - Payment order reconciliation never logs bank account or raw amounts.
 * - Duplicate Casso transaction IDs are treated as idempotent success.
 */

import { createHash } from "node:crypto";
import type {
  BillingService,
  BillingSubscriptionRepository,
  UserEntitlementSnapshot,
} from "./billingService";
import type {
  BillingEntitlementKey,
  BillingSubscriptionEntity,
} from "./billingService";
import { resolveActiveEntitlementKeys } from "./billingService";
import { billingService } from "./billingServiceInstance";
import { PaymentOrderModel, type PaymentOrderDocument } from "../models/PaymentOrderModel";
import { OrderModel } from "../models/OrderModel";
import { deliverReceiptForOrder } from "./paymentReceiptDeliveryService";
import * as backendMonitoring from "../monitoring/sentry";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReconciliationResult {
  userId: string;
  subscriptionId: string | null;
  planCode: string;
  status: string;
  currentKeys: BillingEntitlementKey[];
  expectedKeys: BillingEntitlementKey[];
  isConsistent: boolean;
  mismatchReason?: string;
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
  write?: boolean;
  userIds?: string[];
}

export interface ReconciliableSubscriptionRepository extends BillingSubscriptionRepository {
  findAllUserIds(): Promise<string[]>;
  updateEntitlements(
    subscriptionId: string,
    entitlements: BillingSubscriptionEntity["entitlements"],
  ): Promise<void>;
}

// ─── Entitlement Reconciliation ──────────────────────────────────────────────

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

  const isExpired = subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date();
  let expectedKeys: BillingEntitlementKey[];
  const effectiveStatus = subscription.status;

  if (isExpired && (subscription.status === "active" || subscription.status === "trialing")) {
    expectedKeys = [];
  } else {
    expectedKeys = resolveActiveEntitlementKeys(subscription);
  }

  const now = new Date();
  const currentKeys = subscription.entitlements
    .filter((grant) => {
      if (grant.revokedAt) return false;
      if (grant.expiresAt && grant.expiresAt < now) return false;
      return true;
    })
    .map((grant) => grant.key);

  const expectedSet = new Set(expectedKeys);
  const currentSet = new Set(currentKeys);
  const isConsistent = expectedSet.size === currentSet.size && [...expectedSet].every((key) => currentSet.has(key));

  let mismatchReason: string | undefined;
  if (!isConsistent) {
    const missing = expectedKeys.filter((key) => !currentSet.has(key));
    const extra = currentKeys.filter((key) => !expectedSet.has(key));
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

export async function reconcileEntitlementForUser(
  repo: ReconciliableSubscriptionRepository,
  userId: string,
  write: boolean,
): Promise<ReconciliationResult> {
  const subscription = await repo.findLatestByUserId(userId);
  const result = checkSubscriptionConsistency(subscription, userId);

  if (!result.isConsistent && write && result.subscriptionId) {
    const now = new Date();
    const newEntitlements: BillingSubscriptionEntity["entitlements"] = result.expectedKeys.map((key) => ({
      key,
      grantedAt: now,
    }));

    await repo.updateEntitlements(result.subscriptionId, newEntitlements);
    result.updated = true;
  }

  return result;
}

export async function reconcileAllEntitlements(
  repo: ReconciliableSubscriptionRepository,
  options: ReconcileOptions = {},
): Promise<ReconciliationSummary> {
  const startedAt = new Date().toISOString();
  const write = options.write ?? false;
  const userIds = options.userIds?.length ? options.userIds : await repo.findAllUserIds();

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

// ─── Casso Payment Order Reconciliation ──────────────────────────────────────

const CASSO_RECONCILIATION_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const CASSO_RECONCILIATION_BATCH_SIZE = 30;
const CASSO_RECONCILIATION_SLEEP_MS = 200;
const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;

export interface CassoReconciliationTransaction {
  id?: string | number | null;
  tid?: string | number | null;
  reference?: string | number | null;
  description?: string | null;
  amount?: number | null;
  when?: string | null;
}

export interface CassoTransactionClient {
  listTransactions(input: {
    orderId: string;
    from: Date;
    to: Date;
  }): Promise<CassoReconciliationTransaction[]>;
}

export interface PaymentOrderReconciliationRunSummary {
  startedAt: string;
  finishedAt: string;
  ordersChecked: number;
  ordersMatched: number;
  errors: number;
}

interface CassoPaymentOrderModelLike {
  find(query: unknown): {
    sort(sort: unknown): { limit(limit: number): { exec(): Promise<PaymentOrderDocument[]> } };
  };
  findOne(query: unknown): Promise<PaymentOrderDocument | null>;
}

interface CassoPaymentOrderReconciliationDependencies {
  paymentOrderModel?: CassoPaymentOrderModelLike;
  transactionClient?: CassoTransactionClient;
  billing?: Pick<typeof billingService, "upsertSubscriptionFromProviderEvent">;
  receiptDelivery?: (orderId: string) => Promise<{ sent: boolean; reason?: string }>;
  captureException?: typeof backendMonitoring.captureBackendException;
  sleepMs?: number;
  now?: () => Date;
}

function getCassoApiBaseUrl(): string {
  return (process.env.CASSO_API_BASE_URL?.trim() || "https://oauth.casso.vn/v2").replace(/\/$/, "");
}

function getCassoApiKey(): string {
  return process.env.CASSO_API_KEY?.trim() || process.env.CASSO_ACCESS_TOKEN?.trim() || "";
}

function hashForLog(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === 11000);
}

function getCassoTransactionId(tx: CassoReconciliationTransaction): string {
  return String(tx.id ?? tx.tid ?? tx.reference ?? "").trim();
}

function transactionMatchesOrderId(tx: CassoReconciliationTransaction, orderId: string): boolean {
  return (tx.description ?? "").toUpperCase().includes(orderId.toUpperCase());
}

function parseCassoTransactionsPayload(payload: unknown): CassoReconciliationTransaction[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (Array.isArray(data)) return data as CassoReconciliationTransaction[];
  if (data && typeof data === "object") {
    const dataRecord = data as Record<string, unknown>;
    if (Array.isArray(dataRecord.records)) return dataRecord.records as CassoReconciliationTransaction[];
    if (Array.isArray(dataRecord.data)) return dataRecord.data as CassoReconciliationTransaction[];
  }
  if (Array.isArray(record.records)) return record.records as CassoReconciliationTransaction[];
  return [];
}

export function createCassoApiTransactionClient(): CassoTransactionClient {
  return {
    async listTransactions(input) {
      const apiKey = getCassoApiKey();
      if (!apiKey) return [];

      const url = new URL(`${getCassoApiBaseUrl()}/transactions`);
      url.searchParams.set("fromDate", input.from.toISOString());
      url.searchParams.set("toDate", input.to.toISOString());
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("sort", "DESC");

      const response = await fetch(url, {
        headers: {
          Authorization: `Apikey ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Casso transactions API failed with HTTP ${response.status}`);
      }
      return parseCassoTransactionsPayload(await response.json());
    },
  };
}

async function markAmountMismatch(
  order: PaymentOrderDocument,
  tx: CassoReconciliationTransaction,
  captureException: typeof backendMonitoring.captureBackendException,
): Promise<void> {
  const orderWithReconciliation = order as PaymentOrderDocument & {
    reconciliationStatus?: string;
    reconciliationLastCheckedAt?: Date;
    reconciliationLastError?: string;
  };
  orderWithReconciliation.reconciliationStatus = "amount_mismatch";
  orderWithReconciliation.reconciliationLastCheckedAt = new Date();
  orderWithReconciliation.reconciliationLastError = "amount_mismatch";
  await order.save();

  captureException(new Error("Casso reconciliation amount mismatch."), {
    tags: {
      event: "casso_reconciliation_amount_mismatch",
      provider: "casso",
    },
    extra: {
      orderIdHash: hashForLog(order.orderId),
      transactionIdHash: hashForLog(getCassoTransactionId(tx)),
      amountDirection: (tx.amount ?? 0) < order.amount ? "underpaid" : "overpaid",
    },
  });
}

export async function completePaymentOrderFromCassoTransaction(
  order: PaymentOrderDocument,
  tx: CassoReconciliationTransaction,
  dependencies: CassoPaymentOrderReconciliationDependencies = {},
): Promise<"completed" | "duplicate" | "amount_mismatch" | "ignored"> {
  const paymentOrderModel = dependencies.paymentOrderModel ?? PaymentOrderModel;
  const billing = dependencies.billing ?? billingService;
  const receiptDelivery = dependencies.receiptDelivery ?? deliverReceiptForOrder;
  const captureException = dependencies.captureException ?? backendMonitoring.captureBackendException;
  const now = dependencies.now?.() ?? new Date();
  const cassoTransactionId = getCassoTransactionId(tx);

  if (!cassoTransactionId || !transactionMatchesOrderId(tx, order.orderId)) return "ignored";

  const duplicate = await paymentOrderModel.findOne({ cassoTransactionId });
  if (duplicate?.status === "completed") return "duplicate";

  if (tx.amount !== order.amount) {
    await markAmountMismatch(order, tx, captureException);
    return "amount_mismatch";
  }

  try {
    const payloadHash = createHash("sha256").update(JSON.stringify(tx)).digest("hex");

    const isPhysicalOrder = order.purpose === "physical_order";

    if (isPhysicalOrder) {
      const physicalOrderId = order.metadata?.physicalOrderId;
      if (physicalOrderId) {
        const physicalOrder = await OrderModel.findById(physicalOrderId);
        if (physicalOrder?.status === "pending") {
          await OrderModel.updateOne(
            { _id: physicalOrderId, status: "pending" },
            {
              $set: { status: "confirmed" },
              $push: { statusHistory: { status: "confirmed", changedAt: now, changedBy: `reconciliation:${order.orderId}` } },
            },
          );
        }
      }
    } else {
      await billing.upsertSubscriptionFromProviderEvent({
        provider: "casso",
        providerEventId: `casso_${cassoTransactionId}`,
        eventType: "checkout_completed",
        payloadHash,
        userId: order.userId,
        planCode: "PLUS",
        status: "active",
        billingCycle: "twelve_week",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + TWELVE_WEEKS_MS),
        providerSubscriptionId: order.orderId,
      });
    }

    order.status = "completed";
    order.completedAt = now;
    order.cassoTransactionId = cassoTransactionId;
    const orderWithReconciliation = order as PaymentOrderDocument & {
      reconciliationStatus?: string;
      reconciliationLastCheckedAt?: Date;
      reconciliationLastError?: string | null;
    };
    orderWithReconciliation.reconciliationStatus = "matched";
    orderWithReconciliation.reconciliationLastCheckedAt = now;
    orderWithReconciliation.reconciliationLastError = null;
    await order.save();
    await receiptDelivery(order.orderId);
    return "completed";
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) return "duplicate";
    throw error;
  }
}

export async function reconcilePendingCassoPaymentOrders(
  dependencies: CassoPaymentOrderReconciliationDependencies = {},
): Promise<PaymentOrderReconciliationRunSummary> {
  const started = dependencies.now?.() ?? new Date();
  const paymentOrderModel = dependencies.paymentOrderModel ?? PaymentOrderModel;
  const transactionClient = dependencies.transactionClient ?? createCassoApiTransactionClient();
  const captureException = dependencies.captureException ?? backendMonitoring.captureBackendException;
  const sleepBetweenOrdersMs = dependencies.sleepMs ?? CASSO_RECONCILIATION_SLEEP_MS;
  let ordersChecked = 0;
  let ordersMatched = 0;
  let errors = 0;

  try {
    const lookbackStart = new Date(started.getTime() - CASSO_RECONCILIATION_LOOKBACK_MS);
    const orders = await paymentOrderModel
      .find({
        status: "pending",
        createdAt: { $gt: lookbackStart },
      })
      .sort({ createdAt: 1 })
      .limit(CASSO_RECONCILIATION_BATCH_SIZE)
      .exec();

    for (const order of orders) {
      ordersChecked++;
      try {
        const transactions = await transactionClient.listTransactions({
          orderId: order.orderId,
          from: lookbackStart,
          to: started,
        });
        const matchedTransaction = transactions.find((tx) => transactionMatchesOrderId(tx, order.orderId));
        if (!matchedTransaction) {
          await sleep(sleepBetweenOrdersMs);
          continue;
        }

        const result = await completePaymentOrderFromCassoTransaction(order, matchedTransaction, dependencies);
        if (result === "completed" || result === "duplicate") ordersMatched++;
      } catch (error) {
        errors++;
        captureException(error, {
          tags: {
            feature: "billing",
            severity: "critical",
            event: "casso_reconciliation_order_failed",
            provider: "casso",
          },
          extra: {
            orderId: order.orderId,
            amount: order.amount,
            status: order.status,
          },
        });
      }
      await sleep(sleepBetweenOrdersMs);
    }
  } catch (error) {
    errors++;
    captureException(error, {
      tags: {
        feature: "billing",
        severity: "critical",
        event: "casso_reconciliation_run_failed",
        provider: "casso",
      },
      extra: {
        status: "failed",
      },
    });
  }

  const summary = {
    startedAt: started.toISOString(),
    finishedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    ordersChecked,
    ordersMatched,
    errors,
  };
  console.info("[casso-reconciliation] run complete", summary);
  return summary;
}
