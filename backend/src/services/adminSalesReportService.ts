import mongoose, { type ClientSession, type FilterQuery, type PipelineStage } from "mongoose";

import * as backendMonitoring from "../monitoring/sentry";
import { AdminAuditOutboxModel, type AdminAuditOutboxInsert } from "../models/AdminAuditOutboxModel";
import {
  PaymentOrderModel,
  type PaymentOrderDocument,
  type PaymentReportingExclusionReason,
  type PaymentReportingKpiStatus,
} from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import type { AdminOperationalClassificationSummary, OperationalCategory, OperationalClassificationSource } from "../models/OperationalClassification";
import {
  buildAdminSalesReviewAuditIdentity,
  dispatchAdminAuditOutboxEvent,
  isDuplicateAdminAuditEventIdError,
  resolveAdminAuditIdempotency,
  type AdminSalesReviewAuditIdentity,
} from "./adminAuditOutboxService";
import {
  buildEffectiveOperationalClassificationStages,
  serializeProjectedOperationalClassification,
} from "./adminOperationalClassificationQuery";
import { ApiError } from "../utils/apiError";

const REPORT_TIMEZONE = "Asia/Ho_Chi_Minh" as const;
const REPORT_OFFSET = "+07:00";
const REAL_PROVIDERS = ["payos", "casso"] as const;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_RANGE_DAYS = 366;
const MAX_EXPORT_ROWS = 10_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminSalesReportProvider = "all" | (typeof REAL_PROVIDERS)[number];
export type AdminSalesReportStatus = PaymentReportingKpiStatus;

export interface AdminSalesReportQueryInput {
  from?: unknown;
  to?: unknown;
  provider?: unknown;
  kpiStatus?: unknown;
  page?: unknown;
  limit?: unknown;
}

export interface AdminSalesReportFilters {
  from: Date;
  toExclusive: Date;
  fromDate: string;
  toDate: string;
  provider: AdminSalesReportProvider;
  kpiStatus: AdminSalesReportStatus;
  page: number;
  limit: number;
  timezone: typeof REPORT_TIMEZONE;
}

export interface AdminSalesReportResult {
  generatedAt: string;
  filters: {
    from: string;
    to: string;
    provider: AdminSalesReportProvider;
    kpiStatus: AdminSalesReportStatus;
    timezone: typeof REPORT_TIMEZONE;
  };
  availableProviders: Array<(typeof REAL_PROVIDERS)[number]>;
  summary: {
    successfulTransactions: number;
    uniquePaidUsers: number;
    grossRevenueVnd: number;
    refundedAmountVnd: number;
    netRevenueVnd: number;
    pendingReviews: number;
  };
  tabCounts: Record<PaymentReportingKpiStatus, number>;
  dailyBuckets: Array<{
    date: string;
    transactions: number;
    grossRevenueVnd: number;
    refundedAmountVnd: number;
    netRevenueVnd: number;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AdminSalesReportRow[];
}

export interface AdminSalesReportRow {
  orderId: string;
  customerLabelMasked: string;
  customerEmailMasked: string;
  provider: (typeof REAL_PROVIDERS)[number];
  providerReference: string | null;
  amountVnd: number;
  currency: "VND";
  completedAt: string;
  isManualCompletion: boolean;
  payer: {
    classification: "internal" | "external" | "unknown";
    accountLast4?: string;
    accountMasked?: string;
    accountNameMasked?: string;
    bankName?: string;
    transactionReference?: string;
    transactionDateTime?: string;
    source: "webhook" | "reconciliation";
    observedAt: string;
  } | null;
  refund: {
    status: "none" | "completed";
    amountVnd: number;
    completedAt: string | null;
  };
  effectiveKpiStatus: PaymentReportingKpiStatus;
  operationalClassification: AdminOperationalClassificationSummary;
  reporting: {
    kpiStatus: PaymentReportingKpiStatus;
    exclusionReason: PaymentReportingExclusionReason | null;
    reviewedAt: string | null;
  };
}

function dateKeyInVietnam(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateKey(value: unknown, field: "from" | "to"): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `${field} must use YYYY-MM-DD.`, undefined, "invalid_sales_report_date");
  }
  const parsed = new Date(`${value}T00:00:00${REPORT_OFFSET}`);
  if (!Number.isFinite(parsed.getTime()) || dateKeyInVietnam(parsed) !== value) {
    throw new ApiError(400, `${field} is not a valid calendar date.`, undefined, "invalid_sales_report_date");
  }
  return value;
}

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ApiError(400, "Invalid sales report pagination.", undefined, "invalid_sales_report_pagination");
  }
  return parsed;
}

export function parseAdminSalesReportFilters(
  input: AdminSalesReportQueryInput,
  now = new Date(),
): AdminSalesReportFilters {
  const defaultTo = dateKeyInVietnam(now);
  const defaultToDate = new Date(`${defaultTo}T00:00:00${REPORT_OFFSET}`);
  defaultToDate.setUTCDate(defaultToDate.getUTCDate() - 29);
  const defaultFrom = dateKeyInVietnam(defaultToDate);
  const fromDate = parseDateKey(input.from, "from") ?? defaultFrom;
  const toDate = parseDateKey(input.to, "to") ?? defaultTo;
  const from = new Date(`${fromDate}T00:00:00${REPORT_OFFSET}`);
  const toStart = new Date(`${toDate}T00:00:00${REPORT_OFFSET}`);
  const toExclusive = new Date(toStart);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const rangeDays = Math.round((toExclusive.getTime() - from.getTime()) / 86_400_000);
  if (rangeDays < 1 || rangeDays > MAX_RANGE_DAYS) {
    throw new ApiError(400, "Sales report range must be between 1 and 366 days.", undefined, "invalid_sales_report_range");
  }

  const providerValue = input.provider ?? "all";
  if (
    typeof providerValue !== "string" ||
    (providerValue !== "all" && !REAL_PROVIDERS.includes(providerValue as (typeof REAL_PROVIDERS)[number]))
  ) {
    throw new ApiError(400, "Unsupported sales report provider.", undefined, "invalid_sales_report_provider");
  }
  const provider = providerValue as AdminSalesReportProvider;
  const statusValue = input.kpiStatus ?? "pending";
  if (
    typeof statusValue !== "string" ||
    (statusValue !== "pending" && statusValue !== "included" && statusValue !== "excluded")
  ) {
    throw new ApiError(400, "Unsupported KPI review status.", undefined, "invalid_sales_report_status");
  }
  const kpiStatus = statusValue as AdminSalesReportStatus;

  return {
    from,
    toExclusive,
    fromDate,
    toDate,
    provider,
    kpiStatus,
    page: parsePositiveInt(input.page, 1, 1_000_000),
    limit: parsePositiveInt(input.limit, DEFAULT_LIMIT, MAX_LIMIT),
    timezone: REPORT_TIMEZONE,
  };
}

export function buildQualifyingSalesFilter(
  filters: AdminSalesReportFilters,
): FilterQuery<PaymentOrderDocument> {
  return {
    status: "completed",
    purpose: "plus_subscription",
    currency: "VND",
    provider: filters.provider === "all" ? { $in: [...REAL_PROVIDERS] } : filters.provider,
    completedAt: { $gte: filters.from, $lt: filters.toExclusive },
  };
}

interface RawSalesPayer {
  classification: "internal" | "external" | "unknown";
  accountLast4?: string;
  accountMasked?: string;
  accountNameMasked?: string;
  bankName?: string;
  transactionReference?: string;
  transactionDateTime?: string;
  source: "webhook" | "reconciliation";
  observedAt: Date | string;
}

interface RawSalesRow {
  orderId: string;
  amount: number;
  currency: "VND";
  provider: (typeof REAL_PROVIDERS)[number];
  completedAt: Date;
  user?: { email?: string; displayName?: string } | null;
  payer?: RawSalesPayer | null;
  refund?: { resolvedAt?: Date | null } | null;
  isRefunded?: boolean;
  effectiveKpiStatus?: PaymentReportingKpiStatus;
  __effectiveOperationalCategory?: OperationalCategory;
  __effectiveOperationalSource?: OperationalClassificationSource;
  __effectiveOperationalReason?: AdminOperationalClassificationSummary["reason"];
  __effectiveOperationalNote?: string;
  __effectiveOperationalClassifiedAt?: Date | null;
  reporting?: {
    kpiStatus?: PaymentReportingKpiStatus;
    exclusionReason?: PaymentReportingExclusionReason | null;
    reviewedAt?: Date | null;
  } | null;
  manualCompletedAt?: Date | null;
  cassoTransactionId?: string | null;
}

interface AggregateFacetResult {
  summary?: Array<Omit<AdminSalesReportResult["summary"], "pendingReviews">>;
  tabCounts?: Array<{ _id: PaymentReportingKpiStatus; count: number }>;
  dailyBuckets?: Array<{
    _id: string;
    transactions: number;
    grossRevenueVnd: number;
    refundedAmountVnd: number;
    netRevenueVnd: number;
  }>;
  rowCount?: Array<{ count: number }>;
  rows?: RawSalesRow[];
}

function maskEmail(value: string | undefined): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return "Không có email";
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

function maskPersonName(value: string | undefined, orderId: string): string {
  const parts = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return `KH-${orderId.slice(-4).toUpperCase()}`;
  return parts.map((part) => `${part.slice(0, 1).toUpperCase()}***`).join(" ");
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function serializePayer(value: RawSalesPayer | null | undefined): AdminSalesReportRow["payer"] {
  if (!value) return null;
  return {
    classification: value.classification,
    ...(value.accountLast4 ? { accountLast4: value.accountLast4 } : {}),
    ...(value.accountMasked ? { accountMasked: value.accountMasked } : {}),
    ...(value.accountNameMasked ? { accountNameMasked: value.accountNameMasked } : {}),
    ...(value.bankName ? { bankName: value.bankName } : {}),
    ...(value.transactionReference ? { transactionReference: value.transactionReference } : {}),
    ...(value.transactionDateTime ? { transactionDateTime: value.transactionDateTime } : {}),
    source: value.source,
    observedAt: toIso(value.observedAt) ?? "",
  };
}

function serializeSalesRow(row: RawSalesRow): AdminSalesReportRow {
  const isRefunded = Boolean(row.isRefunded);
  const refundCompletedAt = toIso(row.refund?.resolvedAt);
  const status = row.reporting?.kpiStatus ?? "pending";
  const operationalClassification = row.__effectiveOperationalCategory
    ? serializeProjectedOperationalClassification(row as unknown as Record<string, unknown>)
    : { effectiveCategory: "real", source: "default" } as const;
  return {
    orderId: row.orderId,
    customerLabelMasked: maskPersonName(row.user?.displayName, row.orderId),
    customerEmailMasked: maskEmail(row.user?.email),
    provider: row.provider,
    providerReference: row.payer?.transactionReference ?? row.cassoTransactionId ?? null,
    amountVnd: row.amount,
    currency: "VND",
    completedAt: toIso(row.completedAt) ?? "",
    isManualCompletion: Boolean(row.manualCompletedAt),
    payer: serializePayer(row.payer),
    refund: {
      status: isRefunded ? "completed" : "none",
      amountVnd: isRefunded ? row.amount : 0,
      completedAt: refundCompletedAt,
    },
    effectiveKpiStatus: row.effectiveKpiStatus ?? status,
    operationalClassification,
    reporting: {
      kpiStatus: status,
      exclusionReason: row.reporting?.exclusionReason ?? null,
      reviewedAt: toIso(row.reporting?.reviewedAt),
    },
  };
}

export function buildAdminSalesReportPipeline(
  filters: AdminSalesReportFilters,
  options: { exportAll?: boolean } = {},
): PipelineStage[] {
  const rowMatch = { __effectiveKpiStatus: filters.kpiStatus };
  const skip = (filters.page - 1) * filters.limit;
  const rowsPipeline: PipelineStage.FacetPipelineStage[] = [
    { $match: rowMatch },
    { $sort: { completedAt: -1, orderId: 1 } },
  ];
  if (options.exportAll) rowsPipeline.push({ $limit: MAX_EXPORT_ROWS + 1 });
  else rowsPipeline.push({ $skip: skip }, { $limit: filters.limit });

  return [
    { $match: buildQualifyingSalesFilter(filters) },
    ...buildEffectiveOperationalClassificationStages({
      userIdField: "userId",
      recordClassificationField: "operationalClassification",
      legacySalesReasonField: "reporting.exclusionReason",
    }),
    {
      $set: {
        __storedKpiStatus: { $ifNull: ["$reporting.kpiStatus", "pending"] },
        __effectiveKpiStatus: {
          $cond: [
            { $ne: ["$__effectiveOperationalCategory", "real"] },
            "excluded",
            { $ifNull: ["$reporting.kpiStatus", "pending"] },
          ],
        },
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: "userId",
        foreignField: "firebaseUid",
        pipeline: [{ $project: { _id: 0, email: 1, displayName: 1 } }],
        as: "users",
      },
    },
    { $set: { user: { $first: "$users" }, payer: "$metadata.payos.payer" } },
    {
      $lookup: {
        from: RefundRequestModel.collection.name,
        let: { reportOrderId: "$orderId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$orderId", "$$reportOrderId"] },
                  { $eq: ["$status", "completed"] },
                ],
              },
            },
          },
          { $sort: { resolvedAt: -1 } },
          { $limit: 1 },
          { $project: { _id: 0, resolvedAt: 1 } },
        ],
        as: "refunds",
      },
    },
    { $set: { refund: { $first: "$refunds" }, isRefunded: { $gt: [{ $size: "$refunds" }, 0] } } },
    {
      $project: {
        _id: 0,
        orderId: 1,
        userId: 1,
        amount: 1,
        currency: 1,
        provider: 1,
        completedAt: 1,
        cassoTransactionId: 1,
        manualCompletedAt: 1,
        reporting: {
          kpiStatus: "$reporting.kpiStatus",
          exclusionReason: "$reporting.exclusionReason",
          reviewedAt: "$reporting.reviewedAt",
        },
        effectiveKpiStatus: "$__effectiveKpiStatus",
        __effectiveKpiStatus: 1,
        __effectiveOperationalCategory: 1,
        __effectiveOperationalSource: 1,
        __effectiveOperationalReason: 1,
        __effectiveOperationalNote: 1,
        __effectiveOperationalClassifiedAt: 1,
        user: 1,
        payer: 1,
        refund: 1,
        isRefunded: 1,
      },
    },
    {
      $facet: {
        summary: [
          { $match: { __effectiveKpiStatus: "included" } },
          {
            $group: {
              _id: null,
              successfulTransactions: { $sum: 1 },
              paidUsers: { $addToSet: "$userId" },
              grossRevenueVnd: { $sum: "$amount" },
              refundedAmountVnd: { $sum: { $cond: ["$isRefunded", "$amount", 0] } },
              netRevenueVnd: { $sum: { $cond: ["$isRefunded", 0, "$amount"] } },
            },
          },
          {
            $project: {
              _id: 0,
              successfulTransactions: 1,
              uniquePaidUsers: { $size: "$paidUsers" },
              grossRevenueVnd: 1,
              refundedAmountVnd: 1,
              netRevenueVnd: 1,
            },
          },
        ],
        tabCounts: [{ $group: { _id: "$__effectiveKpiStatus", count: { $sum: 1 } } }],
        dailyBuckets: [
          { $match: { __effectiveKpiStatus: "included" } },
          {
            $group: {
              _id: {
                $dateToString: {
                  date: "$completedAt",
                  format: "%Y-%m-%d",
                  timezone: REPORT_TIMEZONE,
                },
              },
              transactions: { $sum: 1 },
              grossRevenueVnd: { $sum: "$amount" },
              refundedAmountVnd: { $sum: { $cond: ["$isRefunded", "$amount", 0] } },
              netRevenueVnd: { $sum: { $cond: ["$isRefunded", 0, "$amount"] } },
            },
          },
          { $sort: { _id: 1 } },
        ],
        rowCount: [{ $match: rowMatch }, { $count: "count" }],
        rows: rowsPipeline,
      },
    },
  ];
}

const ZERO_SUMMARY = {
  successfulTransactions: 0,
  uniquePaidUsers: 0,
  grossRevenueVnd: 0,
  refundedAmountVnd: 0,
  netRevenueVnd: 0,
};

function normalizeFacet(
  facet: AggregateFacetResult | undefined,
  filters: AdminSalesReportFilters,
): AdminSalesReportResult {
  const tabCounts: Record<PaymentReportingKpiStatus, number> = { pending: 0, included: 0, excluded: 0 };
  for (const entry of facet?.tabCounts ?? []) tabCounts[entry._id] = entry.count;
  const total = facet?.rowCount?.[0]?.count ?? 0;
  const baseSummary = facet?.summary?.[0] ?? ZERO_SUMMARY;
  return {
    generatedAt: new Date().toISOString(),
    filters: {
      from: filters.fromDate,
      to: filters.toDate,
      provider: filters.provider,
      kpiStatus: filters.kpiStatus,
      timezone: filters.timezone,
    },
    availableProviders: [...REAL_PROVIDERS],
    summary: { ...baseSummary, pendingReviews: tabCounts.pending },
    tabCounts,
    dailyBuckets: (facet?.dailyBuckets ?? []).map((bucket) => ({
      date: bucket._id,
      transactions: bucket.transactions,
      grossRevenueVnd: bucket.grossRevenueVnd,
      refundedAmountVnd: bucket.refundedAmountVnd,
      netRevenueVnd: bucket.netRevenueVnd,
    })),
    page: filters.page,
    limit: filters.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    items: (facet?.rows ?? []).map(serializeSalesRow),
  };
}

export async function getAdminSalesReport(input: AdminSalesReportQueryInput): Promise<AdminSalesReportResult> {
  const filters = parseAdminSalesReportFilters(input);
  const [facet] = await PaymentOrderModel.aggregate<AggregateFacetResult>(buildAdminSalesReportPipeline(filters));
  return normalizeFacet(facet, filters);
}

export interface AdminSalesReportExport {
  report: AdminSalesReportResult;
  filename: string;
}

export async function getAdminSalesReportExport(input: AdminSalesReportQueryInput): Promise<AdminSalesReportExport> {
  const filters = parseAdminSalesReportFilters({ ...input, page: 1, limit: MAX_LIMIT });
  const [facet] = await PaymentOrderModel.aggregate<AggregateFacetResult>(
    buildAdminSalesReportPipeline(filters, { exportAll: true }),
  );
  const total = facet?.rowCount?.[0]?.count ?? 0;
  if (total > MAX_EXPORT_ROWS) {
    throw new ApiError(
      422,
      "Sales report export exceeds 10,000 rows. Narrow the filters.",
      undefined,
      "sales_export_too_large",
    );
  }
  const report = normalizeFacet(facet, { ...filters, limit: Math.max(total, 1) });
  return { report, filename: `sales-report-${filters.fromDate}-to-${filters.toDate}.csv` };
}

export interface ReviewAdminSalesOrderInput {
  orderId: string;
  reviewerUid: string;
  reviewRequestId: unknown;
  kpiStatus: unknown;
  exclusionReason?: unknown;
  reviewNote?: unknown;
}

interface RawReviewOrder extends RawSalesRow {
  _id: unknown;
  userId: string;
  status: "completed";
  purpose: "plus_subscription";
  updatedAt: Date;
  metadata?: { payos?: { payer?: RawSalesPayer | null } | null } | null;
}

interface AdminSalesReviewResponseContext {
  user: { email?: string; displayName?: string } | null;
  refund: { resolvedAt?: Date | null } | null;
}

interface PreloadedAdminSalesReviewResponse {
  order: RawReviewOrder;
  context: AdminSalesReviewResponseContext;
}

export interface ReviewAdminSalesOrderDependencies {
  triggerAuditDispatch(eventId: string): void;
}

const REVIEW_ORDER_SELECTION =
  "_id orderId userId status purpose amount currency provider completedAt cassoTransactionId " +
  "metadata.payos.payer manualCompletedAt reporting updatedAt";

const defaultReviewDependencies: ReviewAdminSalesOrderDependencies = {
  triggerAuditDispatch(eventId) {
    void dispatchAdminAuditOutboxEvent(eventId).catch(() => {
      backendMonitoring.captureBackendException(new Error("Admin audit outbox immediate dispatch failed."), {
        tags: { feature: "admin_audit_outbox", stage: "immediate_dispatch" },
        extra: { eventId },
      });
    });
  },
};

const qualifyingReviewFilter = (orderId: string) => ({
  orderId,
  status: "completed",
  purpose: "plus_subscription",
  currency: "VND",
  provider: { $in: [...REAL_PROVIDERS] },
});

async function loadAdminSalesReviewResponse(orderId: string): Promise<PreloadedAdminSalesReviewResponse> {
  const order = await PaymentOrderModel.findOne(qualifyingReviewFilter(orderId))
    .select(REVIEW_ORDER_SELECTION)
    .lean<RawReviewOrder | null>();
  if (!order) {
    throw new ApiError(404, "Qualifying sales order not found.", undefined, "sales_order_not_found");
  }
  const [user, refund] = await Promise.all([
    UserModel.findOne({ firebaseUid: order.userId }).select("email displayName").lean(),
    RefundRequestModel.findOne({ orderId: order.orderId, status: "completed" })
      .select("resolvedAt")
      .sort({ resolvedAt: -1 })
      .lean(),
  ]);
  return { order, context: { user, refund } };
}

function serializeAdminSalesReviewResponse(
  order: RawReviewOrder,
  context: AdminSalesReviewResponseContext,
): AdminSalesReportRow {
  return serializeSalesRow({
    ...order,
    user: context.user,
    refund: context.refund,
    isRefunded: Boolean(context.refund),
    payer: order.metadata?.payos?.payer ?? null,
  });
}

function buildReviewStateFilter(order: RawReviewOrder): Record<string, unknown> {
  return order.reporting?.kpiStatus
    ? { "reporting.kpiStatus": order.reporting.kpiStatus }
    : { $or: [{ reporting: { $exists: false } }, { "reporting.kpiStatus": { $exists: false } }] };
}

function hasMongoErrorLabel(error: unknown, label: string): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { hasErrorLabel?: (value: string) => boolean; errorLabels?: unknown };
  return candidate.hasErrorLabel?.(label) === true ||
    (Array.isArray(candidate.errorLabels) && candidate.errorLabels.includes(label));
}

function buildAdminSalesReviewOutboxEvent(
  order: RawReviewOrder,
  identity: AdminSalesReviewAuditIdentity,
  reviewedAt: Date,
  decision: ReturnType<typeof normalizeReviewInput>,
): AdminAuditOutboxInsert {
  return {
    ...identity,
    eventType: "admin_sales_reviewed",
    occurredAt: reviewedAt,
    payload: {
      previousStatus: order.reporting?.kpiStatus ?? "pending",
      newStatus: decision.kpiStatus,
      ...(decision.exclusionReason ? { exclusionReason: decision.exclusionReason } : {}),
      noteProvided: Boolean(decision.reviewNote),
      reviewedAt: reviewedAt.toISOString(),
    },
    status: "pending",
    attempts: 0,
    availableAt: reviewedAt,
    leaseToken: null,
    lockedUntil: null,
    lastErrorCode: null,
  };
}

function normalizeReviewInput(input: ReviewAdminSalesOrderInput) {
  const orderId = input.orderId.trim().toUpperCase();
  const reviewerUid = input.reviewerUid.trim();
  const rawReviewRequestId = typeof input.reviewRequestId === "string" ? input.reviewRequestId.trim() : "";
  if (!UUID_PATTERN.test(rawReviewRequestId)) {
    throw new ApiError(400, "A valid review request id is required.", undefined, "invalid_sales_review_request_id");
  }
  const reviewRequestId = rawReviewRequestId.toLowerCase();
  const reviewNote = typeof input.reviewNote === "string" ? input.reviewNote.trim().slice(0, 500) || undefined : undefined;
  if (input.kpiStatus !== "included" && input.kpiStatus !== "excluded") {
    throw new ApiError(400, "KPI status must be included or excluded.", undefined, "invalid_sales_review_status");
  }
  const kpiStatus = input.kpiStatus as "included" | "excluded";

  const allowedReasons: PaymentReportingExclusionReason[] = ["internal_team", "test", "duplicate", "other"];
  if (input.kpiStatus === "excluded" && !allowedReasons.includes(input.exclusionReason as PaymentReportingExclusionReason)) {
    throw new ApiError(400, "An exclusion reason is required.", undefined, "sales_exclusion_reason_required");
  }
  if (input.kpiStatus === "included" && input.exclusionReason) {
    throw new ApiError(400, "Included sales cannot have an exclusion reason.", undefined, "invalid_sales_exclusion_reason");
  }
  if (input.exclusionReason === "other" && !reviewNote) {
    throw new ApiError(400, "A review note is required for other exclusions.", undefined, "sales_review_note_required");
  }

  return {
    orderId,
    reviewerUid,
    reviewRequestId,
    kpiStatus,
    exclusionReason: input.exclusionReason as PaymentReportingExclusionReason | undefined,
    reviewNote,
  };
}

async function resolveAdminSalesReviewRace(
  identity: AdminSalesReviewAuditIdentity,
  orderId: string,
): Promise<{ item: AdminSalesReportRow } | null> {
  const raced = await resolveAdminAuditIdempotency(identity);
  if (raced === "match") {
    const current = await loadAdminSalesReviewResponse(orderId);
    return { item: serializeAdminSalesReviewResponse(current.order, current.context) };
  }
  if (raced === "conflict") {
    throw new ApiError(
      409,
      "Review request id was already used for another command.",
      undefined,
      "sales_review_idempotency_conflict",
    );
  }
  return null;
}

export async function reviewAdminSalesOrder(
  input: ReviewAdminSalesOrderInput,
  dependencies: ReviewAdminSalesOrderDependencies = defaultReviewDependencies,
): Promise<{ item: AdminSalesReportRow }> {
  const normalized = normalizeReviewInput(input);
  const identity = buildAdminSalesReviewAuditIdentity({
    reviewRequestId: normalized.reviewRequestId,
    actorUid: normalized.reviewerUid,
    targetId: normalized.orderId,
    newStatus: normalized.kpiStatus,
    exclusionReason: normalized.exclusionReason,
    reviewNote: normalized.reviewNote,
  })
  const idempotency = await resolveAdminAuditIdempotency(identity);
  if (idempotency === "conflict") {
    throw new ApiError(
      409,
      "Review request id was already used for another command.",
      undefined,
      "sales_review_idempotency_conflict",
    );
  }
  const preloaded = await loadAdminSalesReviewResponse(normalized.orderId);
  if (idempotency === "match") {
    return { item: serializeAdminSalesReviewResponse(preloaded.order, preloaded.context) };
  }
  if (normalized.kpiStatus === "included" && preloaded.order.manualCompletedAt && !normalized.reviewNote) {
    throw new ApiError(400, "Manual completions require a review note.", undefined, "manual_sales_review_note_required");
  }

  const reviewedAt = new Date();
  const setFields: Record<string, unknown> = {
    "reporting.kpiStatus": normalized.kpiStatus,
    "reporting.reviewedBy": normalized.reviewerUid,
    "reporting.reviewedAt": reviewedAt,
    "reporting.reviewNote": normalized.reviewNote ?? null,
  };
  if (normalized.kpiStatus === "excluded") {
    setFields["reporting.exclusionReason"] = normalized.exclusionReason;
  }
  const update = normalized.kpiStatus === "included"
    ? { $set: setFields, $unset: { "reporting.exclusionReason": "" } }
    : { $set: setFields };
  const frozenOptimisticFilter = {
    ...qualifyingReviewFilter(normalized.orderId),
    _id: preloaded.order._id,
    updatedAt: preloaded.order.updatedAt,
    ...buildReviewStateFilter(preloaded.order),
  };

  let session: ClientSession | undefined;
  let committedOrder: RawReviewOrder | null = null;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const existing = await PaymentOrderModel.findOne(frozenOptimisticFilter, null, { session })
        .select(REVIEW_ORDER_SELECTION)
        .lean<RawReviewOrder | null>();
      if (!existing) {
        throw new ApiError(409, "This sales review changed elsewhere. Reload and retry.", undefined, "sales_review_conflict");
      }

      const updated = await PaymentOrderModel.findOneAndUpdate(
        frozenOptimisticFilter,
        update,
        { new: true, runValidators: true, session },
      ).lean<RawReviewOrder | null>();
      if (!updated) {
        throw new ApiError(409, "This sales review changed elsewhere. Reload and retry.", undefined, "sales_review_conflict");
      }

      await AdminAuditOutboxModel.create([
        buildAdminSalesReviewOutboxEvent(existing, identity, reviewedAt, normalized),
      ], { session });
      committedOrder = updated;
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary",
    });
  } catch (error) {
    if (error instanceof ApiError && error.errorCode === "sales_review_conflict") {
      const replay = await resolveAdminSalesReviewRace(identity, normalized.orderId);
      if (replay) return replay;
      throw error;
    }
    if (error instanceof ApiError) throw error;
    if (hasMongoErrorLabel(error, "UnknownTransactionCommitResult")) {
      throw new ApiError(
        503,
        "Sales review commit result is unknown. Retry the same action.",
        undefined,
        "admin_audit_commit_unknown",
      );
    }
    if (isDuplicateAdminAuditEventIdError(error)) {
      const replay = await resolveAdminSalesReviewRace(identity, normalized.orderId);
      if (replay) return replay;
    }
    throw new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {
        backendMonitoring.captureBackendException(new Error("Admin sales review session cleanup failed."), {
          tags: { feature: "admin_audit_outbox", stage: "session_cleanup" },
          extra: { eventId: identity.eventId },
        });
      }
    }
  }

  if (!committedOrder) {
    throw new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
  }
  try {
    dependencies.triggerAuditDispatch(identity.eventId);
  } catch {
    backendMonitoring.captureBackendException(new Error("Admin audit outbox immediate dispatch scheduling failed."), {
      tags: { feature: "admin_audit_outbox", stage: "dispatch_schedule" },
      extra: { eventId: identity.eventId },
    });
  }
  return { item: serializeAdminSalesReviewResponse(committedOrder, preloaded.context) };
}

function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvLine(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

export function buildAdminSalesReportCsv({ report }: AdminSalesReportExport): string {
  const metadata = [
    csvLine(["Generated at", report.generatedAt]),
    csvLine(["Date range", `${report.filters.from} - ${report.filters.to}`]),
    csvLine(["Timezone", report.filters.timezone]),
    csvLine(["Provider", report.filters.provider]),
    csvLine(["KPI status", report.filters.kpiStatus]),
    csvLine(["Successful transactions", report.summary.successfulTransactions]),
    csvLine(["Unique paid users", report.summary.uniquePaidUsers]),
    csvLine(["Gross revenue VND", report.summary.grossRevenueVnd]),
    csvLine(["Refunded amount VND", report.summary.refundedAmountVnd]),
    csvLine(["Net revenue VND", report.summary.netRevenueVnd]),
    csvLine(["Pending reviews", report.summary.pendingReviews]),
  ];
  const headers = csvLine([
    "Order ID",
    "Customer",
    "Masked email",
    "Amount VND",
    "Provider",
    "Completed at",
    "Provider reference",
    "Payer classification",
    "Refund status",
    "Stored KPI status",
    "Effective KPI status",
    "Operational category",
    "Operational source",
    "Exclusion reason",
  ]);
  const rows = report.items.map((item) => csvLine([
    item.orderId,
    item.customerLabelMasked,
    item.customerEmailMasked,
    item.amountVnd,
    item.provider,
    item.completedAt,
    item.providerReference,
    item.payer?.classification ?? "unknown",
    item.refund.status,
    item.reporting.kpiStatus,
    item.effectiveKpiStatus,
    item.operationalClassification.effectiveCategory,
    item.operationalClassification.source,
    item.reporting.exclusionReason,
  ]));
  return `\uFEFF${[...metadata, "", headers, ...rows].join("\r\n")}`;
}
