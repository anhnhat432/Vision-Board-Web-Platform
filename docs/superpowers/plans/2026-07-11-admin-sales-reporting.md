# Admin Sales Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected Admin sales-reporting surface that turns completed real-provider Plus payments into reviewed KPI totals, privacy-safe evidence, and full-filter CSV exports without changing billing or entitlement state.

**Architecture:** Add optional review metadata to `PaymentOrder`, then centralize the canonical qualifying-sales filter, MongoDB aggregation, masking, refund join, KPI calculations, review validation, and CSV generation in a focused backend service. Expose thin protected Admin controllers/routes, then build a typed React route whose URL owns report filters and whose components consume server-calculated summaries, buckets, counts, and rows.

**Tech Stack:** Express, TypeScript, Mongoose aggregation, Node test runner, React 18, React Router, Radix UI, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Only `PaymentOrder` records with `status="completed"`, `purpose="plus_subscription"`, `currency="VND"`, and provider `payos` or `casso` are eligible.
- Reporting review must never change payment status, subscription state, entitlements, receipt state, provider identifiers, checkout data, or PayOS data.
- Missing `reporting.kpiStatus` must serialize as `pending`; do not run a bulk migration.
- Completed `RefundRequest` records represent full refunds because the current schema has no partial-refund amount; count at most one completed refund per `orderId`.
- Use `Asia/Ho_Chi_Minh` for date parsing and daily revenue buckets; UI `to` dates are inclusive and backend queries use `toExclusive`.
- `kpiStatus` filters table rows and export rows only; summary cards, daily buckets, and tab counts cover the complete selected date/provider range.
- A paying user is a distinct application `userId` among included orders, never a payer-bank-account guess.
- Manual completions remain pending by default and require a non-empty review note before inclusion.
- Exclusion reasons are exactly `internal_team`, `test`, `duplicate`, or `other`; `other` requires a note and refund is not an exclusion reason.
- PayOS payer classification is supporting evidence only and must never be described as KYC or identity proof.
- API/export responses must not contain complete email addresses, Firebase UIDs, complete bank accounts, account hashes, QR data, checkout URLs, webhook bodies, secrets, or arbitrary provider metadata.
- Persisted `reviewNote` is mutation input only; report rows, audit logs, and CSV exports must not return it because free text may contain PII.
- Export must cover every row matching `from`, `to`, `provider`, and `kpiStatus`; reject ranges over 366 days or results over 10,000 rows with a clear error instead of producing a partial file.
- No new chart dependency; render the daily chart with accessible SVG/CSS and a textual equivalent.
- Do not modify or stage unrelated dirty-worktree files. Stage only the exact files listed in each task.

## Locked Interfaces

Backend returns this shape from `GET /api/admin/reports/sales`:

```ts
export interface AdminSalesReportResult {
  generatedAt: string;
  filters: {
    from: string;
    to: string;
    provider: "all" | "payos" | "casso";
    kpiStatus: "pending" | "included" | "excluded";
    timezone: "Asia/Ho_Chi_Minh";
  };
  availableProviders: Array<"payos" | "casso">;
  summary: {
    successfulTransactions: number;
    uniquePaidUsers: number;
    grossRevenueVnd: number;
    refundedAmountVnd: number;
    netRevenueVnd: number;
    pendingReviews: number;
  };
  tabCounts: Record<"pending" | "included" | "excluded", number>;
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
```

The row contract is:

```ts
export interface AdminSalesReportRow {
  orderId: string;
  customerLabelMasked: string;
  customerEmailMasked: string;
  provider: "payos" | "casso";
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
    kpiStatus: "pending" | "included" | "excluded";
    exclusionReason: "internal_team" | "test" | "duplicate" | "other" | null;
    reviewedAt: string | null;
  };
}
```

---

### Task 1: Persist the Optional Payment Reporting Contract

**Files:**
- Modify: `backend/src/models/PaymentOrderModel.ts:24`
- Create: `backend/src/tests/adminSalesReportModel.test.ts`

**Interfaces:**
- Consumes: existing `PaymentOrderEntity`, `PaymentOrderDocument`, and `paymentOrderSchema`.
- Produces: `PaymentReportingKpiStatus`, `PaymentReportingExclusionReason`, `PaymentOrderReporting`, and optional `reporting` fields used by every later backend task.

- [ ] **Step 1: Write the failing schema contract test**

Create `backend/src/tests/adminSalesReportModel.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PaymentOrderModel } from "../models/PaymentOrderModel";

describe("PaymentOrder reporting schema", () => {
  it("keeps reporting optional for legacy orders and validates persisted review metadata", () => {
    const legacy = new PaymentOrderModel({
      orderId: "VBLEGACY01",
      userId: "user_legacy",
      planCode: "PLUS",
      billingCycle: "twelve_week",
      amount: 99000,
      currency: "VND",
      status: "completed",
      provider: "payos",
      purpose: "plus_subscription",
      bankAccount: "payos",
      bankName: "PayOS",
      accountName: "PayOS",
      description: "VBLEGACY01",
      qrDataUrl: "https://example.test/qr",
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      expiresAt: new Date("2026-07-10T04:00:00.000Z"),
    });

    assert.equal(legacy.reporting, undefined);
    assert.equal(legacy.validateSync(), undefined);

    legacy.reporting = {
      kpiStatus: "excluded",
      exclusionReason: "test",
      reviewNote: "Giao dịch kiểm thử nội bộ.",
      reviewedBy: "admin_uid",
      reviewedAt: new Date("2026-07-11T02:00:00.000Z"),
    };
    assert.equal(legacy.validateSync(), undefined);

    legacy.reporting.kpiStatus = "invalid" as "included";
    assert.match(legacy.validateSync()?.message ?? "", /reporting\.kpiStatus/);
  });

  it("registers the two sales-reporting indexes", () => {
    const indexes = PaymentOrderModel.schema.indexes().map(([fields]) => fields);
    assert.ok(
      indexes.some(
        (fields) =>
          fields.status === 1 &&
          fields.purpose === 1 &&
          fields.provider === 1 &&
          fields.completedAt === -1,
      ),
    );
    assert.ok(
      indexes.some(
        (fields) => fields["reporting.kpiStatus"] === 1 && fields.completedAt === -1,
      ),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportModel.test.js
```

Expected: TypeScript compilation fails because `reporting` and the reporting types do not exist.

- [ ] **Step 3: Add the types, sub-schema, fields, and indexes**

Add beside the existing payment-order type declarations:

```ts
export type PaymentReportingKpiStatus = "pending" | "included" | "excluded";
export type PaymentReportingExclusionReason = "internal_team" | "test" | "duplicate" | "other";

export interface PaymentOrderReporting {
  kpiStatus: PaymentReportingKpiStatus;
  exclusionReason?: PaymentReportingExclusionReason | null;
  reviewNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
}
```

Add `reporting?: PaymentOrderReporting | null;` to both `PaymentOrderEntity` and `PaymentOrderDocument`. Define and register this sub-schema without a top-level default:

```ts
const paymentOrderReportingSchema = new Schema(
  {
    kpiStatus: {
      type: String,
      required: true,
      enum: ["pending", "included", "excluded"],
    },
    exclusionReason: {
      type: String,
      required: false,
      enum: ["internal_team", "test", "duplicate", "other"],
    },
    reviewNote: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    reviewedBy: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128,
    },
    reviewedAt: {
      type: Date,
      required: false,
    },
  },
  { _id: false },
);
```

Register it inside `paymentOrderSchema`:

```ts
reporting: {
  type: paymentOrderReportingSchema,
  required: false,
  default: undefined,
},
```

Add the indexes after the existing lookup indexes:

```ts
paymentOrderSchema.index({ status: 1, purpose: 1, provider: 1, completedAt: -1 });
paymentOrderSchema.index({ "reporting.kpiStatus": 1, completedAt: -1 });
```

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportModel.test.js
```

Expected: both tests pass.

- [ ] **Step 5: Commit the model contract**

```powershell
git add backend/src/models/PaymentOrderModel.ts backend/src/tests/adminSalesReportModel.test.ts
git commit -m "feat(admin): add payment reporting metadata"
```

---

### Task 2: Build the Canonical Sales Query, Aggregation, Masking, and CSV Service

**Files:**
- Create: `backend/src/services/adminSalesReportService.ts`
- Create: `backend/src/tests/adminSalesReportService.test.ts`

**Interfaces:**
- Consumes: reporting types from Task 1, `PaymentOrderModel`, `RefundRequestModel`, `UserModel`, and safe `PaymentPayerSourceClassification` fields.
- Produces: `parseAdminSalesReportFilters()`, `buildQualifyingSalesFilter()`, `buildAdminSalesReportPipeline()`, `getAdminSalesReport()`, `getAdminSalesReportExport()`, `buildAdminSalesReportCsv()`, and the locked response/row contracts.

- [ ] **Step 1: Write failing tests for filter validation and the canonical match**

Start `backend/src/tests/adminSalesReportService.test.ts` with:

```ts
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import { ApiError } from "../utils/apiError";
import {
  buildAdminSalesReportCsv,
  buildAdminSalesReportPipeline,
  buildQualifyingSalesFilter,
  getAdminSalesReport,
  getAdminSalesReportExport,
  parseAdminSalesReportFilters,
} from "../services/adminSalesReportService";

const originalAggregate = PaymentOrderModel.aggregate;
const originalFindOne = PaymentOrderModel.findOne;
const originalFindOneAndUpdate = PaymentOrderModel.findOneAndUpdate;
const originalRefundFindOne = RefundRequestModel.findOne;
const originalUserFindOne = UserModel.findOne;

function createLeanResult<T>(value: T) {
  const chain = {
    select() { return chain; },
    sort() { return chain; },
    async lean() { return value; },
  };
  return chain;
}

afterEach(() => {
  (PaymentOrderModel as unknown as { aggregate: unknown }).aggregate = originalAggregate;
  (PaymentOrderModel as unknown as { findOne: unknown }).findOne = originalFindOne;
  (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = originalFindOneAndUpdate;
  (RefundRequestModel as unknown as { findOne: unknown }).findOne = originalRefundFindOne;
  (UserModel as unknown as { findOne: unknown }).findOne = originalUserFindOne;
});

describe("admin sales report filters", () => {
  it("defaults to the last 30 Vietnam calendar days", () => {
    const filters = parseAdminSalesReportFilters({}, new Date("2026-07-11T05:00:00.000Z"));
    assert.equal(filters.fromDate, "2026-06-12");
    assert.equal(filters.toDate, "2026-07-11");
    assert.equal(filters.from.toISOString(), "2026-06-11T17:00:00.000Z");
    assert.equal(filters.toExclusive.toISOString(), "2026-07-11T17:00:00.000Z");
    assert.equal(filters.provider, "all");
    assert.equal(filters.kpiStatus, "pending");
    assert.equal(filters.page, 1);
    assert.equal(filters.limit, 20);
  });

  it("rejects invalid providers, statuses, reversed dates, and ranges over 366 days", () => {
    const invalidInputs = [
      { provider: "mock" },
      { kpiStatus: "all" },
      { from: "2026-07-11", to: "2026-07-10" },
      { from: "2025-01-01", to: "2026-07-11" },
    ];

    for (const input of invalidInputs) {
      assert.throws(() => parseAdminSalesReportFilters(input), ApiError);
    }
  });

  it("builds one qualifying filter for completed real-provider VND Plus orders", () => {
    const filters = parseAdminSalesReportFilters({
      from: "2026-07-01",
      to: "2026-07-11",
      provider: "payos",
      kpiStatus: "included",
    });
    assert.deepEqual(buildQualifyingSalesFilter(filters), {
      status: "completed",
      purpose: "plus_subscription",
      currency: "VND",
      provider: "payos",
      completedAt: { $gte: filters.from, $lt: filters.toExclusive },
    });
  });
});
```

- [ ] **Step 2: Run the focused build to verify the service is missing**

Run:

```powershell
npm.cmd --prefix backend run build
```

Expected: compilation fails because `adminSalesReportService.ts` and its exports do not exist.

- [ ] **Step 3: Implement exact filter types and Vietnam date parsing**

Create `backend/src/services/adminSalesReportService.ts` with these constants and filter functions:

```ts
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
  if (typeof providerValue !== "string" || (providerValue !== "all" && !REAL_PROVIDERS.includes(providerValue as "payos" | "casso"))) {
    throw new ApiError(400, "Unsupported sales report provider.", undefined, "invalid_sales_report_provider");
  }
  const provider = providerValue as AdminSalesReportProvider;
  const statusValue = input.kpiStatus ?? "pending";
  if (typeof statusValue !== "string" || (statusValue !== "pending" && statusValue !== "included" && statusValue !== "excluded")) {
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
```

- [ ] **Step 4: Write failing aggregation, privacy, refund, and CSV tests**

Append tests that stub `PaymentOrderModel.aggregate` and inspect both pipeline and serialization:

```ts
describe("admin sales report aggregation", () => {
  it("locks the KPI, distinct-user, refund-dedupe, and export-cap stages in the generated pipeline", () => {
    const filters = parseAdminSalesReportFilters({
      from: "2026-07-01",
      to: "2026-07-11",
      provider: "all",
      kpiStatus: "included",
    });
    const pipeline = buildAdminSalesReportPipeline(filters, { exportAll: true }) as Array<Record<string, unknown>>;
    assert.deepEqual(pipeline[0], { $match: buildQualifyingSalesFilter(filters) });

    const refundLookup = pipeline.find((stage) => {
      const lookup = stage.$lookup as { from?: string } | undefined;
      return lookup?.from === RefundRequestModel.collection.name;
    })?.$lookup as { pipeline: Array<Record<string, unknown>> };
    assert.deepEqual(refundLookup.pipeline.at(-2), { $limit: 1 });

    const facet = pipeline.find((stage) => "$facet" in stage)?.$facet as Record<string, Array<Record<string, unknown>>>;
    const summaryGroup = facet.summary.find((stage) => "$group" in stage)?.$group as Record<string, unknown>;
    assert.deepEqual(summaryGroup.paidUsers, { $addToSet: "$userId" });
    assert.deepEqual(summaryGroup.grossRevenueVnd, { $sum: "$amount" });
    assert.deepEqual(summaryGroup.refundedAmountVnd, { $sum: { $cond: ["$isRefunded", "$amount", 0] } });
    assert.deepEqual(summaryGroup.netRevenueVnd, { $sum: { $cond: ["$isRefunded", 0, "$amount"] } });
    assert.deepEqual(facet.rows.at(-1), { $limit: 10_001 });
    const safeProject = pipeline.find((stage) => {
      const project = stage.$project as Record<string, unknown> | undefined;
      return project?.effectiveKpiStatus === 1 && project?.payer === 1;
    })?.$project as Record<string, unknown>;
    assert.equal(safeProject.qrDataUrl, undefined);
    assert.equal(safeProject.metadata, undefined);
    assert.equal(safeProject.bankAccount, undefined);
    assert.equal(JSON.stringify(safeProject.reporting).includes("reviewNote"), false);
    assert.equal(JSON.stringify(safeProject.reporting).includes("reviewedBy"), false);
  });

  it("normalizes legacy reviews, counts distinct users, and subtracts one completed refund", async () => {
    let capturedPipeline: unknown[] = [];
    (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<unknown[]> }).aggregate = async (pipeline) => {
      capturedPipeline = pipeline;
      return [{
        summary: [{
          successfulTransactions: 2,
          uniquePaidUsers: 1,
          grossRevenueVnd: 198000,
          refundedAmountVnd: 99000,
          netRevenueVnd: 99000,
        }],
        tabCounts: [{ _id: "included", count: 2 }, { _id: "pending", count: 1 }],
        dailyBuckets: [{
          _id: "2026-07-10",
          transactions: 2,
          grossRevenueVnd: 198000,
          refundedAmountVnd: 99000,
          netRevenueVnd: 99000,
        }],
        rowCount: [{ count: 1 }],
        rows: [{
          orderId: "VBREPORT01",
          amount: 99000,
          currency: "VND",
          provider: "payos",
          completedAt: new Date("2026-07-10T03:00:00.000Z"),
          user: { email: "nguyenvana@example.com", displayName: "Nguyen Van A" },
          payer: {
            classification: "external",
            accountMasked: "123****6789",
            accountNameMasked: "N*** V*** A***",
            bankName: "MB Bank",
            transactionReference: "PAYOS-REF-1",
            transactionDateTime: "2026-07-10 10:00:00",
            source: "reconciliation",
            observedAt: new Date("2026-07-10T03:01:00.000Z"),
          },
          refund: { resolvedAt: new Date("2026-07-11T03:00:00.000Z") },
          reporting: { kpiStatus: "included", reviewedAt: new Date("2026-07-11T02:00:00.000Z") },
          manualCompletedAt: null,
          cassoTransactionId: null,
        }],
      }];
    };

    const report = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "included",
    });

    assert.equal(report.summary.uniquePaidUsers, 1);
    assert.equal(report.summary.refundedAmountVnd, 99000);
    assert.equal(report.summary.netRevenueVnd, 99000);
    assert.equal(report.summary.pendingReviews, 1);
    assert.equal(report.items[0]?.customerEmailMasked, "ng***@example.com");
    assert.equal(report.items[0]?.customerLabelMasked, "N*** V*** A***");
    assert.equal(report.items[0]?.refund.status, "completed");
    assert.equal(JSON.stringify(report).includes("nguyenvana@example.com"), false);
    assert.equal(JSON.stringify(report).includes("userId"), false);
    assert.equal(JSON.stringify(capturedPipeline).includes("plus_subscription"), true);
    assert.equal(JSON.stringify(capturedPipeline).includes("Asia/Ho_Chi_Minh"), true);
  });

  it("exports all filtered rows and neutralizes spreadsheet formulas", async () => {
    (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<unknown[]> }).aggregate = async () => [{
      rows: [{
        orderId: "=CMD",
        amount: 99000,
        currency: "VND",
        provider: "payos",
        completedAt: new Date("2026-07-10T03:00:00.000Z"),
        user: { email: "a@example.com", displayName: "+Formula User" },
        payer: null,
        refund: null,
        reporting: null,
        manualCompletedAt: null,
        cassoTransactionId: null,
      }],
      rowCount: [{ count: 1 }],
    }];

    const exported = await getAdminSalesReportExport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "pending",
    });
    const csv = buildAdminSalesReportCsv(exported);
    assert.match(csv, /^\uFEFF/);
    assert.match(csv, /'\=CMD/);
    assert.match(csv, /"Generated at"/);
    assert.match(csv, /"Order ID"/);
    assert.equal(csv.includes("a@example.com"), false);
  });

  it("rejects oversized exports instead of returning a partial CSV", async () => {
    (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<unknown[]> }).aggregate = async () => [{
      rows: [],
      rowCount: [{ count: 10_001 }],
    }];
    await assert.rejects(
      getAdminSalesReportExport({ from: "2026-07-01", to: "2026-07-11", kpiStatus: "included" }),
      (error: unknown) => error instanceof ApiError && error.errorCode === "sales_export_too_large",
    );
  });
});
```

- [ ] **Step 5: Implement the aggregate pipeline and safe serializers**

Add these internal raw types and helpers to the service:

```ts
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
  provider: "payos" | "casso";
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
```

Define the exported row/result interfaces exactly as in **Locked Interfaces**, then implement the pipeline:

```ts
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
          { $match: { $expr: { $and: [{ $eq: ["$orderId", "$$reportOrderId"] }, { $eq: ["$status", "completed"] }] } } },
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
          { $group: {
            _id: null,
            successfulTransactions: { $sum: 1 },
            paidUsers: { $addToSet: "$userId" },
            grossRevenueVnd: { $sum: "$amount" },
            refundedAmountVnd: { $sum: { $cond: ["$isRefunded", "$amount", 0] } },
            netRevenueVnd: { $sum: { $cond: ["$isRefunded", 0, "$amount"] } },
          } },
          { $project: {
            _id: 0,
            successfulTransactions: 1,
            uniquePaidUsers: { $size: "$paidUsers" },
            grossRevenueVnd: 1,
            refundedAmountVnd: 1,
            netRevenueVnd: 1,
          } },
        ],
        tabCounts: [{ $group: { _id: "$effectiveKpiStatus", count: { $sum: 1 } } }],
        dailyBuckets: [
          { $match: { effectiveKpiStatus: "included" } },
          { $group: {
            _id: { $dateToString: { date: "$completedAt", format: "%Y-%m-%d", timezone: REPORT_TIMEZONE } },
            transactions: { $sum: 1 },
            grossRevenueVnd: { $sum: "$amount" },
            refundedAmountVnd: { $sum: { $cond: ["$isRefunded", "$amount", 0] } },
            netRevenueVnd: { $sum: { $cond: ["$isRefunded", 0, "$amount"] } },
          } },
          { $sort: { _id: 1 } },
        ],
        rowCount: [{ $match: rowMatch }, { $count: "count" }],
        rows: rowsPipeline,
      },
    },
  ];
}
```

Implement the read and export methods:

```ts
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
  const tabCounts = { pending: 0, included: 0, excluded: 0 };
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
    throw new ApiError(422, "Sales report export exceeds 10,000 rows. Narrow the filters.", undefined, "sales_export_too_large");
  }
  const report = normalizeFacet(facet, { ...filters, limit: Math.max(total, 1) });
  return { report, filename: `sales-report-${filters.fromDate}-to-${filters.toDate}.csv` };
}
```

- [ ] **Step 6: Implement allowlisted CSV generation**

Add:

```ts
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
```

- [ ] **Step 7: Run the focused backend service tests**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportService.test.js
```

Expected: filter, aggregation normalization, privacy, refund, and CSV tests pass.

- [ ] **Step 8: Commit the reporting service**

```powershell
git add backend/src/services/adminSalesReportService.ts backend/src/tests/adminSalesReportService.test.ts
git commit -m "feat(admin): calculate sales report KPIs"
```

---

### Task 3: Expose Protected Read and Export Endpoints

**Files:**
- Create: `backend/src/controllers/adminSalesReportController.ts`
- Modify: `backend/src/routes/adminRoutes.ts:1`
- Create: `backend/src/tests/adminSalesReportRoutes.test.ts`

**Interfaces:**
- Consumes: `getAdminSalesReport()`, `getAdminSalesReportExport()`, `buildAdminSalesReportCsv()`, `requireAdmin`, and `successResponse()`.
- Produces: protected `GET /api/admin/reports/sales` and `GET /api/admin/reports/sales/export`.

- [ ] **Step 1: Write failing route authorization and response tests**

Use the ephemeral Express-server pattern from `backend/src/tests/auditLog.test.ts`. In `backend/src/tests/adminSalesReportRoutes.test.ts`, create an app with `createAuthMiddleware()`, mount `adminRoutes`, stub `PaymentOrderModel.aggregate`, and assert:

```ts
it("protects report and export endpoints and returns a complete empty report", async () => {
  (PaymentOrderModel as unknown as { aggregate: unknown }).aggregate = async () => [{
    summary: [],
    tabCounts: [],
    dailyBuckets: [],
    rowCount: [],
    rows: [],
  }];

  const unauthenticated = await request(app, "GET", "/api/admin/reports/sales");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await request(app, "GET", "/api/admin/reports/sales", "non-admin-token");
  assert.equal(forbidden.status, 403);

  const allowed = await request(app, "GET", "/api/admin/reports/sales", "admin-token");
  assert.equal(allowed.status, 200);
  assert.equal(allowed.json.data.summary.netRevenueVnd, 0);
  assert.deepEqual(allowed.json.data.items, []);

  const exported = await request(app, "GET", "/api/admin/reports/sales/export", "admin-token");
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get("content-type") ?? "", /text\/csv/);
  assert.match(exported.headers.get("content-disposition") ?? "", /sales-report-/);
  assert.match(exported.text, /"Order ID"/);
});
```

Also assert invalid `from/to/provider/status` query values return `400` and no CSV download headers.

- [ ] **Step 2: Run the route test to verify endpoints are missing**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportRoutes.test.js
```

Expected: report endpoints return `404`.

- [ ] **Step 3: Create the thin controller**

Create `backend/src/controllers/adminSalesReportController.ts`:

```ts
import type { Request, Response } from "express";

import {
  buildAdminSalesReportCsv,
  getAdminSalesReport,
  getAdminSalesReportExport,
} from "../services/adminSalesReportService";
import { successResponse } from "../utils/apiResponse";

export async function getAdminSalesReportController(req: Request, res: Response): Promise<void> {
  const report = await getAdminSalesReport(req.query);
  res.status(200).json(successResponse(report));
}

export async function exportAdminSalesReportController(req: Request, res: Response): Promise<void> {
  const exported = await getAdminSalesReportExport(req.query);
  const csv = buildAdminSalesReportCsv(exported);
  res
    .status(200)
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exported.filename}"`,
      "Cache-Control": "no-store",
    })
    .send(csv);
}
```

- [ ] **Step 4: Register both protected GET routes before the parameterized review route**

Import the controller functions in `backend/src/routes/adminRoutes.ts`, then add:

```ts
adminRoutes.get(
  "/admin/reports/sales",
  asyncHandler(requireAdmin),
  asyncHandler(getAdminSalesReportController),
);
adminRoutes.get(
  "/admin/reports/sales/export",
  asyncHandler(requireAdmin),
  asyncHandler(exportAdminSalesReportController),
);
```

- [ ] **Step 5: Run focused route and service tests**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js
```

Expected: all tests pass, including `401`, `403`, JSON success, CSV headers, empty state, and invalid-query behavior.

- [ ] **Step 6: Commit the protected read/export API**

```powershell
git add backend/src/controllers/adminSalesReportController.ts backend/src/routes/adminRoutes.ts backend/src/tests/adminSalesReportRoutes.test.ts
git commit -m "feat(admin): expose sales report endpoints"
```

---

### Task 4: Add Atomic KPI Review and Safe Audit History

**Files:**
- Modify: `backend/src/services/adminSalesReportService.ts`
- Modify: `backend/src/controllers/adminSalesReportController.ts`
- Modify: `backend/src/routes/adminRoutes.ts:58`
- Modify: `backend/src/tests/adminSalesReportService.test.ts`
- Modify: `backend/src/tests/adminSalesReportRoutes.test.ts`
- Modify: `backend/src/tests/auditLog.test.ts`

**Interfaces:**
- Consumes: canonical qualifying filter, reporting model contract, `auditedAdminAction()`, `validateOrderIdParam`, and `validateOptionalJsonObjectBody`.
- Produces: `reviewAdminSalesOrder()` and protected audited `PATCH /api/admin/reports/sales/:orderId/review`.

- [ ] **Step 1: Write failing service tests for validation, atomicity, and billing invariants**

Add tests that stub `PaymentOrderModel.findOne` and `findOneAndUpdate`. Cover these exact cases:

```ts
it("requires reasons and notes, then atomically includes a manual completion without changing billing fields", async () => {
  const original = {
    _id: "order_doc_1",
    orderId: "VBREVIEW01",
    userId: "customer_uid",
    status: "completed",
    purpose: "plus_subscription",
    currency: "VND",
    provider: "payos",
    amount: 99000,
    completedAt: new Date("2026-07-10T03:00:00.000Z"),
    manualCompletedAt: new Date("2026-07-10T03:05:00.000Z"),
    reporting: undefined,
    updatedAt: new Date("2026-07-10T03:06:00.000Z"),
  };

  (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(original);

  await assert.rejects(
    reviewAdminSalesOrder({
      orderId: original.orderId,
      reviewerUid: "admin_uid",
      kpiStatus: "included",
    }),
    (error: unknown) => error instanceof ApiError && error.errorCode === "manual_sales_review_note_required",
  );

  let update: Record<string, unknown> | undefined;
  (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = (
    _filter: unknown,
    nextUpdate: Record<string, unknown>,
  ) => {
    update = nextUpdate;
    return createLeanResult({
      ...original,
      reporting: {
        kpiStatus: "included",
        reviewNote: "Đã đối chiếu ảnh chuyển khoản và PayOS.",
        reviewedBy: "admin_uid",
        reviewedAt: new Date("2026-07-11T02:00:00.000Z"),
      },
    });
  };
  (UserModel as unknown as { findOne: unknown }).findOne = () => createLeanResult({
    email: "customer@example.com",
    displayName: "Customer Example",
  });
  (RefundRequestModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);

  const result = await reviewAdminSalesOrder({
    orderId: original.orderId,
    reviewerUid: "admin_uid",
    kpiStatus: "included",
    reviewNote: "Đã đối chiếu ảnh chuyển khoản và PayOS.",
  });

  assert.equal(result.audit.previousStatus, "pending");
  assert.equal(result.audit.newStatus, "included");
  assert.equal(result.audit.noteProvided, true);
  assert.equal((update?.$set as Record<string, unknown>)["reporting.kpiStatus"], "included");
  assert.equal(JSON.stringify(update).includes("amount"), false);
  assert.equal(JSON.stringify(update).includes("provider"), false);
  assert.equal(JSON.stringify(update).includes("receipt"), false);
});
```

Add separate assertions for: excluded without reason → `400`; `other` without note → `400`; client status `pending` → `400`; included clears `exclusionReason`; stale optimistic match → `409 sales_review_conflict`.

- [ ] **Step 2: Implement review validation and optimistic `findOneAndUpdate()`**

Add to `adminSalesReportService.ts`:

```ts
export interface ReviewAdminSalesOrderInput {
  orderId: string;
  reviewerUid: string;
  kpiStatus: unknown;
  exclusionReason?: unknown;
  reviewNote?: unknown;
}

export interface AdminSalesReviewAudit {
  previousStatus: PaymentReportingKpiStatus;
  newStatus: "included" | "excluded";
  exclusionReason?: PaymentReportingExclusionReason;
  noteProvided: boolean;
}

function normalizeReviewInput(input: ReviewAdminSalesOrderInput) {
  const orderId = input.orderId.trim().toUpperCase();
  const reviewerUid = input.reviewerUid.trim();
  const reviewNote = typeof input.reviewNote === "string" ? input.reviewNote.trim().slice(0, 500) || undefined : undefined;
  if (input.kpiStatus !== "included" && input.kpiStatus !== "excluded") {
    throw new ApiError(400, "KPI status must be included or excluded.", undefined, "invalid_sales_review_status");
  }
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
    kpiStatus: input.kpiStatus,
    exclusionReason: input.exclusionReason as PaymentReportingExclusionReason | undefined,
    reviewNote,
  };
}

export async function reviewAdminSalesOrder(input: ReviewAdminSalesOrderInput): Promise<{
  item: AdminSalesReportRow;
  audit: AdminSalesReviewAudit;
}> {
  const normalized = normalizeReviewInput(input);
  const existing = await PaymentOrderModel.findOne({
    orderId: normalized.orderId,
    status: "completed",
    purpose: "plus_subscription",
    currency: "VND",
    provider: { $in: [...REAL_PROVIDERS] },
  })
    .select("_id orderId amount currency provider completedAt cassoTransactionId metadata.payos.payer manualCompletedAt reporting updatedAt userId")
    .lean();
  if (!existing) {
    throw new ApiError(404, "Qualifying sales order not found.", undefined, "sales_order_not_found");
  }
  if (normalized.kpiStatus === "included" && existing.manualCompletedAt && !normalized.reviewNote) {
    throw new ApiError(400, "Manual completions require a review note.", undefined, "manual_sales_review_note_required");
  }

  const previousStatus = existing.reporting?.kpiStatus ?? "pending";
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
  const stateFilter = existing.reporting?.kpiStatus
    ? { "reporting.kpiStatus": existing.reporting.kpiStatus }
    : { $or: [{ reporting: { $exists: false } }, { "reporting.kpiStatus": { $exists: false } }] };
  const update = normalized.kpiStatus === "included"
    ? { $set: setFields, $unset: { "reporting.exclusionReason": "" } }
    : { $set: setFields };
  const updated = await PaymentOrderModel.findOneAndUpdate(
    {
      _id: existing._id,
      orderId: normalized.orderId,
      status: "completed",
      purpose: "plus_subscription",
      currency: "VND",
      provider: { $in: [...REAL_PROVIDERS] },
      updatedAt: existing.updatedAt,
      ...stateFilter,
    },
    update,
    { new: true, runValidators: true },
  ).lean();
  if (!updated) {
    throw new ApiError(409, "This sales review changed elsewhere. Reload and retry.", undefined, "sales_review_conflict");
  }

  const user = await UserModel.findOne({ firebaseUid: updated.userId }).select("email displayName").lean();
  const refund = await RefundRequestModel.findOne({ orderId: updated.orderId, status: "completed" })
    .select("resolvedAt")
    .sort({ resolvedAt: -1 })
    .lean();
  return {
    item: serializeSalesRow({
      ...updated,
      user,
      refund,
      payer: updated.metadata?.payos?.payer ?? null,
    } as RawSalesRow),
    audit: {
      previousStatus,
      newStatus: normalized.kpiStatus,
      ...(normalized.exclusionReason ? { exclusionReason: normalized.exclusionReason } : {}),
      noteProvided: Boolean(normalized.reviewNote),
    },
  };
}
```

- [ ] **Step 3: Extend the audited wrapper with a safe post-handler payload**

In `backend/src/routes/adminRoutes.ts`, extend `AuditedAdminActionOptions`:

```ts
interface AuditedAdminActionOptions {
  action: string;
  target: string;
  getTargetId?: (req: Request) => string | null | undefined;
  getAuditPayload?: (req: Request, res: Response) => unknown;
  validators?: RequestHandler[];
  handler: AdminHandler;
}
```

Change both `logAdminAction()` calls to use:

```ts
payload: options.getAuditPayload?.(req, res) ?? req.body,
```

The callback runs after a successful handler and falls back to request data on failure. Never put the raw note in `res.locals`.

- [ ] **Step 4: Add the review controller and route**

Add to `adminSalesReportController.ts`:

```ts
import { ApiError } from "../utils/apiError";
import { reviewAdminSalesOrder } from "../services/adminSalesReportService";

export async function reviewAdminSalesOrderController(req: Request, res: Response): Promise<void> {
  const reviewerUid = req.user?.uid?.trim();
  if (!reviewerUid) throw new ApiError(401, "Authentication required.");
  const result = await reviewAdminSalesOrder({
    orderId: req.params.orderId ?? "",
    reviewerUid,
    kpiStatus: req.body?.kpiStatus,
    exclusionReason: req.body?.exclusionReason,
    reviewNote: req.body?.reviewNote,
  });
  res.locals.adminSalesReviewAudit = result.audit;
  res.status(200).json(successResponse({ item: result.item }));
}
```

Register after the export route:

```ts
adminRoutes.patch(
  "/admin/reports/sales/:orderId/review",
  auditedAdminAction({
    action: "reviewAdminSalesOrder",
    target: "payment_order_sales_reporting",
    getTargetId: (req) => req.params.orderId?.trim().toUpperCase(),
    getAuditPayload: (req, res) =>
      res.locals.adminSalesReviewAudit ?? {
        newStatus: req.body?.kpiStatus,
        exclusionReason: req.body?.exclusionReason,
        noteProvided: Boolean(req.body?.reviewNote),
      },
    validators: [validateOrderIdParam, validateOptionalJsonObjectBody],
    handler: reviewAdminSalesOrderController,
  }),
);
```

- [ ] **Step 5: Add route and audit assertions**

In `adminSalesReportRoutes.test.ts`, assert a successful PATCH returns the safe row and an invalid body returns `400` without changing the stubbed order. In `auditLog.test.ts`, capture `AuditLogModel.create()` and assert:

```ts
assert.deepEqual(capturedAudit.payload, {
  previousStatus: "pending",
  newStatus: "excluded",
  exclusionReason: "test",
  noteProvided: true,
});
assert.equal(capturedAudit.actorUid, "admin_uid");
assert.equal(capturedAudit.targetId, "VBREVIEW01");
assert.equal(JSON.stringify(capturedAudit).includes("raw private review note"), false);
assert.equal(JSON.stringify(capturedAudit).includes("customer@example.com"), false);
```

- [ ] **Step 6: Run focused review and audit tests**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/auditLog.test.js
```

Expected: validation, optimistic conflict, invariant, route, and safe audit assertions pass.

- [ ] **Step 7: Commit review and audit support**

```powershell
git add backend/src/services/adminSalesReportService.ts backend/src/controllers/adminSalesReportController.ts backend/src/routes/adminRoutes.ts backend/src/tests/adminSalesReportService.test.ts backend/src/tests/adminSalesReportRoutes.test.ts backend/src/tests/auditLog.test.ts
git commit -m "feat(admin): review sales KPI entries"
```

---

### Task 5: Add Typed Frontend Contracts and Authenticated File Download

**Files:**
- Modify: `src/lib/api/apiClient.ts:198`
- Create: `src/lib/api/apiClient.file.test.ts`
- Modify: `src/services/adminService.ts:1`
- Create: `src/services/adminService.test.ts`

**Interfaces:**
- Consumes: existing `authedFetch`, API error interceptors, `get()`, `patch()`, and `AdminPaymentPayerSource`.
- Produces: `getFile()`, all locked frontend report types, `adminGetSalesReport()`, `adminReviewSalesOrder()`, and `adminExportSalesReport()`.

- [ ] **Step 1: Write failing file-download and service-query tests**

In `src/lib/api/apiClient.file.test.ts`, mock `authedFetch` and assert a successful response returns its Blob plus `sales.csv` from `Content-Disposition`; a `500` response throws and never returns a Blob. In `src/services/adminService.test.ts`, mock `get`, `patch`, and `getFile`, then assert:

```ts
await adminGetSalesReport({
  from: "2026-07-01",
  to: "2026-07-11",
  provider: "payos",
  kpiStatus: "included",
  page: 2,
  limit: 20,
});
expect(get).toHaveBeenCalledWith(
  "/admin/reports/sales?from=2026-07-01&to=2026-07-11&provider=payos&kpiStatus=included&page=2&limit=20",
);

await adminReviewSalesOrder("VB REPORT/01", {
  kpiStatus: "excluded",
  exclusionReason: "test",
  reviewNote: "Bản kiểm thử.",
});
expect(patch).toHaveBeenCalledWith(
  "/admin/reports/sales/VB%20REPORT%2F01/review",
  { kpiStatus: "excluded", exclusionReason: "test", reviewNote: "Bản kiểm thử." },
);

await adminExportSalesReport({
  from: "2026-07-01",
  to: "2026-07-11",
  provider: "all",
  kpiStatus: "pending",
});
expect(getFile).toHaveBeenCalledWith(
  "/admin/reports/sales/export?from=2026-07-01&to=2026-07-11&kpiStatus=pending",
);
```

- [ ] **Step 2: Run the tests to verify the exports are missing**

Run:

```powershell
npm.cmd run test:run -- src/lib/api/apiClient.file.test.ts src/services/adminService.test.ts
```

Expected: tests fail because `getFile` and sales-report service contracts do not exist.

- [ ] **Step 3: Implement `getFile()` inside the shared API client**

Add:

```ts
function parseDownloadFilename(value: string | null): string | null {
  if (!value) return null;
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) return decodeURIComponent(utf8).replace(/[\\/]/g, "-");
  const basic = value.match(/filename="?([^";]+)"?/i)?.[1]?.trim();
  return basic ? basic.replace(/[\\/]/g, "-") : null;
}

export async function getFile(
  path: string,
  options?: ApiRequestOptions,
): Promise<{ blob: Blob; filename: string | null }> {
  if (isDemoMode()) throw new Error("Các yêu cầu máy chủ bị tắt trong chế độ thử.");
  let response: Response;
  try {
    response = await authedFetch(buildApiUrl(path), { ...options, method: "GET" });
  } catch (networkError) {
    const apiError = toApiClientError(networkError);
    await runResponseErrorInterceptors(apiError);
    throw apiError;
  }
  if (!response.ok) {
    const payload = await parseResponseBody(response);
    const apiError = createApiClientError({
      message: getErrorMessageFromPayload(payload) ?? `Yêu cầu không thành công (mã ${response.status}).`,
      status: response.status,
      details: payload,
      errorCode: getErrorCodeFromPayload(payload),
    });
    await runResponseErrorInterceptors(apiError);
    throw apiError;
  }
  return {
    blob: await response.blob(),
    filename: parseDownloadFilename(response.headers.get("Content-Disposition")),
  };
}
```

- [ ] **Step 4: Add frontend report types and service functions**

Import `getFile` in `src/services/adminService.ts`. Add the locked types from the plan header, plus:

```ts
export type AdminSalesKpiStatus = "pending" | "included" | "excluded";
export type AdminSalesExclusionReason = "internal_team" | "test" | "duplicate" | "other";

export interface AdminSalesReportParams {
  from: string;
  to: string;
  provider?: "all" | "payos" | "casso";
  kpiStatus: AdminSalesKpiStatus;
  page?: number;
  limit?: number;
}

export interface AdminReviewSalesOrderPayload {
  kpiStatus: "included" | "excluded";
  exclusionReason?: AdminSalesExclusionReason;
  reviewNote?: string;
}

function buildSalesReportQuery(params: AdminSalesReportParams, includePagination: boolean): string {
  const searchParams = new URLSearchParams();
  searchParams.set("from", params.from);
  searchParams.set("to", params.to);
  if (params.provider && params.provider !== "all") searchParams.set("provider", params.provider);
  searchParams.set("kpiStatus", params.kpiStatus);
  if (includePagination && params.page) searchParams.set("page", String(params.page));
  if (includePagination && params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export function adminGetSalesReport(params: AdminSalesReportParams): Promise<AdminSalesReportResult> {
  return get<AdminSalesReportResult>(`/admin/reports/sales?${buildSalesReportQuery(params, true)}`);
}

export function adminReviewSalesOrder(
  orderId: string,
  payload: AdminReviewSalesOrderPayload,
): Promise<{ item: AdminSalesReportRow }> {
  return patch<{ item: AdminSalesReportRow }, AdminReviewSalesOrderPayload>(
    `/admin/reports/sales/${encodeURIComponent(orderId)}/review`,
    payload,
  );
}

export function adminExportSalesReport(
  params: AdminSalesReportParams,
): Promise<{ blob: Blob; filename: string | null }> {
  return getFile(`/admin/reports/sales/export?${buildSalesReportQuery(params, false)}`);
}
```

- [ ] **Step 5: Run focused frontend unit tests**

Run:

```powershell
npm.cmd run test:run -- src/lib/api/apiClient.file.test.ts src/services/adminService.test.ts
```

Expected: file success/error behavior and query/path serialization pass.

- [ ] **Step 6: Commit API plumbing**

```powershell
git add src/lib/api/apiClient.ts src/lib/api/apiClient.file.test.ts src/services/adminService.ts src/services/adminService.test.ts
git commit -m "feat(admin): add sales report client contracts"
```

---

### Task 6: Extract the Privacy-Safe PayOS Evidence Dialog

**Files:**
- Create: `src/app/components/admin/AdminPaymentPayerEvidenceDialog.tsx`
- Modify: `src/app/pages/AdminPaymentsPage.tsx:227`
- Modify: `src/app/pages/AdminPaymentsPage.dialog.test.tsx`

**Interfaces:**
- Consumes: `AdminPaymentPayerSource`, existing Radix `Dialog`, and the exact safe field allowlist already used by `AdminPaymentsPage`.
- Produces: reusable `AdminPaymentPayerEvidenceDialog` used by payments and sales reporting.

- [ ] **Step 1: Change the existing dialog test to target the shared component behavior**

Keep the current sentinel tests for missing fields and webhook-only evidence. Add a direct render assertion that a payer object containing an extra runtime field such as `accountHash: "raw-secret-hash"` never renders that value.

- [ ] **Step 2: Run the dialog test before extraction**

Run:

```powershell
npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx
```

Expected: current tests pass; the new direct shared-component import fails because the component does not exist.

- [ ] **Step 3: Create the shared allowlisted dialog**

Create `src/app/components/admin/AdminPaymentPayerEvidenceDialog.tsx`:

```tsx
import type { AdminPaymentPayerSource } from "@/services/adminService";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const LABELS = { internal: "Nội bộ", external: "Nguồn ngoài", unknown: "Chưa xác định" } as const;

export interface AdminPaymentPayerEvidenceDialogProps {
  open: boolean;
  payer: AdminPaymentPayerSource | null;
  onOpenChange(open: boolean): void;
}

export function AdminPaymentPayerEvidenceDialog({
  open,
  payer,
  onOpenChange,
}: AdminPaymentPayerEvidenceDialogProps) {
  const rows: Array<[string, string]> = payer
    ? [
        ["Kết quả", LABELS[payer.classification]],
        ["Chủ tài khoản", payer.accountNameMasked ?? "Không có dữ liệu"],
        ["Số tài khoản", payer.accountMasked ?? (payer.accountLast4 ? `****${payer.accountLast4}` : "Không có dữ liệu")],
        ["Ngân hàng", payer.bankName ?? "Không có dữ liệu"],
        ["Mã giao dịch PayOS", payer.transactionReference ?? "Không có dữ liệu"],
        ["Thời gian PayOS xác nhận", payer.transactionDateTime ?? "Không có dữ liệu"],
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hồ sơ đối chiếu PayOS</DialogTitle>
          <DialogDescription>
            Kết quả chỉ so sánh với danh sách tài khoản nội bộ đã cấu hình, không chứng minh danh tính người chuyển tiền hoặc KYC.
          </DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-app-line rounded-[var(--r-card)] border border-app-line bg-app-bg-subtle">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
              <dt className="text-sm font-medium text-app-ink-muted">{label}</dt>
              <dd className="break-words text-sm text-app-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Replace the inline payments dialog with the shared component**

Remove the dialog imports, `evidenceRows`, and inline `<Dialog>` block from `AdminPaymentsPage.tsx`. Import the shared component and render:

```tsx
<AdminPaymentPayerEvidenceDialog
  open={evidencePayment !== null}
  payer={evidencePayment?.payer ?? null}
  onOpenChange={(open) => !open && setEvidencePayment(null)}
/>
```

- [ ] **Step 5: Run the existing privacy regression test**

Run:

```powershell
npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx
```

Expected: all existing dialog behavior and the raw-field sentinel assertion pass.

- [ ] **Step 6: Commit the extraction**

```powershell
git add src/app/components/admin/AdminPaymentPayerEvidenceDialog.tsx src/app/pages/AdminPaymentsPage.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx
git commit -m "refactor(admin): share safe PayOS evidence dialog"
```

---

### Task 7: Build the Read-Only Sales Report Page, Filters, KPIs, Chart, and Responsive Rows

**Files:**
- Create: `src/app/components/admin/sales/AdminSalesReportFilters.tsx`
- Create: `src/app/components/admin/sales/AdminSalesKpiGrid.tsx`
- Create: `src/app/components/admin/sales/AdminSalesRevenueChart.tsx`
- Create: `src/app/components/admin/sales/AdminSalesReportList.tsx`
- Create: `src/app/pages/AdminSalesReportPage.tsx`
- Create: `src/app/pages/AdminSalesReportPage.test.tsx`
- Modify: `src/app/components/admin/AdminSidebar.tsx:1`
- Modify: `src/app/routes.tsx:220`

**Interfaces:**
- Consumes: `adminGetSalesReport()`, locked report contracts, Admin components/tokens, URL search params, and existing formatting helpers.
- Produces: protected `/admin/reports/sales`, sidebar label `Báo cáo kinh doanh`, URL-persistent filters, six KPI cards, accessible daily chart, tabs, pagination, desktop table, and mobile cards.

- [ ] **Step 1: Write failing page integration tests for default load, URL state, error, empty state, and responsive content**

Mock `@/services/adminService`, `useAuthContext`, and reconciliation. Render with `MemoryRouter initialEntries={["/admin/reports/sales"]}`. Assert:

```ts
expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledWith(expect.objectContaining({
  kpiStatus: "pending",
  page: 1,
  limit: 20,
}));
expect(await screen.findByText("Giao dịch thành công")).toBeInTheDocument();
expect(screen.getByText("Người dùng trả phí")).toBeInTheDocument();
expect(screen.getByText("Doanh thu gộp")).toBeInTheDocument();
expect(screen.getByText("Đã hoàn tiền")).toBeInTheDocument();
expect(screen.getByText("Doanh thu thuần")).toBeInTheDocument();
expect(screen.getByText("Chờ duyệt")).toBeInTheDocument();
expect(screen.getByTestId("sales-report-desktop-table")).toBeInTheDocument();
expect(screen.getByTestId("sales-report-mobile-list")).toBeInTheDocument();
```

Add cases for `range=7d`, custom reversed dates without API call, provider/tab reset to page 1, full-report empty state, current-tab empty state, backend timeout with a visible `Thử lại` action, and textual chart values visible to assistive technology.

- [ ] **Step 2: Run the page test to verify all components are missing**

Run:

```powershell
npm.cmd run test:ui -- src/app/pages/AdminSalesReportPage.test.tsx
```

Expected: import fails because the page does not exist.

- [ ] **Step 3: Implement URL filter parsing and controls**

`AdminSalesReportFilters.tsx` must expose:

```ts
export type SalesRangePreset = "7d" | "30d" | "custom";

export interface SalesReportUrlState {
  range: SalesRangePreset;
  from: string;
  to: string;
  provider: "all" | "payos" | "casso";
  kpiStatus: AdminSalesKpiStatus;
  page: number;
}

export function getDefaultSalesReportUrlState(now = new Date()): SalesReportUrlState;
export function parseSalesReportUrlState(params: URLSearchParams, now?: Date): SalesReportUrlState;
export function validateSalesReportUrlState(state: SalesReportUrlState): string | null;
```

Implement the pure helpers as:

```ts
const REPORT_TIMEZONE = "Asia/Ho_Chi_Minh";
const RANGE_VALUES: SalesRangePreset[] = ["7d", "30d", "custom"];
const STATUS_VALUES: AdminSalesKpiStatus[] = ["pending", "included", "excluded"];

function vietnamDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function subtractVietnamDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() - days);
  return vietnamDateKey(date);
}

function presetDates(range: Exclude<SalesRangePreset, "custom">, now: Date) {
  const to = vietnamDateKey(now);
  return { from: subtractVietnamDays(to, range === "7d" ? 6 : 29), to };
}

export function getDefaultSalesReportUrlState(now = new Date()): SalesReportUrlState {
  const dates = presetDates("30d", now);
  return { range: "30d", ...dates, provider: "all", kpiStatus: "pending", page: 1 };
}

export function parseSalesReportUrlState(params: URLSearchParams, now = new Date()): SalesReportUrlState {
  const requestedRange = params.get("range") as SalesRangePreset | null;
  const range = requestedRange && RANGE_VALUES.includes(requestedRange) ? requestedRange : "30d";
  const dates = range === "custom"
    ? { from: params.get("from") ?? "", to: params.get("to") ?? "" }
    : {
        from: params.get("from") ?? presetDates(range, now).from,
        to: params.get("to") ?? presetDates(range, now).to,
      };
  const providerValue = params.get("provider");
  const provider = providerValue === "payos" || providerValue === "casso" ? providerValue : "all";
  const statusValue = params.get("status") as AdminSalesKpiStatus | null;
  const kpiStatus = statusValue && STATUS_VALUES.includes(statusValue) ? statusValue : "pending";
  const pageValue = Number(params.get("page"));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  return { range, ...dates, provider, kpiStatus, page };
}

export function validateSalesReportUrlState(state: SalesReportUrlState): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(state.from) || !/^\d{4}-\d{2}-\d{2}$/.test(state.to)) {
    return "Chọn đầy đủ ngày bắt đầu và ngày kết thúc.";
  }
  const fromDate = new Date(`${state.from}T00:00:00+07:00`);
  const toDate = new Date(`${state.to}T00:00:00+07:00`);
  if (vietnamDateKey(fromDate) !== state.from || vietnamDateKey(toDate) !== state.to) {
    return "Ngày báo cáo không hợp lệ.";
  }
  if (state.from > state.to) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  const rangeDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (rangeDays > 366) return "Khoảng báo cáo tối đa là 366 ngày.";
  return null;
}
```

Render the controls with this contract and update behavior:

```tsx
export function AdminSalesReportFilters({
  value,
  availableProviders,
  onChange,
}: {
  value: SalesReportUrlState;
  availableProviders: Array<"payos" | "casso">;
  onChange(next: SalesReportUrlState): void;
}) {
  const setRange = (range: SalesRangePreset) => {
    const dates = range === "custom" ? { from: value.from, to: value.to } : presetDates(range, new Date());
    onChange({ ...value, range, ...dates, page: 1 });
  };
  return (
    <div className="grid gap-4 rounded-[var(--r-card)] border border-app-line bg-app-surface p-4 lg:grid-cols-[auto_1fr_1fr_1fr]">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-app-ink">Khoảng thời gian</legend>
        <div className="flex flex-wrap gap-2">
          {([['7d', '7 ngày'], ['30d', '30 ngày'], ['custom', 'Tùy chỉnh']] as const).map(([range, label]) => (
            <Button key={range} type="button" variant={value.range === range ? "default" : "outline"} onClick={() => setRange(range)}>
              {label}
            </Button>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2 text-sm font-medium text-app-ink">
        Từ ngày
        <Input type="date" value={value.from} disabled={value.range !== "custom"} onChange={(event) => onChange({ ...value, from: event.target.value, page: 1 })} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-app-ink">
        Đến ngày
        <Input type="date" value={value.to} disabled={value.range !== "custom"} onChange={(event) => onChange({ ...value, to: event.target.value, page: 1 })} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-app-ink">
        Provider
        <select value={value.provider} onChange={(event) => onChange({ ...value, provider: event.target.value as SalesReportUrlState["provider"], page: 1 })}>
          <option value="all">Tất cả</option>
          {availableProviders.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Implement the six-card KPI grid and accessible chart**

Implement `AdminSalesKpiGrid.tsx` as:

```tsx
export function AdminSalesKpiGrid({ summary }: { summary: AdminSalesReportResult["summary"] }) {
  const cards = [
    { label: "Giao dịch thành công", value: summary.successfulTransactions, icon: ReceiptText, accent: "orders" as const },
    { label: "Người dùng trả phí", value: summary.uniquePaidUsers, icon: Users, accent: "users" as const },
    { label: "Doanh thu gộp", value: formatVnd(summary.grossRevenueVnd), icon: WalletCards, accent: "revenue" as const },
    { label: "Đã hoàn tiền", value: formatVnd(summary.refundedAmountVnd), icon: Undo2, accent: "orders" as const },
    { label: "Doanh thu thuần", value: formatVnd(summary.netRevenueVnd), icon: CircleDollarSign, accent: "plus" as const },
    { label: "Chờ duyệt", value: summary.pendingReviews, icon: Clock3, accent: "users" as const },
  ];
  return (
    <section aria-label="Chỉ số bán hàng" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => <AdminStatCard key={card.label} {...card} />)}
    </section>
  );
}
```

Implement `AdminSalesRevenueChart.tsx` with no dependency:

```tsx
export function AdminSalesRevenueChart({ dailyBuckets }: { dailyBuckets: AdminSalesReportResult["dailyBuckets"] }) {
  if (dailyBuckets.length === 0) {
    return <p className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-6 text-sm text-app-ink-muted">Chưa có doanh thu được tính KPI trong khoảng này.</p>;
  }
  const width = Math.max(640, dailyBuckets.length * 48);
  const maxValue = Math.max(1, ...dailyBuckets.map((bucket) => bucket.grossRevenueVnd));
  return (
    <section className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-4" aria-labelledby="sales-revenue-chart-title">
      <h2 id="sales-revenue-chart-title" className="text-base font-semibold text-app-ink">Doanh thu theo ngày</h2>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} 180`} className="h-48 min-w-[40rem]" role="img" aria-label="Biểu đồ doanh thu gộp và doanh thu thuần theo ngày">
          {dailyBuckets.map((bucket, index) => {
            const x = index * 48 + 12;
            const grossHeight = (bucket.grossRevenueVnd / maxValue) * 140;
            const netHeight = (bucket.netRevenueVnd / maxValue) * 140;
            return (
              <g key={bucket.date}>
                <rect x={x} y={150 - grossHeight} width="12" height={grossHeight} fill="var(--chart-2)" />
                <rect x={x + 14} y={150 - netHeight} width="12" height={netHeight} fill="var(--chart-1)" />
                <text x={x + 13} y="170" textAnchor="middle" className="fill-app-ink-muted text-[8px]">{bucket.date.slice(5)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <table className="sr-only">
        <caption>Doanh thu theo ngày</caption>
        <thead><tr><th>Ngày</th><th>Doanh thu gộp</th><th>Hoàn tiền</th><th>Doanh thu thuần</th></tr></thead>
        <tbody>
          {dailyBuckets.map((bucket) => (
            <tr key={bucket.date}>
              <td>{bucket.date}</td>
              <td>{formatVnd(bucket.grossRevenueVnd)}</td>
              <td>{formatVnd(bucket.refundedAmountVnd)}</td>
              <td>{formatVnd(bucket.netRevenueVnd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

The empty-bucket branch prevents an empty SVG.

- [ ] **Step 5: Implement the responsive read-only list**

`AdminSalesReportList.tsx` receives `items` only in this task; Task 8 extends it with action callbacks. Render the same allowlisted row fields in both layouts:

```tsx
export function AdminSalesReportList({ items }: { items: AdminSalesReportRow[] }) {
  return (
    <>
      <div className="hidden md:block" data-testid="sales-report-desktop-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Giao dịch</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Đối chiếu</TableHead>
              <TableHead>Trạng thái KPI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.orderId}>
                <TableCell>
                  <p className="font-medium text-app-ink">{item.customerLabelMasked}</p>
                  <p className="text-xs text-app-ink-muted">{item.customerEmailMasked}</p>
                </TableCell>
                <TableCell>
                  <p className="font-mono text-xs">{item.orderId}</p>
                  <p className="text-xs text-app-ink-muted">{item.provider} · {item.providerReference ?? "Chưa có mã"}</p>
                  <p className="text-xs text-app-ink-muted">{formatDate(item.completedAt)}</p>
                </TableCell>
                <TableCell>{formatVnd(item.amountVnd)}</TableCell>
                <TableCell>
                  <p>{item.payer?.classification ?? "unknown"}</p>
                  <p className="text-xs text-app-ink-muted">{item.refund.status === "completed" ? "Đã hoàn tiền" : "Chưa hoàn tiền"}</p>
                </TableCell>
                <TableCell>{item.reporting.kpiStatus}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden" data-testid="sales-report-mobile-list">
        {items.map((item) => (
          <li key={item.orderId} className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-app-ink">{item.customerLabelMasked}</p>
                <p className="text-xs text-app-ink-muted">{item.customerEmailMasked}</p>
              </div>
              <span className="text-sm font-semibold text-app-ink">{formatVnd(item.amountVnd)}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <dt className="text-app-ink-muted">Mã đơn</dt><dd className="font-mono text-right">{item.orderId}</dd>
              <dt className="text-app-ink-muted">Provider</dt><dd className="text-right">{item.provider}</dd>
              <dt className="text-app-ink-muted">Mã provider</dt><dd className="break-all text-right">{item.providerReference ?? "Chưa có mã"}</dd>
              <dt className="text-app-ink-muted">Hoàn tất</dt><dd className="text-right">{formatDate(item.completedAt)}</dd>
              <dt className="text-app-ink-muted">Nguồn tiền</dt><dd className="text-right">{item.payer?.classification ?? "unknown"}</dd>
              <dt className="text-app-ink-muted">Hoàn tiền</dt><dd className="text-right">{item.refund.status === "completed" ? "Đã hoàn tiền" : "Chưa hoàn tiền"}</dd>
              <dt className="text-app-ink-muted">KPI</dt><dd className="text-right">{item.reporting.kpiStatus}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
```

Every row/card shows masked label/email, `orderId`, provider/reference, amount, completion time, payer classification, refund label, and KPI status. Task 8 adds action buttons without changing the allowlisted data surface.

- [ ] **Step 6: Implement the page orchestration and pagination**

`AdminSalesReportPage.tsx` must:

- read/write `range`, `from`, `to`, `provider`, `status`, and `page` through `useSearchParams()`;
- reject invalid custom dates client-side without calling the API;
- call only `adminGetSalesReport()` for calculations;
- preserve filters on error and expose `Thử lại`;
- distinguish no qualifying report data from an empty selected tab;
- render previous/next buttons disabled at boundaries;
- omit review, reconciliation, evidence, and export actions until Task 8 so the read-only slice is complete and testable without dormant handlers.

The fetch call is exactly:

```ts
const result = await adminGetSalesReport({
  from: state.from,
  to: state.to,
  provider: state.provider,
  kpiStatus: state.kpiStatus,
  page: state.page,
  limit: 20,
});
```

Use this URL serialization and load loop:

```ts
function toSearchParams(state: SalesReportUrlState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("range", state.range);
  params.set("from", state.from);
  params.set("to", state.to);
  if (state.provider !== "all") params.set("provider", state.provider);
  params.set("status", state.kpiStatus);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

const [searchParams, setSearchParams] = useSearchParams();
const state = useMemo(() => parseSalesReportUrlState(searchParams), [searchParams]);
const validationError = validateSalesReportUrlState(state);
const activeParams = useMemo(() => ({
  from: state.from,
  to: state.to,
  provider: state.provider,
  kpiStatus: state.kpiStatus,
  page: state.page,
  limit: 20,
}), [state]);

const loadReport = useCallback(async (params: AdminSalesReportParams) => {
  setLoading(true);
  setLoadError(null);
  try {
    setReport(await adminGetSalesReport(params));
  } catch (error) {
    setLoadError(getErrorMessage(error, "Không thể tải báo cáo kinh doanh. Thử lại."));
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  if (validationError) return;
  void loadReport(activeParams);
}, [activeParams, loadReport, validationError]);

const updateState = (next: SalesReportUrlState) => setSearchParams(toSearchParams(next), { replace: true });
```

Render the complete read-only state tree as:

```tsx
const noQualifyingSales = report
  ? report.tabCounts.pending + report.tabCounts.included + report.tabCounts.excluded === 0
  : false;
const tabs = [
  { status: "included" as const, label: "Được tính KPI" },
  { status: "pending" as const, label: "Chờ duyệt" },
  { status: "excluded" as const, label: "Đã loại" },
];

return (
  <div className="space-y-6">
    <AdminPageHeader title="Báo cáo kinh doanh" description="Đối soát giao dịch Plus thực, duyệt KPI và xuất bằng chứng đã ẩn thông tin nhạy cảm." />
    <AdminSalesReportFilters
      value={state}
      availableProviders={report?.availableProviders ?? ["payos", "casso"]}
      onChange={updateState}
    />
    {validationError ? <p role="alert" className="text-sm text-rose-600">{validationError}</p> : null}
    {loadError ? (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-[var(--r-card)] border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => void loadReport(activeParams)}>Thử lại</Button>
      </div>
    ) : null}
    {loading && !report ? <p role="status">Đang tải báo cáo kinh doanh…</p> : null}
    {report ? (
      <>
        <AdminSalesKpiGrid summary={report.summary} />
        <AdminSalesRevenueChart dailyBuckets={report.dailyBuckets} />
        <div role="tablist" aria-label="Trạng thái duyệt KPI" className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={state.kpiStatus === tab.status}
              variant={state.kpiStatus === tab.status ? "default" : "outline"}
              onClick={() => updateState({ ...state, kpiStatus: tab.status, page: 1 })}
            >
              {tab.label} ({report.tabCounts[tab.status]})
            </Button>
          ))}
        </div>
        {noQualifyingSales ? (
          <AdminEmptyState title="Chưa có giao dịch phù hợp" description="Khoảng ngày và provider hiện tại chưa có giao dịch Plus thực đã hoàn tất." />
        ) : report.total === 0 ? (
          <AdminEmptyState title="Không có giao dịch trong trạng thái này" description="Đổi tab hoặc bộ lọc để xem các giao dịch khác." />
        ) : (
          <AdminSalesReportList items={report.items} />
        )}
        <div className="flex items-center justify-between">
          <p className="text-sm text-app-ink-muted">Trang {report.page}/{report.totalPages}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={report.page <= 1} onClick={() => updateState({ ...state, page: state.page - 1 })}>Trang trước</Button>
            <Button type="button" variant="outline" disabled={report.page >= report.totalPages} onClick={() => updateState({ ...state, page: state.page + 1 })}>Trang sau</Button>
          </div>
        </div>
      </>
    ) : null}
  </div>
);
```

- [ ] **Step 7: Register the route and sidebar item**

In `AdminSidebar.tsx`, import `ChartNoAxesCombined` and `getAppMode`. Replace the single static array with a mode-aware factory so the report is absent in demo mode:

```ts
export function getAdminNavItems(appMode = getAppMode()): AdminNavItem[] {
  return [
    { to: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { to: "/admin/users", label: "Người dùng", icon: Users },
    { to: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
    { to: "/admin/subscriptions", label: "Subscription", icon: CreditCard },
    { to: "/admin/payments", label: "Thanh toán", icon: WalletCards },
    ...(appMode === "real"
      ? [{ to: "/admin/reports/sales", label: "Báo cáo kinh doanh", icon: ChartNoAxesCombined }]
      : []),
    { to: "/admin/refunds", label: "Hoàn tiền", icon: FileText },
    { to: "/admin/discounts", label: "Giảm giá", icon: Percent },
    { to: "/admin/catalog", label: "Catalog", icon: Package },
    { to: "/admin/email-history", label: "Email", icon: Mail },
    { to: "/admin/settings", label: "Cài đặt", icon: Settings },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  ];
}

export const ADMIN_NAV_ITEMS = getAdminNavItems();
```

In `routes.tsx`, add under the Admin children with real-mode gating:

```ts
...(appMode === "real"
  ? [{
      path: "reports/sales",
      ...lazyRoute(() => import("./pages/AdminSalesReportPage"), "AdminSalesReportPage"),
    }]
  : []),
```

- [ ] **Step 8: Run the read-only page tests**

Run:

```powershell
npm.cmd run test:ui -- src/app/pages/AdminSalesReportPage.test.tsx
npm.cmd run typecheck
```

Expected: default, filters, URL persistence, KPI, chart accessibility, empty/error, pagination, desktop, and mobile assertions pass.

- [ ] **Step 9: Commit the read-only report surface**

```powershell
git add src/app/components/admin/sales/AdminSalesReportFilters.tsx src/app/components/admin/sales/AdminSalesKpiGrid.tsx src/app/components/admin/sales/AdminSalesRevenueChart.tsx src/app/components/admin/sales/AdminSalesReportList.tsx src/app/pages/AdminSalesReportPage.tsx src/app/pages/AdminSalesReportPage.test.tsx src/app/components/admin/AdminSidebar.tsx src/app/routes.tsx
git commit -m "feat(admin): add sales reporting dashboard"
```

---

### Task 8: Wire Review Confirmation, Reconciliation Evidence, and Full-Filter Export

**Files:**
- Create: `src/app/components/admin/sales/AdminSalesReviewDialog.tsx`
- Modify: `src/app/pages/AdminSalesReportPage.tsx`
- Modify: `src/app/pages/AdminSalesReportPage.test.tsx`

**Interfaces:**
- Consumes: `adminReviewSalesOrder()`, `adminReconcilePaymentOrderPayerSource()`, `adminExportSalesReport()`, `AdminPaymentPayerEvidenceDialog`, and the read-only page from Task 7.
- Produces: confirmed review mutations, retryable mutation errors, row-level PayOS reconciliation/evidence, and server-generated CSV download.

- [ ] **Step 1: Write failing interaction tests**

Add tests for:

- included manual order without note keeps confirm disabled;
- excluded order requires a reason;
- `other` requires a note;
- confirm sends the exact PATCH payload and reloads the active report;
- PATCH failure leaves summary/row unchanged and keeps the dialog open with retry text;
- PayOS reconciliation updates only the matching row and opens safe evidence;
- export sends active `from/to/provider/kpiStatus`, creates a Blob URL only after success, and shows a retryable error without creating a URL after failure.

Use explicit interactions such as:

```ts
await user.click(screen.getByRole("button", { name: "Duyệt KPI VBREPORT01" }));
await user.click(screen.getByLabelText("Được tính KPI"));
expect(screen.getByRole("button", { name: "Xác nhận duyệt" })).toBeDisabled();
await user.type(screen.getByLabelText("Ghi chú duyệt"), "Đã đối chiếu PayOS và giao dịch ngân hàng.");
await user.click(screen.getByRole("button", { name: "Xác nhận duyệt" }));
await waitFor(() => expect(adminServiceMock.adminReviewSalesOrder).toHaveBeenCalledWith("VBREPORT01", {
  kpiStatus: "included",
  reviewNote: "Đã đối chiếu PayOS và giao dịch ngân hàng.",
}));
expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledTimes(2);
```

For export failure:

```ts
adminServiceMock.adminExportSalesReport.mockRejectedValueOnce(new Error("timeout"));
const createObjectUrl = vi.spyOn(URL, "createObjectURL");
await user.click(screen.getByRole("button", { name: "Xuất CSV" }));
expect(await screen.findByText("Không thể xuất báo cáo. Thử lại.")).toBeInTheDocument();
expect(createObjectUrl).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the interaction tests to verify handlers are incomplete**

Run:

```powershell
npm.cmd run test:ui -- src/app/pages/AdminSalesReportPage.test.tsx
```

Expected: new review, reconciliation, evidence, and export assertions fail.

- [ ] **Step 3: Implement the review `AlertDialog` with exact validation**

Create `AdminSalesReviewDialog.tsx` with this public contract:

```ts
export interface AdminSalesReviewDialogProps {
  item: AdminSalesReportRow | null;
  busy: boolean;
  error: string | null;
  onOpenChange(open: boolean): void;
  onConfirm(payload: AdminReviewSalesOrderPayload): Promise<void>;
}
```

Use `AlertDialog`, a radio/select for `included`/`excluded`, a reason select containing only the four allowed reasons, and `Textarea`. Validation is:

```ts
const note = reviewNote.trim();
const validationError =
  status === "excluded" && !exclusionReason
    ? "Chọn lý do loại khỏi KPI."
    : status === "excluded" && exclusionReason === "other" && !note
      ? "Nhập ghi chú cho lý do khác."
      : status === "included" && item?.isManualCompletion && !note
        ? "Đơn hoàn tất thủ công cần ghi chú đối chiếu."
        : null;
```

`AlertDialogAction` must call `event.preventDefault()` and await `onConfirm()` so an API error does not close the dialog.

Build the payload only after validation succeeds:

```ts
const payload: AdminReviewSalesOrderPayload = status === "included"
  ? { kpiStatus: "included", ...(note ? { reviewNote: note } : {}) }
  : {
      kpiStatus: "excluded",
      exclusionReason: exclusionReason as AdminSalesExclusionReason,
      ...(note ? { reviewNote: note } : {}),
    };
await onConfirm(payload);
```

- [ ] **Step 4: Wire review and reload from the server**

In the page, keep `reviewItem`, `reviewBusy`, and `reviewError`. On confirm:

```ts
try {
  setReviewBusy(true);
  setReviewError(null);
  await adminReviewSalesOrder(reviewItem.orderId, payload);
  await loadReport(activeParams);
  setReviewItem(null);
  toast.success("Đã cập nhật trạng thái KPI.");
} catch (error) {
  setReviewError(getErrorMessage(error, "Không thể lưu duyệt KPI. Thử lại."));
} finally {
  setReviewBusy(false);
}
```

Do not optimistically recalculate cards or remove rows before PATCH succeeds.

- [ ] **Step 5: Wire PayOS reconciliation and shared evidence**

Extend `AdminSalesReportList` with:

```ts
interface AdminSalesReportListProps {
  items: AdminSalesReportRow[];
  busyOrderId: string | null;
  onReview(item: AdminSalesReportRow): void;
  onReconcile(orderId: string): void;
  onViewEvidence(item: AdminSalesReportRow): void;
}
```

Render `Duyệt KPI ${item.orderId}` for every row, `Đối chiếu PayOS` when a PayOS row has no payer evidence, and `Xem chứng cứ` when `payer.source === "reconciliation"`. Use this exact reconciliation handler:

```ts
const handleReconcile = async (orderId: string) => {
  setBusyOrderId(orderId);
  try {
    const result = await adminReconcilePaymentOrderPayerSource(orderId);
    setReport((current) => current ? {
      ...current,
      items: current.items.map((item) => item.orderId === orderId ? { ...item, payer: result.payer } : item),
    } : current);
    if (result.payer.source === "reconciliation") {
      const item = report?.items.find((candidate) => candidate.orderId === orderId);
      if (item) setEvidenceItem({ ...item, payer: result.payer });
    }
    toast.success("Đã đối chiếu PayOS.");
  } catch (error) {
    toast.error(getErrorMessage(error, "Không thể đối chiếu PayOS. Thử lại."));
  } finally {
    setBusyOrderId(null);
  }
};
```

Render `AdminPaymentPayerEvidenceDialog` from `evidenceItem?.payer`. Never inspect fields outside `AdminPaymentPayerSource`.

- [ ] **Step 6: Wire server-generated export without partial downloads**

Use this complete handler:

```ts
const handleExport = async () => {
  setExportBusy(true);
  setExportError(null);
  try {
    const exported = await adminExportSalesReport(activeParams);
    const url = URL.createObjectURL(exported.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exported.filename || `sales-report-${activeParams.from}-to-${activeParams.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    setExportError(getErrorMessage(error, "Không thể xuất báo cáo. Thử lại."));
  } finally {
    setExportBusy(false);
  }
};
```

Create the Blob URL only after `adminExportSalesReport()` resolves. Keep export error state separate from page-load error and display it beside the export action.

- [ ] **Step 7: Run focused interaction and privacy tests**

Run:

```powershell
npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx src/app/pages/AdminSalesReportPage.test.tsx
npm.cmd run test:run -- src/lib/api/apiClient.file.test.ts src/services/adminService.test.ts
```

Expected: all review validation, retry, reconciliation, evidence privacy, and complete-filter export tests pass.

- [ ] **Step 8: Commit interactions**

```powershell
git add src/app/components/admin/sales/AdminSalesReviewDialog.tsx src/app/pages/AdminSalesReportPage.tsx src/app/pages/AdminSalesReportPage.test.tsx
git commit -m "feat(admin): review and export sales evidence"
```

---

### Task 9: Lock Route Access and Run Full Verification

**Files:**
- Modify: `src/app/routes.test.tsx:269`
- Create: `src/app/components/admin/AdminSidebar.test.tsx`
- Verify only: all files changed in Tasks 1-8

**Interfaces:**
- Consumes: final backend/frontend implementation.
- Produces: route/sidebar regression coverage and verified build/test evidence.

- [ ] **Step 1: Add route and sidebar regression tests**

In `routes.test.tsx`, assert:

```ts
const realPaths = collectRoutePaths(createAppRoutes("real"));
const demoPaths = collectRoutePaths(createAppRoutes("demo"));
expect(realPaths).toContain("reports/sales");
expect(demoPaths).not.toContain("reports/sales");
```

Also mock `useAuthContext()` with `userProfile.role = "user"`, render the real-mode `/admin/reports/sales`, and assert the page shows `Không có quyền quản trị` while `adminGetSalesReport` is not called. In `AdminSidebar.test.tsx`, assert `getAdminNavItems("real")` contains exactly one `Báo cáo kinh doanh` link to `/admin/reports/sales`, while `getAdminNavItems("demo")` contains none.

- [ ] **Step 2: Run all focused backend checks**

Run:

```powershell
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportModel.test.js backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/auditLog.test.js
```

Expected: all commands exit `0`.

- [ ] **Step 3: Run all focused frontend checks**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run test:run -- src/lib/api/apiClient.file.test.ts src/services/adminService.test.ts
npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx src/app/pages/AdminSalesReportPage.test.tsx src/app/routes.test.tsx src/app/components/admin/AdminSidebar.test.tsx
```

Expected: all commands exit `0`.

- [ ] **Step 4: Run broader repository verification**

Run:

```powershell
npm.cmd --prefix backend run test:run
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```

Expected: all commands exit `0`. If an unrelated pre-existing dirty-worktree failure occurs, record the exact command/file and rerun the smallest sales-reporting checks to prove the new surface remains green.

- [ ] **Step 5: Perform manual browser verification**

With a real-mode local/staging Admin session:

1. Open `/admin/reports/sales` at desktop and mobile widths.
2. Verify default 30-day pending report and 7-day/custom/provider filters.
3. Include one normal transaction and exclude one test/internal transaction.
4. Verify a manual completion cannot be included without a note.
5. Verify cards, chart, tab counts, and rows refresh without changing Plus access.
6. Reconcile one historical PayOS order and inspect the safe evidence dialog.
7. Export each tab and inspect the CSV for full email, UID, full account number, account hash, QR, checkout URL, and webhook leakage.
8. Confirm the existing Admin dashboard revenue may differ because its historical broad calculation is intentionally out of scope; use the new sales report as the KPI source.

- [ ] **Step 6: Commit regression tests only**

```powershell
git add src/app/routes.test.tsx src/app/components/admin/AdminSidebar.test.tsx
git commit -m "test(admin): cover sales report navigation"
```

- [ ] **Step 7: Review the final diff without staging unrelated work**

Run:

```powershell
git status --short
git diff --check
git diff --stat HEAD~9..HEAD
```

Expected: no whitespace errors; only the sales-reporting files from this plan appear in the feature commits. Existing user-owned dirty files remain unstaged and unchanged.

## Acceptance Traceability

- Canonical qualifying filter, legacy pending normalization, unique users, refunds, excluded totals, daily buckets, and pagination: Tasks 2-3.
- Manual note, exclusion validation, optimistic review, safe audit, and billing-state invariants: Task 4.
- Full-filter privacy-safe export and no partial download: Tasks 2, 3, 5, and 8.
- Protected route, sidebar, URL filters, six cards, chart, tabs, desktop/mobile layouts, loading/empty/retry states: Tasks 7-9.
- Existing PayOS reconciliation and masked evidence reuse: Tasks 6 and 8.
- Demo/mock/physical/non-VND/incomplete exclusion: Task 2 canonical match and tests.
- Active-user metrics remain out of scope until a durable analytics source exists.
