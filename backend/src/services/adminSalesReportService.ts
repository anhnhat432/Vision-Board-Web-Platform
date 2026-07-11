import type { FilterQuery, PipelineStage } from "mongoose";

import {
  PaymentOrderModel,
  type PaymentOrderDocument,
  type PaymentReportingExclusionReason,
  type PaymentReportingKpiStatus,
} from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import { ApiError } from "../utils/apiError";

const REPORT_TIMEZONE = "Asia/Ho_Chi_Minh" as const;
const REPORT_OFFSET = "+07:00";
const REAL_PROVIDERS = ["payos", "casso"] as const;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_RANGE_DAYS = 366;
const MAX_EXPORT_ROWS = 10_000;

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
  const refundCompletedAt = toIso(row.refund?.resolvedAt);
  const status = row.reporting?.kpiStatus ?? "pending";
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
      status: refundCompletedAt ? "completed" : "none",
      amountVnd: refundCompletedAt ? row.amount : 0,
      completedAt: refundCompletedAt,
    },
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
  const rowMatch = { effectiveKpiStatus: filters.kpiStatus };
  const skip = (filters.page - 1) * filters.limit;
  const rowsPipeline: PipelineStage.FacetPipelineStage[] = [
    { $match: rowMatch },
    { $sort: { completedAt: -1, orderId: 1 } },
  ];
  if (options.exportAll) rowsPipeline.push({ $limit: MAX_EXPORT_ROWS + 1 });
  else rowsPipeline.push({ $skip: skip }, { $limit: filters.limit });

  return [
    { $match: buildQualifyingSalesFilter(filters) },
    { $set: { effectiveKpiStatus: { $ifNull: ["$reporting.kpiStatus", "pending"] } } },
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
        effectiveKpiStatus: 1,
        user: 1,
        payer: 1,
        refund: 1,
        isRefunded: 1,
      },
    },
    {
      $facet: {
        summary: [
          { $match: { effectiveKpiStatus: "included" } },
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
        tabCounts: [{ $group: { _id: "$effectiveKpiStatus", count: { $sum: 1 } } }],
        dailyBuckets: [
          { $match: { effectiveKpiStatus: "included" } },
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
    "KPI status",
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
    item.reporting.exclusionReason,
  ]));
  return `\uFEFF${[...metadata, "", headers, ...rows].join("\r\n")}`;
}
